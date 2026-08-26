import { CONFIG } from "./config.js";

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function normalizeHeader(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "").toLowerCase();
}

export function parseCSV(text, delimiter = ",") {
  const rows = []; let row = []; let field = ""; let quoted = false;
  const addField = () => { row.push(field); field = ""; };
  const addRow = () => { if (row.some(cell => String(cell).trim())) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) addField();
    else if (char === "\n") { addField(); addRow(); }
    else if (char !== "\r") field += char;
  }
  if (field || row.length) { addField(); addRow(); }
  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map(values => Object.fromEntries(headers.map((header, i) => [header, String(values[i] ?? "").trim()])));
}

export function pick(row, aliases, fallback = "") {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value !== undefined && value !== "") return value;
  }
  return fallback;
}

export function normalizeProduct(rawRow) {
  const row = Object.fromEntries(Object.entries(rawRow || {}).map(([key, value]) => [normalizeHeader(key), value]));
  const amount = Number(String(pick(row, ["CANTIDAD", "STOCK", "UNIDADES"], 0)).replace(",", ".")) || 0;
  return {
    idProducto: pick(row, ["ID_PRODUCTO", "ID PRODUCTO", "ID", "CODIGO"]),
    nombre: pick(row, ["NOMBRE", "PRODUCTO"], "Sin nombre"),
    descripcion: pick(row, ["DESCRIPCION"]), categoria: pick(row, ["CATEGORIA"], "Sin categoría"),
    lote: pick(row, ["LOTE"], "—"), cantidad: Math.max(0, amount),
    fechaVencimiento: pick(row, ["FECHA_VENCIMIENTO", "VENCIMIENTO"]),
    origen: pick(row, ["ORIGEN"]), destino: pick(row, ["DESTINO"]),
    ubicacionActual: pick(row, ["UBICACION_ACTUAL", "UBICACION"], "Sin ubicación"),
    tipoIdentificacion: pick(row, ["TIPO_IDENTIFICACION"]), codigoGenerado: pick(row, ["CODIGO_GENERADO"]),
    tipoCodigo1d: pick(row, ["TIPO_CODIGO_1D"]), codigo1d: pick(row, ["CODIGO_1D"]),
    codigoQr: pick(row, ["CODIGO_QR"]), rfidUidEpc: pick(row, ["RFID_UID_EPC", "RFID"]),
    fechaRegistro: pick(row, ["FECHA_REGISTRO"]), ultimaActualizacion: pick(row, ["ULTIMA_ACTUALIZACION"]),
    estado: pick(row, ["ESTADO"])
  };
}

export function normalizeEvent(rawRow) {
  const row = Object.fromEntries(Object.entries(rawRow || {}).map(([key, value]) => [normalizeHeader(key), value]));
  return {
    idEvento: pick(row, ["ID_EVENTO", "ID"]), fechaHora: pick(row, ["FECHA_HORA", "FECHA"]),
    idProducto: pick(row, ["ID_PRODUCTO"]), tipoIdentificacion: pick(row, ["TIPO_IDENTIFICACION"]),
    codigoLeido: pick(row, ["CODIGO_LEIDO"]), evento: pick(row, ["EVENTO", "TIPO_EVENTO"]),
    ubicacion: pick(row, ["UBICACION"]), actor: pick(row, ["ACTOR"]), observacion: pick(row, ["OBSERVACION"]),
    estado: pick(row, ["ESTADO"], "Completado"), cantidadMovimiento: Number(pick(row, ["CANTIDAD_MOVIMIENTO"], 0)) || 0,
    stockAntes: Number(pick(row, ["STOCK_ANTES"], 0)) || 0, stockDespues: Number(pick(row, ["STOCK_DESPUES"], 0)) || 0,
    ubicacionOrigen: pick(row, ["UBICACION_ORIGEN"]), ubicacionDestino: pick(row, ["UBICACION_DESTINO"]),
    idUbicacionDeclarada: pick(row, ["ID_UBICACION_DECLARADA"]),
    latCapturada: numberOrNull(pick(row, ["LAT_CAPTURADA"])), lonCapturada: numberOrNull(pick(row, ["LON_CAPTURADA"])),
    precisionM: numberOrNull(pick(row, ["PRECISION_M"])), fuenteUbicacion: pick(row, ["FUENTE_UBICACION"], "SIN_GPS"),
    distanciaDeclaradaM: numberOrNull(pick(row, ["DISTANCIA_DECLARADA_M"])), validacionGeo: pick(row, ["VALIDACION_GEO"], "SIN_GPS")
  };
}

function numberOrNull(value) { const number = Number(value); return value === "" || value === null || value === undefined || !Number.isFinite(number) ? null : number; }

export function normalizeLocation(rawRow) {
  const row = Object.fromEntries(Object.entries(rawRow || {}).map(([key, value]) => [normalizeHeader(key), value]));
  const active = pick(row, ["ACTIVO"], "Sí");
  return {
    idUbicacion: pick(row, ["ID_UBICACION", "ID"]), nombre: pick(row, ["NOMBRE"]), tipo: pick(row, ["TIPO"], "Otro"),
    direccion: pick(row, ["DIRECCION"]), lat: numberOrNull(pick(row, ["LAT"])), lon: numberOrNull(pick(row, ["LON"])),
    radioGeocercaM: numberOrNull(pick(row, ["RADIO_GEOCERCA_M"])), padreId: pick(row, ["PADRE_ID"]),
    activo: !["NO", "FALSE", "0", "INACTIVO"].includes(String(active).trim().toUpperCase())
  };
}

export function formatDate(value, includeTime = true) {
  if (!value) return "—";
  let date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(String(value))) {
    const [d, m, y] = String(value).split(/[\/\s]/); date = new Date(`${y}-${m}-${d}`);
  }
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(CONFIG.LOCALE, { timeZone: CONFIG.TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric", ...(includeTime ? { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false } : {}) }).format(date);
}

export function productStatus(product) {
  if (product.cantidad <= 0) return "Agotado";
  if (product.cantidad <= CONFIG.LOW_STOCK_THRESHOLD) return "Stock bajo";
  return product.estado && !["Disponible", "Stock bajo", "Agotado"].includes(product.estado) ? product.estado : "Disponible";
}

export function statusClass(status = "") {
  const value = status.toLowerCase();
  if (value.includes("agot") || value.includes("incid") || value.includes("error")) return "danger";
  if (value.includes("bajo") || value.includes("pend")) return "warning";
  if (value.includes("dispon") || value.includes("complet") || value.includes("encontr")) return "success";
  return "info";
}

export function calculateEanCheckDigit(base12) {
  if (!/^\d{12}$/.test(base12)) throw new Error("EAN-13 requiere una base de 12 dígitos.");
  const sum = [...base12].reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function normalizeEan(value) {
  const digits = String(value).trim();
  if (/^\d{12}$/.test(digits)) return digits + calculateEanCheckDigit(digits);
  if (/^\d{13}$/.test(digits) && calculateEanCheckDigit(digits.slice(0, 12)) === digits[12]) return digits;
  throw new Error("Ingresa 12 dígitos para calcular el control o 13 con checksum válido.");
}

export function normalizeIsmn(value) {
  const digits = String(value).replace(/[\s-]+/g, "");
  const normalized = normalizeEan(digits);
  if (!normalized.startsWith("9790")) throw new Error("ISMN debe comenzar con el prefijo 979-0.");
  return normalized;
}

export function makeProductId({ categoria = "GEN", lote = "L00" } = {}, products = []) {
  const clean = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const cat = (clean(categoria).slice(0, 3) || "GEN").padEnd(3, "X");
  const lot = clean(lote).slice(0, 5) || "L00";
  let sequence = products.length + 1; let id;
  do { id = `UPEC-ALM-${cat}-P${String(sequence).padStart(3, "0")}-${lot}`; sequence += 1; } while (products.some(item => item.idProducto === id));
  return id;
}

export function randomHex(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2)));
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("").slice(0, length).toUpperCase();
}

export function downloadElementPng(element, filename = "etiqueta.png") {
  if (!window.html2canvas) throw new Error("No se cargó el exportador PNG.");
  return window.html2canvas(element, { scale: 3, backgroundColor: "#ffffff" }).then(canvas => {
    const link = document.createElement("a"); link.download = filename; link.href = canvas.toDataURL("image/png"); link.click();
  });
}

export function debounce(fn, wait = 180) { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), wait); }; }
export function safeText(value) { return String(value ?? ""); }
export function codeTypeFor(value) { if (/^\d{13}$/.test(value)) return "EAN-13"; if (String(value).trim().startsWith("{")) return "QR"; return "Code / QR"; }
