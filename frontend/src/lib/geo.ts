import type { Geometry, Position } from "geojson";

export type Bounds = [[number, number], [number, number]];

type NestedCoords = Position | NestedCoords[];

function eachPosition(coords: NestedCoords, visit: (pos: Position) => void) {
  if (typeof coords[0] === "number") {
    visit(coords as Position);
    return;
  }
  for (const c of coords as NestedCoords[]) {
    eachPosition(c, visit);
  }
}

/** Bounding box of any GeoJSON geometry, as [[minLng, minLat], [maxLng, maxLat]]. */
export function boundsOfGeometry(geometry: Geometry): Bounds {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  if (geometry.type === "GeometryCollection") {
    for (const g of geometry.geometries) {
      const [[minX, minY], [maxX, maxY]] = boundsOfGeometry(g);
      minLng = Math.min(minLng, minX);
      minLat = Math.min(minLat, minY);
      maxLng = Math.max(maxLng, maxX);
      maxLat = Math.max(maxLat, maxY);
    }
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }

  eachPosition((geometry as { coordinates: NestedCoords }).coordinates, ([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  });

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function yearLabel(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}
