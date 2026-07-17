import { describe, expect, it } from "vitest";
import { formatRingSummary } from "../src/ui/ringStats";
import type { Ring } from "../src/rings/types";

describe("formatRingSummary", () => {
  it("includes year, commit count, and dominant language", () => {
    const ring: Ring = {
      year: 2020,
      commitCount: 42,
      thickness: 1,
      bands: [{ language: "TypeScript", share: 0.9, color: "#111" }],
    };
    expect(formatRingSummary(ring)).toBe("2020 · 42 commits · TypeScript");
  });

  it("pluralizes a single commit correctly", () => {
    const ring: Ring = { year: 1999, commitCount: 1, thickness: 1, bands: [] };
    expect(formatRingSummary(ring)).toBe("1999 · 1 commit");
  });

  it("omits the language segment when no bands are attached", () => {
    const ring: Ring = { year: 2005, commitCount: 0, thickness: 1, bands: [] };
    expect(formatRingSummary(ring)).toBe("2005 · 0 commits");
  });
});
