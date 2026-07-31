const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const fs=require('fs');
const URL='http://localhost:8099/downloads/sprint-0/plantilla-estrategica.html';
const CLAVE='redisena-plantilla-estrategica-v0';
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
(async()=>{
  const b=await chromium.launch();
  const errs=[];
  const nuevoCtx=async()=>{ const c=await b.newContext(); await c.route('https://fonts.g**',r=>r.abort()); return c; };
  const enCtx=async(c,dlg)=>{ const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
    p.on('dialog',async d=>{ dlg.push(d.message()); await d.accept(); }); return p; };
  const ctx=await nuevoCtx();
  const nueva=async(dlg)=>enCtx(ctx,dlg);

  // ── A1 · Un archivo con touchpoints malformado ya no destruye el libro
  let dlg=[]; let page=await nueva(dlg);
  await page.goto(URL); await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.waitForTimeout(500);
  await page.fill('#asig-nombre','Mi trabajo'); await page.click('.tp-add'); await page.click('.tp-add');
  await page.waitForTimeout(600);
  await page.evaluate(()=>{ creaEscenario('Segundo', collectState(), null, null); });
  await page.waitForTimeout(600);
  const antes = await page.evaluate(()=>libro.escenarios.length);
  fs.writeFileSync(TMP + '/roto.json', JSON.stringify({'asig-nombre':'Veneno', touchpoints:'tres'}));
  dlg.length=0;
  await page.setInputFiles('#file-import',TMP + '/roto.json'); await page.waitForTimeout(800);
  const despues = await page.evaluate(()=>libro.escenarios.length);
  check(despues===antes, `un archivo con touchpoints malformado no toca el libro (${antes} → ${despues})`);
  check(dlg.some(m=>/no es una plantilla|dañado/i.test(m)), 'y se rechaza con un mensaje claro');
  const enBarra = await page.locator('#esc-select option').count();
  check(enBarra===despues, `la barra sigue coincidiendo con la memoria (${enBarra} = ${despues})`);

  // ── A2 · Los deslizadores no se contagian a un escenario en blanco
  await page.evaluate(()=>{ document.getElementById('eje-a3').value='95'; document.getElementById('eje-a3').dispatchEvent(new Event('input')); persist(); });
  await page.waitForTimeout(600);
  await page.evaluate(()=>generaVariacion('vacio')); await page.waitForTimeout(700);
  const a3 = await page.locator('#eje-a3').inputValue();
  const a3guardado = await page.evaluate(()=>escenarioActivo().estado['eje-a3']);
  check(a3!=='95', `un escenario en blanco no hereda el perfil de aula (A3 = ${a3})`);
  check(a3guardado!=='95', `y tampoco lo guarda en disco (${a3guardado})`);

  // ── A3 · La comparación distingue lo declarado de lo sugerido
  await page.click('[data-view="comparar"]'); await page.waitForTimeout(700);
  const filas = await page.locator('.cmp-tabla tbody tr').allTextContents();
  const filaEst = filas.find(f=>f.startsWith('Estudiantes'));
  check(/~/.test(filaEst), `las cifras no declaradas se marcan con ~ (${filaEst.trim().slice(0,44)})`);
  const nota = await page.locator('.cmp-nota').first().textContent();
  check(nota.includes('~'), 'y la nota al pie lo explica');

  // ── A4 · Añadir dos veces el mismo ejemplo avisa
  await page.click('[data-view="plantilla"]'); await page.waitForTimeout(300);
  await page.click('text=Ejemplos'); await page.waitForTimeout(400);
  await page.locator('.gal-item',{hasText:'Clásica'}).locator('button').click(); await page.waitForTimeout(800);
  dlg.length=0;
  await page.click('text=Ejemplos'); await page.waitForTimeout(400);
  await page.locator('.gal-item',{hasText:'Clásica'}).locator('button').click(); await page.waitForTimeout(800);
  check(dlg.some(m=>/Ya tienes los escenarios/.test(m)), 'añadir el mismo ejemplo dos veces avisa antes');

  // ── A5 · Un guardado ilegible avisa y no se pisa
  const ctx2=await nuevoCtx(); const dlg2=[]; const page2=await enCtx(ctx2,dlg2);
  // Se siembra desde otra página del mismo origen: con la plantilla ya cargada,
  // el guardado de 'pagehide' pisaría el valor corrupto al recargar.
  await page2.goto('http://localhost:8099/404.html');
  await page2.evaluate(k=>{ localStorage.clear(); localStorage.setItem(k,'{esto no es json'); },CLAVE);
  await page2.goto(URL); await page2.waitForTimeout(1200);
  check(dlg2.some(m=>/No se ha podido leer/.test(m)), 'un guardado ilegible avisa en vez de arrancar vacío en silencio');
  const copias = await page2.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('ilegible')).length);
  check(copias===1, `y deja una copia de lo ilegible por si hay que recuperarlo (${copias})`);

  // ── A6 · Dos pestañas en escenarios distintos: se fusiona, no se pisa
  const ctx3=await nuevoCtx(); const dlg3=[]; const pA=await enCtx(ctx3,dlg3);
  await pA.goto(URL); await pA.evaluate(()=>localStorage.clear()); await pA.reload(); await pA.waitForTimeout(500);
  await pA.fill('#asig-nombre','Escenario A'); await pA.waitForTimeout(600);
  await pA.evaluate(()=>creaEscenario('Escenario B', {}, null, null)); await pA.waitForTimeout(600);
  const idsAB = await pA.evaluate(()=>libro.escenarios.map(e=>e.id));
  await pA.evaluate(id=>cambiaEscenario(id), idsAB[0]); await pA.waitForTimeout(500);

  const pB=await enCtx(ctx3,dlg3);
  await pB.goto(URL); await pB.waitForTimeout(700);
  await pB.evaluate(id=>cambiaEscenario(id), idsAB[1]); await pB.waitForTimeout(500);
  await pB.fill('#asig-nombre','Trabajo hecho en la otra pestaña'); await pB.waitForTimeout(700);

  await pA.bringToFront(); await pA.waitForTimeout(600);
  check(await pA.locator('#aviso-conflicto').count()===1, 'la primera pestaña detecta el conflicto');
  await pA.click('#btn-conflicto-mio'); await pA.waitForTimeout(800);
  const trasFusion = await pA.evaluate(([k,id])=>{
    const L=JSON.parse(localStorage.getItem(k));
    const b=L.escenarios.find(e=>e.id===id);
    return { n:L.escenarios.length, b: b ? b.estado['asig-nombre'] : null };
  },[CLAVE,idsAB[1]]);
  check(trasFusion.n===2, `se conservan los dos escenarios (${trasFusion.n})`);
  check(trasFusion.b==='Trabajo hecho en la otra pestaña',
        `y no se pierde lo que hizo la otra pestaña en su escenario («${trasFusion.b}»)`);

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.slice(0,2).join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
  console.log('\nHallazgos de la auditoría cerrados.');
})();
