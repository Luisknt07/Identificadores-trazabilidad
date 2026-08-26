/**
 * LogiTrace API para Google Sheets.
 * Desplegar como aplicación web: ejecutar como propietario y acceso para cualquier usuario.
 */
const SPREADSHEET_ID = "1LqSaUtezToYJPRM65GRr-U5IHxHLR677faxWFkogRic";
const API_VERSION = "2026-08-26.3-geo";
const TIMEZONE = "America/Guayaquil";
const PRODUCT_SHEET = "PRODUCTOS";
const EVENT_SHEET = "EVENTOS";
const LOCATION_SHEET = "Ubicaciones";
const MAX_ACCEPTABLE_ACCURACY_M = 100;

const PRODUCT_HEADERS = [
  "ID_PRODUCTO", "NOMBRE", "CATEGORIA", "LOTE", "CANTIDAD", "FECHA_VENCIMIENTO",
  "ORIGEN", "DESTINO", "TIPO_IDENTIFICACION", "CODIGO_GENERADO", "UBICACION_ACTUAL",
  "TIPO_CODIGO_1D", "CODIGO_1D", "CODIGO_QR", "RFID_UID_EPC", "FECHA_REGISTRO",
  "ULTIMA_ACTUALIZACION", "ESTADO", "DESCRIPCION"
];

const EVENT_HEADERS = [
  "ID_EVENTO", "FECHA_HORA", "ID_PRODUCTO", "TIPO_IDENTIFICACION", "CODIGO_LEIDO",
  "EVENTO", "UBICACION", "ACTOR", "OBSERVACION", "ESTADO", "CANTIDAD_MOVIMIENTO",
  "STOCK_ANTES", "STOCK_DESPUES", "UBICACION_ORIGEN", "UBICACION_DESTINO",
  "ID_UBICACION_DECLARADA", "LAT_CAPTURADA", "LON_CAPTURADA", "PRECISION_M",
  "FUENTE_UBICACION", "DISTANCIA_DECLARADA_M", "VALIDACION_GEO"
];

const LOCATION_HEADERS = [
  "ID_UBICACION", "NOMBRE", "TIPO", "DIRECCION", "LAT", "LON",
  "RADIO_GEOCERCA_M", "PADRE_ID", "ACTIVO"
];

const EVENT_TYPES = ["Recepción", "Ingreso al almacén", "Ubicación", "Movimiento interno", "Preparación de pedido", "Despacho", "Entrega", "Devolución", "Incidencia"];
const STOCK_IN_EVENTS = ["Recepción", "Devolución"];
const STOCK_OUT_EVENTS = ["Despacho"];
const QUANTITY_EVENTS = STOCK_IN_EVENTS.concat(STOCK_OUT_EVENTS);
const LOCATION_EVENTS = ["Ingreso al almacén", "Ubicación", "Movimiento interno"];

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || "health";
    let data;
    switch (action) {
      case "health": data = health(); break;
      case "products": data = getProducts(); break;
      case "product": data = getProduct(requireText_(params.id, "ID_REQUIRED", "Indica el ID del producto.")); break;
      case "events": data = getEvents(params.productId || ""); break;
      case "locations": data = getLocations(); break;
      case "location": data = getLocation(requireText_(params.id, "LOCATION_ID_REQUIRED", "Indica el ID de la ubicación.")); break;
      case "geoEvents": data = getGeoEvents(); break;
      case "trace": data = { product: getProduct(requireText_(params.productId, "PRODUCT_REQUIRED", "Indica el producto.")), events: getEvents(params.productId) }; break;
      case "inventory": data = getInventory(); break;
      case "dashboard": data = getDashboard(); break;
      case "findProductByCode": data = findProductByCode(requireText_(params.code, "CODE_REQUIRED", "Indica el código.")); break;
      default: throw new AppError_("UNKNOWN_ACTION", "Acción no reconocida: " + action);
    }
    return respond_(true, "Consulta realizada correctamente", data);
  } catch (error) { return errorResponse_(error); }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new AppError_("EMPTY_BODY", "La solicitud no contiene datos.");
    const payload = JSON.parse(e.postData.contents);
    const data = payload.data || {};
    let result;
    switch (payload.action) {
      case "createProduct": result = createProduct(data); break;
      case "updateProduct": result = updateProduct(data); break;
      case "createEvent": result = createEvent(data); break;
      case "createLocation": result = createLocation(data); break;
      case "updateLocation": result = updateLocation(data); break;
      default: throw new AppError_("UNKNOWN_ACTION", "Acción POST no reconocida.");
    }
    return respond_(true, "Operación completada correctamente", result);
  } catch (error) { return errorResponse_(error); }
}

function initializeSheets() {
  const spreadsheet = spreadsheet_();
  spreadsheet.setSpreadsheetTimeZone(TIMEZONE);
  const products = findOrCreateSheet_(PRODUCT_SHEET, PRODUCT_HEADERS);
  const events = findOrCreateSheet_(EVENT_SHEET, EVENT_HEADERS);
  const locations = findOrCreateSheet_(LOCATION_SHEET, LOCATION_HEADERS);
  ensureHeaders_(products, PRODUCT_HEADERS);
  ensureHeaders_(events, EVENT_HEADERS);
  ensureHeaders_(locations, LOCATION_HEADERS);
  styleHeader_(products); styleHeader_(events); styleHeader_(locations);
  products.setFrozenRows(1); events.setFrozenRows(1); locations.setFrozenRows(1);
  if (products.getMaxColumns() >= PRODUCT_HEADERS.indexOf("FECHA_REGISTRO") + 1) {
    const dateRows = Math.max(1, products.getLastRow() - 1);
    const registrationColumn = PRODUCT_HEADERS.indexOf("FECHA_REGISTRO") + 1;
    const updateColumn = PRODUCT_HEADERS.indexOf("ULTIMA_ACTUALIZACION") + 1;
    // Las tablas importadas desde Excel solo permiten cambiar el formato
    // de una columna cada vez.
    products.getRange(2, registrationColumn, dateRows, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
    products.getRange(2, updateColumn, dateRows, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
  }
  events.getRange(2, 2, Math.max(1, events.getLastRow() - 1), 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
  return { productsSheet: products.getName(), eventsSheet: events.getName(), locationsSheet: locations.getName(), spreadsheetId: SPREADSHEET_ID };
}

function health() {
  const spreadsheet = spreadsheet_();
  const products = spreadsheet.getSheetByName(PRODUCT_SHEET);
  const events = spreadsheet.getSheetByName(EVENT_SHEET);
  const locations = spreadsheet.getSheetByName(LOCATION_SHEET);
  const sheets = {
    productsSheet: products ? products.getName() : "",
    eventsSheet: events ? events.getName() : "",
    locationsSheet: locations ? locations.getName() : "",
    spreadsheetId: SPREADSHEET_ID
  };
  return { status: "ok", service: "LogiTrace API", apiVersion: API_VERSION, timestamp: new Date().toISOString(), timezone: TIMEZONE, spreadsheetId: SPREADSHEET_ID, writable: true, sheets: sheets };
}

function getProducts() {
  const sheet = productSheet_();
  return rowsAsObjects_(sheet).map(productToApi_).filter(function (row) { return row.idProducto; });
}

function getProduct(id) {
  const product = getProducts().find(function (item) { return same_(item.idProducto, id); });
  if (!product) throw new AppError_("PRODUCT_NOT_FOUND", "El producto no existe.");
  return product;
}

function createProduct(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = productSheet_();
    const id = requireText_(data.idProducto, "ID_REQUIRED", "El ID del producto es obligatorio.");
    const nombre = requireText_(data.nombre, "NAME_REQUIRED", "El nombre es obligatorio.");
    const categoria = requireText_(data.categoria, "CATEGORY_REQUIRED", "La categoría es obligatoria.");
    const lote = requireText_(data.lote, "LOT_REQUIRED", "El lote es obligatorio.");
    const cantidad = number_(data.cantidad, "INVALID_QUANTITY", "La cantidad debe ser un entero mayor o igual a cero.", true);
    if (findRow_(sheet, "ID_PRODUCTO", id)) throw new AppError_("DUPLICATE_PRODUCT", "Ya existe un producto con ese ID.");
    validateUniqueCodes_(sheet, data, "");
    const now = new Date();
    const record = {
      ID_PRODUCTO: id, NOMBRE: nombre, CATEGORIA: categoria, LOTE: lote, CANTIDAD: cantidad,
      FECHA_VENCIMIENTO: clean_(data.fechaVencimiento), ORIGEN: clean_(data.origen), DESTINO: clean_(data.destino),
      TIPO_IDENTIFICACION: clean_(data.tipoIdentificacion), CODIGO_GENERADO: clean_(data.codigoGenerado),
      UBICACION_ACTUAL: clean_(data.ubicacionActual), TIPO_CODIGO_1D: clean_(data.tipoCodigo1d),
      CODIGO_1D: clean_(data.codigo1d), CODIGO_QR: clean_(data.codigoQr), RFID_UID_EPC: clean_(data.rfidUidEpc),
      FECHA_REGISTRO: now, ULTIMA_ACTUALIZACION: now, ESTADO: cantidad === 0 ? "Agotado" : "Disponible",
      DESCRIPCION: clean_(data.descripcion)
    };
    appendObject_(sheet, record);
    return productToApi_(record);
  } finally { lock.releaseLock(); }
}

function updateProduct(data) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const sheet = productSheet_();
    const id = requireText_(data.idProducto, "ID_REQUIRED", "El ID del producto es obligatorio.");
    const match = findRow_(sheet, "ID_PRODUCTO", id);
    if (!match) throw new AppError_("PRODUCT_NOT_FOUND", "El producto no existe.");
    validateUniqueCodes_(sheet, data, id);
    const allowed = {
      nombre: "NOMBRE", descripcion: "DESCRIPCION", categoria: "CATEGORIA", lote: "LOTE",
      fechaVencimiento: "FECHA_VENCIMIENTO", origen: "ORIGEN", destino: "DESTINO", ubicacionActual: "UBICACION_ACTUAL",
      tipoIdentificacion: "TIPO_IDENTIFICACION", codigoGenerado: "CODIGO_GENERADO", tipoCodigo1d: "TIPO_CODIGO_1D",
      codigo1d: "CODIGO_1D", codigoQr: "CODIGO_QR", rfidUidEpc: "RFID_UID_EPC", estado: "ESTADO"
    };
    Object.keys(allowed).forEach(function (key) { if (data[key] !== undefined) setCell_(sheet, match.rowNumber, allowed[key], clean_(data[key])); });
    setCell_(sheet, match.rowNumber, "ULTIMA_ACTUALIZACION", new Date());
    return getProduct(id);
  } finally { lock.releaseLock(); }
}

function getLocations() {
  return rowsAsObjects_(locationSheet_()).map(locationToApi_).filter(function (location) { return location.idUbicacion; });
}

function getLocation(id) {
  const location = getLocations().find(function (item) { return same_(item.idUbicacion, id); });
  if (!location) throw new AppError_("LOCATION_NOT_FOUND", "La ubicación no existe.");
  return location;
}

function createLocation(data) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const sheet = locationSheet_();
    const id = requireText_(data.idUbicacion, "LOCATION_ID_REQUIRED", "El ID de ubicación es obligatorio.");
    if (findRow_(sheet, "ID_UBICACION", id)) throw new AppError_("DUPLICATE_LOCATION", "Ya existe una ubicación con ese ID.");
    const record = locationRecord_(data, id);
    appendObject_(sheet, record);
    return locationToApi_(record);
  } finally { lock.releaseLock(); }
}

function updateLocation(data) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const sheet = locationSheet_(); const id = requireText_(data.idUbicacion, "LOCATION_ID_REQUIRED", "El ID de ubicación es obligatorio."); const match = findRow_(sheet, "ID_UBICACION", id);
    if (!match) throw new AppError_("LOCATION_NOT_FOUND", "La ubicación no existe.");
    const merged = Object.assign({}, locationToApi_(match.object), data); const record = locationRecord_(merged, id);
    Object.keys(record).forEach(function (header) { if (header !== "ID_UBICACION") setCell_(sheet, match.rowNumber, header, record[header]); });
    return getLocation(id);
  } finally { lock.releaseLock(); }
}

function locationRecord_(data, id) {
  const lat = decimalOrBlank_(data.lat, "INVALID_LATITUDE", "La latitud debe estar entre -90 y 90.", -90, 90);
  const lon = decimalOrBlank_(data.lon, "INVALID_LONGITUDE", "La longitud debe estar entre -180 y 180.", -180, 180);
  if ((lat === "") !== (lon === "")) throw new AppError_("INCOMPLETE_COORDINATES", "Latitud y longitud deben informarse juntas.");
  const radius = decimalOrBlank_(data.radioGeocercaM, "INVALID_RADIUS", "El radio debe ser mayor que cero.", 0, null, false);
  const parent = clean_(data.padreId); if (parent && same_(parent, id)) throw new AppError_("LOCATION_CYCLE", "Una ubicación no puede ser su propio padre.");
  if (parent) getLocation(parent);
  if (lat === "" && !parent) throw new AppError_("COORDINATES_REQUIRED", "Indica coordenadas o una ubicación padre.");
  return { ID_UBICACION: id, NOMBRE: requireText_(data.nombre, "LOCATION_NAME_REQUIRED", "El nombre es obligatorio."), TIPO: requireText_(data.tipo, "LOCATION_TYPE_REQUIRED", "El tipo es obligatorio."), DIRECCION: clean_(data.direccion), LAT: lat, LON: lon, RADIO_GEOCERCA_M: radius, PADRE_ID: parent, ACTIVO: booleanYesNo_(data.activo) };
}

function resolveLocationCoordinates(idUbicacion) { return resolveLocationCoordinates_(idUbicacion, {}); }
function resolveLocationCoordinates_(idUbicacion, visited) {
  const id = requireText_(idUbicacion, "LOCATION_ID_REQUIRED", "Indica la ubicación declarada.");
  if (visited[normalize_(id)]) throw new AppError_("LOCATION_CYCLE", "Se detectó un ciclo en la jerarquía de ubicaciones.");
  visited[normalize_(id)] = true;
  const location = getLocation(id);
  if (isCoordinate_(location.lat, -90, 90) && isCoordinate_(location.lon, -180, 180)) return { idUbicacion: location.idUbicacion, nombre: location.nombre, lat: Number(location.lat), lon: Number(location.lon), radio: positiveOrNull_(location.radioGeocercaM), effectiveLocationId: location.idUbicacion };
  if (!location.padreId) throw new AppError_("LOCATION_WITHOUT_COORDINATES", "La ubicación no tiene coordenadas ni ubicación padre.");
  const parent = resolveLocationCoordinates_(location.padreId, visited);
  return { idUbicacion: location.idUbicacion, nombre: location.nombre, lat: parent.lat, lon: parent.lon, radio: positiveOrNull_(location.radioGeocercaM) || parent.radio, effectiveLocationId: parent.effectiveLocationId };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRadians = function (degrees) { return Number(degrees) * Math.PI / 180; };
  const deltaLat = toRadians(Number(lat2) - Number(lat1)); const deltaLon = toRadians(Number(lon2) - Number(lon1));
  const a = Math.pow(Math.sin(deltaLat / 2), 2) + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.pow(Math.sin(deltaLon / 2), 2);
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validateGeoEvent(data, idUbicacion) {
  const lat = decimalOrBlank_(data.latCapturada, "INVALID_CAPTURED_LATITUDE", "Latitud capturada inválida.", -90, 90); const lon = decimalOrBlank_(data.lonCapturada, "INVALID_CAPTURED_LONGITUDE", "Longitud capturada inválida.", -180, 180);
  if (lat === "" || lon === "") return { status: "SIN_GPS", distanceMeters: null, geofenceRadiusMeters: null, accuracyMeters: null, declaredLocation: idUbicacion ? getLocation(idUbicacion).nombre : "Sin declarar" };
  const accuracy = decimalOrBlank_(data.precisionM, "INVALID_ACCURACY", "La precisión debe ser mayor o igual a cero.", 0, null, true); const location = resolveLocationCoordinates(idUbicacion); const distance = haversineDistance(location.lat, location.lon, lat, lon);
  let status = "OK"; if (accuracy !== "" && Number(accuracy) > MAX_ACCEPTABLE_ACCURACY_M) status = "BAJA_PRECISION"; else if (!location.radio || distance > location.radio) status = "FUERA_GEOCERCA";
  return { status: status, distanceMeters: Math.round(distance * 10) / 10, geofenceRadiusMeters: location.radio, accuracyMeters: accuracy === "" ? null : Number(accuracy), declaredLocation: location.nombre, effectiveLocationId: location.effectiveLocationId };
}

function getGeoEvents() { return getEvents("").filter(function (event) { return event.latCapturada !== null && event.lonCapturada !== null; }); }

function buildLocationsGeoJSON() {
  const locations = getLocations(); const features = [];
  locations.forEach(function (location) { try { const resolved = resolveLocationCoordinates(location.idUbicacion); features.push({ type: "Feature", geometry: { type: "Point", coordinates: [resolved.lon, resolved.lat] }, properties: { id_ubicacion: location.idUbicacion, nombre: location.nombre, tipo: location.tipo, radio_geocerca_m: resolved.radio } }); } catch (ignore) {} });
  return { type: "FeatureCollection", features: features };
}

function buildEventsGeoJSON() {
  return { type: "FeatureCollection", features: getGeoEvents().map(function (event) { return { type: "Feature", geometry: { type: "Point", coordinates: [event.lonCapturada, event.latCapturada] }, properties: { id_evento: event.idEvento, id_producto: event.idProducto, evento: event.evento, fecha_hora: event.fechaHora, id_ubicacion_declarada: event.idUbicacionDeclarada, precision_m: event.precisionM, distancia_declarada_m: event.distanciaDeclaradaM, validacion_geo: event.validacionGeo } }; }) };
}

function getEvents(productId) {
  return rowsAsObjects_(eventSheet_()).map(eventToApi_).filter(function (event) { return event.idEvento && (!productId || same_(event.idProducto, productId)); });
}

function createEvent(data) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const productSheet = productSheet_(); const eventSheet = eventSheet_();
    const idProducto = requireText_(data.idProducto, "PRODUCT_REQUIRED", "Selecciona un producto.");
    const productMatch = findRow_(productSheet, "ID_PRODUCTO", idProducto);
    if (!productMatch) throw new AppError_("PRODUCT_NOT_FOUND", "No se puede registrar un evento para un producto inexistente.");
    const evento = requireText_(data.evento, "EVENT_REQUIRED", "Selecciona un evento.");
    if (EVENT_TYPES.indexOf(evento) === -1) throw new AppError_("INVALID_EVENT", "El tipo de evento no es válido.");
    const actor = requireText_(data.actor, "ACTOR_REQUIRED", "El actor es obligatorio.");
    const product = productMatch.object; const stockAntes = Number(product.CANTIDAD) || 0;
    const cantidad = QUANTITY_EVENTS.indexOf(evento) >= 0 ? number_(data.cantidadMovimiento, "INVALID_MOVEMENT_QUANTITY", "La cantidad del movimiento debe ser mayor que cero.", false) : 0;
    let stockDespues = stockAntes;
    if (STOCK_IN_EVENTS.indexOf(evento) >= 0) stockDespues += cantidad;
    if (STOCK_OUT_EVENTS.indexOf(evento) >= 0) stockDespues -= cantidad;
    if (stockDespues < 0) throw new AppError_("INSUFFICIENT_STOCK", "Stock insuficiente. Disponible: " + stockAntes + ".");
    const origen = clean_(data.ubicacionOrigen) || clean_(product.UBICACION_ACTUAL);
    const destino = clean_(data.ubicacionDestino);
    if (LOCATION_EVENTS.indexOf(evento) >= 0 && !destino) throw new AppError_("LOCATION_REQUIRED", "La ubicación destino es obligatoria.");
    const nuevaUbicacion = (LOCATION_EVENTS.indexOf(evento) >= 0 || evento === "Recepción") && destino ? destino : clean_(product.UBICACION_ACTUAL);
    const idUbicacionDeclarada = clean_(data.idUbicacionDeclarada) || destino || nuevaUbicacion || origen;
    let geoValidation;
    try { geoValidation = validateGeoEvent(data, idUbicacionDeclarada); }
    catch (geoError) {
      if (clean_(data.latCapturada) || clean_(data.lonCapturada) || clean_(data.idUbicacionDeclarada)) throw geoError;
      geoValidation = { status: "SIN_GPS", distanceMeters: null, geofenceRadiusMeters: null, accuracyMeters: null, declaredLocation: idUbicacionDeclarada || "Sin declarar" };
    }
    const now = new Date();
    const eventRecord = {
      ID_EVENTO: "EVT-" + Utilities.getUuid(), FECHA_HORA: now, ID_PRODUCTO: idProducto,
      TIPO_IDENTIFICACION: clean_(data.tipoIdentificacion), CODIGO_LEIDO: clean_(data.codigoLeido), EVENTO: evento,
      UBICACION: nuevaUbicacion || origen, ACTOR: actor, OBSERVACION: clean_(data.observacion),
      ESTADO: clean_(data.estado) || "Completado", CANTIDAD_MOVIMIENTO: cantidad,
      STOCK_ANTES: stockAntes, STOCK_DESPUES: stockDespues, UBICACION_ORIGEN: origen, UBICACION_DESTINO: destino,
      ID_UBICACION_DECLARADA: idUbicacionDeclarada, LAT_CAPTURADA: clean_(data.latCapturada) === "" ? "" : Number(data.latCapturada),
      LON_CAPTURADA: clean_(data.lonCapturada) === "" ? "" : Number(data.lonCapturada), PRECISION_M: clean_(data.precisionM) === "" ? "" : Number(data.precisionM),
      FUENTE_UBICACION: clean_(data.fuenteUbicacion) || (clean_(data.latCapturada) ? "GPS" : "SIN_GPS"), DISTANCIA_DECLARADA_M: geoValidation.distanceMeters === null ? "" : geoValidation.distanceMeters,
      VALIDACION_GEO: geoValidation.status
    };
    // La fila del producto se actualiza primero. Si fallara el append, se restauran sus valores.
    const previousLocation = clean_(product.UBICACION_ACTUAL); const previousState = clean_(product.ESTADO);
    setCell_(productSheet, productMatch.rowNumber, "CANTIDAD", stockDespues);
    if (nuevaUbicacion) setCell_(productSheet, productMatch.rowNumber, "UBICACION_ACTUAL", nuevaUbicacion);
    setCell_(productSheet, productMatch.rowNumber, "ESTADO", stockDespues === 0 ? "Agotado" : stockDespues <= 5 ? "Stock bajo" : "Disponible");
    setCell_(productSheet, productMatch.rowNumber, "ULTIMA_ACTUALIZACION", now);
    try { appendObject_(eventSheet, eventRecord); }
    catch (error) {
      setCell_(productSheet, productMatch.rowNumber, "CANTIDAD", stockAntes);
      setCell_(productSheet, productMatch.rowNumber, "UBICACION_ACTUAL", previousLocation);
      setCell_(productSheet, productMatch.rowNumber, "ESTADO", previousState);
      throw error;
    }
    SpreadsheetApp.flush();
    return { event: eventToApi_(eventRecord), geoValidation: geoValidation };
  } finally { lock.releaseLock(); }
}

function getInventory() {
  return getProducts().map(function (product) { return { idProducto: product.idProducto, nombre: product.nombre, categoria: product.categoria, lote: product.lote, cantidad: product.cantidad, ubicacionActual: product.ubicacionActual, estado: product.estado, ultimaActualizacion: product.ultimaActualizacion }; });
}

function getDashboard() {
  const products = getProducts(); const events = getEvents("");
  const today = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
  const categories = {}; const technologies = { CODE128: 0, EAN13: 0, QR: 0, RFID: 0 };
  products.forEach(function (p) {
    categories[p.categoria] = (categories[p.categoria] || 0) + p.cantidad;
    if (p.codigo1d) technologies[String(p.tipoCodigo1d).toUpperCase().indexOf("EAN") >= 0 ? "EAN13" : "CODE128"] += 1;
    if (p.codigoQr) technologies.QR += 1; if (p.rfidUidEpc) technologies.RFID += 1;
  });
  const geoCounts = { OK: 0, FUERA_GEOCERCA: 0, BAJA_PRECISION: 0, SIN_GPS: 0 }; const geoExceptionsByLocation = {};
  events.forEach(function (event) { const status = event.validacionGeo || "SIN_GPS"; geoCounts[status] = (geoCounts[status] || 0) + 1; if (status === "FUERA_GEOCERCA") geoExceptionsByLocation[event.idUbicacionDeclarada || "Sin declarar"] = (geoExceptionsByLocation[event.idUbicacionDeclarada || "Sin declarar"] || 0) + 1; });
  return {
    products: products.length, units: products.reduce(function (sum, p) { return sum + p.cantidad; }, 0),
    categories: Object.keys(categories).length, lowStock: products.filter(function (p) { return p.cantidad > 0 && p.cantidad <= 5; }).length,
    outOfStock: products.filter(function (p) { return p.cantidad === 0; }).length, events: events.length,
    eventsToday: events.filter(function (event) { return dateKey_(event.fechaHora) === today; }).length,
    receptions: events.filter(function (event) { return event.evento === "Recepción"; }).length,
    dispatches: events.filter(function (event) { return event.evento === "Despacho"; }).length,
    incidents: events.filter(function (event) { return event.evento === "Incidencia"; }).length,
    inventoryByCategory: categories, technologies: technologies, geoValidation: geoCounts, geoExceptionsByLocation: geoExceptionsByLocation, lastSync: new Date().toISOString()
  };
}

function findProductByCode(code) {
  const wanted = clean_(code); let qrId = wanted;
  if (wanted.charAt(0) === "{") { try { qrId = JSON.parse(wanted).id || wanted; } catch (ignore) {} }
  const product = getProducts().find(function (p) { return [p.idProducto, p.codigo1d, p.codigoQr, p.rfidUidEpc, p.codigoGenerado].some(function (value) { return value && (same_(value, wanted) || same_(value, qrId)); }); });
  if (!product) throw new AppError_("CODE_NOT_FOUND", "El código no está asociado a un producto.");
  return product;
}

function validateUniqueCodes_(sheet, data, ownId) {
  // Un mismo producto puede representar su ID tanto en Code 128 como en QR.
  // La restricción real es que ese valor no pertenezca a otro producto.
  const candidates = Array.from(new Set([data.codigoGenerado, data.codigo1d, data.codigoQr, data.rfidUidEpc].map(clean_).filter(String)));
  if (!candidates.length) return;
  rowsAsObjects_(sheet).forEach(function (row) {
    if (ownId && same_(row.ID_PRODUCTO, ownId)) return;
    [row.CODIGO_GENERADO, row.CODIGO_1D, row.CODIGO_QR, row.RFID_UID_EPC].forEach(function (code) {
      if (code && candidates.some(function (candidate) { return same_(candidate, code); })) throw new AppError_("DUPLICATE_CODE", "Uno de los códigos ya pertenece a otro producto.");
    });
  });
  if (data.tipoCodigo1d && String(data.tipoCodigo1d).toUpperCase().indexOf("EAN") >= 0 && data.codigo1d && !validEan13_(String(data.codigo1d))) throw new AppError_("INVALID_EAN13", "El EAN-13 no tiene un checksum válido.");
}

function validEan13_(value) {
  if (!/^\d{13}$/.test(value)) return false;
  let sum = 0; for (let i = 0; i < 12; i += 1) sum += Number(value.charAt(i)) * (i % 2 === 0 ? 1 : 3);
  return String((10 - sum % 10) % 10) === value.charAt(12);
}

function spreadsheet_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function productSheet_() { const sheet = findOrCreateSheet_(PRODUCT_SHEET, PRODUCT_HEADERS); ensureHeaders_(sheet, PRODUCT_HEADERS); return sheet; }
function eventSheet_() { const sheet = findOrCreateSheet_(EVENT_SHEET, EVENT_HEADERS); ensureHeaders_(sheet, EVENT_HEADERS); return sheet; }
function locationSheet_() { const sheet = findOrCreateSheet_(LOCATION_SHEET, LOCATION_HEADERS); ensureHeaders_(sheet, LOCATION_HEADERS); return sheet; }

function findOrCreateSheet_(name, headers) {
  const ss = spreadsheet_(); const normalizedName = normalize_(name);
  let sheet = ss.getSheets().find(function (item) { return normalize_(item.getName()) === normalizedName; });
  if (!sheet && name === PRODUCT_SHEET) {
    sheet = ss.getSheets().find(function (item) { return item.getLastColumn() && headerMap_(item).ID_PRODUCTO; });
  }
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function ensureHeaders_(sheet, required) {
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, required.length).setValues([required]);
  const existing = headerMap_(sheet); const missing = required.filter(function (header) { return !existing[header]; });
  if (missing.length) sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
}

function headerMap_(sheet) {
  if (!sheet.getLastColumn()) return {};
  const values = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]; const map = {};
  values.forEach(function (header, index) { map[normalize_(header)] = index + 1; }); return map;
}

function rowsAsObjects_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues(); const headers = values.shift().map(normalize_);
  return values.filter(function (row) { return row.some(function (cell) { return cell !== ""; }); }).map(function (row) { const object = {}; headers.forEach(function (header, index) { object[header] = serialize_(row[index]); }); return object; });
}

function findRow_(sheet, header, value) {
  const column = headerMap_(sheet)[normalize_(header)]; if (!column || sheet.getLastRow() < 2) return null;
  const match = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getDisplayValues().findIndex(function (row) { return same_(row[0], value); });
  if (match < 0) return null; const rowNumber = match + 2; return { rowNumber: rowNumber, object: rowObject_(sheet, rowNumber) };
}

function rowObject_(sheet, rowNumber) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(normalize_);
  const values = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0]; const object = {};
  headers.forEach(function (header, index) { object[header] = serialize_(values[index]); }); return object;
}

function appendObject_(sheet, record) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(normalize_);
  sheet.appendRow(headers.map(function (header) { return record[header] !== undefined ? record[header] : ""; }));
}
function setCell_(sheet, row, header, value) { const column = headerMap_(sheet)[normalize_(header)]; if (!column) throw new AppError_("MISSING_COLUMN", "Falta la columna " + header + "."); sheet.getRange(row, column).setValue(value); }
function styleHeader_(sheet) { if (!sheet.getLastColumn()) return; sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold").setBackground("#102a43").setFontColor("#ffffff"); }

function productToApi_(row) { return {
  idProducto: clean_(row.ID_PRODUCTO), nombre: clean_(row.NOMBRE), descripcion: clean_(row.DESCRIPCION), categoria: clean_(row.CATEGORIA), lote: clean_(row.LOTE), cantidad: Number(row.CANTIDAD) || 0,
  fechaVencimiento: serialize_(row.FECHA_VENCIMIENTO), origen: clean_(row.ORIGEN), destino: clean_(row.DESTINO), ubicacionActual: clean_(row.UBICACION_ACTUAL),
  tipoIdentificacion: clean_(row.TIPO_IDENTIFICACION), codigoGenerado: clean_(row.CODIGO_GENERADO), tipoCodigo1d: clean_(row.TIPO_CODIGO_1D), codigo1d: clean_(row.CODIGO_1D), codigoQr: clean_(row.CODIGO_QR), rfidUidEpc: clean_(row.RFID_UID_EPC),
  fechaRegistro: serialize_(row.FECHA_REGISTRO), ultimaActualizacion: serialize_(row.ULTIMA_ACTUALIZACION), estado: clean_(row.ESTADO)
}; }
function eventToApi_(row) { return {
  idEvento: clean_(row.ID_EVENTO), fechaHora: serialize_(row.FECHA_HORA), idProducto: clean_(row.ID_PRODUCTO), tipoIdentificacion: clean_(row.TIPO_IDENTIFICACION), codigoLeido: clean_(row.CODIGO_LEIDO), evento: clean_(row.EVENTO), ubicacion: clean_(row.UBICACION), actor: clean_(row.ACTOR), observacion: clean_(row.OBSERVACION), estado: clean_(row.ESTADO), cantidadMovimiento: Number(row.CANTIDAD_MOVIMIENTO) || 0, stockAntes: Number(row.STOCK_ANTES) || 0, stockDespues: Number(row.STOCK_DESPUES) || 0, ubicacionOrigen: clean_(row.UBICACION_ORIGEN), ubicacionDestino: clean_(row.UBICACION_DESTINO), idUbicacionDeclarada: clean_(row.ID_UBICACION_DECLARADA), latCapturada: nullableNumber_(row.LAT_CAPTURADA), lonCapturada: nullableNumber_(row.LON_CAPTURADA), precisionM: nullableNumber_(row.PRECISION_M), fuenteUbicacion: clean_(row.FUENTE_UBICACION) || "SIN_GPS", distanciaDeclaradaM: nullableNumber_(row.DISTANCIA_DECLARADA_M), validacionGeo: clean_(row.VALIDACION_GEO) || "SIN_GPS"
}; }
function locationToApi_(row) { return { idUbicacion: clean_(row.ID_UBICACION), nombre: clean_(row.NOMBRE), tipo: clean_(row.TIPO), direccion: clean_(row.DIRECCION), lat: nullableNumber_(row.LAT), lon: nullableNumber_(row.LON), radioGeocercaM: nullableNumber_(row.RADIO_GEOCERCA_M), padreId: clean_(row.PADRE_ID), activo: !["NO", "FALSE", "0", "INACTIVO"].some(function (value) { return same_(row.ACTIVO, value); }) }; }

function respond_(success, message, data, errorCode) { return ContentService.createTextOutput(JSON.stringify({ success: success, message: message, data: data === undefined ? null : data, errorCode: errorCode || undefined })).setMimeType(ContentService.MimeType.JSON); }
function errorResponse_(error) { console.error(error && error.stack ? error.stack : error); return respond_(false, error.message || "Error interno del servidor.", null, error.code || "INTERNAL_ERROR"); }
function AppError_(code, message) { this.name = "AppError"; this.code = code; this.message = message; this.stack = new Error(message).stack; } AppError_.prototype = Object.create(Error.prototype);
function requireText_(value, code, message) { const clean = clean_(value); if (!clean) throw new AppError_(code, message); return clean; }
function clean_(value) { return value === null || value === undefined ? "" : String(value).trim(); }
function same_(a, b) { return clean_(a).toLowerCase() === clean_(b).toLowerCase(); }
function normalize_(value) { return clean_(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]+/g, "_").replace(/_+/g, "_").toUpperCase(); }
function number_(value, code, message, allowZero) { const number = Number(value); if (!Number.isInteger(number) || number < (allowZero ? 0 : 1)) throw new AppError_(code, message); return number; }
function nullableNumber_(value) { return clean_(value) === "" || !isFinite(Number(value)) ? null : Number(value); }
function decimalOrBlank_(value, code, message, min, max, allowZero) { if (clean_(value) === "") return ""; const number = Number(value); if (!isFinite(number) || (min !== null && number < min) || (max !== null && number > max) || (allowZero === false && number === 0)) throw new AppError_(code, message); return number; }
function isCoordinate_(value, min, max) { return clean_(value) !== "" && isFinite(Number(value)) && Number(value) >= min && Number(value) <= max; }
function positiveOrNull_(value) { const number = Number(value); return isFinite(number) && number > 0 ? number : null; }
function booleanYesNo_(value) { if (value === false || ["NO", "FALSE", "0", "INACTIVO"].some(function (item) { return same_(value, item); })) return "No"; return "Sí"; }
function serialize_(value) { return Object.prototype.toString.call(value) === "[object Date]" ? value.toISOString() : (value === null || value === undefined ? "" : value); }
function dateKey_(value) { const date = new Date(value); return isNaN(date.getTime()) ? "" : Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd"); }
