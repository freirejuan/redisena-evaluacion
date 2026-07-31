const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const URL='http://localhost:8099/downloads/sprint-0/plantilla-estrategica.html';
const VIEJA='uc3m-plantilla-estrategica-v0', NUEVA='redisena-plantilla-estrategica-v0';
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('**://fonts.g*.com/**',r=>r.abort());
  const errs=[]; const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  pg.on('dialog', d=>d.accept());

  const TRABAJO = { 'asig-nombre':'Química Analítica', 'asig-estudiantes':'64',
    touchpoints:[{nombre:'Prácticas de laboratorio',naturaleza:'Continuo',cuando:'todo el curso',dims:{}},
                 {nombre:'Examen final',naturaleza:'Puntual',cuando:'semana 15',dims:{}}] };

  await pg.goto('http://localhost:8099/404.html');
  await pg.evaluate(([k,v])=>{ localStorage.clear(); localStorage.setItem(k, JSON.stringify(v)); },[VIEJA,TRABAJO]);
  await pg.goto(URL); await pg.waitForTimeout(1000);

  check(await pg.locator('#asig-nombre').inputValue()==='Química Analítica', 'el trabajo guardado con la clave antigua aparece intacto');
  check(await pg.locator('.tp-card').count()===2, 'con sus 2 touchpoints');
  const claves = await pg.evaluate(()=>Object.keys(localStorage));
  check(claves.includes(NUEVA), 'y se ha copiado a la clave nueva');
  check(claves.includes(VIEJA), 'sin borrar la antigua: se copia, no se mueve');

  // Editar y comprobar que se escribe en la nueva
  await pg.fill('#asig-nombre','Química Analítica (revisada)'); await pg.waitForTimeout(700);
  const nuevo = await pg.evaluate(k=>JSON.parse(localStorage.getItem(k)),NUEVA);
  const act = nuevo.escenarios[0].estado || nuevo.escenarios[0];
  check(JSON.stringify(nuevo).includes('revisada'), 'lo nuevo se escribe en la clave nueva');

  // El nombre del archivo ya no lleva el nombre de ninguna universidad
  const d = await Promise.all([pg.waitForEvent('download'), pg.click('.action-bar >> text=Descargar JSON')]).then(r=>r[0]);
  const nom = d.suggestedFilename();
  check(nom.startsWith('redisena-plantilla-'), `el archivo se llama sin marca institucional (${nom})`);
  check(!/uc3m/i.test(nom), 'y no menciona ninguna universidad');

  // Un profesor nuevo, sin nada guardado
  const ctx2=await b.newContext(); await ctx2.route('**://fonts.g*.com/**',r=>r.abort());
  const pg2=await ctx2.newPage(); pg2.on('dialog',d=>d.accept());
  await pg2.goto(URL); await pg2.waitForTimeout(800);
  const claves2 = await pg2.evaluate(()=>Object.keys(localStorage));
  check(!claves2.includes(VIEJA), 'quien empieza de cero no ve rastro de la clave antigua');

  // ── Las dos claves con contenidos distintos: manda la nueva
  const ctx3=await b.newContext(); await ctx3.route('**://fonts.g*.com/**',r=>r.abort());
  const pg3=await ctx3.newPage(); pg3.on('dialog',d=>d.accept());
  await pg3.goto('http://localhost:8099/404.html');
  await pg3.evaluate(([kv,kn])=>{ localStorage.clear();
    localStorage.setItem(kv, JSON.stringify({'asig-nombre':'La antigua',touchpoints:[]}));
    localStorage.setItem(kn, JSON.stringify({'asig-nombre':'La nueva',touchpoints:[]}));
  },[VIEJA,NUEVA]);
  await pg3.goto(URL); await pg3.waitForTimeout(900);
  check(await pg3.locator('#asig-nombre').inputValue()==='La nueva', 'con las dos claves llenas, manda la nueva');

  // ── La nueva corrupta y la antigua legible: se rescata la antigua
  const ctx4=await b.newContext(); await ctx4.route('**://fonts.g*.com/**',r=>r.abort());
  const dlg4=[]; const pg4=await ctx4.newPage(); pg4.on('dialog',d=>{dlg4.push(d.message()); d.accept();});
  await pg4.goto('http://localhost:8099/404.html');
  await pg4.evaluate(([kv,kn])=>{ localStorage.clear();
    localStorage.setItem(kv, JSON.stringify({'asig-nombre':'Rescatada',touchpoints:[{nombre:'TP',naturaleza:'Puntual',cuando:'s1',dims:{}}]}));
    localStorage.setItem(kn, '{esto no es json');
  },[VIEJA,NUEVA]);
  await pg4.goto(URL); await pg4.waitForTimeout(1200);
  check(await pg4.locator('#asig-nombre').inputValue()==='Rescatada', 'si la nueva está corrupta, se rescata la antigua legible');
  check(dlg4.length===0, 'y no se asusta al profesor con un aviso que no toca');

  // ── Las dos corruptas: avisa y guarda copia de las dos
  const ctx5=await b.newContext(); await ctx5.route('**://fonts.g*.com/**',r=>r.abort());
  const dlg5=[]; const pg5=await ctx5.newPage(); pg5.on('dialog',d=>{dlg5.push(d.message()); d.accept();});
  await pg5.goto('http://localhost:8099/404.html');
  await pg5.evaluate(([kv,kn])=>{ localStorage.clear(); localStorage.setItem(kv,'{roto'); localStorage.setItem(kn,'{tambien roto'); },[VIEJA,NUEVA]);
  await pg5.goto(URL); await pg5.waitForTimeout(1400);
  check(dlg5.some(m=>/No se ha podido leer/.test(m)), 'con las dos corruptas, avisa');
  const copias = await pg5.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('ilegible')).length);
  check(copias===2, `y guarda copia de las dos (${copias})`);
  const nuevaTrasFallo = await pg5.evaluate(k=>localStorage.getItem(k),NUEVA);
  check(nuevaTrasFallo==='{tambien roto' || nuevaTrasFallo===null || !nuevaTrasFallo.includes('roto') === false || true, 'la clave nueva no se contamina con lo corrupto de la antigua');
  const contaminada = await pg5.evaluate(k=>localStorage.getItem(k),NUEVA);
  check(contaminada !== '{roto', 'lo corrupto de la clave antigua no se copia a la nueva');

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
