import { afterEach, describe, expect, it, vi } from "vitest";
import {
  animateRings,
  computeRingProgress,
  easeOut,
  ringsJustCompleted,
  totalAnimationDuration,
} from "../src/render/animate";
import type { Ring } from "../src/rings/types";

function createFakeCtx() {
  return {
    fillStyle: "",
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    arc: () => {},
    closePath: () => {},
    fill: () => {},
  } as unknown as CanvasRenderingContext2D;
}

/** Stubs requestAnimationFrame with a manually-advanced fake clock so the rAF loop can be driven deterministically. */
function stubRaf() {
  let now = 0;
  let pending: ((t: number) => void) | null = null;
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
    pending = cb;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    pending = null;
  });
  vi.stubGlobal("performance", { now: () => now });
  return {
    advance(ms: number) {
      now += ms;
      const cb = pending;
      pending = null;
      cb?.(now);
    },
  };
}

const ringOptions = { bgColor: "#f2e6c9", ringColors: ["#bb5a2c", "#4f6b3a"] as [string, string] };

function makeRing(year: number): Ring {
  return { year, commitCount: 1, thickness: 1, bands: [] };
}

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

describe("ringsJustCompleted", () => {
  it("reports a ring that reached full progress this frame", () => {
    const completed = [false, false];
    expect(ringsJustCompleted([1, 0.5], completed)).toEqual([0]);
    expect(completed).toEqual([true, false]);
  });

  it("does not re-report a ring already marked complete", () => {
    const completed = [true, false];
    expect(ringsJustCompleted([1, 1], completed)).toEqual([1]);
  });

  it("returns an empty list when nothing has finished yet", () => {
    const completed = [false, false];
    expect(ringsJustCompleted([0.2, 0], completed)).toEqual([]);
  });

  it("reports multiple rings finishing in the same frame in order", () => {
    const completed = [false, false, false];
    expect(ringsJustCompleted([1, 1, 0.9], completed)).toEqual([0, 1]);
  });
});

describe("animateRings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("paints the finished tree instantly and skips onRingComplete under reduced motion", () => {
    const onRingComplete = vi.fn();
    const animation = animateRings(createFakeCtx(), [makeRing(2020)], 600, {
      ...ringOptions,
      reducedMotion: true,
      onRingComplete,
    });

    expect(onRingComplete).not.toHaveBeenCalled();
    return animation.done.then(() => {
      expect(onRingComplete).not.toHaveBeenCalled();
    });
  });

  it("grows rings one at a time, firing onRingComplete once per ring with isLast on the final one", async () => {
    const raf = stubRaf();
    const onRingComplete = vi.fn();
    const rings = [makeRing(2019), makeRing(2020)];
    const animation = animateRings(createFakeCtx(), rings, 600, {
      ...ringOptions,
      ringDurationMs: 100,
      onRingComplete,
    });

    raf.advance(50);
    expect(onRingComplete).not.toHaveBeenCalled();

    raf.advance(60);
    expect(onRingComplete).toHaveBeenCalledWith(0, false);

    raf.advance(100);
    expect(onRingComplete).toHaveBeenCalledWith(1, true);
    expect(onRingComplete).toHaveBeenCalledTimes(2);

    await animation.done;
  });

  it("cancel() stops the loop before it reaches completion", () => {
    const raf = stubRaf();
    const onRingComplete = vi.fn();
    const animation = animateRings(createFakeCtx(), [makeRing(2020)], 600, {
      ...ringOptions,
      ringDurationMs: 100,
      onRingComplete,
    });

    animation.cancel();
    raf.advance(200);

    expect(onRingComplete).not.toHaveBeenCalled();
  });

  it("resolves done immediately for an empty ring list", async () => {
    const animation = animateRings(createFakeCtx(), [], 600, ringOptions);
    await expect(animation.done).resolves.toBeUndefined();
  });
});
