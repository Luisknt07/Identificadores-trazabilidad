import assert from "node:assert/strict";
import { calculateEanCheckDigit, makeProductId, normalizeEan, normalizeIsmn, normalizeProduct, parseCSV, productStatus } from "../assets/js/utils.js";

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

console.log("Todas las pruebas lógicas aprobaron.");
