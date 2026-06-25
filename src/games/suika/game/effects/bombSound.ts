import type * as Phaser from "phaser";

import ExplosionSfx from "../assets/Explosion.wav";

/**
 * 파인애플 폭탄 폭파음 — 탭 폭발 순간 1회. 교체 가능한 단위(볼륨·클립을 여기서만 만진다).
 */
const SOUND_KEY = "bomb-explosion";
const VOLUME = 0.6;

/** Scene.preload 에서 1회 호출. */
export const preloadBombSound = (scene: Phaser.Scene) => {
  scene.load.audio(SOUND_KEY, ExplosionSfx);
};

export const playBombSound = (scene: Phaser.Scene) => {
  scene.sound.play(SOUND_KEY, { volume: VOLUME });
};
