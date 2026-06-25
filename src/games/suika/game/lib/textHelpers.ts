import type * as Phaser from "phaser";

import { getGameFont } from "../config/fonts";

/**
 * dpr 보정된 fontSize 문자열을 반환한다. Phaser Text 의 `fontSize` 가 CSS px 문자열을 받으므로 string.
 */
export const scaledFontSize = (basePx: number, dpr: number): string =>
  `${Math.round(basePx * Math.max(1, dpr * 0.75))}px`;

/**
 * Phaser Text 를 공통 stroke·shadow·resolution 으로 만든다. 폰트 family 는 주입된 게임 폰트(getGameFont).
 *
 * (plays/_shared/lib/phaser/textHelpers 를 게임 코어로 내재화 — self-contained 위해 모노레포 alias 제거.
 *  폰트만 호스트 주입으로 바꿈.)
 *
 * @example
 * const text = createStrokedText(this, dpr, x, y, "0", {
 *   fontSize: scaledFontSize(23, dpr),
 *   color: "#FF8C00",
 *   stroke: "#B71C1C",
 *   strokeThickness: 5,
 * });
 */
export const createStrokedText = (
  scene: Phaser.Scene,
  dpr: number,
  x: number,
  y: number,
  content: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text =>
  scene.add.text(x, y, content, {
    fontFamily: getGameFont(),
    fontStyle: "normal",
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
