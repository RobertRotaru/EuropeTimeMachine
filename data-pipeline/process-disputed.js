// One-time preprocessing: extract present-day disputed/breakaway territories relevant to
// Europe and the Caucasus from Natural Earth's admin-0 disputed areas dataset. The base
// present-day country layer (process-present-day.js) shows internationally-recognized (de
// jure) borders, e.g. Crimea as part of Ukraine -- this produces a second, separately
// rendered layer for actual on-the-ground control, so e.g. Crimea and the Donetsk/Luhansk
// "People's Republics" show as their own distinctly colored/labeled regions rather than
// silently vanishing into Ukraine's territory.
// Run with: node process-disputed.js
const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");
const { cleanGeometry } = require("./geometry-utils");

// Keyed by the dataset's BRK_NAME. Artsakh (Nagorno-Karabakh Republic) is deliberately
// excluded: it dissolved itself in January 2024 after Azerbaijan retook the region in
// September 2023, which this dataset (last major disputed-areas update predates that) does
// not yet reflect -- including it would show a political entity that no longer exists.
const INCLUDE = new Set([
  "Crimea",
  "Donetsk People's Republic",
  "Luhansk People's Republic",
  "N. Cyprus",
  "Transnistria",
  "Abkhazia",
  "South Ossetia",
]);

const EUROPE_BBOX = [-25, 34, 45, 72];

const inputPath = path.join(
  __dirname,
  "..",
  "backend",
  "data-cache",
  "raw",
  "natural-earth",
  "ne_10m_admin_0_disputed_areas.geojson"
);
const outputPath = path.join(
  __dirname,
  "..",
  "backend",
  "data-cache",
  "processed",
  "disputed-territories-europe.geojson"
);

const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
console.log("Input features:", data.features.length);

const out = [];

for (const f of data.features) {
  const props = f.properties || {};
  if (!INCLUDE.has(props.BRK_NAME)) continue;
  if (!f.geometry) continue;

  let clipped;
  try {
    clipped = turf.bboxClip(f, EUROPE_BBOX);
  } catch (e) {
    continue;
  }
  const cleanedGeometry = cleanGeometry(clipped.geometry);
  if (!cleanedGeometry) continue;

  let areaKm2;
  try {
    areaKm2 = turf.area({ type: "Feature", properties: {}, geometry: cleanedGeometry }) / 1e6;
  } catch (e) {
    areaKm2 = null;
  }

  out.push({
    type: "Feature",
    id: out.length,
    properties: {
      name: props.BRK_NAME,
      // e.g. "Self admin.; Claimed by Ukraine" -- shown in the info panel so the status
      // (not just the shape) is explicit.
      status: props.NOTE_BRK || props.NOTE_ADM0 || null,
      wikidata: props.WIKIDATAID || null,
      areaKm2: areaKm2 !== null ? Math.max(1, Math.round(areaKm2)) : null,
    },
    geometry: cleanedGeometry,
  });
}

const fc = { type: "FeatureCollection", features: out };
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(fc));
console.log(
  "Kept:",
  out.length,
  "of",
  INCLUDE.size,
  "expected:",
  out.map((f) => f.properties.name).join(", ")
);
console.log("Output size (bytes):", fs.statSync(outputPath).size);
console.log("Wrote", outputPath);
