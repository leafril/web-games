import * as Phaser from "phaser";

import {
  PORTRAIT_GAME_HEIGHT,
  PORTRAIT_GAME_WIDTH,
} from "@/games/animal-tower/engine/dimensions";
import { buildConfettiPieces } from "@/games/animal-tower/engine/confetti";

/** 마일스톤 텍스트(60) 바로 아래, 블록·동물보다는 앞. */
const CONFETTI_DEPTH = 58;
/** 퀴즈 콘페티(42조각) 배치 반복 수 — 마일스톤은 더 풍성하게. */
const CONFETTI_VOLUME = 3;
/** 비행 시간 배수 (작을수록 빠름). 1 = 퀴즈 원본 속도. */
const SPEED_FACTOR = 1;
/** 각 조각 궤적을 발사 방향에서 ±이 각도만큼 무작위 회전 → 발사 위치·방향은 유지하고 부채꼴(방사각)만 넓힌다. */
const SPREAD_ANGLE_DEG = 35;

/**
 * 결과 화면 퀴즈 콘페티의 Y 포물선 키프레임 (resultScreen.css `quizConfettiYRot`).
 * t(0~1) → fy 배수. 0 에서 위로 솟아 40% 에 -0.8fy(정점), 다시 +fy 로 낙하 = 캐넌.
 */
const Y_KEYS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.1, -0.35],
  [0.2, -0.6],
  [0.3, -0.75],
  [0.4, -0.8],
  [0.5, -0.75],
  [0.6, -0.6],
  [0.7, -0.35],
  [0.8, 0],
  [0.9, 0.45],
  [1, 1],
];

const lerpKeys = (
  keys: ReadonlyArray<readonly [number, number]>,
  t: number,
): number => {
  for (let i = 1; i < keys.length; i += 1) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * f;
    }
  }
  return keys[keys.length - 1][1];
};

/** 퀴즈 콘페티 opacity 타이밍 — 0~3% fade-in, 93~100% fade-out. */
const alphaFor = (t: number): number => {
  if (t < 0.03) {
    return t / 0.03;
  }
  if (t > 0.93) {
    return (1 - t) / 0.07;
  }
  return 1;
};

/**
 * 마일스톤 콘페티 — 결과 화면 퀴즈 정답 콘페티(`buildConfettiPieces` + `resultScreen.css`
 * 모션)를 **위치·물리까지 그대로** 복제한다. 화면 고정(scrollFactor 0): 좌/우 가장자리
 * 중앙 높이에서 발사 → X 등속, Y 포물선(솟았다 낙하), 등속 회전.
 */
export const playMilestoneConfetti = (scene: Phaser.Scene): void => {
  const originY = PORTRAIT_GAME_HEIGHT * 0.5;
  const pieces = Array.from({ length: CONFETTI_VOLUME }, () =>
    buildConfettiPieces(),
  ).flat();
  pieces.forEach((piece) => {
    const originX = piece.side === "left" ? 0 : PORTRAIT_GAME_WIDTH;
    const color = Phaser.Display.Color.HexStringToColor(piece.color).color;
    const rect = scene.add
      .rectangle(originX, originY, piece.w, piece.h, color)
      .setScrollFactor(0)
      .setDepth(CONFETTI_DEPTH)
      .setAlpha(0);
    // 궤적 전체를 ±SPREAD_ANGLE_DEG 안에서 무작위 회전 → 발사 위치·방향 유지, 부채꼴만 넓힘.
    const spread =
      (Math.random() * 2 - 1) * Phaser.Math.DegToRad(SPREAD_ANGLE_DEG);
    const cos = Math.cos(spread);
    const sin = Math.sin(spread);
    const progress = { t: 0 };
    scene.tweens.add({
      targets: progress,
      t: 1,
      duration: piece.dur * 1000 * SPEED_FACTOR,
      delay: piece.delay * 1000 * SPEED_FACTOR,
      ease: "Linear",
      onUpdate: () => {
        const t = progress.t;
        const dx = piece.fx * t;
        const dy = piece.fy * lerpKeys(Y_KEYS, t);
        rect.x = originX + dx * cos - dy * sin;
        rect.y = originY + dx * sin + dy * cos;
        rect.rotation = Phaser.Math.DegToRad(piece.rot * t);
        rect.alpha = alphaFor(t);
      },
      onComplete: () => rect.destroy(),
    });
  });
};
