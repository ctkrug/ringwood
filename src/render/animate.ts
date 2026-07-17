import type { Ring } from "../rings/types";
import { paintBackground, renderRingsFrame, type RenderOptions } from "./canvas";
import { computeRingRadii } from "./geometry";

/** Cubic ease-out: fast start, settling in — matches docs/DESIGN.md's growth feel. */
export function easeOut(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Progress (0..1, eased) for every ring at a given elapsed time, where rings
 * grow one at a time in order: ring i doesn't start until the previous
 * `i * ringDurationMs` have elapsed. A ring whose turn hasn't come yet stays
 * at 0; one already finished stays at 1.
 */
export function computeRingProgress(elapsedMs: number, ringCount: number, ringDurationMs: number): number[] {
  const progress: number[] = [];
  for (let i = 0; i < ringCount; i += 1) {
    const raw = (elapsedMs - i * ringDurationMs) / ringDurationMs;
    progress.push(easeOut(raw));
  }
  return progress;
}

export function totalAnimationDuration(ringCount: number, ringDurationMs: number): number {
  return ringCount * ringDurationMs;
}

/**
 * Diffs a frame's progress against which rings were already marked complete,
 * marking any newly-finished ring in place and returning its indices in
 * order. Pulled out of the rAF loop so the "which ring just finished"
 * bookkeeping is testable without a real animation frame.
 */
export function ringsJustCompleted(progress: number[], completed: boolean[]): number[] {
  const justCompleted: number[] = [];
  progress.forEach((value, index) => {
    if (value >= 1 && !completed[index]) {
      completed[index] = true;
      justCompleted.push(index);
    }
  });
  return justCompleted;
}

export interface AnimateOptions extends RenderOptions {
  /** Per-ring growth duration in ms; docs/DESIGN.md calls for 500-800ms. */
  ringDurationMs?: number;
  /** Skips the tween and renders the finished tree immediately. */
  reducedMotion?: boolean;
  /**
   * Fired the instant a ring's growth reaches full progress, once per ring,
   * so a caller can play a completion tick/chime in step with the visual.
   * `isLast` is true for the final ring, for a distinct final-ring sound.
   */
  onRingComplete?: (index: number, isLast: boolean) => void;
}

export interface Animation {
  /** Stops the animation loop immediately; safe to call after it has finished. */
  cancel: () => void;
  /** Resolves once every ring has finished growing (or immediately if reduced-motion). */
  done: Promise<void>;
}

const DEFAULT_RING_DURATION_MS = 650;

/**
 * Grows a tree's rings outward one at a time on the canvas. Returns a handle
 * whose `cancel()` a caller must invoke before starting a new animation on
 * the same canvas, so re-submitting a repo mid-growth never leaves two
 * animations racing (ghosted/overlapping rings).
 */
export function animateRings(
  ctx: CanvasRenderingContext2D,
  rings: Ring[],
  size: number,
  options: AnimateOptions,
): Animation {
  const geometries = computeRingRadii(rings, size);
  const center = size / 2;
  const ringDurationMs = options.ringDurationMs ?? DEFAULT_RING_DURATION_MS;

  if (options.reducedMotion || rings.length === 0) {
    paintBackground(ctx, size, options.bgColor);
    renderRingsFrame(
      ctx,
      geometries,
      center,
      options,
      geometries.map(() => 1),
    );
    return { cancel: () => {}, done: Promise.resolve() };
  }

  let cancelled = false;
  let rafId = 0;
  const start = performance.now();
  const total = totalAnimationDuration(rings.length, ringDurationMs);
  const completed = new Array<boolean>(rings.length).fill(false);

  const done = new Promise<void>((resolve) => {
    const frame = (now: number) => {
      if (cancelled) return;
      const elapsed = now - start;
      const progress = computeRingProgress(elapsed, rings.length, ringDurationMs);

      paintBackground(ctx, size, options.bgColor);
      renderRingsFrame(ctx, geometries, center, options, progress);

      for (const index of ringsJustCompleted(progress, completed)) {
        options.onRingComplete?.(index, index === rings.length - 1);
      }

      if (elapsed >= total) {
        resolve();
        return;
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
  });

  return {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    },
    done,
  };
}
