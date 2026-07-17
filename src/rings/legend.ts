import type { Ring } from "./types";

export interface LegendEntry {
  language: string;
  color: string;
}

/**
 * Collects the distinct languages actually rendered across a tree's rings,
 * each with its stable band color, ranked by total share across the whole
 * tree (most prominent first) rather than a static/alphabetical list — the
 * legend should reflect this specific repo's real mix.
 */
export function buildLegend(rings: Ring[]): LegendEntry[] {
  const totalShare = new Map<string, number>();
  const colorByLanguage = new Map<string, string>();

  for (const ring of rings) {
    for (const band of ring.bands) {
      totalShare.set(band.language, (totalShare.get(band.language) ?? 0) + band.share);
      if (!colorByLanguage.has(band.language)) colorByLanguage.set(band.language, band.color);
    }
  }

  return [...totalShare.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([language]) => ({ language, color: colorByLanguage.get(language)! }));
}
