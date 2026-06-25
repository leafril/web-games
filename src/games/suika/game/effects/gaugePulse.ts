import * as Phaser from "phaser";

/**
 * 하강 게이지 fill 상승 연출 — 머지로 게이지가 찰 때마다 호출.
 * fill 이 세로로 잠깐 부풀었다 돌아오고(pulse), 밝은 glow 오버레이가 번쩍 사라진다(glow).
 * width 는 Scene 이 매 프레임 보간하므로 여기선 건드리지 않는다(scaleY·alpha 만).
 */
export const playGaugePulse = (
  scene: Phaser.Scene,
  fill: Phaser.GameObjects.Rectangle,
  glow: Phaser.GameObjects.Rectangle,
) => {
  scene.tweens.killTweensOf(fill);
  fill.setScale(1, 1);
  scene.tweens.add({
    targets: fill,
    scaleY: 1.6,
    duration: 90,
    ease: "Back.easeOut",
    yoyo: true,
  });

  scene.tweens.killTweensOf(glow);
  glow.setAlpha(0.55);
  scene.tweens.add({
    targets: glow,
    alpha: 0,
    duration: 280,
    ease: "Cubic.easeOut",
  });
};
