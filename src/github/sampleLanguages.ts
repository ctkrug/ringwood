import { fetchCommitFiles } from "./client";
import type { RepoRef } from "./types";

/**
 * Picks up to `sampleSize` evenly-spaced items across the array (always
 * including the first and last), instead of every item. Fetching a file
 * list is one extra API call per commit, and a year can hold thousands of
 * commits, so a full scan would blow through GitHub's rate limit — a small
 * spread sample is enough to characterize a year's language mix.
 */
export function pickSample<T>(items: T[], sampleSize: number): T[] {
  if (sampleSize <= 0 || items.length === 0) return [];
  if (items.length <= sampleSize) return items;
  if (sampleSize === 1) return [items[0]];

  const step = (items.length - 1) / (sampleSize - 1);
  const picked: T[] = [];
  const seenIndexes = new Set<number>();
  for (let i = 0; i < sampleSize; i += 1) {
    const index = Math.round(i * step);
    if (seenIndexes.has(index)) continue;
    seenIndexes.add(index);
    picked.push(items[index]);
  }
  return picked;
}

/**
 * Samples a handful of commits per year and returns the flattened list of
 * file paths touched, for language-band aggregation. `fetchFiles` is
 * injectable so tests can supply a fake instead of hitting the network.
 */
export async function sampleYearLanguages(
  ref: RepoRef,
  commitsByYear: Map<number, { sha: string }[]>,
  sampleSize = 5,
  fetchFiles: (ref: RepoRef, sha: string) => Promise<string[]> = fetchCommitFiles,
): Promise<Map<number, string[]>> {
  const result = new Map<number, string[]>();

  for (const [year, commits] of commitsByYear) {
    const sample = pickSample(commits, sampleSize);
    const fileLists = await Promise.all(sample.map((c) => fetchFiles(ref, c.sha)));
    result.set(year, fileLists.flat());
  }

  return result;
}
