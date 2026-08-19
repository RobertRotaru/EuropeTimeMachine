import { yearLabel } from "../lib/geo";
import Logo from "./Logo";

interface TopBarProps {
  year: number;
  minYear: number;
  maxYear: number;
  onYearChange: (year: number) => void;
  showCompare: boolean;
  onToggleCompare: (value: boolean) => void;
  compareSnapshotYear: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function TopBar({
  year,
  minYear,
  maxYear,
  onYearChange,
  showCompare,
  onToggleCompare,
  compareSnapshotYear,
}: TopBarProps) {
  return (
    <header className="z-10 flex flex-wrap items-center gap-6 border-b border-panel-border bg-panel px-5 py-2.5">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Logo className="h-7 w-7 shrink-0" />
        <span className="text-base font-semibold tracking-wide">Europe Time Machine</span>
      </div>

      <div className="flex min-w-[260px] flex-1 items-center gap-3">
        <input
          type="number"
          data-testid="year-input"
          className="w-[6.5em] rounded border border-panel-border bg-bg px-1.5 py-1 text-sm text-text"
          value={year}
          min={minYear}
          max={maxYear}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) onYearChange(clamp(v, minYear, maxYear));
          }}
        />
        <input
          type="range"
          data-testid="year-slider"
          className="flex-1 accent-accent"
          min={minYear}
          max={maxYear}
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
        />
        <span className="min-w-[6.5em] text-right text-text-dim tabular-nums">
          {yearLabel(year)}
        </span>
      </div>

      <label className="flex items-center gap-2 text-sm whitespace-nowrap text-text-dim">
        <input
          type="checkbox"
          data-testid="compare-toggle"
          checked={showCompare}
          onChange={(e) => onToggleCompare(e.target.checked)}
        />
        Compare with historical-basemaps
        {showCompare && compareSnapshotYear !== null ? ` (shown: ${yearLabel(compareSnapshotYear)})` : ""}
      </label>
    </header>
  );
}
