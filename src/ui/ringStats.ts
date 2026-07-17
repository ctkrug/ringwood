import { dominantLanguage } from "../rings/language";
import type { Ring } from "../rings/types";

/**
 * Formats a single ring's year/commit-count/dominant-language into the one
 * line shown in the tooltip and the keyboard-accessible year list, so both
 * entry points always agree on the same text.
 */
export function formatRingSummary(ring: Ring): string {
  const commitLabel = `${ring.commitCount} commit${ring.commitCount === 1 ? "" : "s"}`;
  const language = dominantLanguage(ring.bands);
  return language ? `${ring.year} · ${commitLabel} · ${language}` : `${ring.year} · ${commitLabel}`;
}
