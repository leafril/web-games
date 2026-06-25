import * as Phaser from "phaser";

/**
 * 드롭 가이드라인 — 매달린 과일에서 착지 예상 지점까지 단순한 흰 세로 실선.
 * 그리는 시점·좌표(언제, 어디)는 Scene 이 소유하고, 여기선 한 번의 draw 만 담당(자기완결).
 * world 좌표에 그리므로 graphics 는 scrollFactor 1(기본) — 카메라 스크롤 자동 추종.
 */
const GUIDE_COLOR = 0xffffff; // 흰 실선

export const GUIDE_TUNING = {
  lineWidth: 5, // 실선 두께
  lineAlpha: 0.85,
} as const;

/**
 * @param x 가이드 세로선 x (= 떨어질 과일 x)
 * @param fromY 선 시작 y (매달린 과일 아랫면)
 * @param toY 선 끝 y (= 떨어질 과일이 안착할 지점)
 */
export const drawDropGuide = (
  gfx: Phaser.GameObjects.Graphics,
  x: number,
  fromY: number,
  toY: number,
) => {
  gfx.clear();
  if (toY <= fromY) {
    return; // 안착 지점이 매달린 과일보다 위 — 통이 거의 가득. 가이드 생략.
  }
  gfx.lineStyle(GUIDE_TUNING.lineWidth, GUIDE_COLOR, GUIDE_TUNING.lineAlpha);
  gfx.lineBetween(x, fromY, x, toY);
};
