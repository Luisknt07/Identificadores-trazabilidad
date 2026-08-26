import { CONFIG } from "./config.js";
import { api } from "./api.js";
import { state } from "./state.js";
import { $, $$, formatDate } from "./utils.js";
import { closeSidebar, navigate, openSidebar, setConnection, setLoading, toast } from "./ui.js";
import { bindProducts, populateProductSelects, renderProducts } from "./products.js";
import { bindInventory, renderInventory } from "./inventory.js";
import { renderDashboard } from "./dashboard.js";
import { bindGenerator, generateCode } from "./generator.js";
import { bindScanner } from "./scanner.js";
import { bindRfid } from "./rfid.js";
import { bindEvents, renderEvents, renderTrace } from "./events.js";

let loadingPromise = null;
let initialized = false;

async function loadData({ quiet = false } = {}) {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    if (!quiet) setLoading(true); setConnection("loading", "Sincronizando…");
    try {
      const [products, events] = await Promise.all([api.products(), api.events()]);
      state.products = products; state.events = events; state.source = api.isWritable() ? "apps-script" : "published-csv"; state.lastSync = new Date();
      const issue = api.endpointIssue();
      populateProductSelects(); renderAll(); setConnection("online", issue ? "Lectura segura · escritura bloqueada" : `Actualizado ${formatDate(state.lastSync)}`); renderHelp(true, issue?.message || "");
      if (!quiet) toast(issue ? "Productos cargados en modo lectura" : "Datos sincronizados", issue ? `${products.length} productos. ${issue.message}` : `${products.length} productos y ${events.length} eventos cargados.`, issue ? "warning" : "success");
    } catch (error) {
      setConnection("error", "No se pudo sincronizar"); renderHelp(false, error.message); toast("Error de conexión", error.message, "error");
    } finally { setLoading(false); loadingPromise = null; }
  })(); return loadingPromise;
}

function renderAll() { renderProducts(); renderInventory(); renderEvents(); renderDashboard(); if ($("#traceProduct").value) renderTrace($("#traceProduct").value); }

function renderHelp(connected, error = "") {
  const issue = api.endpointIssue(), writable = api.isWritable();
  $("#helpConnectionText").textContent = connected ? issue ? "La consulta está disponible en modo protegido de lectura." : "El servicio de datos está operativo y sincronizado." : "No fue posible verificar el servicio de datos.";
  $("#helpReadMode").textContent = connected ? "Disponible" : "No disponible";
  $("#helpWriteMode").textContent = writable ? "Habilitada" : "Protegida";
  const badge = $("#helpConnectionBadge"); badge.className = `badge ${connected ? issue ? "warning" : "success" : "danger"}`; badge.textContent = connected ? issue ? "Solo lectura" : "Conectado" : "Error"; badge.title = error;
}

function bindNavigation() {
  $$('[data-view]').forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
  $("#menuToggle").addEventListener("click", () => $("#sidebar").classList.contains("open") ? closeSidebar() : openSidebar()); $("#sidebarBackdrop").addEventListener("click", closeSidebar);
  $("#refreshBtn").addEventListener("click", () => loadData()); $("#testConnectionBtn").addEventListener("click", async () => { try { const result = await api.health(); renderHelp(true); toast("Conexión correcta", result.mode === "apps-script" ? "Apps Script respondió y permite operaciones." : `CSV publicado accesible: ${result.productCount} productos.`); } catch (error) { renderHelp(false,error.message); toast("Conexión fallida",error.message,"error"); } });
  document.addEventListener("data:refresh", () => loadData({ quiet:true }));
}

function bindConnectivity() {
  const update = () => { $("#offlineBanner").hidden = navigator.onLine; if (!navigator.onLine) setConnection("error", "Sin Internet"); else if (!state.lastSync) loadData({ quiet:true }); };
  window.addEventListener("online", update); window.addEventListener("offline", update); update();
}

function bindWiki() {
  const button = $("#tryIsmnBtn");
  if (!button) return;
  button.addEventListener("click", () => {
    const type = $("input[name='codeType'][value='ISMN']");
    type.checked = true; type.dispatchEvent(new Event("change", { bubbles: true }));
    $("#generatorProduct").value = ""; $("#codeValue").value = "979-0-12345678-5"; generateCode({ silent: true });
  });
}

function renderWikiExamples() {
  const svg = $("#wikiIsmnBarcode");
  if (!svg || !window.JsBarcode) return;
  try { window.JsBarcode(svg, "9790123456785", { format: "EAN13", displayValue: true, margin: 6, height: 70, width: 1.7, fontSize: 14, lineColor: "#102a43" }); }
  catch { svg.replaceWith(document.createTextNode("ISMN 979-0-12345678-5")); }
}

function init() {
  if (initialized) return;
  initialized = true;
  document.documentElement.dataset.logitraceReady = "true";
  bindNavigation(); bindProducts(); bindInventory(); bindGenerator(); bindScanner(); bindRfid(); bindEvents(); bindConnectivity(); bindWiki();
  renderAll(); renderHelp(false); renderWikiExamples(); window.lucide?.createIcons(); if (navigator.onLine) loadData();
  if (CONFIG.AUTO_REFRESH_SECONDS > 0) setInterval(() => { if (navigator.onLine && document.visibilityState === "visible") loadData({ quiet:true }); }, CONFIG.AUTO_REFRESH_SECONDS * 1000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
