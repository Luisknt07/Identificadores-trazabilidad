export const CONFIG = Object.freeze({
  APP_NAME: "LogiTrace",
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyrdTK2aQXY3PgMJpMOJmsAucJFeNb2kb9uQuY_TJxIfUJnugfvZiNNleB-1lzEGRc8/exec",
  SPREADSHEET_ID: "1LqSaUtezToYJPRM65GRr-U5IHxHLR677faxWFkogRic",
  SHEET_GID: "1954297884",
  PUBLISHED_CSV_URL: "https://docs.google.com/spreadsheets/d/1LqSaUtezToYJPRM65GRr-U5IHxHLR677faxWFkogRic/gviz/tq?tqx=out:csv&gid=1954297884",
  TIMEZONE: "America/Guayaquil",
  LOCALE: "es-EC",
  LOW_STOCK_THRESHOLD: 5,
  AUTO_REFRESH_SECONDS: 120,
  PAGE_SIZE: 10,
  MAX_ACCEPTABLE_ACCURACY_M: 100,
  DEFAULT_MAP_CENTER: [0.1807, -78.4678],
  DEFAULT_MAP_ZOOM: 7,
  DEMO_MODE: false
});

export const EVENT_TYPES = Object.freeze([
  "Recepción", "Ingreso al almacén", "Ubicación", "Movimiento interno",
  "Preparación de pedido", "Despacho", "Entrega", "Devolución", "Incidencia"
]);

export const STOCK_IN_EVENTS = new Set(["Recepción", "Devolución"]);
export const STOCK_OUT_EVENTS = new Set(["Despacho"]);
export const QUANTITY_EVENTS = new Set([...STOCK_IN_EVENTS, ...STOCK_OUT_EVENTS]);
export const LOCATION_EVENTS = new Set(["Ingreso al almacén", "Ubicación", "Movimiento interno"]);

export function hasWriteEndpoint() {
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(CONFIG.APPS_SCRIPT_URL);
}
