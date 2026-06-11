# Manual del desarrollador

Este documento explica las decisiones técnicas detrás del sitio del Consejo Estatal de Bordadoras Mayas de Yucatán, para que cualquier persona desarrolladora que herede el proyecto pueda entenderlo y modificarlo sin contexto previo.

## Filosofía general

Tres ideas guían la construcción:

**1. Estabilidad sobre tendencias.** Se eligió HTML, CSS y JavaScript vanilla deliberadamente, evitando frameworks (React, Vue, Next.js, Astro, etc.). El razonamiento es que los frameworks tienen ciclos de obsolescencia rápidos: una versión de React de 2020 ya tiene problemas de mantenimiento en 2025. El sitio del Consejo debe poder seguir funcionando sin intervención técnica durante años, idealmente décadas. HTML/CSS/JS son tecnologías estables que el navegador del futuro seguirá interpretando.

**2. Sin proceso de build.** No hay `npm`, `yarn`, `pnpm`, `webpack`, `vite`, `rollup`, `babel` ni nada similar. El código fuente es exactamente lo que el navegador ejecuta. Esto significa que cualquier persona puede abrir un archivo `.html` o `.js` y entender qué hace, sin necesidad de ejecutar comandos previos. También significa que no hay dependencias que actualizar ni vulnerabilidades de paquetes que parchear.

**3. Datos separados del código.** El catálogo de piezas y el directorio de bordadoras viven en una hoja de Google Sheets, no en el código del sitio. El sitio lee estos datos al cargar y los renderiza dinámicamente. Esto permite que la coordinadora del Consejo administre el contenido sin tocar código.

## Arquitectura de datos

### Fuentes de datos

El sitio consume dos URLs públicas de Google Sheets, ambas configuradas en `assets/js/config.js`:

```javascript
urlProductos:    "https://docs.google.com/spreadsheets/d/.../pub?gid=...&output=csv"
urlBordadoras:   "https://docs.google.com/spreadsheets/d/.../pub?gid=...&output=csv"
```

Estas URLs se generan publicando cada pestaña de la hoja como CSV (Archivo → Compartir → Publicar en la web → CSV). Cualquier cambio en la hoja se refleja en esas URLs en pocos minutos.

### Cache local

Para evitar consultar la Sheet en cada navegación dentro del sitio, los datos se cachean en `sessionStorage` durante 5 minutos (configurable en `config.js → cacheTTL`). Si la red falla, se usa el cache aunque haya expirado.

### Filtrado por estado

La columna **"Estado"** del catálogo controla la visibilidad. El sitio solo muestra piezas con valor exactamente `"Publicada"`. Otros valores posibles (`Borrador`, `En revisión`, `Vendida`) ocultan la pieza del público. La lógica está en `catalogo.js → cargarProductosPublicados()`.

### Imágenes

Las imágenes viven en una carpeta de Google Drive. La hoja de cálculo guarda solo el **ID del archivo de Drive** (no la URL completa), y una fórmula de Sheets construye la URL pública: `https://drive.google.com/uc?export=view&id={ID}`.

**Limitación conocida:** Google Drive a veces bloquea imágenes muy demandadas con el error "Quota exceeded". Para un sitio de tráfico moderado no es problema. Si en el futuro el tráfico crece, conviene migrar las imágenes a un CDN dedicado (Cloudflare Images, Imgix, o similar) o al propio repositorio de GitHub.

## Sistema de diseño

### Paleta

Extraída del logotipo del Consejo. Definida en `base.css` como custom properties:

| Variable | Color | Uso |
|----------|-------|-----|
| `--c-dorado` | `#B09040` | Color institucional principal, acentos |
| `--c-azul` | `#0070A0` | Secundario, enlaces secundarios |
| `--c-verde` | `#106020` | WhatsApp, comunidad |
| `--c-magenta` | `#C01080` | Acento expresivo, hovers, CTA emocional |
| `--c-crema` | `#F8F4E8` | Fondo principal |
| `--c-tinta` | `#2A2419` | Texto principal (no usar negro puro) |

**Regla de uso:** dorado es el color institucional dominante; magenta es el acento expresivo y debe usarse con moderación; el resto son soportes.

### Tipografía

- **Display (títulos):** Cormorant Garamond. Serif elegante con presencia editorial.
- **Cuerpo (lectura):** DM Sans. Sans serif moderna, muy legible en pantalla.

Se cargan desde Google Fonts. Si en algún momento conviene autoalojar las tipografías para reducir dependencias externas, los archivos `.woff2` pueden descargarse desde [google-webfonts-helper](https://gwfh.mranftl.com/) y servirse desde `assets/fuentes/`.

### Espaciado

Sistema de 8px (cada margen, padding y tamaño es múltiplo de 8). Las variables en `base.css` (`--esp-1` hasta `--esp-32`) reflejan este sistema.

### Componentes

Los componentes (botones, tarjetas, header, footer) están en `componentes.css` con la convención BEM:

```
.bloque                    /* Componente */
.bloque__elemento          /* Parte del componente */
.bloque--modificador       /* Variación */
```

Ejemplos:
- `.boton`, `.boton--primario`, `.boton--secundario`
- `.tarjeta-pieza`, `.tarjeta-pieza__imagen`, `.tarjeta-pieza__contenido`

### Responsive

Mobile-first. Los breakpoints clave son:

- `600px`: ajustes para móviles muy pequeños
- `768px`: tablet vertical
- `900px`: tablet horizontal / laptop pequeña (donde se activa el menú móvil)
- `1024px`: laptop estándar
- `1400px`: ancho máximo del contenedor

## Estructura de archivos JavaScript

Todos los módulos JS usan ES Modules (sintaxis `import`/`export`). Esto requiere que se carguen con `<script type="module">` en el HTML.

```
config.js          ← Constantes globales (URLs, configuración)
csv-parser.js      ← Función pura: texto CSV → array de objetos
catalogo.js        ← Lógica de negocio: carga, filtra, renderiza piezas
inicio.js          ← Coordinador de la página Inicio
```

Cuando se construyan las demás páginas, cada una tendrá su propio módulo coordinador (`bordadoras.js`, `catalogo-pagina.js`, etc.) que importará de `catalogo.js`.

## Cómo agregar una nueva página

1. Crear `nueva-pagina.html` siguiendo la estructura de `index.html` (mismo header, mismo footer, mismas hojas de estilo base).
2. Crear `assets/css/nueva-pagina.css` con estilos específicos.
3. Crear `assets/js/nueva-pagina.js` con la lógica de la página.
4. Agregar el link a la nueva página en el menú del header (en todas las páginas existentes).

## Cómo modificar el catálogo desde el código

**No deberías hacerlo.** Los datos del catálogo viven en la Sheet, no en el código. Si necesitas cambiar la información de una pieza, hazlo en la Sheet.

Si necesitas cambiar la **forma en que se muestran** las piezas (layout, campos visibles, etc.), edita `catalogo.js → renderizarTarjetaPieza()` y los estilos correspondientes en `componentes.css → .tarjeta-pieza*`.

## Cómo agregar una columna nueva a la Sheet

1. Agregar la columna en la hoja de Google Sheets, en la pestaña correspondiente.
2. En `catalogo.js → normalizarProducto()` (o `normalizarBordadora()`), agregar la nueva propiedad mapeando del nombre de columna al campo del objeto.
3. Usar la nueva propiedad donde corresponda en el HTML/JS.

## Cómo cambiar las URLs de la Sheet

Si por algún motivo se republica la hoja con URLs nuevas (por ejemplo, si se migra a otro Drive), solo hay que actualizar `config.js`:

```javascript
urlProductos: "nueva-url-aqui",
urlBordadoras: "nueva-url-aqui",
```

No hay que tocar nada más.

## Probar localmente

Como el sitio usa ES Modules, **no se puede abrir directamente con doble clic** (el protocolo `file://` no permite módulos por seguridad). Hay que servirlo con un servidor local.

Opciones:

**Python** (si lo tienes):
```bash
cd ruta/del/sitio
python3 -m http.server 8000
```
Luego abrir `http://localhost:8000`.

**Node** (si tienes Node):
```bash
npx serve
```

**VS Code:** instalar extensión "Live Server", clic derecho sobre `index.html` → "Open with Live Server".

## SEO y metadatos

Cada página debe tener:
- `<title>` único y descriptivo
- `<meta name="description">` con texto natural sobre el contenido de la página
- `<meta property="og:*">` para que el sitio se vea bien al compartir en redes
- Estructura semántica: usar `<header>`, `<main>`, `<section>`, `<article>`, `<footer>` correctamente.
- Imágenes con `alt` descriptivo (no solo "imagen").

## Accesibilidad

El sitio debe ser usable por personas con lectores de pantalla y por quien navegue solo con teclado. Pautas:

- Todo botón y enlace debe tener texto descriptivo (no solo íconos).
- Los formularios deben tener `<label>` asociados a cada `<input>`.
- El contraste de color cumple WCAG AA (revisar con [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) si se modifica la paleta).
- Las animaciones deben respetar `prefers-reduced-motion` (pendiente de implementar en versión 2).

## Decisiones que pueden parecer raras pero son intencionales

**¿Por qué no React?** Porque agregaría dependencias, build step, y obsolescencia. El sitio no necesita estado complejo.

**¿Por qué no Tailwind?** Porque mezclaría utilidades en HTML haciendo más difícil que alguien con CSS básico entienda los estilos. CSS con custom properties es legible en sí mismo.

**¿Por qué Google Sheets en lugar de una base de datos?** Porque la coordinadora del Consejo sabe usar Sheets, no SQL. La sostenibilidad operativa pesa más que la elegancia técnica.

**¿Por qué carga inicial desde JavaScript en lugar de HTML estático generado al build?** Porque no queremos build. La pequeña penalización de tiempo de carga inicial se compensa con cero mantenimiento técnico para el Consejo.

**¿Por qué tan pocos `console.log`?** Porque el código está pensado para que funcione, no para debuggearse. Si necesitas depurar, agrégalos temporalmente y quítalos al terminar.

## Contacto técnico

Issues en GitHub para reportar bugs o pedir features.
Pull requests bienvenidos siguiendo las convenciones de este documento.
