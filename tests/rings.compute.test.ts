import { describe, expect, it } from "vitest";
import { bucketCommitsByYear, computeRings } from "../src/rings/compute";

describe("bucketCommitsByYear", () => {
  it("returns an empty list for no commits", () => {
    expect(bucketCommitsByYear([])).toEqual([]);
  });

  it("groups commits by calendar year", () => {
    const dates = ["2020-01-15T00:00:00Z", "2020-06-01T00:00:00Z", "2021-03-01T00:00:00Z"];
    expect(bucketCommitsByYear(dates)).toEqual([
      { year: 2020, commitCount: 2 },
      { year: 2021, commitCount: 1 },
    ]);
  });

  it("fills silent years between active years with a zero count", () => {
    const dates = ["2018-01-01T00:00:00Z", "2021-01-01T00:00:00Z"];
    expect(bucketCommitsByYear(dates)).toEqual([
      { year: 2018, commitCount: 1 },
      { year: 2019, commitCount: 0 },
      { year: 2020, commitCount: 0 },
      { year: 2021, commitCount: 1 },
    ]);
  });
});

describe("computeRings", () => {
  it("gives the busiest year full thickness and floors the rest above zero", () => {
    const rings = computeRings([
      { year: 2020, commitCount: 100 },
      { year: 2021, commitCount: 0 },
    ]);
    expect(rings[0].thickness).toBeCloseTo(1);
    expect(rings[1].thickness).toBeGreaterThan(0);
    expect(rings[1].thickness).toBeLessThan(rings[0].thickness);
  });

  it("never fully collapses a dormant year to zero thickness", () => {
    const rings = computeRings([{ year: 2020, commitCount: 0 }]);
    expect(rings[0].thickness).toBeGreaterThan(0);
  });

  it("scales thickness by sqrt of relative volume, not linearly", () => {
    const rings = computeRings([
      { year: 2020, commitCount: 100 },
      { year: 2021, commitCount: 25 },
    ]);
    // 25/100 = 0.25 relative volume; sqrt(0.25) = 0.5, well above the linear 0.25.
    const linearShare = 0.25;
    const relativeThickness = rings[1].thickness / rings[0].thickness;
    expect(relativeThickness).toBeGreaterThan(linearShare);
  });
});
