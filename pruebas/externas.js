const { chromium } = require('playwright');
const PAGS=['index.html','proceso.html','kit.html','documentacion.html','acerca.html','sprint-0.html','sprint-1.html','sprint-2.html','404.html',
 'downloads/sprint-0/guia-estrategica.html','downloads/sprint-0/mini-guia-pretrabajo.html','downloads/sprint-0/plantilla-estrategica.html',
 'downloads/sprint-1/guia-breve.html','downloads/sprint-1/walkthrough.html','downloads/sprint-1/panel-plan-operativo.html'];
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  const pg=await ctx.newPage();
  const dominios={};
  pg.on('request', r=>{ const u=new URL(r.url()); if(u.hostname!=='localhost'){ dominios[u.hostname]=(dominios[u.hostname]||0)+1; } });
  for (const f of PAGS){ await pg.goto('http://localhost:8099/'+f).catch(()=>{}); await pg.waitForTimeout(500); }
  await b.close();
  console.log('Dominios externos contactados al abrir las 15 piezas:');
  Object.entries(dominios).sort((a,b)=>b[1]-a[1]).forEach(([d,n])=>console.log('  ·',d,'—',n,'peticiones'));
  if(!Object.keys(dominios).length) console.log('  (ninguno)');
})();
