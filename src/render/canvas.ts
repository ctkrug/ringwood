import type { Ring } from "../rings/types";

export interface RenderOptions {
  bgColor: string;
  ringColors: [string, string];
}

/**
 * Draws the ring stack as concentric circles, outermost ring last so growth
 * reads center-out the same way a real trunk does. Sized in device pixels —
 * callers are responsible for scaling the canvas element to devicePixelRatio.
 */
export function renderRings(
  ctx: CanvasRenderingContext2D,
  rings: Ring[],
  size: number,
  options: RenderOptions,
): void {
  const center = size / 2;
  const maxRadius = size / 2;
  const totalThickness = rings.reduce((sum, r) => sum + r.thickness, 0) || 1;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = options.bgColor;
  ctx.fillRect(0, 0, size, size);

  let radius = maxRadius;
  for (let i = rings.length - 1; i >= 0; i -= 1) {
    const ring = rings[i];
    const band = (ring.thickness / totalThickness) * maxRadius;
    const color = options.ringColors[i % options.ringColors.length];

    ctx.beginPath();
    ctx.arc(center, center, Math.max(radius, 0), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    radius -= band;
  }
}
