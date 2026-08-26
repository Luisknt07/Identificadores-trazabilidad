import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = "C:/Users/PC2/.codex/visualizations/2026/08/26/01a03bb9-da84-76b2-b4ca-09238c9bd7a9/outputs/logitrace-sheets/LogiTrace_Base_Google_Sheets.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));

const sheets = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 3000 });
const products = await workbook.inspect({ kind: "table", range: "PRODUCTOS!A1:S3", include: "values,formulas", tableMaxRows: 3, tableMaxCols: 19, maxChars: 6000 });
const events = await workbook.inspect({ kind: "table", range: "EVENTOS!A1:O3", include: "values,formulas", tableMaxRows: 3, tableMaxCols: 15, maxChars: 5000 });
const readme = await workbook.inspect({ kind: "table", range: "LEEME!A1:H24", include: "values,formulas", tableMaxRows: 24, tableMaxCols: 8, maxChars: 6000 });
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan", maxChars: 3000 });

console.log("=== SHEETS ==="); console.log(sheets.ndjson);
console.log("=== PRODUCTOS ==="); console.log(products.ndjson);
console.log("=== EVENTOS ==="); console.log(events.ndjson);
console.log("=== LEEME ==="); console.log(readme.ndjson);
console.log("=== ERRORS ==="); console.log(errors.ndjson);
