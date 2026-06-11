# Sitio web del Consejo Estatal de Bordadoras Mayas de Yucatán

Sitio institucional y catálogo de piezas del Consejo Estatal de Bordadoras Mayas de Yucatán, organización conformada por mujeres bordadoras de comunidades mayas que salvaguardan, protegen y transmiten el bordado tradicional yucateco, reconocido como Patrimonio Cultural Inmaterial.

**Sitio en vivo:** [unescomexico.github.io/consejo-bordadoras-yucatan](https://unescomexico.github.io/consejo-bordadoras-yucatan/)

## Sobre este proyecto

Este sitio se construyó bajo tres principios:

1. **Sostenibilidad técnica.** Sitio estático en HTML, CSS y JavaScript sin frameworks ni dependencias de build. Cero `npm install`. El navegador del 2030 lo seguirá leyendo igual que el de hoy.

2. **Autonomía de las bordadoras.** El catálogo de piezas vive en una hoja de Google Sheets que la coordinadora del Consejo administra directamente. Las fotos viven en una carpeta de Google Drive. El sitio se actualiza automáticamente cuando hay cambios en la hoja.

3. **Sin costos recurrentes.** Hospedaje gratuito permanente en GitHub Pages. La única inversión opcional sería un dominio propio (~15 USD/año).

## Cómo funciona

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Google Sheets   │ ──CSV── │  Sitio estático  │ ──URL── │  Visitante       │
│  (catálogo)      │         │  (GitHub Pages)  │         │  (cualquier      │
│                  │         │                  │         │  navegador)      │
└──────────────────┘         └──────────────────┘         └──────────────────┘
       ▲                              │
       │                              │ Botón "Comprar"
       │ Edita la                     ▼
       │ coordinadora             ┌──────────────────┐
       │                          │  WhatsApp con    │
                                  │  la bordadora    │
                                  └──────────────────┘
```

La coordinadora edita la hoja → el sitio lee el CSV publicado → cuando un visitante quiere comprar, el botón abre WhatsApp directamente con la bordadora correspondiente.

## Estructura del repositorio

```
consejo-bordadoras-yucatan/
├── index.html                    Página de Inicio
├── quienes-somos.html            (en construcción)
├── bordadoras.html               (en construcción)
├── catalogo.html                 (en construcción)
├── tecnicas.html                 (en construcción)
├── contacto.html                 (en construcción)
│
├── assets/
│   ├── css/
│   │   ├── base.css              Sistema de diseño: variables, reset, tipografía
│   │   ├── componentes.css       Componentes reutilizables (header, botones, tarjetas, footer)
│   │   └── inicio.css            Estilos específicos de la página de Inicio
│   │
│   ├── js/
│   │   ├── config.js             Configuración central (URLs de Sheets, ajustes)
│   │   ├── csv-parser.js         Parser de CSV ligero
│   │   ├── catalogo.js           Carga, filtra y normaliza productos
│   │   └── inicio.js             Lógica de la página de Inicio
│   │
│   └── img/
│       └── logo-consejo.png      Logotipo del Consejo
│
├── README.md                     Este archivo
├── MANUAL_DESARROLLADOR.md       Documentación técnica para desarrolladores
└── LICENSE                       Licencia (CC BY-SA 4.0 contenido + MIT código)
```

## Stack técnico

- **HTML5** semántico
- **CSS** moderno (custom properties, grid, flexbox, clamp)
- **JavaScript** vanilla con módulos ES6 (sin frameworks)
- **Google Sheets** como base de datos del catálogo
- **Google Drive** como repositorio de imágenes
- **GitHub Pages** como hosting

**Dependencias externas:** ninguna. El sitio funciona sin internet (excepto la carga del catálogo, que requiere acceso a la Sheet pública).

**Tipografías:** Cormorant Garamond + DM Sans, vía Google Fonts.

## Cómo desplegar el sitio

GitHub Pages se activa así:

1. En el repositorio, ir a **Settings → Pages**.
2. En "Source", seleccionar **Deploy from a branch**.
3. En "Branch", elegir **main** y carpeta **/ (root)**.
4. Guardar. En unos minutos el sitio estará en `https://unescomexico.github.io/consejo-bordadoras-yucatan/`.

Cualquier `git push` a la rama `main` actualiza el sitio automáticamente.

## Cómo administrar el catálogo

La coordinadora del Consejo administra el catálogo a través de la hoja de Google Sheets, no editando código. Para detalles, ver el manual incluido en la propia hoja, en la pestaña **"Cómo usar"**.

Resumen del flujo:

1. Subir foto de la pieza al Drive del Consejo, en la carpeta "Fotos del catálogo".
2. Copiar el ID del archivo de Drive (cadena larga del enlace).
3. Abrir el Google Sheet "Catálogo del Consejo".
4. Agregar una fila nueva con todos los datos de la pieza.
5. Cambiar el Estado a **"Publicada"** cuando esté lista.
6. La pieza aparece en el sitio en pocos minutos.

## Contribuir

El sitio está diseñado para que el Consejo pueda mantenerlo de forma autónoma. Si en el futuro requieren modificaciones estructurales (rediseño, nuevas secciones, cambio de tecnología), conviene contratar a una persona desarrolladora con conocimientos básicos de HTML, CSS y JavaScript.

Para personas desarrolladoras que se sumen: ver `MANUAL_DESARROLLADOR.md` para entender las decisiones de diseño y la arquitectura.

## Licencia

- **Contenido del sitio** (textos, imágenes, datos): [Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.es).
- **Código fuente**: [Licencia MIT](https://opensource.org/licenses/MIT).

Esta combinación significa que cualquier persona puede usar, copiar y adaptar el código y contenido del sitio, siempre que dé el crédito correspondiente al Consejo Estatal de Bordadoras Mayas de Yucatán y comparta sus modificaciones bajo las mismas condiciones.

## Aliados institucionales

Este sitio se desarrolla en el marco del proyecto **Bordamos en Comunidad: el Arte Textil en Yucatán**, impulsado por el Gobierno del Estado de Yucatán con el apoyo de la **UNESCO** y el financiamiento de la **Fundación Banorte**.

## Contacto

Para asuntos relacionados con el Consejo: ver página de contacto del sitio.
Para asuntos técnicos del sitio web: abrir un issue en este repositorio.
