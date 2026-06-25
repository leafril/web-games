import * as Phaser from "phaser";

import PlipPlop1 from "../assets/PlipPlop1.mp3";
import PlipPlop2 from "../assets/PlipPlop2.mp3";
import PlipPlop3 from "../assets/PlipPlop3.mp3";

/**
 * 머지 효과음 — 물방울 plip/plop 소리. 교체 가능한 단위.
 * burst 마다 셋 중 랜덤 + 미세 피치 변주(rate)로 연달아 머지해도 단조롭지 않게.
 */
const SOUNDS = [
  { key: "merge-plop-1", src: PlipPlop1 },
  { key: "merge-plop-2", src: PlipPlop2 },
  { key: "merge-plop-3", src: PlipPlop3 },
];
const VOLUME = 0.5;

/** Scene.preload 에서 1회 호출. */
export const preloadMergeSounds = (scene: Phaser.Scene) => {
  SOUNDS.forEach((s) => scene.load.audio(s.key, s.src));
};

export const playMergeSound = (scene: Phaser.Scene) => {
  const s = SOUNDS[Phaser.Math.Between(0, SOUNDS.length - 1)];
  scene.sound.play(s.key, {
    volume: VOLUME,
    rate: Phaser.Math.FloatBetween(0.9, 1.12),
  });
};
