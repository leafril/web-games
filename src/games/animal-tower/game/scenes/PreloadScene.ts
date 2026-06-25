import * as Phaser from "phaser";

import { shuffle } from "@/games/animal-tower/engine/shuffle";
import {
  CLOUD_TEXTURES,
  IDLE_HINT_FINGER,
  REGISTRY,
  SCENES,
  TEXTURES,
} from "../config/assetKeys";
import { paletteHex } from "../config/theme";
import type { BlockDef } from "../config/assetKeys";
import { buildBlocks } from "../data/blocks";
import type { GameSceneInitData } from "../types/game";
import BackgroundMeadow from "../assets/Background.jpg";

/** 원격 원본 이미지를 담는 임시 텍스처 키 (디자인 치수로 구운 뒤 제거). */
const sourceKey = (blockKey: string): string => `${blockKey}__src`;

/** 진행률 바 치수 (canvas backing 좌표, 화면 중앙 배치). */
const PROGRESS_BAR_WIDTH = 360;
const PROGRESS_BAR_HEIGHT = 24;
const PROGRESS_BAR_RADIUS = 12;
const PROGRESS_BAR_PADDING = 4;

export class PreloadScene extends Phaser.Scene {
  private initData: GameSceneInitData = { assets: [] };

  constructor() {
    super(SCENES.preload);
  }

  init(data: GameSceneInitData): void {
    this.initData = data;
  }

  preload(): void {
    // 매 세션 셔플 — 같은 풀이라도 진입마다 다른 순서/노출 (FE-7).
    const blocks = buildBlocks(shuffle(this.initData.assets));
    this.registry.set(REGISTRY.blocks, blocks);

    this.showProgressBar();

    // 진입 임계 경로는 "시각"만 — 블록 이미지·구름·손가락·배경만 여기서 받아
    // 게임을 띄운다. 오디오(블록 발음·마일스톤 격려·등장 펑)는 등장/탭 시점까지
    // 필요 없고 모든 재생 경로가 cache.audio.exists 로 가드되므로, GameScene 이
    // 시작 후 백그라운드로 받는다(loadDeferredAudio). 이렇게 분리해 scene.start
    // 를 막는 원격 요청 수를 절반(이미지 N + 오디오 N → 이미지 N)으로 줄인다.
    //
    // BE 원격 이미지는 native 크기가 임의다. 일단 임시 키(__src)로 받아두고
    // create() 에서 디자인 치수 캔버스로 구워 block.key 에 등록한다 (legacy
    // load.svg(key,url,{width,height}) 의 "디자인 박스로 stretch" 동작 복원).
    // 이렇게 하면 GameScene 의 sprite scale 이 1 로 유지되어 fromVerts body 와
    // 정합이 깨지지 않는다. 원격 호스트라 CORS anonymous 필요.
    this.load.setCORS("anonymous");
    blocks.forEach((block) => {
      const srcKey = sourceKey(block.key);
      if (!this.textures.exists(block.key) && !this.textures.exists(srcKey)) {
        this.load.image(srcKey, block.imageUrl);
      }
    });
    this.load.setCORS("");

    this.load.image(TEXTURES.idleHintFinger, IDLE_HINT_FINGER.image.src);
    CLOUD_TEXTURES.forEach(({ key, image }) => {
      this.load.image(key, image.src);
    });

    this.load.image(TEXTURES.bgMeadow, BackgroundMeadow.src);
  }

  /**
   * 로딩 진행률 바. 원격 블록 이미지 N개 다운로드 동안 화면이 배경색만 떠
   * "멈춤" 처럼 보이던 구간을 시각화한다. canvas backing 좌표(=화면) 중앙에
   * 그린다 — PreloadScene 은 GameScene 과 달리 카메라 zoom 을 안 걸어 scale
   * 좌표가 곧 backing 픽셀이다.
   */
  private showProgressBar(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const left = centerX - PROGRESS_BAR_WIDTH / 2;
    const top = centerY - PROGRESS_BAR_HEIGHT / 2;

    const track = this.add.graphics();
    track.fillStyle(paletteHex.surface.panelDark, 0.25);
    track.fillRoundedRect(
      left,
      top,
      PROGRESS_BAR_WIDTH,
      PROGRESS_BAR_HEIGHT,
      PROGRESS_BAR_RADIUS,
    );

    const fill = this.add.graphics();
    const fillColor = paletteHex.accent.yellow;
    const maxFillWidth = PROGRESS_BAR_WIDTH - PROGRESS_BAR_PADDING * 2;

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      fill.clear();
      fill.fillStyle(fillColor, 1);
      fill.fillRoundedRect(
        left + PROGRESS_BAR_PADDING,
        top + PROGRESS_BAR_PADDING,
        Math.max(0, maxFillWidth * value),
        PROGRESS_BAR_HEIGHT - PROGRESS_BAR_PADDING * 2,
        PROGRESS_BAR_RADIUS - PROGRESS_BAR_PADDING,
      );
    });

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      track.destroy();
      fill.destroy();
    });
  }

  create(): void {
    const blocks =
      (this.registry.get(REGISTRY.blocks) as BlockDef[] | undefined) ?? [];
    blocks.forEach((block) => this.bakeBlockTexture(block));
    this.scene.start(SCENES.game);
  }

  /**
   * 원격 원본(__src)을 디자인 치수(displayWidth × displayWidth·aspectRatio)
   * 캔버스로 stretch 해 block.key 텍스처로 등록한다. legacy load.svg 의
   * width/height 래스터화와 동일 결과 — GameScene 은 setDisplaySize 없이
   * native(=디자인) 크기로 그려 fromVerts body 와 1:1 정합.
   *
   * dpr 배율은 적용하지 않는다 — body 는 디자인 좌표라 텍스처만 키우면
   * sprite/body 정합이 어긋난다 (legacy 주석과 동일 정책).
   */
  private bakeBlockTexture(block: BlockDef): void {
    if (this.textures.exists(block.key)) {
      return;
    }
    const srcKey = sourceKey(block.key);
    if (!this.textures.exists(srcKey)) {
      // 원격 로드 실패(404·CORS 등). block.key 미생성 → 해당 블록은 미표시.
      return;
    }
    const w = Math.round(block.displayWidth);
    const h = Math.round(block.displayWidth * block.aspectRatio);
    const canvas = this.textures.createCanvas(block.key, w, h);
    if (!canvas) {
      return;
    }
    const source = this.textures.get(srcKey).getSourceImage();
    canvas.context.drawImage(source as CanvasImageSource, 0, 0, w, h);
    canvas.refresh();
    this.textures.remove(srcKey);
  }
}
