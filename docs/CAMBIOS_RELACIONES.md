# Cambios de relaciones e IDs

Esta versión agrega:

- IDs automáticos para nuevos productos, bordadoras y consejeras (`P001`, `B001`, `C001`, etc.).
- Validación para evitar IDs repetidos usando `LockService` en Apps Script.
- Productos vinculados a una bordadora registrada mediante `Bordadora ID`.
- El formulario de producto ya no permite escribir libremente municipio, localidad o WhatsApp: se derivan de la bordadora seleccionada.
- Consejeras vinculadas a una bordadora registrada mediante `Bordadora ID`.
- Al registrar una consejera, la bordadora correspondiente se marca automáticamente como `Es consejera = Sí`.

Después de pegar el nuevo `Code.gs`, es obligatorio reimplementar la Web App como **Nueva versión**.
