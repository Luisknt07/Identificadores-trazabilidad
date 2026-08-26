import { EVENT_TYPES, LOCATION_EVENTS, QUANTITY_EVENTS, STOCK_IN_EVENTS, STOCK_OUT_EVENTS } from "./config.js";
import { api } from "./api.js";
import { state, productName } from "./state.js";
import { $, formatDate, productStatus, statusClass } from "./utils.js";
import { showFormError, toast } from "./ui.js";
import { showProductDetail } from "./products.js";
import { approximateTrackDistance, geoStatusLabel, hasCoordinates, resolveLocation } from "./geo.js";
import { geoBadge, renderTrackMap } from "./map.js";
import { locationName } from "./locations.js";

function movementText(event) { if (!event.cantidadMovimiento) return "Sin cambio"; return `${STOCK_OUT_EVENTS.has(event.evento) ? "-" : "+"}${event.cantidadMovimiento}`; }
function locationText(event) { if (event.ubicacionOrigen && event.ubicacionDestino) return `${event.ubicacionOrigen} → ${event.ubicacionDestino}`; return event.ubicacionDestino || event.ubicacion || event.ubicacionOrigen || "—"; }
let eventPickerMap = null;
let eventPickerMarker = null;

function setEventPosition({ lat, lon, accuracy = null, source = "MAPA" }) {
  $("#eventLat").value = Number(lat).toFixed(6); $("#eventLon").value = Number(lon).toFixed(6); $("#eventAccuracy").value = Number.isFinite(Number(accuracy)) ? Number(accuracy).toFixed(1) : ""; $("#eventLocationSource").value = source;
  const summary = $("#eventPositionSummary"); summary.replaceChildren(); const strong = document.createElement("strong"); strong.textContent = "Posición capturada"; const details = document.createElement("span"); details.textContent = `Lat ${Number(lat).toFixed(6)} · Lon ${Number(lon).toFixed(6)}${Number.isFinite(Number(accuracy)) ? ` · Precisión ± ${Math.round(accuracy)} m` : ""}`; const small = document.createElement("small"); small.textContent = `Fuente: ${source}. Menor precisión en metros significa una medición más exacta.`; summary.append(strong, details, small);
  if (eventPickerMap) { const point = [Number(lat), Number(lon)]; if (eventPickerMarker) eventPickerMarker.setLatLng(point); else eventPickerMarker = window.L.marker(point, { draggable: true }).addTo(eventPickerMap).on("dragend", event => { const p = event.target.getLatLng(); setEventPosition({ lat: p.lat, lon: p.lng, source: "MAPA" }); }); eventPickerMap.setView(point, Math.max(eventPickerMap.getZoom(), 16)); }
}

function resetEventPosition() {
  state.capturedPosition = null; ["#eventLat", "#eventLon", "#eventAccuracy"].forEach(selector => { $(selector).value = ""; }); $("#eventLocationSource").value = "SIN_GPS"; $("#eventPickerMap").hidden = true;
  const summary = $("#eventPositionSummary"); summary.innerHTML = "<span>Sin posición capturada</span><small>El evento podrá guardarse como SIN_GPS si no hay señal o permiso.</small>";
  if (eventPickerMap) { eventPickerMap.remove(); eventPickerMap = null; eventPickerMarker = null; }
}

function initEventPicker() {
  const root = $("#eventPickerMap"); root.hidden = false;
  if (!window.L) { root.textContent = "No se pudo cargar el mapa. Puedes continuar sin GPS."; return; }
  if (eventPickerMap) { eventPickerMap.invalidateSize(); return; }
  const declared = resolveLocation(state.locations, $("#eventDeclaredLocation").value); const center = declared && hasCoordinates(declared) ? [Number(declared.lat), Number(declared.lon)] : [0.1807, -78.4678];
  eventPickerMap = window.L.map(root).setView(center, declared && hasCoordinates(declared) ? 16 : 7);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(eventPickerMap);
  if (declared && hasCoordinates(declared) && Number(declared.radioGeocercaM) > 0) window.L.circle(center, { radius: Number(declared.radioGeocercaM), color: "#2b8a7e", fillOpacity: .08 }).addTo(eventPickerMap);
  eventPickerMap.on("click", event => setEventPosition({ lat: event.latlng.lat, lon: event.latlng.lng, source: "MAPA" })); window.setTimeout(() => eventPickerMap.invalidateSize(), 80);
}

function captureEventPosition() {
  showFormError("#eventFormError");
  if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(location.hostname)) return showFormError("#eventFormError", "La geolocalización requiere HTTPS o localhost. Publica en GitHub Pages o utiliza el servidor local.");
  if (!navigator.geolocation) { showFormError("#eventFormError", "El navegador no dispone de GPS. Selecciona la posición manualmente en el mapa."); initEventPicker(); return; }
  const button = $("#captureEventPositionBtn"); button.disabled = true;
  navigator.geolocation.getCurrentPosition(position => { button.disabled = false; setEventPosition({ lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy, source: "GPS" }); }, error => { button.disabled = false; showFormError("#eventFormError", `${error.message || "No fue posible obtener la posición"}. Puedes seleccionar la posición manualmente o continuar como SIN_GPS.`); initEventPicker(); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

function showGeoResult(event, geoValidation = {}) {
  const root = $("#geoResultContent"); root.replaceChildren(); const status = geoValidation.status || event.validacionGeo || "SIN_GPS";
  const head = document.createElement("div"); head.className = "geo-result-head"; const icon = document.createElement("i"); icon.dataset.lucide = status === "OK" ? "badge-check" : status === "FUERA_GEOCERCA" ? "triangle-alert" : status === "BAJA_PRECISION" ? "locate" : "map-pin-off"; const title = document.createElement("div"); const kicker = document.createElement("span"); kicker.className = "section-kicker"; kicker.textContent = "Evento registrado"; const heading = document.createElement("h2"); heading.textContent = geoStatusLabel(status); title.append(kicker, heading); head.append(icon, title);
  const grid = document.createElement("div"); grid.className = "detail-grid"; [["Producto", productName(event.idProducto)], ["Evento", event.evento], ["Ubicación declarada", geoValidation.declaredLocation || locationName(event.idUbicacionDeclarada)], ["Distancia", geoValidation.distanceMeters === null || geoValidation.distanceMeters === undefined ? "No calculable" : `${Number(geoValidation.distanceMeters).toFixed(1)} m`], ["Geocerca", geoValidation.geofenceRadiusMeters ? `${geoValidation.geofenceRadiusMeters} m` : "—"], ["Precisión", geoValidation.accuracyMeters === null || geoValidation.accuracyMeters === undefined ? "—" : `± ${Math.round(geoValidation.accuracyMeters)} m`]].forEach(([label, value]) => { const box = document.createElement("div"); const span = document.createElement("span"); span.textContent = label; const strong = document.createElement("strong"); strong.textContent = value; box.append(span, strong); grid.append(box); }); root.append(head, grid); $("#geoResultDialog").showModal(); window.lucide?.createIcons();
}

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
  if (!events.length) { const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 10; cell.className = "empty-state"; cell.textContent = state.source === "published-csv" ? "Configura Apps Script para cargar y registrar eventos." : "No hay eventos que coincidan con la consulta."; }
  events.forEach(event => { const row = body.insertRow(); const values = [formatDate(event.fechaHora), event.idEvento, productName(event.idProducto), event.evento, movementText(event), `${event.stockAntes} → ${event.stockDespues}`, locationText(event), event.actor]; values.forEach((value,index) => { const cell = row.insertCell(); cell.textContent = value; if (index === 1) cell.className = "mono"; }); const geoCell = row.insertCell(); geoCell.append(geoBadge(event.validacionGeo || "SIN_GPS")); const cell = row.insertCell(); const badge = document.createElement("span"); badge.className = `badge ${statusClass(event.estado)}`; badge.textContent = event.estado; cell.append(badge); });
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
  const form = $("#eventForm"); form.reset(); resetEventPosition(); $("#eventProduct").value = productId; showFormError("#eventFormError"); const product = state.products.find(item => item.idProducto === productId); if (product?.ubicacionActual && state.locations.some(item => item.idUbicacion === product.ubicacionActual)) { $("#eventDeclaredLocation").value = product.ubicacionActual; $("#eventOriginLocation").value = product.ubicacionActual; } updateEventFields(); $("#eventDialog").showModal();
}

export function renderTrace(productId) {
  const product = state.products.find(item => item.idProducto === productId), root = $("#traceContent"); root.replaceChildren();
  if (!product) { const empty = document.createElement("div"); empty.className = "panel empty-state"; empty.textContent = "Selecciona un producto válido."; root.append(empty); return; }
  const summary = document.createElement("article"); summary.className = "panel trace-summary"; const head = document.createElement("div"); head.className = "trace-summary-head"; const titleBox = document.createElement("div"), title = document.createElement("h3"), subtitle = document.createElement("p"), status = document.createElement("span"); title.textContent = product.nombre; subtitle.textContent = product.idProducto; status.className = `badge ${statusClass(productStatus(product))}`; status.textContent = productStatus(product); titleBox.append(title, subtitle);
  const headActions = document.createElement("div"); headActions.className = "trace-summary-actions"; const detail = document.createElement("button"); detail.className = "button secondary"; detail.innerHTML = '<i data-lucide="eye"></i>Ver ficha completa'; detail.addEventListener("click", () => showProductDetail(product)); headActions.append(status, detail); head.append(titleBox, headActions);
  const meta = document.createElement("div"); meta.className = "trace-meta"; [["Categoría", product.categoria], ["Lote", product.lote], ["Stock vigente", `${product.cantidad} unidades`], ["Ubicación actual", locationName(product.ubicacionActual)], ["Origen", locationName(product.origen)], ["Destino", locationName(product.destino)], ["Vencimiento", product.fechaVencimiento || "—"], ["Actualización", formatDate(product.ultimaActualizacion)]].forEach(([label,value]) => { const box = document.createElement("div"), span = document.createElement("span"), strong = document.createElement("strong"); span.textContent = label; strong.textContent = value; box.append(span,strong); meta.append(box); }); summary.append(head, meta, productCodes(product));
  const timeline = document.createElement("article"); timeline.className = "panel timeline"; const events = state.events.filter(event => event.idProducto === productId).sort((a,b) => new Date(b.fechaHora)-new Date(a.fechaHora));
  if (!events.length) { const empty = document.createElement("div"); empty.className = "empty-state"; empty.innerHTML = state.source === "published-csv" ? "Configura Apps Script para consultar el historial de eventos." : "Este producto todavía no tiene eventos."; timeline.append(empty); }
  events.forEach(event => { const item = document.createElement("div"); item.className = "timeline-item"; const dot = document.createElement("span"); dot.className = "timeline-dot"; const eventHead = document.createElement("div"); eventHead.className = "timeline-head"; const strong = document.createElement("strong"); strong.textContent = event.evento.toUpperCase(); const time = document.createElement("time"); time.textContent = formatDate(event.fechaHora); eventHead.append(strong,time); const route = document.createElement("p"); route.textContent = `${locationText(event)}${event.cantidadMovimiento ? ` · ${movementText(event)} unidades · Stock ${event.stockAntes} → ${event.stockDespues}` : ""}`; const geo = geoBadge(event.validacionGeo || "SIN_GPS"); const actor = document.createElement("small"); actor.textContent = `Actor: ${event.actor}${event.observacion ? ` · ${event.observacion}` : ""}`; item.append(dot,eventHead,route,geo,actor); timeline.append(item); });
  const geoSection = document.createElement("section"); geoSection.className = "panel trace-geo"; const geoHead = document.createElement("div"); geoHead.className = "panel-head"; const geoTitle = document.createElement("div"); const geoKicker = document.createElement("span"); geoKicker.className = "section-kicker"; geoKicker.textContent = "Trayectoria geográfica"; const geoHeading = document.createElement("h3"); geoHeading.textContent = "Recorrido y validaciones"; geoTitle.append(geoKicker, geoHeading); const centerButton = document.createElement("button"); centerButton.className = "button secondary"; centerButton.textContent = "Centrar trayectoria"; centerButton.addEventListener("click", () => renderTrackMap(mapRoot, events, "trace")); geoHead.append(geoTitle, centerButton);
  const georeferenced = events.filter(hasCoordinates); const geoKpis = document.createElement("div"); geoKpis.className = "trace-geo-kpis"; const statusCount = status => events.filter(event => (event.validacionGeo || "SIN_GPS") === status).length; [["Georreferenciados", georeferenced.length], ["OK", statusCount("OK")], ["Fuera", statusCount("FUERA_GEOCERCA")], ["Baja precisión", statusCount("BAJA_PRECISION")], ["Sin GPS", events.length - georeferenced.length], ["Distancia aproximada", `${(approximateTrackDistance(events) / 1000).toFixed(2)} km`]].forEach(([label, value]) => { const box = document.createElement("div"); const strong = document.createElement("strong"); strong.textContent = value; const span = document.createElement("span"); span.textContent = label; box.append(strong, span); geoKpis.append(box); }); const note = document.createElement("p"); note.className = "map-note"; note.textContent = `${events.length - georeferenced.length} eventos no pudieron representarse por falta de coordenadas. La distancia es geodésica entre eventos, no una ruta vial.`; const mapRoot = document.createElement("div"); mapRoot.className = "trace-map logistics-map"; geoSection.append(geoHead, geoKpis, mapRoot, note);
  root.append(summary,timeline,geoSection); renderTrackMap(mapRoot, events, "trace"); window.lucide?.createIcons();
}

export function bindEvents() {
  const type = $("#eventType"), filter = $("#eventTypeFilter"), mapFilter = $("#mapEventFilter"); EVENT_TYPES.forEach(value => { type.add(new Option(value,value)); filter.add(new Option(value,value)); mapFilter.add(new Option(value,value)); });
  $("#newEventBtn").addEventListener("click", () => openEventDialog()); document.addEventListener("event:open", event => openEventDialog(event.detail));
  ["#eventType", "#eventProduct"].forEach(selector => $(selector).addEventListener("change", updateEventFields)); $("#eventForm").elements.cantidadMovimiento.addEventListener("input", updateEventFields);
  $("#captureEventPositionBtn").addEventListener("click", captureEventPosition); $("#selectEventMapBtn").addEventListener("click", initEventPicker); $("#eventDeclaredLocation").addEventListener("change", () => { if (eventPickerMap) { eventPickerMap.remove(); eventPickerMap = null; eventPickerMarker = null; initEventPicker(); } });
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
    try { const result = await api.createEvent(data); const savedEvent = result.event || result; $("#eventDialog").close(); toast("Evento registrado", `${data.evento} confirmado. Stock: ${savedEvent.stockAntes} → ${savedEvent.stockDespues}.`); showGeoResult(savedEvent, result.geoValidation || {}); document.dispatchEvent(new Event("data:refresh")); }
    catch (error) { showFormError("#eventFormError", error.message); }
    finally { button.disabled = false; }
  });
}
