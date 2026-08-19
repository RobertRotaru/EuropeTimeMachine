// turf.bboxClip leaves empty [] placeholder rings/polygons in a MultiPolygon whenever one
// of its sub-polygons falls entirely outside the clip box, instead of removing them. That's
// invalid GeoJSON (every polygon needs at least one ring of >=4 points) and crashes
// MapLibre's GeoJSON worker when it tries to tile the data. This strips those out.
function isValidRing(ring) {
  return Array.isArray(ring) && ring.length >= 4;
}

function isValidPolygon(coords) {
  return Array.isArray(coords) && coords.length > 0 && coords.every(isValidRing);
}

/** Returns a cleaned geometry (Polygon/MultiPolygon), or null if nothing valid remains. */
function cleanGeometry(geometry) {
  if (!geometry) return null;

  if (geometry.type === "Polygon") {
    return isValidPolygon(geometry.coordinates) ? geometry : null;
  }

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates.filter(isValidPolygon);
    if (polygons.length === 0) return null;
    if (polygons.length === 1) {
      return { type: "Polygon", coordinates: polygons[0] };
    }
    return { type: "MultiPolygon", coordinates: polygons };
  }

  return null;
}

module.exports = { cleanGeometry };
