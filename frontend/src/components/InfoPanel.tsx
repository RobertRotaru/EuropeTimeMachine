import type { BorderFeature, EntityInfo } from "../types";
import { yearLabel } from "../lib/geo";

interface InfoPanelProps {
  feature: BorderFeature | null;
  info: EntityInfo | null;
  loading: boolean;
  onClose: () => void;
  subdivisionNote: string | null;
}

export default function InfoPanel({ feature, info, loading, onClose, subdivisionNote }: InfoPanelProps) {
  if (!feature) return null;
  const props = feature.properties;

  return (
    <aside className="absolute inset-y-0 right-0 z-20 w-[360px] max-w-[90vw] overflow-y-auto border-l border-panel-border bg-panel px-5 pt-11 pb-6 shadow-[-8px_0_24px_rgba(0,0,0,0.35)]">
      <button
        onClick={onClose}
        aria-label="Close panel"
        className="absolute top-2.5 right-3 text-2xl leading-none text-text-dim hover:text-text"
      >
        ×
      </button>
      <h2 className="mb-1 text-xl font-semibold">
        {props.formalName || info?.title || props.name || "Unknown entity"}
      </h2>
      {props.formalName && props.name && props.formalName !== props.name && (
        <p className="mb-1 text-sm text-text-dim">{props.name}</p>
      )}
      <p className="mb-2 text-sm tabular-nums text-accent">
        {yearLabel(props.fromYear)} – {yearLabel(props.toYear)}
      </p>

      {props.status && (
        <p className="mb-4 inline-block rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs text-amber-200">
          {props.status}
        </p>
      )}

      {loading && <p className="text-text-dim">Loading…</p>}

      {info?.thumbnailUrl && (
        <img
          className="mb-3 max-h-[200px] w-full rounded-md object-cover"
          src={info.thumbnailUrl}
          alt={info.title ?? ""}
        />
      )}

      {info?.extract && <p className="mb-4 text-[0.92rem] leading-relaxed text-text">{info.extract}</p>}

      {(props.areaKm2 != null || info?.inceptionYear || info?.dissolvedYear) && (
        <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {props.areaKm2 != null && (
            <>
              <dt className="text-text-dim">Area (this year)</dt>
              <dd>{props.areaKm2.toLocaleString()} km²</dd>
            </>
          )}
          {info?.inceptionYear && (
            <>
              <dt className="text-text-dim">Founded</dt>
              <dd>{info.inceptionYear}</dd>
            </>
          )}
          {info?.dissolvedYear && (
            <>
              <dt className="text-text-dim">Dissolved</dt>
              <dd>{info.dissolvedYear}</dd>
            </>
          )}
        </dl>
      )}

      {subdivisionNote && (
        <p className="mb-4 border-l-2 border-panel-border pl-2.5 text-sm text-text-dim italic">
          {subdivisionNote}
        </p>
      )}

      {info?.wikipediaUrl && (
        <a
          className="mb-5 inline-block text-sm text-accent hover:underline"
          href={info.wikipediaUrl}
          target="_blank"
          rel="noreferrer"
        >
          Read more on Wikipedia →
        </a>
      )}

      <p className="border-t border-panel-border pt-2.5 text-xs text-text-dim">
        Source:{" "}
        {props.status
          ? "Natural Earth admin-0 disputed areas"
          : props.isoA2 || props.formalName
            ? "Natural Earth admin-0 countries (10m)"
            : "Cliopatria / Seshat Global History Databank (CC-BY-4.0)"}
      </p>
    </aside>
  );
}
