# Europe Time Machine

An interactive map of Europe's political borders from 100 BCE to today. Slide the year, click a
country to zoom in and read about it, and compare the primary dataset against a second
historical-borders source.

- **Borders**: [Cliopatria / Seshat Global History Databank](https://github.com/Seshat-Global-History-Databank/cliopatria) (CC-BY-4.0) for historical years; [Natural Earth](https://www.naturalearthdata.com/) 10m admin-0 countries for the present day (real survey-grade precision, including microstates Cliopatria omits).
- **Disputed territories**: Natural Earth's admin-0 disputed areas dataset (Crimea, Donetsk/Luhansk, Transnistria, Abkhazia, South Ossetia, Northern Cyprus), rendered as a distinct layer.
- **Subdivisions**: Natural Earth 10m admin-1 (present-day years only — no open dataset covers historical subdivisions).
- **Comparison overlay**: [historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0).
- **Entity info**: live Wikipedia + Wikidata lookups.

## Project layout

```
backend/         Spring Boot 4.1 (Java 21), Maven. Serves GeoJSON + entity info over REST.
frontend/        React + TypeScript + Vite + MapLibre GL JS + Tailwind CSS.
data-pipeline/   One-off Node scripts that fetch + clip + simplify the raw datasets into
                 backend/data-cache/processed/, which the backend loads at startup.
```

## Local development

Requires Java 21, Node 22+, and Maven (or use the bundled `backend/mvnw` wrapper).

```bash
# Backend (from backend/)
./mvnw spring-boot:run          # http://localhost:8080

# Frontend (from frontend/, separate terminal)
npm install
npm run dev                     # http://localhost:5173, proxies /api to :8080
```

`backend/data-cache/processed/` is committed to the repo, so the backend runs out of the box.
If you want to regenerate it from fresh source data, see `data-pipeline/` (each `process-*.js`
script documents the raw file it expects in `backend/data-cache/raw/`).

## Deploying for free (Render + Vercel)

The backend has no database — everything is static, preprocessed GeoJSON loaded from disk — so
this is just two services: a Docker web service on Render, and a static site on Vercel.

### 1. Push to GitHub

If you're starting from this checkout: `git init`, `git remote add origin <your-repo-url>`,
`git add -A`, `git commit -m "Initial commit"`, `git push -u origin main`.

### 2. Backend → Render

1. [render.com](https://render.com) → New → **Blueprint** → connect this GitHub repo. Render
   reads `render.yaml` at the repo root and configures the service automatically (Docker build
   from `backend/Dockerfile`, free plan, health check at `/api/years/range`).
2. Before the first deploy finishes, or any time after, go to the service's **Environment** tab
   and set `APP_CORS_ALLOWED_ORIGINS`. You won't have the Vercel URL yet on the very first pass —
   set it to `http://localhost:5173` for now and come back to step 4.
3. Deploy. **First build will take a few minutes** (Maven dependency download + the ~44MB
   Cliopatria dataset baked into the image). Note the service's public URL, e.g.
   `https://europetimemachine-backend.onrender.com`.
4. **Free-tier caveats worth knowing up front:**
   - The service spins down after 15 minutes of no traffic; the next request pays a ~30-60s
     cold-start penalty while it spins back up. Fine for a demo/portfolio project, not for
     something latency-sensitive.
   - Free plan is 512MB RAM. This app parses ~60MB of GeoJSON into memory at startup; the
     Dockerfile uses `-XX:MaxRAMPercentage=75` so the JVM sizes itself to whatever it's given,
     but if the service crashes/restarts repeatedly after deploy, check the logs for an OOM —
     that's the free-tier ceiling being hit, not a bug in the app.

### 3. Frontend → Vercel

1. [vercel.com](https://vercel.com) → New Project → import the same GitHub repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects the Vite preset (build command
   `npm run build`, output `dist`) — no other build settings needed.
3. Add an environment variable: `VITE_API_URL` = `https://<your-render-url>/api` (the URL from
   step 2.3, with `/api` appended).
4. Deploy. Note the resulting URL, e.g. `https://europe-time-machine.vercel.app`.

### 4. Close the loop: update backend CORS with the real frontend URL

Back in Render → your service → Environment → set `APP_CORS_ALLOWED_ORIGINS` to your actual
Vercel URL (comma-separate multiple values if needed, e.g. to also keep `http://localhost:5173`
for local dev against the deployed backend):

```
https://europe-time-machine.vercel.app,http://localhost:5173
```

Render redeploys automatically on env var changes. That's it — both services are now live and
talking to each other.

### Why CORS matters here

Once the frontend (`*.vercel.app`) and backend (`*.onrender.com`) are on different domains,
every `/api/*` call from the browser is cross-origin, and the backend must explicitly allow it
or the browser blocks the response. That's what `APP_CORS_ALLOWED_ORIGINS` /
`CorsConfig.java` (`allowedOriginPatterns`, supporting wildcards like `https://*.vercel.app` for
preview deployments) is for — set it to wherever the frontend actually lives.
