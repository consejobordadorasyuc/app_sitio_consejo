/**
 * config.js
 * 
 * Configuración central del sitio.
 * 
 * Si las URLs de la hoja de cálculo cambian (por ejemplo, si se republica),
 * solo hay que actualizarlas aquí, en un único lugar.
 */

export const CONFIG = {
  // ============================================================
  // URLs públicas de Google Sheets (publicadas como CSV)
  // Para republicar: Archivo → Compartir → Publicar en la web → CSV
  // ============================================================
  
  urlProductos: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTz0Fpu5nuCiJzvWqbMFgaiocgdcXr-DlMyWvX0C9I67MfzMa1WqT-hunYTAgAvL4WlCo8X_FCj0k1j/pub?gid=1288081791&single=true&output=csv",
  
  // Pestaña "Consejeras" — las 24 integrantes electas del Consejo (lista estable)
  urlConsejeras: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTz0Fpu5nuCiJzvWqbMFgaiocgdcXr-DlMyWvX0C9I67MfzMa1WqT-hunYTAgAvL4WlCo8X_FCj0k1j/pub?gid=1161637870&single=true&output=csv",
  
  // Pestaña "Bordadoras" — las que publican productos en el catálogo (lista dinámica)
  urlBordadoras: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTz0Fpu5nuCiJzvWqbMFgaiocgdcXr-DlMyWvX0C9I67MfzMa1WqT-hunYTAgAvL4WlCo8X_FCj0k1j/pub?gid=1382099101&single=true&output=csv",
  
  // URL de la pestaña "Configuración" — cuando publiques esa pestaña como CSV,
  // pega aquí la URL que te dé Google.
  urlConfiguracion: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTz0Fpu5nuCiJzvWqbMFgaiocgdcXr-DlMyWvX0C9I67MfzMa1WqT-hunYTAgAvL4WlCo8X_FCj0k1j/pub?gid=2139434298&single=true&output=csv",
  
  // ============================================================
  // Google Drive API — para cargar imágenes desde la carpeta pública
  // ============================================================
  
  // Esta API key es PÚBLICA por diseño. Está restringida en Google Cloud Console
  // para que SOLO funcione desde unescomexico.github.io/* y permite ÚNICAMENTE
  // acceso de lectura a Google Drive API. Si alguien la copia, no puede usarla
  // desde otro dominio. Si necesitas regenerarla:
  //   console.cloud.google.com → APIs y servicios → Credenciales
  driveApiKey: "AIzaSyAEDpF7Z3Z5mI-YPA_oNSdTVdIyTn-_YFg",
  
  // ID de la carpeta pública de Drive donde viven las fotos del catálogo
  // y bordadoras. Para obtenerlo: abre la carpeta en Drive, copia la parte
  // del URL que va después de '/folders/'
  driveFolderId: "1FJ4sA0pM3tSPnHPqHy_DZ9dwLzjQ70x1",
  
  // ============================================================
  // Otros ajustes
  // ============================================================
  
  // Tiempo en ms para mantener cache local de los datos (5 minutos)
  cacheTTL: 5 * 60 * 1000,
  
  // Cantidad de piezas a mostrar en la sección "Destacadas" del Inicio
  cantidadDestacadas: 4,
};
