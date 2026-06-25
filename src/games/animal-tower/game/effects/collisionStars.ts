import * as Phaser from "phaser";

import { paletteHex } from "../config/theme";

const STAR_COUNT = 4;
/** 별 외접 반지름 — 4개 burst 라 너무 빽빽하지 않게 작게. */
const STAR_OUTER_RADIUS_PX = 14;
const STAR_INNER_RADIUS_PX = 6;
/** 게임 공용 파스텔 6톤 (toneSet.pastel6). burst 마다 한 색을 랜덤 선택. */
const STAR_COLOR_PALETTE = paletteHex.toneSet.pastel6;
const STAR_DURATION_MS = 700;
const STAR_DISTANCE_PX = 60;
/** 동물·좌대보다 위, HUD 보다 아래에 그려지도록. */
const STAR_DEPTH = 50;

/**
 * 충돌 지점에서 별 4개가 외향으로 흩뿌려지며 회전·페이드.
 * Matter collisionstart 한 번 당 한 burst.
 */
export const playCollisionStars = (
  scene: Phaser.Scene,
  x: number,
  y: number,
): void => {
  for (let i = 0; i < STAR_COUNT; i += 1) {
    const angle = (i / STAR_COUNT) * Math.PI * 2 + Math.random() * 0.5;
    const colorIndex = Math.floor(Math.random() * STAR_COLOR_PALETTE.length);
    const color = STAR_COLOR_PALETTE[colorIndex] ?? STAR_COLOR_PALETTE[0];
    const star = scene.add
      .star(x, y, 5, STAR_INNER_RADIUS_PX, STAR_OUTER_RADIUS_PX, color)
      .setDepth(STAR_DEPTH);
    const targetX = x + Math.cos(angle) * STAR_DISTANCE_PX;
    const targetY = y + Math.sin(angle) * STAR_DISTANCE_PX;
    scene.tweens.add({
      targets: star,
      x: targetX,
      y: targetY,
      alpha: 0,
      scale: 0.3,
      angle: (Math.random() > 0.5 ? 1 : -1) * 360,
      duration: STAR_DURATION_MS,
      ease: "Cubic.Out",
      onComplete: () => star.destroy(),
    });
  }
};
