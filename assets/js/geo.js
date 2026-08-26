export const GEO_STATUSES = Object.freeze(["OK", "FUERA_GEOCERCA", "BAJA_PRECISION", "SIN_GPS"]);
export const MAX_ACCEPTABLE_ACCURACY_M = 100;

export function validLatitude(value) {
  if (value === "" || value === null || value === undefined) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= -90 && number <= 90;
}

export function validLongitude(value) {
  if (value === "" || value === null || value === undefined) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= -180 && number <= 180;
}

export function hasCoordinates(item = {}) {
  return validLatitude(item.latCapturada ?? item.lat) && validLongitude(item.lonCapturada ?? item.lon);
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (![validLatitude(lat1), validLongitude(lon1), validLatitude(lat2), validLongitude(lon2)].every(Boolean)) return null;
  const radians = degrees => Number(degrees) * Math.PI / 180;
  const deltaLat = radians(Number(lat2) - Number(lat1));
  const deltaLon = radians(Number(lon2) - Number(lon1));
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateGeo({ lat, lon, accuracy, declaredLat, declaredLon, radius, maxAccuracy = MAX_ACCEPTABLE_ACCURACY_M } = {}) {
  if (!validLatitude(lat) || !validLongitude(lon)) return { status: "SIN_GPS", distanceMeters: null };
  const distanceMeters = haversineDistance(declaredLat, declaredLon, lat, lon);
  if (Number.isFinite(Number(accuracy)) && Number(accuracy) > maxAccuracy) return { status: "BAJA_PRECISION", distanceMeters };
  if (distanceMeters === null || !Number.isFinite(Number(radius)) || Number(radius) <= 0) return { status: "SIN_GPS", distanceMeters };
  return { status: distanceMeters > Number(radius) ? "FUERA_GEOCERCA" : "OK", distanceMeters };
}

export function geoStatusLabel(status = "SIN_GPS") {
  return ({ OK: "Dentro de geocerca", FUERA_GEOCERCA: "Fuera de geocerca", BAJA_PRECISION: "Baja precisión", SIN_GPS: "Sin GPS" })[status] || status;
}

export function geoStatusIcon(status = "SIN_GPS") {
  return ({ OK: "badge-check", FUERA_GEOCERCA: "triangle-alert", BAJA_PRECISION: "locate", SIN_GPS: "map-pin-off" })[status] || "map-pin";
}

export function geoStatusClass(status = "") {
  return ({ OK: "success", FUERA_GEOCERCA: "danger", BAJA_PRECISION: "warning", SIN_GPS: "neutral" })[status] || "info";
}

export function resolveLocation(locations, id, visited = new Set()) {
  const location = locations.find(item => item.idUbicacion === id);
  if (!location || visited.has(id)) return null;
  visited.add(id);
  if (validLatitude(location.lat) && validLongitude(location.lon)) return { ...location, effectiveLocationId: location.idUbicacion };
  if (!location.padreId) return { ...location, effectiveLocationId: location.idUbicacion };
  const parent = resolveLocation(locations, location.padreId, visited);
  if (!parent) return { ...location, effectiveLocationId: location.idUbicacion };
  return {
    ...location,
    lat: parent.lat,
    lon: parent.lon,
    radioGeocercaM: Number(location.radioGeocercaM) > 0 ? Number(location.radioGeocercaM) : parent.radioGeocercaM,
    effectiveLocationId: parent.effectiveLocationId || parent.idUbicacion
  };
}

export function buildLocationsGeoJSON(locations = []) {
  return {
    type: "FeatureCollection",
    features: locations.map(location => resolveLocation(locations, location.idUbicacion)).filter(hasCoordinates).map(location => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [Number(location.lon), Number(location.lat)] },
      properties: {
        id_ubicacion: location.idUbicacion,
        nombre: location.nombre,
        tipo: location.tipo,
        direccion: location.direccion,
        radio_geocerca_m: Number(location.radioGeocercaM) || null,
        padre_id: location.padreId || null,
        activo: Boolean(location.activo)
      }
    }))
  };
}

export function buildEventsGeoJSON(events = []) {
  return {
    type: "FeatureCollection",
    features: events.filter(hasCoordinates).map(event => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [Number(event.lonCapturada), Number(event.latCapturada)] },
      properties: {
        id_evento: event.idEvento,
        id_producto: event.idProducto,
        evento: event.evento,
        fecha_hora: event.fechaHora,
        id_ubicacion_declarada: event.idUbicacionDeclarada || null,
        precision_m: Number.isFinite(Number(event.precisionM)) ? Number(event.precisionM) : null,
        distancia_declarada_m: Number.isFinite(Number(event.distanciaDeclaradaM)) ? Number(event.distanciaDeclaradaM) : null,
        validacion_geo: event.validacionGeo || "SIN_GPS",
        actor: event.actor || null
      }
    }))
  };
}

export function downloadGeoJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/geo+json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function approximateTrackDistance(events = []) {
  const points = [...events].filter(hasCoordinates).sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
  return points.slice(1).reduce((total, point, index) => total + (haversineDistance(points[index].latCapturada, points[index].lonCapturada, point.latCapturada, point.lonCapturada) || 0), 0);
}
