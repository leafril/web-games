import * as Phaser from "phaser";

const POP_DURATION_MS = 240;
/** rest scale 대비 시작 비율. */
const POP_FROM_RATIO = 0.4;

type ScaleTarget = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform;

/**
 * target 이 현재 가지고 있는 rest scale 을 끝점으로 두고, 그 비율로 부풀리는 spring
 * pop 을 적용한다. setDisplaySize 등으로 sprite 가 1 이 아닌 scale 로 세팅된 경우에도
 * 그 scale 을 보존한다.
 */
export const playSpawnPop = (
  scene: Phaser.Scene,
  target: ScaleTarget,
): void => {
  const restScaleX = target.scaleX;
  const restScaleY = target.scaleY;
  scene.tweens.add({
    targets: target,
    scaleX: { from: restScaleX * POP_FROM_RATIO, to: restScaleX },
    scaleY: { from: restScaleY * POP_FROM_RATIO, to: restScaleY },
    duration: POP_DURATION_MS,
    ease: "Back.Out",
  });
};
