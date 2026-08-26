import { state } from "./state.js";
import { $, formatDate, productStatus, safeText, statusClass } from "./utils.js";

function filtered() {
  const query = state.filters.inventorySearch.toLowerCase();
  return state.products.filter(product => (!query || [product.idProducto, product.nombre, product.categoria, product.lote, product.ubicacionActual].join(" ").toLowerCase().includes(query)) && (!state.filters.inventoryStatus || productStatus(product) === state.filters.inventoryStatus) && (!state.filters.inventoryCategory || product.categoria === state.filters.inventoryCategory));
}
function kpi(icon, value, label, tone) { const item = document.createElement("article"); item.className = `panel kpi-card ${tone}`; item.innerHTML = `<div class="kpi-icon"><i data-lucide="${icon}"></i></div><strong>${value}</strong><span>${label}</span>`; return item; }

export function renderInventory() {
  const products = filtered(), totalUnits = state.products.reduce((sum, item) => sum + item.cantidad, 0), categories = [...new Set(state.products.map(item => item.categoria))];
  const kpis = $("#inventoryKpis"); kpis.replaceChildren(kpi("package-2", state.products.length, "Productos", "teal"), kpi("boxes", totalUnits, "Unidades", "blue"), kpi("layers-3", categories.length, "Categorías", "green"), kpi("triangle-alert", state.products.filter(p => productStatus(p) === "Stock bajo").length, "Stock bajo", "orange"), kpi("package-x", state.products.filter(p => productStatus(p) === "Agotado").length, "Agotados", "red"));
  const body = $("#inventoryBody"); body.replaceChildren();
  if (!products.length) { const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 8; cell.textContent = "No hay existencias que coincidan con los filtros."; cell.className = "empty-state"; }
  products.forEach(product => { const row = body.insertRow(); [product.idProducto, product.nombre, product.categoria, product.lote, product.cantidad, product.ubicacionActual].forEach((value, index) => { const cell = row.insertCell(); cell.textContent = safeText(value); if (index === 0) cell.className = "mono"; if (index === 4) cell.className = "stock-number"; }); const status = row.insertCell(); const badge = document.createElement("span"); badge.className = `badge ${statusClass(productStatus(product))}`; badge.textContent = productStatus(product); status.append(badge); row.insertCell().textContent = formatDate(product.ultimaActualizacion); });
  renderCategories(); window.lucide?.createIcons();
}

function renderCategories() {
  const list = $("#categoryList"); list.replaceChildren(); const groups = new Map();
  state.products.forEach(product => { const current = groups.get(product.categoria) || { products: 0, units: 0 }; current.products += 1; current.units += product.cantidad; groups.set(product.categoria, current); });
  const all = document.createElement("button"); all.className = `category-item ${!state.filters.inventoryCategory ? "active" : ""}`; all.innerHTML = `<strong>Todas</strong><span>${state.products.length} productos</span><b>${state.products.reduce((sum,p)=>sum+p.cantidad,0)}</b>`; all.addEventListener("click", () => { state.filters.inventoryCategory = ""; renderInventory(); }); list.append(all);
  [...groups.entries()].sort().forEach(([name, values]) => { const button = document.createElement("button"); button.className = `category-item ${state.filters.inventoryCategory === name ? "active" : ""}`; const strong = document.createElement("strong"); strong.textContent = name; const span = document.createElement("span"); span.textContent = `${values.products} productos`; const count = document.createElement("b"); count.textContent = values.units; button.append(strong, span, count); button.addEventListener("click", () => { state.filters.inventoryCategory = name; renderInventory(); }); list.append(button); });
}

export function bindInventory() {
  $("#inventorySearch").addEventListener("input", event => { state.filters.inventorySearch = event.target.value; renderInventory(); });
  $("#inventoryStatus").addEventListener("change", event => { state.filters.inventoryStatus = event.target.value; renderInventory(); });
}
