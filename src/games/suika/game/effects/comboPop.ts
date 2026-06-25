import * as Phaser from "phaser";

import { getGameFont } from "../config/fonts";
import { COMBO_PULSE_TUNING } from "./comboTuning";

/**
 * 콤보 팝 — 머지 자리(world 좌표) 위에 "x{n}" 이 톡 등장해 squash & stretch pulse
 * (가로↔세로 반대로 쫄깃하게 빠른 맥동)한 뒤 위로 떠오르며 페이드. 색은 팔레트 중 랜덤,
 * 콤보 숫자 클수록 크다(heat). 등장 자리엔 스파클이 튄다.
 *
 * 위치별로 머지 지점마다 따로 뜬다(scrollFactor 기본 1 = 카메라와 함께 스크롤).
 * 폰트는 단어 라벨(wordCallout)과 동일. 교체 가능한 단위: 색·크기·timing 을 여기서만 만진다.
 */
const FADE_OUT_MS = 300;
/** 펄스가 끝난 뒤 페이드 시작 전까지 그대로 머무는 시간 — 콤보 표시 지속을 늘린다. */
const HOLD_MS = 500;
/** squash & stretch 세로 축 비율 — 가로가 amount 만큼 늘 때 세로는 amount*이 비율만큼 준다. */
const SQUASH_Y_RATIO = 0.7;

/** 콤보 색 팔레트 — 단계 무관 랜덤. 알록달록한 따뜻·밝은 계열. */
const COMBO_COLORS = [
  "#ff3b30",
  "#ff7a1a",
  "#ffd34d",
  "#ff5ea8",
  "#5ec8ff",
  "#7ad14f",
] as const;

export const playComboPop = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  combo: number,
) => {
  const heat = Math.min(combo, 8);
  const color = COMBO_COLORS[Phaser.Math.Between(0, COMBO_COLORS.length - 1)];
  const text = scene.add
    .text(x, y, `x${combo}`, {
      fontFamily: getGameFont(),
      fontSize: `${Math.round((26 + heat * 3) * 1.3)}px`,
      color,
      fontStyle: "bold",
      stroke: "#ffffff",
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setScale(0.4);
  text.setDepth(30);

  // 스파클 — 등장 자리에서 작은 반짝이가 사방으로 튄다(콤보 높을수록 많이·멀리).
  const sparkCount = 4 + heat;
  for (let i = 0; i < sparkCount; i++) {
    const angle =
      (Math.PI * 2 * i) / sparkCount + Phaser.Math.FloatBetween(-0.3, 0.3);
    const dist = 40 + heat * 6;
    const spark = scene.add.circle(x, y, 5, 0xfff1a8).setDepth(29);
    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scale: 0.2,
      duration: 380,
      ease: "Cubic.Out",
      onComplete: () => spark.destroy(),
    });
  }

  const { popInMs, pulseMs, pulseRepeat, pulseMaxScale, pulseJitter } =
    COMBO_PULSE_TUNING;
  // squash & stretch pulse — 가로로 늘면 세로는 줄어(부피 유지 근사) 납작↔길쭉 맥동.
  // amount 에 매-팝 랜덤 변동을 줘 기계적 반복감 제거(생동감).
  const amount =
    pulseMaxScale - 1 + Phaser.Math.FloatBetween(-pulseJitter, pulseJitter);
  const peakX = 1 + amount;
  const peakY = 1 - amount * SQUASH_Y_RATIO;
  const pulseEnd = popInMs + pulseMs * 2 * (pulseRepeat + 1);
  scene.add
    .timeline([
      {
        at: 0,
        tween: {
          targets: text,
          scale: 1,
          duration: popInMs,
          ease: "Back.Out",
        },
      },
      {
        at: popInMs,
        tween: {
          targets: text,
          scaleX: peakX,
          scaleY: peakY,
          duration: pulseMs,
          yoyo: true,
          repeat: pulseRepeat,
          ease: "Sine.InOut",
        },
      },
      {
        at: pulseEnd + HOLD_MS,
        tween: {
          targets: text,
          alpha: 0,
          y: y - 56,
          duration: FADE_OUT_MS,
          ease: "Sine.Out",
        },
      },
      {
        at: pulseEnd + HOLD_MS + FADE_OUT_MS,
        run: () => text.destroy(),
      },
    ])
    .play();
};
