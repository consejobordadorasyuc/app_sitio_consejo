/**
 * drive-loader.js
 * 
 * Módulo encargado de:
 *   1. Listar los archivos de la carpeta pública de Google Drive (vía API key).
 *   2. Construir un mapa de "nombre de archivo" → "ID de archivo".
 *   3. Resolver nombres de archivo a URLs reales de imagen.
 * 
 * Por qué este enfoque:
 *   - Las bordadoras suben fotos al Drive con nombres descriptivos (P001_xxx.jpg).
 *   - El sitio consulta la carpeta UNA SOLA VEZ al cargar y arma el mapa.
 *   - Cuando renderiza una pieza, busca en el mapa por nombre y construye la URL.
 *   - El mapa se cachea en sessionStorage para no consultar la API en cada navegación.
 * 
 * Por qué no usamos drive.google.com/uc?export=view&id=...:
 *   - Google deprecó ese formato entre 2024-2025; ya no funciona de forma confiable.
 *   - El formato actual es lh3.googleusercontent.com/d/{ID}, que sirve imágenes
 *     directamente desde el CDN de Google.
 */

import { CONFIG } from "./config.js";

const CLAVE_CACHE = "consejo_drive_files_cache";

let mapaArchivosPromise = null;

/**
 * Devuelve el mapa de nombre de archivo → ID. Hace una sola petición a la API
 * por sesión gracias a la promesa compartida.
 * 
 * @returns {Promise<Map<string, string>>}
 */
export function obtenerMapaArchivos() {
  if (mapaArchivosPromise) return mapaArchivosPromise;
  
  mapaArchivosPromise = cargarYConstruirMapa();
  return mapaArchivosPromise;
}

/**
 * Convierte un nombre de archivo a URL de imagen lista para usar en <img>.
 * Si el archivo no existe en Drive, devuelve null.
 * 
 * @param {string} nombreArchivo - ej. "P001_hipil-ceremonial-flores_01.jpg"
 * @returns {Promise<string|null>}
 */
export async function urlDesdeNombre(nombreArchivo) {
  if (!nombreArchivo) return null;
  
  const mapa = await obtenerMapaArchivos();
  const id = mapa.get(nombreArchivo.trim());
  
  if (!id) {
    console.warn(`Archivo no encontrado en Drive: "${nombreArchivo}"`);
    return null;
  }
  
  // Formato actual y funcional para servir imágenes públicas de Drive
  return `https://lh3.googleusercontent.com/d/${id}`;
}

/* ------------------------------------------------------------
   Internos
   ------------------------------------------------------------ */

async function cargarYConstruirMapa() {
  // Intentar cache válido primero
  const cache = leerCache();
  if (cache && Date.now() - cache.timestamp < CONFIG.cacheTTL) {
    return new Map(cache.entradas);
  }
  
  try {
    const archivos = await listarArchivosDeLaCarpeta();
    const mapa = new Map();
    
    for (const archivo of archivos) {
      // Indexamos solo imágenes
      if (archivo.mimeType && archivo.mimeType.startsWith("image/")) {
        mapa.set(archivo.name, archivo.id);
      }
    }
    
    guardarCache(mapa);
    return mapa;
  } catch (error) {
    console.error("Error cargando archivos de Drive:", error);
    
    // Fallback: usar cache aunque haya expirado
    if (cache) return new Map(cache.entradas);
    
    // Si todo falla, devolver mapa vacío para que el sitio no se rompa
    return new Map();
  }
}

/**
 * Llama a la Google Drive API v3 para listar archivos de la carpeta pública.
 * Maneja paginación si hay más de 100 archivos.
 */
async function listarArchivosDeLaCarpeta() {
  const archivos = [];
  let pageToken = null;
  
  do {
    const params = new URLSearchParams({
      q: `'${CONFIG.driveFolderId}' in parents and trashed = false`,
      key: CONFIG.driveApiKey,
      fields: "files(id, name, mimeType), nextPageToken",
      pageSize: "200",
    });
    
    if (pageToken) params.set("pageToken", pageToken);
    
    const url = `https://www.googleapis.com/drive/v3/files?${params}`;
    const respuesta = await fetch(url);
    
    if (!respuesta.ok) {
      const err = await respuesta.text();
      throw new Error(`Drive API HTTP ${respuesta.status}: ${err}`);
    }
    
    const data = await respuesta.json();
    
    if (data.files) archivos.push(...data.files);
    pageToken = data.nextPageToken || null;
    
  } while (pageToken);
  
  return archivos;
}

function leerCache() {
  try {
    const raw = sessionStorage.getItem(CLAVE_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardarCache(mapa) {
  try {
    sessionStorage.setItem(CLAVE_CACHE, JSON.stringify({
      timestamp: Date.now(),
      entradas: Array.from(mapa.entries()),
    }));
  } catch {
    /* sessionStorage lleno o no disponible: ignorar */
  }
}
