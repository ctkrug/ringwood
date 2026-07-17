import { describe, expect, it } from "vitest";
import { attachLanguageBands, groupCommitsByYear } from "../src/rings/compute";
import type { Ring } from "../src/rings/types";

describe("groupCommitsByYear", () => {
  it("returns an empty map for no commits", () => {
    expect(groupCommitsByYear([]).size).toBe(0);
  });

  it("buckets full commit records by calendar year", () => {
    const commits = [
      { sha: "a", date: "2020-01-01T00:00:00Z" },
      { sha: "b", date: "2020-06-01T00:00:00Z" },
      { sha: "c", date: "2021-01-01T00:00:00Z" },
    ];
    const grouped = groupCommitsByYear(commits);
    expect(grouped.get(2020)).toEqual([commits[0], commits[1]]);
    expect(grouped.get(2021)).toEqual([commits[2]]);
  });

  it("does not create an entry for years with no commits", () => {
    const commits = [{ sha: "a", date: "2018-01-01T00:00:00Z" }];
    const grouped = groupCommitsByYear(commits);
    expect(grouped.has(2017)).toBe(false);
    expect(grouped.has(2019)).toBe(false);
  });
});

describe("attachLanguageBands", () => {
  const baseRing = (year: number): Ring => ({ year, commitCount: 10, thickness: 0.5, bands: [] });

  it("attaches the sampled bands for a matching year", () => {
    const rings = [baseRing(2020)];
    const bandsByYear = new Map([[2020, [{ language: "Go", share: 1, color: "#000000" }]]]);
    const result = attachLanguageBands(rings, bandsByYear);
    expect(result[0].bands).toEqual([{ language: "Go", share: 1, color: "#000000" }]);
  });

  it("falls back to a neutral Unknown band when a year has no sample", () => {
    const rings = [baseRing(2020)];
    const result = attachLanguageBands(rings, new Map());
    expect(result[0].bands).toHaveLength(1);
    expect(result[0].bands[0].language).toBe("Unknown");
    expect(result[0].bands[0].share).toBe(1);
  });

  it("falls back to Unknown when the sampled bands array is empty", () => {
    const rings = [baseRing(2020)];
    const bandsByYear = new Map([[2020, []]]);
    const result = attachLanguageBands(rings, bandsByYear);
    expect(result[0].bands[0].language).toBe("Unknown");
  });

  it("does not mutate the input rings array", () => {
    const rings = [baseRing(2020)];
    attachLanguageBands(rings, new Map([[2020, [{ language: "Go", share: 1, color: "#000" }]]]));
    expect(rings[0].bands).toEqual([]);
  });
});
