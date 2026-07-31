// Servidor de pruebas. Levanta dos puertos sobre la raíz del sitio:
//   8099 · tal cual, como Cloudflare Pages sirve el HTML
//   8100 · con la Content-Security-Policy real de producción
// El segundo existe porque `_headers` no lo interpreta ningún servidor local, y
// hay fallos que sólo aparecen con la cabecera puesta.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { RAIZ } = require('./rutas');

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; " +
            "base-uri 'self'; form-action 'none'; frame-ancestors 'none'";

const TIPOS = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.woff2':'font/woff2',
  '.svg':'image/svg+xml', '.png':'image/png', '.md':'text/plain; charset=utf-8',
  '.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };

function sirve(conCsp) {
  return (req, res) => {
    let ruta = decodeURIComponent(req.url.split('?')[0]);
    if (ruta.endsWith('/')) ruta += 'index.html';
    if (!path.extname(ruta)) ruta += '.html';
    const destino = path.join(RAIZ, path.normalize(ruta).replace(/^(\.\.[/\\])+/, ''));
    fs.readFile(destino, (err, datos) => {
      if (err) { res.writeHead(404, {'Content-Type':'text/plain'}); res.end('404'); return; }
      const cab = { 'Content-Type': TIPOS[path.extname(destino)] || 'application/octet-stream' };
      if (conCsp) cab['Content-Security-Policy'] = CSP;
      res.writeHead(200, cab); res.end(datos);
    });
  };
}

http.createServer(sirve(false)).listen(8099, () => console.log('sin CSP  → http://localhost:8099'));
http.createServer(sirve(true)).listen(8100, () => console.log('con CSP  → http://localhost:8100'));
