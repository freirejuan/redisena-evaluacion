# Decisiones técnicas · Rediseña.Evaluacion

Este documento registra las decisiones técnicas del prototipo web, con su justificación. Sirve como referencia para las siguientes iteraciones y para cualquiera que herede el código.

---

## 1 · Stack

**HTML estático servido por Cloudflare Pages.** Sin framework, sin build step, sin dependencias de runtime.

- 8 páginas HTML independientes con URLs reales (`/`, `/proceso`, `/sprint-0`, etc.)
- CSS y JS compartidos en `assets/`, cacheados agresivamente
- Estado del usuario en `localStorage`, exportable como JSON
- Deploy automático desde un repositorio Git (GitHub → Cloudflare Pages)

**Por qué no un Static Site Generator (Astro, Eleventy, Hugo).** Para 8 páginas con contenido relativamente estable y dos personas editando, el coste cognitivo y operativo de un SSG supera su beneficio. Si en el futuro el contenido crece a >20 páginas, o se añade un blog, o se quiere escribir en Markdown, migrar a Astro es directo (los HTML actuales se vuelven templates).

**Por qué no un framework (Next.js, SvelteKit).** No hay componentes interactivos complejos. El estado es simple (localStorage, sin servidor). Un framework añade build complexity, dependencias que envejecen, y un runtime que no necesitamos.

**Por qué HTML estático y no un SPA.** Queremos URLs compartibles (`/sprint-0` en vez de `/#sprint-0`), primera carga rápida (una página pesa lo que pesa su HTML, no todo el sitio), y que sea editable sin herramientas especiales. Una persona que sepa HTML puede modificar el sitio sin levantar un entorno de desarrollo.

---

## 2 · Estructura del repositorio

```
redisena-evaluacion/
├── README.md                    Instrucciones de setup y deploy
├── DECISIONES_TECNICAS.md       Este documento
│
├── index.html                   Inicio
├── proceso.html                 El proceso en tres sprints
├── sprint-0.html                Sprint 0 · Decisiones estratégicas
├── sprint-1.html                Sprint 1 · Plan de acción
├── sprint-2.html                Sprint 2 · Pilotaje
├── kit.html                     Kit de herramientas
├── referencia.html              Referencia (glosario, FAQ)
├── acerca.html                  Acerca del proyecto
│
├── assets/
│   ├── css/
│   │   └── styles.css           Sistema de Diseño UC3M IMPULSO
│   └── js/
│       ├── app.js               Estado, localStorage, inicialización
│       └── demo-controls.js     Panel de simulación (retirar en producción)
│
├── downloads/                   Piezas descargables del kit
│   ├── README.md                Inventario + convenciones de archivo
│   ├── sprint-0/
│   │   ├── plantilla-estrategica.html
│   │   ├── guia-estrategica.html
│   │   └── mini-guia-pretrabajo.html
│   └── sprint-1/
│       ├── plantilla-plan-operativo.xlsx
│       ├── plantilla-ejemplo-ingesoft.xlsx
│       ├── guia-breve.html
│       ├── walkthrough.html
│       └── panel-plan-operativo.html  (lee XLSX con SheetJS, genera Blueprint + Calendario)
│
├── _headers                     Headers HTTP (caché, seguridad)
├── _redirects                   Redirecciones y URLs limpias
└── .gitignore
```

**La raíz del repo es la raíz del sitio.** Cloudflare Pages sirve todo lo que hay en la raíz. No hay carpeta `dist/` ni `public/`.

---

## 3 · Modelo de estado en localStorage

Una sola clave, un solo objeto JSON. Simple de razonar, simple de exportar.

**Clave:** `redisena_evaluacion`

**Forma del objeto:**

```json
{
  "schema_version": 1,
  "asignatura": {
    "nombre": "Ingeniería del Software",
    "codigo": "",
    "curso": "",
    "ects": 6,
    "estudiantes": 60
  },
  "sprints": {
    "sprint_0": {
      "estado": "en_progreso",
      "pasos_completados": ["paso_1", "paso_2"],
      "completado_en": null
    },
    "sprint_1": {
      "estado": "bloqueado",
      "pasos_completados": [],
      "completado_en": null
    },
    "sprint_2": {
      "estado": "proximamente",
      "pasos_completados": [],
      "completado_en": null
    }
  },
  "creado_en": "2026-04-21T10:00:00Z",
  "actualizado_en": "2026-04-22T14:30:00Z",
  "ultima_visita": "2026-04-22T14:30:00Z"
}
```

**Estados posibles de cada sprint:**

| Estado | Significado |
|---|---|
| `sin_iniciar` | Aún no se ha tocado ningún paso |
| `en_progreso` | Hay al menos un paso marcado, falta el último |
| `completado` | Todos los pasos marcados y cierre hecho |
| `bloqueado` | Requiere cerrar el sprint anterior primero |
| `proximamente` | No disponible todavía (Sprint 2 hasta sep 2026) |

**Reglas de transición:**

- Sprint 0 arranca en `sin_iniciar` al crear asignatura.
- Sprint 1 arranca en `bloqueado`; pasa a `sin_iniciar` cuando Sprint 0 llega a `completado`.
- Sprint 2 permanece en `proximamente` hasta la release de septiembre 2026.

**Export / import.** El usuario puede descargar el objeto completo como archivo JSON (`asignatura-YYYYMMDD.json`) o importar uno previamente exportado. Este es el único mecanismo de portabilidad entre navegadores o máquinas.

**Versionado del schema.** El campo `schema_version` permite migrar estados antiguos cuando la estructura cambie. Todas las lecturas verifican el schema antes de usarlo; si el schema es superior al soportado, se muestra un aviso. Si es inferior, se migra en memoria.

---

## 3-bis · Panel del plan operativo (opción 3 híbrida A)

**Decisión (2026-04-22).** El Blueprint y el Calendario semanal dejan de ser piezas estáticas y pasan a ser <em>vistas derivadas</em> de la Plantilla del plan operativo, generadas en cliente por el Panel (`downloads/sprint-1/panel-plan-operativo.html`). El profesor mantiene una sola fuente de verdad (la Plantilla XLSX) y sube el archivo al Panel para obtener las vistas.

**Por qué esta forma.** Antes el profesor tenía que mantener tres ficheros sincronizados a mano (Plantilla, Blueprint consultivo, Calendario manual). Eso genera fricción y rompe la trazabilidad. La opción 3 híbrida A mantiene el XLSX como formato de edición — porque a los profesores les gusta trabajar en hojas de cálculo y quieren una copia local de todo — pero elimina el doble volcado, generando Blueprint y Calendario en vivo en el navegador.

**Arquitectura.**
- **Fuente única:** `plantilla-plan-operativo.xlsx`, con dos hojas clave — `Parámetros` (pares clave/valor) y `Touchpoints` (datos a partir de fila 5, 32 columnas).
- **Parser:** SheetJS (`xlsx.full.min.js`) cargado desde `cdnjs.cloudflare.com`. Lee el workbook en el navegador, sin servidor.
- **Estado:** `localStorage` clave `redisena_evaluacion_panel_v1`, `schema_version: 1`. Independiente del estado general (`redisena_evaluacion`) porque persiste contenido de trabajo, no progreso de ruta.
- **Estado inicial:** ejemplo IngeSoft embebido en el HTML, precargado en la primera visita para que el profesor vea una página poblada desde el primer clic.
- **UX de carga:** botón "Subir mi Plantilla XLSX" + drag-and-drop sobre la página. "Volver al ejemplo" con `confirm()` antes de sobrescribir.
- **Vistas generadas:** Blueprint (matriz touchpoint × 6 filas: cuándo, responsable, carga docente base→IA, carga estudiante, política IA, prácticas IA) y Calendario (heatmap `grid-template-columns: 200px repeat(var(--week-count), minmax(46px, 1fr))`, 5 niveles de color).
- **Distribución semanal del estudiante.** Regla realista para evitar el pico artificial de la Lente 2 del XLSX: puntuales distribuyen 50% en `sem_fin`, 30% en `sem_fin-1`, 20% en `sem_fin-2`; series distribuyen ocurrencias uniformemente entre `sem_ini` y `sem_fin`.
- **Cálculo de carga docente.** `h_base_total = diseño + ejec·ocurrencias + (corr+fback)·ocurrencias·estudiantes`. El escenario IA usa el mismo patrón con `h_ia` cuando está presente, o cae al `h_base` correspondiente.

**Qué queda fuera por ahora.** El Panel no escribe en el XLSX — es solo lectura. La exportación del estado (JSON del Panel) está preparada en el schema pero no expuesta en UI todavía. La edición de touchpoints sigue haciéndose en el XLSX.

---

## 4 · Convenciones de código

**HTML.**
- Indentación: 2 espacios.
- Encoding: UTF-8.
- Lang: `es` en `<html>`.
- Cada página tiene `<title>` único y `<meta name="description">` (para futuro SEO).
- La clase `active` en el link de nav se hardcodea en cada archivo.

**CSS.**
- Un único archivo `styles.css` con todos los tokens y componentes del Sistema UC3M IMPULSO.
- Variables CSS (custom properties) para tokens — la paleta, la tipografía, el espaciado, los radios y las sombras.
- Sin preprocesador. Sin build.
- Nomenclatura de clases: BEM ligero (`.card`, `.card-linkable`, `.card.with-accent`).

**JavaScript.**
- Vanilla ES2020+. Sin bundler, sin TypeScript por ahora.
- Dos archivos: `app.js` (producción) y `demo-controls.js` (solo durante prototipado).
- Módulos por convención: funciones en el scope global con prefijo semántico (`state_*`, `ui_*`, `sprint_*`).
- Sin dependencias externas. Si más adelante hace falta una utilidad concreta, se incluye como archivo local, no por CDN.

**Archivos descargables.**
- Convenio de nombres: `{tipo}-{nombre}.{ext}` en minúsculas, sin tildes, guiones como separador.
- Ejemplo: `plantilla-estrategica.html`, `panel-plan-operativo.html`.
- Organizados por sprint en subcarpetas de `downloads/`.

---

## 5 · Deploy

**GitHub → Cloudflare Pages, conexión Git.**

Flujo:

1. El repositorio vive en GitHub (cuenta personal o de UC3M — decidir al crear).
2. Cloudflare Pages se conecta al repo vía OAuth.
3. Cada push a la rama `main` dispara un deploy automático.
4. Pull requests generan previews automáticas en URL temporal (`pr-XX.redisena-evaluacion.pages.dev`).
5. La rama `main` es la production URL (`redisena-evaluacion.pages.dev` por defecto; cambia cuando se conecte el dominio).

**Build settings en Cloudflare Pages:**

- Framework preset: *None*
- Build command: *vacío* (no hay build step)
- Build output directory: `/` (la raíz del repo)
- Root directory: `/` (si el scaffold está en la raíz) o `/web` (si está en subcarpeta)
- Environment variables: ninguna por ahora

**Tiempo de deploy esperado:** <30 segundos por push (no hay build).

**URL provisional durante el prototipo:** `https://redisena-evaluacion.pages.dev` (gratuita, asignada por Cloudflare). Cuando Juan conecte el dominio definitivo, se añade en *Custom domains* dentro del proyecto de Cloudflare Pages.

---

## 6 · Headers HTTP y caché

Archivo `_headers` en la raíz — Cloudflare Pages lo interpreta automáticamente.

```
# HTML: caché corta, permite updates rápidos
/*.html
  Cache-Control: public, max-age=300, must-revalidate

# Assets estáticos: caché larga + immutable
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Downloads: caché moderada
/downloads/*
  Cache-Control: public, max-age=86400

# Seguridad base para todo el sitio
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
```

Cuando se publique una nueva versión de un asset, se cambia su nombre (e.g. `styles.v2.css`) para bust de caché. Por ahora basta con `styles.css` — es un prototipo y el volumen de tráfico no lo exige.

---

## 7 · URLs limpias

Archivo `_redirects` en la raíz para que las URLs no terminen en `.html`.

```
# URLs limpias
/proceso        /proceso.html       200
/sprint-0       /sprint-0.html      200
/sprint-1       /sprint-1.html      200
/sprint-2       /sprint-2.html      200
/kit            /kit.html           200
/referencia     /referencia.html    200
/acerca         /acerca.html        200
```

El código 200 (no 301) hace rewrite sin cambiar la URL visible. El usuario ve `/proceso`, el servidor devuelve `proceso.html`.

---

## 8 · Accesibilidad mínima

Para esta primera iteración:

- Contraste WCAG AA en todos los textos de UI (el sistema UC3M IMPULSO cumple por diseño).
- Jerarquía de headings correcta (un solo `<h1>` por página, h2 debajo, h3 para sub-bloques).
- Todas las imágenes llevan `alt` descriptivo.
- Formularios y botones tienen labels programáticos.
- Navegación por teclado funcional (no hay trampas de focus).
- `lang="es"` declarado en la raíz.

Auditoría pendiente: lighthouse + axe al cierre del prototipo.

---

## 9 · Lo que queda fuera de esta iteración

Explicitado para no olvidarlo, no para hacerlo ahora.

- **Analytics.** Decidir si se instala Cloudflare Web Analytics (nativo, sin cookies) o Plausible.
- **Multi-asignatura.** Hoy una por navegador; abrir soporte para varias requiere cambiar el modelo de estado.
- **Reserva de sesión 1:1.** Enlazar a Cal.com / Calendly del lead.
- **Modo colaborativo.** Compartir una asignatura entre varios profesores de la misma materia.
- **Exportación de Blueprint/Canvas como PDF desde la web.** Hoy se hace dentro de las plantillas.
- **Internacionalización.** Todo está en español. El kit está diseñado para ser traducible, pero no hay infra de i18n por ahora.
- **Autenticación.** No hay y no habrá en este prototipo. Si en el futuro se quiere sincronizar entre dispositivos, hay que replantear el modelo de estado.
