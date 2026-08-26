import { $, $$ } from "./utils.js";

const titles = {
  dashboard: ["Dashboard", "Resumen operativo"], products: ["Productos", "Catálogo de productos"], generator: ["Generar códigos", "Centro de etiquetado"],
  scanner: ["Escáner", "Lectura de identificadores"], rfid: ["RFID", "Identificación simulada"], inventory: ["Inventario", "Existencias vigentes"],
  locations: ["Ubicaciones", "Maestro geográfico"], map: ["Mapa", "Visibilidad espacial"],
  trace: ["Trazabilidad", "Historia del producto"], events: ["Eventos", "Bitácora logística"], help: ["Ayuda", "Conexión y configuración"]
};

export function navigate(view) {
  $$(".view").forEach(section => section.classList.toggle("active", section.id === `view-${view}`));
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  $("#breadcrumb").textContent = titles[view]?.[0] || view; $("#pageTitle").textContent = titles[view]?.[1] || view;
  closeSidebar(); window.scrollTo({ top: 0 });
  document.dispatchEvent(new CustomEvent("logitrace:navigate", { detail: view }));
}

export function openSidebar() { $("#sidebar").classList.add("open"); $("#sidebarBackdrop").hidden = false; $("#menuToggle").setAttribute("aria-expanded", "true"); }
export function closeSidebar() { $("#sidebar").classList.remove("open"); $("#sidebarBackdrop").hidden = true; $("#menuToggle").setAttribute("aria-expanded", "false"); }
export function setLoading(show) { $("#globalLoader").hidden = !show; }
export function setConnection(status, detail = "") {
  const pill = $("#connectionPill"); pill.className = `connection-pill ${status}`;
  $("strong", pill).textContent = status === "online" ? "Conectado" : status === "error" ? "Sin conexión" : "Conectando";
  $("#lastSync").textContent = detail || "Sin sincronizar";
}
export function toast(title, message = "", type = "success") {
  const item = document.createElement("div"); item.className = `toast ${type}`;
  const strong = document.createElement("strong"); strong.textContent = title; const span = document.createElement("span"); span.textContent = message;
  item.append(strong, span); $("#toastRegion").append(item); setTimeout(() => item.remove(), 4500);
}
export function showFormError(selector, message = "") { const node = $(selector); node.textContent = message; node.hidden = !message; }
export function fillSelect(select, items, { placeholder = "Seleccionar", value = item => item.idProducto, label = item => `${item.idProducto} · ${item.nombre}` } = {}) {
  const current = select.value; select.replaceChildren(new Option(placeholder, "")); items.forEach(item => select.add(new Option(label(item), value(item)))); if ([...select.options].some(option => option.value === current)) select.value = current;
}
export function badge(status) { const span = document.createElement("span"); span.className = "badge neutral"; span.textContent = status; return span; }
