# CEBY Admin App

Panel ligero de administración para el sitio del Consejo Estatal de Bordadoras.

## Qué incluye

```txt
admin/          App estática del panel de administración
apps-script/    Backend para Google Apps Script
site/           Copia del sitio público actual incluido en el ZIP original
```

## Arquitectura

```txt
Admin estático en Cloudflare Pages / GitHub Pages
        ↓ fetch POST
Google Apps Script
        ↓
Google Sheets + Google Drive
        ↓
Sitio público lee la hoja y las imágenes
```

## Flujo

1. La administradora entra al panel.
2. Edita productos, bordadoras, consejeras o configuración.
3. Si sube una imagen, Apps Script la guarda en la carpeta de Drive.
4. Apps Script escribe nombre y URL de imagen en la hoja.
5. La página pública se actualiza al leer la hoja.

## Instalación rápida

### 1. Preparar Google Sheet

Convierte `Catálogo del Consejo (1).xlsx` a Google Sheets o usa el archivo que ya tienes en Drive.

Debe conservar estas hojas:

- Productos
- Bordadoras
- Consejeras
- Listas
- Configuración

### 2. Crear carpeta de imágenes

En Drive crea una carpeta, por ejemplo:

```txt
imagenes_catalogo
```

Copia su ID desde la URL de Drive.

### 3. Crear Google Apps Script

1. Ve a `script.google.com`.
2. Crea un proyecto nuevo.
3. Pega el contenido de `apps-script/Code.gs`.
4. En `Project Settings > Script Properties`, agrega:

```txt
SPREADSHEET_ID = ID del Google Sheet
IMAGES_FOLDER_ID = ID de la carpeta de imágenes
ADMIN_PASSWORD = una contraseña segura
```

Opcional:

```txt
OPTIONAL_PUBLIC_BASE_URL = https://lh3.googleusercontent.com/d/{id}
```

### 4. Desplegar Apps Script

1. `Deploy > New deployment`.
2. Tipo: `Web app`.
3. Execute as: `Me`.
4. Who has access: `Anyone`.
5. Copia la URL `/exec`.

### 5. Configurar el admin

Opción A: pegar la URL del Apps Script en la pantalla de login.

Opción B: copiar `admin/config.example.js` como `admin/config.js` y poner:

```js
window.CEBY_ADMIN_CONFIG = {
  API_URL: "https://script.google.com/macros/s/XXXXX/exec"
};
```

Si usas la opción B, cambia en `admin/index.html` esta línea:

```html
<script src="./config.example.js"></script>
```

por:

```html
<script src="./config.js"></script>
```

### 6. Desplegar en Cloudflare Pages

Puedes desplegar solo la carpeta `admin/` como proyecto independiente, o desplegar todo el repo y abrir `/admin/`.

Para evitar exponer el panel, lo ideal es no enlazarlo desde el sitio público y compartir la URL solo con la administración.

## Nota de seguridad

Esta versión está diseñada como MVP austero. Usa una contraseña guardada en Apps Script y sesiones temporales de 6 horas. Para una fase posterior, conviene migrar a acceso con cuentas Google autorizadas o Cloudflare Access.
