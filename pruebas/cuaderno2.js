const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const URL='http://localhost:8099/downloads/sprint-2/cuaderno-pilotaje.html';
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({acceptDownloads:true});
  await ctx.route('**://fonts.g*.com/**',r=>r.abort());
  const errs=[]; const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  const dlg=[]; pg.on('dialog', d=>{dlg.push(d.message()); d.accept();});
  await pg.goto(URL); await pg.evaluate(()=>localStorage.clear());
  await pg.goto(URL); await pg.waitForTimeout(700);

  // ── Ejemplo
  await pg.click('.tabs-actions >> text=Ejemplo'); await pg.waitForTimeout(700);
  check(await pg.locator('#asig-nombre').inputValue()==='Diseño de Servicios Digitales', 'el ejemplo rellena la asignatura');
  check((await pg.locator('#hipotesis-lista textarea').count())===3, 'con sus 3 hipótesis');
  check((await pg.locator('#cuerpo-tiempos tr').count())===5, 'y sus 5 tareas medidas');
  check((await pg.locator('#senales-4 > .senal').count())===3, 'y 3 señales de mitad de cuatrimestre');
  const lect = await pg.locator('#lectura-tiempos').textContent();
  check(/se concentra el desvío/.test(lect), `y la lectura del desvío se calcula («${lect.trim().slice(0,90)}…»)`);

  // ── Informe
  await pg.click('[data-view="informe"]'); await pg.waitForTimeout(700);
  const inf = await pg.locator('#inf-body').innerText();
  check(/Qué probaba/.test(inf), 'el informe tiene el apartado de hipótesis');
  check(/refutada/i.test(inf), 'y arrastra el veredicto de cada hipótesis');
  check(/estimado/i.test(inf) && /desv[íi]o/i.test(inf), 'y las cifras del registro de tiempos');
  check(/Donde más se desvía/.test(inf), 'y dónde se concentran');
  check(/Ajusto ahora/.test(inf), 'y las decisiones de cada señal');
  const tit = await pg.locator('#inf-titulo').textContent();
  check(/Diseño de Servicios Digitales/.test(tit), `con el título de la asignatura (${tit})`);

  // ── Ida y vuelta del archivo
  await pg.click('[data-view="cuaderno"]'); await pg.waitForTimeout(300);
  const d = await Promise.all([pg.waitForEvent('download'), pg.click('.action-bar >> text=Descargar JSON')]).then(r=>r[0]);
  const ruta=TMP + '/'+d.suggestedFilename(); await d.saveAs(ruta);
  check(/^redisena-cuaderno-/.test(d.suggestedFilename()), `el archivo se llama bien (${d.suggestedFilename()})`);
  await pg.evaluate(()=>localStorage.clear()); await pg.goto(URL); await pg.waitForTimeout(600);
  await pg.setInputFiles('#file-import', ruta); await pg.waitForTimeout(900);
  check(await pg.locator('#asig-nombre').inputValue()==='Diseño de Servicios Digitales', 'cargar el archivo lo restaura');
  check((await pg.locator('#cuerpo-tiempos tr').count())===5, 'con sus tareas');

  // ── Un JSON ajeno no destruye nada
  const fs=require('fs'); fs.writeFileSync(TMP + '/ajeno-cuaderno.json', JSON.stringify({hola:'mundo'}));
  dlg.length=0;
  await pg.setInputFiles('#file-import',TMP + '/ajeno-cuaderno.json'); await pg.waitForTimeout(700);
  check(dlg.some(m=>/no es un cuaderno de pilotaje/.test(m)), 'un JSON ajeno se rechaza con un mensaje claro');
  check((await pg.locator('#cuerpo-tiempos tr').count())===5, 'y no toca lo que había');

  // ── Subir la Plantilla del plan operativo del Sprint 1
  await pg.evaluate(()=>localStorage.clear()); await pg.goto(URL); await pg.waitForTimeout(600);
  await pg.setInputFiles('#file-plan',RAIZ + '/downloads/sprint-1/plantilla-ejemplo-ingesoft.xlsx'); await pg.waitForTimeout(1500);
  const n = await pg.locator('#cuerpo-tiempos tr').count();
  check(n>10, `la Plantilla del Sprint 1 rellena el registro (${n} tareas)`);
  const primera = await pg.locator('#cuerpo-tiempos tr').first().locator('input').first().inputValue();
  check(/^TP\d/.test(primera), `con el touchpoint identificado (${primera})`);
  const estim = await pg.locator('#cuerpo-tiempos tr').first().locator('input').nth(1).inputValue();
  check(parseFloat(estim)>0, `y su estimación ya puesta (${estim} h)`);
  const avp = await pg.locator('#aviso-plan').textContent();
  check(/tareas añadidas/.test(avp), `y lo dice («${avp.trim().slice(0,60)}…»)`);

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
