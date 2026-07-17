import { describe, expect, it } from "vitest";
import { computeRingProgress, easeOut, totalAnimationDuration } from "../src/render/animate";

describe("easeOut", () => {
  it("starts at 0 and ends at 1", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
  });

  it("clamps values outside 0..1", () => {
    expect(easeOut(-0.5)).toBe(0);
    expect(easeOut(1.5)).toBe(1);
  });

  it("rises faster early than linear", () => {
    expect(easeOut(0.25)).toBeGreaterThan(0.25);
  });
});

describe("computeRingProgress", () => {
  it("returns an empty array for zero rings", () => {
    expect(computeRingProgress(1000, 0, 650)).toEqual([]);
  });

  it("only the first ring has started at time 0", () => {
    const progress = computeRingProgress(0, 3, 650);
    expect(progress[0]).toBe(0);
    expect(progress[1]).toBe(0);
    expect(progress[2]).toBe(0);
  });

  it("finishes earlier rings before later ones start", () => {
    const progress = computeRingProgress(650, 3, 650);
    expect(progress[0]).toBe(1);
    expect(progress[1]).toBe(0);
    expect(progress[2]).toBe(0);
  });

  it("all rings reach full progress once total duration has elapsed", () => {
    const progress = computeRingProgress(650 * 3, 3, 650);
    expect(progress.every((p) => p === 1)).toBe(true);
  });

  it("a mid-animation ring is partially grown while earlier rings are complete", () => {
    const progress = computeRingProgress(650 + 325, 3, 650);
    expect(progress[0]).toBe(1);
    expect(progress[1]).toBeGreaterThan(0);
    expect(progress[1]).toBeLessThan(1);
    expect(progress[2]).toBe(0);
  });
});

describe("totalAnimationDuration", () => {
  it("multiplies ring count by per-ring duration", () => {
    expect(totalAnimationDuration(5, 650)).toBe(3250);
  });

  it("is zero for no rings", () => {
    expect(totalAnimationDuration(0, 650)).toBe(0);
  });
});
