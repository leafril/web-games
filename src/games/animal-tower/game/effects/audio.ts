import * as Phaser from "phaser";

import { playTone } from "@/games/animal-tower/engine/webAudio";
import { SOUNDS } from "../config/assetKeys";

/** 동물 등장 "펑" 효과음 볼륨 (다운로드 에셋 SpawnPoof.mp3). */
const SPAWN_VOLUME = 0.6;

const RELEASE_FREQ_HZ = 220;
const RELEASE_DURATION_S = 0.06;
const RELEASE_GAIN = 0.15;

/** 5m 마일스톤 돌파 — 짧은 상승 아르페지오로 성취감 강조. */
const MILESTONE_FREQS_HZ = [660, 880, 1320];
const MILESTONE_STEP_MS = 80;
const MILESTONE_DURATION_S = 0.12;
const MILESTONE_GAIN = 0.18;

/** 동물 등장 — "펑" 연기 효과음(PreloadScene 에서 로드한 에셋 재생). */
export const playSpawnSound = (scene: Phaser.Scene): void => {
  if (!scene.cache.audio.exists(SOUNDS.spawnPoof)) {
    return;
  }
  scene.sound.play(SOUNDS.spawnPoof, { volume: SPAWN_VOLUME });
};

export const playReleaseSound = (): void => {
  playTone(RELEASE_FREQ_HZ, RELEASE_DURATION_S, "triangle", RELEASE_GAIN);
};

/** rotate 버튼 — 가벼운 틱. */
const ROTATE_FREQ_HZ = 560;
const ROTATE_DURATION_S = 0.05;
const ROTATE_GAIN = 0.12;

export const playRotateSound = (): void => {
  playTone(ROTATE_FREQ_HZ, ROTATE_DURATION_S, "triangle", ROTATE_GAIN);
};

/** change(교체) 버튼 — 두 음 빠른 상승으로 "바뀜" 느낌. */
const CHANGE_FREQS_HZ = [494, 740];
const CHANGE_STEP_MS = 45;
const CHANGE_DURATION_S = 0.06;
const CHANGE_GAIN = 0.13;

export const playChangeSound = (): void => {
  CHANGE_FREQS_HZ.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, CHANGE_DURATION_S, "triangle", CHANGE_GAIN);
    }, i * CHANGE_STEP_MS);
  });
};

export const playMilestoneSound = (): void => {
  MILESTONE_FREQS_HZ.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, MILESTONE_DURATION_S, "sine", MILESTONE_GAIN);
    }, i * MILESTONE_STEP_MS);
  });
};
