import * as Phaser from "phaser";

import { FONT_BASE } from "@/games/animal-tower/engine/textHelpers";
import {
  fontSizePx,
  palette,
  radiusPx,
  shadowPhaser,
  spacingPx,
} from "../config/theme";
import { attachButtonPress } from "../effects/buttonPress";

const FONT_SIZE_PX = fontSizePx["2xl"];
const TEXT_COLOR = palette.ink.onAccent;
const PADDING_X_PX = spacingPx[12]; // 24
const PADDING_Y_PX = spacingPx[6]; //  12
const RADIUS_PX = radiusPx.xl;
const SHADOW = shadowPhaser.button;
const INACTIVE_ALPHA = 0.35;

export type ActionButtonConfig = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  label: string;
  /** 기본 배경색 (Phaser 0xRRGGBB). */
  bgColor: number;
  /** pointerdown 시 swap 되는 진한 변형 (accent.*Deep). */
  bgColorPressed: number;
  onClick: () => void;
};

/**
 * 게임 액션 버튼 (회전·스왑). bg + chunky shadow + 라벨 + 입력 zone 을 하나의
 * Container 로 묶어, scale tween + 색 swap pressed 피드백을 자체 처리.
 *
 * 비활성화 시 alpha 를 낮추고 입력을 막는다 (setEnabled).
 *
 * Container 자체에 setInteractive 를 걸지 않는 이유: hit area 가 setX 후 transform 을
 * 따라가지 않아 인접 배치된 두 버튼 간 hit 이 잘못 잡힌다. 자식 Zone 에 input 을
 * 등록해 transform 이 정확히 반영되게 한다.
 */
export class ActionButton extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly bgColor: number;
  private readonly bgColorPressed: number;
  /** 컨테이너 외부에서 인접 배치 시 너비 산정에 쓰도록 노출. */
  readonly contentWidth: number;
  readonly contentHeight: number;

  constructor(config: ActionButtonConfig) {
    const { scene, x, y, label, bgColor, bgColorPressed, onClick } = config;
    super(scene, x, y);
    this.bgColor = bgColor;
    this.bgColorPressed = bgColorPressed;

    const text = scene.add
      .text(0, 0, label, {
        ...FONT_BASE,
        fontSize: `${FONT_SIZE_PX}px`,
        color: TEXT_COLOR,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    const w = text.width + PADDING_X_PX * 2;
    const h = text.height + PADDING_Y_PX * 2;
    this.contentWidth = w;
    this.contentHeight = h;

    const shadow = scene.add.graphics();
    shadow.fillStyle(SHADOW.color, SHADOW.alpha);
    shadow.fillRoundedRect(-w / 2, -h / 2 + SHADOW.offsetY, w, h, RADIUS_PX);

    this.bg = scene.add.graphics();
    this.drawBg(bgColor);

    this.zone = scene.add
      .zone(0, 0, w, h)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    this.add([shadow, this.bg, this.zone, text]);
    scene.add.existing(this);

    attachButtonPress(scene, this.zone, this, onClick, {
      onPressedChange: (pressed) => {
        this.drawBg(pressed ? this.bgColorPressed : this.bgColor);
      },
    });
  }

  private drawBg(color: number): void {
    this.bg.clear();
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(
      -this.contentWidth / 2,
      -this.contentHeight / 2,
      this.contentWidth,
      this.contentHeight,
      RADIUS_PX,
    );
  }

  setEnabled(enabled: boolean): this {
    this.setAlpha(enabled ? 1 : INACTIVE_ALPHA);
    if (this.zone.input) {
      this.zone.input.enabled = enabled;
    }
    return this;
  }
}
