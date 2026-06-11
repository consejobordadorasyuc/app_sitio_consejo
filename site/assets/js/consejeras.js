/**
 * consejeras.js
 * Página /consejeras: directorio de las 24 integrantes del Consejo Estatal.
 */

import { cargarConsejeras } from "./catalogo.js";
import { urlDesdeNombre } from "./drive-loader.js";
import { cargarYAplicarConfiguracion } from "./config-dinamica.js";

document.addEventListener("DOMContentLoaded", () => {
  inicializarMenuMovil();
  cargarYAplicarConfiguracion();
  cargarYRenderizarConsejeras();
});

function inicializarMenuMovil() {
  const toggle = document.querySelector(".nav__toggle");
  const nav = document.querySelector(".nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    nav.classList.toggle("activa");
    toggle.setAttribute("aria-expanded", nav.classList.contains("activa"));
  });
  nav.querySelectorAll(".nav__link").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("activa");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

async function cargarYRenderizarConsejeras() {
  const contenedor = document.querySelector("#consejeras-grid");
  if (!contenedor) return;
  
  try {
    const consejeras = await cargarConsejeras();
    
    if (consejeras.length === 0) {
      contenedor.innerHTML = `
        <div class="sin-resultados" style="grid-column: 1/-1;">
          <p>Próximamente: directorio de consejeras del Consejo.</p>
        </div>
      `;
      return;
    }
    
    // Ordenar por municipio y luego por nombre
    consejeras.sort((a, b) => {
      const compMun = (a.municipio || "").localeCompare(b.municipio || "");
      if (compMun !== 0) return compMun;
      return (a.nombre || "").localeCompare(b.nombre || "");
    });
    
    const tarjetas = await Promise.all(
      consejeras.map((c, idx) => renderizarTarjeta(c, idx))
    );
    contenedor.innerHTML = tarjetas.join("");
    
    // Actualizar contador en encabezado si existe
    const contador = document.querySelector("#contador-consejeras");
    if (contador) {
      contador.textContent = consejeras.length;
    }
  } catch (error) {
    console.error("Error cargando consejeras:", error);
    contenedor.innerHTML = `
      <div class="sin-resultados" style="grid-column: 1/-1;">
        <p>No fue posible cargar el directorio en este momento.</p>
      </div>
    `;
  }
}

async function renderizarTarjeta(c, idx) {
  const inicial = c.nombre.charAt(0).toUpperCase();
  
  let urlFoto = null;
  if (c.nombreArchivoFoto) {
    urlFoto = await urlDesdeNombre(c.nombreArchivoFoto);
  }
  
  const imagenHTML = urlFoto
    ? `<img class="tarjeta-bordadora__imagen" 
            src="${escapar(urlFoto)}" 
            alt="Retrato de ${escapar(c.nombre)}"
            loading="lazy"
            onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'tarjeta-bordadora__placeholder\\'>${inicial}</div>'">`
    : `<div class="tarjeta-bordadora__placeholder">${inicial}</div>`;
  
  const lugar = c.localidad && c.localidad !== c.municipio
    ? `${c.localidad} · ${c.municipio}`
    : c.municipio;
  
  const cargoHTML = c.cargo
    ? `<div class="tarjeta-consejera__cargo">
         <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <path d="M12 2l2.39 7.36H22l-6.18 4.49 2.36 7.36L12 16.72l-6.18 4.49 2.36-7.36L2 9.36h7.61L12 2z"/>
         </svg>
         ${escapar(c.cargo)}
       </div>`
    : '';
  
  const colectivoHTML = c.colectivo
    ? `<p class="tarjeta-consejera__colectivo">Colectivo: <em>${escapar(c.colectivo)}</em></p>`
    : '';
  
  const experiencia = c.aniosExperiencia
    ? `${c.aniosExperiencia} años de experiencia`
    : "";
  
  return `
    <article class="tarjeta-bordadora tarjeta-consejera aparece" style="animation-delay: ${Math.min(idx * 0.04, 0.5)}s">
      <div class="tarjeta-bordadora__imagen-wrap">
        ${imagenHTML}
      </div>
      <div class="tarjeta-bordadora__contenido">
        ${cargoHTML}
        <div class="tarjeta-bordadora__lugar">${escapar(lugar)}</div>
        <h3 class="tarjeta-bordadora__nombre">${escapar(c.nombre)}</h3>
        ${colectivoHTML}
        <p class="tarjeta-bordadora__bio">${escapar(c.biografia)}</p>
        <div class="tarjeta-bordadora__pie">
          <span>${escapar(experiencia)}</span>
        </div>
      </div>
    </article>
  `;
}

function escapar(texto) {
  if (!texto) return "";
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
