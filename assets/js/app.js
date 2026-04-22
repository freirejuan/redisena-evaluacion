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
    ultima_visita: now
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
    return parsed;
  } catch (e) {
    console.error('Error leyendo estado de localStorage', e);
    return null;
  }
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
  // Actualizar última visita en cada carga
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
  if (sprintId === 'sprint_0' && state.sprints.sprint_1.estado === 'bloqueado') {
    state.sprints.sprint_1.estado = 'sin_iniciar';
  }

  state_save(state);
  return state;
}

// ═══════════════════════════════════════════════════
// UI · STATUS STRIP
// ═══════════════════════════════════════════════════

function ui_updateStatusStrip(state) {
  const courseEl = document.getElementById('status-course');
  const stepEl   = document.getElementById('status-step');
  if (!courseEl || !stepEl) return;

  if (!state.asignatura) {
    courseEl.textContent = 'Sin iniciar';
    stepEl.textContent = '—';
    return;
  }

  courseEl.textContent = state.asignatura.nombre || 'Sin nombre';

  // El "estado" del strip es el sprint activo
  const activeSprint = sprint_getActive(state);
  if (activeSprint) {
    stepEl.textContent = `${SPRINT_LABELS[activeSprint.id].split(' · ')[0]} · ${ESTADO_LABELS[activeSprint.data.estado].toLowerCase()}`;
  } else {
    stepEl.textContent = 'Proceso completado';
  }
}

function sprint_getActive(state) {
  for (const id of ['sprint_0', 'sprint_1', 'sprint_2']) {
    const data = state.sprints[id];
    if (data.estado === 'en_progreso' || data.estado === 'sin_iniciar') {
      return { id, data };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════
// UI · HOME · primera visita vs. continuar
// ═══════════════════════════════════════════════════

function ui_showHomeVariant(state) {
  const first  = document.getElementById('hero-first-visit');
  const returning = document.getElementById('hero-returning');
  if (!first || !returning) return;

  const shouldContinue = state.asignatura &&
    (state.sprints.sprint_0.estado !== 'sin_iniciar' ||
     state.sprints.sprint_1.estado === 'en_progreso' ||
     state.sprints.sprint_1.estado === 'sin_iniciar');

  if (shouldContinue) {
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

  const activeSprint = sprint_getActive(state) || { id: 'sprint_0', data: state.sprints.sprint_0 };
  if (titleEl) titleEl.textContent = SPRINT_LABELS[activeSprint.id];
  if (progressEl) {
    const total = sprint_totalSteps(activeSprint.id);
    const done = activeSprint.data.pasos_completados.length;
    progressEl.textContent = `Has completado ${done} de ${total} pasos`;
  }
  if (continueBtn) {
    continueBtn.href = `/${activeSprint.id.replace('_', '-')}`;
  }

  // Progreso visual de cada tarjeta
  const s0Pct = sprint_progressPct(state.sprints.sprint_0, 'sprint_0');
  const s0Fill = document.getElementById('s0-progress');
  if (s0Fill) s0Fill.style.width = s0Pct + '%';
}

function sprint_totalSteps(sprintId) {
  const counts = { sprint_0: 3, sprint_1: 4, sprint_2: 0 };
  return counts[sprintId] || 0;
}

function sprint_progressPct(sprintData, sprintId) {
  const total = sprint_totalSteps(sprintId);
  if (total === 0) return 0;
  return Math.round((sprintData.pasos_completados.length / total) * 100);
}

// ═══════════════════════════════════════════════════
// UI · SPRINT PAGES · checkboxes
// ═══════════════════════════════════════════════════

function ui_initSprintPage(state, sprintId) {
  // Actualizar meta del hero
  const stateEl = document.getElementById(`${sprintId.replace('_', '-')}-state`);
  if (stateEl) stateEl.textContent = ESTADO_LABELS[state.sprints[sprintId].estado];

  // Progress bar del hero
  const progressEl = document.getElementById(`${sprintId.replace('_', '-')}-progress`);
  if (progressEl) progressEl.style.width = sprint_progressPct(state.sprints[sprintId], sprintId) + '%';

  // Checkboxes
  document.querySelectorAll(`[data-step][data-sprint="${sprintId}"]`).forEach(el => {
    const stepId = el.dataset.step;
    const isDone = state.sprints[sprintId].pasos_completados.includes(stepId);
    el.classList.toggle('done', isDone);

    el.addEventListener('click', () => {
      const s = state_load();
      sprint_toggleStep(s, sprintId, stepId);
      // Re-render
      ui_initSprintPage(s, sprintId);
      ui_updateStatusStrip(s);
    });
  });

  // Botón de marcar sprint como completado
  const completeBtn = document.querySelector(`[data-action="complete-sprint"][data-sprint="${sprintId}"]`);
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      const s = state_load();
      sprint_markComplete(s, sprintId);
      ui_initSprintPage(s, sprintId);
      ui_updateStatusStrip(s);
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
  const name = (s.asignatura && s.asignatura.nombre) ? s.asignatura.nombre.toLowerCase().replace(/\s+/g, '-') : 'asignatura';
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
      if (!parsed.schema_version) throw new Error('Archivo sin schema_version');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      location.reload();
    } catch (err) {
      alert('No se pudo importar: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════
// INICIALIZACIÓN POR PÁGINA
// ═══════════════════════════════════════════════════

function app_init() {
  const state = state_ensure();

  ui_updateStatusStrip(state);

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
  const body = document.body;
  const pageId = body.dataset.page;

  if (pageId === 'inicio') {
    ui_showHomeVariant(state);
  } else if (pageId && pageId.startsWith('sprint-')) {
    const sprintId = pageId.replace('-', '_');
    ui_initSprintPage(state, sprintId);
  }
}

// Arrancar al cargar el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', app_init);
} else {
  app_init();
}
