const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const URL='http://localhost:8099/downloads/sprint-2/cuaderno-pilotaje.html';
const CLAVE='redisena-cuaderno-pilotaje-v0';
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('**://fonts.g*.com/**',r=>r.abort());
  const errs=[]; const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  const dlg=[]; pg.on('dialog', d=>{dlg.push(d.message()); d.accept();});
  await pg.goto(URL); await pg.waitForTimeout(700);
  await pg.evaluate(()=>localStorage.clear());
  await pg.goto(URL); await pg.waitForTimeout(700);

  // ── Estructura
  check((await pg.locator('section.section').count())===7, `siete apartados (${await pg.locator('section.section').count()})`);
  check((await pg.locator('#linea-base li').count())===4, 'cuatro comprobaciones de punto de partida');
  check((await pg.locator('.instr').count())===5, 'cinco instrumentos');

  // ── El aviso de los tres instrumentos
  await pg.locator('#ins-cierre').check(); await pg.waitForTimeout(200);
  let av = await pg.locator('#aviso-instr').textContent();
  check(/1 de 3/.test(av), `con uno avisa de que faltan (${av.trim().slice(0,48)}…)`);
  await pg.locator('#ins-mirada').check(); await pg.locator('#ins-tiempos').check(); await pg.waitForTimeout(250);
  av = await pg.locator('#aviso-instr').textContent();
  check(/no de tres sitios/.test(av), 'tres del mismo tipo: avisa de que no se triangula');
  await pg.locator('#ins-mirada').uncheck(); await pg.locator('#ins-pulso').check(); await pg.waitForTimeout(250);
  av = await pg.locator('#aviso-instr').textContent();
  check(/tres sitios distintos/.test(av) && /bien/.test(await pg.locator('#aviso-instr').getAttribute('class')), 'tres de tres sitios: verde');
  await pg.locator('#ins-mirada').check(); await pg.locator('#ins-datos').check(); await pg.waitForTimeout(250);
  check(/demasiados/.test(await pg.locator('#aviso-instr').textContent()), 'cinco instrumentos: avisa de que son demasiados');

  // ── Hipótesis y contraste
  await pg.click('#btn-add-hip'); await pg.waitForTimeout(200);
  await pg.locator('#hip-0').fill('Con la entrega intermedia bajará la cola de suspensos.');
  await pg.locator('#hip-0').blur(); await pg.waitForTimeout(400);
  check((await pg.locator('#contraste-4 .pill-group').count())===1, 'la hipótesis aparece en el contraste de mitad de cuatrimestre');
  check((await pg.locator('#contraste-5 .pill-group').count())===1, 'y en el de cierre');

  // ── Señales y veredicto de las tres pruebas
  await pg.click('#senales-4 + button'); await pg.waitForTimeout(250);
  check((await pg.locator('#senales-4 > .senal').count())===1, 'se añade una señal');
  check((await pg.locator('#senales-4 .veredicto.v-ruido').count())===1, 'sin ninguna prueba marcada: ruido');
  await pg.locator('#s4-0-rep').check(); await pg.locator('#s4-0-esp').check(); await pg.waitForTimeout(300);
  check((await pg.locator('#senales-4 .veredicto.v-mirar').count())===1, 'con dos pruebas: merece más observación');
  await pg.locator('#s4-0-sor').check(); await pg.waitForTimeout(300);
  check((await pg.locator('#senales-4 .veredicto.v-senal').count())===1, 'con las tres: es una señal');

  // ── Registro de tiempos a mano
  await pg.locator('button:has-text("+ Añadir una tarea a mano")').click(); await pg.waitForTimeout(250);
  const fila = pg.locator('#cuerpo-tiempos tr').first();
  await fila.locator('input').nth(0).fill('Corrección entrega 1');
  await fila.locator('select').nth(0).selectOption('corr');
  await fila.locator('input').nth(1).fill('6');
  await fila.locator('input').nth(2).fill('9.5');
  await pg.waitForTimeout(400);
  const desv = await pg.locator('#cuerpo-tiempos tr td').nth(4).textContent();
  check(/\+3,5 h \(\+58 %\)/.test(desv), `calcula el desvío (${desv.trim()})`);
  check((await pg.locator('#cuerpo-tiempos td.desv-alta').count())===1, 'y lo marca como desvío alto');

  // ── Persistencia
  await pg.reload(); await pg.waitForTimeout(800);
  check(await pg.locator('#hip-0').inputValue()==='Con la entrega intermedia bajará la cola de suspensos.', 'todo sobrevive a recargar');
  check((await pg.locator('#cuerpo-tiempos tr').count())===1, 'y la tarea del registro también');

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
