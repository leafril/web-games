import * as Phaser from "phaser";

import { GAME_HEADING_FONT_FAMILY } from "@/lib/fonts";
import { palette, paletteHex } from "../config/theme";

const TEXT_FONT_SIZE_PX = 88;
const TEXT_STROKE_THICKNESS = 12;
/** 동물·별보다 위, HUD 아래. */
const TEXT_DEPTH = 60;

const POP_IN_MS = 320;
const POP_OVERSHOOT_SCALE = 1.2;
const SETTLE_MS = 160;
const HOLD_MS = 700;
const FADE_OUT_MS = 400;
/** hold 동안 위로 떠오르는 거리. */
const RISE_PX = 80;

const BURST_COUNT = 8;
const BURST_OUTER_RADIUS_PX = 16;
const BURST_INNER_RADIUS_PX = 7;
const BURST_DISTANCE_PX = 130;
const BURST_DURATION_MS = 800;
const BURST_COLORS = paletteHex.toneSet.pastel6;

/**
 * 5m 마일스톤 돌파 축하 — 별 burst + "{m}m!" 텍스트 spring pop 후 떠오르며 fade.
 * (x, y) 는 월드 좌표(보통 탑 윗면 위).
 */
export const playMilestoneCelebrate = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  meters: number,
): void => {
  const dpr = (scene.registry.get("dpr") as number) ?? 1;

  for (let i = 0; i < BURST_COUNT; i += 1) {
    const angle = (i / BURST_COUNT) * Math.PI * 2;
    const color = BURST_COLORS[i % BURST_COLORS.length] ?? BURST_COLORS[0];
    const star = scene.add
      .star(x, y, 5, BURST_INNER_RADIUS_PX, BURST_OUTER_RADIUS_PX, color)
      .setScrollFactor(0)
      .setDepth(TEXT_DEPTH - 1);
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * BURST_DISTANCE_PX,
      y: y + Math.sin(angle) * BURST_DISTANCE_PX,
      alpha: 0,
      scale: 0.3,
      angle: (i % 2 === 0 ? 1 : -1) * 360,
      duration: BURST_DURATION_MS,
      ease: "Cubic.Out",
      onComplete: () => star.destroy(),
    });
  }

  const label = scene.add
    .text(x, y, `${Math.round(meters)}m!`, {
      fontFamily: GAME_HEADING_FONT_FAMILY,
      fontSize: `${TEXT_FONT_SIZE_PX}px`,
      color: palette.ink.inverse,
      stroke: palette.ink.stroke,
      strokeThickness: TEXT_STROKE_THICKNESS,
      resolution: dpr,
    })
    .setOrigin(0.5, 0.5)
    .setScrollFactor(0)
    .setDepth(TEXT_DEPTH)
    .setAlpha(0)
    .setScale(0.4);

  scene.add
    .timeline([
      {
        at: 0,
        tween: {
          targets: label,
          scale: POP_OVERSHOOT_SCALE,
          alpha: 1,
          duration: POP_IN_MS,
          ease: "Back.Out",
        },
      },
      {
        at: POP_IN_MS,
        tween: {
          targets: label,
          scale: 1,
          duration: SETTLE_MS,
          ease: "Sine.Out",
        },
      },
      {
        at: POP_IN_MS + SETTLE_MS,
        tween: {
          targets: label,
          y: y - RISE_PX,
          alpha: 0,
          duration: HOLD_MS + FADE_OUT_MS,
          ease: "Sine.In",
        },
      },
      {
        at: POP_IN_MS + SETTLE_MS + HOLD_MS + FADE_OUT_MS,
        run: () => label.destroy(),
      },
    ])
    .play();
};
