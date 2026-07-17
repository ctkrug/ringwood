import { createSfxPlayer } from "../audio/sfx";
import { fetchCommitHistory, GitHubApiError, parseRepoInput } from "../github/client";
import { sampleYearLanguages } from "../github/sampleLanguages";
import type { Animation } from "../render/animate";
import { animateRings } from "../render/animate";
import { drawRingHighlight, renderRings } from "../render/canvas";
import { computeRingRadii, type RingGeometry } from "../render/geometry";
import { findRingAtPoint } from "../render/hitTest";
import { attachLanguageBands, bucketCommitsByYear, computeRings, groupCommitsByYear } from "../rings/compute";
import { aggregateLanguages, toBands } from "../rings/language";
import type { Ring } from "../rings/types";
import { formatRingSummary } from "./ringStats";

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
          <button id="export-btn" type="button" disabled>Export PNG</button>
        </div>
        <p id="status-msg" role="status" aria-live="polite"></p>
        <div id="error-banner" class="error-banner" role="alert" hidden>
          <span class="error-banner-icon" aria-hidden="true">!</span>
          <p id="error-banner-msg"></p>
        </div>
        <div id="year-list" class="year-list" aria-label="Ring years" hidden></div>
        <div id="legend-list" class="legend-list" aria-label="Language legend" hidden></div>
      </section>
      <section class="tree-stage">
        <canvas id="tree-canvas" width="600" height="600"></canvas>
        <div id="tree-glow" class="tree-glow" aria-hidden="true"></div>
        <p class="stage-placeholder" id="stage-placeholder">Paste a repo and grow its rings</p>
        <p id="tree-note" class="tree-note" role="status" hidden></p>
        <div id="ring-tooltip" class="ring-tooltip" role="tooltip" hidden></div>
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
  const yearList = root.querySelector<HTMLElement>("#year-list")!;
  const tooltip = root.querySelector<HTMLElement>("#ring-tooltip")!;
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

  const accentColor = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();

  /** Repaints the last finished tree with no highlight, e.g. before drawing a fresh one. */
  const redrawBase = () => {
    if (lastRings) {
      renderRings(ctx, lastRings, canvas.width, { bgColor: bgColor(), ringColors: RING_COLORS });
    }
  };

  /**
   * Highlights a ring on the canvas and shows its stats in the tooltip,
   * anchored to that ring's top edge so hover, tap, and keyboard focus on
   * the year-list all land the tooltip in the same predictable spot.
   */
  const showRingInfo = (geometry: RingGeometry) => {
    redrawBase();
    drawRingHighlight(ctx, geometry, canvas.width / 2, accentColor());

    const dpr = window.devicePixelRatio || 1;
    const midRadiusCss = (geometry.innerRadius + geometry.outerRadius) / 2 / dpr;
    const cssCenter = canvas.clientWidth / 2;
    tooltip.textContent = formatRingSummary(geometry.ring);
    tooltip.style.left = `${cssCenter}px`;
    tooltip.style.top = `${Math.max(cssCenter - midRadiusCss, 8)}px`;
    tooltip.hidden = false;
  };

  const hideRingInfo = () => {
    tooltip.hidden = true;
    redrawBase();
  };

  /** Converts a pointer client position into the ring geometry under it, or null off-tree. */
  const geometryAtPointer = (clientX: number, clientY: number): RingGeometry | null => {
    if (!lastRings || lastRings.length === 0) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return null;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const geometries = computeRingRadii(lastRings, canvas.width);
    return findRingAtPoint(geometries, x, y, canvas.width / 2);
  };

  canvas.addEventListener("pointermove", (e) => {
    const geometry = geometryAtPointer(e.clientX, e.clientY);
    if (geometry) showRingInfo(geometry);
    else hideRingInfo();
  });
  canvas.addEventListener("pointerleave", hideRingInfo);
  canvas.addEventListener("click", (e) => {
    const geometry = geometryAtPointer(e.clientX, e.clientY);
    if (geometry) showRingInfo(geometry);
  });

  document.addEventListener("pointerdown", (e) => {
    if (tooltip.hidden) return;
    const target = e.target as Node;
    if (canvas.contains(target) || yearList.contains(target)) return;
    hideRingInfo();
  });

  /** Builds the keyboard-tabbable per-year buttons that mirror hover/tap ring info. */
  const buildYearList = (rings: Ring[]) => {
    yearList.innerHTML = "";
    if (rings.length === 0) {
      yearList.hidden = true;
      return;
    }

    rings.forEach((ring, index) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "year-chip";
      chip.textContent = String(ring.year);
      chip.setAttribute("aria-label", formatRingSummary(ring));

      const showThisRing = () => {
        if (!lastRings) return;
        const geometry = computeRingRadii(lastRings, canvas.width)[index];
        if (geometry) showRingInfo(geometry);
      };
      chip.addEventListener("mouseenter", showThisRing);
      chip.addEventListener("focus", showThisRing);
      chip.addEventListener("mouseleave", hideRingInfo);
      chip.addEventListener("blur", hideRingInfo);

      yearList.appendChild(chip);
    });
    yearList.hidden = false;
  };

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
    hideRingInfo();
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
      buildYearList(rings);

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
