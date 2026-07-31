const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const B='http://localhost:8099', CLAVE='redisena_evaluacion';
const sem = (s0,s1,s2)=>({schema_version:1, asignatura:'Prueba',
  sprints:{sprint_0:s0, sprint_1:s1, sprint_2:s2},
  creado_en:new Date().toISOString(), actualizado_en:new Date().toISOString(), ultima_visita:new Date().toISOString(), visita_previa:null});
const S=(estado,pasos=[])=>({estado, pasos_completados:pasos, completado_en:null});
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('**://fonts.g*.com/**',r=>r.abort());
  const errs=[]; const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  const cargar = async (estado, pagina) => {
    await pg.goto(B+'/404.html');
    await pg.evaluate(([k,v])=>{ localStorage.clear(); localStorage.setItem(k, JSON.stringify(v)); },[CLAVE,estado]);
    await pg.goto(B+'/'+pagina); await pg.waitForTimeout(600);
  };

  // A · Sprint 0 cerrado pero Sprint 1 bloqueado (progreso viejo)
  await cargar(sem(S('completado',['paso_1','paso_2','paso_3']), S('bloqueado'), S('proximamente')), 'sprint-1.html');
  let t = await pg.locator('#siguiente-paso .sp-texto').textContent();
  check(!/cerrar antes/.test(t), `no manda a cerrar algo ya cerrado («${t.replace(/\s+/g,' ').trim()}»)`);
  const bloq = await pg.evaluate(k=>JSON.parse(localStorage.getItem(k)).sprints.sprint_1.estado, CLAVE);
  check(bloq!=='bloqueado', `y el Sprint 1 deja de estar bloqueado (${bloq})`);
  check(await pg.locator('.checkbox[data-step="paso_1"]').getAttribute('aria-disabled')==='false', 'sus pasos se pueden marcar');

  // B · Estado inventado
  await cargar(sem(S('inventado'), S('bloqueado'), S('proximamente')), 'index.html');
  const barra = await pg.locator('#status-step').textContent();
  check(!/undefined/.test(barra), `un estado desconocido no pinta «undefined» (${barra})`);

  // C · Los tres cerrados
  await cargar(sem(S('completado',['paso_1','paso_2','paso_3']), S('completado',['paso_1','paso_2','paso_3']), S('completado')), 'index.html');
  const titulo = await pg.locator('#continue-title').textContent();
  const boton = await pg.locator('#continue-btn').textContent();
  check(/cerrado los tres/i.test(titulo), `con todo cerrado la portada lo dice («${titulo.trim()}» · «${boton.trim()}»)`);

  // D · La portada y el guiado dicen lo mismo
  await cargar(sem(S('completado',['paso_1','paso_2','paso_3']), S('en_progreso',['paso_1']), S('proximamente')), 'index.html');
  const bot = await pg.locator('#continue-btn').getAttribute('href');
  await pg.goto(B+'/kit.html'); await pg.waitForTimeout(500);
  const dest = await pg.locator('#siguiente-paso a').getAttribute('href');
  check(bot===dest, `la portada y el guiado apuntan al mismo sitio (${bot} = ${dest})`);

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
