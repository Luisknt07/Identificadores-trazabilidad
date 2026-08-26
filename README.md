# LogiTrace

Aplicación web estática para identificación, trazabilidad e inventario logístico. Lee productos desde la hoja publicada indicada por el proyecto y utiliza un Google Apps Script Web App para crear productos, asociar identificadores y registrar movimientos de stock de forma segura.

## Arquitectura

```text
Navegador (GitHub Pages)
  ├─ lectura inicial → Google Sheets CSV publicado
  └─ lectura/escritura → Apps Script Web App → Google Sheets
```

La lectura CSV replica el patrón del HTML de referencia: prueba el enlace publicado y, como respaldo, las rutas `gviz/tq?tqx=out:csv` y `export?format=csv`. No hay datos ficticios ni credenciales privadas en el frontend. Cuando `APPS_SCRIPT_URL` no está configurada, la aplicación funciona en modo de solo lectura y lo informa claramente.

## Estructura

```text
.
├── index.html
├── assets/
│   ├── css/                 # variables, layout, componentes, responsive e impresión
│   └── js/                  # API, estado y módulos funcionales
├── apps-script/Code.gs          # backend completo para Google Sheets
├── docs/pruebas.md              # plan y resultados de prueba
└── tests/logic.test.mjs         # pruebas de reglas independientes
```

## Puesta en marcha local

Sirve la carpeta mediante HTTP; los ES Modules no funcionan correctamente abriendo `index.html` con `file://`.

En Windows, haz doble clic en `iniciar-logitrace.cmd`. El iniciador levanta un servidor con tipos MIME compatibles con módulos ES y abre automáticamente `http://127.0.0.1:8766/`.

```powershell
python -m http.server 8000
```

Abre `http://localhost:8000`.

## Configurar Google Apps Script

1. Abre la [hoja editable](https://docs.google.com/spreadsheets/d/1LqSaUtezToYJPRM65GRr-U5IHxHLR677faxWFkogRic/edit?gid=1954297884).
2. Ve a **Extensiones → Apps Script**.
3. Sustituye el contenido de `Code.gs` por [apps-script/Code.gs](apps-script/Code.gs).
4. Guarda y selecciona `initializeSheets` en el desplegable de funciones. Pulsa **Ejecutar** una sola vez.
5. Autoriza el acceso con la cuenta propietaria de la hoja. La función conserva columnas y filas existentes; solo agrega las columnas faltantes.
6. Pulsa **Implementar → Nueva implementación → Aplicación web**.
7. Configura **Ejecutar como: Yo** y **Quién tiene acceso: Cualquier usuario**. En cuentas institucionales, la política del dominio puede limitar esta opción.
8. Copia la URL terminada en `/exec` y pégala como `APPS_SCRIPT_URL` en [assets/js/config.js](assets/js/config.js).
9. Comprueba en el navegador: `TU_URL_EXEC?action=health`. Debe devolver `"success":true` y `"writable":true`.

Cada cambio posterior en `Code.gs` requiere **Administrar implementaciones → Editar → Nueva versión**. No cambies la URL `/exec` configurada en el frontend.

## Modelo de datos

`initializeSheets()` busca una pestaña `PRODUCTOS`; si la primera pestaña existente ya contiene `ID_PRODUCTO`, la reutiliza. Crea `EVENTOS` cuando no existe. Nunca reemplaza encabezados: agrega al final solo los faltantes.

- `CANTIDAD` es siempre el stock vigente.
- La cantidad inicial no crea una recepción adicional.
- Recepción y devolución suman.
- Despacho resta y nunca permite stock negativo.
- Ingreso, ubicación y movimiento interno cambian ubicación, no stock.
- Preparación, entrega e incidencia no alteran stock.
- Los eventos se identifican con UUID y no se eliminan.
- `LockService` serializa los movimientos concurrentes.

## GitHub Pages

1. Sube el contenido de esta carpeta a la rama principal de un repositorio.
2. En GitHub abre **Settings → Pages**.
3. Selecciona **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. Espera la publicación y abre la URL HTTPS. HTTPS es necesario para solicitar acceso a la cámara en smartphones.

No agregues claves, tokens ni credenciales al repositorio. El ID de una hoja y la URL pública del Web App no son secretos; los permisos y validaciones deben residir en Apps Script.

## Bibliotecas cliente

- JsBarcode: Code 128 y EAN-13.
- QRCode.js: QR simple y JSON estructurado.
- html5-qrcode: cámara e imagen.
- Chart.js: indicadores gráficos.
- html2canvas: descarga de etiquetas.
- Lucide: iconografía.

Se cargan desde CDN, por lo que la generación, el escáner y los gráficos requieren conexión a Internet.

## Pruebas

Ejecuta las reglas puras con:

```powershell
node tests/logic.test.mjs
```

El plan de verificación manual está en [docs/pruebas.md](docs/pruebas.md).
