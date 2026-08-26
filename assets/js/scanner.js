import { api } from "./api.js";
import { state, findProduct } from "./state.js";
import { $, codeTypeFor, productStatus, statusClass } from "./utils.js";
import { showProductDetail } from "./products.js";
import { navigate, toast } from "./ui.js";
import { geoBadge } from "./map.js";
import { locationName } from "./locations.js";

function resultField(label, value) { const box = document.createElement("div"), span = document.createElement("span"), strong = document.createElement("strong"); span.textContent = label; strong.textContent = value || "—"; box.append(span, strong); return box; }

function openTrace(product) {
  $("#traceProduct").value = product.idProducto;
  navigate("trace");
  document.dispatchEvent(new CustomEvent("trace:render", { detail: product.idProducto }));
}

async function lookup(code, technology = codeTypeFor(code), { destination = "" } = {}) {
  const now = Date.now(); if (state.lastScan.value === code && now - state.lastScan.at < 2500) { toast("Lectura duplicada", "Espera unos segundos antes de repetir el mismo código.", "warning"); return; }
  state.lastScan = { value: code, at: now }; let product = findProduct(code);
  if (!product) { try { product = await api.findByCode(code); } catch { /* La búsqueda local sigue disponible. */ } }
  renderResult(code, technology, product);
  if (product && destination === "trace") {
    await stopCamera();
    openTrace(product);
    toast("Producto identificado", `${product.nombre} · trazabilidad abierta.`);
  }
}

function renderResult(code, technology, product) {
  const root = $("#scanResult"); root.replaceChildren();
  const head = document.createElement("div"); head.className = "scan-success-head"; const icon = document.createElement("div"); icon.className = "result-icon"; icon.innerHTML = `<i data-lucide="${product ? "badge-check" : "circle-x"}"></i>`;
  const text = document.createElement("div"), title = document.createElement("h3"), subtitle = document.createElement("p"); title.textContent = product ? "Producto encontrado" : "Producto no registrado"; subtitle.textContent = product ? "Lectura correcta. Confirma el evento antes de modificar el inventario." : "El código es legible, pero no pertenece a ningún producto."; text.append(title, subtitle); head.append(icon, text);
  const value = document.createElement("div"); value.className = "result-code mono"; value.textContent = code; root.append(head, value);
  if (product) {
    const data = document.createElement("div"); data.className = "result-data"; [["Tecnología", technology], ["Producto", product.nombre], ["Categoría", product.categoria], ["Lote", product.lote], ["Stock", `${product.cantidad} unidades`], ["Ubicación", product.ubicacionActual], ["Estado", productStatus(product)], ["ID", product.idProducto]].forEach(([label, val]) => data.append(resultField(label, val)));
    const productEvents = state.events.filter(event => event.idProducto === product.idProducto).sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora)); const latest = productEvents.find(event => event.latCapturada !== null && event.lonCapturada !== null) || productEvents[0];
    const geoPanel = document.createElement("section"); geoPanel.className = "scan-geo-panel"; const geoTitle = document.createElement("strong"); geoTitle.textContent = "Última evidencia geográfica"; const geoGrid = document.createElement("div"); geoGrid.className = "result-data"; [["Posición", latest?.latCapturada === null || !latest ? "Sin coordenadas" : `${Number(latest.latCapturada).toFixed(5)}, ${Number(latest.lonCapturada).toFixed(5)}`], ["Ubicación declarada", locationName(latest?.idUbicacionDeclarada)], ["Distancia", latest?.distanciaDeclaradaM === null || !latest ? "—" : `${Math.round(latest.distanciaDeclaradaM)} m`], ["Precisión GPS", latest?.precisionM === null || !latest ? "—" : `± ${Math.round(latest.precisionM)} m`]].forEach(([label, val]) => geoGrid.append(resultField(label, val))); geoPanel.append(geoTitle, geoGrid, geoBadge(latest?.validacionGeo || "SIN_GPS")); root.append(geoPanel);
    const actions = document.createElement("div"); actions.className = "scan-result-actions";
    const trace = document.createElement("button"); trace.className = "button primary"; trace.innerHTML = '<i data-lucide="route"></i>Ver trazabilidad'; trace.addEventListener("click", () => openTrace(product));
    const detail = document.createElement("button"); detail.className = "button secondary"; detail.innerHTML = '<i data-lucide="eye"></i>Ver ficha detallada'; detail.addEventListener("click", () => showProductDetail(product));
    const eventButton = document.createElement("button"); eventButton.className = "button secondary scan-event-action"; eventButton.innerHTML = '<i data-lucide="clipboard-plus"></i>Registrar evento'; eventButton.addEventListener("click", () => document.dispatchEvent(new CustomEvent("event:open", { detail: product.idProducto })));
    const mapButton = document.createElement("button"); mapButton.className = "button secondary"; mapButton.innerHTML = '<i data-lucide="map"></i>Ver en mapa'; mapButton.addEventListener("click", () => { state.filters.mapProduct = product.idProducto; $("#mapProductFilter").value = product.idProducto; navigate("map"); });
    actions.append(trace, detail, eventButton, mapButton); root.append(data, actions);
  } else { const notice = document.createElement("div"); notice.className = "inline-notice warning"; notice.textContent = "Verifica el valor o registra primero el producto. No se ha creado ningún evento."; root.append(notice); }
  window.lucide?.createIcons();
}

async function startCamera() {
  if (!window.Html5Qrcode) return toast("Escáner no disponible", "No se pudo cargar la biblioteca de lectura.", "error");
  try {
    $("#reader").replaceChildren(); const scanner = new Html5Qrcode("reader"); state.scanner = scanner;
    await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 260, height: 170 }, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.EAN_13] }, (text, result) => lookup(text, result?.result?.format?.formatName || codeTypeFor(text), { destination: "trace" }), () => {});
    $("#startScannerBtn").hidden = true; $("#stopScannerBtn").hidden = false;
  } catch (error) { $("#reader").innerHTML = '<div class="scanner-placeholder"><strong>No se pudo activar la cámara</strong><span>Revisa permisos, HTTPS y disponibilidad del dispositivo.</span></div>'; toast("Error de cámara", error.message || "Permiso rechazado o cámara inexistente.", "error"); }
}
async function stopCamera() { if (state.scanner?.isScanning) await state.scanner.stop(); state.scanner?.clear(); state.scanner = null; $("#startScannerBtn").hidden = false; $("#stopScannerBtn").hidden = true; $("#reader").innerHTML = '<div class="scanner-placeholder"><i data-lucide="scan-line"></i><strong>Cámara inactiva</strong><span>Autoriza el acceso para iniciar la lectura.</span></div>'; window.lucide?.createIcons(); }

export function bindScanner() {
  document.querySelectorAll("[data-scan-mode]").forEach(button => button.addEventListener("click", async () => { const camera = button.dataset.scanMode === "camera"; document.querySelectorAll("[data-scan-mode]").forEach(item => item.classList.toggle("active", item === button)); $("#cameraMode").hidden = !camera; $("#imageMode").hidden = camera; if (!camera && state.scanner) await stopCamera(); }));
  $("#startScannerBtn").addEventListener("click", startCamera); $("#stopScannerBtn").addEventListener("click", stopCamera);
  $("#manualSearchBtn").addEventListener("click", () => { const value = $("#manualCode").value.trim(); if (value) lookup(value, "Entrada manual"); else toast("Ingresa un código", "", "warning"); });
  $("#scanImage").addEventListener("change", async event => { const file = event.target.files[0]; if (!file) return; try { const reader = new Html5Qrcode("reader"); const result = await reader.scanFile(file, true); await lookup(result, codeTypeFor(result)); reader.clear(); } catch (error) { toast("Código ilegible", "No se detectó un Code 128, EAN-13 o QR en la imagen.", "error"); } finally { event.target.value = ""; } });
  window.addEventListener("beforeunload", () => { if (state.scanner?.isScanning) state.scanner.stop(); });
}
