const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const B='http://localhost:8099', CLAVE='redisena_evaluacion';
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('**://fonts.g*.com/**',r=>r.abort());
  const errs=[]; const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  pg.on('dialog', d=>d.accept());
  await pg.goto(B+'/sprint-2.html'); await pg.evaluate(()=>localStorage.clear());
  await pg.goto(B+'/sprint-2.html'); await pg.waitForTimeout(600);

  check((await pg.locator('.checkbox[data-sprint="sprint_2"]').count())===3, 'el Sprint 2 tiene tres pasos marcables');
  check(await pg.locator('#sprint-2-state').textContent()==='Bloqueado · cerrar sprint anterior', `y arranca bloqueado (${await pg.locator('#sprint-2-state').textContent()})`);
  check(await pg.locator('.checkbox[data-step="paso_1"]').getAttribute('aria-disabled')==='true', 'sus pasos están deshabilitados mientras lo esté');
  const t = await pg.locator('#siguiente-paso .sp-texto').textContent();
  check(/Sprint 0|Sprint 1/.test(t), `y el guiado manda al sprint que toca («${t.replace(/\s+/g,' ').trim()}»)`);

  // Cerrar 0 y 1 desbloquea el 2
  await pg.goto(B+'/404.html');
  await pg.evaluate(k=>{ localStorage.setItem(k, JSON.stringify({schema_version:1, asignatura:'X',
    sprints:{ sprint_0:{estado:'completado',pasos_completados:['paso_1','paso_2','paso_3'],completado_en:null},
              sprint_1:{estado:'completado',pasos_completados:['paso_1','paso_2','paso_3'],completado_en:null},
              sprint_2:{estado:'bloqueado',pasos_completados:[],completado_en:null}},
    creado_en:'2026-07-31T00:00:00Z', actualizado_en:'2026-07-31T00:00:00Z', ultima_visita:'2026-07-31T00:00:00Z', visita_previa:null})); }, CLAVE);
  await pg.goto(B+'/sprint-2.html'); await pg.waitForTimeout(600);
  check(await pg.locator('.checkbox[data-step="paso_1"]').getAttribute('aria-disabled')==='false', 'con los dos anteriores cerrados, se desbloquea');
  await pg.locator('.checkbox[data-step="paso_1"]').click(); await pg.waitForTimeout(400);
  check((await pg.locator('#sprint-2-progress').getAttribute('style')).includes('33'), 'un paso de tres da 33 %');
  await pg.locator('.checkbox[data-step="paso_2"]').click();
  await pg.locator('.checkbox[data-step="paso_3"]').click(); await pg.waitForTimeout(400);
  check(!(await pg.locator('[data-action="complete-sprint"]').isDisabled()), 'con los tres marcados se puede cerrar');
  await pg.locator('[data-action="complete-sprint"]').click(); await pg.waitForTimeout(500);
  const fin = await pg.locator('#siguiente-paso .sp-texto').textContent();
  check(/tres sprints/.test(fin), `al cerrarlo el kit lo dice («${fin.replace(/\s+/g,' ').trim()}»)`);

  // Enlaces a las dos piezas nuevas
  for (const [href, nom] of [['/downloads/sprint-2/cuaderno-pilotaje.html','Cuaderno'],['/downloads/sprint-2/guia-observar-y-leer.html','Guía']]){
    const r = await pg.request.get(B+href);
    check(r.ok(), `${nom}: la pieza responde (${r.status()})`);
  }
  check((await pg.locator('a[href="/downloads/sprint-2/cuaderno-pilotaje.html"]').count())>0, 'el Sprint 2 enlaza el Cuaderno');
  await pg.goto(B+'/kit.html'); await pg.waitForTimeout(400);
  check((await pg.locator('a[href="/downloads/sprint-2/cuaderno-pilotaje.html"]').count())>0, 'y el Kit también');
  check((await pg.locator('a[href="/downloads/sprint-2/guia-observar-y-leer.html"]').count())>0, 'con su guía al lado');

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
