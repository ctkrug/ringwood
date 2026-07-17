import type { RingGeometry } from "./geometry";

/**
 * Finds the ring geometry whose annulus contains a given distance from the
 * tree's center, or null if the point falls outside every ring (the empty
 * center hole or past the outermost radius). Pure radius math so hover/tap/
 * keyboard entry points all resolve to the same ring without touching a
 * canvas or DOM.
 */
export function findRingAtDistance(geometries: RingGeometry[], distance: number): RingGeometry | null {
  for (const geometry of geometries) {
    if (distance >= geometry.innerRadius && distance <= geometry.outerRadius) {
      return geometry;
    }
  }
  return null;
}

/**
 * Converts a pointer position (in the same coordinate space as `center`,
 * e.g. canvas device pixels) into the ring geometry under it.
 */
export function findRingAtPoint(
  geometries: RingGeometry[],
  x: number,
  y: number,
  center: number,
): RingGeometry | null {
  const dx = x - center;
  const dy = y - center;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return findRingAtDistance(geometries, distance);
}
