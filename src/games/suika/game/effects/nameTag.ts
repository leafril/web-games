import * as Phaser from "phaser";

import { getGameFont } from "../config/fonts";

/**
 * 6단계+ 과일이 머지로 만들어졌을 때 그 과일 옆에 단어 이름표를 띄운다 — 콤보당 1회, 최고 단계만
 * (호출부가 판정). 과일이 화면 우측이면 왼쪽에, 좌측이면 오른쪽에 붙어 화면 밖으로 나가지 않게
 * 하고 과일을 따라간다. wordCallout 과 같은 등장(spring pop)·hold·fade 리듬, 자리만 과일 옆.
 */

// 색은 wordCallout 과 동일(흰 글자 + 짙은 갈색 외곽선) — 같은 단어 라벨 톤.
const LABEL_COLOR = "#ffffff";
const LABEL_STROKE = "#3E2723";

const LABEL_FONT_SIZE_PX = 56;
const LABEL_STROKE_THICKNESS = 9;
/** 과일 옆면 ↔ 이름표 사이 간격. 과일 이미지의 투명 여백 탓에 displayWidth 기준이라 작게 둔다. */
const SIDE_GAP_PX = 6;
const LABEL_DEPTH = 50;

const POP_IN_MS = 280;
const POP_OVERSHOOT_SCALE = 1.15;
const SETTLE_MS = 140;
const SETTLE_SCALE = 1.0;
const HOLD_MS = 1400;
const FADE_OUT_MS = 400;

type FollowTarget = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform & {
    displayHeight: number;
    displayWidth: number;
  };

export const playNameTag = (
  scene: Phaser.Scene,
  target: FollowTarget,
  word: string,
  viewW: number,
): void => {
  const dpr = (scene.registry.get("dpr") as number) ?? 1;
  // 과일이 화면 우측이면 왼쪽(-1), 좌측이면 오른쪽(+1)에 — 과일 쪽 변을 기준점으로 잡아 바깥으로 자란다.
  const onRightHalf = target.x > viewW / 2;
  const side = onRightHalf ? -1 : 1;
  const originX = onRightHalf ? 1 : 0;

  const tagX = (t: FollowTarget) =>
    t.x + side * (t.displayWidth / 2 + SIDE_GAP_PX);

  const label = scene.add
    .text(tagX(target), target.y, word, {
      fontFamily: getGameFont(),
      fontSize: `${LABEL_FONT_SIZE_PX}px`,
      color: LABEL_COLOR,
      stroke: LABEL_STROKE,
      strokeThickness: LABEL_STROKE_THICKNESS,
      resolution: dpr,
    })
    .setOrigin(originX, 0.5)
    .setDepth(LABEL_DEPTH)
    .setAlpha(0)
    .setScale(0.5);

  const followTarget = () => {
    if (!target.active) {
      return;
    }
    label.x = tagX(target);
    label.y = target.y;
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
