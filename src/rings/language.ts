const EXTENSION_LANGUAGE: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  c: "C",
  h: "C",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  hpp: "C++",
  go: "Go",
  rs: "Rust",
  java: "Java",
  rb: "Ruby",
  php: "PHP",
  sh: "Shell",
  bash: "Shell",
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "CSS",
  sass: "CSS",
  less: "CSS",
  md: "Markdown",
  markdown: "Markdown",
  json: "JSON",
  yml: "YAML",
  yaml: "YAML",
  cs: "C#",
  swift: "Swift",
  kt: "Kotlin",
  kts: "Kotlin",
  m: "Objective-C",
  mm: "Objective-C",
  pl: "Perl",
  lua: "Lua",
  scala: "Scala",
  hs: "Haskell",
  ex: "Elixir",
  exs: "Elixir",
};

const FILENAME_LANGUAGE: Record<string, string> = {
  makefile: "Makefile",
  dockerfile: "Docker",
};

/**
 * Maps a repo file path to a coarse language name via its extension (or a few
 * well-known extensionless filenames). Returns null for anything unrecognized
 * so callers can exclude it from the language mix rather than mislabel it.
 */
export function detectLanguage(filename: string): string | null {
  const base = filename.split("/").pop() ?? filename;
  const lowerBase = base.toLowerCase();
  if (FILENAME_LANGUAGE[lowerBase]) return FILENAME_LANGUAGE[lowerBase];

  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0) return null;
  const ext = base.slice(dotIndex + 1).toLowerCase();
  return EXTENSION_LANGUAGE[ext] ?? null;
}

/** Warm, organic tones so language bands read as tree material, not a UI chart. */
const LANGUAGE_PALETTE = [
  "#bb5a2c",
  "#4f6b3a",
  "#a67c3d",
  "#7a4a2b",
  "#8a9a5b",
  "#c98a3e",
  "#5c3a21",
  "#9c6b4f",
  "#6b8a4f",
  "#b0793a",
];

/**
 * Deterministic string hash so the same language always lands on the same
 * palette color across renders and sessions, per docs/DESIGN.md's stability
 * requirement — no randomness, no Map insertion-order dependency.
 */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function colorForLanguage(name: string): string {
  return LANGUAGE_PALETTE[hashString(name) % LANGUAGE_PALETTE.length];
}

export interface LanguageCount {
  language: string;
  count: number;
}

/**
 * Counts recognized languages across a list of touched file paths. Filenames
 * with no recognized language are dropped rather than counted as "unknown" —
 * callers decide how to present a year with no recognized files at all.
 */
export function aggregateLanguages(filenames: string[]): LanguageCount[] {
  const counts = new Map<string, number>();
  for (const filename of filenames) {
    const language = detectLanguage(filename);
    if (!language) continue;
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language));
}

export interface LanguageBand {
  language: string;
  share: number;
  color: string;
}

/**
 * Converts language counts into normalized shares that sum to 1, each carrying
 * its stable palette color. A single-language input yields a single
 * full-share band, matching the "one language = one solid band" requirement.
 */
export function toBands(counts: LanguageCount[]): LanguageBand[] {
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  if (total === 0) return [];

  return counts.map((c) => ({
    language: c.language,
    share: c.count / total,
    color: colorForLanguage(c.language),
  }));
}
