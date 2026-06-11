/**
 * bordadoras.js
 * Carga y renderiza el directorio de bordadoras desde la Sheet.
 * Usa drive-loader para resolver imágenes desde Drive.
 */

import { cargarBordadoras } from "./catalogo.js";
import { urlDesdeNombre } from "./drive-loader.js";
import { cargarYAplicarConfiguracion } from "./config-dinamica.js";

document.addEventListener("DOMContentLoaded", () => {
  inicializarMenuMovil();
  cargarYAplicarConfiguracion();
  cargarYRenderizarBordadoras();
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

async function cargarYRenderizarBordadoras() {
  const contenedor = document.querySelector("#bordadoras-grid");
  if (!contenedor) return;
  
  try {
    const bordadoras = await cargarBordadoras();
    
    if (bordadoras.length === 0) {
      contenedor.innerHTML = `
        <div class="sin-resultados" style="grid-column: 1/-1;">
          <p>Próximamente: directorio de bordadoras del Consejo.</p>
        </div>
      `;
      return;
    }
    
    // Renderizar todas en paralelo (resolviendo imágenes simultáneamente)
    const tarjetas = await Promise.all(
      bordadoras.map((b, idx) => renderizarTarjeta(b, idx))
    );
    contenedor.innerHTML = tarjetas.join("");
  } catch (error) {
    console.error("Error cargando bordadoras:", error);
    contenedor.innerHTML = `
      <div class="sin-resultados" style="grid-column: 1/-1;">
        <p>No fue posible cargar el directorio en este momento.</p>
      </div>
    `;
  }
}

async function renderizarTarjeta(bordadora, idx) {
  const inicial = bordadora.nombre.charAt(0).toUpperCase();
  
  // Resolver foto desde Drive
  let urlFoto = null;
  if (bordadora.nombreArchivoFoto) {
    urlFoto = await urlDesdeNombre(bordadora.nombreArchivoFoto);
  }
  
  const imagenHTML = urlFoto
    ? `<img class="tarjeta-bordadora__imagen" 
            src="${escapar(urlFoto)}" 
            alt="Retrato de ${escapar(bordadora.nombre)}"
            loading="lazy"
            onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'tarjeta-bordadora__placeholder\\'>${inicial}</div>'">`
    : `<div class="tarjeta-bordadora__placeholder">${inicial}</div>`;
  
  const lugar = bordadora.localidad && bordadora.localidad !== bordadora.municipio
    ? `${bordadora.localidad} · ${bordadora.municipio}`
    : bordadora.municipio;
  
  const experiencia = bordadora.aniosExperiencia
    ? `${bordadora.aniosExperiencia} años bordando`
    : "";
  
  // Si es consejera, mostrar etiqueta dorada
  const badgeConsejera = bordadora.esConsejera
    ? `<div class="tarjeta-consejera__cargo">
         <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <path d="M12 2l2.39 7.36H22l-6.18 4.49 2.36 7.36L12 16.72l-6.18 4.49 2.36-7.36L2 9.36h7.61L12 2z"/>
         </svg>
         Consejera
       </div>`
    : '';
  
  return `
    <article class="tarjeta-bordadora aparece" style="animation-delay: ${idx * 0.08}s">
      <div class="tarjeta-bordadora__imagen-wrap">
        ${imagenHTML}
      </div>
      <div class="tarjeta-bordadora__contenido">
        ${badgeConsejera}
        <div class="tarjeta-bordadora__lugar">${escapar(lugar)}</div>
        <h3 class="tarjeta-bordadora__nombre">${escapar(bordadora.nombre)}</h3>
        <p class="tarjeta-bordadora__tecnica">${escapar(bordadora.tecnicaPrincipal)}</p>
        <p class="tarjeta-bordadora__bio">${escapar(bordadora.biografia)}</p>
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
