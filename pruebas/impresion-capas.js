const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const B='http://localhost:8099';
const cuenta = t => t.replace(/\s+/g,' ').trim().split(' ').length;
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('**://fonts.g*.com/**',r=>r.abort());
  const pg=await ctx.newPage();
  for (const f of ['sprint-0.html','sprint-1.html','kit.html','acerca.html','sprint-2.html']){
    await pg.goto(B+'/'+f); await pg.waitForTimeout(500);
    const capas = await pg.locator('details.capa').count();
    if(!capas) continue;
    await pg.emulateMedia({ media:'print' }); await pg.waitForTimeout(400);
    const abiertas = await pg.locator('details.capa[open]').count();
    const visible = await pg.evaluate(()=>document.querySelector('main').innerText);
    await pg.emulateMedia({ media:'screen' }); await pg.waitForTimeout(400);
    const trasVolver = await pg.locator('details.capa[open]').count();
    const enPantalla = await pg.evaluate(()=>document.querySelector('main').innerText);
    check(abiertas===capas, `${f}: al imprimir se abren los ${capas} apartados (${abiertas})`);
    check(cuenta(visible) > cuenta(enPantalla), `${f}: en papel hay ${cuenta(visible)} palabras frente a ${cuenta(enPantalla)} en pantalla (+${Math.round((cuenta(visible)/cuenta(enPantalla)-1)*100)} %)`);
    check(trasVolver===0, `${f}: al volver a pantalla se recogen otra vez`);
  }
  // Sin JavaScript: nada de barras azules vacías
  const ctx2=await b.newContext({ javaScriptEnabled:false });
  await ctx2.route('**://fonts.g*.com/**',r=>r.abort());
  const pg2=await ctx2.newPage();
  for (const f of ['kit.html','proceso.html','sprint-0.html','documentacion.html','sprint-1.html','sprint-2.html']){
    await pg2.goto(B+'/'+f); await pg2.waitForTimeout(200);
    const vis = await pg2.locator('#siguiente-paso').isVisible().catch(()=>false);
    check(!vis, `${f}: sin JavaScript no aparece la barra vacía de «lo siguiente»`);
  }
  // El conmutador no se ve donde no sirve
  const pg3=await ctx.newPage();
  for (const f of ['proceso.html','documentacion.html']){
    await pg3.goto(B+'/'+f); await pg3.waitForTimeout(500);
    const capas = await pg3.locator('details.capa').count();
    const vis = await pg3.locator('[data-action="detalle"]').isVisible();
    check(capas>0 ? vis : !vis, `${f}: el conmutador ${capas>0?'se ve porque hay capas':'está oculto porque no hay capas'} (${capas})`);
  }
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
