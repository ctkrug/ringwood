import { describe, expect, it } from "vitest";
import { createSfxPlayer } from "../src/audio/sfx";

function createFakeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

class FakeGainParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeOscillator {
  type = "sine";
  frequency = { value: 0 };
  started = false;
  stopped = false;
  connect() {}
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
}

class FakeAudioContext {
  static instances = 0;
  currentTime = 0;
  oscillatorsCreated = 0;
  constructor() {
    FakeAudioContext.instances += 1;
  }
  createOscillator() {
    this.oscillatorsCreated += 1;
    return new FakeOscillator();
  }
  createGain() {
    return { gain: new FakeGainParam(), connect: () => {} };
  }
}

describe("createSfxPlayer", () => {
  it("does not construct an AudioContext until the first sound plays", () => {
    FakeAudioContext.instances = 0;
    const storage = createFakeStorage();
    createSfxPlayer(FakeAudioContext as unknown as new () => AudioContext, storage);
    expect(FakeAudioContext.instances).toBe(0);
  });

  it("lazily creates one AudioContext on first tick and reuses it", () => {
    FakeAudioContext.instances = 0;
    const storage = createFakeStorage();
    const player = createSfxPlayer(FakeAudioContext as unknown as new () => AudioContext, storage);
    player.tick();
    player.tick();
    player.chime();
    expect(FakeAudioContext.instances).toBe(1);
  });

  it("does not play a tone while muted", () => {
    FakeAudioContext.instances = 0;
    const storage = createFakeStorage();
    const player = createSfxPlayer(FakeAudioContext as unknown as new () => AudioContext, storage);
    player.toggleMute();
    expect(player.isMuted()).toBe(true);
    player.tick();
    expect(FakeAudioContext.instances).toBe(0);
  });

  it("persists mute state via the injected storage", () => {
    const storage = createFakeStorage();
    const player = createSfxPlayer(FakeAudioContext as unknown as new () => AudioContext, storage);
    player.toggleMute();
    expect(storage.getItem("ringwood:muted")).toBe("true");

    const reloaded = createSfxPlayer(FakeAudioContext as unknown as new () => AudioContext, storage);
    expect(reloaded.isMuted()).toBe(true);
  });

  it("does not throw and no-ops when AudioContext is unavailable", () => {
    const storage = createFakeStorage();
    const player = createSfxPlayer(undefined, storage);
    expect(() => player.tick()).not.toThrow();
    expect(() => player.chime()).not.toThrow();
  });

  it("toggleMute flips and returns the new state each call", () => {
    const storage = createFakeStorage();
    const player = createSfxPlayer(FakeAudioContext as unknown as new () => AudioContext, storage);
    expect(player.toggleMute()).toBe(true);
    expect(player.toggleMute()).toBe(false);
  });
});
