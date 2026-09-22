# Europe Time Machine

**🌍 Live demo: [europe-time-machine.vercel.app](https://europe-time-machine.vercel.app)**

React app for viewing the borders of Europe through-out the years.

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
backend/         Spring Boot 4.1 (Java 21), Maven. Serves GeoJSON + entity info over REST. <br>
frontend/        React + TypeScript + Vite + MapLibre GL JS + Tailwind CSS. <br>
data-pipeline/   One-off Node scripts that fetch + clip + simplify the raw datasets into <br>
                 backend/data-cache/processed/, which the backend loads at startup. <br>
```
