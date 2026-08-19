// maplibre-gl-worker.mjs imports a sibling maplibre-gl-shared.mjs via a relative path, and
// Vite's bundler has no reliable way to detect and co-locate that dependency when the worker
// is constructed dynamically inside the library (see src/components/MapView.tsx). Instead we
// serve both pre-built files verbatim as static assets, so the relative import between them
// still resolves at runtime. Re-run after every `npm install` (wired up as "postinstall").
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "..", "node_modules", "maplibre-gl", "dist");
const destDir = join(__dirname, "..", "public", "maplibre");

mkdirSync(destDir, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(srcDir, file), join(destDir, file));
}
console.log("Copied maplibre-gl worker + shared chunk to public/maplibre/");
