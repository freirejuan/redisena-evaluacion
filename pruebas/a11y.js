const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('https://fonts.g**',r=>r.abort());
  const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  page.on('dialog',async d=>await d.accept());

  // ── Web
  await page.goto('http://localhost:8099/sprint-0.html'); await page.waitForTimeout(500);
  await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.waitForTimeout(500);
  await page.keyboard.press('Tab');
  const primero = await page.evaluate(()=>document.activeElement.className);
  check(primero.includes('skip-link'), `la primera tabulación es el enlace de salto (${primero})`);
  const barra = await page.evaluate(()=>{ const b=document.querySelector('.progress-bar'); return b?{rol:b.getAttribute('role'),ahora:b.getAttribute('aria-valuenow')}:null; });
  check(barra && barra.rol==='progressbar', `la barra de progreso se expone como tal (${JSON.stringify(barra)})`);
  await page.locator('[data-step="paso_1"]').click(); await page.waitForTimeout(400);
  const anuncio = await page.locator('#anuncios').textContent();
  check(/Paso marcado/.test(anuncio), `marcar un paso se anuncia («${anuncio.trim()}»)`);

  await page.goto('http://localhost:8099/sprint-1.html'); await page.waitForTimeout(600);
  const bloq = await page.locator('[data-sprint="sprint_1"][data-step]').first();
  check(await bloq.getAttribute('aria-disabled')==='true', 'los pasos de un sprint bloqueado se declaran deshabilitados');

  // ── Plantilla
  await page.goto('http://localhost:8099/downloads/sprint-0/plantilla-estrategica.html');
  await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
  const combo = await page.evaluate(()=>{
    const c=document.querySelector('.combo-card input[type=checkbox]');
    c.focus(); return { enfocable: document.activeElement===c, display: getComputedStyle(c).display };
  });
  check(combo.enfocable, `las tarjetas de arquetipo ya reciben el foco (display: ${combo.display})`);
  const desl = await page.evaluate(()=>{
    const el=document.getElementById('eje-a1');
    const lab=document.querySelector('label[for="eje-a1"]');
    const out=document.getElementById('eje-a1-val');
    return { etiqueta: !!lab, texto: lab?lab.textContent.trim().slice(0,20):'', valor: out?out.textContent:null };
  });
  check(desl.etiqueta, `los deslizadores tienen etiqueta asociada («${desl.texto}»)`);
  check(desl.valor && /%/.test(desl.valor), `y muestran su valor (${desl.valor})`);
  await page.evaluate(()=>{ const e=document.getElementById('eje-a1'); e.value='73'; e.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(300);
  check((await page.locator('#eje-a1-val').textContent()).includes('73'), 'y el valor se actualiza al moverlos');

  // Móvil: la plantilla ya no desborda
  await page.setViewportSize({width:360,height:800}); await page.waitForTimeout(400);
  const desborde = await page.evaluate(()=>document.documentElement.scrollWidth - window.innerWidth);
  check(desborde<=2, `a 360 px ya no desborda a lo ancho (sobra ${desborde} px)`);

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
