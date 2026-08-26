# Plan de pruebas de LogiTrace

## Pruebas automatizadas realizadas

| Prueba | Entrada | Acción | Resultado esperado | Resultado |
|---|---|---|---|---|
| Sintaxis frontend | Todos los `.js` | `node --check` | Sin errores | Aprobado |
| Sintaxis backend | `Code.gs` | Compilación con motor JS | Sin errores | Aprobado |
| CSV con comillas | Campo con coma y comillas dobles | Parsear | Conserva el valor | Aprobado |
| Checksum EAN | `750123456789` | Calcular control | `3` | Aprobado |
| Validación EAN | `7501234567893` | Normalizar | Aceptado | Aprobado |
| EAN inválido | `7501234567894` | Normalizar | Error | Aprobado |
| Estado agotado | Cantidad `0` | Calcular estado | Agotado | Aprobado |
| Estado bajo | Cantidad `5` | Calcular estado | Stock bajo | Aprobado |
| ID único | Categoría/lote repetidos | Generar | Incrementa secuencia | Aprobado |
| Carga de interfaz | Sitio local | Abrir en navegador | Sin errores de consola | Aprobado |
| Generación EAN | Base `750123456789` | Generar etiqueta | `7501234567893` | Aprobado |

## Pruebas de integración después de desplegar Apps Script

| Prueba | Entrada | Acción | Resultado esperado | Resultado |
|---|---|---|---|---|
| Health | `?action=health` | GET | `success:true`, `writable:true` | Pendiente de URL `/exec` |
| Lectura real | Hoja publicada | Actualizar | Productos reales, sin mocks | Pendiente de red/despliegue |
| Producto válido | ID/nombre/categoría/lote/cantidad | Guardar | Nueva fila, sin evento duplicado | Pendiente |
| Producto duplicado | ID existente | Guardar | `DUPLICATE_PRODUCT` | Pendiente |
| Formulario incompleto | Nombre vacío | Guardar | Validación inline | Pendiente |
| Código duplicado | Code 128 ya asociado | Asociar | `DUPLICATE_CODE` | Pendiente |
| Recepción | Stock 10, cantidad 5 | Confirmar | Stock 15, evento `+5` | Pendiente |
| Despacho válido | Stock 15, cantidad 4 | Confirmar | Stock 11, evento `-4` | Pendiente |
| Despacho inválido | Stock 11, cantidad 12 | Confirmar | `INSUFFICIENT_STOCK`; sin cambios | Pendiente |
| Devolución | Stock 11, cantidad 2 | Confirmar | Stock 13 | Pendiente |
| Ubicación | Zona A → Rack A03 | Confirmar | Stock igual; ubicación actualizada | Pendiente |
| Entrega tras despacho | Cualquier cantidad | Confirmar | No vuelve a descontar | Pendiente |
| Incidencia | Observación | Confirmar | Stock sin cambios | Pendiente |
| Trazabilidad | Producto con eventos | Consultar | Historial completo, ordenado | Pendiente |
| Código inexistente | Valor no asociado | Escanear | Producto no registrado; sin evento | Pendiente |
| QR simple | ID producto | Escanear | Producto encontrado | Pendiente |
| QR estructurado | `{"type":"PRODUCT","id":"...","version":1}` | Escanear | Producto encontrado | Pendiente |
| RFID simulado | EPC generado | Simular | Detección visual y confirmación de evento | Pendiente |
| Cámara rechazada | Denegar permiso | Activar | Mensaje de permiso/cámara | Pendiente |
| Sin Internet | Desconectar red | Guardar | Banner offline; sin falso éxito | Pendiente |
| Concurrencia | Dos despachos simultáneos | Confirmar | Lock; ningún stock negativo | Pendiente |

## Datos sugeridos para demostración

Registra diez productos reales distribuidos entre al menos tres categorías. Asocia cinco identificadores 1D, cinco QR y cinco RFID simulados. Registra veinte eventos que incluyan recepción, ubicación, movimiento interno, despacho, devolución e incidencia. Los datos deben crearse mediante la interfaz o la hoja real; el frontend no contiene muestras ficticias.

## Revisión lógica

- Doble incremento: el stock inicial no crea un evento de recepción.
- Doble descuento: solo `Despacho` resta; `Entrega` no resta.
- Duplicidad: backend valida ID y todos los códigos bajo `LockService`.
- Producto inexistente: `createEvent` exige una fila real.
- EAN: el frontend calcula/valida checksum y el backend vuelve a validarlo al asociar.
- Stock negativo: se rechaza tanto en interfaz como bajo bloqueo en el backend.
- Historial: un movimiento agrega una fila; ningún flujo de la aplicación borra eventos.
- GitHub Pages: todas las rutas del frontend son relativas y no dependen de la raíz del dominio.
