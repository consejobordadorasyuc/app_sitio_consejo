# Actualización de la aplicación – junio de 2026

## Cambios en la interfaz
- Productos: estados limitados a `Borrador` y `Publicada`; se retiró el campo `Destacado`.
- Productos: nueva sección para administrar las opciones de `Categorías` y `Técnicas`.
- Bordadoras: se ocultaron `ID` y `URL de foto`; se retiró `Técnica principal`.
- Consejeras: se ocultó `URL de foto`.
- Todas las secciones: se agregó eliminación definitiva de registros.
- Acceso: la URL del Apps Script queda fija en `admin/config.js`; solo se solicita la contraseña.

## Cambios requeridos en Apps Script
Sustituir el contenido del proyecto de Apps Script por `apps-script/Code.gs` y crear una nueva versión del despliegue web.

## Google Sheets
No se requieren nuevas hojas ni columnas. La hoja `Listas` ya contiene las columnas `Categorías`, `Técnicas` y `Estados`. La aplicación ahora puede editarlas directamente. Al guardar opciones, `Estados` se normaliza a `Borrador` y `Publicada`.

Las columnas históricas `Destacado` y `Técnica principal` pueden conservarse para compatibilidad y archivo; la aplicación ya no las muestra ni modifica.

## Eliminación
La eliminación borra la fila correspondiente en Google Sheets. No borra automáticamente la imagen de Google Drive. Una bordadora no puede eliminarse mientras esté vinculada a productos o consejeras.
