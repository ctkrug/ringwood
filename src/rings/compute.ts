import type { LanguageBand } from "./language";
import type { Ring, YearActivity } from "./types";

/** A ring at the floor never disappears — a dormant year reads as a scar, not a gap. */
const MIN_THICKNESS = 0.12;

/**
 * Groups commit ISO dates into one bucket per calendar year, filling any
 * silent years in between with a zero count so a repo's dormant stretches
 * show up as thin scars instead of vanishing from the tree entirely.
 */
export function bucketCommitsByYear(dates: string[]): YearActivity[] {
  if (dates.length === 0) return [];

  const counts = new Map<number, number>();
  for (const date of dates) {
    const year = new Date(date).getUTCFullYear();
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  const years = [...counts.keys()];
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const activity: YearActivity[] = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    activity.push({ year, commitCount: counts.get(year) ?? 0 });
  }
  return activity;
}

/**
 * Maps yearly commit counts to normalized ring thickness. Uses a sqrt scale
 * (not linear) so thickness tracks the visual *area* of each ring band, which
 * is how a real cross-section reads growth — otherwise a big year looks
 * disproportionately dominant once it's wrapped around a large radius.
 */
export function computeRings(activity: YearActivity[]): Ring[] {
  const maxCount = Math.max(0, ...activity.map((y) => y.commitCount));
  if (maxCount === 0) {
    return activity.map((y) => ({ ...y, thickness: MIN_THICKNESS, bands: [] }));
  }

  return activity.map((y) => {
    const normalized = Math.sqrt(y.commitCount / maxCount);
    const thickness = MIN_THICKNESS + normalized * (1 - MIN_THICKNESS);
    return { ...y, thickness, bands: [] };
  });
}

/** Neutral fallback for a year whose language sample came back empty (e.g. all-binary commits). */
const UNKNOWN_BAND: LanguageBand[] = [{ language: "Unknown", share: 1, color: "#8a7a5c" }];

/**
 * Merges sampled per-year language bands into rings that already have their
 * thickness computed. Kept separate from computeRings because band detection
 * is async (network-sampled) while thickness is derived purely from counts.
 */
export function attachLanguageBands(rings: Ring[], bandsByYear: Map<number, LanguageBand[]>): Ring[] {
  return rings.map((ring) => {
    const bands = bandsByYear.get(ring.year);
    return { ...ring, bands: bands && bands.length > 0 ? bands : UNKNOWN_BAND };
  });
}

/**
 * Groups commits (with sha + date) into per-calendar-year buckets, for
 * feeding into per-year language sampling. Unlike bucketCommitsByYear this
 * keeps the full commit records (not just counts) and only years that
 * actually have commits — silent years have nothing to sample.
 */
export function groupCommitsByYear<T extends { date: string }>(commits: T[]): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  for (const commit of commits) {
    const year = new Date(commit.date).getUTCFullYear();
    const bucket = grouped.get(year);
    if (bucket) {
      bucket.push(commit);
    } else {
      grouped.set(year, [commit]);
    }
  }
  return grouped;
}
