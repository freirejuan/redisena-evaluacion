const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const fs = require('fs');
const ok=[], mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
(async()=>{
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.route('https://fonts.g**', r=>r.abort());
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  page.on('dialog', async d=>{ console.log('  aviso:', d.message()); await d.accept(); });

  await page.goto('http://localhost:8099/downloads/sprint-1/panel-plan-operativo.html');
  await page.waitForTimeout(1200);
  check(await page.evaluate(()=>typeof XLSX!=='undefined'), 'SheetJS carga en el Panel');

  for (const [f, etiqueta, tpsEsp] of [[RAIZ + '/downloads/sprint-1/plantilla-ejemplo-ingesoft.xlsx','ejemplo IngeSoft',8],[RAIZ + '/downloads/sprint-1/plantilla-plan-operativo.xlsx','plantilla en blanco',-1]]) {
    await page.setInputFiles('#file-input', f);
    await page.waitForTimeout(1500);
    const d = await page.evaluate(()=>{
      if(!state || !state.touchpoints) return {error:'sin estado'};
      const horas = state.touchpoints.reduce((a,tp)=>a+tpTotals(tp).hBaseTot,0);
      const n = state.parametros.semanas;
      let rep=0; state.touchpoints.forEach(tp=>rep+=distributeDocenteWeeks(tp,n,'base').reduce((a,b)=>a+b,0));
      return { tps: state.touchpoints.length, horas: Math.round(horas*10)/10,
               repartidas: Math.round(rep*10)/10, semanas: n,
               asignatura: state.parametros.asignatura || '(sin nombre)',
               error: document.getElementById('panel-error') && getComputedStyle(document.getElementById('panel-error')).display !== 'none' };
    });
    console.log(`\n  ${etiqueta}: ${d.tps} touchpoints · ${d.horas} h declaradas · ${d.repartidas} h repartidas · «${d.asignatura}»`);
    if (tpsEsp < 0) {
      // La plantilla en blanco no tiene touchpoints: el Panel debe rechazarla
      // con un mensaje claro, que es lo que hacía ya antes de esta tanda.
      check(d.error, `el ${etiqueta} se rechaza con aviso, como corresponde`);
    } else {
      check(!d.error, `el ${etiqueta} se lee sin panel de error`);
      check(d.tps === tpsEsp, `el ${etiqueta} da ${tpsEsp} touchpoints (leídos ${d.tps})`);
      check(Math.abs(d.horas - d.repartidas) < 0.5, `el ${etiqueta} no pierde horas al repartir (${d.horas} = ${d.repartidas})`);
    }
  }

  check(errs.length===0, 'sin errores de JavaScript' + (errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log('\n' + ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
