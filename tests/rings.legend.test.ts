import { describe, expect, it } from "vitest";
import { buildLegend } from "../src/rings/legend";
import type { Ring } from "../src/rings/types";

const ring = (year: number, bands: Ring["bands"]): Ring => ({ year, commitCount: 1, thickness: 1, bands });

describe("buildLegend", () => {
  it("returns an empty legend for no rings", () => {
    expect(buildLegend([])).toEqual([]);
  });

  it("returns an empty legend when rings have no bands yet", () => {
    expect(buildLegend([ring(2020, [])])).toEqual([]);
  });

  it("dedupes a language repeated across multiple rings", () => {
    const rings = [
      ring(2019, [{ language: "TypeScript", share: 1, color: "#111" }]),
      ring(2020, [{ language: "TypeScript", share: 1, color: "#111" }]),
    ];
    expect(buildLegend(rings)).toEqual([{ language: "TypeScript", color: "#111" }]);
  });

  it("ranks languages by total share across the tree, largest first", () => {
    const rings = [
      ring(2020, [
        { language: "Go", share: 0.9, color: "#222" },
        { language: "Shell", share: 0.1, color: "#333" },
      ]),
    ];
    expect(buildLegend(rings).map((e) => e.language)).toEqual(["Go", "Shell"]);
  });

  it("breaks a share tie alphabetically for a stable order", () => {
    const rings = [
      ring(2020, [
        { language: "Rust", share: 0.5, color: "#222" },
        { language: "Go", share: 0.5, color: "#333" },
      ]),
    ];
    expect(buildLegend(rings).map((e) => e.language)).toEqual(["Go", "Rust"]);
  });
});
