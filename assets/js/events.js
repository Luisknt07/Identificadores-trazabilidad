import { EVENT_TYPES, LOCATION_EVENTS, QUANTITY_EVENTS, STOCK_IN_EVENTS, STOCK_OUT_EVENTS } from "./config.js";
import { api } from "./api.js";
import { state, productName } from "./state.js";
import { $, formatDate, productStatus, statusClass } from "./utils.js";
import { showFormError, toast } from "./ui.js";
import { showProductDetail } from "./products.js";

function movementText(event) { if (!event.cantidadMovimiento) return "Sin cambio"; return `${STOCK_OUT_EVENTS.has(event.evento) ? "-" : "+"}${event.cantidadMovimiento}`; }
function locationText(event) { if (event.ubicacionOrigen && event.ubicacionDestino) return `${event.ubicacionOrigen} → ${event.ubicacionDestino}`; return event.ubicacionDestino || event.ubicacion || event.ubicacionOrigen || "—"; }

function whenLibraryIsReady(name, callback, attempts = 40) {
  if (window[name]) { callback(); return; }
  if (attempts > 0) window.setTimeout(() => whenLibraryIsReady(name, callback, attempts - 1), 100);
}

function codeCard({ label, value, type }) {
  const card = document.createElement("article"); card.className = "trace-code-card";
  const title = document.createElement("strong"); title.textContent = label;
  const visual = document.createElement("div"); visual.className = `trace-code-visual ${type === "QR" ? "qr" : "barcode"}`;
  const code = document.createElement("code"); code.textContent = value;
  card.append(title, visual, code);
  if (type === "QR") {
    whenLibraryIsReady("QRCode", () => {
      try { new window.QRCode(visual, { text: value, width: 132, height: 132, colorDark: "#102a43", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M }); }
      catch { visual.textContent = "No se pudo representar este QR."; }
    });
  } else {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); visual.append(svg);
    whenLibraryIsReady("JsBarcode", () => {
      try { window.JsBarcode(svg, value, { format: type === "EAN13" ? "EAN13" : "CODE128", displayValue: false, margin: 4, height: 72, width: type === "EAN13" ? 1.7 : 1.35, lineColor: "#102a43" }); }
      catch { visual.textContent = "No se pudo representar este código."; }
    });
  }
  return card;
}

function productCodes(product) {
  const section = document.createElement("section"); section.className = "trace-identifiers";
  const heading = document.createElement("div"); heading.className = "trace-identifiers-head";
  const text = document.createElement("div"), kicker = document.createElement("span"), title = document.createElement("h4");
  kicker.className = "section-kicker"; kicker.textContent = "Identificación visual"; title.textContent = "Códigos asociados al producto"; text.append(kicker, title); heading.append(text); section.append(heading);
  const grid = document.createElement("div"); grid.className = "trace-code-grid";
  const entries = [];
  if (product.codigo1d) entries.push({ label: product.tipoCodigo1d || "Code 128", value: product.codigo1d, type: String(product.tipoCodigo1d).toUpperCase().includes("EAN") ? "EAN13" : "CODE128" });
  if (product.codigoQr) entries.push({ label: "Código QR", value: product.codigoQr, type: "QR" });
  if (product.codigoGenerado && !entries.some(entry => entry.value === product.codigoGenerado)) {
    const declared = String(product.tipoIdentificacion || "").toUpperCase();
    entries.push({ label: product.tipoIdentificacion || "Código generado", value: product.codigoGenerado, type: declared.includes("QR") ? "QR" : declared.includes("EAN") ? "EAN13" : "CODE128" });
  }
  if (entries.length) entries.forEach(entry => grid.append(codeCard(entry)));
  else { const empty = document.createElement("p"); empty.className = "trace-code-empty"; empty.textContent = "Este producto aún no tiene códigos visuales asociados."; grid.append(empty); }
  section.append(grid); return section;
}

export function renderEvents() {
  const query = state.filters.eventSearch.toLowerCase(); const events = [...state.events].filter(event => (!query || [event.idEvento, event.idProducto, productName(event.idProducto), event.codigoLeido, event.actor].join(" ").toLowerCase().includes(query)) && (!state.filters.eventType || event.evento === state.filters.eventType)).sort((a,b) => new Date(b.fechaHora)-new Date(a.fechaHora));
  const body = $("#eventsBody"); body.replaceChildren();
  if (!events.length) { const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 9; cell.className = "empty-state"; cell.textContent = state.source === "published-csv" ? "Configura Apps Script para cargar y registrar eventos." : "No hay eventos que coincidan con la consulta."; }
  events.forEach(event => { const row = body.insertRow(); const values = [formatDate(event.fechaHora), event.idEvento, productName(event.idProducto), event.evento, movementText(event), `${event.stockAntes} → ${event.stockDespues}`, locationText(event), event.actor]; values.forEach((value,index) => { const cell = row.insertCell(); cell.textContent = value; if (index === 1) cell.className = "mono"; }); const cell = row.insertCell(); const badge = document.createElement("span"); badge.className = `badge ${statusClass(event.estado)}`; badge.textContent = event.estado; cell.append(badge); });
}

function updateEventFields() {
  const type = $("#eventType").value, product = state.products.find(item => item.idProducto === $("#eventProduct").value), quantityInput = $("#eventForm").elements.cantidadMovimiento;
  $("#eventQuantityField").hidden = !QUANTITY_EVENTS.has(type); quantityInput.required = QUANTITY_EVENTS.has(type);
  $("#originLocationField").hidden = !LOCATION_EVENTS.has(type) && type !== "Despacho";
  $("#destinationLocationField").hidden = !LOCATION_EVENTS.has(type) && type !== "Despacho" && type !== "Recepción";
  const quantity = Number(quantityInput.value) || 0, preview = $("#eventStockPreview");
  if (!product || !QUANTITY_EVENTS.has(type) || quantity <= 0) { preview.hidden = true; return; }
  const after = product.cantidad + (STOCK_IN_EVENTS.has(type) ? quantity : -quantity); preview.hidden = false; preview.textContent = `Stock previsto: ${product.cantidad} → ${after}${after < 0 ? " · Stock insuficiente" : ""}`; preview.style.background = after < 0 ? "var(--danger-soft)" : "var(--brand-soft)"; preview.style.color = after < 0 ? "var(--danger)" : "var(--brand-dark)";
}

export function openEventDialog(productId = "") {
  const form = $("#eventForm"); form.reset(); $("#eventProduct").value = productId; showFormError("#eventFormError"); updateEventFields(); $("#eventDialog").showModal();
}

export function renderTrace(productId) {
  const product = state.products.find(item => item.idProducto === productId), root = $("#traceContent"); root.replaceChildren();
  if (!product) { const empty = document.createElement("div"); empty.className = "panel empty-state"; empty.textContent = "Selecciona un producto válido."; root.append(empty); return; }
  const summary = document.createElement("article"); summary.className = "panel trace-summary"; const head = document.createElement("div"); head.className = "trace-summary-head"; const titleBox = document.createElement("div"), title = document.createElement("h3"), subtitle = document.createElement("p"), status = document.createElement("span"); title.textContent = product.nombre; subtitle.textContent = product.idProducto; status.className = `badge ${statusClass(productStatus(product))}`; status.textContent = productStatus(product); titleBox.append(title, subtitle);
  const headActions = document.createElement("div"); headActions.className = "trace-summary-actions"; const detail = document.createElement("button"); detail.className = "button secondary"; detail.innerHTML = '<i data-lucide="eye"></i>Ver ficha completa'; detail.addEventListener("click", () => showProductDetail(product)); headActions.append(status, detail); head.append(titleBox, headActions);
  const meta = document.createElement("div"); meta.className = "trace-meta"; [["Categoría", product.categoria], ["Lote", product.lote], ["Stock vigente", `${product.cantidad} unidades`], ["Ubicación actual", product.ubicacionActual], ["Origen", product.origen || "—"], ["Destino", product.destino || "—"], ["Vencimiento", product.fechaVencimiento || "—"], ["Actualización", formatDate(product.ultimaActualizacion)]].forEach(([label,value]) => { const box = document.createElement("div"), span = document.createElement("span"), strong = document.createElement("strong"); span.textContent = label; strong.textContent = value; box.append(span,strong); meta.append(box); }); summary.append(head, meta, productCodes(product));
  const timeline = document.createElement("article"); timeline.className = "panel timeline"; const events = state.events.filter(event => event.idProducto === productId).sort((a,b) => new Date(b.fechaHora)-new Date(a.fechaHora));
  if (!events.length) { const empty = document.createElement("div"); empty.className = "empty-state"; empty.innerHTML = state.source === "published-csv" ? "Configura Apps Script para consultar el historial de eventos." : "Este producto todavía no tiene eventos."; timeline.append(empty); }
  events.forEach(event => { const item = document.createElement("div"); item.className = "timeline-item"; const dot = document.createElement("span"); dot.className = "timeline-dot"; const eventHead = document.createElement("div"); eventHead.className = "timeline-head"; const strong = document.createElement("strong"); strong.textContent = event.evento.toUpperCase(); const time = document.createElement("time"); time.textContent = formatDate(event.fechaHora); eventHead.append(strong,time); const route = document.createElement("p"); route.textContent = `${locationText(event)}${event.cantidadMovimiento ? ` · ${movementText(event)} unidades · Stock ${event.stockAntes} → ${event.stockDespues}` : ""}`; const actor = document.createElement("small"); actor.textContent = `Actor: ${event.actor}${event.observacion ? ` · ${event.observacion}` : ""}`; item.append(dot,eventHead,route,actor); timeline.append(item); });
  root.append(summary,timeline); window.lucide?.createIcons();
}

export function bindEvents() {
  const type = $("#eventType"), filter = $("#eventTypeFilter"); EVENT_TYPES.forEach(value => { type.add(new Option(value,value)); filter.add(new Option(value,value)); });
  $("#newEventBtn").addEventListener("click", () => openEventDialog()); document.addEventListener("event:open", event => openEventDialog(event.detail));
  ["#eventType", "#eventProduct"].forEach(selector => $(selector).addEventListener("change", updateEventFields)); $("#eventForm").elements.cantidadMovimiento.addEventListener("input", updateEventFields);
  $("#eventSearch").addEventListener("input", event => { state.filters.eventSearch = event.target.value; renderEvents(); }); $("#eventTypeFilter").addEventListener("change", event => { state.filters.eventType = event.target.value; renderEvents(); });
  $("#traceProduct").addEventListener("change", event => renderTrace(event.target.value)); document.addEventListener("trace:render", event => renderTrace(event.detail));
  $("#eventForm").addEventListener("submit", async event => {
    event.preventDefault(); const form = event.currentTarget; showFormError("#eventFormError"); if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form)), product = state.products.find(item => item.idProducto === data.idProducto); data.cantidadMovimiento = Number(data.cantidadMovimiento) || 0;
    if (!product) return showFormError("#eventFormError", "Selecciona un producto registrado.");
    if (QUANTITY_EVENTS.has(data.evento) && data.cantidadMovimiento <= 0) return showFormError("#eventFormError", "La cantidad debe ser mayor que cero.");
    if (STOCK_OUT_EVENTS.has(data.evento) && data.cantidadMovimiento > product.cantidad) return showFormError("#eventFormError", `Stock insuficiente. Disponible: ${product.cantidad}.`);
    if (LOCATION_EVENTS.has(data.evento) && !data.ubicacionDestino.trim()) return showFormError("#eventFormError", "La ubicación destino es obligatoria para este evento.");
    const button = $("#saveEventBtn"); button.disabled = true;
    try { const result = await api.createEvent(data); $("#eventDialog").close(); toast("Evento registrado", `${data.evento} confirmado. Stock: ${result.stockAntes} → ${result.stockDespues}.`); document.dispatchEvent(new Event("data:refresh")); }
    catch (error) { showFormError("#eventFormError", error.message); }
    finally { button.disabled = false; }
  });
}
