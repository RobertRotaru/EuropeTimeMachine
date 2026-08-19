// One-time preprocessing: clip Cliopatria polities to the Europe bounding box,
// simplify geometry, and slim down properties to what the backend actually serves.
// Run with: node process-cliopatria.js
const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");
const { cleanGeometry } = require("./geometry-utils");

const EUROPE_BBOX = [-25, 34, 45, 72]; // [minX, minY, maxX, maxY]

const inputPath = path.join(
  __dirname,
  "..",
  "backend",
  "data-cache",
  "raw",
  "cliopatria_polities_only.geojson"
);
const outputPath = path.join(
  __dirname,
  "..",
  "backend",
  "data-cache",
  "processed",
  "cliopatria-europe.geojson"
);

console.log("Reading", inputPath);
const raw = fs.readFileSync(inputPath, "utf8");
const data = JSON.parse(raw);
console.log("Input features:", data.features.length);

const out = [];
let skippedNoOverlap = 0;
let skippedError = 0;

for (let i = 0; i < data.features.length; i++) {
  const f = data.features[i];
  const props = f.properties || {};
  if (props.Type && props.Type !== "POLITY") continue;

  const featureBbox = turf.bbox(f);
  const [minX, minY, maxX, maxY] = featureBbox;
  const overlaps =
    minX <= EUROPE_BBOX[2] &&
    maxX >= EUROPE_BBOX[0] &&
    minY <= EUROPE_BBOX[3] &&
    maxY >= EUROPE_BBOX[1];
  if (!overlaps) {
    skippedNoOverlap++;
    continue;
  }

  let clipped;
  try {
    clipped = turf.bboxClip(f, EUROPE_BBOX);
  } catch (e) {
    skippedError++;
    continue;
  }
  const cleanedGeometry = cleanGeometry(clipped.geometry);
  if (!cleanedGeometry) {
    skippedNoOverlap++;
    continue;
  }
  clipped = { ...clipped, geometry: cleanedGeometry };

  let simplified;
  try {
    simplified = turf.simplify(clipped, { tolerance: 0.0015, highQuality: true });
  } catch (e) {
    simplified = clipped;
  }

  // Simplification can itself collapse a ring below 4 points, so clean once more.
  const finalGeometry = cleanGeometry(simplified.geometry);
  if (!finalGeometry) {
    skippedNoOverlap++;
    continue;
  }

  let clippedAreaKm2;
  try {
    clippedAreaKm2 = turf.area({ type: "Feature", properties: {}, geometry: finalGeometry }) / 1e6;
  } catch (e) {
    clippedAreaKm2 = null;
  }
  if (clippedAreaKm2 !== null && clippedAreaKm2 < 3) {
    skippedNoOverlap++;
    continue;
  }

  out.push({
    type: "Feature",
    id: out.length,
    properties: {
      name: props.Name,
      fromYear: props.FromYear,
      toYear: props.ToYear,
      wikipedia: props.Wikipedia || null,
      wikidata: props.Wikidata || null,
      // Cliopatria's own `Area` property is the polity's *entire* (often worldwide) extent
      // -- e.g. colonial empires or Cold War superpowers whose only presence within our
      // Europe bbox is a small fragment (a Berlin occupation sector, an overseas holding).
      // Using that figure here would show something like "10,148,911 km²" for a sliver the
      // size of a city district, so area is recomputed from the actual clipped geometry.
      areaKm2: clippedAreaKm2 !== null ? Math.round(clippedAreaKm2) : null,
    },
    geometry: finalGeometry,
  });
}

const fc = { type: "FeatureCollection", features: out };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(fc));

console.log("Kept:", out.length, "Skipped (no overlap):", skippedNoOverlap, "Skipped (error):", skippedError);
console.log("Output size (bytes):", fs.statSync(outputPath).size);
console.log("Wrote", outputPath);
