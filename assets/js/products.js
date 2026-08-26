import { CONFIG } from "./config.js";
import { api } from "./api.js";
import { state } from "./state.js";
import { $, makeProductId, productStatus, safeText, statusClass } from "./utils.js";
import { fillSelect, navigate, showFormError, toast } from "./ui.js";
import { locationName } from "./locations.js";

function td(content, className = "") { const cell = document.createElement("td"); if (className) cell.className = className; if (content instanceof Node) cell.append(content); else cell.textContent = safeText(content); return cell; }
function badgeNode(text) { const span = document.createElement("span"); span.className = `badge ${statusClass(text)}`; span.textContent = text; return span; }

function filteredProducts() {
  const query = state.filters.productSearch.toLowerCase();
  return state.products.filter(product => {
    const matchesText = !query || [product.idProducto, product.nombre, product.categoria, product.lote, product.ubicacionActual].join(" ").toLowerCase().includes(query);
    return matchesText && (!state.filters.productCategory || product.categoria === state.filters.productCategory) && (!state.filters.productStatus || productStatus(product) === state.filters.productStatus);
  });
}

export function renderProducts() {
  const categories = [...new Set(state.products.map(p => p.categoria))].sort();
  const categorySelect = $("#productCategoryFilter"); const currentCategory = categorySelect.value;
  categorySelect.replaceChildren(new Option("Todas las categorías", "")); categories.forEach(category => categorySelect.add(new Option(category, category))); categorySelect.value = currentCategory;
  const filtered = filteredProducts(); const pages = Math.max(1, Math.ceil(filtered.length / CONFIG.PAGE_SIZE)); state.productPage = Math.min(state.productPage, pages);
  const visible = filtered.slice((state.productPage - 1) * CONFIG.PAGE_SIZE, state.productPage * CONFIG.PAGE_SIZE);
  $("#productsCount").textContent = `${filtered.length} de ${state.products.length} productos visibles`;
  const body = $("#productsBody"); body.replaceChildren();
  if (!visible.length) { const row = document.createElement("tr"); const cell = td("No hay productos que coincidan con los filtros."); cell.colSpan = 9; cell.className = "empty-state"; row.append(cell); body.append(row); }
  visible.forEach(product => {
    const row = document.createElement("tr");
    const id = document.createElement("span"); id.className = "mono"; id.textContent = product.idProducto;
    const name = document.createElement("div"); const strong = document.createElement("span"); strong.className = "cell-title"; strong.textContent = product.nombre; const sub = document.createElement("span"); sub.className = "cell-sub"; sub.textContent = product.descripcion || "Sin descripción"; name.append(strong, sub);
    const stock = document.createElement("strong"); stock.className = "stock-number"; stock.textContent = product.cantidad;
    const tags = document.createElement("div"); tags.className = "identifier-tags";
    [[product.codigo1d, product.tipoCodigo1d || "1D"], [product.codigoQr, "QR"], [product.rfidUidEpc, "RFID"]].filter(([value]) => value).forEach(([, label]) => { const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = label; tags.append(tag); });
    if (!tags.childElementCount) { const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = "Sin asociar"; tags.append(tag); }
    const actions = document.createElement("div"); actions.className = "row-actions";
    [["eye", "Ver detalle", "detail"], ["route", "Ver trazabilidad", "trace"], ["package-plus", "Registrar evento", "event"]].forEach(([icon, title, action]) => { const button = document.createElement("button"); button.className = "icon-button"; button.title = title; button.setAttribute("aria-label", title); button.dataset.action = action; button.dataset.id = product.idProducto; button.innerHTML = `<i data-lucide="${icon}"></i>`; actions.append(button); });
    row.append(td(id), td(name), td(product.categoria), td(product.lote), td(stock), td(locationName(product.ubicacionActual)), td(badgeNode(productStatus(product))), td(tags), td(actions)); body.append(row);
  });
  renderPagination(pages); window.lucide?.createIcons();
}

function renderPagination(pages) {
  const container = $("#productsPagination"); container.replaceChildren(); if (pages <= 1) return;
  for (let i = 1; i <= pages; i += 1) { const button = document.createElement("button"); button.textContent = i; button.classList.toggle("active", i === state.productPage); button.addEventListener("click", () => { state.productPage = i; renderProducts(); }); container.append(button); }
}

export function showProductDetail(product) {
  const dialog = $("#productDetailDialog"), root = $("#productDetailContent"); root.replaceChildren();
  const hero = document.createElement("div"); hero.className = "detail-hero";
  const kicker = document.createElement("span"); kicker.className = "section-kicker"; kicker.textContent = product.idProducto;
  const title = document.createElement("h2"); title.textContent = product.nombre; const description = document.createElement("p"); description.textContent = product.descripcion || "Producto logístico sin descripción.";
  const actions = document.createElement("div"); actions.className = "detail-actions";
  const trace = document.createElement("button"); trace.className = "button light"; trace.textContent = "Ver trazabilidad"; trace.addEventListener("click", () => { dialog.close(); $("#traceProduct").value = product.idProducto; navigate("trace"); document.dispatchEvent(new CustomEvent("trace:render", { detail: product.idProducto })); });
  const close = document.createElement("button"); close.className = "button ghost"; close.style.color = "white"; close.textContent = "Cerrar"; close.addEventListener("click", () => dialog.close()); actions.append(trace, close); hero.append(kicker, title, description, actions);
  const body = document.createElement("div"); body.className = "detail-body"; const grid = document.createElement("div"); grid.className = "detail-grid";
  [["Categoría", product.categoria], ["Lote", product.lote], ["Stock", product.cantidad], ["Ubicación", locationName(product.ubicacionActual)], ["Origen", locationName(product.origen)], ["Destino", locationName(product.destino)], ["Estado", productStatus(product)], ["Vencimiento", product.fechaVencimiento || "—"], ["Code 1D", product.codigo1d || "—"], ["QR", product.codigoQr || "—"], ["RFID simulado", product.rfidUidEpc || "—"]].forEach(([label, value]) => { const box = document.createElement("div"); const span = document.createElement("span"); span.textContent = label; const strong = document.createElement("strong"); strong.textContent = value; box.append(span, strong); grid.append(box); });
  body.append(grid); root.append(hero, body); dialog.showModal();
}

export function populateProductSelects() {
  ["#generatorProduct", "#rfidProduct", "#traceProduct", "#eventProduct", "#mapProductFilter"].forEach(selector => fillSelect($(selector), state.products, { placeholder: selector === "#generatorProduct" ? "Sin relacionar / valor manual" : selector === "#mapProductFilter" ? "Todos los productos" : "Seleccionar producto" }));
}

export function bindProducts() {
  $("#newProductBtn").addEventListener("click", () => $("#productDialog").showModal());
  $("#heroNewProduct").addEventListener("click", () => $("#productDialog").showModal());
  $("#generateProductId").addEventListener("click", () => { const form = $("#productForm"); $("#productId").value = makeProductId({ categoria: form.elements.categoria.value, lote: form.elements.lote.value }, state.products); });
  $("#productSearch").addEventListener("input", event => { state.filters.productSearch = event.target.value; state.productPage = 1; renderProducts(); });
  $("#productCategoryFilter").addEventListener("change", event => { state.filters.productCategory = event.target.value; state.productPage = 1; renderProducts(); });
  $("#productStatusFilter").addEventListener("change", event => { state.filters.productStatus = event.target.value; state.productPage = 1; renderProducts(); });
  $("#productsBody").addEventListener("click", event => { const button = event.target.closest("button[data-action]"); if (!button) return; const product = state.products.find(item => item.idProducto === button.dataset.id); if (!product) return; if (button.dataset.action === "detail") showProductDetail(product); if (button.dataset.action === "trace") { $("#traceProduct").value = product.idProducto; navigate("trace"); document.dispatchEvent(new CustomEvent("trace:render", { detail: product.idProducto })); } if (button.dataset.action === "event") document.dispatchEvent(new CustomEvent("event:open", { detail: product.idProducto })); });
  $("#productForm").addEventListener("submit", async event => {
    event.preventDefault(); const form = event.currentTarget; showFormError("#productFormError");
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form)); data.cantidad = Number(data.cantidad);
    if (state.products.some(product => product.idProducto.toLowerCase() === data.idProducto.trim().toLowerCase())) { showFormError("#productFormError", "Ya existe un producto con ese ID."); return; }
    const button = $("#saveProductBtn"); button.disabled = true;
    try { await api.createProduct(data); form.reset(); $("#productDialog").close(); toast("Producto guardado", `${data.idProducto} se registró en Google Sheets.`); document.dispatchEvent(new Event("data:refresh")); }
    catch (error) { showFormError("#productFormError", error.message); }
    finally { button.disabled = false; }
  });
}
