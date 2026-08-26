# PROMPT MAESTRO — LOGITRACE PARTE 2

## Ampliación geográfica, validación por geocercas, trazabilidad espacial y mejora integral del sistema existente

Actúa como un arquitecto de software senior, desarrollador full-stack, especialista en logística, trazabilidad, GIS, JavaScript, Google Apps Script, Google Sheets, UX/UI y sistemas de identificación automática.

Vas a trabajar sobre un proyecto YA EXISTENTE Y FUNCIONAL llamado:

# LogiTrace — Identificación, Trazabilidad e Inventario Logístico

Tu tarea es AMPLIARLO, no reconstruirlo.

# 1. REGLA CRÍTICA: NO REESCRIBIR EL PROYECTO

Debes modificar el código actual conservando:

arquitectura existente;

HTML actual;

CSS actual;

JavaScript actual;

app.bundle.js;

config.runtime.js;

Google Apps Script;

Google Sheets;

GitHub Pages;

módulos existentes;

estructura visual actual;

navegación actual;

almacenamiento actual;

lógica de inventario;

lógica de eventos;

generación de códigos;

lectura mediante cámara;

trazabilidad;

impresión.

NO cambies de framework.

NO migres a:

React;

Vue;

Angular;

Node.js;

Firebase;

Supabase;

PHP;

Django;

otra base de datos.

La solución debe seguir siendo:

```text
Frontend HTML/CSS/JavaScript
            ↓
Google Apps Script Web App
            ↓
Google Sheets
```

Debe publicarse mediante:

```text
GitHub Pages
```

# 2. ESTADO ACTUAL QUE DEBES PRESERVAR

El sistema actual ya permite:

## Productos

registrar productos;

ID automático;

nombre;

categoría;

lote;

cantidad;

vencimiento;

origen;

destino;

ubicación actual;

estado.

## Identificación

Code 128;

EAN-13;

QR;

RFID simulado;

descarga;

impresión de etiquetas.

## Escáner

cámara;

carga de imágenes;

Code 128;

EAN-13;

QR.

## Resultado avanzado del escaneo

Actualmente, al escanear QR o código de barras, se debe conservar la funcionalidad que muestra:

producto;

ID;

categoría;

lote;

stock;

ubicación;

origen;

destino;

vencimiento;

estado;

código de barras visible;

QR visible;

RFID;

resumen histórico;

eventos;

cantidades;

actores;

observaciones;

stock antes/después;

trazabilidad completa.

NO regreses al comportamiento anterior de mostrar únicamente el código leído.

## Inventario

inventario actualizado;

stock;

categorías;

stock bajo;

agotados;

filtros.

## Trazabilidad

ficha completa;

QR visible;

código de barras visible;

RFID;

historial cronológico;

eventos detallados;

timeline.

## Backend

Ya existe:

```text
Code.gs
```

con acceso mediante:

```text
doGet()
doPost()
```

y Google Sheets.

Todo lo anterior debe continuar funcionando después de esta ampliación.

# 3. OBJETIVO DE LA AMPLIACIÓN

Agregar una capa geográfica real a LogiTrace para que cada evento pueda responder no solo:

¿Qué ocurrió?

sino también:

¿Dónde ocurrió realmente?

El sistema debe:

disponer de un maestro de ubicaciones;

asociar coordenadas a ubicaciones logísticas;

obtener posición GPS del dispositivo;

guardar latitud y longitud real de cada evento;

almacenar precisión del GPS;

guardar la fuente de la posición;

comparar posición capturada contra ubicación declarada;

calcular distancia mediante Haversine;

validar geocercas;

detectar excepciones;

mostrar ubicaciones y eventos en un mapa;

representar trayectorias de productos;

exportar GeoJSON;

permitir análisis posterior en QGIS;

añadir indicadores espaciales al Dashboard.

# 4. TECNOLOGÍAS GEOGRÁFICAS

Utilizar exclusivamente:

## Posición

```text
navigator.geolocation.getCurrentPosition()
```

con:

```text
enableHighAccuracy: true
```

## Mapa

Utilizar:

```text
Leaflet
+
OpenStreetMap
```

Incluir obligatoriamente la atribución correspondiente de OpenStreetMap.

No utilizar servicios que requieran:

API Key;

tarjeta de crédito;

cuenta comercial.

## Distancias

Implementar fórmula:

```text
Haversine
```

manualmente.

No instalar bibliotecas adicionales únicamente para calcular distancia.

## Backend

La validación geográfica debe ejecutarse en:

```text
Google Apps Script
```

NO confiar únicamente en cálculos del navegador.

# 5. MODELO DE DATOS — NUEVA PESTAÑA UBICACIONES

Crear en Google Sheets una nueva pestaña denominada exactamente:

```text
Ubicaciones
```

No utilizar:

```text
Ubicación
Locations
Sitios
Lugares
```

Debe llamarse:

```text
Ubicaciones
```

Encabezados exactos:

```text
ID_UBICACION
NOMBRE
TIPO
DIRECCION
LAT
LON
RADIO_GEOCERCA_M
PADRE_ID
ACTIVO
```

El código debe buscar los encabezados por nombre y no depender exclusivamente de posición de columna.

# 6. SIGNIFICADO DE UBICACIONES

Cada registro representa un lugar logístico.

Ejemplos:

```text
CD-TULCAN
Centro de Distribución Tulcán
Centro de distribución

PROV-001
Proveedor Norte
Proveedor

CLI-001
Cliente 001
Cliente

MUELLE-01
Muelle de recepción
Ubicación interna
```

Los tipos recomendados son:

Planta;

Centro de producción;

Centro de distribución;

Proveedor;

Cliente;

Almacén;

Muelle;

Rack;

Patio;

Laboratorio;

Otro.

# 7. UBICACIONES JERÁRQUICAS

Implementar:

```text
PADRE_ID
```

Ejemplo:

```text
Centro de Distribución Tulcán
    ├── Muelle 1
    ├── Muelle 2
    ├── Rack A-01
    ├── Rack A-02
    └── Zona despacho
```

Las ubicaciones internas como:

racks;

muelles;

zonas internas

NO necesitan GPS diferente si físicamente pertenecen al mismo predio.

Cuando una ubicación no tenga coordenadas propias y tenga PADRE_ID:

buscar padre;

heredar LAT;

heredar LON;

heredar radio de geocerca cuando corresponda.

Evitar asignar coordenadas artificialmente distintas a racks separados por pocos metros.

# 8. DATOS MÍNIMOS DE UBICACIONES

Preparar el sistema para cargar por lo menos:

```text
1 planta / centro de producción
1 centro de distribución
2 proveedores
6 clientes
2 ubicaciones internas
```

Radios sugeridos:

```text
Planta                     200 m
Centro de distribución     150 m
Proveedor                  150 m
Cliente                    100 m
Ubicación interna          hereda del padre
```

No hardcodear esos valores como reglas universales.

Deben poder modificarse desde el formulario.

# 9. MIGRACIÓN DE PRODUCTOS

Actualmente existen:

```text
ORIGEN
DESTINO
UBICACION_ACTUAL
```

NO eliminar estas columnas.

NO renombrarlas.

Modificar la interfaz para que dejen de ser campos de texto libre.

Convertirlos en listas desplegables alimentadas desde:

```text
Ubicaciones
```

Mostrar al usuario:

```text
NOMBRE
```

pero guardar internamente:

```text
ID_UBICACION
```

Ejemplo:

Usuario selecciona:

```text
Centro de Distribución Tulcán
```

Google Sheets almacena:

```text
CD-TULCAN
```

# 10. NUEVO MÓDULO — UBICACIONES

Agregar al menú lateral:

```text
Ubicaciones
```

preferiblemente cerca de:

```text
Inventario
Trazabilidad
Mapa
```

Crear una pantalla profesional.

# 11. FORMULARIO DE UBICACIONES

Campos:

```text
ID ubicación
Nombre
Tipo
Dirección
Latitud
Longitud
Radio de geocerca
Ubicación padre
Activo
```

El ID debe poder generarse automáticamente.

Ejemplos:

```text
UBI-CD-001
UBI-PROV-001
UBI-CLI-001
```

# 12. CAPTURA DE COORDENADAS

Permitir dos métodos.

## Método A — Mi ubicación actual

Botón:

```text
Usar mi posición actual
```

Ejecutar:

```text
navigator.geolocation.getCurrentPosition()
```

con:

```text
{
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
}
```

Mostrar:

```text
Latitud
Longitud
Precisión ± XX m
```

antes de guardar.

## Método B — Seleccionar en mapa

Mostrar mapa Leaflet.

El usuario hace clic sobre el mapa.

Guardar:

```text
lat
lon
```

Mostrar marcador provisional.

Permitir moverlo antes de guardar.

# 13. LISTADO DE UBICACIONES

Mostrar tabla:

ID | Nombre | Tipo | Dirección | Lat | Lon | Radio | Padre | Estado | Acciones |

Permitir:

búsqueda;

filtros;

editar;

activar/desactivar;

abrir mapa;

centrar ubicación.

No eliminar físicamente una ubicación que ya tenga eventos.

Usar preferentemente:

```text
ACTIVO = Sí/No
```

# 14. AMPLIACIÓN DE EVENTOS

La pestaña existente:

```text
Eventos
```

debe conservar TODAS sus columnas actuales.

Agregar exactamente estos SIETE campos:

```text
ID_UBICACION_DECLARADA
LAT_CAPTURADA
LON_CAPTURADA
PRECISION_M
FUENTE_UBICACION
DISTANCIA_DECLARADA_M
VALIDACION_GEO
```

No eliminar ni renombrar ninguna columna existente.

# 15. FUENTE DE UBICACIÓN

FUENTE_UBICACION debe identificar cómo fue obtenida.

Valores recomendados:

```text
GPS
MAPA
SIN_GPS
```

Opcionalmente:

```text
GPS_ALTA_PRECISION
GPS_BAJA_PRECISION
```

siempre que mantengas consistencia.

# 16. NUEVO FLUJO DEL ESCÁNER

Actualmente:

```text
Escanear
→ identificar producto
→ mostrar trazabilidad
→ elegir evento
→ confirmar
```

Debe convertirse en:

```text
Escanear QR / Code 128 / EAN
            ↓
Identificar producto
            ↓
Mostrar ficha + trazabilidad
            ↓
Seleccionar evento
            ↓
Seleccionar ubicación declarada
            ↓
Solicitar posición GPS
            ↓
Mostrar precisión al usuario
            ↓
Confirmar
            ↓
Servidor calcula Haversine
            ↓
Servidor valida geocerca
            ↓
Guardar evento
            ↓
Actualizar inventario
            ↓
Mostrar resultado geográfico
```

# 17. UBICACIÓN DECLARADA EN EL EVENTO

Agregar un selector:

```text
Ubicación declarada
```

alimentado desde:

```text
Ubicaciones
```

Guardar:

```text
ID_UBICACION_DECLARADA
```

No guardar solamente el nombre.

Mostrar el nombre para UX.

# 18. CAPTURA GPS ANTES DE GUARDAR EVENTO

Después de seleccionar evento y ubicación:

Botón:

```text
Obtener posición
```

Mostrar un panel:

```text
Posición capturada

Latitud:
0.81234

Longitud:
-77.71782

Precisión:
± 8 m

Fuente:
GPS

[Confirmar evento]
```

# 19. PERMISO GPS DENEGADO

NO detener el flujo.

Si:

usuario niega permiso;

navegador no soporta geolocalización;

timeout;

GPS no disponible;

mostrar:

```text
No fue posible obtener la posición automáticamente.
Puede seleccionar la posición manualmente en el mapa.
```

Botón:

```text
Seleccionar en mapa
```

Después permitir continuar.

# 20. NUNCA RECHAZAR EVENTO POR UBICACIÓN

Un evento fuera de geocerca representa información valiosa.

Por tanto:

```text
FUERA_GEOCERCA
```

NO significa:

```text
EVENTO RECHAZADO
```

El evento debe guardarse.

Debe quedar marcado como excepción.

Esto es indispensable para auditoría logística.

# 21. VALIDACIÓN EN APPS SCRIPT

Crear función:

```text
haversineDistance(lat1, lon1, lat2, lon2)
```

Usar radio terrestre aproximado:

```text
6371000 m
```

Retornar metros.

La validación definitiva debe hacerse en:

```text
Code.gs
```

No únicamente en frontend.

# 22. RESOLUCIÓN DE UBICACIÓN

Crear función backend:

```text
resolveLocationCoordinates(idUbicacion)
```

Debe:

buscar ubicación;

comprobar si tiene LAT/LON;

si no tiene y posee PADRE_ID:

buscar padre;

heredar coordenadas;

heredar geocerca;

evitar ciclos padre-hijo;

devolver:

lat;

lon;

radio;

ubicación efectiva.

# 23. ESTADOS DE VALIDACIÓN GEO

Implementar exactamente:

```text
OK
FUERA_GEOCERCA
BAJA_PRECISION
SIN_GPS
```

# 24. REGLA DE VALIDACIÓN

Usar una lógica inequívoca.

## SIN_GPS

Cuando no existe:

```text
LAT_CAPTURADA
LON_CAPTURADA
```

Resultado:

```text
SIN_GPS
```

## BAJA_PRECISION

Definir umbral configurable.

Por ejemplo:

```text
MAX_ACCEPTABLE_ACCURACY_M = 100
```

Si:

```text
PRECISION_M > 100
```

resultado:

```text
BAJA_PRECISION
```

aunque se pueda calcular distancia.

Registrar igualmente:

```text
DISTANCIA_DECLARADA_M
```

cuando sea posible.

## FUERA_GEOCERCA

Si precisión es aceptable pero:

```text
DISTANCIA_DECLARADA_M > RADIO_GEOCERCA_M
```

resultado:

```text
FUERA_GEOCERCA
```

## OK

Si:

```text
precision aceptable
AND
distancia <= radio
```

resultado:

```text
OK
```

# 25. IMPORTANTE: NO CONFIAR EN validacion_geo DEL FRONTEND

El navegador puede mandar:

```text
{
  "validacion_geo": "OK"
}
```

pero Apps Script debe ignorar ese resultado y recalcularlo.

La fuente de verdad es:

```text
Backend
```

# 26. RESPUESTA DEL BACKEND

Después de guardar evento, devolver:

```text
{
  "success": true,
  "message": "Evento registrado",
  "data": {
    "event": {},
    "geoValidation": {
      "status": "OK",
      "distanceMeters": 34.8,
      "geofenceRadiusMeters": 150,
      "accuracyMeters": 8,
      "declaredLocation": "Centro de Distribución Tulcán"
    }
  }
}
```

# 27. RESULTADO VISUAL TRAS REGISTRAR EVENTO

Mostrar tarjeta:

```text
EVENTO REGISTRADO

Producto
Laptop industrial Dell

Evento
RECEPCIÓN

Ubicación declarada
Centro de Distribución Tulcán

Distancia
34.8 m

Geocerca
150 m

Precisión
± 8 m

VALIDACIÓN
✓ DENTRO DE GEOCERCA
```

Para excepción:

```text
⚠ FUERA DE GEOCERCA
Distancia: 837 m
Radio permitido: 150 m
```

No confundir excepción geográfica con error técnico.

# 28. NUEVO MÓDULO — MAPA

Agregar opción:

```text
Mapa
```

al menú.

Utilizar:

```text
Leaflet + OpenStreetMap
```

# 29. MAPA — UBICACIONES

Mostrar todas las ubicaciones activas.

Marcadores diferenciados visualmente por:

```text
Planta
Centro de distribución
Proveedor
Cliente
Ubicación interna
Otro
```

Utilizar:

iconos;

formas;

etiquetas;

y no depender exclusivamente del color.

Popup:

```text
Nombre
Tipo
Dirección
Radio
ID
Ubicación padre
```

# 30. GEOCERCAS

Para cada ubicación externa dibujar:

```text
L.circle()
```

utilizando:

```text
RADIO_GEOCERCA_M
```

Mostrar radio real en metros.

Permitir activar/desactivar visualización mediante control:

```text
☑ Geocercas
```

# 31. MAPA — EVENTOS

Mostrar eventos que tengan:

```text
LAT_CAPTURADA
LON_CAPTURADA
```

Diferenciarlos según:

```text
OK
FUERA_GEOCERCA
BAJA_PRECISION
SIN_GPS
```

SIN_GPS no puede colocarse físicamente en mapa; mostrarlo en un contador/listado de eventos sin coordenadas.

Popup de evento:

```text
Producto
Evento
Fecha/hora
Ubicación declarada
Ubicación capturada
Distancia
Precisión
Estado
Actor
```

# 32. FILTROS DEL MAPA

Agregar:

```text
Producto
Tipo de evento
Estado geo
Ubicación
Fecha desde
Fecha hasta
```

Botones:

```text
Aplicar
Limpiar
Ajustar mapa
```

# 33. LEYENDA

Mostrar siempre:

```text
✓ OK
⚠ Fuera de geocerca
◉ Baja precisión
— Sin GPS
```

y tipos de ubicación.

# 34. AMPLIACIÓN DE TRAZABILIDAD

La pantalla actual ya muestra:

ficha;

código de barras;

QR;

RFID;

timeline.

NO eliminar nada.

Agregar debajo:

# Trayectoria geográfica

Mapa del producto consultado.

# 35. TRAYECTORIA

Obtener todos sus eventos con coordenadas.

Ordenar:

```text
FECHA_HORA ascendente
```

Representar como:

```text
1 → 2 → 3 → 4 → 5
```

Cada evento:

marcador numerado;

tooltip;

popup.

Unir mediante:

```text
L.polyline()
```

# 36. POPUP DE TRAYECTORIA

Ejemplo:

```text
Evento 3 de 7

DESPACHO
25/08/2026 15:25

Lugar declarado:
Centro de Distribución Tulcán

Distancia:
17 m

Precisión:
± 6 m

Estado:
OK

Stock:
12 → 9
```

# 37. EVENTOS SIN GPS EN TRAZABILIDAD

No omitirlos.

Mostrar en timeline normal:

```text
SIN GPS
```

y en la sección del mapa:

```text
2 eventos no pudieron representarse por falta de coordenadas.
```

# 38. RESUMEN GEOGRÁFICO EN TRAZABILIDAD

Añadir KPIs:

```text
Eventos georreferenciados
Eventos OK
Fuera de geocerca
Baja precisión
Sin GPS
Distancia total aproximada
```

La distancia total debe utilizar únicamente segmentos con coordenadas válidas y debe aclararse que corresponde a distancia geodésica entre eventos, no necesariamente a ruta vial recorrida.

# 39. DASHBOARD — NUEVOS KPIs

Mantener todos los indicadores actuales.

Agregar:

```text
Eventos georreferenciados
% eventos OK
% fuera de geocerca
% baja precisión
Eventos sin GPS
```

Fórmula:

```text
% FUERA_GEOCERCA =
eventos FUERA_GEOCERCA
/
eventos georreferenciados válidos
× 100
```

Definir explícitamente el denominador en código y documentación para evitar ambigüedad.

# 40. DASHBOARD — NUEVOS GRÁFICOS

Agregar:

## Validación geográfica

```text
OK
FUERA_GEOCERCA
BAJA_PRECISION
SIN_GPS
```

## Excepciones por ubicación

Mostrar qué ubicaciones acumulan mayor cantidad de:

```text
FUERA_GEOCERCA
```

# 41. EXPORTACIÓN GEOJSON

Agregar módulo o botones:

```text
Exportar ubicaciones.geojson
Exportar eventos.geojson
```

# 42. GEOJSON DE UBICACIONES

Generar:

```text
{
  "type": "FeatureCollection",
  "features": []
}
```

Cada ubicación:

```text
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-77.71782, 0.81234]
  },
  "properties": {
    "id_ubicacion": "CD-TULCAN",
    "nombre": "Centro de Distribución Tulcán",
    "tipo": "Centro de distribución",
    "radio_geocerca_m": 150
  }
}
```

IMPORTANTE:

GeoJSON exige:

```text
[LONGITUD, LATITUD]
```

NO:

```text
[LATITUD, LONGITUD]
```

# 43. GEOJSON DE EVENTOS

Cada evento con coordenadas:

```text
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-77.71765, 0.81250]
  },
  "properties": {
    "id_evento": "EVT-001",
    "id_producto": "UPEC-ALM-P001",
    "evento": "RECEPCIÓN",
    "fecha_hora": "...",
    "id_ubicacion_declarada": "CD-TULCAN",
    "precision_m": 8,
    "distancia_declarada_m": 22.4,
    "validacion_geo": "OK"
  }
}
```

No exportar coordenadas inválidas.

# 44. DESCARGA

Crear función:

```text
downloadGeoJSON(data, filename)
```

Utilizar:

```text
Blob
URL.createObjectURL()
```

No requerir servidor adicional.

# 45. ENDPOINTS DEL BACKEND

Mantener todos los actuales.

Agregar:

```text
GET ?action=locations
GET ?action=location&id=...
GET ?action=geoEvents
GET ?action=trace&productId=...
GET ?action=dashboard
```

POST:

```text
createLocation
updateLocation
createEvent
```

Puede ampliarse createEvent, no crear una segunda implementación redundante.

# 46. FUNCIONES NUEVAS EN Code.gs

Crear o integrar:

```text
getLocations()
getLocation()
createLocation()
updateLocation()
resolveLocationCoordinates()
haversineDistance()
validateGeoEvent()
getGeoEvents()
buildLocationsGeoJSON()
buildEventsGeoJSON()
```

Mantener las funciones existentes.

# 47. EVENTO — PROCESAMIENTO COMPLETO

En backend:

```text
1. Validar producto
2. Validar tipo de evento
3. Validar cantidades
4. Resolver ubicación declarada
5. Resolver coordenadas heredadas
6. Procesar GPS
7. Calcular Haversine
8. Validar precisión
9. Validar geocerca
10. Calcular stock
11. Guardar evento
12. Actualizar producto
13. Devolver resultado
```

Utilizar:

```text
LockService
```

para operaciones críticas.

# 48. REGLAS DE INVENTARIO EXISTENTES

NO modificarlas.

Mantener:

```text
Recepción       suma
Devolución      suma
Despacho        resta
Ubicación       no altera stock
Movimiento      no altera stock
Preparación     no altera stock
Entrega         no vuelve a restar
Incidencia      no altera automáticamente
```

La validación geo nunca debe cambiar el cálculo de stock.

# 49. INTERACCIÓN ENTRE TRAZABILIDAD Y MAPA

Desde resultado de escaneo agregar:

```text
Ver trazabilidad completa
Ver en mapa
```

Desde trazabilidad:

```text
Centrar trayectoria
```

Desde mapa:

al pulsar evento:

```text
Abrir producto
Abrir trazabilidad
```

Los módulos deben estar conectados entre sí.

# 50. RESULTADO DEL ESCÁNER MÁS COMPLETO

Después de leer QR o código de barras, mantener:

## Identificación

código leído;

tecnología;

fecha/hora.

## Producto

ID;

nombre;

categoría;

lote;

stock;

ubicación;

origen;

destino.

## Identificadores

Code 128/EAN visible;

QR visible;

RFID.

## Resumen trazabilidad

eventos;

recibido;

despachado;

devuelto;

incidencias.

## Timeline

Historial completo.

## Nuevo panel geográfico

Mostrar:

```text
Última posición registrada
Última ubicación declarada
Última distancia
Última precisión GPS
Último estado geográfico
```

## Mapa pequeño

Mostrar la última posición y ubicación declarada cuando existan.

# 51. MEJORAS UX

La aplicación no debe convertirse en una colección de formularios.

Utilizar:

cards;

badges;

tabs;

mapas;

loaders;

toasts;

iconos;

tooltips;

estados vacíos;

filtros;

breadcrumbs cuando ayuden.

# 52. ESTADOS VISUALES GEO

Mostrar badges consistentes:

```text
OK
FUERA DE GEOCERCA
BAJA PRECISIÓN
SIN GPS
```

No utilizar solo color.

Agregar:

icono;

texto;

color.

# 53. MAPAS RESPONSIVE

Debe funcionar en smartphone.

Especialmente importante:

módulo Escáner;

captura GPS;

selección manual;

mapa.

Asegurar altura mínima usable:

```text
min-height: 350px;
```

en móvil.

# 54. HTTPS

La geolocalización exige contexto seguro.

En file:// mostrar:

```text
La geolocalización requiere HTTPS o localhost.
Publica en GitHub Pages o utiliza Live Server.
```

No mostrar error genérico.

# 55. CONTROL DE PRECISIÓN

Mostrar explícitamente:

```text
Precisión GPS: ± 8 m
```

No esconderla.

Puede añadirse una ayuda:

```text
Menor valor = mayor precisión.
```

# 56. VALIDACIÓN NUMÉRICA

Latitud:

```text
-90 ≤ lat ≤ 90
```

Longitud:

```text
-180 ≤ lon ≤ 180
```

Radio:

```text
> 0
```

Precisión:

```text
>= 0
```

# 57. SEGURIDAD Y ROBUSTEZ

No insertar información del usuario mediante innerHTML sin sanitización.

No exponer secretos.

No modificar:

```text
SPREADSHEET_ID
APPS_SCRIPT_URL
```

salvo configuración explícita.

# 58. COMPATIBILIDAD CON DATOS EXISTENTES

Hay eventos históricos anteriores sin GPS.

NO fallar al encontrarlos.

Tratar:

```text
LAT_CAPTURADA vacía
LON_CAPTURADA vacía
```

como:

```text
SIN_GPS
```

cuando corresponda.

El timeline anterior debe seguir mostrándolos.

# 59. MIGRACIÓN AUTOMÁTICA

initializeSheets() debe:

detectar Productos;

detectar Eventos;

crear Ubicaciones si no existe;

agregar encabezados faltantes;

NO borrar filas;

NO borrar columnas;

NO cambiar datos históricos.

La migración debe ser idempotente.

Ejecutarla dos veces no debe duplicar columnas.

# 60. DATOS DEMOSTRATIVOS

Preparar capacidad para mínimo:

```text
10 ubicaciones
15 eventos georreferenciados
2 FUERA_GEOCERCA
```

No generar automáticamente datos ficticios en producción.

Puede existir función opcional:

```text
seedDemoLocations()
```

pero debe requerir ejecución manual.

# 61. PRUEBAS OBLIGATORIAS

Crear pruebas para:

### GPS correcto

```text
distancia = 20 m
radio = 150 m
precision = 8 m
resultado = OK
```

### Fuera geocerca

```text
distancia = 850 m
radio = 150 m
precision = 10 m
resultado = FUERA_GEOCERCA
```

### Baja precisión

```text
precision = 600 m
resultado = BAJA_PRECISION
```

### Sin GPS

```text
lat/lon inexistentes
resultado = SIN_GPS
```

### Ubicación hija

```text
Rack A01
PADRE_ID = CD-TULCAN
```

Debe heredar coordenadas.

### Evento fuera de geocerca

Debe:

```text
guardarse
```

NO:

```text
rechazarse
```

### Evento histórico

Sin GPS debe seguir apareciendo en trazabilidad.

### GeoJSON

Verificar que use:

```text
[lon, lat]
```

# 62. QGIS

La aplicación NO debe integrar QGIS.

Solo debe producir archivos correctamente estructurados para cargar posteriormente:

```text
ubicaciones.geojson
eventos.geojson
```

La fuente de datos sigue siendo LogiTrace.

QGIS es consumidor, no origen.

# 63. DOCUMENTACIÓN

Actualizar README con:

```text
Arquitectura
Parte 1
Parte 2 geográfica
Hoja Ubicaciones
Columnas nuevas Eventos
Geolocation API
Permisos
Leaflet
OpenStreetMap
Geocercas
Haversine
Estados de validación
GeoJSON
QGIS
GitHub Pages
Limitaciones
Pruebas
```

# 64. COMENTARIOS DE CÓDIGO

Agregar comentarios únicamente en lógica crítica:

```text
// GeoJSON usa [longitud, latitud]

// Esta validación se repite en servidor por seguridad

// Las ubicaciones internas pueden heredar coordenadas del padre
```

No llenar el código de comentarios redundantes.

# 65. NO HACER

No:

reescribir el sistema;

cambiar framework;

eliminar módulos;

eliminar columnas existentes;

renombrar columnas anteriores;

eliminar historial;

reemplazar Google Sheets;

validar geocerca únicamente en navegador;

rechazar eventos fuera de geocerca;

confundir precisión con distancia;

restar latitudes/longitudes para calcular metros;

invertir lat/lon en GeoJSON;

asignar GPS diferente artificialmente a cada rack;

usar APIs de mapas que exijan pago;

usar QGIS como base de datos;

ocultar eventos sin GPS;

destruir la trazabilidad actual;

dejar botones sin funcionalidad;

utilizar datos hardcodeados para aparentar funcionamiento.

# 66. ORDEN DE IMPLEMENTACIÓN

Trabaja estrictamente por fases.

## FASE 0 — AUDITORÍA

Antes de modificar:

inspecciona archivos existentes;

identifica módulos;

identifica funciones actuales;

identifica API;

identifica columnas actuales;

identifica dependencias.

Entrega una tabla:

```text
Archivo
Función actual
Modificación requerida
Riesgo
```

NO codifiques todavía hasta terminar la auditoría.

# 67. FASE 1 — DATOS

Implementar:

```text
Ubicaciones
+
columnas nuevas Eventos
+
initializeSheets()
```

Comprobar.

# 68. FASE 2 — BACKEND

Implementar:

```text
locations
Haversine
validación
herencia
geo endpoints
```

Comprobar.

# 69. FASE 3 — PRODUCTOS

Reemplazar texto libre:

```text
Origen
Destino
Ubicación
```

por selects.

Comprobar creación y edición.

# 70. FASE 4 — UBICACIONES

Crear:

```text
formulario
mapa
GPS
edición
listado
```

Comprobar.

# 71. FASE 5 — ESCÁNER

Agregar captura geográfica al flujo actual sin perder:

```text
ficha
QR
barcode
timeline
evento
```

Comprobar desde smartphone.

# 72. FASE 6 — MAPA

Implementar:

```text
ubicaciones
geocercas
eventos
filtros
leyenda
```

# 73. FASE 7 — TRAZABILIDAD

Agregar:

```text
trayectoria
marcadores numerados
polyline
KPIs geo
```

# 74. FASE 8 — DASHBOARD

Agregar indicadores espaciales.

# 75. FASE 9 — GEOJSON

Implementar exportación y validar en QGIS.

# 76. FASE 10 — REGRESIÓN

Volver a probar TODAS las funciones de Parte 1:

```text
Productos
Barcode
EAN
QR
RFID
Escáner
Inventario
Eventos
Trazabilidad
Etiquetas
Impresión
Dashboard
Google Sheets
```

Ninguna debe deteriorarse.

# 77. FORMA DE ENTREGA DEL CÓDIGO

No me entregues únicamente instrucciones.

Modifica el proyecto.

Cuando cambies un archivo, entrégalo completo.

NO utilizar:

```text
// resto igual
// código omitido
// implementar aquí
...
```

# 78. REPORTE DE CAMBIOS

Al terminar, generar:

```text
CAMBIOS_PARTE_2.md
```

con:

## Archivos modificados

## Archivos nuevos

## Columnas añadidas

## Endpoints añadidos

## Funciones añadidas

## Pruebas realizadas

## Limitaciones

# 79. MATRIZ DE VALIDACIÓN FINAL

Entregar tabla:

Requisito | Implementado | Archivo | Cómo comprobar

Debe incluir todos los requisitos del prompt.

# 80. CRITERIO FINAL DE TERMINACIÓN

NO consideres el trabajo terminado únicamente porque el mapa se vea.

Debe funcionar este caso completo:

```text
1. Registrar ubicación.
2. Elegirla como ubicación de un producto.
3. Generar QR.
4. Escanear QR desde smartphone.
5. Identificar producto.
6. Mostrar ficha y trazabilidad actual.
7. Elegir RECEPCIÓN.
8. Seleccionar ubicación declarada.
9. Capturar GPS.
10. Mostrar precisión.
11. Confirmar evento.
12. Apps Script calcula Haversine.
13. Apps Script determina validación.
14. Guardar evento.
15. Actualizar inventario.
16. Mostrar estado geo.
17. Abrir trazabilidad.
18. Ver evento en timeline.
19. Ver evento en mapa.
20. Ver trayectoria.
21. Ver KPI en dashboard.
22. Exportar eventos.geojson.
23. Cargar GeoJSON correctamente en QGIS.
```

Solo después de comprobar este flujo de extremo a extremo considera terminada la ampliación.

# 81. PRINCIPIO FUNCIONAL

La lógica conceptual final de LogiTrace debe ser:

```text
IDENTIFICADOR
      ↓
PRODUCTO
      ↓
EVENTO
      ↓
ACTOR
      ↓
TIEMPO
      ↓
UBICACIÓN DECLARADA
      ↓
UBICACIÓN REAL CAPTURADA
      ↓
PRECISIÓN
      ↓
DISTANCIA
      ↓
VALIDACIÓN DE GEOCERCA
      ↓
INVENTARIO
      ↓
HISTORIAL
      ↓
MAPA
      ↓
TRAYECTORIA
      ↓
ANÁLISIS LOGÍSTICO
```

El propósito no es simplemente “poner un mapa”.

El propósito es convertir la ubicación de un campo textual a una evidencia geográfica auditable dentro de la trazabilidad logística.
