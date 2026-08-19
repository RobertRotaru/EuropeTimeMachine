// One-time preprocessing: clip Natural Earth's 10m admin-0 countries (real, survey-grade
// precision -- unlike Cliopatria's hand-digitized historical polygons) to the Europe
// bounding box, for use as the exact present-day border layer. Includes microstates
// (Vatican, San Marino, Liechtenstein, ...) that Cliopatria's dataset omits or that our
// earlier area-based filtering accidentally dropped.
// Run with: node process-present-day.js
const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");
const { cleanGeometry } = require("./geometry-utils");

const EUROPE_BBOX = [-25, 34, 45, 72];

const inputPath = path.join(
  __dirname,
  "..",
  "backend",
  "data-cache",
  "raw",
  "natural-earth",
  "ne_10m_admin_0_countries.geojson"
);
const outputPath = path.join(
  __dirname,
  "..",
  "backend",
  "data-cache",
  "processed",
  "present-day-europe.geojson"
);

const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
console.log("Input features:", data.features.length);

const out = [];

for (const f of data.features) {
  if (!f.geometry) continue;
  let bbox;
  try {
    bbox = turf.bbox(f);
  } catch (e) {
    continue;
  }
  const [minX, minY, maxX, maxY] = bbox;
  const overlaps =
    minX <= EUROPE_BBOX[2] &&
    maxX >= EUROPE_BBOX[0] &&
    minY <= EUROPE_BBOX[3] &&
    maxY >= EUROPE_BBOX[1];
  if (!overlaps) continue;

  let clipped;
  try {
    clipped = turf.bboxClip(f, EUROPE_BBOX);
  } catch (e) {
    continue;
  }
  const cleanedGeometry = cleanGeometry(clipped.geometry);
  if (!cleanedGeometry) continue;

  const preSimplifyAreaKm2 = turf.area({ type: "Feature", properties: {}, geometry: cleanedGeometry }) / 1e6;

  // Light simplification only -- this is ~90 features, not thousands, so we can afford to
  // stay close to source resolution (the whole point of using this dataset for "exact"
  // present-day borders). Micro-states (Vatican City is ~0.44 km2) skip simplification
  // entirely: a tolerance tuned for continent-sized countries would erase their whole shape.
  let finalGeometry;
  if (preSimplifyAreaKm2 < 100) {
    finalGeometry = cleanedGeometry;
  } else {
    let simplified;
    try {
      simplified = turf.simplify(
        { ...clipped, geometry: cleanedGeometry },
        { tolerance: 0.0006, highQuality: true }
      );
    } catch (e) {
      simplified = { geometry: cleanedGeometry };
    }
    finalGeometry = cleanGeometry(simplified.geometry);
  }
  if (!finalGeometry) continue;

  const areaKm2 = preSimplifyAreaKm2;

  const props = f.properties || {};
  const isoA2 = props.ISO_A2_EH && props.ISO_A2_EH !== "-99" ? props.ISO_A2_EH : null;

  out.push({
    type: "Feature",
    id: out.length,
    properties: {
      name: props.NAME || props.ADMIN || null,
      formalName: props.FORMAL_EN || props.NAME_LONG || props.NAME || null,
      isoA2,
      wikidata: props.WIKIDATAID || null,
      areaKm2: areaKm2 !== null ? Math.max(1, Math.round(areaKm2)) : null,
    },
    geometry: finalGeometry,
  });
}

const fc = { type: "FeatureCollection", features: out };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(fc));
console.log("Kept:", out.length, "features");
console.log("Output size (bytes):", fs.statSync(outputPath).size);
console.log("Wrote", outputPath);
