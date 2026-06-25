import * as Phaser from "phaser";

import {
  PORTRAIT_GAME_HEIGHT,
  PORTRAIT_GAME_WIDTH,
} from "@/games/animal-tower/engine/dimensions";
import type { ViewportInset } from "@/games/animal-tower/engine/viewport";
import { SCENES } from "../config/assetKeys";
import { GAME_EVENT, type BlockSettledPayload } from "../config/events";
import {
  PLATFORM_BOTTOM_MARGIN_PX,
  heightInMetersFromPeakY,
} from "../config/gameplay";
import { paletteHex, spacingPx } from "../config/theme";
import { ActionButton, HudPanel } from "../objects";

const ZERO_INSET: ViewportInset = { top: 0, right: 0, bottom: 0, left: 0 };

const readViewportInset = (scene: Phaser.Scene): ViewportInset =>
  (scene.registry.get("viewportInset") as ViewportInset | undefined) ??
  ZERO_INSET;

const HUD_MARGIN_PX = spacingPx[8]; // 16
/** 좌상단 정보 패널(Height·Animals)을 세로로 쌓을 때 패널 사이 간격. */
const INFO_PANEL_GAP_PX = spacingPx[6]; // 12
const PANEL_DEPTH = 0;

/** DOM PauseButton 한 변(px). pauseMenu.css `.pause-button` width/height 와 일치 —
 *  점수(높이) 패널 높이를 일시정지 버튼과 화면상 동일하게 맞추기 위한 기준값. */
const PAUSE_BUTTON_SIZE_PX = 48;

/** 좌대 시각면 아래 액션 버튼 가운데까지의 거리. spacing 스케일(max 77) 밖이라 인라인. */
const ACTION_BUTTON_BELOW_PLATFORM_PX = 96;
/** 두 버튼 사이 가로 간격 (인접 배치). */
const ACTION_BUTTON_GAP_PX = spacingPx[6]; // 12
const ACTION_BUTTON_DEPTH = 2;

const ROTATE_BUTTON_LABEL = "↻ Rotate";
const SWAP_BUTTON_LABEL = "↔ Change";

const formatHeight = (heightM: number): string =>
  `Height: ${heightM.toFixed(1)}m`;

/** 좌대 위에 정착한 동물 수. settled block 수(=droppedCount)와 1:1. */
const formatCount = (count: number): string => `Animals: ${count}`;

export class HudScene extends Phaser.Scene {
  private heightPanel!: HudPanel;
  private countPanel!: HudPanel;
  private swapButton!: ActionButton;

  constructor() {
    super(SCENES.hud);
  }

  create(): void {
    const dpr = (this.registry.get("dpr") as number) ?? 1;
    this.cameras.main.setOrigin(0, 0);
    this.cameras.main.setZoom(dpr);
    this.heightPanel = new HudPanel(this, formatHeight(0), 0).setDepth(
      PANEL_DEPTH,
    );
    this.countPanel = new HudPanel(this, formatCount(0), 0).setDepth(
      PANEL_DEPTH,
    );
    this.layoutInfoPanels();

    this.createActionButtons();

    const gameScene = this.scene.get(SCENES.game);
    gameScene.events.on(GAME_EVENT.BLOCK_SETTLED, this.onBlockSettled, this);
    gameScene.events.on(GAME_EVENT.BLOCK_SPAWNED, this.onBlockSpawned, this);
    gameScene.events.on(GAME_EVENT.SWAP_DEPLETED, this.onSwapDepleted, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameScene.events.off(GAME_EVENT.BLOCK_SETTLED, this.onBlockSettled, this);
      gameScene.events.off(GAME_EVENT.BLOCK_SPAWNED, this.onBlockSpawned, this);
      gameScene.events.off(GAME_EVENT.SWAP_DEPLETED, this.onSwapDepleted, this);
    });
  }

  private onSwapDepleted(): void {
    this.swapButton.setEnabled(false);
  }

  private createActionButtons(): void {
    // 좌대 시각 하단 = PORTRAIT_GAME_HEIGHT - PLATFORM_BOTTOM_MARGIN_PX
    // 그 아래 ACTION_BUTTON_BELOW_PLATFORM_PX 만큼 떨어진 위치에 버튼 가운데 y
    const buttonY =
      PORTRAIT_GAME_HEIGHT -
      PLATFORM_BOTTOM_MARGIN_PX +
      ACTION_BUTTON_BELOW_PLATFORM_PX;
    const centerX = PORTRAIT_GAME_WIDTH / 2;

    const swap = new ActionButton({
      scene: this,
      x: 0,
      y: buttonY,
      label: SWAP_BUTTON_LABEL,
      bgColor: paletteHex.accent.sky,
      bgColorPressed: paletteHex.accent.skyDeep,
      onClick: () => {
        const gameScene = this.scene.get(SCENES.game);
        gameScene.events.emit(GAME_EVENT.SWAP_REQUESTED);
      },
    }).setDepth(ACTION_BUTTON_DEPTH);
    this.swapButton = swap;

    const rotate = new ActionButton({
      scene: this,
      x: 0,
      y: buttonY,
      label: ROTATE_BUTTON_LABEL,
      bgColor: paletteHex.accent.yellow,
      bgColorPressed: paletteHex.accent.yellowDeep,
      onClick: () => {
        const gameScene = this.scene.get(SCENES.game);
        gameScene.events.emit(GAME_EVENT.ROTATE_REQUESTED);
      },
    }).setDepth(ACTION_BUTTON_DEPTH);

    const swapW = swap.contentWidth;
    const rotateW = rotate.contentWidth;
    const totalW = swapW + ACTION_BUTTON_GAP_PX + rotateW;
    const startX = centerX - totalW / 2;
    swap.setX(startX + swapW / 2);
    rotate.setX(startX + swapW + ACTION_BUTTON_GAP_PX + rotateW / 2);

    swap.setEnabled(false);
  }

  private onBlockSpawned(): void {
    this.swapButton.setEnabled(true);
  }

  private onBlockSettled(payload: BlockSettledPayload): void {
    this.heightPanel.setText(
      formatHeight(heightInMetersFromPeakY(payload.peakY)),
    );
    this.countPanel.setText(formatCount(payload.droppedCount));
    this.layoutInfoPanels();
  }

  private layoutInfoPanels(): void {
    // cover 모드 viewport inset 만큼 안쪽에 anchor (portrait 폰 19.5:9 에서 상·하 잘림, iPad 4:3 좌·우 잘림 안전).
    const inset = readViewportInset(this);
    // 화면상 높이를 DOM PauseButton(48px)과 일치시킨다. 캔버스는 design 좌표라
    // design 길이 × scale = 화면 px → 화면 48px 이 되려면 design 48/scale.
    const scale = (this.registry.get("viewportScale") as number) ?? 1;
    const minHeight = PAUSE_BUTTON_SIZE_PX / scale;
    const left = inset.left + HUD_MARGIN_PX;
    const top = inset.top + HUD_MARGIN_PX;

    const heightSize = this.heightPanel.redraw(minHeight);
    this.heightPanel.setPosition(left, top);

    // Animals 패널은 Height 패널 바로 아래에 같은 높이로 쌓는다 — 좌상단 정보 그룹.
    this.countPanel.redraw(minHeight);
    this.countPanel.setPosition(
      left,
      top + heightSize.height + INFO_PANEL_GAP_PX,
    );
  }
}
