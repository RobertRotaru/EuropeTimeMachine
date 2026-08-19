import { useCallback, useEffect, useState } from "react";
import MapView from "./components/MapView";
import TopBar from "./components/TopBar";
import InfoPanel from "./components/InfoPanel";
import {
  fetchBorders,
  fetchCompare,
  fetchDisputed,
  fetchEntity,
  fetchSubdivisions,
  fetchYearRange,
} from "./lib/api";
import type {
  BorderFeature,
  BorderFeatureCollection,
  CompareFeatureCollection,
  EntityInfo,
  SubdivisionFeatureCollection,
  YearRange,
} from "./types";

const INFO_PANEL_WIDTH = 360;
const COLLAPSED_PANEL_WIDTH = 44;
// Tailwind's default "sm" breakpoint is 640px -- below it, the info panel takes the full
// screen width when expanded (there's no room for it beside the map), so it starts collapsed
// on selection instead of immediately covering whatever the user just tapped.
const MOBILE_MEDIA_QUERY = "(max-width: 639px)";
// The dataset technically goes back further, but a linear slider spanning that whole range
// leaves almost no resolution for the last few centuries (where most user interest and data
// density is). Clamp the practical slider/input floor to 100 BCE; deeper antiquity is a
// possible future non-linear-slider enhancement, not attempted here.
const SLIDER_MIN_YEAR = -100;

export default function App() {
  const [yearRange, setYearRange] = useState<YearRange | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const [borders, setBorders] = useState<BorderFeatureCollection | null>(null);
  const [bordersLoading, setBordersLoading] = useState(false);
  const [bordersError, setBordersError] = useState<string | null>(null);
  const [disputed, setDisputed] = useState<BorderFeatureCollection | null>(null);

  const [showCompare, setShowCompare] = useState(false);
  const [compare, setCompare] = useState<CompareFeatureCollection | null>(null);
  const [compareSnapshotYear, setCompareSnapshotYear] = useState<number | null>(null);

  const [selectedFeature, setSelectedFeature] = useState<BorderFeature | null>(null);
  const [selectedSource, setSelectedSource] = useState<"borders" | "disputed" | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [entityInfo, setEntityInfo] = useState<EntityInfo | null>(null);
  const [entityLoading, setEntityLoading] = useState(false);
  const [subdivisions, setSubdivisions] = useState<SubdivisionFeatureCollection | null>(null);

  // Load the supported year range once, then default to the most recent year with data.
  useEffect(() => {
    fetchYearRange().then((r) => {
      setYearRange(r);
      setYear(r.maxYear);
    });
  }, []);

  // Fetch borders whenever the year changes, debounced so slider dragging doesn't flood requests.
  useEffect(() => {
    if (year === null) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setBordersLoading(true);
      setBordersError(null);
      fetchBorders(year, controller.signal)
        .then(setBorders)
        .catch((e: unknown) => {
          if (e instanceof Error && e.name !== "AbortError") {
            setBordersError("Could not load borders for this year.");
          }
        })
        .finally(() => setBordersLoading(false));
      // Present-day-only breakaway/disputed territories (Crimea, Transnistria, ...) that
      // render on top of the base country layer; /api/borders/disputed returns 204 for
      // historical years where this modern-specific nuance doesn't apply.
      fetchDisputed(year, controller.signal)
        .then(setDisputed)
        .catch(() => setDisputed(null));
    }, 150);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [year]);

  // Fetch the historical-basemaps comparison overlay only while it's toggled on.
  useEffect(() => {
    if (!showCompare || year === null) {
      setCompare(null);
      setCompareSnapshotYear(null);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetchCompare(year, controller.signal)
        .then((res) => {
          setCompare(res?.featureCollection ?? null);
          setCompareSnapshotYear(res?.snapshotYear ?? null);
        })
        .catch(() => {
          // Comparison overlay is best-effort; leave it blank on failure.
        });
    }, 150);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [showCompare, year]);

  const handleSelectFeature = useCallback((feature: BorderFeature, source: "borders" | "disputed") => {
    setSelectedFeature(feature);
    setSelectedSource(source);
    // Start collapsed on phone-sized screens so the panel doesn't immediately cover the
    // country the user just tapped; desktop has room to show it right away as before.
    setPanelExpanded(!window.matchMedia(MOBILE_MEDIA_QUERY).matches);
    setEntityInfo(null);
    setEntityLoading(true);
    fetchEntity(feature.properties.wikipedia, feature.properties.wikidata)
      .then(setEntityInfo)
      .catch(() => setEntityInfo(null))
      .finally(() => setEntityLoading(false));
  }, []);

  // Present-day-only administrative subdivisions for the clicked country. `isoA2` is only
  // populated on present-day (Natural Earth) features, so its presence is what actually
  // gates this -- no open dataset covers historical subdivisions.
  useEffect(() => {
    const iso = selectedFeature?.properties.isoA2;
    if (!iso) {
      setSubdivisions(null);
      return;
    }
    const controller = new AbortController();
    fetchSubdivisions(iso, controller.signal)
      .then(setSubdivisions)
      .catch(() => setSubdivisions(null));
    return () => controller.abort();
  }, [selectedFeature]);

  const closeInfoPanel = useCallback(() => {
    setSelectedFeature(null);
    setSelectedSource(null);
    setEntityInfo(null);
    setSubdivisions(null);
  }, []);

  const togglePanelExpanded = useCallback(() => {
    setPanelExpanded((v) => !v);
  }, []);

  if (yearRange === null || year === null) {
    return (
      <div className="flex h-full items-center justify-center text-lg text-text-dim">
        Loading Europe Time Machine…
      </div>
    );
  }

  const sliderMinYear = Math.max(yearRange.minYear, SLIDER_MIN_YEAR);

  const isPresentDayFeature = selectedFeature !== null && selectedFeature.properties.toYear >= yearRange.maxYear;
  const subdivisionNote = selectedFeature
    ? selectedFeature.properties.isoA2
      ? subdivisions === null
        ? "No subdivision data available for this country."
        : null
      : isPresentDayFeature
        ? "No subdivision data available for this territory."
        : "Administrative subdivisions are only available for the present day — no open dataset covers historical subdivisions."
    : null;

  return (
    <div className="flex h-full flex-col">
      <TopBar
        year={year}
        minYear={sliderMinYear}
        maxYear={yearRange.maxYear}
        onYearChange={setYear}
        showCompare={showCompare}
        onToggleCompare={setShowCompare}
        compareSnapshotYear={compareSnapshotYear}
      />
      <div className="relative flex-1 overflow-hidden">
        <MapView
          borders={borders}
          disputed={disputed}
          compare={compare}
          showCompare={showCompare}
          subdivisions={subdivisions}
          selected={
            selectedFeature && selectedSource
              ? { id: selectedFeature.id ?? null, source: selectedSource }
              : null
          }
          onSelectFeature={handleSelectFeature}
          infoPanelOpen={selectedFeature !== null}
          rightPaddingPx={
            selectedFeature === null ? 0 : panelExpanded ? INFO_PANEL_WIDTH : COLLAPSED_PANEL_WIDTH
          }
        />
        {bordersLoading && (
          <div className="absolute top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full border border-panel-border bg-panel/90 px-3.5 py-1.5 text-sm text-text-dim">
            Loading borders…
          </div>
        )}
        {bordersError && (
          <div className="absolute top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-red-900/90 px-3.5 py-1.5 text-sm text-red-100">
            {bordersError}
          </div>
        )}
        <InfoPanel
          feature={selectedFeature}
          info={entityInfo}
          loading={entityLoading}
          onClose={closeInfoPanel}
          subdivisionNote={subdivisionNote}
          expanded={panelExpanded}
          onToggleExpand={togglePanelExpanded}
        />
      </div>
    </div>
  );
}
