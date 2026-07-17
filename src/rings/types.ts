import type { LanguageBand } from "./language";

export interface YearActivity {
  year: number;
  commitCount: number;
}

export interface Ring {
  year: number;
  commitCount: number;
  /** Normalized 0..1 share of this ring's radial thickness relative to the thickest year. */
  thickness: number;
  /** Angular language mix for this year's band, shares summing to 1. Empty until attached. */
  bands: LanguageBand[];
}
