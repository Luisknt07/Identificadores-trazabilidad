import assert from "node:assert/strict";
import { calculateEanCheckDigit, makeProductId, normalizeEan, normalizeIsmn, normalizeProduct, parseCSV, productStatus } from "../assets/js/utils.js";
import { buildEventsGeoJSON, buildLocationsGeoJSON, haversineDistance, resolveLocation, validateGeo } from "../assets/js/geo.js";

assert.equal(calculateEanCheckDigit("750123456789"), "3");
assert.equal(normalizeEan("750123456789"), "7501234567893");
assert.equal(normalizeEan("7501234567893"), "7501234567893");
assert.throws(() => normalizeEan("7501234567894"));
assert.equal(normalizeIsmn("979-0-12345678-5"), "9790123456785");
assert.equal(normalizeIsmn("979012345678"), "9790123456785");
assert.throws(() => normalizeIsmn("9780123456786"));

const parsed = parseCSV('ID_PRODUCTO,NOMBRE,DESCRIPCION\r\nP-1,"Caja, grande","Dijo ""hola"""');
assert.equal(parsed[0].nombre, "Caja, grande");
assert.equal(parsed[0].descripcion, 'Dijo "hola"');

const product = normalizeProduct({ ID_PRODUCTO: "P-1", NOMBRE: "Caja", CANTIDAD: "5", CATEGORIA: "Empaque" });
assert.equal(product.idProducto, "P-1"); assert.equal(product.cantidad, 5); assert.equal(productStatus(product), "Stock bajo");
assert.equal(productStatus({ cantidad: 0, estado: "" }), "Agotado");
assert.equal(productStatus({ cantidad: 6, estado: "" }), "Disponible");

const existing = [{ idProducto: "UPEC-ALM-ALI-P001-L03" }];
assert.equal(makeProductId({ categoria: "Alimentos", lote: "L03" }, existing), "UPEC-ALM-ALI-P002-L03");

const twentyMetersNorth = 20 / 111320;
assert.ok(Math.abs(haversineDistance(0, 0, twentyMetersNorth, 0) - 20) < 0.2);
assert.equal(validateGeo({ lat: twentyMetersNorth, lon: 0, accuracy: 8, declaredLat: 0, declaredLon: 0, radius: 150 }).status, "OK");
assert.equal(validateGeo({ lat: 0.00764, lon: 0, accuracy: 10, declaredLat: 0, declaredLon: 0, radius: 150 }).status, "FUERA_GEOCERCA");
assert.equal(validateGeo({ lat: twentyMetersNorth, lon: 0, accuracy: 600, declaredLat: 0, declaredLon: 0, radius: 150 }).status, "BAJA_PRECISION");
assert.equal(validateGeo({ lat: "", lon: "", declaredLat: 0, declaredLon: 0, radius: 150 }).status, "SIN_GPS");

const locations = [
  { idUbicacion: "CD-1", nombre: "Centro", tipo: "Centro de distribución", lat: 0.81234, lon: -77.71782, radioGeocercaM: 150, padreId: "", activo: true },
  { idUbicacion: "RACK-1", nombre: "Rack A01", tipo: "Rack", lat: null, lon: null, radioGeocercaM: null, padreId: "CD-1", activo: true }
];
assert.equal(resolveLocation(locations, "RACK-1").lat, 0.81234);
assert.deepEqual(buildLocationsGeoJSON(locations).features[0].geometry.coordinates, [-77.71782, 0.81234]);
const eventGeoJSON = buildEventsGeoJSON([{ idEvento: "E-1", idProducto: "P-1", evento: "Recepción", fechaHora: "2026-08-26T12:00:00Z", latCapturada: 0.8125, lonCapturada: -77.71765, precisionM: 8, distanciaDeclaradaM: 22.4, validacionGeo: "OK" }]);
assert.deepEqual(eventGeoJSON.features[0].geometry.coordinates, [-77.71765, 0.8125]);

console.log("Todas las pruebas lógicas aprobaron.");
