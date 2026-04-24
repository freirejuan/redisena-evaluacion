# Downloads · Piezas descargables del kit

Este directorio contiene las piezas descargables servidas desde la web. Las URLs referenciadas desde los HTML son `/downloads/sprint-X/nombre-pieza.ext`.

**Licencia.** Los contenidos de este directorio se distribuyen bajo [CC BY-SA 4.0](../LICENSE-CONTENT.md) (atribución a Eutika · [eutika.com](https://eutika.com/) · compartir igual). Ver `LICENSE-CONTENT.md` en la raíz del repo para el texto completo.

**Fuente canónica.** A partir del 22 abr 2026, las versiones canónicas de estas piezas viven aquí. Las carpetas `Resultados/Sprint_V0/` y `Resultados/Sprint_V1/` quedan como histórico del proceso de diseño — ya no se editan. Cualquier corrección o iteración futura se hace sobre los archivos de este directorio.

---

## Inventario actual

### Sprint 0 · Decisiones estratégicas

| Archivo | Tipo | Estado | Descripción |
|---|---|---|---|
| `sprint-0/plantilla-estrategica.html` | HTML autocontenido | disponible | Pieza principal. Cinco bloques, Canvas + Blueprint 0 auto-generados. |
| `sprint-0/guia-estrategica.html` | HTML | disponible | Marco conceptual: D1–D4, C1–C7, arquetipos, estados de cierre. |
| `sprint-0/mini-guia-pretrabajo.html` | HTML autocontenido | disponible | Encuadre breve antes de abrir la plantilla. |

### Sprint 1 · Plan de acción detallado

| Archivo | Tipo | Estado | Descripción |
|---|---|---|---|
| `sprint-1/plantilla-plan-operativo.xlsx` | XLSX 11 hojas | disponible | Pieza principal. Declaración de touchpoints, T1–T9, cuatro fases, dos escenarios, tres lentes. |
| `sprint-1/plantilla-ejemplo-ingesoft.xlsx` | XLSX pre-rellenado | disponible | Caso Ingeniería del Software completo, para ver la plantilla en funcionamiento. |
| `sprint-1/guia-breve.html` | HTML autocontenido | disponible | Guía breve de uso — léela antes que nada. Navegable con índice. |
| `sprint-1/walkthrough.html` | HTML autocontenido | disponible | Walkthrough guiado hoja por hoja (guion 5-7 min sobre el ejemplo IngeSoft). |
| `sprint-1/panel-plan-operativo.html` | HTML interactivo (SheetJS) | disponible | Panel web que lee la Plantilla XLSX y genera Blueprint + Calendario semanal. Arranca con ejemplo IngeSoft; upload por botón o drag-and-drop; persistencia en localStorage. |

### Sprint 2 · Pilotaje

_Próximamente · septiembre 2026. Piezas por definir durante el verano de 2026._

---

## Convenciones de archivo

- **Minúsculas, sin tildes, guiones como separador.** `plantilla-estrategica.html`, no `Plantilla-Estratégica.html`.
- **Nombre descriptivo del contenido**, no del sprint (el sprint ya está en la carpeta).
- **Sin versión en el nombre público.** El versionado es interno y vive en git. La pieza se llama `guia-estrategica.html`, no `guia-estrategica-v4.html`.
- **Extensión honesta.** `.xlsx` para Excel; `.html` solo si es navegable; `.pdf` para lectura / impresión.

---

## Cómo actualizar una pieza

1. Edita directamente el archivo en `downloads/sprint-X/`. Este directorio es la fuente de verdad; no hay versiones paralelas en `Resultados/` que haya que mantener sincronizadas.
2. Si la pieza viene de un origen `.docx` o `.html` que quieres conservar editable, mantén el fuente en `Resultados/` y regenera el PDF con:
   - HTML → PDF: `libreoffice --headless --convert-to pdf archivo.html`
   - DOCX → PDF: `libreoffice --headless --convert-to pdf archivo.docx`
3. Si el nombre cambia, actualiza los enlaces en los HTML correspondientes (`sprint-X.html`, `kit.html`, `documentacion.html`) y este README.
4. Commit + push. Cloudflare Pages redeploya en menos de un minuto.

---

## Orígenes históricos (no editar)

Referencia para trazar de dónde salió cada pieza. Estos archivos en `Resultados/` quedan congelados; si una pieza de ahí necesita una corrección menor, se hace sobre la copia en `downloads/` directamente.

| Pieza en `downloads/` | Origen en `Resultados/` |
|---|---|
| `sprint-0/plantilla-estrategica.html` | `Sprint_V0/Plantilla_estrategica_v3.html` |
| `sprint-0/guia-estrategica.html` | `Sprint_V0/Guia_estrategica_v4.html` |
| `sprint-0/mini-guia-pretrabajo.html` | `Sprint_V0/Mini_guia_pretrabajo.html` (copia directa) |
| `sprint-1/plantilla-plan-operativo.xlsx` | `Sprint_V1/Plantilla_plan_operativo_v2.xlsx` |
| `sprint-1/plantilla-ejemplo-ingesoft.xlsx` | `Sprint_V1/Kit_onboarding/Plantilla_EJEMPLO_IngeSoft.xlsx` |
| `sprint-1/guia-breve.html` | `Sprint_V1/Kit_onboarding/Guia_uso_plantilla_v1_1.docx` (maquetado con sistema de diseño) |
| `sprint-1/walkthrough.html` | `Sprint_V1/Kit_onboarding/Walkthrough_plantilla_v1_1.docx` (maquetado con sistema de diseño) |
| `sprint-1/panel-plan-operativo.html` | Pieza nativa de la web (2026-04-22). Reemplaza a las antiguas `Sprint_V1/Blueprint_completo.html`, `Sprint_V1/Blueprint_completo.pdf` y `Sprint_V1/Plantilla_calendario_semanal_v1.xlsx`, ahora retiradas. |

---

## Tamaños orientativos

- HTMLs autocontenidos: 30–500 KB. (Hoy: Plantilla estratégica ≈ 133 KB, Guía estratégica ≈ 65 KB, Panel del plan operativo ≈ 43 KB.)
- XLSX: 15–70 KB.
- PDFs: 95–300 KB.

Si un archivo pasa de 5 MB, conviene revisar si se puede aligerar antes de subirlo.
