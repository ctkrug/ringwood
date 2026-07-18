// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountApp } from "../src/ui/app";

function stubCanvasContext() {
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    arc: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  return ctx;
}

/**
 * Routes the two endpoints the app touches: the paginated commit list and
 * the per-commit file list used for language sampling.
 */
function stubGitHub(commits: Array<{ sha: string; date: string }>, files: string[] = ["src/main.ts"]) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("/commits?")) {
      return {
        ok: true,
        json: async () => commits.map((c) => ({ sha: c.sha, commit: { author: { date: c.date } } })),
      };
    }
    return { ok: true, json: async () => ({ files: files.map((filename) => ({ filename })) }) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function growAndSettle(root: HTMLElement, value: string) {
  const input = root.querySelector<HTMLInputElement>("#repo-input")!;
  input.value = value;
  root.querySelector<HTMLButtonElement>("#grow-btn")!.dispatchEvent(new Event("click"));
  await vi.waitFor(() => {
    if (root.querySelector<HTMLButtonElement>("#grow-btn")!.disabled) throw new Error("still growing");
  });
}

describe("mountApp grow flow", () => {
  beforeEach(() => {
    stubCanvasContext();
    // Reduced motion keeps animateRings synchronous, so a settled grow means
    // a finished tree rather than a half-drawn one.
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects malformed input inline without touching the network", () => {
    const fetchMock = stubGitHub([]);
    const root = document.createElement("div");
    mountApp(root);

    const input = root.querySelector<HTMLInputElement>("#repo-input")!;
    input.value = "not a repo at all";
    root.querySelector<HTMLButtonElement>("#grow-btn")!.dispatchEvent(new Event("click"));

    const banner = root.querySelector<HTMLElement>("#error-banner")!;
    expect(banner.hidden).toBe(false);
    expect(root.querySelector("#error-banner-msg")!.textContent).toContain("owner/repo");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("grows one ring per active year and lists each year as a chip", async () => {
    stubGitHub([
      { sha: "a", date: "2021-03-01T00:00:00Z" },
      { sha: "b", date: "2022-05-01T00:00:00Z" },
      { sha: "c", date: "2022-06-01T00:00:00Z" },
    ]);
    const root = document.createElement("div");
    mountApp(root);
    await growAndSettle(root, "torvalds/linux");

    const chips = root.querySelectorAll(".year-chip");
    expect([...chips].map((c) => c.textContent)).toEqual(["2021", "2022"]);
    expect(root.querySelector("#status-msg")!.textContent).toContain("2 rings");
    expect(root.querySelector<HTMLElement>("#legend-list")!.hidden).toBe(false);
  });

  it("enables the export button only once the tree has finished growing", async () => {
    stubGitHub([{ sha: "a", date: "2021-03-01T00:00:00Z" }]);
    const root = document.createElement("div");
    mountApp(root);
    const exportBtn = root.querySelector<HTMLButtonElement>("#export-btn")!;
    expect(exportBtn.disabled).toBe(true);

    await growAndSettle(root, "torvalds/linux");
    await vi.waitFor(() => expect(exportBtn.disabled).toBe(false));
  });

  it("surfaces a GitHub 404 in the error banner rather than throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, headers: { get: () => null } }),
    );
    const root = document.createElement("div");
    mountApp(root);
    await growAndSettle(root, "ghost/missing");

    const banner = root.querySelector<HTMLElement>("#error-banner")!;
    expect(banner.hidden).toBe(false);
    expect(root.querySelector("#error-banner-msg")!.textContent).toContain("not found");
    expect(root.querySelector("#status-msg")!.textContent).toBe("");
  });

  it("notes that a single-year repo is still a sapling", async () => {
    stubGitHub([{ sha: "a", date: "2024-01-01T00:00:00Z" }]);
    const root = document.createElement("div");
    mountApp(root);
    await growAndSettle(root, "me/new-thing");

    const note = root.querySelector<HTMLElement>("#tree-note")!;
    expect(note.hidden).toBe(false);
    expect(note.textContent).toMatch(/sapling/i);
  });

  it("shows the empty state for a repo with no commits", async () => {
    stubGitHub([]);
    const root = document.createElement("div");
    mountApp(root);
    await growAndSettle(root, "me/empty");

    const placeholder = root.querySelector<HTMLElement>("#stage-placeholder")!;
    expect(placeholder.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>("#year-list")!.hidden).toBe(true);
  });

  it("toggles the mute control's label and pressed state", () => {
    stubGitHub([]);
    const root = document.createElement("div");
    mountApp(root);
    const muteBtn = root.querySelector<HTMLButtonElement>("#mute-btn")!;
    expect(muteBtn.getAttribute("aria-pressed")).toBe("false");

    muteBtn.dispatchEvent(new Event("click"));
    expect(muteBtn.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector("#mute-label")!.textContent).toBe("Sound off");

    muteBtn.dispatchEvent(new Event("click"));
    expect(muteBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("downloads the grown tree named after the repo", async () => {
    stubGitHub([{ sha: "a", date: "2021-03-01T00:00:00Z" }]);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,xx");
    const clicked: HTMLAnchorElement[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag === "a") {
        (el as HTMLAnchorElement).click = () => clicked.push(el as HTMLAnchorElement);
      }
      return el;
    });

    const root = document.createElement("div");
    mountApp(root);
    await growAndSettle(root, "torvalds/linux");
    const exportBtn = root.querySelector<HTMLButtonElement>("#export-btn")!;
    await vi.waitFor(() => expect(exportBtn.disabled).toBe(false));
    exportBtn.dispatchEvent(new Event("click"));

    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe("torvalds-linux-ringwood.png");
  });

  it("ignores an export click before any tree has grown", () => {
    stubGitHub([]);
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL");
    const root = document.createElement("div");
    mountApp(root);
    root.querySelector<HTMLButtonElement>("#export-btn")!.dispatchEvent(new Event("click"));
    expect(toDataURL).not.toHaveBeenCalled();
  });
});

describe("mountApp submit guard", () => {
  beforeEach(() => {
    stubCanvasContext();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("ignores a second Enter-triggered submit while a fetch is already in flight", () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    const root = document.createElement("div");
    mountApp(root);
    const input = root.querySelector<HTMLInputElement>("#repo-input")!;
    input.value = "torvalds/linux";

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    // The first grow() call reaches its own first genuine await (inside
    // fetchCommitHistory's `await fetch(...)`) synchronously, so a second
    // key-mashed Enter before that settles must be a synchronous no-op —
    // otherwise two concurrent fetches race to overwrite the rendered tree.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-enables submission once the in-flight fetch settles", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    const root = document.createElement("div");
    mountApp(root);
    const input = root.querySelector<HTMLInputElement>("#repo-input")!;
    input.value = "torvalds/linux";

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
