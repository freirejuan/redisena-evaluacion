const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PAGS = [
  'index.html','proceso.html','kit.html','documentacion.html','acerca.html',
  'sprint-0.html','sprint-1.html','sprint-2.html','404.html',
  'downloads/sprint-0/guia-estrategica.html','downloads/sprint-0/mini-guia-pretrabajo.html',
  'downloads/sprint-0/plantilla-estrategica.html',
  'downloads/sprint-1/guia-breve.html','downloads/sprint-1/walkthrough.html',
  'downloads/sprint-1/panel-plan-operativo.html',
  'downloads/sprint-2/guia-observar-y-leer.html',
  'downloads/sprint-2/cuaderno-pilotaje.html'
];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**://fonts.g*.com/**', r => r.abort());
  const pg = await ctx.newPage();
  const total = {};
  for (const f of PAGS) {
    await pg.goto('file://' + path.join(RAIZ, f));
    await pg.waitForTimeout(300);
    await pg.addScriptTag({ content: AXE });
    const res = await pg.evaluate(async () => await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice'] }
    }));
    const v = res.violations.filter(x => x.impact === 'critical' || x.impact === 'serious' || x.impact === 'moderate');
    console.log('\n=== ' + f + ' — ' + v.length + ' reglas incumplidas');
    v.forEach(x => {
      console.log('  [' + x.impact + '] ' + x.id + ' ×' + x.nodes.length + ' — ' + x.help);
      x.nodes.slice(0,3).forEach(n => console.log('       ' + n.target.join(' ').slice(0,110)));
      total[x.id] = (total[x.id]||0) + x.nodes.length;
    });
  }
  await b.close();
  console.log('\n===== RESUMEN =====');
  Object.entries(total).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(' ' + k + ': ' + v));
  console.log(' TOTAL nodos: ' + Object.values(total).reduce((a,b)=>a+b,0));
})();
