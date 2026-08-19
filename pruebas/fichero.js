const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { TMP } = require('./rutas');

// ═══════════════════════════════════════════════════
// LA ERGONOMÍA DEL FICHERO
//
// El kit no tiene cuenta de usuario y no la va a tener (decisión E12). Eso
// significa que el fichero ES la portabilidad: es lo único que lleva el trabajo
// de un equipo a otro y lo único que lo salva si el navegador se lleva por
// delante el almacenamiento. Estas cuatro cosas tienen que cumplirse siempre:
//
//   1 · si el navegador no está guardando, se dice —callarlo cuesta una tarde
//       de trabajo del profesor;
//   2 · lo que baja es UN fichero con las tres piezas, no tres ficheros;
//   3 · ese fichero, cargado en un navegador limpio, devuelve las tres;
//   4 · los ficheros antiguos, que sólo traían el avance, siguen cargando.
// ═══════════════════════════════════════════════════

const BASE = 'http://localhost:8099';
const ok = [], mal = [];
const check = (c, m) => (c ? ok : mal).push(m);

(async () => {
  const b = await chromium.launch();
  const errs = [];

  // ── 1 · Un solo fichero, con las tres piezas dentro
  const ctx = await b.newContext({ acceptDownloads: true });
  await ctx.route('**://fonts.g*.com/**', r => r.abort());
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('dialog', d => d.accept());

  await pg.goto(BASE + '/404.html');
  await pg.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('redisena-plantilla-estrategica-v0', JSON.stringify({
      _formato: 'escenarios-v1', activo: 'a',
      escenarios: [{ id: 'a', nombre: 'Base', estado: { 'asig-nombre': 'Óptica Aplicada' } }] }));
    localStorage.setItem('redisena-cuaderno-pilotaje-v0', JSON.stringify({
      instrumentos: ['pulso'], hipotesis: ['los grupos llegan sin leer'] }));
  });

  await pg.goto(BASE + '/sprint-0.html');
  await pg.waitForTimeout(400);
  await pg.click('.checkbox[data-step="paso_1"]');
  await pg.waitForTimeout(300);

  const [dl] = await Promise.all([
    pg.waitForEvent('download'),
    pg.click('[data-action="export"]'),
  ]);
  const fichero = path.join(TMP, 'kit-completo.json');
  await dl.saveAs(fichero);
  const sobre = JSON.parse(fs.readFileSync(fichero, 'utf8'));

  check(sobre._archivo === 'redisena-kit-v1', `el fichero se identifica (${sobre._archivo})`);
  const piezas = Object.keys(sobre.piezas || {});
  check(piezas.length === 3 && piezas.includes('progreso') && piezas.includes('plantilla') && piezas.includes('cuaderno'),
    `y trae las tres piezas en una sola descarga (${piezas.join(', ')})`);
  check(sobre.piezas.plantilla.escenarios[0].estado['asig-nombre'] === 'Óptica Aplicada',
    'con los escenarios de la Plantilla dentro');
  check((sobre.piezas.cuaderno.instrumentos || []).includes('pulso'),
    'y el Cuaderno de pilotaje dentro');
  check(Array.isArray(sobre.contiene) && sobre.contiene.length === 3,
    'y dice en castellano qué lleva, para quien lo abra dentro de un año');

  // ── 2 · Cargado en un navegador limpio, devuelve las tres
  const ctx2 = await b.newContext({ acceptDownloads: true });
  await ctx2.route('**://fonts.g*.com/**', r => r.abort());
  const pg2 = await ctx2.newPage();
  pg2.on('pageerror', e => errs.push(e.message));
  pg2.on('dialog', d => d.accept());
  await pg2.goto(BASE + '/sprint-0.html');
  await pg2.waitForTimeout(400);
  await pg2.setInputFiles('input[type=file]', fichero);
  await pg2.waitForTimeout(1500);

  const vuelto = await pg2.evaluate(() => ({
    plantilla: JSON.parse(localStorage.getItem('redisena-plantilla-estrategica-v0') || 'null'),
    cuaderno:  JSON.parse(localStorage.getItem('redisena-cuaderno-pilotaje-v0') || 'null'),
    sprint0:   (JSON.parse(localStorage.getItem('redisena_evaluacion') || '{}').sprints || {}).sprint_0,
  }));
  check(vuelto.plantilla && vuelto.plantilla.escenarios[0].estado['asig-nombre'] === 'Óptica Aplicada',
    'en otro navegador, el fichero devuelve los escenarios de la Plantilla');
  check(vuelto.cuaderno && (vuelto.cuaderno.instrumentos || []).includes('pulso'),
    'devuelve el Cuaderno de pilotaje');
  check(vuelto.sprint0 && vuelto.sprint0.pasos_completados.includes('paso_1'),
    'y devuelve el avance por los sprints');

  // ── 3 · Un fichero antiguo —sólo el avance— sigue cargando
  const antiguo = path.join(TMP, 'progreso-antiguo.json');
  fs.writeFileSync(antiguo, JSON.stringify({
    schema_version: 1,
    sprints: { sprint_0: { estado: 'completado', pasos_completados: ['paso_1','paso_2','paso_3'], completado_en: '2026-06-01T10:00:00.000Z' } },
  }));
  const ctx3 = await b.newContext({ acceptDownloads: true });
  await ctx3.route('**://fonts.g*.com/**', r => r.abort());
  const pg3 = await ctx3.newPage();
  pg3.on('pageerror', e => errs.push(e.message));
  pg3.on('dialog', d => d.accept());
  await pg3.goto(BASE + '/sprint-0.html');
  await pg3.waitForTimeout(400);
  await pg3.setInputFiles('input[type=file]', antiguo);
  await pg3.waitForTimeout(1500);
  const viejo = await pg3.evaluate(() =>
    (JSON.parse(localStorage.getItem('redisena_evaluacion') || '{}').sprints || {}).sprint_0);
  check(viejo && viejo.pasos_completados.length === 3,
    'un fichero de los de antes, con sólo el avance, se sigue cargando');

  // ── 4 · Si el navegador no guarda, se dice
  const ctx4 = await b.newContext();
  await ctx4.route('**://fonts.g*.com/**', r => r.abort());
  const pg4 = await ctx4.newPage();
  await pg4.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'setItem', {
      value() { throw new DOMException('quota', 'QuotaExceededError'); } });
  });
  await pg4.goto(BASE + '/sprint-0.html');
  await pg4.waitForTimeout(400);
  // Se avisa en cuanto se sabe, no después de que el profesor haya invertido
  // media hora: el primer guardado ocurre al cargar la página, así que la banda
  // ya está antes de tocar nada. Avisar tarde es no avisar.
  check(await pg4.locator('.aviso-no-guarda').count() === 1,
    'se avisa nada más entrar, antes de que haya trabajo que perder');
  await pg4.click('.checkbox[data-step="paso_1"]');
  await pg4.waitForTimeout(400);
  const banda = pg4.locator('.aviso-no-guarda');
  check(await banda.count() === 1 && await banda.isVisible(),
    'al marcar un paso sin poder guardarlo, se avisa');
  const texto = await banda.count() ? await banda.innerText() : '';
  check(/descarga|descárgate/i.test(texto),
    'y el aviso dice qué hacer, no sólo qué pasa');
  await pg4.click('.checkbox[data-step="paso_2"]');
  await pg4.waitForTimeout(300);
  check(await pg4.locator('.aviso-no-guarda').count() === 1,
    'y no se repite en cada clic');

  // ── 5 · Al cerrar un sprint se ofrece la descarga
  const ctx5 = await b.newContext({ acceptDownloads: true });
  await ctx5.route('**://fonts.g*.com/**', r => r.abort());
  const pg5 = await ctx5.newPage();
  pg5.on('pageerror', e => errs.push(e.message));
  const dialogos = [];
  pg5.on('dialog', async d => { dialogos.push(d.message()); await d.dismiss(); });
  await pg5.goto(BASE + '/sprint-0.html');
  await pg5.waitForTimeout(400);
  // El botón de cerrar sprint no se habilita hasta tener los tres pasos.
  for (const paso of ['paso_1', 'paso_2', 'paso_3']) {
    await pg5.click(`.checkbox[data-step="${paso}"]`);
    await pg5.waitForTimeout(200);
  }
  await pg5.click('[data-action="complete-sprint"]');
  await pg5.waitForTimeout(600);
  check(dialogos.length === 1 && /descarg/i.test(dialogos[0]),
    'al cerrar el Sprint 0 se ofrece llevarse el trabajo');
  check(dialogos.length === 1 && /Drive|carpeta/i.test(dialogos[0]),
    'y se dice dónde guardarlo, que es lo que resuelve la sincronización');

  check(errs.length === 0, `sin errores de JavaScript${errs.length ? ': ' + errs[0] : ''}`);

  await b.close();
  console.log(ok.map(m => '  ✓ ' + m).join('\n'));
  if (mal.length) { console.log('\nFALLOS:'); mal.forEach(m => console.log('  ✗ ' + m)); process.exit(1); }
})();
