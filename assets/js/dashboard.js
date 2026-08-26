import { state, productName } from "./state.js";
import { $, formatDate, productStatus, statusClass } from "./utils.js";

function kpi(icon, value, label, note, tone) { const item = document.createElement("article"); item.className = `panel kpi-card ${tone}`; const iconBox = document.createElement("div"); iconBox.className = "kpi-icon"; iconBox.innerHTML = `<i data-lucide="${icon}"></i>`; const strong = document.createElement("strong"); strong.textContent = value; const span = document.createElement("span"); span.textContent = label; const small = document.createElement("small"); small.textContent = note; item.append(iconBox, strong, span, small); return item; }

export function renderDashboard() {
  const products = state.products, events = state.events, today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date());
  const units = products.reduce((sum, p) => sum + p.cantidad, 0), categories = new Set(products.map(p => p.categoria)).size;
  const container = $("#dashboardKpis"); container.replaceChildren(
    kpi("package-2", products.length, "Productos diferentes", `${categories} categorías`, "teal"),
    kpi("boxes", units, "Unidades en inventario", "Stock vigente", "blue"),
    kpi("triangle-alert", products.filter(p => productStatus(p) === "Stock bajo").length, "Stock bajo", `Umbral ≤5 unidades`, "orange"),
    kpi("arrow-left-to-line", events.filter(e => e.evento === "Recepción").length, "Recepciones", "Histórico", "green"),
    kpi("activity", events.filter(e => { const d = new Date(e.fechaHora); return !Number.isNaN(d) && new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(d) === today; }).length, "Eventos hoy", `${events.length} acumulados`, "red")
  );
  renderGeoKpis(); renderRecentEvents(); renderCharts(); window.lucide?.createIcons();
}

function renderGeoKpis() {
  const events = state.events, georeferenced = events.filter(event => event.latCapturada !== null && event.lonCapturada !== null), valid = georeferenced.filter(event => ["OK", "FUERA_GEOCERCA"].includes(event.validacionGeo));
  const count = status => events.filter(event => (event.validacionGeo || "SIN_GPS") === status).length; const percent = (value, denominator) => denominator ? `${Math.round(value / denominator * 100)}%` : "0%";
  $("#dashboardGeoKpis").replaceChildren(
    kpi("map-pin", georeferenced.length, "Eventos georreferenciados", `${events.length} eventos totales`, "blue"),
    kpi("badge-check", percent(count("OK"), valid.length), "Eventos OK", `Sobre ${valid.length} con precisión válida`, "green"),
    kpi("triangle-alert", percent(count("FUERA_GEOCERCA"), valid.length), "Fuera de geocerca", `Sobre ${valid.length} con precisión válida`, "red"),
    kpi("locate", percent(count("BAJA_PRECISION"), georeferenced.length), "Baja precisión", `Sobre ${georeferenced.length} georreferenciados`, "orange"),
    kpi("map-pin-off", events.filter(event => event.latCapturada === null || event.lonCapturada === null).length, "Eventos sin GPS", "Se conservan en trazabilidad", "teal")
  );
}

function renderRecentEvents() {
  const body = $("#recentEventsBody"); body.replaceChildren(); const events = [...state.events].sort((a,b) => new Date(b.fechaHora)-new Date(a.fechaHora)).slice(0,7);
  if (!events.length) { const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 7; cell.textContent = state.source === "published-csv" ? "La lectura CSV muestra productos. Configura Apps Script para consultar eventos." : "Aún no hay movimientos registrados."; cell.className = "empty-state"; return; }
  events.forEach(event => { const row = body.insertRow(); [formatDate(event.fechaHora), productName(event.idProducto), event.evento, event.cantidadMovimiento ? `${event.evento === "Despacho" ? "-" : "+"}${event.cantidadMovimiento}` : "—", event.ubicacionDestino || event.ubicacion || event.ubicacionOrigen || "—", event.actor].forEach(value => row.insertCell().textContent = value); const cell = row.insertCell(); const badge = document.createElement("span"); badge.className = `badge ${statusClass(event.estado)}`; badge.textContent = event.estado; cell.append(badge); });
}

function renderCharts() {
  const group = new Map(); state.products.forEach(p => group.set(p.categoria, (group.get(p.categoria) || 0) + p.cantidad));
  state.charts.category?.destroy(); state.charts.technology?.destroy(); state.charts.geoValidation?.destroy(); state.charts.geoExceptions?.destroy();
  $("#categoryEmpty").hidden = group.size > 0; $("#categoryChart").hidden = group.size === 0;
  if (group.size && window.Chart) state.charts.category = new Chart($("#categoryChart"), { type:"bar", data:{labels:[...group.keys()],datasets:[{data:[...group.values()],backgroundColor:"#00a896",borderRadius:7,barThickness:28}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0},grid:{color:"#eaf0f4"}}}} });
  const technology = { "Code 128":0,"EAN-13":0,QR:0,"RFID simulado":0 }; state.products.forEach(p => { if (p.codigo1d) technology[p.tipoCodigo1d === "EAN13" || p.tipoCodigo1d === "EAN-13" ? "EAN-13" : "Code 128"] += 1; if (p.codigoQr) technology.QR += 1; if (p.rfidUidEpc) technology["RFID simulado"] += 1; });
  const total = Object.values(technology).reduce((a,b)=>a+b,0); $("#technologyEmpty").hidden = total > 0; $("#technologyChart").hidden = total === 0;
  if (total && window.Chart) state.charts.technology = new Chart($("#technologyChart"), { type:"doughnut", data:{labels:Object.keys(technology),datasets:[{data:Object.values(technology),backgroundColor:["#102a43","#2364aa","#00a896","#e09f3e"],borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{position:"bottom",labels:{boxWidth:10,usePointStyle:true,padding:16}}}} });
  const geo = { OK: 0, FUERA_GEOCERCA: 0, BAJA_PRECISION: 0, SIN_GPS: 0 }; state.events.forEach(event => { geo[event.validacionGeo || "SIN_GPS"] = (geo[event.validacionGeo || "SIN_GPS"] || 0) + 1; }); const geoTotal = Object.values(geo).reduce((a, b) => a + b, 0); $("#geoValidationEmpty").hidden = geoTotal > 0; $("#geoValidationChart").hidden = geoTotal === 0;
  if (geoTotal && window.Chart) state.charts.geoValidation = new Chart($("#geoValidationChart"), { type: "doughnut", data: { labels: ["OK", "Fuera de geocerca", "Baja precisión", "Sin GPS"], datasets: [{ data: Object.values(geo), backgroundColor: ["#2b8a7e", "#d64545", "#d99024", "#718096"], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "66%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, usePointStyle: true } } } } });
  const exceptions = new Map(); state.events.filter(event => event.validacionGeo === "FUERA_GEOCERCA").forEach(event => { const id = event.idUbicacionDeclarada || "Sin declarar"; exceptions.set(id, (exceptions.get(id) || 0) + 1); }); const exceptionRows = [...exceptions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8); $("#geoExceptionsEmpty").hidden = exceptionRows.length > 0; $("#geoExceptionsChart").hidden = exceptionRows.length === 0;
  if (exceptionRows.length && window.Chart) state.charts.geoExceptions = new Chart($("#geoExceptionsChart"), { type: "bar", data: { labels: exceptionRows.map(([id]) => state.locations.find(location => location.idUbicacion === id)?.nombre || id), datasets: [{ data: exceptionRows.map(([, value]) => value), backgroundColor: "#d64545", borderRadius: 7, barThickness: 26 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } });
}
