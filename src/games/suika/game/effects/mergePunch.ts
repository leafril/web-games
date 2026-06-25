import * as Phaser from "phaser";

/**
 * 머지 펀치(squash & stretch pop) — 교체 가능한 단위.
 *
 * Matter.Image 를 직접 setScale 하면 물리 바디까지 스케일돼 흔들리므로, 진짜 과일
 * 스프라이트를 잠깐 숨기고 **물리 없는 오버레이 이미지**를 같은 자리·크기로 띄운다.
 * 합쳐진 두 과일이 납작하게 눌린(squash) 자리에서 새 과일이 태어나는 인상을 위해,
 * **작고 납작한 상태**에서 시작해 (1) 길쭉하게 솟구쳤다(stretch) (2) 정상 비율로 안착한다.
 * mergePull 의 세로 납작 squash 와 방향을 맞춰 "눌림 → 솟음" 흐름이 이어진다.
 * 바디는 풀스케일 고정이라 물리 무손상. 펀치 중 과일은 물리로 이동하므로 오버레이가
 * 위치를 추적한다(reveal 점프 방지).
 *
 * 느낌 조정은 MERGE_PUNCH_CONFIG, 완전 교체는 playMergePunch 통째.
 */

export const MERGE_PUNCH_CONFIG = {
  startScale: 0.6, // 등장 시 전체 크기 배율(약간 축소된 채 태어남)
  startSquashX: 1.25, // 시작 가로 퍼짐(납작하게 눌린 상태)
  startSquashY: 0.62, // 시작 세로 눌림(squash)
  riseMs: 190, // (1) 납작 → 길쭉(stretch) 솟는 시간
  riseEase: "Quad.easeOut",
  stretchX: 0.91, // 솟을 때 가로(살짝 홀쭉)
  stretchY: 1.17, // 솟을 때 세로로 늘어남(stretch)
  settleMs: 260, // (2) 길쭉 → 정상 비율로 안착
  overshoot: 1.85, // 안착 스프링 overshoot(클수록 더 튐)
  depth: 5, // 과일(0) 위 — 펀치 중인 과일이 이웃 위로 보이게
} as const;

const TWEEN_KEY = "punchTween";
const OVERLAY_KEY = "punchOverlay";

export const playMergePunch = (
  scene: Phaser.Scene,
  fruit: Phaser.Physics.Matter.Image,
  textureKey: string,
  displaySize: number,
) => {
  const c = MERGE_PUNCH_CONFIG;
  fruit.setVisible(false);
  const overlay = scene.add
    .image(fruit.x, fruit.y, textureKey)
    .setDepth(c.depth);
  // 실제 과일과 같은 origin → reveal 시 텍스처 점프·깜빡임 방지(origin 오프셋 과일 대응).
  overlay.setOrigin(fruit.originX, fruit.originY);
  overlay.setDisplaySize(displaySize, displaySize);
  const targetX = overlay.scaleX;
  const targetY = overlay.scaleY;
  // 펀치 중 진짜 과일은 물리로 이동하므로 오버레이가 따라가야 reveal 점프 없음.
  const follow = () => {
    if (fruit.scene) {
      overlay.setPosition(fruit.x, fruit.y);
    }
  };

  // 시작: 작고 납작하게 눌린 상태.
  overlay.setScale(
    targetX * c.startScale * c.startSquashX,
    targetY * c.startScale * c.startSquashY,
  );

  // (2) 길쭉 → 정상 비율로 스프링 안착.
  const settle = () => {
    const t = scene.tweens.add({
      targets: overlay,
      scaleX: targetX,
      scaleY: targetY,
      duration: c.settleMs,
      ease: "Back.easeOut",
      easeParams: [c.overshoot],
      onUpdate: follow,
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

  // (1) 납작 → 길쭉하게 솟구침 → onComplete 에서 정상으로 안착.
  const rise = scene.tweens.add({
    targets: overlay,
    scaleX: targetX * c.stretchX,
    scaleY: targetY * c.stretchY,
    duration: c.riseMs,
    ease: c.riseEase,
    onUpdate: follow,
    onComplete: settle,
  });
  fruit.setData(TWEEN_KEY, rise);
  fruit.setData(OVERLAY_KEY, overlay);
};

/**
 * 진행 중인 펀치를 취소한다 — 과일이 머지로 사라질 때 호출. 펀치 오버레이가 과일보다
 * 오래 살아남아 "중간 단계"가 떠 보이는 유령을 제거한다.
 *
 * 즉시 제거한다 — 같은 자리에 머지 pull 복제(빨려들며 squash)가 들어오므로, 오버레이를 더
 * 살리면(squash-out) 같은 과일이 2장 겹쳐 잔상으로 보인다. squash → stretch 리듬은
 * pull(squash) → 다음 punch(stretch)가 이미 만든다.
 */
export const cancelMergePunch = (fruit: Phaser.Physics.Matter.Image) => {
  const tween = fruit.getData(TWEEN_KEY) as Phaser.Tweens.Tween | undefined;
  const overlay = fruit.getData(OVERLAY_KEY) as
    | Phaser.GameObjects.Image
    | undefined;
  tween?.remove();
  overlay?.destroy();
  fruit.setData(TWEEN_KEY, null);
  fruit.setData(OVERLAY_KEY, null);
};
