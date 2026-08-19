const { chromium } = require('playwright');
const ok=[],mal=[]; const check=(c,m)=>(c?ok:mal).push(m);
const BASE='http://localhost:8099';
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext();
  await ctx.route('**://fonts.g*.com/**',r=>r.abort());
  const errs=[]; const pg=await ctx.newPage(); pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(BASE+'/sprint-0.html'); await pg.waitForTimeout(500);

  const capas = await pg.locator('details.capa').count();
  check(capas>0, `la página tiene ${capas} apartados plegables`);
  const abiertas = await pg.locator('details.capa[open]').count();
  check(abiertas===0, 'todos empiezan recogidos');

  // El botón despliega y recuerda
  await pg.click('[data-action="detalle"]'); await pg.waitForTimeout(300);
  check((await pg.locator('details.capa[open]').count())===capas, 'el botón despliega todos');
  const rotulo = await pg.locator('[data-action="detalle"]').first().textContent();
  check(/menos/.test(rotulo), `y cambia de rótulo («${rotulo.trim()}»)`);
  check(await pg.locator('[data-action="detalle"]').first().getAttribute('aria-pressed')==='true', 'y lo declara pulsado');

  await pg.goto(BASE+'/sprint-1.html'); await pg.waitForTimeout(500);
  const c1 = await pg.locator('details.capa').count();
  const a1 = await pg.locator('details.capa[open]').count();
  check(c1===0 || a1===c1, `la preferencia viaja a otra página (${a1}/${c1} abiertos)`);

  await pg.goto(BASE+'/sprint-0.html'); await pg.waitForTimeout(500);
  check((await pg.locator('details.capa[open]').count())===capas, 'y sobrevive a recargar');
  await pg.click('[data-action="detalle"]'); await pg.waitForTimeout(300);
  check((await pg.locator('details.capa[open]').count())===0, 'volver a pulsarlo los recoge');

  // Con teclado
  await pg.locator('details.capa > summary').first().focus();
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(200);
  check(await pg.locator('details.capa').first().evaluate(d=>d.open), 'se abre con Intro desde el teclado');

  // Nada se pierde: el texto plegado existe en el documento
  const oculto = await pg.evaluate(()=>{
    const d=[...document.querySelectorAll('details.capa')].filter(x=>!x.open);
    return d.reduce((n,x)=>n+x.textContent.trim().split(/\s+/).length,0);
  });
  check(oculto>0, `${oculto} palabras siguen en el documento aunque estén recogidas`);

  // Los pasos accionables siguen a la vista
  check((await pg.locator('.checkbox[data-sprint]').count())===3, 'los tres pasos siguen en la primera capa');
  check(await pg.locator('[data-action="complete-sprint"]').isVisible(), 'y el botón de cerrar el sprint también');

  // ── La biblioteca: un recurso por línea, la descripción a un clic
  await pg.goto(BASE+'/kit.html'); await pg.waitForTimeout(600);
  const recursos = await pg.locator('details.capa-recurso').count();
  check(recursos>=8, `el Kit lista ${recursos} recursos plegables`);
  check((await pg.locator('details.capa-recurso[open]').count())===0, 'y todos empiezan recogidos');
  // El título y los enlaces se ven sin abrir nada
  const visibles = await pg.evaluate(()=>{
    // getBoundingClientRect no vale aquí: el contenido de un <details> cerrado
    // se oculta con content-visibility y los hijos siguen midiendo. checkVisibility
    // sí lo tiene en cuenta, que es lo que de verdad ve el profesor.
    const ve = el => !!el && el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true, opacityProperty: true });
    const c = [...document.querySelectorAll('.tool-card')];
    return { titulos: c.filter(x => ve(x.querySelector('.rec-titulo'))).length,
             enlaces: c.filter(x => ve(x.querySelector('.actions a'))).length,
             descripciones: c.filter(x => ve(x.querySelector('.capa-recurso > p'))).length };
  });
  check(visibles.titulos===recursos && visibles.enlaces===recursos && visibles.descripciones===0,
    `sin abrir nada se ven ${visibles.titulos} títulos y ${visibles.enlaces} grupos de enlaces, y ninguna descripción (${visibles.descripciones})`);
  await pg.locator('details.capa-recurso').first().locator('summary').click(); await pg.waitForTimeout(300);
  check((await pg.locator('details.capa-recurso[open]').count())===1, 'abrir uno abre sólo ese');
  await pg.click('[data-action="detalle"]'); await pg.waitForTimeout(400);
  check((await pg.locator('details.capa-recurso[open]').count())===recursos, 'y el conmutador los abre todos');
  check((await pg.locator('#siguiente-paso').count())===0, 'la biblioteca no lleva la barra de «lo siguiente»');

  check(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await b.close();
  console.log(ok.map(m=>'  ✓ '+m).join('\n'));
  if(mal.length){ console.log('\nFALLOS:'); mal.forEach(m=>console.log('  ✗ '+m)); process.exit(1); }
})();
