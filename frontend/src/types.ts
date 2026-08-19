import type { Feature, FeatureCollection, Geometry } from "geojson";

export interface BorderProperties {
  name: string | null;
  fromYear: number;
  toYear: number;
  wikipedia: string | null;
  wikidata: string | null;
  areaKm2: number | null;
  color?: string;
  /** Present-day (Natural Earth) features only: official name, shown in the info panel. */
  formalName?: string | null;
  /** Present-day (Natural Earth) features only: ISO 3166-1 alpha-2, for /api/subdivisions. */
  isoA2?: string | null;
  /** Disputed-territory features only: de facto control status, e.g. "Self admin.; Claimed by Ukraine". */
  status?: string | null;
}

export type BorderFeature = Feature<Geometry, BorderProperties>;
export type BorderFeatureCollection = FeatureCollection<Geometry, BorderProperties>;

export interface CompareProperties {
  name: string | null;
  subjectTo: string | null;
  partOf: string | null;
  borderPrecision: number | null;
}

export type CompareFeatureCollection = FeatureCollection<Geometry, CompareProperties>;

export interface SubdivisionProperties {
  name: string | null;
  type: string | null;
  isoCode: string | null;
  country: string | null;
  countryCode: string | null;
  wikidata: string | null;
}

export type SubdivisionFeatureCollection = FeatureCollection<Geometry, SubdivisionProperties>;

export interface YearRange {
  minYear: number;
  maxYear: number;
}

export interface EntityInfo {
  title: string | null;
  extract: string | null;
  thumbnailUrl: string | null;
  wikipediaUrl: string | null;
  inceptionYear: string | null;
  dissolvedYear: string | null;
}

export interface CompareResponse {
  snapshotYear: number;
  featureCollection: CompareFeatureCollection;
}
