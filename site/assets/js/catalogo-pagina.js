/**
 * catalogo-pagina.js
 * Lógica de la página de Catálogo: carga, filtra y renderiza productos.
 * Las imágenes se resuelven desde Drive vía drive-loader.
 */

import {
  cargarProductosPublicados,
  renderizarTarjetasPiezas,
  precargarImagenes
} from "./catalogo.js";
import { cargarYAplicarConfiguracion } from "./config-dinamica.js";

let productosCompletos = [];
let filtroActivo = { tipo: "todas", valor: null };

document.addEventListener("DOMContentLoaded", async () => {
  inicializarMenuMovil();
  cargarYAplicarConfiguracion();
  precargarImagenes();
  await cargarYRenderizar();
  inicializarFiltros();
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

async function cargarYRenderizar() {
  try {
    productosCompletos = await cargarProductosPublicados();
    construirChipsDinamicos();
    await renderizarProductos(productosCompletos);
  } catch (error) {
    console.error("Error cargando catálogo:", error);
    const grid = document.querySelector("#catalogo-grid");
    if (grid) {
      grid.innerHTML = `
        <div class="sin-resultados">
          <p>No fue posible cargar el catálogo en este momento. Por favor, intenta de nuevo más tarde.</p>
        </div>
      `;
    }
  }
}

function construirChipsDinamicos() {
  const categorias = obtenerValoresUnicos(productosCompletos, "categoria");
  
  const grupoCat = document.querySelector("#filtro-categorias");
  if (grupoCat) {
    grupoCat.innerHTML = `
      <button class="filtro-chip" data-tipo="todas" aria-pressed="true">Todas</button>
      ${categorias.map(c => `
        <button class="filtro-chip" data-tipo="categoria" data-valor="${escapar(c)}">
          ${escapar(c)}
        </button>
      `).join("")}
    `;
  }
}

function obtenerValoresUnicos(arr, campo) {
  return [...new Set(arr.map(item => item[campo]).filter(Boolean))].sort();
}

function inicializarFiltros() {
  document.querySelectorAll(".filtro-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const tipo = chip.dataset.tipo;
      const valor = chip.dataset.valor;
      
      document.querySelectorAll(".filtro-chip").forEach(c => {
        c.setAttribute("aria-pressed", "false");
      });
      chip.setAttribute("aria-pressed", "true");
      
      filtroActivo = { tipo, valor };
      aplicarFiltro();
    });
  });
}

async function aplicarFiltro() {
  let filtrados = productosCompletos;
  
  if (filtroActivo.tipo === "categoria") {
    filtrados = productosCompletos.filter(p => p.categoria === filtroActivo.valor);
  }
  
  await renderizarProductos(filtrados);
}

async function renderizarProductos(productos) {
  const grid = document.querySelector("#catalogo-grid");
  const contador = document.querySelector("#contador-piezas");
  
  if (!grid) return;
  
  if (productos.length === 0) {
    grid.innerHTML = `
      <div class="sin-resultados">
        <p class="sin-resultados__titulo">No hay piezas en esta categoría todavía</p>
        <p>Prueba con otro filtro o regresa pronto.</p>
      </div>
    `;
  } else {
    const html = await renderizarTarjetasPiezas(productos);
    grid.innerHTML = html;
    
    grid.querySelectorAll(".tarjeta-pieza").forEach((tarjeta, idx) => {
      tarjeta.style.animationDelay = `${Math.min(idx * 0.04, 0.4)}s`;
    });
  }
  
  if (contador) {
    const n = productos.length;
    contador.textContent = n === 1 ? "1 pieza" : `${n} piezas`;
  }
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
