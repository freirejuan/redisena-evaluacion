/**
 * Rediseña.Evaluacion · app.js
 * Gestión de estado (localStorage), inicialización de la barra de estado,
 * interacciones de pasos y export/import.
 */

// ═══════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════

const STORAGE_KEY = 'redisena_evaluacion';
const SCHEMA_VERSION = 1;

const SPRINT_IDS = ['sprint_0', 'sprint_1', 'sprint_2'];

const SPRINT_LABELS = {
  sprint_0: 'Sprint 0 · Decisiones estratégicas',
  sprint_1: 'Sprint 1 · Plan de acción detallado',
  sprint_2: 'Sprint 2 · Pilotaje con estudiantes'
};

const ESTADO_LABELS = {
  sin_iniciar: 'Sin iniciar',
  en_progreso: 'En progreso',
  completado: 'Completado',
  bloqueado: 'Bloqueado · cerrar sprint anterior',
  proximamente: 'Próximamente'
};

// Versión corta para la barra de estado, donde no cabe la explicación.
const ESTADO_LABELS_CORTOS = {
  sin_iniciar: 'sin iniciar',
  en_progreso: 'en progreso',
  completado: 'completado',
  bloqueado: 'bloqueado',
  proximamente: 'próximamente'
};

// Número de pasos marcables de cada sprint. Debe coincidir con los [data-step]
// de la página correspondiente; dentro de una página de sprint se recuenta
// desde el DOM para que ambas cosas no puedan divergir.
const SPRINT_STEPS = { sprint_0: 3, sprint_1: 3, sprint_2: 0 };

// ═══════════════════════════════════════════════════
// ESTADO POR DEFECTO
// ═══════════════════════════════════════════════════

function state_default() {
  const now = new Date().toISOString();
  return {
    schema_version: SCHEMA_VERSION,
    asignatura: null,
    sprints: {
      sprint_0: { estado: 'sin_iniciar', pasos_completados: [], completado_en: null },
      sprint_1: { estado: 'bloqueado',  pasos_completados: [], completado_en: null },
      sprint_2: { estado: 'proximamente', pasos_completados: [], completado_en: null }
    },
    creado_en: now,
    actualizado_en: now,
    ultima_visita: now,
    visita_previa: null
  };
}

// ═══════════════════════════════════════════════════
// LOAD / SAVE / RESET
// ═══════════════════════════════════════════════════

function state_load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.schema_version !== SCHEMA_VERSION) {
      console.warn('Schema version mismatch — usando estado tal cual', parsed.schema_version, '≠', SCHEMA_VERSION);
    }
    return state_normalize(parsed);
  } catch (e) {
    console.error('Error leyendo estado de localStorage', e);
    return null;
  }
}

// Completa lo que falte en estados guardados por versiones anteriores, para que
// el resto del código pueda dar por hecha la forma del objeto.
function state_normalize(state) {
  if (!state || typeof state !== 'object') return null;
  const base = state_default();
  if (!state.sprints || typeof state.sprints !== 'object') state.sprints = base.sprints;
  SPRINT_IDS.forEach(id => {
    if (!state.sprints[id]) state.sprints[id] = base.sprints[id];
    if (!Array.isArray(state.sprints[id].pasos_completados)) state.sprints[id].pasos_completados = [];
  });
  return state;
}

function state_save(state) {
  state.actualizado_en = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error guardando estado', e);
  }
}

function state_reset() {
  localStorage.removeItem(STORAGE_KEY);
}

function state_ensure() {
  let s = state_load();
  if (!s) {
    s = state_default();
    state_save(s);
  }
  return s;
}

// Marca la visita solo una vez por carga de página, conservando la anterior:
// es lo que permite decirle al profesor cuándo estuvo aquí por última vez.
function state_touchVisit() {
  const s = state_ensure();
  s.visita_previa = s.ultima_visita || null;
  s.ultima_visita = new Date().toISOString();
  state_save(s);
  return s;
}

// ═══════════════════════════════════════════════════
// TRANSICIONES DE SPRINT
// ═══════════════════════════════════════════════════

function sprint_toggleStep(state, sprintId, stepId) {
  const sprint = state.sprints[sprintId];
  if (!sprint) return state;
  if (sprint.estado === 'bloqueado' || sprint.estado === 'proximamente') return state;

  const idx = sprint.pasos_completados.indexOf(stepId);
  if (idx >= 0) {
    sprint.pasos_completados.splice(idx, 1);
  } else {
    sprint.pasos_completados.push(stepId);
  }

  // Actualizar estado derivado
  if (sprint.pasos_completados.length === 0) {
    sprint.estado = 'sin_iniciar';
    sprint.completado_en = null;
  } else if (sprint.estado === 'completado') {
    // Si se desmarca tras completar, vuelve a en_progreso
    sprint.estado = 'en_progreso';
    sprint.completado_en = null;
  } else {
    sprint.estado = 'en_progreso';
  }

  state_save(state);
  return state;
}

function sprint_markComplete(state, sprintId) {
  const sprint = state.sprints[sprintId];
  if (!sprint) return state;
  sprint.estado = 'completado';
  sprint.completado_en = new Date().toISOString();

  // Desbloquear el siguiente sprint si estaba bloqueado
  const next = SPRINT_IDS[SPRINT_IDS.indexOf(sprintId) + 1];
  if (next && state.sprints[next] && state.sprints[next].estado === 'bloqueado') {
    state.sprints[next].estado = 'sin_iniciar';
  }

  state_save(state);
  return state;
}

// El primer sprint que no está cerrado. Si están todos completados, null.
// Antes se saltaba el Sprint 2 por estar en «próximamente» y la barra de estado
// daba el proceso por terminado con el pilotaje aún por delante.
function sprint_getActive(state) {
  for (const id of SPRINT_IDS) {
    if (state.sprints[id].estado !== 'completado') return { id, data: state.sprints[id] };
  }
  return null;
}

function sprint_totalSteps(sprintId) {
  // Dentro de una página de sprint manda el DOM: así el recuento no puede
  // quedarse desfasado respecto a los pasos que el profesor ve de verdad.
  const enPagina = document.querySelectorAll(`[data-step][data-sprint="${sprintId}"]`).length;
  if (enPagina > 0) return enPagina;
  return SPRINT_STEPS[sprintId] || 0;
}

function sprint_progressPct(sprintData, sprintId) {
  const total = sprint_totalSteps(sprintId);
  if (total === 0) return 0;
  return Math.min(100, Math.round((sprintData.pasos_completados.length / total) * 100));
}

// ═══════════════════════════════════════════════════
// UI · STATUS STRIP
// ═══════════════════════════════════════════════════

function ui_updateStatusStrip(state) {
  const courseEl = document.getElementById('status-course');
  const stepEl   = document.getElementById('status-step');
  if (!courseEl || !stepEl) return;

  const nombre = state.asignatura && state.asignatura.nombre;
  courseEl.textContent = nombre || 'Poner nombre';
  courseEl.classList.toggle('placeholder', !nombre);

  const activeSprint = sprint_getActive(state);
  if (activeSprint) {
    const corto = SPRINT_LABELS[activeSprint.id].split(' · ')[0];
    stepEl.textContent = `${corto} · ${ESTADO_LABELS_CORTOS[activeSprint.data.estado]}`;
  } else {
    stepEl.textContent = 'Proceso completado';
  }
}

// El nombre de la asignatura se edita desde la propia barra de estado. Es el
// único dato que la web muestra y que no tenía ninguna forma de introducirse:
// el hueco se quedaba en «Sin iniciar» hiciera el profesor lo que hiciera.
function ui_bindCourseName() {
  const courseEl = document.getElementById('status-course');
  if (!courseEl) return;

  courseEl.classList.add('editable');
  courseEl.setAttribute('role', 'button');
  courseEl.setAttribute('tabindex', '0');
  courseEl.setAttribute('title', 'Poner nombre a la asignatura que estás rediseñando');

  const abrirEdicion = () => {
    if (courseEl.dataset.editing === 'true') return;
    courseEl.dataset.editing = 'true';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'course-input';
    const state = state_ensure();
    input.value = (state.asignatura && state.asignatura.nombre) || '';
    input.maxLength = 80;
    input.placeholder = 'Nombre de la asignatura';
    input.setAttribute('aria-label', 'Nombre de la asignatura');

    courseEl.replaceWith(input);
    input.focus();
    input.select();

    let cerrado = false;
    const cerrar = (guardar) => {
      if (cerrado) return;
      cerrado = true;
      if (guardar) {
        const s = state_ensure();
        const valor = input.value.trim();
        s.asignatura = valor ? { nombre: valor } : null;
        state_save(s);
      }
      input.replaceWith(courseEl);
      courseEl.dataset.editing = 'false';
      ui_updateStatusStrip(state_ensure());
      courseEl.focus();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); cerrar(true); }
      if (e.key === 'Escape') { e.preventDefault(); cerrar(false); }
    });
    input.addEventListener('blur', () => cerrar(true));
  };

  courseEl.addEventListener('click', abrirEdicion);
  courseEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirEdicion(); }
  });
}

// ═══════════════════════════════════════════════════
// UI · HOME · primera visita vs. continuar
// ═══════════════════════════════════════════════════

function ui_showHomeVariant(state) {
  const first  = document.getElementById('hero-first-visit');
  const returning = document.getElementById('hero-returning');
  if (!first || !returning) return;

  // Basta con que haya trabajo empezado. Exigir además el nombre de la
  // asignatura dejaba esta variante inalcanzable, porque nada lo escribía.
  const hayProgreso = SPRINT_IDS.some(id => {
    const s = state.sprints[id];
    return s.pasos_completados.length > 0 || s.estado === 'en_progreso' || s.estado === 'completado';
  });

  if (hayProgreso) {
    first.style.display = 'none';
    returning.style.display = 'block';
    ui_updateContinueBanner(state);
  } else {
    first.style.display = 'block';
    returning.style.display = 'none';
  }
}

function ui_updateContinueBanner(state) {
  const titleEl = document.getElementById('continue-title');
  const progressEl = document.getElementById('continue-progress');
  const continueBtn = document.getElementById('continue-btn');
  const lastVisitEl = document.getElementById('continue-lastvisit');

  const activeSprint = sprint_getActive(state) || { id: 'sprint_2', data: state.sprints.sprint_2 };
  if (titleEl) titleEl.textContent = SPRINT_LABELS[activeSprint.id];
  if (progressEl) {
    const total = SPRINT_STEPS[activeSprint.id] || 0;
    const done = activeSprint.data.pasos_completados.length;
    progressEl.textContent = total > 0
      ? `Has completado ${done} de ${total} pasos`
      : 'Sin pasos que marcar todavía';
  }
  if (continueBtn) continueBtn.href = `/${activeSprint.id.replace('_', '-')}`;
  if (lastVisitEl) lastVisitEl.textContent = ui_formatLastVisit(state.visita_previa);

  // Progreso visual de cada tarjeta. Antes solo se actualizaba la del Sprint 0
  // y las otras dos se quedaban clavadas al 0 %.
  SPRINT_IDS.forEach((id, i) => {
    const fill = document.getElementById(`s${i}-progress`);
    if (fill) fill.style.width = sprint_progressPct(state.sprints[id], id) + '%';
    const label = document.getElementById(`s${i}-estado`);
    if (label) label.textContent = ESTADO_LABELS[state.sprints[id].estado];
  });
}

function ui_formatLastVisit(iso) {
  if (!iso) return 'Es tu primera vuelta por aquí';
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (isNaN(dias)) return 'Última visita: hace un tiempo';
  if (dias <= 0) return 'Última visita: hoy';
  if (dias === 1) return 'Última visita: ayer';
  if (dias < 7) return `Última visita: hace ${dias} días`;
  if (dias < 14) return 'Última visita: hace una semana';
  if (dias < 60) return `Última visita: hace ${Math.round(dias / 7)} semanas`;
  return `Última visita: hace ${Math.round(dias / 30)} meses`;
}

// ═══════════════════════════════════════════════════
// UI · SPRINT PAGES · checkboxes
// ═══════════════════════════════════════════════════

// Render puro: no engancha eventos, así que se puede llamar tantas veces como
// haga falta sin efectos acumulativos.
function ui_renderSprintPage(state, sprintId) {
  const sprint = state.sprints[sprintId];

  const stateEl = document.getElementById(`${sprintId.replace('_', '-')}-state`);
  if (stateEl) stateEl.textContent = ESTADO_LABELS[sprint.estado];

  const progressEl = document.getElementById(`${sprintId.replace('_', '-')}-progress`);
  if (progressEl) progressEl.style.width = sprint_progressPct(sprint, sprintId) + '%';

  document.querySelectorAll(`[data-step][data-sprint="${sprintId}"]`).forEach(el => {
    const isDone = sprint.pasos_completados.includes(el.dataset.step);
    el.classList.toggle('done', isDone);
    el.setAttribute('aria-checked', isDone ? 'true' : 'false');
  });

  // El botón de cierre solo tiene sentido con todos los pasos marcados.
  const completeBtn = document.querySelector(`[data-action="complete-sprint"][data-sprint="${sprintId}"]`);
  if (completeBtn) {
    const total = sprint_totalSteps(sprintId);
    const pendientes = total - sprint.pasos_completados.length;
    const cerrado = sprint.estado === 'completado';
    const listo = pendientes <= 0;

    completeBtn.disabled = !listo || cerrado;
    completeBtn.setAttribute('aria-disabled', completeBtn.disabled ? 'true' : 'false');

    let hint = completeBtn.parentElement.querySelector('.complete-hint');
    if (!hint) {
      hint = document.createElement('span');
      hint.className = 'complete-hint';
      completeBtn.insertAdjacentElement('afterend', hint);
    }
    if (cerrado) {
      hint.textContent = 'Sprint cerrado. Desmarca cualquier paso si necesitas reabrirlo.';
    } else if (listo) {
      hint.textContent = '';
    } else {
      hint.textContent = pendientes === 1
        ? 'Queda un paso por marcar.'
        : `Quedan ${pendientes} pasos por marcar.`;
    }
  }
}

// Engancha los eventos una sola vez. Antes esto vivía dentro de la función de
// render, que se llamaba a sí misma desde el propio handler: cada clic
// duplicaba los listeners y a partir del segundo el paso se conmutaba un
// número par de veces, es decir, dejaba de responder.
function ui_bindSprintPage(sprintId) {
  const refrescar = () => {
    const s = state_ensure();
    ui_renderSprintPage(s, sprintId);
    ui_updateStatusStrip(s);
  };

  document.querySelectorAll(`[data-step][data-sprint="${sprintId}"]`).forEach(el => {
    el.setAttribute('role', 'checkbox');
    el.setAttribute('tabindex', '0');

    const toggle = () => {
      const s = state_ensure();
      const estado = s.sprints[sprintId].estado;
      if (estado === 'bloqueado' || estado === 'proximamente') return;
      sprint_toggleStep(s, sprintId, el.dataset.step);
      refrescar();
    };

    el.addEventListener('click', toggle);
    el.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
  });

  const completeBtn = document.querySelector(`[data-action="complete-sprint"][data-sprint="${sprintId}"]`);
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      const s = state_ensure();
      sprint_markComplete(s, sprintId);
      refrescar();
    });
  }
}

// ═══════════════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════════════

function state_export() {
  const s = state_load();
  if (!s) { alert('No hay estado para exportar todavía.'); return; }
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const crudo = (s.asignatura && s.asignatura.nombre) || 'asignatura';
  const name = crudo.toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'asignatura';
  a.href = url;
  a.download = `redisena-${name}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function state_import(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.schema_version) throw new Error('el archivo no parece un progreso de Rediseña.Evaluacion');
      if (!parsed.sprints) throw new Error('el archivo no contiene datos de sprints');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state_normalize(parsed)));
      location.reload();
    } catch (err) {
      alert('No se pudo cargar el progreso: ' + err.message);
    }
  };
  reader.onerror = () => alert('No se pudo leer el archivo.');
  reader.readAsText(file);
}

// El input de archivo se crea desde aquí para no repetirlo en las ocho páginas.
// Sin esto, state_import no tenía forma de invocarse: el progreso se podía
// descargar pero no volver a cargar.
function ui_bindImport() {
  const botones = document.querySelectorAll('[data-action="import"]');
  if (!botones.length) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.hidden = true;
  document.body.appendChild(input);

  input.addEventListener('change', () => {
    if (input.files && input.files[0]) state_import(input.files[0]);
    input.value = '';
  });

  botones.forEach(btn => btn.addEventListener('click', () => input.click()));
}

// ═══════════════════════════════════════════════════
// INICIALIZACIÓN POR PÁGINA
// ═══════════════════════════════════════════════════

function app_init() {
  const state = state_touchVisit();

  ui_updateStatusStrip(state);
  ui_bindCourseName();
  ui_bindImport();

  // Conectar botones globales del status strip
  document.querySelectorAll('[data-action="export"]').forEach(btn => {
    btn.addEventListener('click', state_export);
  });
  document.querySelectorAll('[data-action="reset"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('¿Seguro que quieres reiniciar? Perderás todo el progreso de esta asignatura en este navegador.')) {
        state_reset();
        location.reload();
      }
    });
  });

  // Detectar página actual
  const pageId = document.body.dataset.page;

  if (pageId === 'inicio') {
    ui_showHomeVariant(state);
  } else if (pageId && pageId.startsWith('sprint-')) {
    const sprintId = pageId.replace('-', '_');
    if (state.sprints[sprintId]) {
      ui_bindSprintPage(sprintId);
      ui_renderSprintPage(state, sprintId);
    }
  }
}

// Arrancar al cargar el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', app_init);
} else {
  app_init();
}
