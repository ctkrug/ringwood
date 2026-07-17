export interface RepoRef {
  owner: string;
  repo: string;
}

export interface CommitSummary {
  sha: string;
  date: string;
  additions: number | null;
  deletions: number | null;
  languages: string[];
}

export interface FetchProgress {
  fetched: number;
  /** Total is unknown up front — GitHub paginates without a count header we can trust. */
  page: number;
}
