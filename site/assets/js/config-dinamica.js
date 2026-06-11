/**
 * config-dinamica.js
 * 
 * Carga la pestaña "Configuración" de la Sheet del Consejo y aplica
 * los valores en la página, reemplazando placeholders del tipo {{clave}}.
 * 
 * Uso en HTML:
 *   <span data-config="correo_institucional">Cargando…</span>
 *   <a data-config-href="instagram_url" href="#">Instagram</a>
 * 
 * Cada elemento con atributo data-config muestra el valor de esa clave
 * cuando el módulo termina de cargar la Sheet. Los elementos con
 * data-config-href reemplazan su atributo href.
 */

import { CONFIG } from "./config.js";
import { parsearCSV } from "./csv-parser.js";

const CLAVE_CACHE = "consejo_configuracion_cache";

/**
 * Carga la configuración y aplica valores a todos los elementos
 * marcados con data-config y data-config-href.
 */
export async function cargarYAplicarConfiguracion() {
  try {
    const config = await cargarConfiguracion();
    aplicarValoresEnDOM(config);
  } catch (error) {
    console.error("Error cargando configuración del sitio:", error);
    // Dejar los placeholders "Cargando…" si no se pudo cargar
  }
}

/**
 * Devuelve un objeto con los valores de configuración.
 * 
 * Tolerante a la estructura de la pestaña: ignora título y descripción de las
 * primeras filas y busca automáticamente la fila que contiene los datos.
 */
export async function cargarConfiguracion() {
  // Cache primero
  const cache = leerCache();
  if (cache && Date.now() - cache.timestamp < CONFIG.cacheTTL) {
    return cache.datos;
  }
  
  if (!CONFIG.urlConfiguracion || CONFIG.urlConfiguracion.includes("PENDIENTE")) {
    console.warn("URL de configuración pendiente. Editar config.js → urlConfiguracion");
    return {};
  }
  
  const respuesta = await fetch(CONFIG.urlConfiguracion);
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  
  const texto = await respuesta.text();
  
  // Estrategia robusta: parsear el CSV línea por línea sin asumir encabezados.
  // Buscamos pares (clave, valor) donde la clave coincide con alguna de las
  // claves esperadas. Esto hace al parser inmune a títulos, descripciones,
  // filas vacías, o cualquier estructura ornamental que tenga la pestaña.
  const config = parsearConfigTolerante(texto);
  
  guardarCache(config);
  return config;
}

/**
 * Parser tolerante: recibe el texto CSV completo, recorre cada fila,
 * y construye el objeto de configuración buscando filas que tengan
 * exactamente dos columnas no vacías y donde la primera columna luzca
 * como una clave (sin espacios, en minúsculas, con guiones bajos opcionales).
 */
function parsearConfigTolerante(texto) {
  // Eliminar BOM si existe
  if (texto.charCodeAt(0) === 0xFEFF) {
    texto = texto.slice(1);
  }
  
  const config = {};
  const filas = parsearFilasCrudas(texto);
  
  // Patrón para identificar claves: solo letras minúsculas, números, guiones bajos
  const patronClave = /^[a-z][a-z0-9_]*$/;
  
  for (const celdas of filas) {
    if (celdas.length < 2) continue;
    
    const clave = (celdas[0] || "").trim();
    const valor = (celdas[1] || "").trim();
    
    // Solo aceptar filas donde la primera celda parece una clave válida
    if (clave && patronClave.test(clave)) {
      config[clave] = valor;
    }
  }
  
  return config;
}

/**
 * Parsea CSV a arrays de arrays (sin asumir encabezados).
 * Maneja correctamente comillas y campos con comas internas.
 */
function parsearFilasCrudas(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let dentroDeComillas = false;
  let i = 0;
  
  while (i < texto.length) {
    const c = texto[i];
    const siguiente = texto[i + 1];
    
    if (dentroDeComillas) {
      if (c === '"' && siguiente === '"') {
        campo += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        dentroDeComillas = false;
        i++;
        continue;
      }
      campo += c;
      i++;
    } else {
      if (c === '"') {
        dentroDeComillas = true;
        i++;
        continue;
      }
      if (c === ",") {
        fila.push(campo);
        campo = "";
        i++;
        continue;
      }
      if (c === "\r" && siguiente === "\n") {
        fila.push(campo);
        filas.push(fila);
        fila = [];
        campo = "";
        i += 2;
        continue;
      }
      if (c === "\n" || c === "\r") {
        fila.push(campo);
        filas.push(fila);
        fila = [];
        campo = "";
        i++;
        continue;
      }
      campo += c;
      i++;
    }
  }
  
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  
  return filas;
}

/* ------------------------------------------------------------
   Aplicación al DOM
   ------------------------------------------------------------ */

function aplicarValoresEnDOM(config) {
  // Elementos con data-config: reemplazar su contenido de texto
  document.querySelectorAll("[data-config]").forEach(el => {
    const clave = el.getAttribute("data-config");
    const valor = config[clave];
    if (valor) {
      el.textContent = valor;
    } else {
      el.textContent = "";
      if (el.classList.contains("config-opcional")) {
        el.style.display = "none";
      }
    }
  });
  
  // Elementos con data-config-href: reemplazar el href
  document.querySelectorAll("[data-config-href]").forEach(el => {
    const clave = el.getAttribute("data-config-href");
    const valor = config[clave];
    if (valor) {
      el.setAttribute("href", valor);
    } else {
      // Si no hay valor, ocultar el enlace
      el.style.display = "none";
    }
  });
  
  // Elementos con data-config-mailto: construir mailto:
  document.querySelectorAll("[data-config-mailto]").forEach(el => {
    const clave = el.getAttribute("data-config-mailto");
    const valor = config[clave];
    if (valor) {
      const subject = el.getAttribute("data-config-subject") || "";
      const url = subject
        ? `mailto:${valor}?subject=${encodeURIComponent(subject)}`
        : `mailto:${valor}`;
      el.setAttribute("href", url);
    }
  });
  
  // Formularios: reemplazar action si tiene data-config-action
  document.querySelectorAll("[data-config-action]").forEach(el => {
    const clave = el.getAttribute("data-config-action");
    const valor = config[clave];
    if (valor) {
      el.setAttribute("action", `https://formsubmit.co/${valor}`);
    }
  });
}

/* ------------------------------------------------------------
   Cache
   ------------------------------------------------------------ */

function leerCache() {
  try {
    const raw = sessionStorage.getItem(CLAVE_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function guardarCache(datos) {
  try {
    sessionStorage.setItem(CLAVE_CACHE, JSON.stringify({
      timestamp: Date.now(),
      datos: datos
    }));
  } catch { /* ignorar */ }
}
