const { chromium } = require('playwright');
const URL='http://localhost:8099/downloads/sprint-0/plantilla-estrategica.html';
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('https://fonts.g**',r=>r.abort());
  const dlg=[];
  const page=await ctx.newPage();
  page.on('dialog', async d=>{ dlg.push(d.message()); await d.accept(); });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(URL); await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.waitForTimeout(400);

  await page.fill('#asig-estudiantes','60'); await page.fill('#asig-equipo','1');
  await page.fill('#asig-horas-semana','4'); await page.fill('#asig-dedicacion-docente','10');
  await page.click('.tp-add'); await page.waitForTimeout(500);

  const escenario = async (prep,dur,corr,fb) => {
    await page.fill('#tp1-h-prep',String(prep)); await page.fill('#tp1-min-dur',String(dur));
    await page.fill('#tp1-min-corr',String(corr)); await page.fill('#tp1-min-fb',String(fb));
    await page.waitForTimeout(800);
    return { color:(await page.locator('#semaforo-light').getAttribute('class')).replace('semaforo-light ','').trim(),
             pct:(await page.locator('#stat-pct').textContent()).trim() };
  };

  let r = await escenario(2,60,10,5);      // ~16 h → ~11 %
  check(r.color==='verde', `carga baja → verde (${r.pct})`);
  r = await escenario(6,120,25,10);        // ~43 h → ~29 %
  check(r.color==='verde', `29 % ahora es verde, antes era ámbar con el 30/50 (${r.pct})`);
  r = await escenario(10,120,40,15);       // ~63 h → ~42 %
  check(r.color==='ambar', `42 % → ámbar (${r.pct})`);
  r = await escenario(20,180,70,30);       // ~123 h → ~82 %
  check(r.color==='rojo', `82 % → rojo (${r.pct})`);

  // Negativos
  await page.fill('#tp1-min-corr','-30'); await page.locator('#tp1-min-dur').click(); await page.waitForTimeout(800);
  const valor = await page.locator('#tp1-min-corr').inputValue();
  const trasNeg = (await page.locator('#semaforo-desc').textContent());
  check(valor==='', 'un valor negativo se descarta al salir del campo');
  check(!trasNeg.includes('-'), 'y el semáforo deja de anunciar horas negativas');

  const criterio = await page.locator('.callout.warning').last().textContent();
  check(criterio.includes('40') && criterio.includes('70'), 'la pantalla explica el criterio de 40 % y 70 %');
  check(criterio.includes('mismo criterio que usa el Sprint 1'), 'y dice que es el mismo criterio del Sprint 1');

  // Almacenamiento bloqueado
  const page2=await ctx.newPage();
  const dlg2=[]; page2.on('dialog', async d=>{ dlg2.push(d.message()); await d.accept(); });
  await page2.addInitScript(()=>{ Object.defineProperty(window,'localStorage',{ get(){ throw new Error('bloqueado'); } }); });
  await page2.goto(URL); await page2.waitForTimeout(500);
  await page2.fill('#asig-nombre','Con el almacenamiento bloqueado'); await page2.waitForTimeout(800);
  const estado = await page2.locator('#save-state').textContent();
  check(estado.includes('NO se está guardando'), `el indicador grita que no guarda (dice «${estado.trim()}»)`);
  check(dlg2.some(m=>m.includes('NO se está conservando')), 'y sale un aviso explícito, no un texto pequeño');

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
