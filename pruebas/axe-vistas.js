const { chromium } = require('playwright');
const fs = require('fs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const BASE = 'http://localhost:8099';
const correr = async (pg, etiqueta) => {
  await pg.addScriptTag({ content: AXE });
  const r = await pg.evaluate(async () => (await axe.run(document, {
    runOnly:{ type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice'] }
  })).violations.filter(v => ['critical','serious','moderate'].includes(v.impact))
     .map(v => ({id:v.id, n:v.nodes.length, ej:v.nodes[0].target.join(' ').slice(0,70), msg:(v.nodes[0].any[0]||v.nodes[0].all[0]||{}).message||''})));
  console.log((r.length? '  ✗ ':'  ✓ ') + etiqueta + (r.length? ' → ' + r.map(x=>x.id+'×'+x.n+' ['+x.ej+'] '+x.msg.slice(0,90)).join(' | ') : ''));
  return r.length;
};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:1280,height:900} });
  await ctx.route('**://fonts.g*.com/**', r=>r.abort());
  const pg = await ctx.newPage();
  let mal = 0;

  console.log('— Plantilla estratégica, vista a vista');
  await pg.goto(BASE+'/downloads/sprint-0/plantilla-estrategica.html');
  await pg.waitForTimeout(600);
  await pg.click('text=Ejemplos'); await pg.waitForTimeout(400);
  await pg.locator('.gal-item').first().locator('button').click(); await pg.waitForTimeout(900);
  for (const v of ['plantilla','canvas','blueprint','comparar']) {
    await pg.click(`[data-view="${v}"]`); await pg.waitForTimeout(700);
    mal += await correr(pg, 'vista ' + v);
  }
  await pg.click('[data-view="plantilla"]'); await pg.waitForTimeout(300);
  await pg.click('text=Ejemplos'); await pg.waitForTimeout(600);
  mal += await correr(pg, 'galería de ejemplos abierta');
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);

  console.log('— Panel del plan operativo, vista a vista');
  await pg.goto(BASE+'/downloads/sprint-1/panel-plan-operativo.html');
  await pg.waitForTimeout(900);
  const pestanas = await pg.locator('.tabs .tab').allTextContents();
  console.log('    pestañas del panel:', pestanas.join(' · '));
  for (const t of pestanas) {
    await pg.locator('.tabs .tab', { hasText: t }).first().click();
    await pg.waitForTimeout(900);
    mal += await correr(pg, 'panel ' + t.trim());
  }
  // Y las dos lentes del calendario, que se conmutan aparte
  const lentes = await pg.locator('.lente-btn, [data-lente], .cal-toggle button').allTextContents();
  for (const t of lentes) {
    await pg.locator('.lente-btn, [data-lente], .cal-toggle button', { hasText: t }).first().click();
    await pg.waitForTimeout(800);
    mal += await correr(pg, 'lente ' + t.trim());
  }
  await b.close();
  console.log(mal===0 ? '\nSin incumplimientos en las vistas dinámicas.' : '\n' + mal + ' reglas incumplidas.');
})();
