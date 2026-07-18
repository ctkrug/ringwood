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

  it("strips a query string pasted from the address bar instead of folding it into the repo name", () => {
    expect(parseRepoInput("https://github.com/torvalds/linux?tab=readme-ov-file")).toEqual({
      owner: "torvalds",
      repo: "linux",
    });
  });

  it("strips a #fragment pasted from the address bar instead of folding it into the repo name", () => {
    expect(parseRepoInput("https://github.com/torvalds/linux#readme")).toEqual({
      owner: "torvalds",
      repo: "linux",
    });
  });

  it("parses a URL with extra path segments (branch/file view) down to owner/repo", () => {
    expect(parseRepoInput("https://github.com/torvalds/linux/tree/master")).toEqual({
      owner: "torvalds",
      repo: "linux",
    });
    expect(parseRepoInput("https://github.com/torvalds/linux/blob/master/README.md")).toEqual({
      owner: "torvalds",
      repo: "linux",
    });
  });

  it("tolerates a trailing slash on shorthand input", () => {
    expect(parseRepoInput("torvalds/linux/")).toEqual({ owner: "torvalds", repo: "linux" });
  });

  it("rejects segments that cannot be GitHub names", () => {
    // GitHub owners are alphanumeric + hyphen; repos add dot and underscore.
    // Anything else is a typo or a paste accident, and should fail inline
    // rather than becoming a doomed API request.
    expect(parseRepoInput("🐙/emoji-repo")).toBeNull();
    expect(parseRepoInput("<script>alert(1)</script>")).toBeNull();
    expect(parseRepoInput("owner name/repo")).toBeNull();
    expect(parseRepoInput("-leading/repo")).toBeNull();
    expect(parseRepoInput("trailing-/repo")).toBeNull();
    expect(parseRepoInput("owner./repo")).toBeNull();
    expect(parseRepoInput(`${"a".repeat(40)}/repo`)).toBeNull();
    expect(parseRepoInput(`owner/${"b".repeat(101)}`)).toBeNull();
  });

  it("rejects dot segments that would escape the API path", () => {
    // "../x" interpolated into /repos/{owner}/{repo}/commits collapses to a
    // different endpoint once the browser normalizes the URL.
    expect(parseRepoInput("../x")).toBeNull();
    expect(parseRepoInput("owner/..")).toBeNull();
    expect(parseRepoInput("owner/.")).toBeNull();
  });

  it("keeps the dots, underscores, and hyphens GitHub actually allows", () => {
    expect(parseRepoInput("my-org/my_repo.js")).toEqual({ owner: "my-org", repo: "my_repo.js" });
    expect(parseRepoInput("a/b")).toEqual({ owner: "a", repo: "b" });
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

    const result = await fetchCommitHistory({ owner: "o", repo: "r" });

    expect(result.commits).toHaveLength(101);
    expect(result.truncated).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns an empty, non-truncated list when the repo has zero commits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    expect(await fetchCommitHistory({ owner: "o", repo: "r" })).toEqual({ commits: [], truncated: false });
  });

  it("throws a GitHubApiError with a rate-limit message on 403 with nothing fetched yet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(fetchCommitHistory({ owner: "o", repo: "r" })).rejects.toThrow(GitHubApiError);
  });

  it("returns the commits already fetched, marked truncated, when a 403 hits after earlier pages succeeded", async () => {
    // Simulates a large repo burning its 60-req/hr unauthenticated quota partway through:
    // the first page succeeds, the second is rate-limited. Losing the first page's commits
    // to a thrown error would turn "you can render 6000 commits" into "you get nothing."
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      sha: `p1-${i}`,
      commit: { author: { date: "2020-01-01T00:00:00Z" } },
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => page1 })
      .mockResolvedValueOnce({ ok: false, status: 403, headers: { get: () => null } });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCommitHistory({ owner: "o", repo: "r" });

    expect(result.commits).toHaveLength(100);
    expect(result.truncated).toBe(true);
  });

  it("includes a minutes-until-reset clause when the reset header is present", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T12:00:00Z"));
    const resetEpochSeconds = Math.floor(new Date("2026-07-17T12:05:00Z").getTime() / 1000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: { get: (name: string) => (name === "x-ratelimit-reset" ? String(resetEpochSeconds) : null) },
      }),
    );
    await expect(fetchCommitHistory({ owner: "o", repo: "r" })).rejects.toThrow(/try again in 5 minutes/);
    vi.useRealTimers();
  });

  it("falls back to a vague message when the reset header is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, headers: { get: () => null } }));
    await expect(fetchCommitHistory({ owner: "o", repo: "r" })).rejects.toThrow(/try again shortly/);
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
