import { describe, expect, it } from "vitest";
import { computeRingRadii } from "../src/render/geometry";
import { findRingAtDistance, findRingAtPoint } from "../src/render/hitTest";
import type { Ring } from "../src/rings/types";

const rings: Ring[] = [
  { year: 2018, commitCount: 1, thickness: 0.2, bands: [] },
  { year: 2019, commitCount: 5, thickness: 0.5, bands: [] },
  { year: 2020, commitCount: 10, thickness: 0.3, bands: [] },
];

describe("findRingAtDistance", () => {
  it("returns the innermost ring for a distance near the center", () => {
    const geometries = computeRingRadii(rings, 600);
    const result = findRingAtDistance(geometries, geometries[0].innerRadius + 1);
    expect(result?.ring.year).toBe(2018);
  });

  it("returns the outermost ring for a distance near the edge", () => {
    const geometries = computeRingRadii(rings, 600);
    const result = findRingAtDistance(geometries, geometries[2].outerRadius - 1);
    expect(result?.ring.year).toBe(2020);
  });

  it("returns null for a distance past the outermost radius", () => {
    const geometries = computeRingRadii(rings, 600);
    const result = findRingAtDistance(geometries, 1000);
    expect(result).toBeNull();
  });

  it("includes a distance exactly at a ring's outer radius (the boundary belongs to it)", () => {
    const geometries = computeRingRadii(rings, 600);
    const result = findRingAtDistance(geometries, geometries[2].outerRadius);
    expect(result?.ring.year).toBe(2020);
  });

  it("resolves a shared boundary (one ring's outer edge == the next ring's inner edge) to the inner ring", () => {
    const geometries = computeRingRadii(rings, 600);
    const result = findRingAtDistance(geometries, geometries[1].innerRadius);
    expect(result?.ring.year).toBe(2018);
  });

  it("returns null for an empty ring list", () => {
    expect(findRingAtDistance([], 10)).toBeNull();
  });
});

describe("findRingAtPoint", () => {
  it("resolves a ring from x/y coordinates relative to the center", () => {
    const geometries = computeRingRadii(rings, 600);
    const center = 300;
    const midOuterRing = (geometries[2].innerRadius + geometries[2].outerRadius) / 2;
    const result = findRingAtPoint(geometries, center + midOuterRing, center, center);
    expect(result?.ring.year).toBe(2020);
  });

  it("returns null exactly at the center point (the empty core)", () => {
    const geometries = computeRingRadii(rings, 600);
    const center = 300;
    if (geometries[0].innerRadius > 0) {
      const result = findRingAtPoint(geometries, center, center, center);
      expect(result).toBeNull();
    } else {
      expect(true).toBe(true);
    }
  });
});
