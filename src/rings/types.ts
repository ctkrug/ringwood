export interface YearActivity {
  year: number;
  commitCount: number;
}

export interface Ring {
  year: number;
  commitCount: number;
  /** Normalized 0..1 share of this ring's radial thickness relative to the thickest year. */
  thickness: number;
}
