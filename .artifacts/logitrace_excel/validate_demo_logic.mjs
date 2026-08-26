import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = "C:/Users/PC2/.codex/visualizations/2026/08/26/01a03bb9-da84-76b2-b4ca-09238c9bd7a9/outputs/logitrace-sheets/LogiTrace_Base_Google_Sheets.xlsx";
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));

async function table(range, rows, cols) {
  const result = await wb.inspect({ kind: "table", range, include: "values,formulas", tableMaxRows: rows, tableMaxCols: cols, maxChars: 30000 });
  const parsed = JSON.parse(result.ndjson);
  const [headers, ...values] = parsed.values;
  return values.filter(row => row.some(value => value !== null && value !== "")).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

const products = await table("PRODUCTOS!A1:S11", 11, 19);
const events = await table("EVENTOS!A1:O21", 21, 15);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const text = value => String(value ?? "").replace(/^\u200C/, "").trim();
const stockIn = new Set(["Recepción", "Devolución"]);
const stockOut = new Set(["Despacho"]);
const quantityEvents = new Set([...stockIn, ...stockOut]);
const locationEvents = new Set(["Recepción", "Ingreso al almacén", "Ubicación", "Movimiento interno"]);
const allowedEvents = new Set(["Recepción", "Ingreso al almacén", "Ubicación", "Movimiento interno", "Preparación de pedido", "Despacho", "Entrega", "Devolución", "Incidencia"]);

assert(products.length === 10, `Se esperaban 10 productos y existen ${products.length}.`);
assert(events.length === 20, `Se esperaban 20 eventos y existen ${events.length}.`);
assert(new Set(products.map(p => text(p.ID_PRODUCTO))).size === products.length, "Hay IDs de producto duplicados.");
assert(new Set(events.map(e => text(e.ID_EVENTO))).size === events.length, "Hay IDs de evento duplicados.");

const productMap = new Map(products.map(product => [text(product.ID_PRODUCTO), product]));
const codeOwners = new Map();
for (const product of products) {
  const id = text(product.ID_PRODUCTO);
  assert(id && product.NOMBRE && product.CATEGORIA && product.LOTE, `Producto incompleto: ${id}.`);
  assert(Number(product.CANTIDAD) >= 0, `Stock negativo en ${id}.`);
  const expectedStatus = Number(product.CANTIDAD) === 0 ? "Agotado" : Number(product.CANTIDAD) <= 5 ? "Stock bajo" : "Disponible";
  assert(text(product.ESTADO) === expectedStatus, `Estado inconsistente en ${id}: ${product.ESTADO} vs ${expectedStatus}.`);
  for (const code of [product.ID_PRODUCTO, product.CODIGO_GENERADO, product.CODIGO_1D, product.CODIGO_QR, product.RFID_UID_EPC].map(text).filter(Boolean)) {
    const owner = codeOwners.get(code);
    assert(!owner || owner === id, `El código ${code} pertenece a ${owner} y ${id}.`);
    codeOwners.set(code, id);
  }
  if (text(product.TIPO_CODIGO_1D) === "EAN-13") {
    const ean = text(product.CODIGO_1D);
    assert(/^\d{13}$/.test(ean), `EAN-13 no numérico o longitud inválida en ${id}.`);
    const sum = [...ean.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    assert(String((10 - sum % 10) % 10) === ean[12], `Checksum EAN-13 inválido en ${id}.`);
  }
}

const grouped = new Map();
for (const event of events) {
  const id = text(event.ID_PRODUCTO);
  assert(productMap.has(id), `Evento ${event.ID_EVENTO} apunta a un producto inexistente.`);
  assert(allowedEvents.has(text(event.EVENTO)), `Evento no permitido: ${event.EVENTO}.`);
  const before = Number(event.STOCK_ANTES), after = Number(event.STOCK_DESPUES), quantity = Number(event.CANTIDAD_MOVIMIENTO);
  assert(before >= 0 && after >= 0, `Stock negativo en ${event.ID_EVENTO}.`);
  if (quantityEvents.has(text(event.EVENTO))) assert(quantity > 0, `Cantidad no positiva en ${event.ID_EVENTO}.`);
  else assert(quantity === 0, `El evento ${event.ID_EVENTO} no debe modificar cantidad.`);
  const expectedAfter = stockIn.has(text(event.EVENTO)) ? before + quantity : stockOut.has(text(event.EVENTO)) ? before - quantity : before;
  assert(after === expectedAfter, `Transición inválida en ${event.ID_EVENTO}: ${before} → ${after}; esperado ${expectedAfter}.`);
  if (!grouped.has(id)) grouped.set(id, []);
  grouped.get(id).push(event);
}

for (const [id, productEvents] of grouped.entries()) {
  for (let i = 1; i < productEvents.length; i += 1) {
    assert(Number(productEvents[i].STOCK_ANTES) === Number(productEvents[i - 1].STOCK_DESPUES), `Cadena de stock interrumpida en ${id}.`);
  }
  const last = productEvents.at(-1), product = productMap.get(id);
  assert(Number(product.CANTIDAD) === Number(last.STOCK_DESPUES), `Stock final de ${id} no coincide con PRODUCTOS.`);
  const lastLocation = [...productEvents].reverse().find(event => locationEvents.has(text(event.EVENTO)) && text(event.UBICACION_DESTINO));
  if (lastLocation) assert(text(product.UBICACION_ACTUAL) === text(lastLocation.UBICACION_DESTINO), `Ubicación final inconsistente en ${id}.`);
}

assert(products.filter(p => text(p.CODIGO_1D)).length >= 5, "Faltan al menos cinco identificadores 1D.");
assert(products.filter(p => text(p.CODIGO_QR)).length >= 5, "Faltan al menos cinco QR.");
assert(products.filter(p => text(p.RFID_UID_EPC)).length >= 5, "Faltan al menos cinco RFID simulados.");

console.log(JSON.stringify({
  products: products.length,
  events: events.length,
  units: products.reduce((sum, product) => sum + Number(product.CANTIDAD), 0),
  code128: products.filter(p => text(p.TIPO_CODIGO_1D) === "Code 128").length,
  ean13: products.filter(p => text(p.TIPO_CODIGO_1D) === "EAN-13").length,
  qr: products.filter(p => text(p.CODIGO_QR)).length,
  rfid: products.filter(p => text(p.RFID_UID_EPC)).length,
  status: "VALID"
}, null, 2));
