const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const ok=[], mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
(async()=>{
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport:{width:1500,height:1000}});
  await ctx.route('https://fonts.g**', r=>r.abort());
  await ctx.route('https://cdnjs**', r=>r.abort());
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('http://localhost:8099/downloads/sprint-1/panel-plan-operativo.html');
  await page.waitForTimeout(800);

  await page.click('text=Calendario semanal').catch(()=>{});
  await page.waitForTimeout(500);

  const d = await page.evaluate(() => {
    const numSem = state.parametros.semanas;
    const cols = totalColumnas(numSem);
    const filas = {};
    let totalDoc = 0;
    state.touchpoints.forEach(tp => {
      const w = distributeDocenteWeeks(tp, numSem, 'base');
      filas[tp.id + ' · ' + tp.nombre.slice(0,26)] = w.map(x => Math.round(x*10)/10);
      totalDoc += w.reduce((a,b)=>a+b,0);
    });
    const totalesSem = new Array(cols).fill(0);
    state.touchpoints.forEach(tp => distributeDocenteWeeks(tp, numSem, 'base').forEach((h,i)=>totalesSem[i]+=h));
    const declarado = state.touchpoints.reduce((a,tp)=>a+tpTotals(tp).hBaseTot,0);
    return { numSem, cols, filas, totalDoc: Math.round(totalDoc*10)/10,
             declarado: Math.round(declarado*10)/10,
             totalesSem: totalesSem.map(x=>Math.round(x)), 
             cabeceras: [...document.querySelectorAll('#cal-grid-docente .cal-head')].map(e=>e.textContent).slice(1) };
  });

  console.log(`Semanas de docencia: ${d.numSem} · columnas totales: ${d.cols}`);
  console.log('Cabeceras:', d.cabeceras.join(' '));
  console.log('\nReparto docente por touchpoint:');
  Object.entries(d.filas).forEach(([k,v]) => console.log(`  ${k.padEnd(34)} ${v.map(x=>x?String(x).padStart(5):'    ·').join('')}`));
  console.log(`\n  ${'TOTAL POR SEMANA'.padEnd(34)} ${d.totalesSem.map(x=>String(x).padStart(5)).join('')}`);

  check(d.cols === d.numSem + 3, `la rejilla añade 3 semanas de cierre (${d.cols} columnas)`);
  check(d.cabeceras.slice(-3).join(' ') === 'C1 C2 C3', `las de cierre se llaman C1 C2 C3 (${d.cabeceras.slice(-3).join(' ')})`);
  check(Math.abs(d.totalDoc - d.declarado) < 0.5, `no se pierde ni una hora: reparto ${d.totalDoc} h = declarado ${d.declarado} h`);

  const quiz = Object.entries(d.filas).find(([k]) => k.includes('Quiz'));
  const maxQuiz = Math.max(...quiz[1]);
  check(maxQuiz < 15, `el quiz semanal ya no apila 60 h en una semana (máximo ahora ${maxQuiz} h)`);
  const examen = Object.entries(d.filas).find(([k]) => k.includes('Examen final'));
  const enCierre = examen[1].slice(d.numSem).reduce((a,b)=>a+b,0);
  check(enCierre > 0, `la corrección del examen final aparece en las semanas de cierre (${Math.round(enCierre)} h)`);

  const consumo = await page.locator('#cal-totals-docente .ct-hint').first().textContent();
  check(consumo.includes('40 %') && consumo.includes('70 %'), 'la tarjeta explica el criterio de 40 % y 70 %');
  console.log('\nTexto del consumo:', consumo.replace(/\s+/g,' ').slice(0,230), '…');

  check(errs.length===0, 'sin errores de JavaScript' + (errs.length?': '+errs.join(' | '):''));
  await page.locator('#cal-grid-docente').screenshot({path:TMP + '/calendario.png'}).catch(()=>{});
  await b.close();
  console.log('\n' + ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
