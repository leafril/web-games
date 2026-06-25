import type * as Phaser from "phaser";

import { GAME_HEADING_FONT_FAMILY } from "@/lib/fonts";

export const FONT_BASE = {
  fontFamily: GAME_HEADING_FONT_FAMILY,
  fontStyle: "normal",
} as const;

/** dpr 보정된 fontSize 문자열(px). */
export const scaledFontSize = (basePx: number, dpr: number): string =>
  `${Math.round(basePx * Math.max(1, dpr * 0.75))}px`;

/** 공통 stroke·shadow·resolution 적용한 Phaser Text 를 만든다. */
export const createStrokedText = (
  scene: Phaser.Scene,
  dpr: number,
  x: number,
  y: number,
  content: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text =>
  scene.add.text(x, y, content, {
    ...FONT_BASE,
    strokeThickness: 4,
    shadow: {
      offsetX: 0,
      offsetY: 2,
      color: "rgba(0,0,0,0.15)",
      blur: 4,
      fill: true,
    },
    ...style,
    resolution: dpr,
  });
