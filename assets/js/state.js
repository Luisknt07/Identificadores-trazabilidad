export const state = {
  products: [], events: [], dashboard: null, source: "none", lastSync: null,
  filters: { productSearch: "", productCategory: "", productStatus: "", inventorySearch: "", inventoryStatus: "", inventoryCategory: "", eventSearch: "", eventType: "" },
  productPage: 1, charts: {}, scanner: null, lastScan: { value: "", at: 0 }, currentCode: null, selectedRfid: null
};

export function findProduct(value) {
  const code = String(value || "").trim();
  let decoded = code;
  if (code.startsWith("{")) { try { decoded = JSON.parse(code).id || code; } catch { decoded = code; } }
  return state.products.find(product => [product.idProducto, product.codigo1d, product.codigoQr, product.rfidUidEpc, product.codigoGenerado].filter(Boolean).some(item => String(item).trim() === decoded || String(item).trim() === code));
}

export function productName(id) { return state.products.find(p => p.idProducto === id)?.nombre || id || "Producto desconocido"; }
