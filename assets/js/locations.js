import { api } from "./api.js";
import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { $, safeText } from "./utils.js";
import { fillSelect, navigate, showFormError, toast } from "./ui.js";
import { validLatitude, validLongitude } from "./geo.js";

const LOCATION_TYPES = ["Planta", "Centro de producción", "Centro de distribución", "Proveedor", "Cliente", "Almacén", "Muelle", "Rack", "Patio", "Laboratorio", "Ubicación interna", "Otro"];
let editingId = "";
let pickerMap = null;
let pickerMarker = null;

function activeLocations() { return state.locations.filter(location => location.activo); }
export function locationName(id) { return state.locations.find(location => location.idUbicacion === id)?.nombre || id || "—"; }

export function populateLocationSelects() {
  const active = activeLocations();
  ["#productCurrentLocation", "#productOrigin", "#productDestination", "#eventDeclaredLocation", "#eventOriginLocation", "#eventDestinationLocation"].forEach(selector => {
    const select = $(selector); if (!select) return;
    fillSelect(select, active, { placeholder: "Seleccionar ubicación", value: item => item.idUbicacion, label: item => `${item.nombre} · ${item.idUbicacion}` });
  });
  const parent = $("#locationParent");
  if (parent) fillSelect(parent, active.filter(item => item.idUbicacion !== editingId), { placeholder: "Sin ubicación padre", value: item => item.idUbicacion, label: item => `${item.nombre} · ${item.idUbicacion}` });
  const mapFilter = $("#mapLocationFilter");
  if (mapFilter) fillSelect(mapFilter, state.locations, { placeholder: "Todas las ubicaciones", value: item => item.idUbicacion, label: item => item.nombre });
}

function generatedLocationId() {
  const type = $("#locationType").value || "UBI";
  const prefix = ({ Cliente: "CLI", Proveedor: "PROV", Planta: "PL", "Centro de distribución": "CD", Rack: "RACK", Muelle: "MUE" })[type] || "UBI";
  let sequence = state.locations.length + 1; let id;
  do { id = `${prefix}-${String(sequence).padStart(3, "0")}`; sequence += 1; } while (state.locations.some(item => item.idUbicacion === id));
  return id;
}

function filteredLocations() {
  const query = state.filters.locationSearch.toLowerCase();
  return state.locations.filter(item => (!query || [item.idUbicacion, item.nombre, item.tipo, item.direccion].join(" ").toLowerCase().includes(query)) && (!state.filters.locationType || item.tipo === state.filters.locationType));
}

export function renderLocations() {
  const body = $("#locationsBody"); if (!body) return; body.replaceChildren();
  $("#locationsCount").textContent = `${filteredLocations().length} ubicaciones · ${activeLocations().length} activas`;
  if (!state.geoApiAvailable) $("#locationsMigrationNotice").hidden = false; else $("#locationsMigrationNotice").hidden = true;
  const rows = filteredLocations();
  if (!rows.length) { const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 10; cell.className = "empty-state"; cell.textContent = state.geoApiAvailable ? "No hay ubicaciones que coincidan con los filtros." : "Publica el Code.gs actualizado para crear y consultar ubicaciones."; }
  rows.forEach(location => {
    const row = body.insertRow();
    [location.idUbicacion, location.nombre, location.tipo, location.direccion || "—", location.lat ?? "—", location.lon ?? "—", location.radioGeocercaM ? `${location.radioGeocercaM} m` : "Hereda", locationName(location.padreId)].forEach((value, index) => { const cell = row.insertCell(); cell.textContent = safeText(value); if (index === 0) cell.className = "mono"; });
    const statusCell = row.insertCell(); const status = document.createElement("span"); status.className = `badge ${location.activo ? "success" : "neutral"}`; status.textContent = location.activo ? "Activa" : "Inactiva"; statusCell.append(status);
    const actionsCell = row.insertCell(); const actions = document.createElement("div"); actions.className = "row-actions";
    [["pencil", "Editar", "edit"], ["map-pin", "Ver en mapa", "map"], [location.activo ? "toggle-right" : "toggle-left", location.activo ? "Desactivar" : "Activar", "toggle"]].forEach(([icon, title, action]) => { const button = document.createElement("button"); button.type = "button"; button.className = "icon-button"; button.dataset.locationAction = action; button.dataset.id = location.idUbicacion; button.title = title; button.setAttribute("aria-label", title); button.innerHTML = `<i data-lucide="${icon}"></i>`; actions.append(button); });
    actionsCell.append(actions);
  });
  window.lucide?.createIcons();
}

function setPosition(position, source = "MAPA") {
  const lat = Number(position.lat), lon = Number(position.lon);
  $("#locationLat").value = lat.toFixed(6); $("#locationLon").value = lon.toFixed(6);
  $("#locationAccuracy").textContent = source === "GPS" && Number.isFinite(position.accuracy) ? `Precisión GPS: ± ${Math.round(position.accuracy)} m · menor valor = mayor precisión.` : "Posición seleccionada manualmente en el mapa.";
  if (pickerMap) { if (pickerMarker) pickerMarker.setLatLng([lat, lon]); else pickerMarker = window.L.marker([lat, lon], { draggable: true }).addTo(pickerMap).on("dragend", event => { const point = event.target.getLatLng(); setPosition({ lat: point.lat, lon: point.lng }, "MAPA"); }); pickerMap.setView([lat, lon], Math.max(pickerMap.getZoom(), 15)); }
}

function initPickerMap() {
  const root = $("#locationPickerMap"); if (!root || !window.L) return;
  if (pickerMap) { pickerMap.remove(); pickerMap = null; pickerMarker = null; }
  pickerMap = window.L.map(root).setView(CONFIG.DEFAULT_MAP_CENTER, CONFIG.DEFAULT_MAP_ZOOM);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(pickerMap);
  pickerMap.on("click", event => setPosition({ lat: event.latlng.lat, lon: event.latlng.lng }, "MAPA"));
  const lat = Number($("#locationLat").value), lon = Number($("#locationLon").value); if (validLatitude(lat) && validLongitude(lon)) setPosition({ lat, lon }, "MAPA");
  window.setTimeout(() => pickerMap.invalidateSize(), 120);
}

function openLocationDialog(location = null) {
  editingId = location?.idUbicacion || ""; const form = $("#locationForm"); form.reset(); showFormError("#locationFormError");
  $("#locationDialogTitle").textContent = location ? "Editar ubicación" : "Registrar ubicación";
  $("#locationId").readOnly = Boolean(location); $("#locationActive").checked = location ? location.activo : true;
  if (location) {
    $("#locationId").value = location.idUbicacion; $("#locationName").value = location.nombre; $("#locationType").value = location.tipo; $("#locationAddress").value = location.direccion || ""; $("#locationLat").value = location.lat ?? ""; $("#locationLon").value = location.lon ?? ""; $("#locationRadius").value = location.radioGeocercaM ?? "";
  }
  populateLocationSelects(); if (location) $("#locationParent").value = location.padreId || "";
  $("#locationAccuracy").textContent = "Puedes usar GPS o seleccionar un punto en el mapa.";
  $("#locationDialog").showModal(); window.setTimeout(initPickerMap, 40);
}

async function captureCurrentPosition() {
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return showFormError("#locationFormError", "La geolocalización requiere HTTPS o localhost.");
  if (!navigator.geolocation) return showFormError("#locationFormError", "Este navegador no admite geolocalización. Selecciona la posición en el mapa.");
  const button = $("#useCurrentPositionBtn"); button.disabled = true;
  navigator.geolocation.getCurrentPosition(position => { button.disabled = false; setPosition({ lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy }, "GPS"); }, error => { button.disabled = false; showFormError("#locationFormError", `${error.message || "No fue posible obtener la posición"}. Selecciona el punto manualmente en el mapa.`); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

export function bindLocations() {
  LOCATION_TYPES.forEach(type => { $("#locationType").add(new Option(type, type)); $("#locationTypeFilter").add(new Option(type, type)); });
  $("#newLocationBtn").addEventListener("click", () => openLocationDialog()); $("#generateLocationId").addEventListener("click", () => { $("#locationId").value = generatedLocationId(); });
  $("#useCurrentPositionBtn").addEventListener("click", captureCurrentPosition);
  $("#locationSearch").addEventListener("input", event => { state.filters.locationSearch = event.target.value; renderLocations(); }); $("#locationTypeFilter").addEventListener("change", event => { state.filters.locationType = event.target.value; renderLocations(); });
  $("#locationsBody").addEventListener("click", async event => { const button = event.target.closest("button[data-location-action]"); if (!button) return; const location = state.locations.find(item => item.idUbicacion === button.dataset.id); if (!location) return; if (button.dataset.locationAction === "edit") openLocationDialog(location); if (button.dataset.locationAction === "map") { state.filters.mapLocation = location.idUbicacion; navigate("map"); document.dispatchEvent(new CustomEvent("map:center", { detail: { locationId: location.idUbicacion } })); } if (button.dataset.locationAction === "toggle") { try { await api.updateLocation({ idUbicacion: location.idUbicacion, activo: !location.activo }); toast("Ubicación actualizada", `${location.nombre}: ${location.activo ? "inactiva" : "activa"}.`); document.dispatchEvent(new Event("data:refresh")); } catch (error) { toast("No se pudo actualizar", error.message, "error"); } } });
  $("#locationForm").addEventListener("submit", async event => {
    event.preventDefault(); const form = event.currentTarget; showFormError("#locationFormError"); if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form)); data.activo = $("#locationActive").checked; data.lat = data.lat === "" ? "" : Number(data.lat); data.lon = data.lon === "" ? "" : Number(data.lon); data.radioGeocercaM = data.radioGeocercaM === "" ? "" : Number(data.radioGeocercaM);
    if ((data.lat !== "" && !validLatitude(data.lat)) || (data.lon !== "" && !validLongitude(data.lon))) return showFormError("#locationFormError", "Latitud o longitud fuera del rango permitido.");
    if (data.radioGeocercaM !== "" && data.radioGeocercaM <= 0) return showFormError("#locationFormError", "El radio debe ser mayor que cero.");
    if ((data.lat === "" || data.lon === "") && !data.padreId) return showFormError("#locationFormError", "Indica coordenadas completas o una ubicación padre de la cual heredarlas.");
    const button = $("#saveLocationBtn"); button.disabled = true;
    try { if (editingId) await api.updateLocation(data); else await api.createLocation(data); $("#locationDialog").close(); toast("Ubicación guardada", `${data.nombre} quedó disponible para productos y eventos.`); document.dispatchEvent(new Event("data:refresh")); }
    catch (error) { showFormError("#locationFormError", error.message); }
    finally { button.disabled = false; }
  });
}
