/**
 * inicio.js
 * 
 * Lógica específica de la página de Inicio:
 *   - Toggle del menú móvil
 *   - Carga de configuración dinámica (correos, redes, cifras)
 *   - Carga de piezas destacadas (con imágenes desde Drive)
 *   - Animaciones de scroll
 */

import { cargarDestacadas, renderizarTarjetasPiezas, precargarImagenes } from "./catalogo.js";
import { cargarYAplicarConfiguracion } from "./config-dinamica.js";

document.addEventListener("DOMContentLoaded", () => {
  inicializarMenuMovil();
  cargarYAplicarConfiguracion();
  precargarImagenes(); // arranca la carga del mapa de Drive en paralelo
  cargarPiezasDestacadas();
  inicializarScrollAnimations();
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

async function cargarPiezasDestacadas() {
  const contenedor = document.querySelector("#destacadas-grid");
  if (!contenedor) return;
  
  try {
    const piezas = await cargarDestacadas();
    
    if (piezas.length === 0) {
      contenedor.innerHTML = `
        <div class="error-carga">
          <p>Próximamente: piezas destacadas del catálogo del Consejo.</p>
        </div>
      `;
      return;
    }
    
    const html = await renderizarTarjetasPiezas(piezas);
    contenedor.innerHTML = html;
    
    // Animación staggered post-renderizado
    contenedor.querySelectorAll(".tarjeta-pieza").forEach((tarjeta, idx) => {
      tarjeta.style.animationDelay = `${idx * 0.1}s`;
    });
  } catch (error) {
    console.error("Error al cargar destacadas:", error);
    contenedor.innerHTML = `
      <div class="error-carga">
        <p>No fue posible cargar el catálogo en este momento. Por favor, intenta de nuevo más tarde.</p>
      </div>
    `;
  }
}

function inicializarScrollAnimations() {
  if (!("IntersectionObserver" in window)) return;
  
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("aparece");
          observador.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
  );
  
  document.querySelectorAll(".reveal").forEach(el => observador.observe(el));
}
