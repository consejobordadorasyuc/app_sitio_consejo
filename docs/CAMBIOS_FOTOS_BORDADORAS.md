# Cambios v9 — fotos automáticas y bordadoras como fuente central

## Productos

- Los productos nuevos siguen usando IDs `P001`, `P002`, `P003`, etc.
- Cuando se sube una foto nueva, si el producto aún no tiene ID, el admin solicita el siguiente ID al backend antes de subir la imagen.
- La imagen se guarda automáticamente con el esquema:

```text
ID_nombre-de-la-prenda_01.ext
```

Ejemplo:

```text
P018_panuelo-bordado-esquinas_01.jpg
```

- Si se sustituye la foto de un producto ya registrado, el backend manda a papelera el archivo anterior con el mismo nombre y sube la nueva versión con el mismo nombre.

## Bordadoras

- La hoja `Bordadoras` es la fuente central de datos.
- En productos y consejeras, la bordadora se selecciona mediante un campo buscable.
- Al seleccionar una bordadora, se rellenan automáticamente los campos derivados: nombre, municipio, localidad y WhatsApp.
- Si una bordadora no aparece, primero debe darse de alta en `Bordadoras`.

## Consejeras

- Una consejera solo puede registrarse si ya existe como bordadora.
- Al registrar una consejera, el backend marca automáticamente a esa bordadora como `Es consejera = Sí`.
