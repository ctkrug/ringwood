import type { Ring } from "../rings/types";

export interface RingGeometry {
  ring: Ring;
  innerRadius: number;
  outerRadius: number;
}

/**
 * Converts normalized ring thicknesses into concrete inner/outer radii for a
 * canvas of the given size. Index 0 (the oldest year) lands innermost and
 * the last ring lands outermost, matching a real cross-section's growth
 * order. Pulled out of the renderer so the radius math is testable without
 * a canvas context.
 */
export function computeRingRadii(rings: Ring[], size: number): RingGeometry[] {
  const maxRadius = size / 2;
  const totalThickness = rings.reduce((sum, r) => sum + r.thickness, 0) || 1;

  const geometries: RingGeometry[] = new Array(rings.length);
  let outerRadius = maxRadius;
  for (let i = rings.length - 1; i >= 0; i -= 1) {
    const ring = rings[i];
    const band = (ring.thickness / totalThickness) * maxRadius;
    const innerRadius = Math.max(outerRadius - band, 0);
    geometries[i] = { ring, innerRadius, outerRadius };
    outerRadius = innerRadius;
  }
  return geometries;
}
