/**
 * Deterministic per-entity color: hashes the entity's Wikidata id (falling back to its
 * name) into a fixed hue/saturation/lightness, so the same civilization keeps the same
 * color across years, and re-fetching a year's borders never reshuffles the palette.
 */
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function colorForEntity(wikidata: string | null, name: string | null): string {
  const key = wikidata || name || "unknown";
  const hash = hashString(key);
  const hue = hash % 360;
  const saturation = 50 + ((hash >>> 8) % 25); // 50-74%
  const lightness = 38 + ((hash >>> 16) % 16); // 38-53%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
