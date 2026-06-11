# Pasos de despliegue

## A. Obtener IDs

### ID del Google Sheet

En la URL:

```txt
https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
```

Copia `ESTE_ES_EL_ID`.

### ID de la carpeta de imágenes

En la URL:

```txt
https://drive.google.com/drive/folders/ESTE_ES_EL_ID
```

Copia `ESTE_ES_EL_ID`.

## B. Configurar Apps Script

Script Properties necesarias:

| Propiedad | Valor |
|---|---|
| `SPREADSHEET_ID` | ID de la hoja |
| `IMAGES_FOLDER_ID` | ID de la carpeta de imágenes |
| `ADMIN_PASSWORD` | Contraseña del panel |

## C. Probar backend

Abre la URL `/exec` del Apps Script en el navegador. Debe responder algo como:

```json
{"ok":true,"message":"CEBY admin backend activo."}
```

## D. Probar admin localmente

Puedes abrir `admin/index.html` directamente en el navegador. Si el navegador bloquea algo, usa un servidor local:

```bash
cd admin
python -m http.server 3000
```

Luego entra a:

```txt
http://localhost:3000
```

## E. Publicar en Cloudflare Pages

1. Sube el repo a GitHub.
2. En Cloudflare Pages, crea proyecto desde GitHub.
3. Si vas a publicar solo el admin:
   - Root directory: `admin`
   - Build command: vacío
   - Build output directory: `/`
4. Si vas a publicar todo:
   - Root directory: vacío
   - Build command: vacío
   - Build output directory: `/`

