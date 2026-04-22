# Rediseña.Evaluacion

Web pública del kit guiado para rediseñar la evaluación de asignaturas universitarias. Un kit de **[Eutika](https://eutika.com/)**, desarrollado como contribución extra al **Plan IMPULSO Docente de la Universidad Carlos III de Madrid · Ruta 3**. Diseñado para ser reutilizable en otras universidades — publicado con licencia abierta (CC BY-SA 4.0 para contenidos, MIT para código).

URL de producción (provisional): `https://redisena-evaluacion.pages.dev`

---

## Qué es esto

Ocho páginas HTML estáticas con URLs limpias, estado en `localStorage`, y sin backend. Cuatro bloques de contenido:

- **Inicio** — carta de presentación con variante de primera visita vs. visita recurrente.
- **El proceso** — visión de conjunto de los tres sprints.
- **Sprints 0, 1 y 2** — páginas de trabajo con pasos, checkboxes y piezas descargables.
- **Kit, Referencia, Acerca** — biblioteca, glosario/FAQ y contexto del proyecto.

---

## Stack

- HTML estático, servido por Cloudflare Pages.
- CSS y JS compartidos en `assets/`.
- Sin framework, sin build step, sin dependencias de runtime.
- Fuentes desde Google Fonts (Inter, Source Serif 4, JetBrains Mono).
- Estado del usuario en `localStorage` (`redisena_evaluacion`), exportable como JSON.

Detalle completo en [DECISIONES_TECNICAS.md](./DECISIONES_TECNICAS.md).

---

## Estructura del repo

```
.
├── README.md                    Este archivo
├── LICENSE                      Licencia del código (MIT)
├── LICENSE-CONTENT.md           Licencia de los contenidos (CC BY-SA 4.0)
├── DECISIONES_TECNICAS.md       Stack, modelo de estado, deploy, convenciones
│
├── index.html                   Inicio
├── proceso.html                 El proceso en tres sprints
├── sprint-0.html                Sprint 0 · Decisiones estratégicas
├── sprint-1.html                Sprint 1 · Plan de acción
├── sprint-2.html                Sprint 2 · Pilotaje (próximamente)
├── kit.html                     Kit de herramientas
├── referencia.html              Glosario y FAQ
├── acerca.html                  Sobre el proyecto
│
├── assets/
│   ├── css/styles.css           Sistema de Diseño UC3M IMPULSO
│   └── js/
│       ├── app.js               Estado, localStorage, interacciones
│       └── demo-controls.js     Panel de simulación (retirar en producción)
│
├── downloads/                   Piezas descargables del kit, por sprint
│
├── _headers                     Caché + seguridad (Cloudflare Pages)
├── _redirects                   URLs limpias sin .html
└── .gitignore
```

---

## Desarrollo local

No hay build. Abre los HTML directamente en el navegador, o sirve la carpeta con cualquier servidor estático:

```bash
# Python 3
python3 -m http.server 8080

# Node (si tienes npx)
npx serve -l 8080 .

# PHP
php -S localhost:8080
```

Luego visita `http://localhost:8080`. Las URLs limpias (`/proceso`, `/sprint-0`, etc.) **no funcionan en servidores estáticos locales** — ahí hay que usar `/proceso.html`. El rewrite lo hace Cloudflare Pages en producción vía `_redirects`.

Para probar el estado de `localStorage` en distintos momentos del profesor, el panel *Simular estado del profesor* (abajo-derecha) permite saltar entre escenarios. Ese panel se retira antes de publicar (lo controla `demo-controls.js`).

---

## Deploy

GitHub → Cloudflare Pages, conexión Git. Cada push a `main` dispara deploy automático.

**Build settings en Cloudflare Pages:**

- Framework preset: *None*
- Build command: *vacío*
- Build output directory: `/`
- Root directory: `/` (o `/web` si el scaffold está en subcarpeta del repo)
- Environment variables: ninguna

Cada pull request genera un preview en URL temporal. El dominio definitivo se conecta en *Custom domains* de Cloudflare Pages.

Detalle completo: [DECISIONES_TECNICAS.md § 5](./DECISIONES_TECNICAS.md).

---

## Pendientes antes de publicar en producción

- [ ] Retirar el panel *Simular estado del profesor* (eliminar `demo-controls.js` de cada página o dejarlo solo tras un feature flag).
- [ ] Poblar `downloads/` con las piezas reales (hoy hay README con inventario).
- [ ] Conectar el botón de reserva de sesión 1:1 (Cal.com / Calendly).
- [ ] Decidir analytics (Cloudflare Web Analytics o Plausible).
- [ ] Auditoría Lighthouse + axe.

---

## Licencia

Este repositorio combina dos licencias complementarias según la naturaleza del material:

- **Código** (HTML, CSS, JavaScript del prototipo web) — [MIT License](./LICENSE).
- **Contenidos** (guías, plantillas, blueprint, documentación, textos, mini-guías, walkthroughs y cualquier material didáctico o conceptual) — [Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)](./LICENSE-CONTENT.md).

Ambas permiten **uso, modificación y redistribución** — incluso con fines comerciales — siempre que:

1. Se dé **atribución a Eutika** (<https://eutika.com/>) como autor original, indicando que el kit fue desarrollado como contribución al Plan IMPULSO Docente UC3M.
2. Para los **contenidos**, las obras derivadas se compartan bajo la misma licencia CC BY-SA 4.0.
3. Se indiquen los cambios introducidos respecto al original.

Atribución sugerida:

> *"Basado en Rediseña.Evaluacion, kit desarrollado por Eutika (eutika.com) como contribución al Plan IMPULSO Docente de la Universidad Carlos III de Madrid. Publicado bajo CC BY-SA 4.0."*

Las **marcas y logotipos** ("Rediseña.Evaluacion", "Eutika", "Plan IMPULSO", "UC3M") y el **UC3M IMPULSO Design System** quedan fuera del alcance de estas licencias y requieren autorización específica de sus titulares.

---

## Contacto

**Autor y responsable:** [Eutika](https://eutika.com/) · Juan Freire · [juan@eutika.com](mailto:juan@eutika.com)
