import { state } from "./state.js";
import { api } from "./api.js";
import { $, calculateEanCheckDigit, downloadElementPng, normalizeEan, normalizeIsmn } from "./utils.js";
import { toast } from "./ui.js";

function selectedType() { return $("input[name='codeType']:checked").value; }

function syncFields() {
  const type = selectedType(), input = $("#codeValue");
  const numeric = type === "EAN13" || type === "ISMN";
  $("#eanNotice").hidden = !numeric; $("#qrPayloadField").hidden = type !== "QR";
  $("#codeValueLabel").textContent = type === "EAN13" ? "EAN: base de 12 o código de 13 dígitos" : type === "ISMN" ? "ISMN: 12 o 13 dígitos con prefijo 979-0" : type === "QR" ? "Contenido del QR" : "Valor a codificar";
  $("#codeHint").textContent = type === "EAN13" ? "Con 12 dígitos calculamos automáticamente el checksum." : type === "ISMN" ? "Identifica publicaciones de música notada; acepta guiones y calcula el control." : type === "QR" ? "Puede contener un ID o un payload JSON estructurado." : "Code 128 admite identificadores alfanuméricos.";
  input.placeholder = type === "EAN13" ? "750123456789" : type === "ISMN" ? "979-0-12345678" : "UPEC-ALM-P001-L03-0001";
}

function productFromSelect() { return state.products.find(item => item.idProducto === $("#generatorProduct").value); }

function valueForType(type, raw, product) {
  if (type === "EAN13") return normalizeEan(raw);
  if (type === "ISMN") return normalizeIsmn(raw);
  if (type === "QR" && $("#structuredQr").checked) return JSON.stringify({ type: "PRODUCT", id: product?.idProducto || raw, version: 1 });
  if (!raw.trim()) throw new Error("Ingresa un valor para generar el código.");
  return raw.trim();
}

export function generateCode({ silent = false } = {}) {
  const type = selectedType(), product = productFromSelect();
  try {
    const value = valueForType(type, $("#codeValue").value, product); const barcodeBox = $("#barcodeBox"), qrBox = $("#qrBox");
    barcodeBox.hidden = type === "QR"; qrBox.hidden = type !== "QR"; qrBox.replaceChildren();
    if (type === "QR") new QRCode(qrBox, { text: value, width: 150, height: 150, colorDark: "#111111", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    else window.JsBarcode("#barcodeSvg", value, { format: type === "EAN13" || type === "ISMN" ? "EAN13" : "CODE128", displayValue: false, margin: 4, height: 82, width: type === "EAN13" || type === "ISMN" ? 2 : 1.7 });
    $("#previewType").textContent = type === "EAN13" ? "EAN-13" : type === "ISMN" ? "ISMN / EAN-13" : type === "QR" ? "Código QR" : "Code 128";
    $("#labelProductName").textContent = product?.nombre || "Producto sin relacionar"; $("#labelCodeValue").textContent = value;
    $("#labelCategory").textContent = `CATEGORÍA: ${product?.categoria || "—"}`; $("#labelLot").textContent = `LOTE: ${product?.lote || "—"}`;
    state.currentCode = { type, value, productId: product?.idProducto || "" }; if (!silent) toast("Código generado", `${type === "EAN13" ? "EAN-13" : type === "ISMN" ? "ISMN" : type} listo para exportar.`);
  } catch (error) { if (!silent) toast("No se pudo generar", error.message, "error"); }
}

export function bindGenerator() {
  $("#generatorForm").addEventListener("submit", event => { event.preventDefault(); generateCode(); });
  document.querySelectorAll("input[name='codeType']").forEach(input => input.addEventListener("change", syncFields));
  $("#generatorProduct").addEventListener("change", event => { const product = state.products.find(item => item.idProducto === event.target.value); if (!product) return; const type = selectedType(); $("#codeValue").value = type === "EAN13" ? (product.tipoCodigo1d?.toUpperCase().includes("EAN") ? product.codigo1d : "") : type === "ISMN" ? (String(product.codigo1d || "").startsWith("9790") ? product.codigo1d : "") : type === "QR" ? (product.codigoQr || product.idProducto) : (product.codigo1d || product.idProducto); });
  $("#copyCodeBtn").addEventListener("click", async () => { if (!state.currentCode) return toast("Genera un código primero", "", "warning"); await navigator.clipboard.writeText(state.currentCode.value); toast("Valor copiado"); });
  $("#associateCodeBtn").addEventListener("click", async () => {
    if (!state.currentCode?.productId) return toast("Selecciona un producto", "La asociación requiere un producto relacionado.", "warning");
    const payload = { idProducto: state.currentCode.productId };
    if (state.currentCode.type === "QR") payload.codigoQr = state.currentCode.value;
    else { payload.tipoCodigo1d = state.currentCode.type === "EAN13" ? "EAN-13" : state.currentCode.type === "ISMN" ? "ISMN (EAN-13)" : "Code 128"; payload.codigo1d = state.currentCode.value; }
    const button = $("#associateCodeBtn"); button.disabled = true;
    try { await api.updateProduct(payload); toast("Código asociado", "La relación se guardó en Google Sheets."); document.dispatchEvent(new Event("data:refresh")); }
    catch (error) { toast("No se pudo asociar", error.message, "error"); }
    finally { button.disabled = false; }
  });
  $("#printCodeBtn").addEventListener("click", () => { if (!state.currentCode) return toast("Genera un código primero", "", "warning"); window.print(); });
  $("#downloadCodeBtn").addEventListener("click", async () => { if (!state.currentCode) return toast("Genera un código primero", "", "warning"); try { await downloadElementPng($("#labelCanvas"), `LogiTrace-${state.currentCode.productId || state.currentCode.type}.png`); toast("Etiqueta descargada"); } catch (error) { toast("No se pudo descargar", error.message, "error"); } });
  syncFields(); $("#codeValue").value = "UPEC-ALM-P001-L03-0001"; generateCode({ silent: true });
}

export { calculateEanCheckDigit };
