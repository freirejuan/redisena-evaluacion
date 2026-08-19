const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const fs=require('fs');
const URL='http://localhost:8099/downloads/sprint-0/plantilla-estrategica.html';
const CLAVE='redisena-plantilla-estrategica-v0';
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('https://fonts.g**',r=>r.abort());
  const errs=[];
  const page=await ctx.newPage(); page.on('pageerror',e=>errs.push(e.message));
  let respuesta=null;
  page.on('dialog', async d=>{ if(d.type()==='prompt') await d.accept(respuesta==null?'':String(respuesta)); else await d.accept(); });

  // ══ 1 · MIGRACIÓN: trabajo guardado en el formato antiguo
  // Se siembra el localStorage desde una página en blanco del mismo origen: si
  // se sembrase con la plantilla ya cargada, el guardado de 'pagehide' escribiría
  // el estado vacío encima al recargar y la prueba mediría otra cosa.
  await page.goto('http://localhost:8099/404.html');
  const VIEJO = { 'asig-nombre':'Termodinámica II', 'asig-estudiantes':'90', 'asig-equipo':'2',
                  'd1-momentos':'Tres momentos', 'd2-postura':'Herramienta abierta con reglas',
                  touchpoints:[{nombre:'Parcial 1',naturaleza:'Puntual',cuando:'semana 6',dims:{}},
                               {nombre:'Proyecto',naturaleza:'Continuo',cuando:'todo el curso',dims:{}}] };
  await page.evaluate(([k,v])=>{ localStorage.clear(); localStorage.setItem(k, JSON.stringify(v)); },[CLAVE,VIEJO]);
  await page.goto(URL); await page.waitForTimeout(900);
  check(await page.locator('#asig-nombre').inputValue()==='Termodinámica II', 'el trabajo del formato antiguo aparece intacto');
  check(await page.locator('.tp-card').count()===2, 'con sus 2 touchpoints');
  check(await page.locator('#asig-estudiantes').inputValue()==='90', 'y sus datos del Paso 1');
  // El campo del formato se llamaba «naturaleza» hasta agosto de 2026. Quien
  // guardó antes del cambio tiene que seguir viendo lo que marcó: si esto falla,
  // el touchpoint aparece sin formato y el profesor cree que perdió el dato.
  const fmtViejo = await page.evaluate(() =>
    [...document.querySelectorAll('.tp-card')].map(c => {
      const m = c.querySelector('input[name$="-formato"]:checked');
      return m ? m.value : null;
    }));
  check(JSON.stringify(fmtViejo)===JSON.stringify(['Puntual','Continuo']),
    `y el formato guardado como «naturaleza» se sigue leyendo (${JSON.stringify(fmtViejo)})`);
  const nom = await page.locator('#esc-select option').first().textContent();
  check(nom==='Lo que tengo hoy', `y se convierte en el primer escenario, llamado «${nom}»`);
  const guardado = await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),CLAVE);
  check(guardado._formato==='escenarios-v1' && guardado.escenarios.length===1, 'el formato guardado ya es el de escenarios');

  // ══ 2 · Escenario de estrés generado por la aplicación
  // Con un solo escenario no hay nada que comparar y el botón no está.
  check(await page.locator('#esc-comparar').isVisible()===false,
    'con un solo escenario no se ofrece comparar');

  respuesta='2';   // «El doble de estudiantes»
  await page.click('text=+ Nuevo escenario'); await page.waitForTimeout(900);

  // En cuanto hay dos, la comparación se ofrece donde se acaba de crear el
  // segundo, y no sólo en la pestaña 4 del otro extremo de la pantalla.
  const btnCmp = page.locator('#esc-comparar');
  check(await btnCmp.isVisible(), 'al haber dos, aparece el botón de comparar en la barra de escenarios');
  check(/2 escenarios/.test(await btnCmp.innerText()), `y dice cuántos son («${(await btnCmp.innerText()).trim()}»)`);
  check(/\(2\)/.test(await page.locator('.tab-btn[data-view="comparar"]').innerText()),
    'y la pestaña también lleva la cuenta');
  await btnCmp.click(); await page.waitForTimeout(700);
  check(await page.evaluate(()=>document.querySelector('.view.active').id)==='view-comparar',
    'y el botón lleva a la comparación');
  await page.evaluate(()=>switchView('plantilla')); await page.waitForTimeout(400);
  const opciones = await page.locator('#esc-select option').allTextContents();
  check(opciones.length===2, `ahora hay 2 escenarios (${opciones.join(' | ')})`);
  check(await page.locator('#asig-estudiantes').inputValue()==='180', 'el doble de estudiantes: 90 → 180');
  check(await page.locator('#asig-equipo').inputValue()==='2', 'y solo cambia ese parámetro: el equipo sigue en 2');
  check(await page.locator('.tp-card').count()===2, 'y arrastra los touchpoints del escenario de origen');
  const variacion = await page.locator('#esc-variacion').textContent();
  check(/90 → 180/.test(variacion), `la barra dice qué se varió (${variacion.trim()})`);

  // ══ 3 · Cambiar de escenario ida y vuelta
  const ids = await page.evaluate(()=>libro.escenarios.map(e=>e.id));
  await page.selectOption('#esc-select', ids[0]); await page.waitForTimeout(700);
  check(await page.locator('#asig-estudiantes').inputValue()==='90', 'volver al primero devuelve sus 90 estudiantes');
  await page.fill('#asig-nombre','Termodinámica II (revisada)'); await page.waitForTimeout(600);
  await page.selectOption('#esc-select', ids[1]); await page.waitForTimeout(700);
  await page.selectOption('#esc-select', ids[0]); await page.waitForTimeout(700);
  check(await page.locator('#asig-nombre').inputValue()==='Termodinámica II (revisada)', 'lo editado en un escenario sobrevive al ir y volver');

  // ══ 4 · Comparación
  await page.click('[data-view="comparar"]'); await page.waitForTimeout(800);
  const filas = await page.locator('.cmp-tabla tbody tr').count();
  const cabeceras = await page.locator('.cmp-tabla thead th').allTextContents();
  check(filas>10, `la comparación pinta ${filas} filas de lectura`);
  check(cabeceras.length===3, `una columna por escenario más la etiqueta (${cabeceras.length})`);
  const difs = await page.locator('.cmp-tabla td.cmp-dif').allTextContents();
  check(difs.length>0, `marca en azul lo que cambia entre escenarios (${difs.length} celdas)`);
  console.log('     diferencias detectadas:', difs.slice(0,6).join(' · '));

  // ══ 5 · Ida y vuelta del archivo con varios escenarios
  await page.click('[data-view="plantilla"]'); await page.waitForTimeout(400);
  const d = await Promise.all([page.waitForEvent('download'), page.click('.action-bar >> text=Descargar JSON')]).then(r=>r[0]);
  const ruta=TMP + '/'+d.suggestedFilename(); await d.saveAs(ruta);
  check(/2escenarios/.test(d.suggestedFilename()), `el archivo dice cuántos escenarios trae (${d.suggestedFilename()})`);
  await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.waitForTimeout(600);
  await page.setInputFiles('#file-import', ruta); await page.waitForTimeout(1000);
  check((await page.locator('#esc-select option').count())===2, 'cargar el archivo recupera los 2 escenarios');

  // ══ 6 · Un archivo del formato antiguo sigue valiendo
  fs.writeFileSync(TMP + '/antiguo.json', JSON.stringify(VIEJO));
  await page.setInputFiles('#file-import',TMP + '/antiguo.json'); await page.waitForTimeout(1000);
  check((await page.locator('#esc-select option').count())===1, 'un archivo antiguo se carga como un escenario');
  check(await page.locator('#asig-nombre').inputValue()==='Termodinámica II', 'con su contenido intacto');

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
