# Guía de primer despliegue

Pasos para subir este sitio a GitHub y publicarlo en GitHub Pages por primera vez.

## Requisitos previos

- Tener `git` instalado en tu computadora.
- Tener acceso de escritura a la organización `unescomexico` en GitHub.
- Haber creado el repositorio `consejo-bordadoras-yucatan` en esa organización (vacío o con README).

## Paso 1: Inicializar el repositorio local

Abre una terminal en la carpeta donde tienes este proyecto descomprimido y ejecuta:

```bash
git init
git branch -M main
git add .
git commit -m "Versión inicial del sitio del Consejo"
```

## Paso 2: Conectar con GitHub

```bash
git remote add origin https://github.com/unescomexico/consejo-bordadoras-yucatan.git
git push -u origin main
```

Si te pide credenciales, usa tu usuario de GitHub y un Personal Access Token (no la contraseña, GitHub ya no acepta contraseña directa).

> **Si el repositorio en GitHub ya tiene un README**, primero haz `git pull origin main --allow-unrelated-histories` y resuelve cualquier conflicto antes del push.

## Paso 3: Activar GitHub Pages

1. Entra al repositorio en GitHub: `github.com/unescomexico/consejo-bordadoras-yucatan`.
2. Ve a **Settings** (Configuración) → **Pages** (en el menú lateral).
3. En **Source**, selecciona **Deploy from a branch**.
4. En **Branch**, elige **main** y **/ (root)**.
5. Haz clic en **Save**.

GitHub te mostrará un mensaje como: *"Your site is live at https://unescomexico.github.io/consejo-bordadoras-yucatan/"*. Puede tardar 1-3 minutos en aparecer la primera vez.

## Paso 4: Verificar que funcione

Abre la URL en tu navegador. Deberías ver:
- La página de Inicio con el logotipo y el hero.
- Las cuatro líneas de trabajo del Consejo.
- Las cifras institucionales.
- Las piezas destacadas cargadas desde la Sheet (debería mostrar las que estén marcadas como "Destacado = Sí" y "Estado = Publicada").

Si las piezas destacadas no cargan, revisa:

1. Que las URLs en `assets/js/config.js` sean correctas y terminen en `output=csv`.
2. Que la hoja de Google Sheets esté efectivamente publicada como CSV (no como HTML).
3. Abre la consola del navegador (F12) y mira si hay errores en rojo.

## Paso 5: Cambios futuros

Cualquier cambio que hagas se aplica con tres comandos:

```bash
git add .
git commit -m "Descripción breve del cambio"
git push
```

GitHub Pages republica el sitio automáticamente en 1-2 minutos.

## Estructura recomendada de commits

Para mantener el historial legible:

- `Agregar página de Bordadoras`
- `Corregir tipografía del header`
- `Actualizar URL de la Sheet de productos`
- `Mejorar contraste del botón de WhatsApp`

Evita commits con mensajes vagos como "cambios", "fix", "actualización".

## Conectar dominio propio (opcional, para más adelante)

Si en el futuro el Consejo compra un dominio (ej. `bordadorasyucatan.org`):

1. En **Settings → Pages → Custom domain**, escribe el dominio y guarda.
2. En el panel del proveedor del dominio (Namecheap, GoDaddy, etc.), crea estos registros DNS:
   - `A` apuntando a `185.199.108.153`
   - `A` apuntando a `185.199.109.153`
   - `A` apuntando a `185.199.110.153`
   - `A` apuntando a `185.199.111.153`
   - `CNAME` con valor `unescomexico.github.io` (para `www`).
3. En GitHub Pages, marca **Enforce HTTPS** una vez que el dominio se valide.

El proceso completo toma de 1 a 24 horas para que se propaguen los DNS.

## Transferir el repositorio al Consejo (cuando llegue el momento)

Cuando el Consejo tenga su propia organización en GitHub:

1. **Settings** → **Transfer ownership** (al final de la página, en la zona roja).
2. Escribe el nombre de la nueva organización destino.
3. Confirma con el nombre del repositorio.
4. La nueva organización debe aceptar la transferencia.

Todo el historial, issues, GitHub Pages y configuración se transfieren intactos. La URL pública cambiará automáticamente al nuevo formato.

## Si algo falla

- **El sitio se ve sin estilos:** verifica que GitHub Pages esté activado y que la rama sea `main`.
- **Las imágenes del catálogo no aparecen:** revisa que las fotos en Drive tengan permiso "Cualquiera con el enlace puede ver".
- **Una página da 404:** GitHub Pages tarda hasta 10 minutos la primera vez; espera y recarga.
- **Cambios no aparecen:** abre el sitio en modo incógnito o limpia caché del navegador.
