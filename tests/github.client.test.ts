import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCommitFiles, fetchCommitHistory, GitHubApiError, parseRepoInput } from "../src/github/client";

describe("parseRepoInput", () => {
  it("parses an owner/repo shorthand", () => {
    expect(parseRepoInput("torvalds/linux")).toEqual({ owner: "torvalds", repo: "linux" });
  });

  it("parses a full github.com URL", () => {
    expect(parseRepoInput("https://github.com/torvalds/linux")).toEqual({
      owner: "torvalds",
      repo: "linux",
    });
  });

  it("strips a trailing .git suffix", () => {
    expect(parseRepoInput("https://github.com/torvalds/linux.git")).toEqual({
      owner: "torvalds",
      repo: "linux",
    });
  });

  it("returns null for empty or malformed input", () => {
    expect(parseRepoInput("")).toBeNull();
    expect(parseRepoInput("   ")).toBeNull();
    expect(parseRepoInput("not a repo")).toBeNull();
    expect(parseRepoInput("just-one-segment")).toBeNull();
  });
});

describe("fetchCommitHistory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("paginates until a short page ends the sequence", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      sha: `p1-${i}`,
      commit: { author: { date: "2020-01-01T00:00:00Z" } },
    }));
    const page2 = [{ sha: "p2-0", commit: { author: { date: "2021-01-01T00:00:00Z" } } }];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, json: async () => page2 });
    vi.stubGlobal("fetch", fetchMock);

    const commits = await fetchCommitHistory({ owner: "o", repo: "r" });

    expect(commits).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns an empty list when the repo has zero commits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    expect(await fetchCommitHistory({ owner: "o", repo: "r" })).toEqual([]);
  });

  it("throws a GitHubApiError with a rate-limit message on 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(fetchCommitHistory({ owner: "o", repo: "r" })).rejects.toThrow(GitHubApiError);
  });

  it("throws a GitHubApiError with a not-found message on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchCommitHistory({ owner: "o", repo: "r" })).rejects.toThrow(/not found/);
  });
});

describe("fetchCommitFiles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the touched file paths for a commit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ files: [{ filename: "a.ts" }, { filename: "b.py" }] }),
      }),
    );
    expect(await fetchCommitFiles({ owner: "o", repo: "r" }, "sha1")).toEqual(["a.ts", "b.py"]);
  });

  it("degrades to an empty list instead of throwing on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    expect(await fetchCommitFiles({ owner: "o", repo: "r" }, "sha1")).toEqual([]);
  });

  it("returns an empty list when the response has no files field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    expect(await fetchCommitFiles({ owner: "o", repo: "r" }, "sha1")).toEqual([]);
  });
});
