export type TreeStateKind = "empty" | "sapling" | "grown";

export interface TreeState {
  kind: TreeStateKind;
  message: string | null;
}

/**
 * Classifies a finished fetch's ring count into a designed state so a
 * zero-commit or single-year repo never reads as a bare/blank canvas —
 * per docs/BACKLOG.md 3.3, both get their own message instead of silently
 * rendering (or failing to render) an empty tree.
 */
export function describeTreeState(ringCount: number): TreeState {
  if (ringCount === 0) {
    return { kind: "empty", message: "No commits yet — this repo hasn't grown its first ring." };
  }
  if (ringCount === 1) {
    return {
      kind: "sapling",
      message: "Still a sapling — one ring so far. Check back after another year of commits.",
    };
  }
  return { kind: "grown", message: null };
}
