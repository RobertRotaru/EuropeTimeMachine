import type {
  BorderFeatureCollection,
  CompareResponse,
  EntityInfo,
  SubdivisionFeatureCollection,
  YearRange,
} from "../types";

// Unset locally: falls back to the relative "/api" path, which vite.config.ts's dev proxy
// forwards to localhost:8080. In production (no dev server / no proxy), set this to the
// deployed backend's full URL, e.g. https://europetimemachine-backend.onrender.com/api.
const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

export function fetchYearRange(): Promise<YearRange> {
  return getJson(`${BASE}/years/range`);
}

export function fetchBorders(year: number, signal?: AbortSignal): Promise<BorderFeatureCollection> {
  return getJson(`${BASE}/borders?year=${year}`, signal);
}

export async function fetchDisputed(
  year: number,
  signal?: AbortSignal
): Promise<BorderFeatureCollection | null> {
  const res = await fetch(`${BASE}/borders/disputed?year=${year}`, { signal });
  if (res.status === 204) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): borders/disputed`);
  }
  return res.json();
}

export async function fetchCompare(year: number, signal?: AbortSignal): Promise<CompareResponse | null> {
  const res = await fetch(`${BASE}/borders/compare?year=${year}`, { signal });
  if (res.status === 204) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): borders/compare`);
  }
  return res.json();
}

export function fetchEntity(wikipedia: string | null, wikidata: string | null): Promise<EntityInfo> {
  const params = new URLSearchParams();
  if (wikipedia) params.set("wikipedia", wikipedia);
  if (wikidata) params.set("wikidata", wikidata);
  return getJson(`${BASE}/entity?${params.toString()}`);
}

export async function fetchSubdivisions(
  countryCode: string,
  signal?: AbortSignal
): Promise<SubdivisionFeatureCollection | null> {
  const res = await fetch(`${BASE}/subdivisions?countryCode=${countryCode}`, { signal });
  if (res.status === 204) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): subdivisions`);
  }
  return res.json();
}
