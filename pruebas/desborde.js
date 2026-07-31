const { RAIZ, TMP } = require('./rutas');
const { chromium } = require('playwright');
const path = require('path');
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
  const ctx = await b.newContext({ viewport: { width: 360, height: 800 } });
  await ctx.route('**://fonts.googleapis.com/**', r => r.abort());
  await ctx.route('**://fonts.gstatic.com/**', r => r.abort());
  const pg = await ctx.newPage();
  let malos = 0;
  for (const f of PAGS) {
    await pg.goto('file://' + path.join(RAIZ, f));
    await pg.waitForTimeout(250);
    const r = await pg.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      // documentElement.scrollWidth cuenta el contenido de los contenedores con
      // scroll propio aunque la página no se mueva. Lo que le pasa al profesor
      // es si la PÁGINA se desplaza a lo ancho: eso se mide intentándolo.
      const antes = window.scrollX;
      window.scrollTo(9999, window.scrollY);
      const scroll = window.scrollX;
      window.scrollTo(antes, window.scrollY);
      const recortes = [];
      document.querySelectorAll('*').forEach(el => {
        const cs = getComputedStyle(el);
        if (el.scrollWidth - el.clientWidth <= 4) return;
        if (cs.overflowX !== 'hidden' && cs.overflowX !== 'clip') return;
        // Se ignoran los elementos ocultos a la vista (existen sólo para el lector
        // de pantalla) y los adornos: sólo cuenta el texto que el ojo pierde.
        if (el.classList.contains('visually-hidden')) return;
        const limite = el.getBoundingClientRect().left + el.clientWidth;
        let textoFuera = false;
        el.querySelectorAll('*').forEach(h => {
          if (h.children.length || !h.textContent.trim()) return;
          if (h.classList.contains('visually-hidden')) return;
          if (h.getBoundingClientRect().right > limite + 2) textoFuera = true;
        });
        if (textoFuera) recortes.push({
          sel: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0],
          perdido: el.scrollWidth - el.clientWidth });
      });
      return { scroll, recortes: recortes.slice(0, 6) };
    });
    const ok = r.scroll <= 2 && r.recortes.length === 0;
    if (!ok) malos++;
    console.log((ok ? '  OK  ' : '  ✗   ') + f + '  scroll=' + r.scroll +
      (r.recortes.length ? '  recorta: ' + r.recortes.map(x => x.sel + '(-' + x.perdido + 'px)').join(', ') : ''));
  }
  await b.close();
  console.log(malos === 0 ? '\nSin desbordes a 360 px.' : '\n' + malos + ' páginas con problema a 360 px.');
})();
