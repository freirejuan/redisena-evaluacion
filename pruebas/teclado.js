const { chromium } = require('playwright');
const URL='http://localhost:8099/downloads/sprint-0/plantilla-estrategica.html';
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('**://fonts.g*.com/**',r=>r.abort());
  const errs=[]; const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  pg.on('dialog', d=>d.accept());
  await pg.goto(URL); await pg.waitForTimeout(700);
  await pg.evaluate(()=>localStorage.clear());
  await pg.goto(URL); await pg.waitForTimeout(700);

  // ── Tres touchpoints con nombre
  for (const n of ['Parcial 1','Proyecto','Ensayo final']) {
    await pg.click('#btn-add-tp'); await pg.waitForTimeout(250);
    const ultima = pg.locator('.tp-card').last();
    await ultima.locator('.tp-nombre').fill(n);
    await ultima.locator('.tp-nombre').blur();
    await pg.waitForTimeout(200);
  }
  const nombres = await pg.locator('.tp-remove').evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label')));
  check(new Set(nombres).size===3 && /TP2 · Proyecto/.test(nombres[1]),
        `los botones de eliminar se distinguen (${nombres.join(' | ')})`);
  const dup = await pg.locator('.tp-dup').first().getAttribute('aria-label');
  check(/TP1 · Parcial 1/.test(dup), `y los de duplicar también (${dup})`);

  // ── aria-expanded del desplegable
  const tog = pg.locator('.tp-card').first().locator('.tp-toggle');
  const antes = await tog.getAttribute('aria-expanded');
  await tog.click(); await pg.waitForTimeout(200);
  const despues = await tog.getAttribute('aria-expanded');
  check(antes!==despues && ['true','false'].includes(despues), `el desplegable declara si está abierto (${antes} → ${despues})`);
  const controla = await tog.getAttribute('aria-controls');
  const existe = await pg.locator('#'+controla).count();
  check(existe===1, `y apunta al cuerpo que abre (#${controla})`);

  // ── El foco no se pierde al eliminar
  await pg.locator('.tp-card').nth(1).locator('.tp-remove').focus();
  await pg.locator('.tp-card').nth(1).locator('.tp-remove').click();
  await pg.waitForTimeout(500);
  const foco = await pg.evaluate(()=>{ const a=document.activeElement; return {tag:a.tagName, cls:a.className, val:a.value||''}; });
  check(foco.tag!=='BODY', `tras eliminar, el foco va a un elemento útil (${foco.tag}.${foco.cls} «${foco.val}»)`);
  const aviso = await pg.locator('#anuncios-plantilla').textContent();
  check(/eliminado/.test(aviso), `y se anuncia («${aviso.trim()}»)`);
  check((await pg.locator('.tp-card').count())===2, 'quedan 2 touchpoints');

  // ── Los grupos de opciones tienen nombre
  const grupos = await pg.evaluate(()=>{
    const out=[];
    document.querySelectorAll('.pill-group').forEach(g=>{
      let n = g.getAttribute('aria-label');
      if(!n){ const id=g.getAttribute('aria-labelledby'); const e=id&&document.getElementById(id); n=e?e.textContent.trim():null; }
      out.push({rol:g.getAttribute('role'), nombre:n});
    });
    return out;
  });
  const sinNombre = grupos.filter(g=>!g.nombre||g.rol!=='radiogroup');
  check(sinNombre.length===0, `los ${grupos.length} grupos de opciones se anuncian con su nombre`);

  // ── Recorrido con el tabulador: nada queda inalcanzable
  const alcanzables = await pg.evaluate(()=>{
    const sel='a[href],button:not([disabled]),input:not([type=hidden]):not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll(sel)].filter(e=>{
      const cs=getComputedStyle(e);
      if(cs.display==='none'||cs.visibility==='hidden') return false;
      const r=e.getBoundingClientRect();
      return r.width>0||r.height>0||cs.position==='absolute';
    }).length;
  });
  check(alcanzables>30, `${alcanzables} elementos alcanzables con el tabulador`);

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
