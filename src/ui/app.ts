import { createSfxPlayer } from "../audio/sfx";
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
        <div class="controls-row">
          <button id="grow-btn" type="button">Grow the tree</button>
          <button id="mute-btn" type="button" aria-pressed="false">
            <span class="mute-icon" aria-hidden="true"></span>
            <span id="mute-label">Sound on</span>
          </button>
        </div>
        <p id="status-msg" role="status" aria-live="polite"></p>
        <div id="error-banner" class="error-banner" role="alert" hidden>
          <span class="error-banner-icon" aria-hidden="true">!</span>
          <p id="error-banner-msg"></p>
        </div>
      </section>
      <section class="tree-stage">
        <canvas id="tree-canvas" width="600" height="600"></canvas>
        <p class="stage-placeholder" id="stage-placeholder">Paste a repo and grow its rings</p>
      </section>
    </main>
  `;

  const input = root.querySelector<HTMLInputElement>("#repo-input")!;
  const button = root.querySelector<HTMLButtonElement>("#grow-btn")!;
  const muteButton = root.querySelector<HTMLButtonElement>("#mute-btn")!;
  const muteLabel = root.querySelector<HTMLElement>("#mute-label")!;
  const statusEl = root.querySelector<HTMLParagraphElement>("#status-msg")!;
  const errorBanner = root.querySelector<HTMLElement>("#error-banner")!;
  const errorBannerMsg = root.querySelector<HTMLElement>("#error-banner-msg")!;
  const canvas = root.querySelector<HTMLCanvasElement>("#tree-canvas")!;
  const stage = root.querySelector<HTMLElement>(".tree-stage")!;
  const placeholder = root.querySelector<HTMLElement>("#stage-placeholder")!;
  const ctx = canvas.getContext("2d")!;

  let currentAnimation: Animation | null = null;
  let lastRings: Ring[] | null = null;
  const sfx = createSfxPlayer();

  const bgColor = () => getComputedStyle(document.documentElement).getPropertyValue("--surface-1");

  const syncMuteControl = () => {
    const muted = sfx.isMuted();
    muteButton.setAttribute("aria-pressed", String(muted));
    muteLabel.textContent = muted ? "Sound off" : "Sound on";
  };
  syncMuteControl();

  muteButton.addEventListener("click", () => {
    sfx.toggleMute();
    syncMuteControl();
  });

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

  const setStatus = (message: string) => {
    statusEl.textContent = message;
  };

  const showError = (message: string) => {
    errorBannerMsg.textContent = message;
    errorBanner.hidden = false;
  };

  const clearError = () => {
    errorBanner.hidden = true;
    errorBannerMsg.textContent = "";
  };

  const grow = async () => {
    const ref = parseRepoInput(input.value);
    if (!ref) {
      showError("Enter a repo as owner/repo or a github.com URL");
      return;
    }

    clearError();
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
        onRingComplete: (_index, isLast) => (isLast ? sfx.chime() : sfx.tick()),
      });

      setStatus(`${rings.length} ring${rings.length === 1 ? "" : "s"} grown from ${commits.length} commits`);
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : "Something went wrong fetching that repo";
      setStatus("");
      showError(message);
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
