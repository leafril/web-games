import * as Phaser from "phaser";

import { createStrokedText } from "@/games/animal-tower/engine/textHelpers";
import {
  borderWidthPx,
  fontSizePx,
  palette,
  paletteHex,
  radiusPx,
  shadowPhaser,
  spacingPx,
} from "../config/theme";

const FONT_SIZE_PX = fontSizePx.xl;
const BORDER_WIDTH_PX = borderWidthPx.hairline; // 유리 림 — drop 과 같은 얇은 보더
const RADIUS_PX = radiusPx.lg;
const PAD_X_PX = spacingPx[8]; // 16
const PAD_Y_PX = spacingPx[4]; //  8

/** 텍스트 정렬: 0 = 좌정렬 (좌상단 anchor 용), 1 = 우정렬 (우상단 anchor 용). */
export type HudPanelTextAlign = 0 | 1;

/** 시각 변형. */
export type HudPanelVariant = "default" | "featured";

const VARIANT = {
  /**
   * liquid glass 근사 — 반투명 흰 면(배경 비침) + 흰 림 보더 + 흰 텍스트.
   * drop HUD 와 통일. 게임 플레이 배경(파스텔 하늘)이 고채도라 흰+brown 칩이
   * 충돌하던 걸 유리로 녹인다. Phaser 라 CSS backdrop-blur 불가 → 면 alpha 로
   * 배경만 비치게(블러 X). 흰 글자는 cardSoft 그림자 + textObj shadow 로 가독성. */
  default: {
    bg: paletteHex.surface.base,
    bgAlpha: 0.24,
    border: paletteHex.ink.inverse,
    borderAlpha: 0.55,
    text: palette.ink.inverse,
    shadow: shadowPhaser.cardSoft,
    isPill: true,
  },
  /**
   * 강조 패널 — accent.yellow (amber 300, 회전 버튼 bg 와 동일) + 갈색 border +
   * 갈색 텍스트 + pill 형태 + 미묘한 grounding shadow. 동물 이름처럼 "지금 주목"
   * 정보용. 회전 버튼과 같은 강조 색으로 시각 언어 통일.
   */
  featured: {
    bg: paletteHex.accent.yellow,
    bgAlpha: 1,
    border: paletteHex.surface.border,
    borderAlpha: 1,
    text: palette.ink.primary,
    shadow: shadowPhaser.cardSoft,
    isPill: true,
  },
} as const;

/**
 * 좌상단·우상단에 배치하는 정보 패널. Container 자체 위치 (setPosition) 가
 * 패널의 좌상단 코너이고, 패널 크기는 텍스트에 padding 을 더해 자동 계산.
 *
 * 사용 흐름: setText → redraw → setPosition (호출자가 redraw 결과의 width/height 로
 * 위치 산정).
 */
export class HudPanel extends Phaser.GameObjects.Container {
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly textObj: Phaser.GameObjects.Text;
  private readonly textAlign: HudPanelTextAlign;
  private readonly variantStyle: (typeof VARIANT)[HudPanelVariant];

  constructor(
    scene: Phaser.Scene,
    initialText: string,
    textAlign: HudPanelTextAlign = 0,
    variant: HudPanelVariant = "default",
  ) {
    super(scene, 0, 0);
    const dpr = window.devicePixelRatio ?? 1;
    const style = VARIANT[variant];
    this.variantStyle = style;
    this.textAlign = textAlign;
    this.shadow = scene.add.graphics();
    this.bg = scene.add.graphics();
    this.textObj = createStrokedText(scene, dpr, 0, 0, initialText, {
      fontSize: `${FONT_SIZE_PX}px`,
      color: style.text,
      stroke: style.text,
      strokeThickness: 0,
    }).setOrigin(textAlign, 0.5);
    // 유리 위 흰 글자 가독성 — drop HUD 의 text-shadow 와 같은 의도(brown 그림자).
    this.textObj.setShadow(0, 1 * dpr, "rgba(62, 39, 35, 0.5)", 2 * dpr);
    this.add([this.shadow, this.bg, this.textObj]);
    scene.add.existing(this);
  }

  setText(value: string): this {
    this.textObj.setText(value);
    return this;
  }

  /**
   * 텍스트 사이즈 기반으로 panel 을 다시 그린다. 텍스트가 비어있으면 panel 도 안 그림.
   * @param minHeight design 좌표 최소 높이. 텍스트 기반 높이보다 크면 이 값으로 강제
   *   (예: DOM PauseButton 과 화면 높이를 맞출 때 `48 / viewportScale`). 0 이면 무시.
   * @returns 그려진 panel 의 width/height (호출자가 위치 산정에 사용).
   */
  redraw(minHeight = 0): { width: number; height: number } {
    if (!this.textObj.text) {
      this.shadow.clear();
      this.bg.clear();
      return { width: 0, height: 0 };
    }
    const w = this.textObj.width + PAD_X_PX * 2;
    const h = Math.max(this.textObj.height + PAD_Y_PX * 2, minHeight);
    const textLocalX = this.textAlign === 0 ? PAD_X_PX : w - PAD_X_PX;
    this.textObj.setPosition(textLocalX, h / 2);
    const radius = this.variantStyle.isPill ? h / 2 : RADIUS_PX;
    const shadow = this.variantStyle.shadow;
    this.shadow.clear();
    this.shadow.fillStyle(shadow.color, shadow.alpha);
    this.shadow.fillRoundedRect(0, shadow.offsetY, w, h, radius);
    this.bg.clear();
    this.bg.fillStyle(this.variantStyle.bg, this.variantStyle.bgAlpha);
    this.bg.fillRoundedRect(0, 0, w, h, radius);
    this.bg.lineStyle(
      BORDER_WIDTH_PX,
      this.variantStyle.border,
      this.variantStyle.borderAlpha,
    );
    this.bg.strokeRoundedRect(0, 0, w, h, radius);
    return { width: w, height: h };
  }
}
