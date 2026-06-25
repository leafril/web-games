import * as Phaser from "phaser";

import { TEXTURES } from "../config/assetKeys";

/** 손가락 PNG 표시 가로 픽셀. 원본은 600px 가까이라 게임 블록과 어울리도록 축소. */
const FINGER_DISPLAY_WIDTH_PX = 168;
/** 동물·좌대보다 위, HUD(별도 Scene) 보다 아래. collisionStars 와 동일 depth. */
const HINT_DEPTH = 50;

/** 블록 중심 기준 좌우 슬라이드 한쪽 끝까지의 거리. */
const SLIDE_DISTANCE_PX = 84;
/** 한쪽 → 반대쪽 까지의 시간. yoyo 라 왕복은 2배. */
const SLIDE_DURATION_MS = 1400;
const FADE_IN_DURATION_MS = 250;
const FADE_OUT_DURATION_MS = 180;

export type IdleHintController = {
  stop: () => void;
};

/**
 * 매달린 동물 중심 위에 손가락 이미지를 띄우고 좌우로 천천히 슬라이드한다.
 * 호출자는 반환된 controller 의 stop() 으로 즉시 dismiss 할 수 있다 (fade out + destroy).
 */
export const playIdleHint = (
  scene: Phaser.Scene,
  target: Phaser.Physics.Matter.Image,
): IdleHintController => {
  const baseX = target.x;
  const baseY = target.y;

  const finger = scene.add.image(baseX, baseY, TEXTURES.idleHintFinger);
  // 원본 raster 크기에 의존하지 않게 표시 너비 고정. 비율은 자동.
  const aspectRatio = finger.height / finger.width;
  finger.setDisplaySize(
    FINGER_DISPLAY_WIDTH_PX,
    FINGER_DISPLAY_WIDTH_PX * aspectRatio,
  );
  finger.setDepth(HINT_DEPTH);
  finger.setAlpha(0);

  const fadeIn = scene.tweens.add({
    targets: finger,
    alpha: 1,
    duration: FADE_IN_DURATION_MS,
  });

  // 왼쪽 끝에서 출발해 yoyo 로 좌우 반복.
  finger.setX(baseX - SLIDE_DISTANCE_PX);
  const slide = scene.tweens.add({
    targets: finger,
    x: baseX + SLIDE_DISTANCE_PX,
    duration: SLIDE_DURATION_MS,
    ease: "Sine.InOut",
    yoyo: true,
    repeat: -1,
  });

  const stop = () => {
    fadeIn.stop();
    slide.stop();
    scene.tweens.add({
      targets: finger,
      alpha: 0,
      duration: FADE_OUT_DURATION_MS,
      onComplete: () => finger.destroy(),
    });
  };

  return { stop };
};
