// One-time preprocessing: clip Natural Earth's 10m land polygons (much higher fidelity
// coastlines than the 110m dataset originally used) to the Europe bounding box, with light
// simplification, for the frontend's coastline basemap layer.
// Run with: node process-land.js
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
  "ne_10m_land.geojson"
);
const outputPath = path.join(
  __dirname,
  "..",
  "frontend",
  "public",
  "basemap",
  "ne_10m_land.geojson"
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

  let simplified;
  try {
    simplified = turf.simplify(
      { ...clipped, geometry: cleanedGeometry },
      { tolerance: 0.0008, highQuality: true }
    );
  } catch (e) {
    simplified = { geometry: cleanedGeometry };
  }
  const finalGeometry = cleanGeometry(simplified.geometry);
  if (!finalGeometry) continue;

  out.push({ type: "Feature", id: out.length, properties: {}, geometry: finalGeometry });
}

const fc = { type: "FeatureCollection", features: out };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(fc));
console.log("Kept:", out.length, "features");
console.log("Output size (bytes):", fs.statSync(outputPath).size);
console.log("Wrote", outputPath);
