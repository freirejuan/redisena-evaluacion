const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const BASE='http://localhost:8099';
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('**://fonts.g*.com/**',r=>r.abort());
  const errs=[]; const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  pg.on('dialog', d=>d.accept());

  await pg.goto(BASE+'/sprint-0.html'); await pg.evaluate(()=>localStorage.clear());
  await pg.goto(BASE+'/sprint-0.html'); await pg.waitForTimeout(500);

  // ── Sin nada marcado
  let txt = await pg.locator('#siguiente-paso .sp-texto').textContent();
  check(/empezar el Sprint 0/i.test(txt), `sin empezar dice qué hacer («${txt.replace(/\s+/g,' ').trim()}»)`);
  check(await pg.locator('.step-block.en-curso .marca-en-curso').count()===1, 'un solo paso lleva la marca «Vas por aquí»');
  const cual = await pg.locator('.step-block.en-curso .step-num').first().textContent();
  check(/Paso 1/.test(cual), `y es el primero (${cual.replace(/\s+/g,' ').trim()})`);

  // ── Marcado el primero
  await pg.locator('.checkbox[data-step="paso_1"]').click(); await pg.waitForTimeout(400);
  txt = await pg.locator('#siguiente-paso .sp-texto').textContent();
  check(/paso 2 de 3/i.test(txt), `al marcar uno avanza («${txt.replace(/\s+/g,' ').trim()}»)`);
  const cual2 = await pg.locator('.step-block.en-curso .step-num').first().textContent();
  check(/Paso 2/.test(cual2), `y la marca se mueve al paso 2 (${cual2.replace(/\s+/g,' ').trim()})`);
  check(await pg.locator('.step-block.ya-hecho').count()===1, 'el paso hecho queda atenuado');

  // ── Todos marcados
  await pg.locator('.checkbox[data-step="paso_2"]').click(); await pg.waitForTimeout(250);
  await pg.locator('.checkbox[data-step="paso_3"]').click(); await pg.waitForTimeout(400);
  txt = await pg.locator('#siguiente-paso .sp-texto').textContent();
  check(/cerrarlo/i.test(txt), `con los tres marcados pide cerrar («${txt.replace(/\s+/g,' ').trim()}»)`);
  check(await pg.locator('.marca-en-curso').count()===0, 'y ya no señala ningún paso');
  check(await pg.locator('#siguiente-paso .btn').count()===0, 'no ofrece ir a la página en la que ya estás');

  // ── Cerrado el Sprint 0
  await pg.locator('[data-action="complete-sprint"]').click(); await pg.waitForTimeout(500);
  txt = await pg.locator('#siguiente-paso .sp-texto').textContent();
  check(/Sprint 1/.test(txt), `al cerrarlo apunta al siguiente («${txt.replace(/\s+/g,' ').trim()}»)`);
  const destino = await pg.locator('#siguiente-paso a').getAttribute('href');
  check(destino==='/sprint-1', `con enlace al Sprint 1 (${destino})`);

  // ── La misma indicación en otra página del recorrido…
  await pg.goto(BASE+'/proceso.html'); await pg.waitForTimeout(400);
  txt = await pg.locator('#siguiente-paso .sp-texto').textContent();
  check(/Sprint 1/.test(txt), 'y la misma indicación aparece en «El proceso»');
  // …y en ninguna de las dos de consulta: el Kit es la biblioteca y
  //    Documentación es referencia, y ahí no se empuja a ninguna acción.
  for (const f of ['kit.html','documentacion.html']) {
    await pg.goto(BASE+'/'+f); await pg.waitForTimeout(300);
    check((await pg.locator('#siguiente-paso').count())===0, `pero no en ${f}, que es de consulta`);
  }

  // ── No hay ninguna llamada a un servidor
  const peticiones=[];
  pg.on('request', r=>{ const u=r.url(); if(!u.startsWith('http://localhost:8099') && !u.startsWith('data:')) peticiones.push(u); });
  await pg.goto(BASE+'/sprint-0.html'); await pg.waitForTimeout(700);
  const fuera = peticiones.filter(u=>!/fonts\.(googleapis|gstatic)\.com/.test(u));
  check(fuera.length===0, `no sale nada del navegador salvo la tipografía (${fuera.length} peticiones: ${fuera.join(', ')||'ninguna'})`);

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
