import * as Phaser from "phaser";

import { CHAIN } from "../config/chain";
import { getGameFont } from "../config/fonts";

/**
 * 콤보·큰 과일 칭찬 — 연쇄가 끝났을 때 콤보 3+ 또는 그 연쇄 최고 과일 6단계+(idx≥5)면 통 상단에
 * "{형용사} {명사}!"(영어)가 scale punch 로 떠 잠깐 머문 뒤 위로 떠 페이드한다. 형용사는 강도별
 * 그룹에서 랜덤으로 골라 다양하게 노출(형용사 학습). 명사는 과일이 있으면 과일 이름(CHAIN.en),
 * 없으면 "Combo". 좌표는 호출부가 통 상단(world)으로 넘긴다. 색·문구·timing 을 여기서만 만진다.
 */
const HOLD_MS = 1200;
const FADE_OUT_MS = 320;

/** 강도별 형용사 — 콤보·과일이 클수록 센 그룹. 그룹 내 랜덤으로 매번 다른 형용사를 보여준다. */
const ADJECTIVES = [
  ["Big", "Good", "Nice"], // 0 약
  ["Great", "Sweet", "Juicy"], // 1 중
  ["Awesome", "Huge", "Amazing"], // 2 강
] as const;

/** 강도별 색 — 약(노랑)·중(주황)·강(핑크). */
const STRENGTH_COLORS = ["#ffd34d", "#ff7a1a", "#ff3b6a"] as const;

/** 콤보 수 → 강도(미달 -1). 3-4 약 / 5-6 중 / 7+ 강. */
const comboStrength = (combo: number) =>
  combo >= 7 ? 2 : combo >= 5 ? 1 : combo >= 3 ? 0 : -1;

/** 과일 인덱스 → 강도(6단계 미만 -1). idx 5-6 약 / 7-8 중 / 9-10 강. */
const fruitStrength = (idx: number) =>
  idx >= 9 ? 2 : idx >= 7 ? 1 : idx >= 5 ? 0 : -1;

export const playComboPraise = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  combo: number,
  bestFruitIdx: number,
) => {
  const strength = Math.max(
    comboStrength(combo),
    fruitStrength(bestFruitIdx),
    0,
  );
  const group = ADJECTIVES[strength];
  const adjective = group[Phaser.Math.Between(0, group.length - 1)];
  const noun = bestFruitIdx >= 5 ? CHAIN[bestFruitIdx].en : "Combo";
  const message = `${adjective} ${noun}!`;
  const color = STRENGTH_COLORS[strength];

  const text = scene.add
    .text(x, y, message, {
      fontFamily: getGameFont(),
      fontSize: "64px",
      color,
      fontStyle: "bold",
      stroke: "#ffffff",
      strokeThickness: 8,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(40)
    .setScale(0.3);

  // 등장 — overshoot 펀치로 톡 튀어오른다.
  scene.tweens.add({
    targets: text,
    scale: 1,
    ease: "Back.easeOut",
    duration: 340,
  });

  // 등장 자리 사방으로 반짝이 — 강도 높을수록 많이·멀리.
  const sparkCount = 6 + strength * 3;
  for (let i = 0; i < sparkCount; i++) {
    const angle =
      (Math.PI * 2 * i) / sparkCount + Phaser.Math.FloatBetween(-0.3, 0.3);
    const dist = 70 + strength * 18;
    const spark = scene.add.circle(x, y, 6, 0xfff1a8).setDepth(39);
    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scale: 0.2,
      duration: 460,
      ease: "Cubic.Out",
      onComplete: () => spark.destroy(),
    });
  }

  // 머문 뒤 위로 떠 페이드 → 제거.
  scene.time.delayedCall(HOLD_MS, () => {
    scene.tweens.add({
      targets: text,
      alpha: 0,
      y: y - 48,
      duration: FADE_OUT_MS,
      ease: "Sine.Out",
      onComplete: () => text.destroy(),
    });
  });

  return adjective; // 음성 재생용 — 표시된 형용사와 같은 클립을 호출부가 재생한다.
};
