#!/bin/bash
# Batería completa. Devuelve 1 si algo falla.
# Requiere el servidor levantado en otra terminal:  npm run servidor
cd "$(dirname "$0")"
FALLOS=0
SUITES="desfase.js axe-todo.js axe-vistas.js desborde.js enlaces.js capas.js guiado.js a11y.js teclado.js \
         prueba.js plantilla.js panel.js escenarios.js galeria.js subida.js perdida.js umbrales.js \
         impresion.js auditoria-fix.js panel-errores.js migracion.js estados.js impresion-capas.js \
         csp.js externas.js cuaderno.js cuaderno2.js sprint2.js fichero.js"
for t in $SUITES; do
  [ -f "$t" ] || continue
  printf '%-22s ' "$t"
  timeout 250 node "$t" > _tmp/_salida.txt 2>&1
  c=$?
  v=$(grep -c '✓' _tmp/_salida.txt)
  if [ $c -ne 0 ]; then
    echo "✗ FALLA"
    grep -E '✗' _tmp/_salida.txt | head -6
    FALLOS=1
  else
    echo "ok · $v comprobaciones"
  fi
done
exit $FALLOS
