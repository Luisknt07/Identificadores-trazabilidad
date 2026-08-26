import { CONFIG } from "./config.js";
import { state, productName } from "./state.js";
import { $, formatDate } from "./utils.js";
import { buildEventsGeoJSON, buildLocationsGeoJSON, downloadGeoJSON, geoStatusClass, geoStatusIcon, geoStatusLabel, hasCoordinates, resolveLocation } from "./geo.js";
import { locationName } from "./locations.js";
import { navigate, toast } from "./ui.js";

function tileLayer(map) { return window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map); }
function clearMap(key) { if (state.maps[key]) { state.maps[key].remove(); delete state.maps[key]; } }
function mapIcon(label, tone = "teal") { return window.L.divIcon({ className: "map-div-icon", html: `<span class="map-marker ${tone}">${label}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] }); }
function typeSymbol(type = "") { if (/planta|producción/i.test(type)) return "P"; if (/distribución|almacén/i.test(type)) return "CD"; if (/proveedor/i.test(type)) return "PR"; if (/cliente/i.test(type)) return "CL"; if (/rack|muelle|interna/i.test(type)) return "IN"; return "U"; }
function typeTone(type = "") { if (/planta|producción/i.test(type)) return "navy"; if (/distribución|almacén/i.test(type)) return "teal"; if (/proveedor/i.test(type)) return "blue"; if (/cliente/i.test(type)) return "orange"; return "slate"; }

function popupRows(rows, actions = []) {
  const root = document.createElement("div"); root.className = "map-popup";
  rows.forEach(([label, value]) => { const line = document.createElement("div"); const span = document.createElement("span"); const strong = document.createElement("strong"); span.textContent = label; strong.textContent = value ?? "—"; line.append(span, strong); root.append(line); });
  if (actions.length) { const box = document.createElement("div"); box.className = "map-popup-actions"; actions.forEach(action => { const button = document.createElement("button"); button.type = "button"; button.className = "text-button"; button.textContent = action.label; button.addEventListener("click", action.run); box.append(button); }); root.append(box); }
  return root;
}

function filteredEvents() {
  const filters = state.filters;
  return state.events.filter(event => (!filters.mapProduct || event.idProducto === filters.mapProduct) && (!filters.mapEvent || event.evento === filters.mapEvent) && (!filters.mapStatus || (event.validacionGeo || "SIN_GPS") === filters.mapStatus) && (!filters.mapLocation || event.idUbicacionDeclarada === filters.mapLocation) && (!filters.mapFrom || new Date(event.fechaHora) >= new Date(`${filters.mapFrom}T00:00:00`)) && (!filters.mapTo || new Date(event.fechaHora) <= new Date(`${filters.mapTo}T23:59:59`)));
}

export function renderLogisticsMap({ fit = true } = {}) {
  const root = $("#logisticsMap"); if (!root) return;
  if (!window.L) { root.innerHTML = '<div class="map-unavailable"><strong>Mapa no disponible</strong><span>Comprueba la conexión para cargar Leaflet y OpenStreetMap.</span></div>'; return; }
  clearMap("main"); const map = window.L.map(root).setView(CONFIG.DEFAULT_MAP_CENTER, CONFIG.DEFAULT_MAP_ZOOM); state.maps.main = map; tileLayer(map);
  const bounds = []; const showGeofences = $("#showGeofences").checked;
  state.locations.filter(location => location.activo && (!state.filters.mapLocation || location.idUbicacion === state.filters.mapLocation)).forEach(location => {
    const resolved = resolveLocation(state.locations, location.idUbicacion); if (!resolved || !hasCoordinates(resolved)) return;
    const point = [Number(resolved.lat), Number(resolved.lon)]; bounds.push(point);
    const marker = window.L.marker(point, { icon: mapIcon(typeSymbol(location.tipo), typeTone(location.tipo)) }).addTo(map);
    marker.bindPopup(popupRows([["Ubicación", location.nombre], ["Tipo", location.tipo], ["Dirección", location.direccion], ["Radio", resolved.radioGeocercaM ? `${resolved.radioGeocercaM} m` : "—"], ["ID", location.idUbicacion], ["Padre", locationName(location.padreId)]]));
    if (showGeofences && Number(resolved.radioGeocercaM) > 0 && resolved.effectiveLocationId === location.idUbicacion) window.L.circle(point, { radius: Number(resolved.radioGeocercaM), color: "#2b8a7e", fillColor: "#74d3c7", fillOpacity: .09, weight: 1.5 }).addTo(map);
  });
  const events = filteredEvents(); const geoEvents = events.filter(hasCoordinates);
  geoEvents.forEach(event => {
    const point = [Number(event.latCapturada), Number(event.lonCapturada)]; bounds.push(point); const status = event.validacionGeo || "SIN_GPS";
    const marker = window.L.marker(point, { icon: mapIcon(status === "OK" ? "✓" : status === "FUERA_GEOCERCA" ? "!" : "≈", status === "OK" ? "green" : status === "FUERA_GEOCERCA" ? "red" : "orange") }).addTo(map);
    marker.bindPopup(popupRows([["Producto", productName(event.idProducto)], ["Evento", event.evento], ["Fecha", formatDate(event.fechaHora)], ["Ubicación declarada", locationName(event.idUbicacionDeclarada)], ["Distancia", event.distanciaDeclaradaM === null ? "—" : `${Math.round(event.distanciaDeclaradaM)} m`], ["Precisión", event.precisionM === null ? "—" : `± ${Math.round(event.precisionM)} m`], ["Estado geo", geoStatusLabel(status)], ["Actor", event.actor]], [{ label: "Abrir trazabilidad", run: () => { $("#traceProduct").value = event.idProducto; navigate("trace"); document.dispatchEvent(new CustomEvent("trace:render", { detail: event.idProducto })); } }]));
  });
  $("#mapNoGpsCount").textContent = `${events.length - geoEvents.length} eventos sin coordenadas`;
  if (fit && bounds.length) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 }); window.setTimeout(() => map.invalidateSize(), 80);
}

export function renderTrackMap(container, events, key = "trace") {
  if (!container) return; if (!window.L) { container.innerHTML = '<div class="map-unavailable"><strong>Mapa no disponible</strong><span>Comprueba tu conexión.</span></div>'; return; }
  clearMap(key); const map = window.L.map(container).setView(CONFIG.DEFAULT_MAP_CENTER, CONFIG.DEFAULT_MAP_ZOOM); state.maps[key] = map; tileLayer(map);
  const points = [...events].filter(hasCoordinates).sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
  points.forEach((event, index) => { const point = [Number(event.latCapturada), Number(event.lonCapturada)]; window.L.marker(point, { icon: mapIcon(String(index + 1), event.validacionGeo === "FUERA_GEOCERCA" ? "red" : event.validacionGeo === "BAJA_PRECISION" ? "orange" : "green") }).addTo(map).bindPopup(popupRows([["Evento", `${index + 1} de ${points.length} · ${event.evento}`], ["Fecha", formatDate(event.fechaHora)], ["Lugar declarado", locationName(event.idUbicacionDeclarada)], ["Distancia", event.distanciaDeclaradaM === null ? "—" : `${Math.round(event.distanciaDeclaradaM)} m`], ["Precisión", event.precisionM === null ? "—" : `± ${Math.round(event.precisionM)} m`], ["Estado", geoStatusLabel(event.validacionGeo)], ["Stock", `${event.stockAntes} → ${event.stockDespues}`]])); });
  if (points.length > 1) window.L.polyline(points.map(event => [Number(event.latCapturada), Number(event.lonCapturada)]), { color: "#2364aa", weight: 4, opacity: .75, dashArray: "8 8" }).addTo(map);
  if (points.length) map.fitBounds(points.map(event => [Number(event.latCapturada), Number(event.lonCapturada)]), { padding: [34, 34], maxZoom: 16 }); window.setTimeout(() => map.invalidateSize(), 80);
}

export function geoBadge(status) { const span = document.createElement("span"); span.className = `badge geo-badge ${geoStatusClass(status)}`; const icon = document.createElement("i"); icon.dataset.lucide = geoStatusIcon(status); span.append(icon, document.createTextNode(geoStatusLabel(status))); return span; }

export function bindMap() {
  ["mapProductFilter", "mapEventFilter", "mapStatusFilter", "mapLocationFilter", "mapDateFrom", "mapDateTo"].forEach(id => { const node = $(`#${id}`); node.addEventListener("change", () => { const key = ({ mapProductFilter: "mapProduct", mapEventFilter: "mapEvent", mapStatusFilter: "mapStatus", mapLocationFilter: "mapLocation", mapDateFrom: "mapFrom", mapDateTo: "mapTo" })[id]; state.filters[key] = node.value; }); });
  $("#applyMapFilters").addEventListener("click", () => renderLogisticsMap()); $("#fitMapBtn").addEventListener("click", () => renderLogisticsMap()); $("#showGeofences").addEventListener("change", () => renderLogisticsMap());
  $("#clearMapFilters").addEventListener("click", () => { ["mapProductFilter", "mapEventFilter", "mapStatusFilter", "mapLocationFilter", "mapDateFrom", "mapDateTo"].forEach(id => { $(`#${id}`).value = ""; }); Object.assign(state.filters, { mapProduct: "", mapEvent: "", mapStatus: "", mapLocation: "", mapFrom: "", mapTo: "" }); renderLogisticsMap(); });
  $("#exportLocationsGeojson").addEventListener("click", () => { downloadGeoJSON(buildLocationsGeoJSON(state.locations), "ubicaciones.geojson"); toast("GeoJSON generado", "ubicaciones.geojson usa coordenadas [longitud, latitud]."); });
  $("#exportEventsGeojson").addEventListener("click", () => { downloadGeoJSON(buildEventsGeoJSON(filteredEvents()), "eventos.geojson"); toast("GeoJSON generado", "Solo se exportaron eventos con coordenadas válidas."); });
  document.addEventListener("logitrace:navigate", event => { if (event.detail === "map") window.setTimeout(() => renderLogisticsMap(), 50); });
  document.addEventListener("map:center", event => { const id = event.detail?.locationId || ""; state.filters.mapLocation = id; $("#mapLocationFilter").value = id; window.setTimeout(() => renderLogisticsMap(), 50); });
}
