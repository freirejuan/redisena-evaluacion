# Pruebas del kit

Batería de comprobación del sitio y de las piezas descargables. **No es un test unitario de nada: es lo que impide que vuelvan los fallos que ya han aparecido una vez.** Cada suite se escribió a raíz de un problema real; el nombre de cada comprobación dice qué se rompió.

## Cómo se ejecuta

Hacen falta Node 18 o superior y un navegador de Playwright.

```
cd pruebas
npm install
npx playwright install chromium
```

En una terminal, el servidor. Levanta dos puertos sobre la raíz del repositorio: el 8099 sirve el sitio tal cual y el 8100 añade la `Content-Security-Policy` real de producción, que ningún servidor local lee de `_headers`:

```
npm run servidor
```

En otra, la batería completa:

```
npm run todo
```

Devuelve 1 si algo falla, así que sirve tal cual en un gancho de pre-push o en integración continua. Una suite suelta se ejecuta con `node <fichero>.js`.

## Qué comprueba cada suite

**Accesibilidad y forma**

| Suite | Qué vigila |
| :-- | :-- |
| `axe-todo.js` | `axe-core` sobre las quince piezas, reglas WCAG 2.0 A/AA, 2.1 A/AA y buenas prácticas. El listón es **cero incumplimientos**. |
| `axe-vistas.js` | Lo mismo, pero sobre las vistas que sólo existen cuando se usan: Canvas, Blueprint, Comparar, la galería abierta y las dos lentes del calendario. Ahí estaba escondida la mitad de los problemas. |
| `desborde.js` | Que a 360 px no se recorte texto de forma irrecuperable ni se desplace la página a lo ancho. |
| `a11y.js` | Enlace de salto, barra de progreso expuesta como tal, anuncios de los cambios, pasos bloqueados declarados, deslizadores con etiqueta y valor. |
| `teclado.js` | Que los botones repetidos se distingan entre sí, que los desplegables digan si están abiertos y a qué, que el foco no se pierda al eliminar y que los grupos de opciones tengan nombre. |
| `impresion-capas.js` | Que al imprimir se abran los apartados plegados —el navegador no lo hace solo y se perdía hasta el 65 % del texto— y que sin JavaScript no queden cajas vacías. |
| `desfase.js` | **Que el HTML y sus assets no se hayan desincronizado.** `/assets/*` se sirve con caché de un año e `immutable`; si se cambia una hoja o un script sin renombrarlo, el HTML nuevo llega a todo el mundo y el asset viejo se queda. Comprueba que ninguna página dependa de una clase que su hoja no define ni de una función que su script no trae, y que el enlace de salto y el texto de lector de pantalla se comporten como deben. Va la primera de la batería porque cuando falla, falla todo lo demás por debajo. |

**Comportamiento**

| Suite | Qué vigila |
| :-- | :-- |
| `prueba.js` | La web: marcar pasos, desbloqueos, progreso, portada de vuelta, exportar e importar. |
| `plantilla.js` · `escenarios.js` · `galeria.js` | La Plantilla estratégica: touchpoints, duplicar, semáforo, escenarios múltiples, comparación y asignaturas de ejemplo. |
| `panel.js` · `subida.js` · `panel-errores.js` | El Panel: reparto semanal sin perder horas, lectura del XLSX y recuperación de errores. |
| `perdida.js` · `auditoria-fix.js` · `migracion.js` · `estados.js` | Las cinco vías por las que se perdía trabajo, la migración de la clave antigua y los estados guardados incoherentes. |
| `umbrales.js` · `impresion.js` | Los umbrales 40/70 y su explicación en pantalla; las vistas de impresión. |
| `capas.js` · `guiado.js` | Las capas de información y el guiado del siguiente paso. |
| `cuaderno.js` · `cuaderno2.js` · `sprint2.js` | El Cuaderno de pilotaje, su informe generado, la carga de la Plantilla del Sprint 1 y la página del Sprint 2. |

**Privacidad**

| Suite | Qué vigila |
| :-- | :-- |
| `externas.js` | Que ninguna de las quince piezas contacte con un dominio ajeno. El listón es **cero**. |
| `csp.js` | Que con la `Content-Security-Policy` real puesta no se rompa nada propio: tipografías, SheetJS, guardado y descargas. |
| `enlaces.js` | Que todos los enlaces internos y todas las anclas resuelvan. |

## Convenciones

- **Los mensajes van en castellano y describen el comportamiento, no la implementación.** «el quiz semanal ya no apila 60 h en una semana» dice más que «distributeDocenteWeeks devuelve el array esperado».
- Las peticiones a `fonts.googleapis.com` y `fonts.gstatic.com` se abortan en cada contexto: en el contenedor de pruebas no hay red, y esperar por ellas bloquea la carga.
- Nada se escribe fuera de `pruebas/_tmp/`, que está ignorado por git.
- Para sembrar `localStorage` hay que hacerlo **desde otra página del mismo origen** y navegar después: si se siembra con la pieza ya cargada, su guardado de `pagehide` escribe encima al recargar y la prueba mide otra cosa.
