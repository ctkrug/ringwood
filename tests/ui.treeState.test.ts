import { describe, expect, it } from "vitest";
import { describeTreeState } from "../src/ui/treeState";

describe("describeTreeState", () => {
  it("flags zero rings as the empty-repo state with a designed message", () => {
    const state = describeTreeState(0);
    expect(state.kind).toBe("empty");
    expect(state.message).toMatch(/no commits/i);
  });

  it("flags exactly one ring as the sapling state", () => {
    const state = describeTreeState(1);
    expect(state.kind).toBe("sapling");
    expect(state.message).toMatch(/sapling/i);
  });

  it("flags two or more rings as fully grown with no message", () => {
    expect(describeTreeState(2)).toEqual({ kind: "grown", message: null });
    expect(describeTreeState(40)).toEqual({ kind: "grown", message: null });
  });
});
