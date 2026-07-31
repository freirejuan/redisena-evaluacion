const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const B='http://localhost:8100';
const PAGS=['index.html','proceso.html','kit.html','documentacion.html','acerca.html','sprint-0.html','sprint-1.html','sprint-2.html','404.html',
 'downloads/sprint-0/guia-estrategica.html','downloads/sprint-0/mini-guia-pretrabajo.html','downloads/sprint-0/plantilla-estrategica.html',
 'downloads/sprint-1/guia-breve.html','downloads/sprint-1/walkthrough.html','downloads/sprint-1/panel-plan-operativo.html'];
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  const pg=await ctx.newPage();
  const violaciones=[], errores=[], externos=new Set();
  pg.on('console', m=>{ if(/Content Security Policy/i.test(m.text())) violaciones.push(m.text().slice(0,140)); });
  pg.on('pageerror', e=>errores.push(e.message.slice(0,120)));
  pg.on('request', r=>{ const u=new URL(r.url()); if(u.hostname!=='localhost') externos.add(u.hostname); });

  for (const f of PAGS){ await pg.goto(B+'/'+f); await pg.waitForTimeout(700); }
  check(externos.size===0, `ninguna pieza contacta con un dominio ajeno (${[...externos].join(', ')||'ninguno'})`);
  check(violaciones.length===0, `la política no bloquea nada propio (${violaciones.length} avisos)`);
  if(violaciones.length) violaciones.slice(0,4).forEach(v=>console.log('    ! '+v));

  // Las tipografías cargan de verdad
  await pg.goto(B+'/index.html'); await pg.waitForTimeout(900);
  const fuentes = await pg.evaluate(async () => { await document.fonts.ready;
    return [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight); });
  check(fuentes.some(f=>/Inter/.test(f)), `Inter carga desde el propio dominio (${fuentes.length} fuentes cargadas)`);
  check(fuentes.some(f=>/Source Serif/.test(f)), 'Source Serif 4 también');

  // El Panel lee un libro con SheetJS servido desde aquí
  await pg.goto(B+'/downloads/sprint-1/panel-plan-operativo.html'); await pg.waitForTimeout(1200);
  check(await pg.evaluate(()=>typeof XLSX!=='undefined'), 'SheetJS carga desde /assets/vendor');
  check((await pg.locator('#bp-matrix .cell').count())>0, 'y el Panel pinta el ejemplo');
  check(await pg.locator('#aviso-descartadas').isHidden(), 'sin el aviso de biblioteca no cargada');

  // La plantilla guarda y descarga bajo la política
  await pg.goto(B+'/downloads/sprint-0/plantilla-estrategica.html'); await pg.waitForTimeout(900);
  await pg.fill('#asig-nombre','Prueba CSP'); await pg.waitForTimeout(700);
  const guardado = await pg.evaluate(()=>localStorage.getItem('redisena-plantilla-estrategica-v0'));
  check(guardado && guardado.includes('Prueba CSP'), 'la plantilla sigue guardando en el navegador');
  const d = await Promise.all([pg.waitForEvent('download'), pg.click('.action-bar >> text=Descargar JSON')]).then(r=>r[0]);
  check(!!d.suggestedFilename(), `y la descarga funciona (${d.suggestedFilename()})`);

  check(errores.length===0, 'sin errores de JavaScript'+(errores.length?': '+errores.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
