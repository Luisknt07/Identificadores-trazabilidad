import { api } from "./api.js";
import { state } from "./state.js";
import { $, randomHex } from "./utils.js";
import { toast } from "./ui.js";

export function bindRfid() {
  $("#rfidForm").addEventListener("submit", async event => {
    event.preventDefault(); const product = state.products.find(item => item.idProducto === $("#rfidProduct").value); if (!product) return toast("Selecciona un producto", "", "warning");
    const format = $("#rfidFormat").value, value = format === "EPC" ? `3034${randomHex(20)}` : randomHex(16); state.selectedRfid = { product, value, format };
    $("#rfidProductName").textContent = product.nombre; $("#rfidValue").textContent = value; $("#rfidFormatLabel").textContent = format === "EPC" ? "EPC-like · 96 bits" : "UID simulado · hexadecimal"; $("#simulateRfidBtn").disabled = false;
    try { await api.updateProduct({ idProducto: product.idProducto, rfidUidEpc: value }); product.rfidUidEpc = value; toast("RFID simulado asociado", "La asociación se guardó en Google Sheets."); }
    catch (error) { toast("Identificador generado, no guardado", error.message, "warning"); }
  });
  $("#simulateRfidBtn").addEventListener("click", () => { if (!state.selectedRfid) return; const card = $("#rfidCard"); card.classList.remove("reading"); void card.offsetWidth; card.classList.add("reading"); toast("Etiqueta simulada detectada", `${state.selectedRfid.product.nombre} · ${state.selectedRfid.value}`); setTimeout(() => document.dispatchEvent(new CustomEvent("event:open", { detail: state.selectedRfid.product.idProducto })), 1100); });
}
