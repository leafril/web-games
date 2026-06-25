import * as Phaser from "phaser";

import { getGameFont } from "../config/fonts";

/**
 * 매달린 과일 위에 영어 단어 라벨을 spring pop 으로 띄운다 — tower-battle animalCallout
 * 과 동일한 디자인·등장 방식. 스폰 순간 시선이 과일에 가 있을 때 같은 자리에 단어가
 * 등장 → 시각·청각 결합. 라벨은 과일을 따라가다 hold 후 fade-out·destroy(스폰마다 1회).
 */

// 색은 tower-battle palette.ink 와 동일 값(흰 글자 + 짙은 갈색 외곽선). 테마 결합을 피해 직접 박음.
const LABEL_COLOR = "#ffffff";
const LABEL_STROKE = "#3E2723";

const LABEL_FONT_SIZE_PX = 67;
const LABEL_STROKE_THICKNESS = 10;
/** 매달림 과일 윗면 ↔ 라벨 아랫면 간격. */
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

export const playWordCallout = (
  scene: Phaser.Scene,
  target: FollowTarget,
  word: string,
): void => {
  const dpr = (scene.registry.get("dpr") as number) ?? 1;

  const label = scene.add
    .text(target.x, target.y - target.displayHeight / 2 - LABEL_GAP_PX, word, {
      fontFamily: getGameFont(),
      fontSize: `${LABEL_FONT_SIZE_PX}px`,
      color: LABEL_COLOR,
      stroke: LABEL_STROKE,
      strokeThickness: LABEL_STROKE_THICKNESS,
      resolution: dpr,
    })
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
