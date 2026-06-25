import * as Phaser from "phaser";

import { TEXTURES } from "../config/assetKeys";
import { paletteHex } from "../config/theme";

/** 한 번 등장에 띄우는 뭉게구름 puff 개수. 겹쳐서 하나의 폭신한 덩어리로 보이게. */
const PUFF_COUNT = 5;
/** puff 시작 가로 = 동물 가로 × 이 비율 (세로는 텍스처 종횡비로 자동). */
const PUFF_START_RATIO = 1.05;
/** puff 가 부풀어 오르는 최대 배율 (시작 대비). */
const PUFF_GROW_SCALE = 1.55;
/** puff 중심을 동물 중심에서 흩는 최대 거리 = 동물 가로 × 이 비율. */
const PUFF_SPREAD_RATIO = 0.3;
/** puff 가 떠오르는 거리 = 동물 가로 × 이 비율. */
const PUFF_RISE_RATIO = 0.25;
const PUFF_START_ALPHA = 0.95;
const PUFF_DURATION_MS = 550;
/** puff 가 파스텔 tint 를 받을 확률. 나머지는 흰색 — 흰색 위주에 파스텔 악센트. */
const PUFF_TINT_CHANCE = 0.35;
/** 흰색 puff (tint 없음). */
const PUFF_WHITE = 0xffffff;
/** 게임 공용 파스텔 6톤 — 악센트 puff 한 색을 랜덤 tint. 흰 구름이라 tint 가 선명히 먹는다. */
const PUFF_TINT_PALETTE = paletteHex.toneSet.pastel6;
/** Cloud.png 종횡비(height/width = 127/189). 표시 세로 = 가로 × 이 값. */
const CLOUD_ASPECT_RATIO = 127 / 189;
/**
 * 동물(매달림 블록, depth 0) 앞에서 퍼졌다 사라지며 동물을 "퐁" 하고 드러내는
 * 매직 poof 연출. HUD 는 별도 Scene 이라 이 depth 와 무관하게 항상 위에 그려진다.
 */
const PUFF_DEPTH = 10;

/**
 * 동물 등장 순간 (x, y) 에 흰색 위주(일부 파스텔) 뭉게구름 puff 를 짧게 터뜨린다. 동물 앞에서
 * 퍼지며 위로 떠오르고 페이드 → 구름이 걷히며 동물이 드러나는 매직 poof.
 * animalWidth 로 puff 크기·확산을 동물 체급에 비례시킨다.
 */
export const playCloudPuff = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  animalWidth: number,
): void => {
  const startWidth = animalWidth * PUFF_START_RATIO;
  const startHeight = startWidth * CLOUD_ASPECT_RATIO;
  const spread = animalWidth * PUFF_SPREAD_RATIO;
  const rise = animalWidth * PUFF_RISE_RATIO;

  for (let i = 0; i < PUFF_COUNT; i += 1) {
    const angle = (i / PUFF_COUNT) * Math.PI * 2 + Math.random() * 0.6;
    const offsetX = Math.cos(angle) * spread * Math.random();
    const offsetY = Math.sin(angle) * spread * Math.random();
    const tintIndex = Math.floor(Math.random() * PUFF_TINT_PALETTE.length);
    const tint =
      Math.random() < PUFF_TINT_CHANCE
        ? (PUFF_TINT_PALETTE[tintIndex] ?? PUFF_TINT_PALETTE[0])
        : PUFF_WHITE;

    const puff = scene.add
      .image(x + offsetX, y + offsetY, TEXTURES.cloud)
      .setDisplaySize(startWidth, startHeight)
      .setTint(tint)
      .setAlpha(PUFF_START_ALPHA)
      .setDepth(PUFF_DEPTH);

    scene.tweens.add({
      targets: puff,
      scaleX: puff.scaleX * PUFF_GROW_SCALE,
      scaleY: puff.scaleY * PUFF_GROW_SCALE,
      y: y + offsetY - rise,
      alpha: 0,
      duration: PUFF_DURATION_MS,
      ease: "Cubic.Out",
      onComplete: () => puff.destroy(),
    });
  }
};
