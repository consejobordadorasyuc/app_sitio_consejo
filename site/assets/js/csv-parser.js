/**
 * csv-parser.js
 * 
 * Parser de CSV ligero, escrito para este proyecto.
 * Maneja correctamente comillas, comas dentro de campos,
 * saltos de línea dentro de campos entrecomillados, y BOM.
 * 
 * No usa dependencias externas para mantener el sitio sin frameworks.
 */

/**
 * Convierte una cadena CSV en un array de objetos.
 * La primera línea se asume como encabezados.
 * 
 * @param {string} texto - El contenido del CSV.
 * @returns {Array<Object>} Array donde cada objeto tiene las columnas como claves.
 */
export function parsearCSV(texto) {
  // Eliminar BOM si está presente (Google Sheets lo agrega a veces)
  if (texto.charCodeAt(0) === 0xFEFF) {
    texto = texto.slice(1);
  }
  
  const filas = parsearFilas(texto);
  if (filas.length === 0) return [];
  
  const encabezados = filas[0].map(h => h.trim());
  const registros = [];
  
  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i];
    // Saltar filas completamente vacías
    if (fila.every(celda => celda === "")) continue;
    
    const objeto = {};
    encabezados.forEach((encabezado, idx) => {
      objeto[encabezado] = (fila[idx] ?? "").trim();
    });
    registros.push(objeto);
  }
  
  return registros;
}

/**
 * Convierte el texto CSV en un array de arrays (filas).
 * Implementación tolerante a comillas y saltos de línea internos.
 */
function parsearFilas(texto) {
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
        // Comilla escapada: ""
        campo += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        // Cierre de comillas
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
        // Salto de línea Windows
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
  
  // Último campo y fila si no había salto de línea final
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  
  return filas;
}
