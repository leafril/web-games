import * as Phaser from "phaser";

import { PORTRAIT_GAME_WIDTH } from "@/games/animal-tower/engine/dimensions";
import { createStrokedText } from "@/games/animal-tower/engine/textHelpers";
import type { ViewportInset } from "@/games/animal-tower/engine/viewport";
import { worldYAtMeters } from "../config/gameplay";
import {
  borderWidthPx,
  fontSizePx,
  palette,
  paletteHex,
} from "../config/theme";

/** 블록·동물 뒤(배경 데코). */
const LINE_DEPTH = -50;
/** 좌·우 가장자리(viewport inset 안쪽)에서 눈금선을 띄우는 거리. */
const LINE_MARGIN_X = 48;
const LINE_THICKNESS_PX = borderWidthPx.md; // 4
/** 선·라벨 공통 알파 (같은 색·같은 투명도). */
const LINE_ALPHA = 0.5;
/** 점선 — 칠하는 길이 / 띄우는 길이. */
const LINE_DASH_PX = 18;
const LINE_GAP_PX = 12;
const LABEL_FONT_SIZE_PX = fontSizePx.xl;
/** 라벨을 선 위로 띄우는 간격. */
const LABEL_GAP_Y = 8;

// ── 돌파 연출(burstMilestone): 황금빛으로 번쩍 → 페이드 ──
/** 황금색(돌파 강조). */
const BURST_GOLD = 0xffcf3f;
/** 돌파 시 황금 선 두께(px) — 본체보다 굵게 강조. */
const BURST_THICKNESS_PX = 8;
/** 황금 선이 떴다가 사라지는 시간(ms). */
const BURST_DURATION_MS = 500;
/** 돌파 연출은 블록 위로 보이게(선 본체는 -50, 블록은 0). */
const BURST_DEPTH = 5;

const ZERO_INSET: ViewportInset = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * 다음 목표 마일스톤 눈금선 — 한 번에 하나만, 다음 목표 높이에 점선 + 오른쪽 끝
 * "{m}m" 라벨을 그린다. 돌파할 때마다 showMilestone(다음 m) 으로 다음 목표 높이로
 * 이동(처음 5m, 5m 돌파 후 10m …). 월드 좌표라 카메라 따라 스크롤된다.
 * 선·라벨 모두 viewport inset 안쪽에 두어 cover 모드 잘림에도 화면 밖으로 안 나간다.
 */
export class MilestoneLine {
  private readonly scene: Phaser.Scene;
  private readonly line: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  /** 현재 그려진 선의 월드 y — burstMilestone 이 옛 선 위치를 알기 위해 추적. */
  private currentY: number | null = null;

  constructor(scene: Phaser.Scene) {
    const dpr = (scene.registry.get("dpr") as number) ?? 1;
    this.scene = scene;
    this.line = scene.add.graphics().setDepth(LINE_DEPTH);
    this.label = createStrokedText(scene, dpr, 0, 0, "", {
      fontSize: `${LABEL_FONT_SIZE_PX}px`,
      color: palette.ink.primary,
      stroke: palette.ink.primary,
      strokeThickness: 0,
    })
      .setOrigin(1, 1)
      .setAlpha(LINE_ALPHA)
      .setDepth(LINE_DEPTH);
  }

  /** 좌·우 가장자리 x 를 viewport inset 안쪽으로 계산. */
  private edges(): { leftX: number; rightX: number } {
    const inset =
      (this.scene.registry.get("viewportInset") as ViewportInset | undefined) ??
      ZERO_INSET;
    return {
      leftX: inset.left + LINE_MARGIN_X,
      rightX: PORTRAIT_GAME_WIDTH - inset.right - LINE_MARGIN_X,
    };
  }

  /** [fromX, toX) 구간에 가이드 점선을 graphics 에 그린다. */
  private drawDashes(
    g: Phaser.GameObjects.Graphics,
    fromX: number,
    toX: number,
    y: number,
    color: number = paletteHex.ink.primary,
    alpha: number = LINE_ALPHA,
    thickness: number = LINE_THICKNESS_PX,
  ): void {
    g.lineStyle(thickness, color, alpha);
    for (let x = fromX; x < toX; x += LINE_DASH_PX + LINE_GAP_PX) {
      g.lineBetween(x, y, Math.min(x + LINE_DASH_PX, toX), y);
    }
  }

  /** 다음 목표 마일스톤(m) 높이로 점선·라벨을 이동·갱신한다. */
  showMilestone(meters: number): void {
    const y = worldYAtMeters(meters);
    const { leftX, rightX } = this.edges();

    this.line.clear();
    this.drawDashes(this.line, leftX, rightX, y);
    this.currentY = y;

    this.label.setText(`${meters}m`);
    this.label.setPosition(rightX, y - LABEL_GAP_Y);
  }

  /**
   * 돌파 연출 — 현재 선 자리에 굵은 황금 선이 떴다가 페이드. 본체 선은 지운다 — 호출 직후
   * showMilestone(다음 m) 이 새 목표 선을 그린다.
   */
  burstMilestone(): void {
    if (this.currentY === null) {
      return;
    }
    const y = this.currentY;
    const { leftX, rightX } = this.edges();
    this.line.clear();

    const gold = this.scene.add.graphics().setDepth(BURST_DEPTH);
    this.drawDashes(gold, leftX, rightX, y, BURST_GOLD, 1, BURST_THICKNESS_PX);
    this.scene.tweens.add({
      targets: gold,
      alpha: 0,
      duration: BURST_DURATION_MS,
      ease: "Cubic.In", // 잠깐 밝게 머물다 사라짐.
      onComplete: () => gold.destroy(),
    });
  }
}
