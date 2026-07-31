const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
const BASE='http://localhost:8099';
const PAGS=['index.html','proceso.html','kit.html','documentacion.html','acerca.html','sprint-0.html','sprint-1.html','sprint-2.html','404.html'];
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('**://fonts.g*.com/**',r=>r.abort());
  const pg=await ctx.newPage();
  const rotos=[];
  for (const f of PAGS){
    await pg.goto(BASE+'/'+f); await pg.waitForTimeout(200);
    const enlaces = await pg.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')));
    for (const h of new Set(enlaces)){
      if (!h || h.startsWith('http') || h.startsWith('mailto')) continue;
      const [ruta, ancla] = h.split('#');
      let destino = ruta || ('/'+f);
      if (destino === '/') destino = '/index.html';
      if (!/\.[a-z]+$/.test(destino)) destino += '.html';
      const disco = path.join(RAIZ, destino);
      if (!fs.existsSync(disco)) { rotos.push(`${f} → ${h} (no existe ${destino})`); continue; }
      if (ancla){
        const cont = fs.readFileSync(disco,'utf8');
        if (!new RegExp(`id="${ancla}"`).test(cont)) rotos.push(`${f} → ${h} (ancla #${ancla} no existe)`);
      }
    }
  }
  await b.close();
  if (rotos.length){ console.log('ENLACES ROTOS:'); rotos.forEach(r=>console.log('  ✗ '+r)); process.exit(1); }
  console.log('  ✓ todos los enlaces internos y anclas resuelven');
})();
