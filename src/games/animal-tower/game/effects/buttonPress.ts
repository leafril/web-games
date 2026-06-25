import * as Phaser from "phaser";

const PRESS_SCALE = 0.92;
const PRESS_DOWN_MS = 60;
const PRESS_UP_MS = 140;

export const attachButtonPress = (
  scene: Phaser.Scene,
  trigger: Phaser.GameObjects.GameObject,
  tweenTarget: Phaser.GameObjects.GameObject,
  onPress: () => void,
  options?: {
    /** pointerdown/up·out 에 맞춰 호출 — 배경 색 swap 등 시각 변화 hook. */
    onPressedChange?: (pressed: boolean) => void;
  },
): void => {
  const popBack = () => {
    scene.tweens.killTweensOf(tweenTarget);
    scene.tweens.add({
      targets: tweenTarget,
      scale: 1,
      duration: PRESS_UP_MS,
      ease: "Back.Out",
    });
    options?.onPressedChange?.(false);
  };
  trigger.on("pointerdown", () => {
    scene.tweens.killTweensOf(tweenTarget);
    scene.tweens.add({
      targets: tweenTarget,
      scale: PRESS_SCALE,
      duration: PRESS_DOWN_MS,
      ease: "Power1",
    });
    options?.onPressedChange?.(true);
    onPress();
  });
  trigger.on("pointerup", popBack);
  trigger.on("pointerout", popBack);
};
