import { describe, expect, it, vi } from "vitest";
import { pickSample, sampleYearLanguages } from "../src/github/sampleLanguages";

describe("pickSample", () => {
  it("returns an empty array for empty input", () => {
    expect(pickSample([], 5)).toEqual([]);
  });

  it("returns everything when the input is at or below sample size", () => {
    expect(pickSample([1, 2, 3], 5)).toEqual([1, 2, 3]);
  });

  it("returns the first item when sampleSize is 1", () => {
    expect(pickSample([1, 2, 3, 4], 1)).toEqual([1]);
  });

  it("always includes the first and last item of a larger array", () => {
    const sample = pickSample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
    expect(sample[0]).toBe(1);
    expect(sample[sample.length - 1]).toBe(10);
    expect(sample.length).toBeLessThanOrEqual(3);
  });

  it("returns an empty array for a non-positive sample size", () => {
    expect(pickSample([1, 2, 3], 0)).toEqual([]);
  });
});

describe("sampleYearLanguages", () => {
  it("returns an empty map for no years", async () => {
    const fetchFiles = vi.fn();
    const result = await sampleYearLanguages({ owner: "a", repo: "b" }, new Map(), 5, fetchFiles);
    expect(result.size).toBe(0);
    expect(fetchFiles).not.toHaveBeenCalled();
  });

  it("fetches files for a sampled subset and flattens the results per year", async () => {
    const fetchFiles = vi.fn(async (_ref, sha: string) => [`${sha}.ts`]);
    const commitsByYear = new Map([
      [2020, [{ sha: "a" }, { sha: "b" }]],
      [2021, [{ sha: "c" }]],
    ]);

    const result = await sampleYearLanguages({ owner: "o", repo: "r" }, commitsByYear, 5, fetchFiles);

    expect(result.get(2020)).toEqual(["a.ts", "b.ts"]);
    expect(result.get(2021)).toEqual(["c.ts"]);
    expect(fetchFiles).toHaveBeenCalledTimes(3);
  });

  it("caps calls per year at the sample size for a year with many commits", async () => {
    const fetchFiles = vi.fn(async () => ["x.py"]);
    const manyCommits = Array.from({ length: 500 }, (_, i) => ({ sha: `sha${i}` }));
    const commitsByYear = new Map([[2020, manyCommits]]);

    await sampleYearLanguages({ owner: "o", repo: "r" }, commitsByYear, 5, fetchFiles);

    expect(fetchFiles).toHaveBeenCalledTimes(5);
  });
});
