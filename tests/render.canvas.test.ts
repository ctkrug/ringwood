import { describe, expect, it } from "vitest";
import { computeRingRadii } from "../src/render/geometry";
import { drawRingHighlight, paintBackground, renderRings, renderRingsFrame } from "../src/render/canvas";
import type { Ring } from "../src/rings/types";

interface Call {
  type: string;
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
}

function createFakeCtx() {
  const calls: Call[] = [];
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
    clearRect: () => calls.push({ type: "clearRect" }),
    fillRect: () => calls.push({ type: "fillRect", fillStyle: ctx.fillStyle }),
    beginPath: () => calls.push({ type: "beginPath" }),
    moveTo: () => calls.push({ type: "moveTo" }),
    arc: () => calls.push({ type: "arc" }),
    closePath: () => calls.push({ type: "closePath" }),
    fill: () => calls.push({ type: "fill", fillStyle: ctx.fillStyle }),
    stroke: () => calls.push({ type: "stroke", strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth }),
    save: () => calls.push({ type: "save" }),
    restore: () => calls.push({ type: "restore" }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const options = { bgColor: "#f2e6c9", ringColors: ["#bb5a2c", "#4f6b3a"] as [string, string] };

describe("paintBackground", () => {
  it("clears the canvas and fills it with the background color", () => {
    const { ctx, calls } = createFakeCtx();
    paintBackground(ctx, 600, "#f2e6c9");
    expect(calls[0].type).toBe("clearRect");
    expect(calls[1]).toEqual({ type: "fillRect", fillStyle: "#f2e6c9" });
  });
});

describe("renderRings", () => {
  it("draws a solid fallback-color wedge for a ring with no bands", () => {
    const { ctx, calls } = createFakeCtx();
    const ring: Ring = { year: 2020, commitCount: 1, thickness: 1, bands: [] };
    renderRings(ctx, [ring], 600, options);

    const fillCalls = calls.filter((c) => c.type === "fill");
    expect(fillCalls).toHaveLength(1);
    expect(fillCalls[0].fillStyle).toBe("#bb5a2c");
  });

  it("draws one wedge per language band", () => {
    const { ctx, calls } = createFakeCtx();
    const ring: Ring = {
      year: 2020,
      commitCount: 1,
      thickness: 1,
      bands: [
        { language: "Go", share: 0.75, color: "#111111" },
        { language: "Rust", share: 0.25, color: "#222222" },
      ],
    };
    renderRings(ctx, [ring], 600, options);

    const fillCalls = calls.filter((c) => c.type === "fill");
    expect(fillCalls.map((c) => c.fillStyle)).toEqual(["#111111", "#222222"]);
  });

  it("draws nothing for an empty ring list beyond the background", () => {
    const { ctx, calls } = createFakeCtx();
    renderRings(ctx, [], 600, options);
    expect(calls.filter((c) => c.type === "fill")).toHaveLength(0);
  });
});

describe("renderRingsFrame", () => {
  it("skips drawing a ring whose growth progress is zero", () => {
    const { ctx, calls } = createFakeCtx();
    const ring: Ring = { year: 2020, commitCount: 1, thickness: 1, bands: [] };
    const geometries = computeRingRadii([ring], 600);
    renderRingsFrame(ctx, geometries, 300, options, [0]);
    expect(calls.filter((c) => c.type === "fill")).toHaveLength(0);
  });

  it("draws a full wedge once progress reaches 1", () => {
    const { ctx, calls } = createFakeCtx();
    const ring: Ring = { year: 2020, commitCount: 1, thickness: 1, bands: [] };
    const geometries = computeRingRadii([ring], 600);
    renderRingsFrame(ctx, geometries, 300, options, [1]);
    expect(calls.filter((c) => c.type === "fill")).toHaveLength(1);
  });
});

describe("drawRingHighlight", () => {
  it("strokes the ring's annulus with the given color", () => {
    const { ctx, calls } = createFakeCtx();
    const ring: Ring = { year: 2020, commitCount: 1, thickness: 1, bands: [] };
    const [geometry] = computeRingRadii([ring], 600);
    drawRingHighlight(ctx, geometry, 300, "#bb5a2c");

    const strokeCalls = calls.filter((c) => c.type === "stroke");
    expect(strokeCalls).toHaveLength(1);
    expect(strokeCalls[0].strokeStyle).toBe("#bb5a2c");
  });

  it("saves and restores context state so the highlight doesn't leak", () => {
    const { ctx, calls } = createFakeCtx();
    const ring: Ring = { year: 2020, commitCount: 1, thickness: 1, bands: [] };
    const [geometry] = computeRingRadii([ring], 600);
    drawRingHighlight(ctx, geometry, 300, "#bb5a2c");

    expect(calls[0].type).toBe("save");
    expect(calls[calls.length - 1].type).toBe("restore");
  });
});
