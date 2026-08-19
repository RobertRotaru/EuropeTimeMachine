import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  AttributionControl,
  setWorkerUrl,
  type StyleSpecification,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// maplibre-gl-worker.mjs imports a sibling maplibre-gl-shared.mjs via a relative path, and
// Vite's bundler doesn't know to co-locate that dependency when the worker is pulled in
// implicitly. Both files are copied verbatim (see public/maplibre/) and served as static
// assets so the relative import between them still resolves, and we point maplibre-gl at
// them explicitly before creating any Map.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
import type {
  BorderFeature,
  BorderFeatureCollection,
  CompareFeatureCollection,
  SubdivisionFeatureCollection,
} from "../types";
import { colorForEntity } from "../lib/colors";
import { boundsOfGeometry } from "../lib/geo";
import { computeLabelPoints } from "../lib/labels";

const EMPTY_FC = { type: "FeatureCollection" as const, features: [] };

type SelectionSource = "borders" | "disputed";

function withEntityColors(fc: BorderFeatureCollection | null): BorderFeatureCollection {
  if (!fc) return EMPTY_FC;
  return {
    ...fc,
    features: fc.features.map((f) => ({
      ...f,
      properties: { ...f.properties, color: colorForEntity(f.properties.wikidata, f.properties.name) },
    })),
  };
}

function labelsFor(fc: BorderFeatureCollection | null) {
  return { type: "FeatureCollection" as const, features: fc ? computeLabelPoints(fc) : [] };
}

const STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "ocean",
      type: "background",
      paint: { "background-color": "#0d2137" },
    },
  ],
};

interface MapViewProps {
  borders: BorderFeatureCollection | null;
  disputed: BorderFeatureCollection | null;
  compare: CompareFeatureCollection | null;
  showCompare: boolean;
  subdivisions: SubdivisionFeatureCollection | null;
  selected: { id: number | string | null; source: SelectionSource } | null;
  onSelectFeature: (feature: BorderFeature, source: SelectionSource) => void;
  infoPanelOpen: boolean;
  rightPaddingPx: number;
}

export default function MapView({
  borders,
  disputed,
  compare,
  showCompare,
  subdivisions,
  selected,
  onSelectFeature,
  infoPanelOpen,
  rightPaddingPx,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelectFeature);
  onSelectRef.current = onSelectFeature;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE,
      center: [15, 50],
      zoom: 3.4,
      minZoom: 2,
      // High enough to actually zoom into micro-states like Vatican City (~0.44 km²) --
      // the old cap of 10 left them a few invisible, unclickable pixels across forever.
      maxZoom: 18,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on("error", (e) => console.error("[maplibre error]", e.error?.message));
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");
    map.addControl(
      new AttributionControl({
        customAttribution:
          "Borders: Cliopatria / Seshat (CC-BY-4.0) · Disputed areas: Natural Earth · Compare: historical-basemaps (GPL-3.0) · Subdivisions: Natural Earth · Coastline: Natural Earth",
      })
    );

    map.on("load", () => {
      map.addSource("land", { type: "geojson", data: "/basemap/ne_10m_land.geojson" });
      map.addLayer({
        id: "land-fill",
        type: "fill",
        source: "land",
        paint: { "fill-color": "#1c2b3a", "fill-opacity": 1 },
      });

      map.addSource("borders", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "borders-fill",
        type: "fill",
        source: "borders",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.85,
            0.65,
          ],
        },
      });
      map.addLayer({
        id: "borders-line",
        type: "line",
        source: "borders",
        paint: {
          "line-color": "#0b0b0b",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.5,
            0.6,
          ],
          "line-opacity": 0.8,
        },
      });
      map.addSource("borders-labels", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "borders-label",
        type: "symbol",
        source: "borders-labels",
        layout: {
          "text-field": ["get", "labelName"],
          "text-size": 12,
          "text-font": ["Noto Sans Regular"],
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#f5f0e6",
          "text-halo-color": "#000000",
          "text-halo-width": 1.2,
        },
      });

      // Present-day breakaway/disputed territories (Crimea, Transnistria, ...) -- deliberately
      // added after the base border layers so they always render on top of whichever country
      // holds them de jure, with a dashed amber outline marking them as contested rather than
      // an ordinary border.
      map.addSource("disputed", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "disputed-fill",
        type: "fill",
        source: "disputed",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.9,
            0.75,
          ],
        },
      });
      map.addLayer({
        id: "disputed-line",
        type: "line",
        source: "disputed",
        paint: {
          "line-color": "#ffb703",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            3,
            1.5,
          ],
          "line-dasharray": [2, 1.5],
        },
      });
      map.addSource("disputed-labels", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "disputed-label",
        type: "symbol",
        source: "disputed-labels",
        layout: {
          "text-field": ["get", "labelName"],
          "text-size": 11,
          "text-font": ["Noto Sans Regular"],
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#fff3d6",
          "text-halo-color": "#000000",
          "text-halo-width": 1.2,
        },
      });

      map.addSource("compare", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "compare-line",
        type: "line",
        source: "compare",
        layout: { visibility: "none" },
        paint: {
          "line-color": "#ffb703",
          "line-width": 1.5,
          "line-dasharray": [2, 2],
        },
      });

      map.addSource("subdivisions", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "subdivisions-line",
        type: "line",
        source: "subdivisions",
        paint: { "line-color": "#ffffff", "line-width": 1, "line-dasharray": [1, 1.5] },
      });
      map.addLayer({
        id: "subdivisions-label",
        type: "symbol",
        source: "subdivisions",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-font": ["Noto Sans Regular"],
        },
        paint: {
          "text-color": "#dfe7ef",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
      });

      // A single click handler across both clickable fill layers, topmost feature wins --
      // two independent per-layer listeners would both fire when a disputed territory sits
      // exactly on top of its de jure country, double-selecting the same click.
      map.on("click", (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ["disputed-fill", "borders-fill"] });
        const hit = hits[0];
        if (!hit) return;
        const source: SelectionSource = hit.layer.id === "disputed-fill" ? "disputed" : "borders";
        onSelectRef.current(hit as unknown as BorderFeature, source);
      });
      map.on("mousemove", (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ["disputed-fill", "borders-fill"] });
        map.getCanvas().style.cursor = hits.length > 0 ? "pointer" : "";
      });

      loadedRef.current = true;
      applyData();
    });

    function applyData() {
      if (!loadedRef.current) return;
      (map.getSource("borders") as GeoJSONSource | undefined)?.setData(withEntityColors(borders));
      (map.getSource("borders-labels") as GeoJSONSource | undefined)?.setData(labelsFor(borders));
      (map.getSource("disputed") as GeoJSONSource | undefined)?.setData(withEntityColors(disputed));
      (map.getSource("disputed-labels") as GeoJSONSource | undefined)?.setData(labelsFor(disputed));
      (map.getSource("compare") as GeoJSONSource | undefined)?.setData(compare ?? EMPTY_FC);
      (map.getSource("subdivisions") as GeoJSONSource | undefined)?.setData(
        subdivisions ?? EMPTY_FC
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    (map.getSource("borders") as GeoJSONSource | undefined)?.setData(withEntityColors(borders));
    (map.getSource("borders-labels") as GeoJSONSource | undefined)?.setData(labelsFor(borders));
  }, [borders]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    (map.getSource("disputed") as GeoJSONSource | undefined)?.setData(withEntityColors(disputed));
    (map.getSource("disputed-labels") as GeoJSONSource | undefined)?.setData(labelsFor(disputed));
  }, [disputed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    (map.getSource("compare") as GeoJSONSource | undefined)?.setData(compare ?? EMPTY_FC);
  }, [compare]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("compare-line")) return;
    map.setLayoutProperty("compare-line", "visibility", showCompare ? "visible" : "none");
  }, [showCompare]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    (map.getSource("subdivisions") as GeoJSONSource | undefined)?.setData(
      subdivisions ?? EMPTY_FC
    );
  }, [subdivisions]);

  const prevSelected = useRef<{ id: number | string; source: SelectionSource } | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    if (prevSelected.current !== null) {
      map.setFeatureState(
        { source: prevSelected.current.source, id: prevSelected.current.id },
        { selected: false }
      );
    }
    if (selected !== null && selected.id !== null) {
      map.setFeatureState({ source: selected.source, id: selected.id }, { selected: true });
      const collection = selected.source === "disputed" ? disputed : borders;
      const feature = collection?.features.find((f) => f.id === selected.id);
      if (feature) {
        const bounds = boundsOfGeometry(feature.geometry);
        map.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 60, right: rightPaddingPx + 60 },
          duration: 900,
          // A ceiling, not a floor -- large countries settle at a much lower zoom on their
          // own. Without a high ceiling here, clicking a micro-state like Vatican City just
          // centers on it at a middling zoom where it's a few invisible pixels.
          maxZoom: 16,
        });
      }
      prevSelected.current = { id: selected.id, source: selected.source };
    } else {
      prevSelected.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Keep the map correctly sized as the info panel opens/closes and changes its width.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => map.resize(), 260);
    return () => window.clearTimeout(id);
  }, [infoPanelOpen]);

  return <div ref={containerRef} className="!absolute !inset-0" />;
}
