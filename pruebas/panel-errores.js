const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const fs=require('fs');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('https://fonts.g**',r=>r.abort());
  const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  const dlg=[]; page.on('dialog',async d=>{ dlg.push(d.message()); await d.dismiss(); });
  await page.goto('http://localhost:8099/downloads/sprint-1/panel-plan-operativo.html');
  await page.waitForTimeout(1200);

  // Un archivo ilegible y después el bueno: la pantalla no debe quedar en blanco
  fs.writeFileSync(TMP + '/nope.xlsx','esto no es un xlsx');
  await page.setInputFiles('#file-input',TMP + '/nope.xlsx'); await page.waitForTimeout(900);
  check(await page.locator('#panel-error').isVisible(), 'un archivo ilegible muestra el panel de error');
  await page.setInputFiles('#file-input',RAIZ + '/downloads/sprint-1/plantilla-ejemplo-ingesoft.xlsx'); await page.waitForTimeout(1200);
  const visible = await page.evaluate(()=>{
    const p=document.querySelector('.tab-panel.active');
    return p ? {id:p.id, alto:p.getBoundingClientRect().height} : null;
  });
  check(visible && visible.alto>200, `tras recuperarse hay contenido, no una pantalla en blanco (${visible?visible.id+' '+Math.round(visible.alto)+'px':'nada'})`);

  // «Volver al ejemplo» desde el error pide confirmación
  await page.setInputFiles('#file-input',TMP + '/nope.xlsx'); await page.waitForTimeout(900);
  dlg.length=0;
  await page.click('#btn-back-sample'); await page.waitForTimeout(500);
  check(dlg.some(m=>/tu plan anterior sigue guardado/.test(m)), 'volver al ejemplo desde el error pide confirmación');

  // Un touchpoint sin ID se avisa en vez de desaparecer
  const XLSX=require('xlsx');
  const wb=XLSX.readFile(RAIZ + '/downloads/sprint-1/plantilla-ejemplo-ingesoft.xlsx');
  const ws=wb.Sheets['Touchpoints'];
  ws['A7'] = {t:'s', v:''};              // le quitamos el ID a la fila 7
  XLSX.writeFile(wb,TMP + '/sin-id.xlsx');
  await page.reload(); await page.waitForTimeout(1200);
  await page.setInputFiles('#file-input',TMP + '/sin-id.xlsx'); await page.waitForTimeout(1400);
  const aviso = await page.locator('#aviso-descartadas');
  check(await aviso.isVisible(), 'una fila sin ID produce un aviso visible');
  const txt = await aviso.textContent();
  check(/La fila 7\b/.test(txt) && !/32/.test(txt), `y dice qué fila es (${txt.trim().slice(0,72)}…)`);
  const n = await page.evaluate(()=>state.touchpoints.length);
  check(n===7, `el resto del plan se lee igual (${n} de 8 touchpoints)`);

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
