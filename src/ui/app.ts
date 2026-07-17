import { fetchCommitHistory, GitHubApiError, parseRepoInput } from "../github/client";
import { renderRings } from "../render/canvas";
import { bucketCommitsByYear, computeRings } from "../rings/compute";

const RING_COLORS: [string, string] = ["#bb5a2c", "#4f6b3a"];

export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
    <header class="site-header">
      <h1 class="wordmark">Ringwood</h1>
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
      </section>
    </main>
  `;

  const input = root.querySelector<HTMLInputElement>("#repo-input")!;
  const button = root.querySelector<HTMLButtonElement>("#grow-btn")!;
  const statusEl = root.querySelector<HTMLParagraphElement>("#status-msg")!;
  const canvas = root.querySelector<HTMLCanvasElement>("#tree-canvas")!;
  const ctx = canvas.getContext("2d")!;

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
      const rings = computeRings(activity);
      renderRings(ctx, rings, canvas.width, {
        bgColor: getComputedStyle(document.documentElement).getPropertyValue("--surface-1"),
        ringColors: RING_COLORS,
      });
      setStatus(`${rings.length} ring${rings.length === 1 ? "" : "s"} grown from ${commits.length} commits`);
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : "Something went wrong fetching that repo";
      setStatus(message, true);
    } finally {
      button.disabled = false;
    }
  };

  button.addEventListener("click", grow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") grow();
  });
}
