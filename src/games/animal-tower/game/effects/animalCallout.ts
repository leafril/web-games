import * as Phaser from "phaser";

import { GAME_HEADING_FONT_FAMILY } from "@/lib/fonts";
import { palette } from "../config/theme";

const LABEL_FONT_SIZE_PX = 67;
const LABEL_STROKE_THICKNESS = 10;
/** 매달림 블록 윗면 ↔ 라벨 아랫면 간격. */
const LABEL_GAP_PX = 34;
const LABEL_DEPTH = 50;

const POP_IN_MS = 280;
const POP_OVERSHOOT_SCALE = 1.15;
const SETTLE_MS = 140;
const SETTLE_SCALE = 1.0;
const HOLD_MS = 1200;
const FADE_OUT_MS = 400;

type FollowTarget = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform & { displayHeight: number };

/**
 * 매달림 동물 위에 동물 이름 라벨을 spring pop 으로 띄운다.
 * 시선이 동물에 가 있는 동안 같은 위치에 이름이 등장 → 시각·청각 결합 강화.
 * 라벨은 매달림 블록을 따라가다가 일정 시간 뒤 fade-out 후 자동 destroy.
 */
export const playAnimalCallout = (
  scene: Phaser.Scene,
  target: FollowTarget,
  animalName: string,
): void => {
  const dpr = (scene.registry.get("dpr") as number) ?? 1;

  const label = scene.add
    .text(
      target.x,
      target.y - target.displayHeight / 2 - LABEL_GAP_PX,
      animalName,
      {
        fontFamily: GAME_HEADING_FONT_FAMILY,
        fontSize: `${LABEL_FONT_SIZE_PX}px`,
        color: palette.ink.inverse,
        stroke: palette.ink.stroke,
        strokeThickness: LABEL_STROKE_THICKNESS,
        resolution: dpr,
      },
    )
    .setOrigin(0.5, 1)
    .setDepth(LABEL_DEPTH)
    .setAlpha(0)
    .setScale(0.5);

  const followTarget = () => {
    if (!target.active) {
      return;
    }
    label.x = target.x;
    label.y = target.y - target.displayHeight / 2 - LABEL_GAP_PX;
  };

  scene.events.on(Phaser.Scenes.Events.PRE_UPDATE, followTarget);

  const cleanup = () => {
    scene.events.off(Phaser.Scenes.Events.PRE_UPDATE, followTarget);
    label.destroy();
  };

  scene.add
    .timeline([
      {
        at: 0,
        tween: {
          targets: label,
          scale: POP_OVERSHOOT_SCALE,
          alpha: 1,
          duration: POP_IN_MS,
          ease: "Back.Out",
        },
      },
      {
        at: POP_IN_MS,
        tween: {
          targets: label,
          scale: SETTLE_SCALE,
          duration: SETTLE_MS,
          ease: "Sine.Out",
        },
      },
      {
        at: POP_IN_MS + SETTLE_MS + HOLD_MS,
        tween: {
          targets: label,
          alpha: 0,
          duration: FADE_OUT_MS,
          ease: "Sine.Out",
        },
      },
      {
        at: POP_IN_MS + SETTLE_MS + HOLD_MS + FADE_OUT_MS,
        run: cleanup,
      },
    ])
    .play();
};
