import type { CommitSummary, RepoRef } from "./types";

const API_ROOT = "https://api.github.com";

// GitHub's own naming rules: owners are alphanumeric plus interior hyphens
// (max 39 chars), repos also allow dots and underscores (max 100).
const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Rejects segments GitHub could never have issued. Beyond catching typos at
 * the input instead of after a doomed round-trip, this keeps "." and ".."
 * out of the REST path: `/repos/../x/commits` would otherwise be normalized
 * by the browser into a request against an entirely different endpoint.
 */
function isValidRef(owner: string, repo: string): boolean {
  if (repo === "." || repo === "..") return false;
  return OWNER_PATTERN.test(owner) && REPO_PATTERN.test(repo);
}

/**
 * Accepts "owner/repo" or a full github.com URL and normalizes it to a
 * RepoRef, or null if it doesn't look like either shape.
 */
export function parseRepoInput(input: string): RepoRef | null {
  const trimmed = input
    .trim()
    .split(/[?#]/)[0]
    .replace(/\/+$/, "")
    .replace(/\.git$/, "");
  if (!trimmed) return null;

  // Matches a repo URL even with extra path segments (branch/file view,
  // e.g. "/tree/main" or "/blob/main/README.md") pasted from the browser.
  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)(?:\/.*)?$/i,
  );
  if (urlMatch && isValidRef(urlMatch[1], urlMatch[2])) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  const shorthandMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shorthandMatch && isValidRef(shorthandMatch[1], shorthandMatch[2])) {
    return { owner: shorthandMatch[1], repo: shorthandMatch[2] };
  }

  return null;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

/**
 * Turns a 403 response's `X-RateLimit-Reset` header (unix seconds) into an
 * actionable "try again in N minutes" clause. Falls back to a vaguer
 * "shortly" when the header is missing or already in the past, so the
 * message degrades gracefully rather than showing a negative/zero wait.
 */
function rateLimitMessage(res: { headers?: { get(name: string): string | null } }): string {
  const resetHeader = res.headers?.get?.("x-ratelimit-reset");
  const resetEpochSeconds = resetHeader ? Number(resetHeader) : NaN;
  if (Number.isFinite(resetEpochSeconds)) {
    const minutes = Math.ceil((resetEpochSeconds * 1000 - Date.now()) / 60000);
    if (minutes > 0) {
      return `GitHub API rate limit exceeded — try again in ${minutes} minute${minutes === 1 ? "" : "s"}`;
    }
  }
  return "GitHub API rate limit exceeded — try again shortly";
}

/**
 * Fetches commit history for a repo, paginating the REST API until exhausted.
 * Unauthenticated requests are capped at 60/hr by GitHub, so callers should
 * surface GitHubApiError(403) as a rate-limit message rather than a crash.
 */
export async function fetchCommitHistory(
  ref: RepoRef,
  onPage?: (page: number) => void,
): Promise<CommitSummary[]> {
  const commits: CommitSummary[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${API_ROOT}/repos/${ref.owner}/${ref.repo}/commits?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!res.ok) {
      throw new GitHubApiError(
        res.status === 404
          ? `Repo "${ref.owner}/${ref.repo}" not found`
          : res.status === 403
            ? rateLimitMessage(res)
            : `GitHub API error (${res.status})`,
        res.status,
      );
    }

    const batch = (await res.json()) as Array<{
      sha: string;
      commit: { author: { date: string } | null };
    }>;

    if (batch.length === 0) break;

    for (const item of batch) {
      const date = item.commit.author?.date;
      if (!date) continue;
      commits.push({
        sha: item.sha,
        date,
        additions: null,
        deletions: null,
        languages: [],
      });
    }

    onPage?.(page);
    if (batch.length < perPage) break;
    page += 1;
  }

  return commits;
}

/**
 * Fetches the file paths touched by a single commit, for language sampling.
 * This is a best-effort enhancement (color bands), not the core ring render,
 * so any non-OK response degrades to an empty file list rather than throwing
 * and breaking the tree that already rendered from fetchCommitHistory.
 */
export async function fetchCommitFiles(ref: RepoRef, sha: string): Promise<string[]> {
  const url = `${API_ROOT}/repos/${ref.owner}/${ref.repo}/commits/${sha}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { files?: Array<{ filename: string }> };
  return (data.files ?? []).map((f) => f.filename);
}
