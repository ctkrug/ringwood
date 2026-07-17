import { describe, expect, it } from "vitest";
import { computeRingRadii } from "../src/render/geometry";
import type { Ring } from "../src/rings/types";

const ring = (year: number, thickness: number): Ring => ({ year, commitCount: 1, thickness, bands: [] });

describe("computeRingRadii", () => {
  it("returns an empty list for no rings", () => {
    expect(computeRingRadii([], 600)).toEqual([]);
  });

  it("gives a single ring the full radius", () => {
    const geometries = computeRingRadii([ring(2020, 1)], 600);
    expect(geometries[0].outerRadius).toBe(300);
    expect(geometries[0].innerRadius).toBe(0);
  });

  it("nests the oldest ring innermost and the newest outermost", () => {
    const geometries = computeRingRadii([ring(2019, 1), ring(2020, 1)], 600);
    expect(geometries[0].innerRadius).toBe(0);
    expect(geometries[0].outerRadius).toBeCloseTo(150);
    expect(geometries[1].innerRadius).toBeCloseTo(150);
    expect(geometries[1].outerRadius).toBe(300);
  });

  it("never produces a negative inner radius", () => {
    const geometries = computeRingRadii([ring(2020, 0.0001), ring(2021, 0.0001)], 600);
    for (const g of geometries) {
      expect(g.innerRadius).toBeGreaterThanOrEqual(0);
    }
  });

  it("splits radius proportionally to thickness", () => {
    const geometries = computeRingRadii([ring(2020, 3), ring(2021, 1)], 400);
    const thickerBand = geometries[0].outerRadius - geometries[0].innerRadius;
    const thinnerBand = geometries[1].outerRadius - geometries[1].innerRadius;
    expect(thickerBand).toBeCloseTo(thinnerBand * 3);
  });
});
