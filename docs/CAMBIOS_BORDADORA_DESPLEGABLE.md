# Cambios: Bordadora como lista desplegable buscable

Esta versión ajusta el formulario de Productos para que el campo **Bordadora** sea una lista desplegable buscable alimentada exclusivamente desde la hoja **Bordadoras**.

## Reglas implementadas

- No se puede guardar un producto si la bordadora no existe en la hoja **Bordadoras**.
- El campo visible se llama **Bordadora**.
- El usuario puede escribir parte del nombre y el navegador muestra coincidencias mediante `datalist`.
- Al seleccionar una bordadora, el sistema guarda internamente su `Bordadora ID`.
- Municipio, localidad, WhatsApp y enlace de WhatsApp se derivan de la hoja **Bordadoras**.
- Para registrar una consejera, también debe seleccionarse una bordadora previamente registrada.

## Archivos modificados

- `admin/app.js`
- `apps-script/Code.gs` se conserva compatible con la validación de relaciones.

## Recomendación

Después de reemplazar archivos, reiniciar el servidor local y hacer recarga fuerte del navegador con `Ctrl + F5`.
