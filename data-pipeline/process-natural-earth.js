// One-time preprocessing: filter Natural Earth admin-1 states/provinces to those
// overlapping Europe, simplify geometry, and group by ISO 3166-1 alpha-2 country code
// for the backend's /api/subdivisions endpoint (present-day years only).
// Run with: node process-natural-earth.js
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
  "ne_10m_admin_1_states_provinces.geojson"
);
const outputPath = path.join(
  __dirname,
  "..",
  "backend",
  "data-cache",
  "processed",
  "subdivisions-europe.json"
);

const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
console.log("Input features:", data.features.length);

const byCountry = {};
let kept = 0;

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

  const p = f.properties || {};
  const iso = p.iso_a2;
  if (!iso || iso === "-99") continue;

  const cleanedInputGeometry = cleanGeometry(f.geometry);
  if (!cleanedInputGeometry) continue;
  const preSimplifyAreaKm2 =
    turf.area({ type: "Feature", properties: {}, geometry: cleanedInputGeometry }) / 1e6;

  // The old fixed tolerance (0.01 degrees, ~1.1km) is bigger than some entire subdivisions
  // in small countries (Malta's local councils, San Marino's castelli), collapsing them into
  // crude 3-4 point triangles. Scale tolerance down for small features, and skip
  // simplification entirely below 300 km² -- there's no meaningful point budget to save on
  // something that small anyway.
  let finalGeometry;
  if (preSimplifyAreaKm2 < 300) {
    finalGeometry = cleanedInputGeometry;
  } else {
    let simplified;
    try {
      simplified = turf.simplify(
        { ...f, geometry: cleanedInputGeometry },
        { tolerance: 0.003, highQuality: true }
      );
    } catch (e) {
      simplified = { geometry: cleanedInputGeometry };
    }
    finalGeometry = cleanGeometry(simplified.geometry);
  }
  if (!finalGeometry) continue;

  const list = (byCountry[iso] = byCountry[iso] || []);
  list.push({
    type: "Feature",
    id: list.length,
    properties: {
      name: p.name,
      type: p.type_en || p.type || null,
      isoCode: p.iso_3166_2 || null,
      country: p.admin || null,
      countryCode: iso,
      wikidata: p.wikidataid || null,
    },
    geometry: finalGeometry,
  });
  kept++;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(byCountry));
console.log("Kept:", kept, "features across", Object.keys(byCountry).length, "countries");
console.log("Output size (bytes):", fs.statSync(outputPath).size);
console.log("Wrote", outputPath);
