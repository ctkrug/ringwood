import { fetchCommitHistory, GitHubApiError, parseRepoInput } from "../github/client";
import { sampleYearLanguages } from "../github/sampleLanguages";
import type { Animation } from "../render/animate";
import { animateRings } from "../render/animate";
import { renderRings } from "../render/canvas";
import { attachLanguageBands, bucketCommitsByYear, computeRings, groupCommitsByYear } from "../rings/compute";
import { aggregateLanguages, toBands } from "../rings/language";
import type { Ring } from "../rings/types";

const RING_COLORS: [string, string] = ["#bb5a2c", "#4f6b3a"];

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
    <header class="site-header">
      <h1 class="wordmark" aria-label="Ringwood">
        <span aria-hidden="true">Ringw<span class="ring-o"></span><span class="ring-o"></span>d</span>
      </h1>
      <p class="tagline">Paste a public repo. Watch its history grow rings.</p>
    </header>
    <main class="layout">
      <section class="controls">
        <label for="repo-input">GitHub repo</label>
        <input id="repo-input" placeholder="torvalds/linux" autocomplete="off" />
        <button id="grow-btn" type="button">Grow the tree</button>
        <p id="status-msg" role="status" aria-live="polite"></p>
      </section>
      <section class="tree-stage">
        <canvas id="tree-canvas" width="600" height="600"></canvas>
        <p class="stage-placeholder" id="stage-placeholder">Paste a repo and grow its rings</p>
      </section>
    </main>
  `;

  const input = root.querySelector<HTMLInputElement>("#repo-input")!;
  const button = root.querySelector<HTMLButtonElement>("#grow-btn")!;
  const statusEl = root.querySelector<HTMLParagraphElement>("#status-msg")!;
  const canvas = root.querySelector<HTMLCanvasElement>("#tree-canvas")!;
  const stage = root.querySelector<HTMLElement>(".tree-stage")!;
  const placeholder = root.querySelector<HTMLElement>("#stage-placeholder")!;
  const ctx = canvas.getContext("2d")!;

  let currentAnimation: Animation | null = null;
  let lastRings: Ring[] | null = null;

  const bgColor = () => getComputedStyle(document.documentElement).getPropertyValue("--surface-1");

  /**
   * Sizes the canvas element to its container at devicePixelRatio so the
   * tree stays crisp on retina displays, then redraws the last finished
   * tree at the new pixel size rather than leaving it stretched/blurry.
   */
  const resizeCanvas = () => {
    const cssSize = Math.max(Math.min(stage.clientWidth, stage.clientHeight || stage.clientWidth), 1);
    const dpr = window.devicePixelRatio || 1;
    const devicePixels = Math.round(cssSize * dpr);

    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    canvas.width = devicePixels;
    canvas.height = devicePixels;

    if (lastRings) {
      renderRings(ctx, lastRings, canvas.width, { bgColor: bgColor(), ringColors: RING_COLORS });
    }
  };

  const setStatus = (message: string, isError = false) => {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "var(--danger)" : "var(--text-muted)";
  };

  const grow = async () => {
    const ref = parseRepoInput(input.value);
    if (!ref) {
      setStatus("Enter a repo as owner/repo or a github.com URL", true);
      return;
    }

    button.disabled = true;
    setStatus(`Fetching ${ref.owner}/${ref.repo}…`);

    try {
      const commits = await fetchCommitHistory(ref, (page) => {
        setStatus(`Fetching ${ref.owner}/${ref.repo}… page ${page}`);
      });
      const activity = bucketCommitsByYear(commits.map((c) => c.date));
      let rings = computeRings(activity);

      setStatus(`Sampling languages across ${rings.length} year${rings.length === 1 ? "" : "s"}…`);
      const commitsByYear = groupCommitsByYear(commits);
      const filesByYear = await sampleYearLanguages(ref, commitsByYear);
      const bandsByYear = new Map(
        [...filesByYear].map(([year, files]) => [year, toBands(aggregateLanguages(files))]),
      );
      rings = attachLanguageBands(rings, bandsByYear);
      lastRings = rings;
      placeholder.hidden = true;

      currentAnimation?.cancel();
      currentAnimation = animateRings(ctx, rings, canvas.width, {
        bgColor: bgColor(),
        ringColors: RING_COLORS,
        reducedMotion: prefersReducedMotion(),
      });

      setStatus(`${rings.length} ring${rings.length === 1 ? "" : "s"} grown from ${commits.length} commits`);
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : "Something went wrong fetching that repo";
      setStatus(message, true);
      if (!lastRings) placeholder.hidden = false;
    } finally {
      button.disabled = false;
    }
  };

  button.addEventListener("click", grow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") grow();
  });
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}
