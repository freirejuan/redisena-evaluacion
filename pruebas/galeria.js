const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('https://fonts.g**',r=>r.abort());
  const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  page.on('dialog', async d=>await d.accept());
  await page.goto('http://localhost:8099/downloads/sprint-0/plantilla-estrategica.html');
  await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.waitForTimeout(700);

  // Trabajo propio del profesor
  await page.fill('#asig-nombre','Mi asignatura'); await page.click('.tp-add'); await page.waitForTimeout(700);

  await page.click('text=Ejemplos'); await page.waitForTimeout(500);
  const items = await page.locator('.gal-item').count();
  check(items===5, `la galería ofrece 5 asignaturas (${items})`);
  const modelos = await page.locator('.gal-modelo').allTextContents();
  console.log('     modelos:', modelos.join(' | '));

  await page.locator('.gal-item', {hasText:'Clásica'}).locator('button').click();
  await page.waitForTimeout(1000);
  check(await page.locator('#gal-fondo').isHidden(), 'la galería se cierra al añadir');
  const escs = await page.locator('#esc-select option').allTextContents();
  check(escs.length===4, `ahora hay 4 escenarios: el suyo más los 3 del ejemplo (${escs.length})`);
  check(escs[0]==='Escenario 1' || escs[0].includes('Escenario'), `el suyo sigue el primero (${escs[0]})`);
  check(escs.slice(1).every(n=>n.includes('·')), 'los del ejemplo llevan el nombre de la asignatura por delante');

  // Su trabajo no se ha tocado
  const ids = await page.evaluate(()=>libro.escenarios.map(e=>e.id));
  await page.selectOption('#esc-select', ids[0]); await page.waitForTimeout(700);
  check(await page.locator('#asig-nombre').inputValue()==='Mi asignatura', 'su asignatura sigue intacta');
  check(await page.locator('.tp-card').count()===1, 'y su touchpoint también');

  // La comparación con los tres escenarios del ejemplo
  await page.selectOption('#esc-select', ids[1]); await page.waitForTimeout(600);
  await page.click('[data-view="comparar"]'); await page.waitForTimeout(800);
  const cols = await page.locator('.cmp-tabla thead th').count();
  check(cols===5, `la comparación pone las 4 columnas más la etiqueta (${cols})`);
  const sem = await page.locator('.cmp-tabla tbody tr').first().locator('td').allTextContents();
  console.log('     semáforos comparados:', sem.map(s=>s.trim()).join(' | '));

  // Añadir un segundo ejemplo no pisa el primero
  await page.click('[data-view="plantilla"]'); await page.waitForTimeout(300);
  await page.click('text=Ejemplos'); await page.waitForTimeout(400);
  await page.locator('.gal-item', {hasText:'Masiva'}).locator('button').click();
  await page.waitForTimeout(900);
  check((await page.locator('#esc-select option').count())===7, `añadir un segundo ejemplo suma, no reemplaza (${await page.locator('#esc-select option').count()})`);

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
