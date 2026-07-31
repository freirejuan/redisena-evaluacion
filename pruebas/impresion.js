const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const URL='http://localhost:8099/downloads/sprint-0/plantilla-estrategica.html';
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('https://fonts.g**',r=>r.abort());
  const page=await ctx.newPage(); page.on('dialog',async d=>await d.accept());
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(URL); await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.waitForTimeout(400);

  // Cargar el ejemplo y comprobar que llega completo
  await page.evaluate(()=>{ applyState(DEMO_STATE, true); persist(); refreshActiveView(); }); await page.waitForTimeout(1200);
  check(await page.locator('#asig-curso').inputValue()==='3º', `el ejemplo rellena el curso (${await page.locator('#asig-curso').inputValue()})`);
  check((await page.locator('#asig-semestre').inputValue()).includes('cuatrimestre'), 'y el semestre');
  const nota = await page.locator('[name="combo-comentario"]').inputValue().catch(()=>'');
  check(nota.length>20, 'y la nota sobre el aula, que se perdía por una clave mal escrita');
  const horas = (await page.locator('#stat-horas').textContent()).trim();
  check(horas!=='—', `el semáforo del ejemplo usa la lectura por horas (${horas})`);

  // Impresión de la Plantilla, medida con su vista todavía activa
  await page.emulateMedia({media:'print'});
  await page.waitForTimeout(400);
  const impPlantilla = await page.evaluate(()=>{
    const g=document.querySelector('.field-grid.cols-4');
    const el=document.getElementById('asig-estudiantes');
    return { visible: getComputedStyle(g).display !== 'none',
             columnas: getComputedStyle(g).gridTemplateColumns.split(/\s+/).filter(x=>x.endsWith('px')).length,
             marcador: getComputedStyle(el,'::placeholder').color,
             borde: getComputedStyle(el).borderTopWidth };
  });
  check(impPlantilla.visible, 'la vista de la Plantilla se está midiendo activa');
  check(impPlantilla.columnas===4, `las rejillas de cuatro columnas siguen siendo cuatro al imprimir (${impPlantilla.columnas})`);
  check(/rgba\(0, 0, 0, 0\)|transparent/.test(impPlantilla.marcador), `los textos de ejemplo no se imprimen (${impPlantilla.marcador})`);
  check(impPlantilla.borde==='0px', `los recuadros de los campos desaparecen en papel (${impPlantilla.borde})`);
  await page.emulateMedia({media:'screen'});
  await page.waitForTimeout(200);

  // Canvas con doce touchpoints
  for(let i=0;i<9;i++) await page.click('.tp-add');
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{ document.querySelectorAll('.tabs-bar button, .tabs-bar a').forEach(e=>{ if(/canvas/i.test(e.textContent)) e.click(); }); });
  await page.waitForTimeout(700);
  const pintados = await page.locator('#view-canvas .timeline-step').count();
  const total = await page.evaluate(()=>collectState().touchpoints.length);
  check(pintados===total, `el Canvas pinta los ${total} touchpoints, no tres (pinta ${pintados})`);

  await page.emulateMedia({media:'print'});
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ document.querySelectorAll('.tabs-bar button, .tabs-bar a').forEach(e=>{ if(/blueprint/i.test(e.textContent)) e.click(); }); });
  await page.waitForTimeout(600);
  const bp = await page.evaluate(()=>{
    const w=document.querySelector('.view-blueprint .bp-matrix-wrap');
    const m=document.querySelector('.view-blueprint .bp-matrix');
    if(!w||!m) return null;
    return { desborda: m.scrollWidth > w.clientWidth + 2, overflow: getComputedStyle(w).overflowX,
             columnas: getComputedStyle(m).gridTemplateColumns.split(' ').length };
  });
  if(bp){
    check(!bp.desborda, `la matriz del Blueprint cabe entera al imprimir (desborda=${bp.desborda})`);
    check(bp.overflow==='visible', 'y ya no se recorta con desplazamiento');
    console.log(`     columnas de la matriz: ${bp.columnas} (12 touchpoints + etiqueta + transversal = 14)`);
  } else check(false,'no se encontró la matriz del Blueprint');

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
