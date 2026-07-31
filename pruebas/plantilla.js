const { chromium } = require('playwright');
const BASE = 'http://localhost:8099/downloads/sprint-0/plantilla-estrategica.html';
const ok=[], mal=[];
const check=(c,m)=>(c?ok:mal).push(m);
(async()=>{
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.route('https://fonts.googleapis.com/**', r=>r.abort());
  await ctx.route('https://fonts.gstatic.com/**', r=>r.abort());
  const page = await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  page.on('dialog', async d=>{ await d.accept(); });
  await page.goto(BASE);

  // ── Curso hasta 6º
  const cursos = await page.locator('#asig-curso option').allTextContents();
  check(cursos.includes('5º') && cursos.includes('6º'), `curso llega a 6º: ${cursos.join(' ')}`);

  // ── Datos del Paso 1
  await page.fill('#asig-estudiantes','60');
  await page.fill('#asig-equipo','1');
  await page.fill('#asig-horas-semana','4');
  await page.fill('#asig-dedicacion-docente','10');
  await page.selectOption('#asig-semestre','Primer cuatrimestre');

  // ── Un touchpoint barato: test de 10 min en clase
  await page.click('.tp-add');
  await page.fill('.tp-card:nth-of-type(1) .tp-nombre','Test rápido semanal');
  await page.click('label[for="tp1-punt"]');
  await page.fill('#tp1-h-prep','1');
  await page.fill('#tp1-min-dur','10');
  await page.fill('#tp1-min-corr','1');
  await page.fill('#tp1-min-fb','0');
  await page.waitForTimeout(900);
  const t1 = await page.locator('#tp1-carga-total').textContent();
  check(/2,2\s*h/.test(t1), `el test barato se estima solo: "${t1.trim()}"`);
  const verde = await page.locator('#semaforo-light').getAttribute('class');
  check(verde.includes('verde'), `un test barato deja el semáforo verde (${verde})`);
  const pct1 = await page.locator('#stat-pct').textContent();
  check(pct1.trim() !== '—', `el porcentaje de dedicación se calcula: ${pct1.trim()}`);

  // ── Duplicar
  await page.click('.tp-card:nth-of-type(1) .tp-dup');
  await page.waitForTimeout(700);
  const nTarjetas = await page.locator('.tp-card').count();
  check(nTarjetas === 2, `duplicar crea una segunda tarjeta (${nTarjetas})`);
  const nombre2 = await page.locator('.tp-card:nth-of-type(2) .tp-nombre').inputValue();
  check(nombre2 === 'Test rápido semanal (copia)', `la copia hereda el nombre: "${nombre2}"`);
  const corr2 = await page.locator('.tp-card:nth-of-type(2) input[name$="-min-corr"]').inputValue();
  check(corr2 === '1', `la copia hereda la carga estimada (corregir=${corr2})`);
  const codigos = await page.locator('.tp-code').allTextContents();
  check(codigos.join(',') === 'TP1,TP2', `los códigos se renumeran: ${codigos.join(',')}`);

  // ── Una prueba cara: 2 h de examen, 25 min de corrección por estudiante
  await page.click('.tp-add');
  await page.fill('.tp-card:nth-of-type(3) .tp-nombre','Prueba formativa larga');
  await page.fill('.tp-card:nth-of-type(3) input[name$="-h-prep"]','6');
  await page.fill('.tp-card:nth-of-type(3) input[name$="-min-dur"]','120');
  await page.fill('.tp-card:nth-of-type(3) input[name$="-min-corr"]','25');
  await page.fill('.tp-card:nth-of-type(3) input[name$="-min-fb"]','10');
  await page.waitForTimeout(900);
  const horas = await page.locator('#stat-horas').textContent();
  const pct = await page.locator('#stat-pct').textContent();
  const color = await page.locator('#semaforo-light').getAttribute('class');
  const desc = await page.locator('#semaforo-desc').textContent();
  check(color.includes('verde'), `con los umbrales 40/70 el 32 % es verde (${color.replace('semaforo-light ','')})`);
  check(desc.includes('Prueba formativa larga'), 'el semáforo señala cuál es el touchpoint más caro');
  console.log(`   → con 3 touchpoints: ${horas.trim()} · ${pct.trim()} de la dedicación · ${color.replace('semaforo-light ','')}`);
  console.log(`   → "${desc.trim().slice(0,150)}…"`);

  // ── Coherencia con el Canvas
  await page.click('a[href="#canvas"], [data-view="canvas"]').catch(()=>{});
  await page.waitForTimeout(400);
  const mismo = await page.evaluate(() => {
    const s = computeSemaforo(collectState());
    return { color: s.color, label: s.cargaLabel, display: s.cargaDisplay, modo: s.modo };
  });
  check(mismo.color === color.replace('semaforo-light ','').trim(), `Canvas y Plantilla dan el mismo color (${mismo.color})`);
  check(mismo.modo === 'horas', 'el Canvas usa la lectura por horas');
  check(mismo.modo === 'horas' && mismo.label === 'Horas de evaluar', `el Canvas etiqueta bien la métrica: "${mismo.label}" = ${mismo.display}`);

  // ── Persistencia
  await page.reload();
  await page.waitForTimeout(800);
  const tras = await page.locator('.tp-card').count();
  const corrTras = await page.locator('.tp-card:nth-of-type(3) input[name$="-min-corr"]').inputValue();
  check(tras === 3 && corrTras === '25', `todo sobrevive a recargar (${tras} tarjetas, corregir=${corrTras})`);

  check(errs.length===0, 'sin errores de JavaScript' + (errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log('\n✓ ' + ok.length + ' comprobaciones:'); ok.forEach(m=>console.log('   ✓ '+m));
  if(mal.length){ console.log('\n✗ FALLOS:'); mal.forEach(m=>console.log('   ✗ '+m)); process.exit(1); }
  console.log('\nPlantilla estratégica en verde.');
})();
