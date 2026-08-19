import { area } from "@turf/area";
import { pointOnFeature } from "@turf/point-on-feature";
import { polygon as turfPolygon, point as turfPoint } from "@turf/helpers";
import type { Feature, Point, Polygon, Position } from "geojson";
import type { BorderFeature, BorderFeatureCollection } from "../types";

/**
 * MapLibre's polygon symbol-placement puts one label anchor per sufficiently-large disjoint
 * part of a feature's geometry, not one per feature -- so a single-feature archipelago (e.g.
 * Greece's islands) gets several repeated labels, and Cliopatria sometimes also has several
 * separate *features* sharing a name (mainland + colonial fragments recorded as distinct
 * rows). Both are fixed the same way: group by name, keep only the largest feature per group,
 * then place exactly one label point inside that feature's own largest contiguous landmass
 * (via point-on-feature, which -- unlike a centroid -- is guaranteed to land on the polygon).
 */
function largestPolygonPart(geometry: BorderFeature["geometry"]): Polygon | null {
  if (geometry.type === "Polygon") {
    return geometry;
  }
  if (geometry.type === "MultiPolygon") {
    let best: Position[][] | null = null;
    let bestArea = -Infinity;
    for (const coords of geometry.coordinates) {
      const a = area(turfPolygon(coords));
      if (a > bestArea) {
        bestArea = a;
        best = coords;
      }
    }
    return best ? { type: "Polygon", coordinates: best } : null;
  }
  return null;
}

export function computeLabelPoints(
  fc: BorderFeatureCollection
): Feature<Point, { labelName: string }>[] {
  const groups = new Map<string, BorderFeature[]>();
  for (const f of fc.features as BorderFeature[]) {
    const key = f.properties.name ?? "";
    if (!key) continue;
    const list = groups.get(key);
    if (list) {
      list.push(f);
    } else {
      groups.set(key, [f]);
    }
  }

  const points: Feature<Point, { labelName: string }>[] = [];
  for (const [name, features] of groups) {
    const winner = features.reduce((a, b) =>
      (b.properties.areaKm2 ?? 0) > (a.properties.areaKm2 ?? 0) ? b : a
    );
    const part = largestPolygonPart(winner.geometry);
    if (!part) continue;

    let anchor;
    try {
      anchor = pointOnFeature(turfPolygon(part.coordinates));
    } catch {
      continue;
    }

    points.push(turfPoint(anchor.geometry.coordinates, { labelName: name }));
  }
  return points;
}
