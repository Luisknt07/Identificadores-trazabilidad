import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/PC2/.codex/visualizations/2026/08/26/01a03bb9-da84-76b2-b4ca-09238c9bd7a9/outputs/logitrace-sheets";
const previewDir = path.join(outputDir, "previews");
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const COLORS = {
  navy: "#102A43", navy2: "#173F5F", teal: "#00A896", tealDark: "#007F73",
  tealSoft: "#DFF7F3", canvas: "#F4F7FA", line: "#DCE6ED", muted: "#66788A",
  white: "#FFFFFF", warning: "#FFF3DB", danger: "#FDEBED", blueSoft: "#E8F1FB"
};
const excelDate = (year, month, day, hour = 0, minute = 0) => new Date(Date.UTC(year, month - 1, day, hour, minute));

const productsHeaders = [
  "ID_PRODUCTO", "NOMBRE", "CATEGORIA", "LOTE", "CANTIDAD", "FECHA_VENCIMIENTO",
  "ORIGEN", "DESTINO", "TIPO_IDENTIFICACION", "CODIGO_GENERADO", "UBICACION_ACTUAL",
  "TIPO_CODIGO_1D", "CODIGO_1D", "CODIGO_QR", "RFID_UID_EPC", "FECHA_REGISTRO",
  "ULTIMA_ACTUALIZACION", "ESTADO", "DESCRIPCION"
];

const eventHeaders = [
  "ID_EVENTO", "FECHA_HORA", "ID_PRODUCTO", "TIPO_IDENTIFICACION", "CODIGO_LEIDO",
  "EVENTO", "UBICACION", "ACTOR", "OBSERVACION", "ESTADO", "CANTIDAD_MOVIMIENTO",
  "STOCK_ANTES", "STOCK_DESPUES", "UBICACION_ORIGEN", "UBICACION_DESTINO"
];

const wb = Workbook.create();
const readme = wb.worksheets.add("LEEME");
const products = wb.worksheets.add("PRODUCTOS");
const events = wb.worksheets.add("EVENTOS");
const catalogs = wb.worksheets.add("CATALOGOS");
const example = wb.worksheets.add("EJEMPLO_NO_IMPORTAR");

function styleDatabaseSheet(sheet, lastColumn, widths) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  const header = sheet.getRange(`A1:${lastColumn}1`);
  header.format = {
    fill: COLORS.navy,
    font: { bold: true, color: COLORS.white, size: 10 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { bottom: { style: "medium", color: COLORS.teal } }
  };
  header.format.rowHeightPx = 42;
  widths.forEach(([column, width]) => { sheet.getRange(`${column}:${column}`).format.columnWidthPx = width; });
}

// LEEME
readme.showGridLines = false;
readme.mergeCells("A1:H2");
readme.getRange("A1").values = [["LOGITRACE  |  BASE DE DATOS PARA GOOGLE SHEETS"]];
readme.getRange("A1:H2").format = {
  fill: COLORS.navy,
  font: { bold: true, color: COLORS.white, size: 20 },
  horizontalAlignment: "left",
  verticalAlignment: "center",
  borders: { bottom: { style: "thick", color: COLORS.teal } }
};
readme.mergeCells("A3:H3");
readme.getRange("A3").values = [["Plantilla operativa compatible con el frontend y con apps-script/Code.gs"]];
readme.getRange("A3:H3").format = { fill: COLORS.tealSoft, font: { color: COLORS.tealDark, bold: true, size: 11 }, verticalAlignment: "center" };
readme.getRange("A5:B11").values = [
  ["PARÁMETRO", "VALOR CONFIGURADO"],
  ["Sistema", "LogiTrace"],
  ["Spreadsheet ID actual", "1hJGCkHAOq-ZWSTrLeoPAwIxnI1BecZqnMjJjTTf0y4w"],
  ["Pestaña de productos", "PRODUCTOS"],
  ["Pestaña de eventos", "EVENTOS"],
  ["Zona horaria", "America/Guayaquil"],
  ["Umbral de stock bajo", 5]
];
readme.getRange("A5:B5").format = { fill: COLORS.navy2, font: { bold: true, color: COLORS.white }, borders: { bottom: { style: "thin", color: COLORS.teal } } };
readme.getRange("A6:A11").format = { fill: COLORS.canvas, font: { bold: true, color: COLORS.navy } };
readme.getRange("B6:B11").format = { fill: COLORS.white, font: { color: COLORS.navy }, wrapText: true };
readme.getRange("A5:B11").format.borders = { preset: "outside", style: "thin", color: COLORS.line };

readme.mergeCells("D5:H5");
readme.getRange("D5").values = [["CÓMO CONSERVAR LA CONEXIÓN"]];
readme.getRange("D5:H5").format = { fill: COLORS.tealDark, font: { bold: true, color: COLORS.white }, verticalAlignment: "center" };
const steps = [
  ["1", "Importa este archivo dentro de la hoja de Google Sheets que ya usa LogiTrace. Mantén el Spreadsheet ID actual."],
  ["2", "Conserva exactamente los nombres PRODUCTOS y EVENTOS; no renombres ni elimines sus encabezados."],
  ["3", "Copia apps-script/Code.gs en Apps Script, ejecuta initializeSheets() y despliega como Web App."],
  ["4", "Pega la URL /exec del Web App en assets/js/config.js. El frontend habilitará las operaciones de escritura."],
  ["5", "Si subes este Excel como una hoja nueva, reemplaza el SPREADSHEET_ID tanto en config.js como en Code.gs."]
];
readme.getRange("D6:H10").values = steps.map(([number, text]) => [`PASO ${number}`, text, null, null, null]);
readme.getRange("D6:D10").format = { fill: COLORS.tealSoft, font: { bold: true, color: COLORS.tealDark }, verticalAlignment: "top" };
readme.getRange("E6:H10").merge(true);
readme.getRange("E6:H10").format = { fill: COLORS.white, font: { color: COLORS.muted }, wrapText: true, verticalAlignment: "top" };
readme.getRange("D6:H10").format.borders = { preset: "outside", style: "thin", color: COLORS.line };
readme.getRange("D6:H10").format.rowHeightPx = 47;

readme.mergeCells("A13:H13");
readme.getRange("A13").values = [["REGLAS DE INTEGRIDAD QUE APLICA EL SISTEMA"]];
readme.getRange("A13:H13").format = { fill: COLORS.navy, font: { bold: true, color: COLORS.white }, verticalAlignment: "center" };
const rules = [
  ["Stock inicial", "CANTIDAD representa el inventario vigente; al crear un producto no se agrega otra recepción."],
  ["Entradas", "Recepción y devolución aumentan el stock."],
  ["Salidas", "Solo despacho reduce stock. Entrega no vuelve a descontar."],
  ["Ubicaciones", "Ingreso, ubicación y movimiento interno actualizan ubicación sin cambiar cantidad."],
  ["Trazabilidad", "Cada movimiento agrega una fila inmutable en EVENTOS con stock antes y después."],
  ["Identificadores", "Code 128, EAN-13, QR y RFID simulado tienen columnas independientes y no pueden duplicarse."],
  ["EAN-13", "Debe contener 13 dígitos y checksum válido. No implica asignación oficial de GS1."],
  ["Seguridad", "La escritura se realiza mediante Apps Script. No guardes secretos o credenciales en este archivo."]
];
readme.getRange("A14:H21").values = rules.map(([label, text]) => [label, text, null, null, null, null, null, null]);
readme.getRange("A14:A21").format = { fill: COLORS.canvas, font: { bold: true, color: COLORS.navy }, verticalAlignment: "top" };
readme.getRange("B14:H21").merge(true);
readme.getRange("B14:H21").format = { wrapText: true, font: { color: COLORS.muted }, verticalAlignment: "top" };
readme.getRange("A14:H21").format.borders = { insideHorizontal: { style: "thin", color: COLORS.line }, bottom: { style: "thin", color: COLORS.line } };
readme.getRange("A14:H21").format.rowHeightPx = 34;

readme.mergeCells("A23:H24");
readme.getRange("A23").values = [["IMPORTANTE: las pestañas operativas están vacías intencionalmente. Consulta EJEMPLO_NO_IMPORTAR para ver el formato, pero no copies esos registros a producción sin sustituirlos por datos reales."]];
readme.getRange("A23:H24").format = { fill: COLORS.warning, font: { bold: true, color: "#80511A" }, wrapText: true, verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: "#E09F3E" } };
readme.getRange("A:A").format.columnWidthPx = 160;
readme.getRange("B:B").format.columnWidthPx = 330;
readme.getRange("C:C").format.columnWidthPx = 22;
readme.getRange("D:D").format.columnWidthPx = 90;
readme.getRange("E:H").format.columnWidthPx = 125;
readme.freezePanes.freezeRows(3);

// PRODUCTOS
products.getRange("A1:S2").values = [productsHeaders, Array(productsHeaders.length).fill(null)];
styleDatabaseSheet(products, "S", [
  ["A", 205], ["B", 180], ["C", 125], ["D", 100], ["E", 85], ["F", 120], ["G", 130], ["H", 130], ["I", 135], ["J", 190],
  ["K", 150], ["L", 120], ["M", 210], ["N", 210], ["O", 215], ["P", 145], ["Q", 145], ["R", 105], ["S", 280]
]);
products.getRange("A2:S501").format = { font: { color: COLORS.navy, size: 10 }, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: COLORS.line } } };
products.getRange("E2:E501").format.numberFormat = "#,##0";
products.getRange("F2:F501").format.numberFormat = "yyyy-mm-dd";
products.getRange("P2:Q501").format.numberFormat = "yyyy-mm-dd hh:mm:ss";
products.getRange("A2:A501").format.numberFormat = "@";
products.getRange("D2:D501").format.numberFormat = "@";
products.getRange("J2:J501").format.numberFormat = "@";
products.getRange("M2:O501").format.numberFormat = "@";
products.getRange("S2:S501").format.wrapText = true;
products.getRange("C2:C501").dataValidation = { rule: { type: "list", formula1: "'CATALOGOS'!$A$3:$A$50" } };
products.getRange("E2:E501").dataValidation = { rule: { type: "whole", operator: "between", formula1: 0, formula2: 999999999 } };
products.getRange("I2:I501").dataValidation = { rule: { type: "list", values: ["Code 128", "EAN-13", "QR", "RFID simulado", "Múltiple"] } };
products.getRange("L2:L501").dataValidation = { rule: { type: "list", values: ["Code 128", "EAN-13"] } };
products.getRange("R2:R501").dataValidation = { rule: { type: "list", values: ["Disponible", "Stock bajo", "Agotado", "Inactivo"] } };
const productsTable = products.tables.add("A1:S2", true, "LogiTraceProducts");
productsTable.style = "TableStyleMedium2";
productsTable.showFilterButton = true;
products.getRange("A1:S1").format = { fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { bottom: { style: "medium", color: COLORS.teal } } };

// EVENTOS
events.getRange("A1:O2").values = [eventHeaders, Array(eventHeaders.length).fill(null)];
styleDatabaseSheet(events, "O", [
  ["A", 280], ["B", 150], ["C", 205], ["D", 135], ["E", 210], ["F", 165], ["G", 150], ["H", 130],
  ["I", 260], ["J", 120], ["K", 145], ["L", 110], ["M", 110], ["N", 155], ["O", 155]
]);
events.getRange("A2:O1001").format = { font: { color: COLORS.navy, size: 10 }, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: COLORS.line } } };
events.getRange("B2:B1001").format.numberFormat = "yyyy-mm-dd hh:mm:ss";
events.getRange("K2:M1001").format.numberFormat = "#,##0";
events.getRange("A2:A1001").format.numberFormat = "@";
events.getRange("C2:E1001").format.numberFormat = "@";
events.getRange("I2:I1001").format.wrapText = true;
events.getRange("F2:F1001").dataValidation = { rule: { type: "list", values: ["Recepción", "Ingreso al almacén", "Ubicación", "Movimiento interno", "Preparación de pedido", "Despacho", "Entrega", "Devolución", "Incidencia"] } };
events.getRange("J2:J1001").dataValidation = { rule: { type: "list", values: ["Completado", "Pendiente", "Con incidencia"] } };
events.getRange("K2:M1001").dataValidation = { rule: { type: "whole", operator: "between", formula1: 0, formula2: 999999999 } };
const eventsTable = events.tables.add("A1:O2", true, "LogiTraceEvents");
eventsTable.style = "TableStyleMedium2";
eventsTable.showFilterButton = true;
events.getRange("A1:O1").format = { fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { bottom: { style: "medium", color: COLORS.teal } } };

// CATALOGOS
catalogs.showGridLines = false;
catalogs.mergeCells("A1:E1");
catalogs.getRange("A1").values = [["CATÁLOGOS EDITABLES PARA VALIDACIONES"]];
catalogs.getRange("A1:E1").format = { fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 16 }, verticalAlignment: "center", borders: { bottom: { style: "thick", color: COLORS.teal } } };
catalogs.getRange("A2:E2").values = [["CATEGORIAS", "ESTADOS_PRODUCTO", "TIPOS_CODIGO_1D", "EVENTOS", "ESTADOS_EVENTO"]];
catalogs.getRange("A2:E2").format = { fill: COLORS.tealDark, font: { bold: true, color: COLORS.white }, horizontalAlignment: "center", wrapText: true };
const categoryValues = ["Alimentos", "Electrónica", "Repuestos", "Insumos", "Equipos", "Empaques", "Otros"];
const productStates = ["Disponible", "Stock bajo", "Agotado", "Inactivo"];
const codeTypes = ["Code 128", "EAN-13"];
const eventTypes = ["Recepción", "Ingreso al almacén", "Ubicación", "Movimiento interno", "Preparación de pedido", "Despacho", "Entrega", "Devolución", "Incidencia"];
const eventStates = ["Completado", "Pendiente", "Con incidencia"];
const maxRows = Math.max(categoryValues.length, productStates.length, codeTypes.length, eventTypes.length, eventStates.length);
const catalogRows = Array.from({ length: maxRows }, (_, i) => [categoryValues[i] ?? null, productStates[i] ?? null, codeTypes[i] ?? null, eventTypes[i] ?? null, eventStates[i] ?? null]);
catalogs.getRange(`A3:E${maxRows + 2}`).values = catalogRows;
catalogs.getRange(`A3:E${maxRows + 2}`).format = { font: { color: COLORS.navy }, borders: { insideHorizontal: { style: "thin", color: COLORS.line } }, verticalAlignment: "center" };
catalogs.getRange("A12:E13").merge();
catalogs.getRange("A12").values = [["Puedes ampliar CATEGORIAS hasta la fila 50; la validación de PRODUCTOS ya apunta a ese rango."]];
catalogs.getRange("A12:E13").format = { fill: COLORS.blueSoft, font: { color: COLORS.navy, bold: true }, wrapText: true, verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: COLORS.line } };
catalogs.getRange("A:E").format.columnWidthPx = 190;
catalogs.getRange("A1:E1").format.rowHeightPx = 44;
catalogs.freezePanes.freezeRows(2);

// EJEMPLO_NO_IMPORTAR
example.showGridLines = false;
example.mergeCells("A1:S1");
example.getRange("A1").values = [["EJEMPLO VISUAL  |  NO IMPORTAR COMO INFORMACIÓN REAL"]];
example.getRange("A1:S1").format = { fill: "#8A4D0F", font: { bold: true, color: COLORS.white, size: 15 }, verticalAlignment: "center" };
example.getRange("A2:S2").values = [productsHeaders];
example.getRange("A3:S4").values = [
  ["UPEC-ALM-ALI-P001-L03", "Café tostado 500 g", "Alimentos", "L03", 25, excelDate(2027, 6, 30), "Proveedor académico", "Almacén principal", "Múltiple", "UPEC-ALM-ALI-P001-L03", "Rack A03", "Code 128", "UPEC-ALM-ALI-P001-L03", "UPEC-ALM-ALI-P001-L03", "3034257BF7194E4000001A85", excelDate(2026, 8, 25, 8, 15), excelDate(2026, 8, 25, 9, 30), "Disponible", "Registro ilustrativo; sustituir por información real."],
  ["UPEC-ALM-ELE-P002-L04", "Sensor de temperatura", "Electrónica", "L04", 4, null, "Laboratorio", "Zona B", "Múltiple", "‌7501234567893", "Rack B02", "EAN-13", "‌7501234567893", "UPEC-ALM-ELE-P002-L04", "3034A10B22CC45DE6789ABCD", excelDate(2026, 8, 25, 10, 10), excelDate(2026, 8, 25, 10, 10), "Stock bajo", "EAN-13 demostrativo para uso interno."]
];
styleDatabaseSheet(example, "S", [
  ["A", 205], ["B", 170], ["C", 120], ["D", 90], ["E", 75], ["F", 115], ["G", 125], ["H", 125], ["I", 120], ["J", 200], ["K", 125], ["L", 110], ["M", 200], ["N", 200], ["O", 210], ["P", 140], ["Q", 140], ["R", 100], ["S", 265]
]);
example.getRange("A1:S1").format = { fill: "#8A4D0F", font: { bold: true, color: COLORS.white, size: 15 }, verticalAlignment: "center" };
example.getRange("A2:S2").format = { fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 9 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
example.getRange("A3:S4").format = { font: { color: COLORS.navy, size: 9 }, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: COLORS.line } } };
example.getRange("E3:E4").format.numberFormat = "#,##0";
example.getRange("F3:F4").format.numberFormat = "yyyy-mm-dd";
example.getRange("P3:Q4").format.numberFormat = "yyyy-mm-dd hh:mm:ss";
example.getRange("A3:A4").format.numberFormat = "@";
example.getRange("D3:D4").format.numberFormat = "@";
example.getRange("J3:J4").format.numberFormat = "@";
example.getRange("M3:O4").format.numberFormat = "@";
example.getRange("S3:S4").format.wrapText = true;
example.getRange("A6:O6").values = [eventHeaders];
example.getRange("A7:O10").values = [
  ["EVT-11111111-1111-1111-1111-111111111111", excelDate(2026, 8, 25, 8, 15), "UPEC-ALM-ALI-P001-L03", "Code 128", "UPEC-ALM-ALI-P001-L03", "Recepción", "Almacén principal", "Operador 01", "Recepción de ejemplo", "Completado", 25, 0, 25, "Muelle", "Almacén principal"],
  ["EVT-22222222-2222-2222-2222-222222222222", excelDate(2026, 8, 25, 9, 30), "UPEC-ALM-ALI-P001-L03", "Code 128", "UPEC-ALM-ALI-P001-L03", "Ubicación", "Rack A03", "Operador 01", "Reubicación de ejemplo", "Completado", 0, 25, 25, "Almacén principal", "Rack A03"],
  ["EVT-33333333-3333-3333-3333-333333333333", excelDate(2026, 8, 25, 12, 0), "UPEC-ALM-ALI-P001-L03", "Code 128", "UPEC-ALM-ALI-P001-L03", "Despacho", "Muelle de salida", "Operador 02", "Despacho de ejemplo", "Completado", 5, 25, 20, "Rack A03", "Muelle de salida"],
  ["EVT-44444444-4444-4444-4444-444444444444", excelDate(2026, 8, 25, 15, 30), "UPEC-ALM-ALI-P001-L03", "Code 128", "UPEC-ALM-ALI-P001-L03", "Devolución", "Rack A03", "Operador 02", "Devolución de ejemplo", "Completado", 5, 20, 25, "Muelle de entrada", "Rack A03"]
];
example.getRange("A6:O6").format = { fill: COLORS.tealDark, font: { bold: true, color: COLORS.white, size: 9 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
example.getRange("A7:O10").format = { font: { color: COLORS.navy, size: 9 }, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: COLORS.line } } };
example.getRange("B7:B10").format.numberFormat = "yyyy-mm-dd hh:mm:ss";
example.getRange("K7:M10").format.numberFormat = "#,##0";
example.getRange("A7:A10").format.numberFormat = "@";
example.getRange("C7:E10").format.numberFormat = "@";
example.freezePanes.freezeRows(2);

const renderTargets = [
  ["LEEME", "A1:H24", "01-leeme.png"],
  ["PRODUCTOS", "A1:S5", "02-productos.png"],
  ["EVENTOS", "A1:O5", "03-eventos.png"],
  ["CATALOGOS", "A1:E13", "04-catalogos.png"],
  ["EJEMPLO_NO_IMPORTAR", "A1:S10", "05-ejemplo.png"]
];
for (const [sheetName, range, filename] of renderTargets) {
  const preview = await wb.render({ sheetName, range, scale: 1.2, format: "png" });
  await fs.writeFile(path.join(previewDir, filename), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(wb);
const outputPath = path.join(outputDir, "LogiTrace_Base_Google_Sheets.xlsx");
await output.save(outputPath);
console.log(outputPath);
