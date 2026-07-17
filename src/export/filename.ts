/**
 * Slugifies a single path segment (owner or repo name) into lowercase,
 * hyphen-separated characters safe for a downloaded filename, trimming any
 * leading/trailing hyphens produced by non-alphanumeric edges.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds the exported PNG's filename from a repo ref, e.g. "torvalds-linux-ringwood.png",
 * so the download identifies which repo's tree it is without opening the file.
 */
export function formatExportFilename(owner: string, repo: string): string {
  return `${slugify(owner)}-${slugify(repo)}-ringwood.png`;
}
