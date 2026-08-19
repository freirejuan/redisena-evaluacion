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
const SPRINT_STEPS = { sprint_0: 3, sprint_1: 3, sprint_2: 3 };

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
      sprint_2: { estado: 'bloqueado', pasos_completados: [], completado_en: null }
    },
    // Preferencias de lectura. La única que hay por ahora: si el profesor
    // quiere ver siempre el detalle o prefiere la versión corta (por defecto).
    prefs: { detalle: false },
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
  if (!state.prefs || typeof state.prefs !== 'object') state.prefs = { detalle: false };
  if (typeof state.prefs.detalle !== 'boolean') state.prefs.detalle = false;

  // Un estado que no reconocemos —de una versión anterior, o de un archivo
  // manipulado— pintaba «Sprint 0 · undefined» en la barra.
  SPRINT_IDS.forEach(id => {
    if (!ESTADO_LABELS[state.sprints[id].estado]) {
      state.sprints[id].estado = base.sprints[id].estado;
    }
    // El Sprint 2 estuvo en «próximamente» hasta que existieron sus piezas.
    // Quien tenga ese estado guardado pasa a bloqueado, que es lo que ahora
    // significa: disponible en cuanto cierres el anterior.
    if (state.sprints[id].estado === 'proximamente') state.sprints[id].estado = 'bloqueado';
  });

  // Un sprint no puede seguir bloqueado si el anterior está cerrado. Pasaba con
  // el progreso de quien cerró el Sprint 0 antes de que existiera el desbloqueo
  // automático: la aplicación le mandaba al Sprint 0 a cerrar algo ya cerrado.
  SPRINT_IDS.forEach((id, i) => {
    if (i === 0) return;
    const anterior = state.sprints[SPRINT_IDS[i - 1]];
    const sprint = state.sprints[id];
    if (anterior.estado === 'completado' && sprint.estado === 'bloqueado') {
      sprint.estado = sprint.pasos_completados.length > 0 ? 'en_progreso' : 'sin_iniciar';
    }
  });
  return state;
}

// Un navegador puede aceptar la escritura y no guardarla —navegación privada,
// almacenamiento lleno, cookies restringidas—. Callarlo es lo peor que se puede
// hacer: el profesor marca pasos durante media hora y al volver no hay nada.
// Las dos piezas descargables ya avisaban; la web no.
let avisoAlmacenamientoDado = false;

function aviso_no_guarda() {
  if (avisoAlmacenamientoDado) return;
  avisoAlmacenamientoDado = true;
  const banda = document.createElement('div');
  banda.className = 'aviso-no-guarda';
  banda.setAttribute('role', 'alert');
  banda.innerHTML = '<strong>Este navegador no está guardando tu avance.</strong> ' +
    'Suele pasar en navegación privada, con las cookies restringidas o con el almacenamiento lleno. ' +
    'Puedes seguir, pero al cerrar la pestaña se perderá lo que marques: ' +
    'descárgate tu trabajo antes de irte.';
  document.body.insertBefore(banda, document.body.firstChild);
}

function state_save(state) {
  state.actualizado_en = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Escribir sin excepción no basta: hay navegadores que aceptan y descartan.
    if (localStorage.getItem(STORAGE_KEY) === null) aviso_no_guarda();
  } catch (e) {
    console.error('Error guardando estado', e);
    aviso_no_guarda();
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
      if (guardar) {   // 'tab' también guarda: solo cambia a dónde va el foco
        const s = state_ensure();
        const valor = input.value.trim();
        s.asignatura = valor ? { nombre: valor } : null;
        state_save(s);
      }
      input.replaceWith(courseEl);
      courseEl.dataset.editing = 'false';
      ui_updateStatusStrip(state_ensure());
      // Solo se devuelve el foco si el usuario cerró a propósito. Hacerlo
      // siempre significaba que tabular hacia el siguiente botón te traía de vuelta.
      if (guardar !== 'tab') courseEl.focus();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); cerrar(true); }
      if (e.key === 'Escape') { e.preventDefault(); cerrar(false); }
      if (e.key === 'Tab') { cerrar('tab'); }
    });
    input.addEventListener('blur', () => cerrar('tab'));
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
  const lastVisitEl = document.getElementById('continue-lastvisit');

  const activeSprint = sprint_getActive(state);
  const btn = document.getElementById('continue-btn');

  // La portada decía «Continuar → Sprint 1» mientras las demás páginas decían
  // que el Sprint 1 estaba bloqueado. Ahora las dos leen lo mismo.
  const paso = guia_siguientePaso(state);

  if (!activeSprint) {
    if (titleEl) titleEl.textContent = 'Has cerrado los tres sprints';
    if (progressEl) progressEl.textContent = 'Lo que queda es el aula';
    if (btn) { btn.href = '/kit'; btn.textContent = 'Volver al kit →'; }
  } else {
    if (titleEl) titleEl.textContent = SPRINT_LABELS[activeSprint.id];
    if (progressEl) {
      const total = SPRINT_STEPS[activeSprint.id] || 0;
      const done = activeSprint.data.pasos_completados.length;
      progressEl.textContent = total > 0
        ? `Has completado ${done} de ${total} pasos`
        : 'Sin pasos que marcar todavía';
    }
    if (btn) {
      btn.href = paso.destino || `/${activeSprint.id.replace('_', '-')}`;
      btn.textContent = (paso.rotulo || 'Continuar') + ' →';
    }
  }
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

  const pct = sprint_progressPct(sprint, sprintId);
  const progressEl = document.getElementById(`${sprintId.replace('_', '-')}-progress`);
  if (progressEl) {
    progressEl.style.width = pct + '%';
    const barra = progressEl.parentElement;
    if (barra) {
      barra.setAttribute('role', 'progressbar');
      barra.setAttribute('aria-valuemin', '0');
      barra.setAttribute('aria-valuemax', '100');
      barra.setAttribute('aria-valuenow', String(pct));
      barra.setAttribute('aria-label', `Progreso del ${SPRINT_LABELS[sprintId].split(' · ')[0]}`);
    }
  }

  const bloqueado = sprint.estado === 'bloqueado' || sprint.estado === 'proximamente';
  const casillas = [...document.querySelectorAll(`[data-step][data-sprint="${sprintId}"]`)];
  casillas.forEach(el => {
    const isDone = sprint.pasos_completados.includes(el.dataset.step);
    el.classList.toggle('done', isDone);
    el.setAttribute('aria-checked', isDone ? 'true' : 'false');
    // Un paso de un sprint bloqueado recibía el foco y no hacía nada, sin decir
    // por qué: era indistinguible de uno que sí funciona.
    el.setAttribute('aria-disabled', bloqueado ? 'true' : 'false');
    el.setAttribute('tabindex', bloqueado ? '-1' : '0');
  });

  // Los tres pasos se veían exactamente igual, tanto el que tocaba ahora como
  // los que ya estaban hechos. Aquí se señala uno solo: el siguiente sin marcar.
  ui_marcaPasoEnCurso(sprint, casillas, bloqueado);

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
      hint.id = `${sprintId}-hint`;
      completeBtn.insertAdjacentElement('afterend', hint);
      completeBtn.setAttribute('aria-describedby', hint.id);
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

// ═══════════════════════════════════════════════════
// GUIADO
// La aplicación no observa a nadie ni envía nada: lo único que sabe es lo que
// el propio profesor ha marcado en este navegador. Con eso basta para dejar de
// ser un documento y proponerle el siguiente paso concreto.
// ═══════════════════════════════════════════════════

function ui_marcaPasoEnCurso(sprint, casillas, bloqueado) {
  let enCurso = null;
  if (!bloqueado && sprint.estado !== 'completado') {
    enCurso = casillas.find(el => !sprint.pasos_completados.includes(el.dataset.step)) || null;
  }
  casillas.forEach(el => {
    const bloque = el.closest('.step-block');
    if (!bloque) return;
    const activo = el === enCurso;
    bloque.classList.toggle('en-curso', activo);
    bloque.classList.toggle('ya-hecho', sprint.pasos_completados.includes(el.dataset.step));
    let marca = bloque.querySelector('.marca-en-curso');
    if (activo && !marca) {
      marca = document.createElement('span');
      marca.className = 'marca-en-curso';
      marca.textContent = 'Estás aquí';
      const num = bloque.querySelector('.step-num');
      if (num) num.appendChild(marca);
    } else if (!activo && marca) {
      marca.remove();
    }
  });
  return enCurso;
}

// Qué toca ahora, dicho en una frase y con su botón. Se calcula sólo con el
// estado guardado en este navegador.
function guia_siguientePaso(state) {
  const activo = sprint_getActive(state);
  if (!activo) {
    return { texto: 'Has cerrado los tres sprints. Lo que queda es el aula.', destino: null, rotulo: null };
  }
  const id = activo.id;
  const sprint = activo.data;
  const ruta = '/' + id.replace('_', '-');
  const nombre = (SPRINT_LABELS[id] || '').split(' · ')[0];

  if (sprint.estado === 'bloqueado') {
    // El anterior, sea cual sea, no el Sprint 0 siempre.
    const previo = SPRINT_IDS[SPRINT_IDS.indexOf(id) - 1] || 'sprint_0';
    const nombrePrevio = (SPRINT_LABELS[previo] || '').split(' · ')[0];
    return { texto: `Para abrir el ${nombre} hay que cerrar antes el ${nombrePrevio}.`,
             destino: '/' + previo.replace('_', '-'), rotulo: `Ir al ${nombrePrevio}` };
  }
  if (sprint.estado === 'proximamente') {
    return { texto: `El ${nombre} arranca en septiembre de 2026, con el cuatrimestre.`, destino: ruta, rotulo: 'Ver su alcance' };
  }

  const total = SPRINT_STEPS[id] || 0;
  const hechos = sprint.pasos_completados.length;
  if (total > 0 && hechos >= total) {
    return { texto: `Tienes los ${total} pasos del ${nombre} marcados: sólo falta cerrarlo.`, destino: ruta, rotulo: `Cerrar el ${nombre}` };
  }
  if (hechos === 0) {
    return { texto: `Lo siguiente es empezar el ${nombre}.`, destino: ruta, rotulo: `Empezar el ${nombre}` };
  }
  return { texto: `Vas por el paso ${hechos + 1} de ${total} del ${nombre}.`, destino: ruta, rotulo: 'Continuar' };
}

// Una sola llamada a la acción, al final de la página, en todas las páginas que
// la declaren con <div id="siguiente-paso">.
function ui_pintaSiguientePaso(state) {
  const caja = document.getElementById('siguiente-paso');
  if (!caja) return;
  const p = guia_siguientePaso(state);
  const enEstaPagina = p.destino && location.pathname.replace(/\.html$/, '').replace(/\/$/, '') === p.destino;
  caja.innerHTML = '';
  const t = document.createElement('div');
  t.className = 'sp-texto';
  t.appendChild(Object.assign(document.createElement('strong'), { textContent: 'Lo siguiente' }));
  t.appendChild(document.createTextNode(p.texto));
  caja.appendChild(t);
  if (p.destino && p.rotulo && !enEstaPagina) {
    const a = document.createElement('a');
    a.href = p.destino;
    a.className = 'btn primary small';
    a.textContent = p.rotulo + ' →';
    caja.appendChild(a);
  }
  caja.hidden = false;
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
    ui_pintaSiguientePaso(s);
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
      const marcado = state_ensure().sprints[sprintId].pasos_completados.includes(el.dataset.step);
      const total = sprint_totalSteps(sprintId);
      const hechos = state_ensure().sprints[sprintId].pasos_completados.length;
      anuncia(`${marcado ? 'Paso marcado' : 'Paso desmarcado'}. ${hechos} de ${total} completados.`);
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
      // Cerrar un sprint es el momento natural para llevarse el trabajo: hay
      // algo terminado que perder y el profesor va a estar semanas sin volver.
      // Se ofrece aquí en vez de recordarlo cada tantos días, que es ruido.
      ofrece_descarga(sprintId);
    });
  }
}

// ═══════════════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════════════

// El trabajo del profesor vive en tres cajones del mismo navegador: el avance
// por los sprints (esta web), los escenarios de la Plantilla estratégica y el
// Cuaderno de pilotaje. Sin cuenta de usuario, el fichero ES la portabilidad,
// así que tiene que bajar entero: tres descargas separadas se convierten en
// tres oportunidades de perder una.
const CLAVES_KIT = [
  ['progreso',  'redisena_evaluacion',                 'tu avance por los sprints'],
  ['plantilla', 'redisena-plantilla-estrategica-v0',   'los escenarios de la Plantilla estratégica'],
  ['cuaderno',  'redisena-cuaderno-pilotaje-v0',       'el Cuaderno de pilotaje'],
];

function kit_recoge() {
  const piezas = {};
  CLAVES_KIT.forEach(([nombre, clave]) => {
    try {
      const crudo = localStorage.getItem(clave);
      if (crudo) piezas[nombre] = JSON.parse(crudo);
    } catch (e) { console.warn('No se pudo leer', clave, e); }
  });
  return piezas;
}

function kit_describe(piezas) {
  return CLAVES_KIT.filter(([n]) => piezas[n]).map(([, , texto]) => texto);
}

const NOMBRE_SPRINT = { sprint_0: 'Sprint 0', sprint_1: 'Sprint 1', sprint_2: 'Sprint 2' };

// Se ofrece la descarga al cerrar un sprint. No se fuerza: quien diga que no,
// no vuelve a verlo por ese sprint.
function ofrece_descarga(sprintId) {
  const piezas = kit_describe(kit_recoge());
  const que = piezas.length ? piezas.join(', ') : 'tu avance';
  const nombre = NOMBRE_SPRINT[sprintId] || 'el sprint';
  const texto = `Has cerrado el ${nombre}.\n\n` +
    `Tu trabajo vive sólo en este navegador: si borras los datos del sitio o cambias de equipo, no viaja contigo. ` +
    `Puedes descargarlo ahora en un único archivo, que incluye ${que}.\n\n` +
    `Guárdalo donde ya guardas lo demás —tu Drive, tu carpeta de la asignatura— y podrás volver a cargarlo desde cualquier equipo.\n\n` +
    `¿Lo descargas?`;
  if (confirm(texto)) state_export();
}

function state_export() {
  const s = state_load();
  if (!s) { alert('No hay estado para exportar todavía.'); return; }
  const piezas = kit_recoge();
  const sobre = {
    _archivo: 'redisena-kit-v1',
    guardado_en: new Date().toISOString(),
    contiene: kit_describe(piezas),
    piezas: piezas,
  };
  const blob = new Blob([JSON.stringify(sobre, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const crudo = (s.asignatura && s.asignatura.nombre) || 'asignatura';
  const name = crudo.toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'asignatura';
  a.href = url;
  a.download = `redisena-kit-${name}-${stamp}.json`;
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

      // Sobre nuevo: trae las tres piezas. Se restaura cada una en su cajón.
      if (parsed._archivo === 'redisena-kit-v1' && parsed.piezas) {
        const puestas = [];
        CLAVES_KIT.forEach(([nombre, clave, texto]) => {
          const pieza = parsed.piezas[nombre];
          if (!pieza) return;
          const valor = (nombre === 'progreso') ? state_normalize(pieza) : pieza;
          localStorage.setItem(clave, JSON.stringify(valor));
          puestas.push(texto);
        });
        if (!puestas.length) throw new Error('el archivo no trae ninguna pieza reconocible');
        alert('Restaurado: ' + puestas.join(' · ') + '.');
        location.reload();
        return;
      }

      // Archivo antiguo: sólo el avance por los sprints. Se sigue admitiendo.
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

// Zona donde se anuncian los cambios que ocurren sin recargar. Sin esto, quien
// usa lector de pantalla marcaba un paso y no recibía ninguna confirmación.
function ui_prepararAnuncios() {
  if (document.getElementById('anuncios')) return;
  const el = document.createElement('div');
  el.id = 'anuncios';
  el.className = 'visually-hidden';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
}
function anuncia(texto) {
  const el = document.getElementById('anuncios');
  if (el) { el.textContent = ''; setTimeout(() => { el.textContent = texto; }, 60); }
}

// ═══════════════════════════════════════════════════
// CAPAS DE INFORMACIÓN
// La primera capa dice qué es esto, qué toca ahora y cuánto cuesta. El resto
// vive en <details class="capa">. Quien prefiera verlo todo lo dice una vez y
// se le recuerda en todas las páginas.
// ═══════════════════════════════════════════════════

function ui_aplicaDetalle(abrir) {
  document.querySelectorAll('details.capa').forEach(d => { d.open = abrir; });
}

// El navegador no despliega un <details> cerrado al imprimir, así que en papel
// se perdía hasta el 65 % del texto de la página, sin ninguna señal de que
// faltara algo. Se abren antes de imprimir y se dejan como estaban después.
function ui_prepararImpresion() {
  let cerradas = [];
  const antes = () => {
    cerradas = [...document.querySelectorAll('details.capa')].filter(d => !d.open);
    cerradas.forEach(d => { d.open = true; });
  };
  const despues = () => { cerradas.forEach(d => { d.open = false; }); cerradas = []; };
  window.addEventListener('beforeprint', antes);
  window.addEventListener('afterprint', despues);
  if (window.matchMedia) {
    const mq = window.matchMedia('print');
    const escucha = (e) => (e.matches ? antes() : despues());
    if (mq.addEventListener) mq.addEventListener('change', escucha);
    else if (mq.addListener) mq.addListener(escucha);
  }
}

function ui_bindDetalle(state) {
  const botones = document.querySelectorAll('[data-action="detalle"]');
  if (!botones.length) return;
  const hayCapas = document.querySelectorAll('details.capa').length > 0;
  if (!hayCapas) { botones.forEach(b => b.hidden = true); return; }

  const pinta = (activo) => {
    botones.forEach(b => {
      b.setAttribute('aria-pressed', activo ? 'true' : 'false');
      b.textContent = activo ? 'Ver menos detalle' : 'Ver todo el detalle';
    });
  };

  let activo = !!(state.prefs && state.prefs.detalle);
  if (activo) ui_aplicaDetalle(true);
  pinta(activo);

  botones.forEach(b => b.addEventListener('click', () => {
    activo = !activo;
    ui_aplicaDetalle(activo);
    pinta(activo);
    const s = state_ensure();
    s.prefs = s.prefs || {};
    s.prefs.detalle = activo;
    state_save(s);
    anuncia(activo ? 'Detalle desplegado en toda la página.' : 'Detalle recogido. Se abre apartado a apartado.');
  }));
}

function app_init() {
  const state = state_touchVisit();
  ui_prepararAnuncios();

  ui_updateStatusStrip(state);
  ui_pintaSiguientePaso(state);
  ui_bindCourseName();
  ui_bindImport();

  // Conectar botones globales del status strip
  document.querySelectorAll('[data-action="export"]').forEach(btn => {
    btn.addEventListener('click', state_export);
  });
  ui_bindDetalle(state);
  ui_prepararImpresion();
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
