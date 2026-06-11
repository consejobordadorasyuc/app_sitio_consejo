/**
 * catalogo.js
 * 
 * Lógica de carga y manipulación del catálogo del Consejo.
 * 
 * Responsabilidades:
 *   - Cargar productos desde la Sheet pública (URL CSV)
 *   - Filtrar piezas por estado "Publicada"
 *   - Resolver nombres de archivo a URLs de imagen vía Drive API
 *   - Construir las tarjetas HTML del catálogo
 *   - Cachear localmente para no consultar la Sheet en cada navegación
 */

import { CONFIG } from "./config.js";
import { parsearCSV } from "./csv-parser.js";
import { urlDesdeNombre, obtenerMapaArchivos } from "./drive-loader.js";

const CLAVE_CACHE_PRODUCTOS = "consejo_productos_cache";
const CLAVE_CACHE_BORDADORAS = "consejo_bordadoras_cache";
const CLAVE_CACHE_CONSEJERAS = "consejo_consejeras_cache";

/**
 * Carga los productos desde la Sheet (con cache local).
 * Filtra solo los que están en estado "Publicada".
 * 
 * @returns {Promise<Array>} Array de productos publicados.
 */
export async function cargarProductosPublicados() {
  const datos = await cargarConCache(CONFIG.urlProductos, CLAVE_CACHE_PRODUCTOS);
  
  return datos
    .filter(p => normalizar(p["Estado"]) === "publicada")
    .map(normalizarProducto);
}

/**
 * Devuelve solo las piezas marcadas como "Destacado = Sí" entre las publicadas.
 */
export async function cargarDestacadas() {
  const publicadas = await cargarProductosPublicados();
  return publicadas
    .filter(p => p.destacado)
    .slice(0, CONFIG.cantidadDestacadas);
}

/**
 * Carga las bordadoras del catálogo desde la Sheet.
 * Estas son las que publican productos (pueden o no ser consejeras).
 */
export async function cargarBordadoras() {
  const datos = await cargarConCache(CONFIG.urlBordadoras, CLAVE_CACHE_BORDADORAS);
  return datos.map(normalizarBordadora);
}

/**
 * Carga las consejeras (24 integrantes del Consejo Estatal).
 */
export async function cargarConsejeras() {
  if (!CONFIG.urlConsejeras || CONFIG.urlConsejeras.includes("PENDIENTE")) {
    console.warn("URL de consejeras pendiente. Editar config.js → urlConsejeras");
    return [];
  }
  const datos = await cargarConCache(CONFIG.urlConsejeras, CLAVE_CACHE_CONSEJERAS);
  
  // Validación defensiva: la pestaña debe tener al menos UNA de las columnas
  // exclusivas de Consejeras (Cargo en el Consejo, Edad, Biografía).
  // Si no las tiene, probablemente apunta a otra pestaña por error.
  if (datos.length > 0) {
    const primeraFila = datos[0];
    const tieneColumnasEsperadas =
      "Cargo en el Consejo" in primeraFila ||
      "Edad" in primeraFila ||
      "Biografía" in primeraFila;
    
    if (!tieneColumnasEsperadas) {
      console.error(
        "La URL de Consejeras NO apunta a la pestaña correcta. " +
        "Columnas recibidas:", Object.keys(primeraFila).join(", "),
        "\nVerifica el gid en config.js → urlConsejeras"
      );
      return [];
    }
  }
  
  return datos.map(normalizarConsejera);
}

/**
 * Devuelve un Set con los nombres normalizados de las bordadoras
 * marcadas como consejeras. Se usa para mostrar la etiqueta en el catálogo.
 */
let _setConsejerasCache = null;
export async function obtenerSetConsejeras() {
  if (_setConsejerasCache) return _setConsejerasCache;
  
  try {
    const bordadoras = await cargarBordadoras();
    _setConsejerasCache = new Set(
      bordadoras
        .filter(b => b.esConsejera)
        .map(b => normalizar(b.nombre))
    );
    return _setConsejerasCache;
  } catch {
    return new Set();
  }
}

/**
 * Pre-carga el mapa de archivos de Drive en paralelo.
 * Útil para llamarla al inicio para que cuando renderices
 * tarjetas, las URLs ya estén disponibles inmediatamente.
 */
export function precargarImagenes() {
  return obtenerMapaArchivos();
}

/* ------------------------------------------------------------
   Renderizado de tarjetas de pieza
   ------------------------------------------------------------ */

/**
 * Genera el HTML de una tarjeta de pieza.
 * La imagen se resuelve de forma asíncrona desde Drive.
 * Si la bordadora es consejera, agrega una etiqueta dorada.
 */
export async function renderizarTarjetaPieza(pieza) {
  const placeholderInicial = (pieza.nombre || "?").charAt(0).toUpperCase();
  
  // Resolver URL de foto: primero buscamos por nombre en Drive
  let urlFoto = null;
  if (pieza.nombreArchivoFoto) {
    urlFoto = await urlDesdeNombre(pieza.nombreArchivoFoto);
  }
  
  // Verificar si la bordadora es consejera
  const setConsejeras = await obtenerSetConsejeras();
  const esConsejera = setConsejeras.has(normalizar(pieza.bordadora));
  
  const imagenHTML = urlFoto
    ? `<img class="tarjeta-pieza__imagen" 
            src="${escapar(urlFoto)}" 
            alt="${escapar(pieza.nombre)}"
            loading="lazy"
            onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'tarjeta-pieza__placeholder\\'>${placeholderInicial}</div>'">`
    : `<div class="tarjeta-pieza__placeholder">${placeholderInicial}</div>`;
  
  // Etiqueta de consejera (badge dorado, esquina superior de la imagen)
  const etiquetaConsejera = esConsejera
    ? `<span class="tarjeta-pieza__badge" title="Bordadora integrante del Consejo Estatal">
         <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <path d="M12 2l2.39 7.36H22l-6.18 4.49 2.36 7.36L12 16.72l-6.18 4.49 2.36-7.36L2 9.36h7.61L12 2z"/>
         </svg>
         Consejera
       </span>`
    : '';
  
  const precio = pieza.precio
    ? `$${Number(pieza.precio).toLocaleString("es-MX")} MXN`
    : "Consultar";
  
  const enlace = pieza.linkWhatsApp || "#";
  const ubicacion = pieza.localidad && pieza.localidad !== pieza.municipio
    ? `${pieza.localidad}, ${pieza.municipio}`
    : pieza.municipio;
  
  return `
    <a class="tarjeta-pieza aparece" 
       href="${escapar(enlace)}" 
       target="_blank" 
       rel="noopener"
       data-id="${escapar(pieza.id)}">
      <div class="tarjeta-pieza__imagen-wrap">
        ${imagenHTML}
        ${etiquetaConsejera}
      </div>
      <div class="tarjeta-pieza__contenido">
        <div class="tarjeta-pieza__categoria">${escapar(pieza.categoria)}</div>
        <h3 class="tarjeta-pieza__nombre">${escapar(pieza.nombre)}</h3>
        <div class="tarjeta-pieza__bordadora">por ${escapar(pieza.bordadora)}, ${escapar(ubicacion)}</div>
        <div class="tarjeta-pieza__pie">
          <span class="tarjeta-pieza__precio">${precio}</span>
          <span class="tarjeta-pieza__tecnica">${escapar(pieza.tecnica)}</span>
        </div>
      </div>
    </a>
  `;
}

/**
 * Renderiza un array de piezas resolviendo todas las URLs de imagen en paralelo.
 * Más eficiente que llamar a renderizarTarjetaPieza() en serie.
 */
export async function renderizarTarjetasPiezas(piezas) {
  const htmls = await Promise.all(piezas.map(renderizarTarjetaPieza));
  return htmls.join("");
}

/* ------------------------------------------------------------
   Internos
   ------------------------------------------------------------ */

async function cargarConCache(url, claveCache) {
  const cache = leerCache(claveCache);
  if (cache && Date.now() - cache.timestamp < CONFIG.cacheTTL) {
    return cache.datos;
  }
  
  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    
    const texto = await respuesta.text();
    const datos = parsearCSV(texto);
    
    guardarCache(claveCache, datos);
    return datos;
  } catch (error) {
    console.error(`Error cargando ${url}:`, error);
    if (cache) return cache.datos;
    throw error;
  }
}

function leerCache(clave) {
  try {
    const raw = sessionStorage.getItem(clave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardarCache(clave, datos) {
  try {
    sessionStorage.setItem(clave, JSON.stringify({
      timestamp: Date.now(),
      datos: datos
    }));
  } catch { /* ignorar */ }
}

function normalizarProducto(crudo) {
  return {
    id: crudo["ID"] || "",
    estado: crudo["Estado"] || "",
    destacado: normalizar(crudo["Destacado"]) === "si",
    nombre: crudo["Nombre de la pieza"] || "",
    categoria: crudo["Categoría"] || "",
    tecnica: crudo["Técnica"] || "",
    descripcion: crudo["Descripción"] || "",
    materiales: crudo["Materiales"] || "",
    medidas: crudo["Medidas"] || "",
    tiempoElaboracion: crudo["Tiempo de elaboración"] || "",
    precio: parseFloat(crudo["Precio (MXN)"]?.replace(/[^0-9.]/g, "")) || 0,
    nombreArchivoFoto: crudo["Nombre del archivo de foto"] || crudo["URL de foto (automático)"] || "",
    bordadora: crudo["Bordadora"] || "",
    municipio: crudo["Municipio"] || "",
    localidad: crudo["Localidad"] || "",
    whatsapp: crudo["WhatsApp (10 dígitos)"] || "",
    linkWhatsApp: crudo["Link de WhatsApp (automático)"] || "",
    fechaAlta: crudo["Fecha de alta"] || "",
  };
}

function normalizarBordadora(crudo) {
  return {
    id: crudo["ID"] || "",
    nombre: crudo["Nombre completo"] || "",
    esConsejera: normalizar(crudo["Es consejera"]) === "si",
    municipio: crudo["Municipio"] || "",
    localidad: crudo["Localidad"] || "",
    whatsapp: crudo["WhatsApp"] || "",
    tecnicaPrincipal: crudo["Técnica principal"] || "",
    aniosExperiencia: crudo["Años de experiencia"] || "",
    nombreArchivoFoto: crudo["Nombre del archivo de foto"] || crudo["URL de foto (automático)"] || "",
    biografia: crudo["Biografía breve"] || "",
  };
}

function normalizarConsejera(crudo) {
  return {
    id: crudo["ID"] || "",
    nombre: crudo["Nombre completo"] || "",
    municipio: crudo["Municipio"] || "",
    localidad: crudo["Localidad"] || "",
    edad: crudo["Edad"] || "",
    aniosExperiencia: crudo["Años de experiencia"] || "",
    cargo: crudo["Cargo en el Consejo"] || "",
    colectivo: crudo["Colectivo o marca"] || "",
    nombreArchivoFoto: crudo["Nombre del archivo de foto"] || crudo["URL de foto (automático)"] || "",
    biografia: crudo["Biografía"] || "",
  };
}

function normalizar(texto) {
  if (!texto) return "";
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapar(texto) {
  if (texto === null || texto === undefined) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
