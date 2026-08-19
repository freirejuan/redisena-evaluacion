const { RAIZ } = require('./rutas');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
// DESFASE ENTRE EL HTML Y SUS ASSETS
//
// /assets/* se sirve con caché de un año e immutable, y el HTML con cinco
// minutos. Si se cambia una hoja o un script sin renombrarlo, el HTML nuevo
// llega a todo el mundo y el asset viejo se queda: el navegador no vuelve a
// preguntar. Eso pasó el 31 de julio de 2026 y se veía como un «Saltar al
// contenido» de texto suelto encima de la cabecera.
//
// Esta prueba comprueba dos cosas:
//   1 · que el HTML no dependa de clases que su hoja no define,
//       ni de funciones que su script no exporta;
//   2 · que lo que esas reglas tienen que conseguir, lo consiguen de verdad
//       en el navegador — que es lo único que el profesor nota.
// ═══════════════════════════════════════════════════

const PAGS = ['index.html','proceso.html','kit.html','documentacion.html','acerca.html',
              'sprint-0.html','sprint-1.html','sprint-2.html','404.html'];

// Los recursos descargables no enlazan hojas: llevan su CSS dentro. El desfase
// ahí no es de caché, es de olvido — se pega una clase que la web sí define y
// el documento no, y el texto que debía estar oculto se ve. Pasó al añadir las
// lecturas recomendadas a la Guía estratégica: el aviso «(se abre en una
// pestaña nueva)», que sólo es para el lector de pantalla, quedaba a la vista.
const PIEZAS = ['downloads/sprint-0/guia-estrategica.html',
                'downloads/sprint-0/mini-guia-pretrabajo.html',
                'downloads/sprint-0/plantilla-estrategica.html',
                'downloads/sprint-1/guia-breve.html',
                'downloads/sprint-1/walkthrough.html',
                'downloads/sprint-1/panel-plan-operativo.html',
                'downloads/sprint-2/guia-observar-y-leer.html',
                'downloads/sprint-2/cuaderno-pilotaje.html'];

// Clases del HTML cuyo aspecto depende por completo de la hoja: si falta la
// regla, no es que se vea distinto, es que se ve un defecto.
const CLASES_CRITICAS = ['skip-link','visually-hidden','capa','en-corto','status-strip','tool-card','step-block','lectura','callout'];
// Identificadores que el HTML espera encontrar en el script.
const FUNCIONES_CRITICAS = ['ui_bindDetalle','ui_pintaSiguientePaso','ui_prepararImpresion','ui_bindSprintPage','anuncia'];

const ok = [], mal = [];
const check = (c, m) => (c ? ok : mal).push(m);

(async () => {
  // ── 1 · Estático: lo que el HTML pide, ¿está en el asset que enlaza?
  for (const p of PAGS) {
    const html = fs.readFileSync(path.join(RAIZ, p), 'utf8');
    const css = (html.match(/href="(\/assets\/css\/[^"]+)"/g) || [])
      .map(m => m.match(/href="([^"]+)"/)[1]);
    const js = (html.match(/src="(\/assets\/js\/[^"]+)"/g) || [])
      .map(m => m.match(/src="([^"]+)"/)[1]);

    const cssTexto = css.map(r => {
      const f = path.join(RAIZ, r);
      return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    });
    check(!cssTexto.includes(null), `${p}: todas las hojas que enlaza existen (${css.join(', ')})`);
    const todoCss = cssTexto.filter(Boolean).join('\n');

    const usadas = CLASES_CRITICAS.filter(c => new RegExp('class="[^"]*\\b' + c + '\\b').test(html));
    const huerfanas = usadas.filter(c => !new RegExp('\\.' + c + '\\b').test(todoCss));
    check(huerfanas.length === 0,
      `${p}: las ${usadas.length} clases críticas que usa están definidas${huerfanas.length ? ' — HUÉRFANAS: ' + huerfanas.join(', ') : ''}`);

    const jsTexto = js.map(r => {
      const f = path.join(RAIZ, r);
      return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    });
    check(!jsTexto.includes(null), `${p}: todos los scripts que enlaza existen (${js.join(', ') || 'ninguno'})`);
    const todoJs = jsTexto.filter(Boolean).join('\n');
    if (todoJs) {
      const faltan = FUNCIONES_CRITICAS.filter(fn => !todoJs.includes(fn));
      check(faltan.length === 0, `${p}: el script trae las funciones que la página necesita${faltan.length ? ' — FALTAN: ' + faltan.join(', ') : ''}`);
    }
  }

  // ── 1b · Estático en los descargables: la clase que usan, ¿la define su
  //         propia hoja incrustada?
  for (const p of PIEZAS) {
    const html = fs.readFileSync(path.join(RAIZ, p), 'utf8');
    const incrustado = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
    check(incrustado.length > 0, `${p}: lleva su hoja incrustada`);
    const usadas = CLASES_CRITICAS.filter(c => new RegExp('class="[^"]*\\b' + c + '\\b').test(html));
    const huerfanas = usadas.filter(c => !new RegExp('\\.' + c + '\\b').test(incrustado));
    check(huerfanas.length === 0,
      `${p}: las ${usadas.length} clases críticas que usa están definidas dentro${huerfanas.length ? ' — HUÉRFANAS: ' + huerfanas.join(', ') : ''}`);
  }

  // ── 2 · En el navegador: ¿lo consiguen?
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route('**://fonts.g*.com/**', r => r.abort());
  const pg = await ctx.newPage();

  for (const p of [...PAGS, ...PIEZAS]) {
    await pg.goto('http://localhost:8099/' + p);
    await pg.waitForTimeout(250);

    // El enlace de salto sólo existe en la web; los descargables no navegan.
    if (PAGS.includes(p)) {
    // El enlace de salto: fuera de pantalla hasta que recibe el foco.
    const salto = await pg.evaluate(() => {
      const el = document.querySelector('.skip-link');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), ancho: Math.round(r.width) };
    });
    check(salto && salto.x < -100,
      `${p}: «Saltar al contenido» está fuera de pantalla (x=${salto ? salto.x : 'no existe'})`);

    await pg.keyboard.press('Tab');
    await pg.waitForTimeout(150);
    const enfocado = await pg.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.classList.contains('skip-link')) return null;
      return Math.round(el.getBoundingClientRect().x);
    });
    check(enfocado !== null && enfocado >= 0,
      `${p}: y aparece al tabular (x=${enfocado === null ? 'no recibe el foco' : enfocado})`);
    }

    // Un aviso con negritas no puede partirse en columnas. Pasaba: .callout era
    // un contenedor flexible y cada trozo de texto suelto y cada <strong> se
    // convertía en una columna estrecha con el texto envuelto dentro. Se detecta
    // por lo que lo delataba: un hijo estrecho y de varias líneas de alto.
    const avisos = await pg.evaluate(() => {
      const rotos = [];
      document.querySelectorAll('.callout').forEach(c => {
        const cs = getComputedStyle(c);
        const ancho = c.getBoundingClientRect().width;
        if (ancho < 200) return;
        // En los descargables el aviso sí es flexible a propósito: icono a un
        // lado, texto al otro, siempre dos hijos. Lo que no puede ser flexible
        // es un aviso sin ese icono, porque entonces cada trozo suelto de
        // texto se convierte en columna.
        const conIcono = !!c.querySelector(':scope > .callout-icon');
        if (!conIcono && (cs.display === 'flex' || cs.display === 'inline-flex' || cs.display === 'grid')) {
          rotos.push('el aviso es un contenedor ' + cs.display + ' sin icono');
          return;
        }
        const linea = parseFloat(cs.lineHeight) || 21;
        [...c.children].forEach(h => {
          const r = h.getBoundingClientRect();
          if (r.width > 0 && r.width < ancho * 0.3 && r.height > linea * 2.5) {
            rotos.push(h.tagName.toLowerCase() + ' de ' + Math.round(r.width) + '×' + Math.round(r.height) + 'px');
          }
        });
      });
      return rotos;
    });
    check(avisos.length === 0,
      `${p}: los avisos fluyen como texto y no en columnas${avisos.length ? ' — ROTOS: ' + avisos.slice(0,3).join('; ') : ''}`);

    // Lo que sólo existe para el lector de pantalla no se ve.
    const invisible = await pg.evaluate(() => {
      const els = [...document.querySelectorAll('.visually-hidden')];
      if (!els.length) return 'ninguno';
      return els.every(e => {
        const r = e.getBoundingClientRect();
        return r.width <= 2 && r.height <= 2;
      });
    });
    check(invisible === true || invisible === 'ninguno',
      `${p}: el texto sólo para lector de pantalla no ocupa sitio (${invisible})`);
  }

  await b.close();
  console.log(ok.map(m => '  ✓ ' + m).join('\n'));
  if (mal.length) { console.log('\nFALLOS:'); mal.forEach(m => console.log('  ✗ ' + m)); process.exit(1); }
})();
