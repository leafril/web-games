import type * as Phaser from "phaser";

import { GAME_HEADING_FONT_FAMILY } from "@/lib/fonts";
import { PORTRAIT_GAME_WIDTH, PORTRAIT_GAME_HEIGHT } from "./dimensions";

const STEP_INTERVAL_MS = 800;
const POP_DURATION_MS = 120;
const POP_SCALE = 1.3;
const GO_FADE_DURATION_MS = 400;
const GO_FADE_SCALE = 1.5;
const OVERLAY_ALPHA = 0.3;

/** 카운트다운 색 — 흰 글자 + brown900 외곽선(HUD 와 통일). */
export const COUNTDOWN_PALETTE = {
  text: "#FFFFFF",
  go: "#FFFFFF",
  stroke: "#3E2723",
} as const;

export type CountdownStyle = {
  seconds: number;
  depth: number;
  fontSize: number;
  color: string;
  goColor: string;
  stroke: string;
  strokeThickness: number;
  overlayColor: number;
  /** overlay 투명도. 0 이면 overlay 자체를 그리지 않음. */
  overlayAlpha?: number;
  worldWidth?: number;
  worldHeight?: number;
};

/** 3·2·1·GO! 카운트다운. onComplete 후 게임 시작. */
export const playCountdown = (
  scene: Phaser.Scene,
  style: CountdownStyle,
  onComplete: () => void,
): Phaser.Time.TimerEvent => {
  const worldWidth = style.worldWidth ?? PORTRAIT_GAME_WIDTH;
  const worldHeight = style.worldHeight ?? PORTRAIT_GAME_HEIGHT;
  const overlayAlpha = style.overlayAlpha ?? OVERLAY_ALPHA;
  const overlay =
    overlayAlpha > 0
      ? scene.add
          .rectangle(
            worldWidth / 2,
            worldHeight / 2,
            worldWidth,
            worldHeight,
            style.overlayColor,
            overlayAlpha,
          )
          .setDepth(style.depth - 1)
      : null;

  let count = style.seconds;
  const countText = scene.add
    .text(worldWidth / 2, worldHeight / 2, String(count), {
      fontFamily: GAME_HEADING_FONT_FAMILY,
      fontSize: `${style.fontSize}px`,
      color: style.color,
      stroke: style.stroke,
      strokeThickness: style.strokeThickness,
    })
    .setOrigin(0.5)
    .setDepth(style.depth);

  return scene.time.addEvent({
    delay: STEP_INTERVAL_MS,
    repeat: count - 1,
    callback: () => {
      if (!scene.scene.isActive(scene.scene.key)) {
        return;
      }
      count--;
      if (count > 0) {
        countText.setText(String(count));
        countText.setScale(1);
        scene.tweens.add({
          targets: countText,
          scale: POP_SCALE,
          duration: POP_DURATION_MS,
          yoyo: true,
          ease: "Back.easeOut",
        });
        return;
      }
      countText.setText("GO!");
      countText.setColor(style.goColor);
      const fadeTargets = overlay ? [countText, overlay] : [countText];
      scene.tweens.add({
        targets: fadeTargets,
        alpha: 0,
        scale: GO_FADE_SCALE,
        duration: GO_FADE_DURATION_MS,
        ease: "Power2",
        onComplete: function cleanupCountdown() {
          if (!scene.scene.isActive()) {
            return;
          }
          countText.destroy();
          overlay?.destroy();
          onComplete();
        },
      });
    },
  });
};
