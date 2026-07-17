import { describe, expect, it } from "vitest";
import {
  aggregateLanguages,
  colorForLanguage,
  detectLanguage,
  toBands,
} from "../src/rings/language";

describe("detectLanguage", () => {
  it("maps a common extension to its language", () => {
    expect(detectLanguage("src/index.ts")).toBe("TypeScript");
    expect(detectLanguage("main.py")).toBe("Python");
  });

  it("is case-insensitive on extension and filename", () => {
    expect(detectLanguage("README.MD")).toBe("Markdown");
    expect(detectLanguage("Makefile")).toBe("Makefile");
  });

  it("returns null for an unrecognized or missing extension", () => {
    expect(detectLanguage("LICENSE")).toBeNull();
    expect(detectLanguage("bin/tool")).toBeNull();
    expect(detectLanguage("")).toBeNull();
  });

  it("uses only the final path segment", () => {
    expect(detectLanguage("a/b/c/component.tsx")).toBe("TypeScript");
  });
});

describe("colorForLanguage", () => {
  it("is stable across repeated calls for the same language", () => {
    expect(colorForLanguage("Rust")).toBe(colorForLanguage("Rust"));
  });

  it("returns a hex color string", () => {
    expect(colorForLanguage("Go")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("aggregateLanguages", () => {
  it("returns an empty list for no files", () => {
    expect(aggregateLanguages([])).toEqual([]);
  });

  it("counts recognized languages and drops unrecognized files", () => {
    const counts = aggregateLanguages(["a.ts", "b.ts", "c.py", "LICENSE"]);
    expect(counts).toEqual([
      { language: "TypeScript", count: 2 },
      { language: "Python", count: 1 },
    ]);
  });

  it("orders ties alphabetically for deterministic output", () => {
    const counts = aggregateLanguages(["a.py", "b.rs"]);
    expect(counts.map((c) => c.language)).toEqual(["Python", "Rust"]);
  });
});

describe("toBands", () => {
  it("returns no bands for an empty count list", () => {
    expect(toBands([])).toEqual([]);
  });

  it("gives a single language a full-share solid band", () => {
    const bands = toBands([{ language: "Go", count: 5 }]);
    expect(bands).toHaveLength(1);
    expect(bands[0].share).toBe(1);
  });

  it("splits shares proportionally and sums to 1", () => {
    const bands = toBands([
      { language: "TypeScript", count: 3 },
      { language: "Python", count: 1 },
    ]);
    expect(bands[0].share).toBeCloseTo(0.75);
    expect(bands[1].share).toBeCloseTo(0.25);
    expect(bands.reduce((sum, b) => sum + b.share, 0)).toBeCloseTo(1);
  });
});
