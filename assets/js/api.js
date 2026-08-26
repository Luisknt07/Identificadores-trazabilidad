import { CONFIG, hasWriteEndpoint } from "./config.js";
import { normalizeEvent, normalizeLocation, normalizeProduct, parseCSV } from "./utils.js";

let validatedHealth = null;
let validationPromise = null;
let endpointError = null;
let geoAvailable = false;
const REQUEST_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw Object.assign(new Error("La conexión con Apps Script superó el tiempo de espera."), { code: "REQUEST_TIMEOUT" });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetchWithTimeout(url, { cache: "no-store", redirect: "follow", ...options });
  if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
  const text = await response.text();
  try { return JSON.parse(text); } catch { throw new Error("El servidor no devolvió JSON válido."); }
}

async function apiGet(action, params = {}) {
  const query = new URLSearchParams({ action, ...params, cacheBust: Date.now() });
  const result = await fetchJson(`${CONFIG.APPS_SCRIPT_URL}?${query}`);
  if (!result.success) throw Object.assign(new Error(result.message || "Error de API"), { code: result.errorCode });
  return result.data;
}

function spreadsheetMismatch(actualId) {
  return Object.assign(
    new Error(`El Web App apunta a la hoja ${actualId || "desconocida"}; debe apuntar a ${CONFIG.SPREADSHEET_ID}. Actualiza y vuelve a implementar Code.gs.`),
    { code: "SPREADSHEET_MISMATCH", actualSpreadsheetId: actualId || "" }
  );
}

async function validateEndpoint() {
  if (!hasWriteEndpoint()) return null;
  if (validatedHealth) return validatedHealth;
  if (validationPromise) return validationPromise;
  validationPromise = apiGet("health")
    .then(data => {
      const actualId = String(data.spreadsheetId || data.sheets?.spreadsheetId || "").trim();
      if (actualId !== CONFIG.SPREADSHEET_ID) throw spreadsheetMismatch(actualId);
      endpointError = null;
      validatedHealth = data;
      return data;
    })
    .catch(error => {
      endpointError = error;
      throw error;
    })
    .finally(() => { validationPromise = null; });
  return validationPromise;
}

async function apiPost(action, data) {
  if (!hasWriteEndpoint()) throw Object.assign(new Error("Configura la URL del Web App de Apps Script para habilitar escritura."), { code: "WRITE_NOT_CONFIGURED" });
  await validateEndpoint();
  const result = await fetchJson(CONFIG.APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, data }) });
  if (!result.success) throw Object.assign(new Error(result.message || "No se pudo guardar."), { code: result.errorCode });
  return result.data;
}

async function fetchPublishedProducts() {
  const urls = [
    CONFIG.PUBLISHED_CSV_URL,
    `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${CONFIG.SHEET_GID}`,
    `https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/export?format=csv&gid=${CONFIG.SHEET_GID}`
  ].filter(Boolean);
  let lastError;
  for (const baseUrl of urls) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${baseUrl.includes("?") ? "&" : "?"}cacheBust=${Date.now()}`, { cache: "no-store", mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (!text.trim() || /<html/i.test(text)) throw new Error("Google devolvió HTML o contenido vacío; revisa la publicación CSV.");
      return parseCSV(text).map(normalizeProduct).filter(item => item.idProducto);
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error("No fue posible leer la hoja publicada.");
}

export const api = {
  async health() {
    if (hasWriteEndpoint()) return { ...(await validateEndpoint()), mode: "apps-script" };
    const products = await fetchPublishedProducts();
    return { status: "ok", mode: "published-csv", productCount: products.length, writable: false };
  },
  async products() {
    if (hasWriteEndpoint()) {
      try { await validateEndpoint(); return (await apiGet("products")).map(normalizeProduct); }
      catch (primaryError) {
        try { return await fetchPublishedProducts(); }
        catch { throw primaryError; }
      }
    }
    return fetchPublishedProducts();
  },
  async events(productId = "") {
    if (!hasWriteEndpoint()) return [];
    try { await validateEndpoint(); return (await apiGet("events", productId ? { productId } : {})).map(normalizeEvent); }
    catch { return []; }
  },
  async locations() {
    if (!hasWriteEndpoint()) return [];
    try {
      await validateEndpoint();
      const rows = await apiGet("locations");
      geoAvailable = true;
      return rows.map(normalizeLocation).filter(item => item.idUbicacion);
    } catch (error) {
      if (error.code === "UNKNOWN_ACTION") { geoAvailable = false; return []; }
      throw error;
    }
  },
  async geoEvents() {
    if (!hasWriteEndpoint()) return [];
    try { const rows = await apiGet("geoEvents"); geoAvailable = true; return rows.map(normalizeEvent); }
    catch (error) { if (error.code === "UNKNOWN_ACTION") return []; throw error; }
  },
  async dashboard() { if (!hasWriteEndpoint()) return null; await validateEndpoint(); return apiGet("dashboard"); },
  async findByCode(code) { if (!hasWriteEndpoint()) return null; await validateEndpoint(); return apiGet("findProductByCode", { code }); },
  createProduct(data) { return apiPost("createProduct", data); },
  updateProduct(data) { return apiPost("updateProduct", data); },
  createEvent(data) { return apiPost("createEvent", data); },
  createLocation(data) { return apiPost("createLocation", data); },
  updateLocation(data) { return apiPost("updateLocation", data); },
  isWritable() { return Boolean(validatedHealth); },
  geoAvailable() { return geoAvailable; },
  endpointIssue() { return endpointError; }
};
