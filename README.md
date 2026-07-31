# Rediseña.Evaluacion

Web pública del kit guiado para rediseñar la evaluación de asignaturas universitarias. Un kit de **[Eutika](https://eutika.com/)**, diseñado para ser reutilizable en cualquier universidad — publicado con licencia abierta (CC BY-SA 4.0 para contenidos, MIT para código).

URL de producción (provisional): `https://redisena-evaluacion.pages.dev`

---

## Qué es esto

Ocho páginas HTML estáticas con URLs limpias, estado en `localStorage`, y sin backend. Cuatro bloques de contenido:

- **Inicio** — carta de presentación con variante de primera visita vs. visita recurrente.
- **El proceso** — visión de conjunto de los tres sprints.
- **Sprints 0, 1 y 2** — páginas de trabajo con pasos, checkboxes y piezas descargables.
- **Kit, Documentación, Acerca** — biblioteca, glosario/FAQ y contexto del proyecto.

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
├── sprint-2.html                Sprint 2 · Pilotaje (desde septiembre de 2026)
├── kit.html                     Kit de herramientas
├── documentacion.html           Glosario y FAQ
├── acerca.html                  Sobre el proyecto
│
├── assets/
│   ├── css/styles.v2.css        Sistema de Diseño UC3M IMPULSO
│   └── js/app.v2.js             Estado, localStorage, interacciones
│
├── downloads/                   Piezas descargables del kit, por sprint
│
├── _headers                     Caché + seguridad (Cloudflare Pages)
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

Luego visita `http://localhost:8080`. En local hay que escribir la URL con extensión (`/proceso.html`); en producción, Cloudflare Pages canonicaliza automáticamente y `/proceso` sirve `proceso.html` (sin necesidad de `_redirects`).

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

Verificado contra el código el 31 de julio de 2026. Lo que sigue abierto:

- [ ] **Publicar las piezas del Sprint 2** en `downloads/sprint-2/`. Las de los sprints 0 y 1 ya están.
- [ ] **Decidir qué se hace con la reserva de sesión 1:1.** Hoy no existe ni el botón ni la integración, y conviene decidir antes si tiene sitio en un kit reutilizable o si es acompañamiento propio de cada implantación.
- [ ] **Auditoría de accesibilidad y rendimiento** (Lighthouse + axe). Los pasos marcables ya son operables con teclado; falta pasar la revisión completa.

Resueltos:

- [x] ~~Retirar el panel *Simular estado del profesor*~~ — no existe en el código: ni el panel ni `demo-controls.js`. El pendiente estaba caducado.
- [x] ~~Poblar `downloads/` con las piezas reales~~ — poblado para los sprints 0 y 1 desde el 22 de abril de 2026, y es la fuente canónica de las piezas.
- [x] ~~Decidir analytics~~ — **decidido: sin analítica ni telemetría.** La promesa del kit es anonimato total para el profesor; el estado vive en su navegador y se exporta como JSON que él controla. Revisable en el futuro, no pendiente de resolver.

---

## Licencia

Este repositorio combina dos licencias complementarias según la naturaleza del material:

- **Código** (HTML, CSS, JavaScript del prototipo web) — [MIT License](./LICENSE).
- **Contenidos** (guías, plantillas, blueprint, documentación, textos, mini-guías, walkthroughs y cualquier material didáctico o conceptual) — [Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)](./LICENSE-CONTENT.md).

Ambas permiten **uso, modificación y redistribución** — incluso con fines comerciales — siempre que:

1. Se dé **atribución a Eutika** (<https://eutika.com/>) como autor original.
2. Para los **contenidos**, las obras derivadas se compartan bajo la misma licencia CC BY-SA 4.0.
3. Se indiquen los cambios introducidos respecto al original.

Atribución sugerida:

> *"Basado en Rediseña.Evaluacion, kit desarrollado por Eutika (eutika.com). Publicado bajo CC BY-SA 4.0."*

Las **marcas y logotipos** ("Rediseña.Evaluacion", "Eutika") quedan fuera del alcance de estas licencias y requieren autorización específica de sus titulares.

---

## Contacto

**Autor y responsable:** [Eutika](https://eutika.com/) · Juan Freire · [juan@eutika.com](mailto:juan@eutika.com)
