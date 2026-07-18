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
