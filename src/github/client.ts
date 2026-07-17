import type { CommitSummary, RepoRef } from "./types";

const API_ROOT = "https://api.github.com";

/**
 * Accepts "owner/repo", a full github.com URL, or a bare "owner repo" pair and
 * normalizes it to a RepoRef, or null if it doesn't look like either shape.
 */
export function parseRepoInput(input: string): RepoRef | null {
  const trimmed = input.trim().replace(/\.git$/, "");
  if (!trimmed) return null;

  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)\/?$/i,
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  const shorthandMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shorthandMatch) {
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
            ? "GitHub API rate limit exceeded — try again shortly"
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
