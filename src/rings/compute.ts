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
    return activity.map((y) => ({ ...y, thickness: MIN_THICKNESS }));
  }

  return activity.map((y) => {
    const normalized = Math.sqrt(y.commitCount / maxCount);
    const thickness = MIN_THICKNESS + normalized * (1 - MIN_THICKNESS);
    return { ...y, thickness };
  });
}
