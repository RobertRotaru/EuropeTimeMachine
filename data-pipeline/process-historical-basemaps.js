// One-time preprocessing: clip each historical-basemaps yearly snapshot to the Europe
// bounding box, simplify geometry, and merge all years into one index file the backend
// loads for the "compare" overlay.
// Run with: node process-historical-basemaps.js
const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");
const { cleanGeometry } = require("./geometry-utils");

const EUROPE_BBOX = [-25, 34, 45, 72];

const rawDir = path.join(
  __dirname,
  "..",
  "backend",
  "data-cache",
  "raw",
  "historical-basemaps"
);
const outputPath = path.join(
  __dirname,
  "..",
  "backend",
  "data-cache",
  "processed",
  "historical-basemaps-europe.json"
);

const index = JSON.parse(fs.readFileSync(path.join(rawDir, "index.json"), "utf8"));
const entries = index.years.filter((y) => y.year >= -1000);

const byYear = {};

for (const entry of entries) {
  const filePath = path.join(rawDir, entry.filename);
  if (!fs.existsSync(filePath)) {
    console.warn("Missing file, skipping:", entry.filename);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
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
    clipped = { ...clipped, geometry: cleanedGeometry };

    let simplified;
    try {
      simplified = turf.simplify(clipped, { tolerance: 0.002, highQuality: true });
    } catch (e) {
      simplified = clipped;
    }

    const finalGeometry = cleanGeometry(simplified.geometry);
    if (!finalGeometry) continue;

    const props = f.properties || {};
    out.push({
      type: "Feature",
      id: out.length,
      properties: {
        name: props.NAME || props.ABBREVN || null,
        subjectTo: props.SUBJECTO || null,
        partOf: props.PARTOF || null,
        borderPrecision: props.BORDERPRECISION ?? null,
      },
      geometry: finalGeometry,
    });
  }

  byYear[String(entry.year)] = { type: "FeatureCollection", features: out };
  console.log(entry.year, "->", out.length, "features (of", data.features.length, ")");
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(byYear));
console.log("Output size (bytes):", fs.statSync(outputPath).size);
console.log("Wrote", outputPath);
