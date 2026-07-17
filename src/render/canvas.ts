import type { Ring } from "../rings/types";
import { computeRingRadii, type RingGeometry } from "./geometry";

export interface RenderOptions {
  bgColor: string;
  ringColors: [string, string];
}

const TAU = Math.PI * 2;
/** Bands start at 12 o'clock and sweep clockwise, reading like a clock face, not an arbitrary 0°. */
const START_ANGLE = -Math.PI / 2;

/**
 * Draws one ring's language bands as angular sector wedges between an inner
 * and outer radius (which may be less than the ring's full outer radius,
 * for growth animation). A ring with no detected bands falls back to a
 * single wedge in the alternating fallback color.
 */
function drawRingBands(
  ctx: CanvasRenderingContext2D,
  center: number,
  innerRadius: number,
  outerRadius: number,
  ring: Ring,
  fallbackColor: string,
): void {
  if (outerRadius <= innerRadius) return;

  const bands = ring.bands.length > 0 ? ring.bands : [{ language: "", share: 1, color: fallbackColor }];
  let angle = START_ANGLE;

  for (const band of bands) {
    const endAngle = angle + band.share * TAU;

    ctx.beginPath();
    if (innerRadius <= 0) {
      ctx.moveTo(center, center);
      ctx.arc(center, center, outerRadius, angle, endAngle, false);
    } else {
      ctx.arc(center, center, outerRadius, angle, endAngle, false);
      ctx.arc(center, center, innerRadius, endAngle, angle, true);
    }
    ctx.closePath();
    ctx.fillStyle = band.color;
    ctx.fill();

    angle = endAngle;
  }
}

/** Paints the parchment background canvas apps share, before any ring bands. */
export function paintBackground(ctx: CanvasRenderingContext2D, size: number, bgColor: string): void {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
}

/**
 * Draws every ring at a given per-ring growth progress (0..1), where a ring
 * fills radially from its inner radius out to its full outer radius. Used
 * directly for a full instant render (all progress 1) and by the growth
 * animation for partial frames.
 */
export function renderRingsFrame(
  ctx: CanvasRenderingContext2D,
  geometries: RingGeometry[],
  center: number,
  options: RenderOptions,
  progress: number[],
): void {
  geometries.forEach(({ ring, innerRadius, outerRadius }, index) => {
    const grown = Math.min(Math.max(progress[index] ?? 1, 0), 1);
    const currentOuter = innerRadius + (outerRadius - innerRadius) * grown;
    drawRingBands(ctx, center, innerRadius, currentOuter, ring, options.ringColors[index % options.ringColors.length]);
  });
}

/**
 * Draws the ring stack as concentric annuli, oldest ring innermost, so
 * growth reads center-out the same way a real trunk does. Sized in device
 * pixels — callers are responsible for scaling the canvas element to
 * devicePixelRatio.
 */
export function renderRings(ctx: CanvasRenderingContext2D, rings: Ring[], size: number, options: RenderOptions): void {
  paintBackground(ctx, size, options.bgColor);
  const geometries = computeRingRadii(rings, size);
  renderRingsFrame(ctx, geometries, size / 2, options, geometries.map(() => 1));
}
