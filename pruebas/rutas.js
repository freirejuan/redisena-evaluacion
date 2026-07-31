// Las dos rutas que necesitan las pruebas: la raíz del sitio y una carpeta
// temporal donde dejar descargas y capturas. Se resuelven a partir de este
// fichero, así que el repositorio puede vivir en cualquier sitio.
const path = require('path');
const fs = require('fs');
const RAIZ = path.join(__dirname, '..');
const TMP = path.join(__dirname, '_tmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
module.exports = { RAIZ, TMP };
