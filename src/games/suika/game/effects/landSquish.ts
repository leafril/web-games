import * as Phaser from "phaser";

/**
 * 착지 꿀렁임 — 과일이 다른 과일 위로 떨어져 닿는 순간 눌렸다 튀어오르는 squash & stretch.
 * mergePunch 와 동일하게 **물리 없는 오버레이**로 처리(진짜 과일 setScale 은 바디까지 스케일돼
 * 더미가 흔들리므로). 두 단계: (1) 부드럽게 눌림 → (2) 스프링으로 튀어올라 안착.
 *
 * - 오버레이가 과일의 **위치·회전**을 매 프레임 추적 → swap 시 깜빡·각도 점프 없음(과일은 굴러
 *   회전하므로 필수).
 * - 눌릴 때 **바닥을 고정**(아래로 보정)해 grounded 하게 — 중앙 기준이면 둥둥 뜬 젤리처럼 어색.
 * - 가로↔세로 부피 보존(squashX ≈ 1/squashY).
 */
const SQUISH = {
  squashX: 1.06, // 눌릴 때 가로로 퍼짐(≈ 1/squashY)
  squashY: 0.94, // 세로로 눌림(아주 약하게)
  compressMs: 80, // (1) 눌리는 시간 — 빠르게 들어감
  springMs: 220, // (2) 펴지며 튀어오르는 시간 — 느리게 스프링
  overshoot: 1.2, // 펴질 때 넘쳐 튀어오름(기본 1.70158 보다 작게 = 덜 튐)
  depth: 6, // 과일(0)·층 라벨(5) 위
} as const;

const TWEEN_KEY = "squishTween";
const OVERLAY_KEY = "squishOverlay";

export const playLandSquish = (
  scene: Phaser.Scene,
  fruit: Phaser.Physics.Matter.Image,
  textureKey: string,
  displaySize: number,
) => {
  if (fruit.getData(OVERLAY_KEY)) {
    return; // 이미 squish 중 — 중복 방지
  }
  fruit.setVisible(false);
  const half = displaySize / 2;
  const overlay = scene.add
    .image(fruit.x, fruit.y, textureKey)
    .setDepth(SQUISH.depth);
  // 실제 과일과 같은 origin → 오버레이↔과일 텍스처 위치 일치(swap 시 점프·깜빡임 방지).
  overlay.setOrigin(fruit.originX, fruit.originY);
  overlay.setDisplaySize(displaySize, displaySize);
  overlay.setRotation(fruit.rotation);
  const tx = overlay.scaleX;
  const ty = overlay.scaleY;

  // 과일 위치·회전 추적 + 눌린 만큼 아래로 보정(바닥 고정 → grounded).
  const track = () => {
    if (!fruit.scene) {
      return;
    }
    const shorter = 1 - overlay.scaleY / ty; // 0=정상, 양수=눌림
    overlay.setPosition(fruit.x, fruit.y + shorter * half);
    overlay.setRotation(fruit.rotation);
  };

  const spring = () => {
    const t = scene.tweens.add({
      targets: overlay,
      scaleX: tx,
      scaleY: ty,
      duration: SQUISH.springMs,
      ease: "Back.easeOut",
      easeParams: [SQUISH.overshoot],
      onUpdate: track,
      onComplete: () => {
        overlay.destroy();
        if (fruit.scene) {
          fruit.setVisible(true);
          fruit.setData(TWEEN_KEY, null);
          fruit.setData(OVERLAY_KEY, null);
        }
      },
    });
    fruit.setData(TWEEN_KEY, t);
  };

  // (1) 정상 → 눌림(부드럽게 가속) → (2) onComplete 에서 스프링으로 튀어오름.
  const compress = scene.tweens.add({
    targets: overlay,
    scaleX: tx * SQUISH.squashX,
    scaleY: ty * SQUISH.squashY,
    duration: SQUISH.compressMs,
    ease: "Sine.easeIn",
    onUpdate: track,
    onComplete: spring,
  });
  fruit.setData(TWEEN_KEY, compress);
  fruit.setData(OVERLAY_KEY, overlay);
};

/** 진행 중인 squish 취소 — 과일이 머지/도미노로 사라질 때(오버레이 유령 제거). */
export const cancelLandSquish = (fruit: Phaser.Physics.Matter.Image) => {
  const tween = fruit.getData(TWEEN_KEY) as Phaser.Tweens.Tween | undefined;
  const overlay = fruit.getData(OVERLAY_KEY) as
    | Phaser.GameObjects.Image
    | undefined;
  tween?.remove();
  overlay?.destroy();
  fruit.setData(TWEEN_KEY, null);
  fruit.setData(OVERLAY_KEY, null);
};
