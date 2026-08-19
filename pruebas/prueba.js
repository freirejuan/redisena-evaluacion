const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const BASE = 'http://localhost:8099';
const fallos = [];
const ok = [];
const check = (cond, msg) => (cond ? ok : fallos).push(msg);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  // Sin red en este entorno, la hoja de Google Fonts tarda segundos en fallar y
  // bloquea la ejecución de app.js. La abortamos para medir la app, no la red.
  await ctx.route('https://fonts.googleapis.com/**', r => r.abort());
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

  // ── 1. El bug de los listeners: marcar, desmarcar, volver a marcar
  await page.goto(BASE + '/sprint-0.html');
  const p1 = page.locator('[data-sprint="sprint_0"][data-step="paso_1"]');
  await p1.click();
  check(await p1.evaluate(el => el.classList.contains('done')), 'clic 1 marca el paso');
  await p1.click();
  check(!(await p1.evaluate(el => el.classList.contains('done'))), 'clic 2 desmarca el paso (era el bug de los listeners)');
  await p1.click();
  check(await p1.evaluate(el => el.classList.contains('done')), 'clic 3 vuelve a marcar');

  // ── 2. Progreso y botón de cierre
  const ancho = () => page.locator('#sprint-0-progress').evaluate(el => el.style.width);
  check(await ancho() === '33%', `barra al 33% con 1 de 3 pasos (era ${await ancho()})`);
  const btn = page.locator('[data-action="complete-sprint"][data-sprint="sprint_0"]');
  check(await btn.isDisabled(), 'botón de cierre deshabilitado con pasos pendientes');
  check((await page.locator('.complete-hint').textContent()).includes('2 pasos'), 'el aviso dice cuántos pasos faltan');

  await page.locator('[data-step="paso_2"]').click();
  await page.locator('[data-step="paso_3"]').click();
  check(await ancho() === '100%', `barra al 100% con los 3 pasos (era ${await ancho()})`);
  check(await btn.isEnabled(), 'botón de cierre habilitado con todos los pasos');

  // ── 3. Teclado
  const p2 = page.locator('[data-step="paso_2"]');
  check(await p2.getAttribute('role') === 'checkbox', 'los pasos son role=checkbox');
  check(await p2.getAttribute('aria-checked') === 'true', 'aria-checked refleja el estado');
  await p2.focus();
  await page.keyboard.press(' ');
  check(await p2.getAttribute('aria-checked') === 'false', 'la barra espaciadora desmarca el paso');
  await page.keyboard.press('Enter');
  check(await p2.getAttribute('aria-checked') === 'true', 'Enter vuelve a marcarlo');

  // ── 4. Cierre de sprint y desbloqueo del siguiente
  await btn.click();
  check(await page.locator('#sprint-0-state').textContent() === 'Completado', 'el Sprint 0 queda completado');
  const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('redisena_evaluacion')));
  check((await st()).sprints.sprint_1.estado === 'sin_iniciar', 'cerrar el Sprint 0 desbloquea el Sprint 1');

  // ── 5. Recuento de pasos del Sprint 1
  await page.goto(BASE + '/sprint-1.html');
  const pasosS1 = await page.locator('[data-sprint="sprint_1"][data-step]').count();
  check(pasosS1 === 3, `el Sprint 1 tiene 3 pasos en la página (${pasosS1})`);
  await page.locator('[data-sprint="sprint_1"][data-step]').first().click();
  const anchoS1 = await page.locator('#sprint-1-progress').evaluate(el => el.style.width);
  check(anchoS1 === '33%', `1 de 3 pasos da 33%, no 25% (era ${anchoS1})`);

  // ── 6. Nombre de asignatura desde la barra de estado
  await page.locator('#status-course').click();
  await page.locator('.course-input').fill('Ingeniería del Software');
  await page.keyboard.press('Enter');
  check(await page.locator('#status-course').textContent() === 'Ingeniería del Software', 'el nombre de la asignatura se guarda');
  check((await page.locator('#status-step').textContent()).includes('Sprint 1'), 'la barra de estado señala el sprint activo');

  // ── 7. Portada de vuelta
  await page.goto(BASE + '/index.html');
  check(await page.locator('#hero-returning').isVisible(), 'la portada muestra la variante de vuelta');
  check(!(await page.locator('#hero-first-visit').isVisible()), 'la variante de primera visita queda oculta');
  check(await page.locator('#s0-progress').evaluate(el => el.style.width) === '100%', 'la tarjeta del Sprint 0 marca 100%');
  check(await page.locator('#s1-progress').evaluate(el => el.style.width) === '33%', 'la tarjeta del Sprint 1 ya no está clavada al 0%');
  check(await page.locator('#s1-estado').textContent() === 'En progreso', 'la tarjeta del Sprint 1 dice el estado real');

  // ── 8. Exportar e importar el progreso
  const descarga = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-action="export"]').click(),
  ]).then(r => r[0]);
  const ruta = TMP + '/' + descarga.suggestedFilename();
  await descarga.saveAs(ruta);
  check(/redisena-kit-ingenieria-del-software-\d{8}\.json/.test(descarga.suggestedFilename()),
        `el archivo se llama bien: ${descarga.suggestedFilename()}`);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  check(await page.locator('#hero-first-visit').isVisible(), 'tras borrar, vuelve la portada de primera visita');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('[data-action="import"]').click(),
  ]);
  await chooser.setFiles(ruta);
  let restaurado = true;
  try {
    await page.waitForFunction(
      () => document.querySelector('#status-course')?.textContent === 'Ingeniería del Software',
      null, { timeout: 5000 });
  } catch (e) { restaurado = false; }
  check(restaurado, 'cargar el progreso lo restaura');
  check(await page.locator('#s0-progress').evaluate(el => el.style.width) === '100%',
        'el progreso restaurado se repinta en la portada');

  // ── 9. Sprint 2: no se puede marcar nada todavía, pero la barra no miente
  await page.goto(BASE + '/sprint-2.html');
  check((await page.locator('#status-step').textContent()).includes('Sprint'), 'la barra no dice «Proceso completado» antes de tiempo');

  const propios = errores.filter(e => !/ERR_CONNECTION_RESET|ERR_FAILED|fonts\.g/.test(e));
  check(propios.length === 0, 'ningún error de JavaScript propio' + (propios.length ? ': ' + propios.join(' | ') : ''));

  await browser.close();
  console.log('\n✓ ' + ok.length + ' comprobaciones pasadas:');
  ok.forEach(m => console.log('   ✓ ' + m));
  if (fallos.length) { console.log('\n✗ FALLOS:'); fallos.forEach(m => console.log('   ✗ ' + m)); process.exit(1); }
  console.log('\nTodo en verde.');
})();
