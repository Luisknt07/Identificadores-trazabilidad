import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const outputDir = "C:/Users/PC2/.codex/visualizations/2026/08/26/01a03bb9-da84-76b2-b4ca-09238c9bd7a9/outputs/logitrace-sheets";
const workbookPath = path.join(outputDir, "LogiTrace_Base_Google_Sheets.xlsx");
const previewDir = path.join(outputDir, "previews-demo");
await fs.mkdir(previewDir, { recursive: true });

const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const productsSheet = wb.worksheets.getItem("PRODUCTOS");
const eventsSheet = wb.worksheets.getItem("EVENTOS");
const readmeSheet = wb.worksheets.getItem("LEEME");

const excelDate = (year, month, day, hour = 0, minute = 0) => new Date(Date.UTC(year, month - 1, day, hour, minute));
const COLORS = { navy: "#102A43", teal: "#00A896", white: "#FFFFFF", line: "#DCE6ED", tealSoft: "#DFF7F3", warningSoft: "#FFF3DB", dangerSoft: "#FDEBED" };

const products = [
  ["UPEC-ALM-ALI-P001-L03", "Café tostado 500 g", "Alimentos", "L03", 55, excelDate(2027, 6, 30), "Proveedor Sierra Norte", "Centro de distribución", "Múltiple", "UPEC-ALM-ALI-P001-L03", "Rack A03", "Code 128", "UPEC-ALM-ALI-P001-L03", "UPEC-ALM-ALI-P001-L03", "3034257BF7194E4000001A85", excelDate(2026, 8, 20, 8, 0), excelDate(2026, 8, 22, 11, 0), "Disponible", "Producto demostrativo para recepción, ubicación y despacho."],
  ["UPEC-ALM-ELE-P002-L04", "Sensor de temperatura", "Electrónica", "L04", 9, null, "Laboratorio de instrumentación", "Almacén técnico", "Múltiple", 7501234567893, "Rack B02", "EAN-13", 7501234567893, "UPEC-ALM-ELE-P002-L04", "3034A10B22CC45DE6789ABCD", excelDate(2026, 8, 20, 9, 0), excelDate(2026, 8, 23, 16, 0), "Disponible", "Sensor demostrativo con EAN-13 interno, despacho y devolución."],
  ["UPEC-ALM-INS-P003-L05", "Guantes de nitrilo", "Insumos", "L05", 120, excelDate(2029, 3, 31), "Proveedor Médico Andino", "Laboratorio central", "Múltiple", "UPEC-ALM-INS-P003-L05", "Rack C01", "Code 128", "UPEC-ALM-INS-P003-L05", "UPEC-ALM-INS-P003-L05", "3034B20C33DD56EF7890BCDE", excelDate(2026, 8, 20, 10, 0), excelDate(2026, 8, 24, 9, 30), "Disponible", "Caja demostrativa de guantes para control de insumos."],
  ["UPEC-ALM-EMP-P004-L06", "Caja de cartón mediana", "Empaques", "L06", 160, null, "Planta de empaques", "Zona de consolidación", "Múltiple", "UPEC-ALM-EMP-P004-L06", "Zona empaques", "Code 128", "UPEC-ALM-EMP-P004-L06", "UPEC-ALM-EMP-P004-L06", "3034C30D44EE67F08901CDEF", excelDate(2026, 8, 21, 8, 30), excelDate(2026, 8, 24, 14, 20), "Disponible", "Material demostrativo para movimiento interno y despacho."],
  ["UPEC-ALM-ELE-P005-L07", "Cable UTP Cat 6 · 5 m", "Electrónica", "L07", 60, null, "Proveedor de redes", "Sala de comunicaciones", "Múltiple", 7501112223330, "Rack D01", "EAN-13", 7501112223330, "UPEC-ALM-ELE-P005-L07", "3034D40E55FF78019A12DEF0", excelDate(2026, 8, 21, 9, 15), excelDate(2026, 8, 24, 16, 10), "Disponible", "Cable demostrativo con preparación de pedido y despacho."],
  ["UPEC-ALM-REP-P006-L08", "Batería industrial 12 V", "Repuestos", "L08", 4, excelDate(2028, 12, 31), "Proveedor Energía EC", "Taller de mantenimiento", "Múltiple", "UPEC-ALM-REP-P006-L08", "Rack E01", "Code 128", "UPEC-ALM-REP-P006-L08", "UPEC-ALM-REP-P006-L08", "3034E50F66008912AB23EF01", excelDate(2026, 8, 21, 10, 0), excelDate(2026, 8, 25, 8, 45), "Stock bajo", "Repuesto demostrativo con incidencia y stock bajo."],
  ["UPEC-ALM-EQU-P007-L09", "Router Wi-Fi 6", "Equipos", "L09", 0, null, "Proveedor Tecnología Quito", "Sucursal norte", "Múltiple", 7509876543213, "Rack E02", "EAN-13", 7509876543213, "UPEC-ALM-EQU-P007-L09", "3034F61077119A23BC34F012", excelDate(2026, 8, 22, 8, 0), excelDate(2026, 8, 25, 10, 30), "Agotado", "Equipo demostrativo despachado y entregado sin doble descuento."],
  ["UPEC-ALM-ALI-P008-L10", "Arroz integral 1 kg", "Alimentos", "L10", 35, excelDate(2027, 10, 15), "Proveedor Costa Verde", "Centro de distribución", "Múltiple", "UPEC-ALM-ALI-P008-L10", "Rack A01", "Code 128", "UPEC-ALM-ALI-P008-L10", "UPEC-ALM-ALI-P008-L10", "303407218822AB34CD45A123", excelDate(2026, 8, 22, 9, 0), excelDate(2026, 8, 25, 12, 15), "Disponible", "Producto demostrativo con recepción y despacho parcial."],
  ["UPEC-ALM-REP-P009-L11", "Sello mecánico para bomba", "Repuestos", "L11", 6, null, "Proveedor Industrial Sur", "Taller de mantenimiento", "Múltiple", "UPEC-ALM-REP-P009-L11", "Taller 01", "Code 128", "UPEC-ALM-REP-P009-L11", "UPEC-ALM-REP-P009-L11", "303418329933BC45DE56B234", excelDate(2026, 8, 22, 10, 0), excelDate(2026, 8, 22, 10, 0), "Disponible", "Repuesto demostrativo disponible sin movimientos posteriores."],
  ["UPEC-ALM-EMP-P010-L12", "Rollo de etiquetas térmicas", "Empaques", "L12", 300, null, "Proveedor Etiquetas EC", "Zona de etiquetado", "Múltiple", "UPEC-ALM-EMP-P010-L12", "Zona empaques", "Code 128", "UPEC-ALM-EMP-P010-L12", "UPEC-ALM-EMP-P010-L12", "30342943AA44CD56EF67C345", excelDate(2026, 8, 23, 8, 0), excelDate(2026, 8, 25, 15, 40), "Disponible", "Consumible demostrativo para generación e impresión de etiquetas."]
];

const eventId = (sequence) => `EVT-a1b2c3d4-${String(sequence).padStart(4, "0")}-4a01-8001-${String(sequence).padStart(12, "0")}`;
const events = [
  [eventId(1), excelDate(2026,8,20,8,15), "UPEC-ALM-ALI-P001-L03", "Code 128", "UPEC-ALM-ALI-P001-L03", "Recepción", "Almacén principal", "Operador 01", "Ingreso de lote adicional de café.", "Completado", 20, 50, 70, "Muelle de recepción", "Almacén principal"],
  [eventId(2), excelDate(2026,8,20,9,0), "UPEC-ALM-ALI-P001-L03", "Code 128", "UPEC-ALM-ALI-P001-L03", "Ubicación", "Rack A03", "Operador 01", "Producto ubicado después del control de calidad.", "Completado", 0, 70, 70, "Almacén principal", "Rack A03"],
  [eventId(3), excelDate(2026,8,22,11,0), "UPEC-ALM-ALI-P001-L03", "Code 128", "UPEC-ALM-ALI-P001-L03", "Despacho", "Muelle de salida", "Operador 02", "Despacho parcial al centro de distribución.", "Completado", 15, 70, 55, "Rack A03", "Muelle de salida"],
  [eventId(4), excelDate(2026,8,20,9,30), "UPEC-ALM-ELE-P002-L04", "EAN-13", 7501234567893, "Ubicación", "Rack B02", "Operador 01", "Sensores ubicados en zona técnica.", "Completado", 0, 12, 12, "Recepción técnica", "Rack B02"],
  [eventId(5), excelDate(2026,8,21,14,0), "UPEC-ALM-ELE-P002-L04", "EAN-13", 7501234567893, "Despacho", "Laboratorio 2", "Operador 03", "Entrega interna de cinco sensores.", "Completado", 5, 12, 7, "Rack B02", "Laboratorio 2"],
  [eventId(6), excelDate(2026,8,23,16,0), "UPEC-ALM-ELE-P002-L04", "EAN-13", 7501234567893, "Devolución", "Rack B02", "Operador 03", "Dos sensores no utilizados regresan al inventario.", "Completado", 2, 7, 9, "Laboratorio 2", "Rack B02"],
  [eventId(7), excelDate(2026,8,20,10,30), "UPEC-ALM-INS-P003-L05", "Code 128", "UPEC-ALM-INS-P003-L05", "Recepción", "Rack C01", "Operador 01", "Recepción de cincuenta cajas adicionales.", "Completado", 50, 100, 150, "Muelle de recepción", "Rack C01"],
  [eventId(8), excelDate(2026,8,24,9,30), "UPEC-ALM-INS-P003-L05", "Code 128", "UPEC-ALM-INS-P003-L05", "Despacho", "Laboratorio central", "Operador 02", "Despacho de insumos de protección.", "Completado", 30, 150, 120, "Rack C01", "Laboratorio central"],
  [eventId(9), excelDate(2026,8,21,8,45), "UPEC-ALM-EMP-P004-L06", "Code 128", "UPEC-ALM-EMP-P004-L06", "Movimiento interno", "Zona empaques", "Operador 04", "Traslado a la zona de armado de pedidos.", "Completado", 0, 200, 200, "Zona de recepción", "Zona empaques"],
  [eventId(10), excelDate(2026,8,24,14,20), "UPEC-ALM-EMP-P004-L06", "Code 128", "UPEC-ALM-EMP-P004-L06", "Despacho", "Zona de consolidación", "Operador 04", "Cajas utilizadas para pedidos preparados.", "Completado", 40, 200, 160, "Zona empaques", "Zona de consolidación"],
  [eventId(11), excelDate(2026,8,21,10,0), "UPEC-ALM-ELE-P005-L07", "EAN-13", 7501112223330, "Preparación de pedido", "Área de picking", "Operador 05", "Reserva visual para pedido PED-001; no descuenta stock.", "Completado", 0, 80, 80, "Rack D01", "Área de picking"],
  [eventId(12), excelDate(2026,8,24,16,10), "UPEC-ALM-ELE-P005-L07", "EAN-13", 7501112223330, "Despacho", "Sala de comunicaciones", "Operador 05", "Salida confirmada del pedido PED-001.", "Completado", 20, 80, 60, "Rack D01", "Sala de comunicaciones"],
  [eventId(13), excelDate(2026,8,23,10,15), "UPEC-ALM-REP-P006-L08", "Code 128", "UPEC-ALM-REP-P006-L08", "Incidencia", "Rack E01", "Operador 06", "Embalaje exterior con golpe; stock sin ajuste automático.", "Con incidencia", 0, 10, 10, "Rack E01", "Rack E01"],
  [eventId(14), excelDate(2026,8,25,8,45), "UPEC-ALM-REP-P006-L08", "Code 128", "UPEC-ALM-REP-P006-L08", "Despacho", "Taller de mantenimiento", "Operador 06", "Seis baterías despachadas para mantenimiento preventivo.", "Completado", 6, 10, 4, "Rack E01", "Taller de mantenimiento"],
  [eventId(15), excelDate(2026,8,25,9,10), "UPEC-ALM-EQU-P007-L09", "EAN-13", 7509876543213, "Despacho", "Sucursal norte", "Operador 02", "Despacho total de los tres routers disponibles.", "Completado", 3, 3, 0, "Rack E02", "Sucursal norte"],
  [eventId(16), excelDate(2026,8,25,10,30), "UPEC-ALM-EQU-P007-L09", "EAN-13", 7509876543213, "Entrega", "Sucursal norte", "Transportista 01", "Entrega confirmada; no se descuenta por segunda vez.", "Completado", 0, 0, 0, "Muelle de salida", "Sucursal norte"],
  [eventId(17), excelDate(2026,8,24,11,0), "UPEC-ALM-ALI-P008-L10", "Code 128", "UPEC-ALM-ALI-P008-L10", "Recepción", "Rack A01", "Operador 01", "Recepción de diez unidades adicionales.", "Completado", 10, 30, 40, "Muelle de recepción", "Rack A01"],
  [eventId(18), excelDate(2026,8,25,12,15), "UPEC-ALM-ALI-P008-L10", "Code 128", "UPEC-ALM-ALI-P008-L10", "Despacho", "Centro de distribución", "Operador 02", "Despacho parcial de cinco unidades.", "Completado", 5, 40, 35, "Rack A01", "Centro de distribución"],
  [eventId(19), excelDate(2026,8,24,15,0), "UPEC-ALM-EMP-P010-L12", "Code 128", "UPEC-ALM-EMP-P010-L12", "Recepción", "Zona empaques", "Operador 04", "Ingreso de cien rollos para etiquetado.", "Completado", 100, 250, 350, "Muelle de recepción", "Zona empaques"],
  [eventId(20), excelDate(2026,8,25,15,40), "UPEC-ALM-EMP-P010-L12", "Code 128", "UPEC-ALM-EMP-P010-L12", "Despacho", "Zona de etiquetado", "Operador 04", "Cincuenta rollos enviados al área operativa.", "Completado", 50, 350, 300, "Zona empaques", "Zona de etiquetado"]
];

productsSheet.getRange("A2:S501").clear({ applyTo: "contents" });
eventsSheet.getRange("A2:O1001").clear({ applyTo: "contents" });
productsSheet.getRange("A2:S11").values = products;
eventsSheet.getRange("A2:O21").values = events;

// Preserva los identificadores numéricos EAN-13 completos y los tipos de fecha/cantidad.
productsSheet.getRange("E2:E11").format.numberFormat = "#,##0";
productsSheet.getRange("F2:F11").format.numberFormat = "yyyy-mm-dd";
productsSheet.getRange("P2:Q11").format.numberFormat = "yyyy-mm-dd hh:mm:ss";
productsSheet.getRange("A2:A11").format.numberFormat = "@";
productsSheet.getRange("D2:D11").format.numberFormat = "@";
productsSheet.getRange("M2:O11").format.numberFormat = "@";
for (const row of [3, 6, 8]) {
  productsSheet.getRange(`J${row}`).format.numberFormat = "0";
  productsSheet.getRange(`M${row}`).format.numberFormat = "0";
}
eventsSheet.getRange("B2:B21").format.numberFormat = "yyyy-mm-dd hh:mm:ss";
eventsSheet.getRange("K2:M21").format.numberFormat = "#,##0";
eventsSheet.getRange("A2:A21").format.numberFormat = "@";
eventsSheet.getRange("C2:E21").format.numberFormat = "@";
for (const row of [5, 6, 7, 12, 13, 16, 17]) eventsSheet.getRange(`E${row}`).format.numberFormat = "0";

productsSheet.getRange("A2:S11").format = { font: { color: COLORS.navy, size: 10 }, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: COLORS.line } } };
eventsSheet.getRange("A2:O21").format = { font: { color: COLORS.navy, size: 10 }, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: COLORS.line } } };
productsSheet.getRange("S2:S11").format.wrapText = true;
eventsSheet.getRange("I2:I21").format.wrapText = true;
productsSheet.getRange("A2:S11").format.rowHeightPx = 36;
eventsSheet.getRange("A2:O21").format.rowHeightPx = 34;

for (const table of productsSheet.tables.items) table.delete();
for (const table of eventsSheet.tables.items) table.delete();
const productTable = productsSheet.tables.add("A1:S11", true, "LogiTraceProducts");
productTable.style = "TableStyleMedium2"; productTable.showFilterButton = true;
const eventTable = eventsSheet.tables.add("A1:O21", true, "LogiTraceEvents");
eventTable.style = "TableStyleMedium2"; eventTable.showFilterButton = true;

productsSheet.getRange("A1:S1").format = { fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { bottom: { style: "medium", color: COLORS.teal } } };
eventsSheet.getRange("A1:O1").format = { fill: COLORS.navy, font: { bold: true, color: COLORS.white, size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { bottom: { style: "medium", color: COLORS.teal } } };
productsSheet.getRange("A1:S1").format.rowHeightPx = 42;
eventsSheet.getRange("A1:O1").format.rowHeightPx = 42;

productsSheet.getRange("R2:R11").conditionalFormats.deleteAll();
productsSheet.getRange("R2:R11").conditionalFormats.add("containsText", { text: "Disponible", format: { fill: COLORS.tealSoft, font: { color: "#007F73", bold: true } } });
productsSheet.getRange("R2:R11").conditionalFormats.add("containsText", { text: "Stock bajo", format: { fill: COLORS.warningSoft, font: { color: "#80511A", bold: true } } });
productsSheet.getRange("R2:R11").conditionalFormats.add("containsText", { text: "Agotado", format: { fill: COLORS.dangerSoft, font: { color: "#C2414B", bold: true } } });
eventsSheet.getRange("J2:J21").conditionalFormats.deleteAll();
eventsSheet.getRange("J2:J21").conditionalFormats.add("containsText", { text: "Completado", format: { fill: COLORS.tealSoft, font: { color: "#007F73", bold: true } } });
eventsSheet.getRange("J2:J21").conditionalFormats.add("containsText", { text: "Con incidencia", format: { fill: COLORS.dangerSoft, font: { color: "#C2414B", bold: true } } });

readmeSheet.getRange("A23").values = [["LISTO PARA DEMOSTRACIÓN: PRODUCTOS contiene 10 registros y EVENTOS contiene 20 movimientos coherentes. Todos son datos de ejemplo; puedes sustituirlos o agregar nuevos desde LogiTrace después de conectar Apps Script."]];
readmeSheet.getRange("A23:H24").format = { fill: COLORS.tealSoft, font: { bold: true, color: "#007F73" }, wrapText: true, verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: COLORS.teal } };

const renderTargets = [
  ["LEEME", "A1:H24", "01-leeme-demo.png"],
  ["PRODUCTOS", "A1:S11", "02-productos-demo.png"],
  ["EVENTOS", "A1:O21", "03-eventos-demo.png"],
  ["CATALOGOS", "A1:E13", "04-catalogos-demo.png"],
  ["EJEMPLO_NO_IMPORTAR", "A1:S10", "05-ejemplo-demo.png"]
];
for (const [sheetName, range, filename] of renderTargets) {
  const preview = await wb.render({ sheetName, range, scale: 1.1, format: "png" });
  await fs.writeFile(path.join(previewDir, filename), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(workbookPath);
console.log(JSON.stringify({ workbookPath, products: products.length, events: events.length }));
