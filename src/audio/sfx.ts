const MUTE_STORAGE_KEY = "ringwood:muted";

export interface SfxPlayer {
  /** Soft low tick played as each ring finishes growing. */
  tick(): void;
  /** Brighter chime played once the final ring finishes. */
  chime(): void;
  /** Flips mute state, persists it, and returns the new value. */
  toggleMute(): boolean;
  isMuted(): boolean;
}

type AudioContextCtor = new () => AudioContext;

const noopStorage: Pick<Storage, "getItem" | "setItem"> = {
  getItem: () => null,
  setItem: () => {},
};

function resolveAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
}

/**
 * Creates a WebAudio-synthesized SFX player: a soft tick per completed ring
 * and a brighter chime for the final one. The AudioContext is created lazily
 * on the first actual sound (a user gesture, per browser autoplay policy),
 * not at construction time, and every method degrades to a no-op when
 * AudioContext isn't available (e.g. the test runner) instead of throwing.
 * Mute state is persisted via the injected storage (defaults to
 * localStorage) so it survives a page reload.
 */
export function createSfxPlayer(
  audioContextCtor: AudioContextCtor | undefined = resolveAudioContextCtor(),
  storage: Pick<Storage, "getItem" | "setItem"> = typeof localStorage !== "undefined" ? localStorage : noopStorage,
): SfxPlayer {
  let ctx: AudioContext | null = null;
  let muted = storage.getItem(MUTE_STORAGE_KEY) === "true";

  function ensureContext(): AudioContext | null {
    if (!audioContextCtor) return null;
    if (!ctx) ctx = new audioContextCtor();
    return ctx;
  }

  function playTone(frequency: number, durationMs: number, peakGain: number): void {
    if (muted) return;
    const audioCtx = ensureContext();
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000);
  }

  return {
    tick(): void {
      playTone(220, 90, 0.08);
    },
    chime(): void {
      playTone(660, 340, 0.12);
    },
    toggleMute(): boolean {
      muted = !muted;
      storage.setItem(MUTE_STORAGE_KEY, String(muted));
      return muted;
    },
    isMuted(): boolean {
      return muted;
    },
  };
}
