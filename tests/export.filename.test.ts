import { describe, expect, it } from "vitest";
import { formatExportFilename } from "../src/export/filename";

describe("formatExportFilename", () => {
  it("joins owner and repo with the ringwood suffix", () => {
    expect(formatExportFilename("torvalds", "linux")).toBe("torvalds-linux-ringwood.png");
  });

  it("lowercases mixed-case names", () => {
    expect(formatExportFilename("Torvalds", "Linux")).toBe("torvalds-linux-ringwood.png");
  });

  it("replaces non-alphanumeric characters with hyphens", () => {
    expect(formatExportFilename("my.org", "repo_name")).toBe("my-org-repo-name-ringwood.png");
  });

  it("trims leading/trailing hyphens from punctuation edges", () => {
    expect(formatExportFilename("-weird-", "repo")).toBe("weird-repo-ringwood.png");
  });
});
