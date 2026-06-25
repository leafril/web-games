import * as Phaser from "phaser";

/**
 * 머지 끌어당김 — 머지되는 두 과일의 복제 그림(물리 없음)이 중간점으로 빠르게 빨려들며
 * 세로로 납작하게 눌리고(squash) 사라진다. 진짜 과일·새 과일 로직은 호출부에서 즉시
 * 처리하고, 이 연출은 그 위에 겹쳐 "서로 눌러 합쳐졌다"는 인상을 준다. 세로 납작 방향은
 * 뒤이어 등장하는 새 과일(mergePunch)의 squash 시작과 맞춰 "눌림 → 솟음" 흐름으로 잇는다.
 * ease "Back.In" 으로 살짝 뒤로 당겼다 확 빨려듦.
 *
 * 교체 가능한 단위: timing·ease·squash 비율을 여기서만 만진다.
 */
/** 끌어당김 시간 — 호출부가 이 뒤에 새 과일을 등장시키도록 공유한다. */
export const MERGE_PULL_MS = 170;
const END_SCALE_X = 0.81; // 끌려들며 가로는 살짝만 줄고
const END_SCALE_Y = 0.42; // 세로로 납작하게 눌린다(squash)

export const playMergePull = (
  scene: Phaser.Scene,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  mx: number,
  my: number,
  textureKey: string,
  displaySize: number,
) => {
  const make = (x: number, y: number) => {
    const img = scene.add.image(x, y, textureKey).setDepth(6);
    img.setDisplaySize(displaySize, displaySize);
    return img;
  };

  const pull = (img: Phaser.GameObjects.Image) => {
    scene.tweens.add({
      targets: img,
      x: mx,
      y: my,
      scaleX: img.scaleX * END_SCALE_X,
      scaleY: img.scaleY * END_SCALE_Y,
      alpha: 0.6,
      duration: MERGE_PULL_MS,
      ease: "Back.In",
      onComplete: () => img.destroy(),
    });
  };

  pull(make(ax, ay));
  pull(make(bx, by));
};
