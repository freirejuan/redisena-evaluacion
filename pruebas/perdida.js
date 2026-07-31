const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const fs = require('fs');
const URL='http://localhost:8099/downloads/sprint-0/plantilla-estrategica.html';
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const CLAVE='redisena-plantilla-estrategica-v0';

async function nueva(ctx, dialogos){
  const page=await ctx.newPage();
  page.on('dialog', async d=>{ dialogos.push(d.message()); await (d.type()==='confirm'?d.accept():d.accept()); });
  await page.goto(URL); await page.waitForTimeout(400);
  return page;
}
const rellena = async (page,nombre,n)=>{
  await page.fill('#asig-nombre', nombre);
  for(let i=0;i<n;i++) await page.click('.tp-add');
  await page.waitForTimeout(700);
};

(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('https://fonts.g**',r=>r.abort());
  const errs=[]; ctx.on('page',p=>p.on('pageerror',e=>errs.push(e.message)));

  // ── 1 · Un JSON ajeno no toca nada
  let dlg=[]; let page=await nueva(ctx,dlg);
  await page.evaluate(k=>localStorage.clear(),CLAVE); await page.reload(); await page.waitForTimeout(300);
  await rellena(page,'Termodinámica II',3);
  fs.writeFileSync(TMP + '/ajeno.json', JSON.stringify({proyecto:'otra cosa',filas:[1,2,3]}));
  dlg.length=0;
  await page.setInputFiles('#file-import',TMP + '/ajeno.json'); await page.waitForTimeout(600);
  check(await page.locator('.tp-card').count()===3, 'un JSON ajeno deja los 3 touchpoints intactos');
  check(dlg.some(m=>m.includes('no es una plantilla estratégica')), 'y lo dice claramente en vez de felicitar');
  check(!dlg.some(m=>m.includes('correctamente')), 'ya no responde «importada correctamente»');

  // ── 2 · Un JSON bueno reemplaza, no fusiona
  const bueno = await page.evaluate(()=>{ const s=collectState(); s['asig-nombre']='Física I'; s['d2-postura']=undefined; s.touchpoints=[{nombre:'Único',dims:{}}]; return s; });
  fs.writeFileSync(TMP + '/bueno.json', JSON.stringify(bueno));
  await page.selectOption('#asig-curso','3º').catch(()=>{});
  await page.waitForTimeout(400);
  dlg.length=0;
  await page.setInputFiles('#file-import',TMP + '/bueno.json'); await page.waitForTimeout(700);
  check(dlg.some(m=>m.includes('Vas a reemplazar')), 'avisa de lo que se va a reemplazar y con cuánto trabajo');
  check(await page.locator('.tp-card').count()===1, 'reemplaza los touchpoints (queda 1, no 4)');
  check(await page.locator('#asig-nombre').inputValue()==='Física I', 'aplica el archivo cargado');

  // ── 3 · Se puede deshacer
  check(await page.locator('#btn-deshacer-import').count()===1, 'aparece el botón de deshacer');
  dlg.length=0;
  await page.click('#btn-deshacer-import'); await page.waitForTimeout(700);
  check(await page.locator('#asig-nombre').inputValue()==='Termodinámica II', 'deshacer recupera la plantilla anterior');
  check(await page.locator('.tp-card').count()===3, 'y sus 3 touchpoints');

  // ── 4 · Lo último escrito no se pierde al salir
  await page.fill('#hoy-descripcion','Texto escrito justo antes de irme');
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true}));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(200);
  const guardado = await page.evaluate(k=>{const L=JSON.parse(localStorage.getItem(k)||'{}'); return (L.escenarios||[]).find(e=>e.id===L.activo)?.estado||{};},CLAVE);
  check(guardado['hoy-descripcion']==='Texto escrito justo antes de irme', 'el texto se guarda al ocultarse la pestaña, sin esperar los 250 ms');

  // ── 5 · Dos pestañas
  const page2=await nueva(ctx,dlg);
  await page2.evaluate(()=>{ document.querySelector('#asig-nombre').value='Desde la otra pestaña'; persist(); });
  await page2.waitForTimeout(600);
  await page.bringToFront(); await page.waitForTimeout(500);
  check(await page.locator('#aviso-conflicto').count()===1, 'la primera pestaña detecta que otra ha escrito');
  const estado = await page.locator('#save-state').textContent();
  check(estado.includes('Pausado'), `pausa el guardado automático en vez de pisar (dice «${estado.trim()}»)`);
  await page.fill('#hoy-descripcion','No debería pisar a la otra');
  await page.waitForTimeout(700);
  const trasEscribir = await page.evaluate(k=>{const L=JSON.parse(localStorage.getItem(k)||'{}'); return (L.escenarios||[]).find(e=>e.id===L.activo)?.estado||{};},CLAVE);
  check(trasEscribir['asig-nombre']==='Desde la otra pestaña', 'y escribir en la primera ya no borra lo de la segunda');
  await page.click('#btn-conflicto-mio'); await page.waitForTimeout(500);
  check(await page.locator('#aviso-conflicto').count()===0, 'al elegir con cuál quedarse, el aviso desaparece');

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
  console.log('\nLos cinco caminos cerrados.');
})();
