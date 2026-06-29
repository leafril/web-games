import * as Phaser from "phaser";

import { COLOR, TEXT } from "./theme";
import { phaserSolid } from "./typography";
import { BOMB_ASSET } from "./assets";

// 한 장의 카드. 앞면(단어)·뒷면(? 모티브)을 가지며 scaleX 트윈으로 뒤집는다.
// 2D 카드 뒤집기: scaleX 1→0 에서 모서리(edge-on)가 되는 순간 앞/뒤 면을 교체하고
// 0→1 로 펴 3D 회전처럼 보이게 한다.

const FLIP_HALF_MS = 75;
export const FLIP_TOTAL_MS = FLIP_HALF_MS * 2;

type CardOptions = {
  /** 카드 중심 x (디자인 좌표). */
  x: number;
  /** 카드 중심 y (디자인 좌표). */
  y: number;
  width: number;
  height: number;
  /** 앞면에 표시할 단어(판정·라벨용). */
  word: string;
  /** 앞면에 그릴 이미지 텍스처 키. 없으면 단어 텍스트로 폴백(빈 단어면 빈 카드). */
  textureKey?: string;
  /** 생성 시 앞면 여부. 기본 true. false 면 뒷면으로 시작. */
  faceUp?: boolean;
  /** bomb 카드면 앞면을 폭탄 모양으로(이미지·단어 대신). */
  isBomb?: boolean;
  dpr: number;
};

export class Card {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private front: Phaser.GameObjects.Container;
  private back: Phaser.GameObjects.Container;
  private faceUp = true;
  private flipping = false;

  readonly word: string;

  // 중심·크기(디자인 좌표). 입력은 씬이 포인터 경로로 히트테스트하므로
  // 카드 자체는 인터랙티브로 만들지 않는다(드래그 연속 뒤집기 지원).
  private readonly cx: number;
  private readonly cy: number;
  private readonly w: number;
  private readonly h: number;

  constructor(scene: Phaser.Scene, opts: CardOptions) {
    this.scene = scene;
    const { x, y, width, height, word, textureKey, dpr } = opts;
    this.cx = x;
    this.cy = y;
    this.w = width;
    this.h = height;
    this.word = word;
    this.faceUp = opts.faceUp ?? true;

    this.container = scene.add.container(x, y);
    this.front = this.buildFront(
      width,
      height,
      word,
      textureKey,
      opts.isBomb ?? false,
      dpr,
    );
    this.back = this.buildBack(width, height);
    this.front.setVisible(this.faceUp);
    this.back.setVisible(!this.faceUp);
    this.container.add([this.front, this.back]);
  }

  /** 포인터(월드 좌표)가 이 카드의 셀 안에 있는가. 뒤집기 애니메이션 중에도 원래 셀 기준. */
  contains(px: number, py: number): boolean {
    return (
      Math.abs(px - this.cx) <= this.w / 2 &&
      Math.abs(py - this.cy) <= this.h / 2
    );
  }

  get isFaceUp(): boolean {
    return this.faceUp;
  }

  private buildFront(
    w: number,
    h: number,
    word: string,
    textureKey: string | undefined,
    isBomb: boolean,
    dpr: number,
  ): Phaser.GameObjects.Container {
    const c = this.scene.add.container(0, 0);
    // 면·프레임 없이 콘텐츠(과일·폭탄·X)만 — 뒷면 파라솔과 형태를 맞춘다.

    if (isBomb) {
      // 도화선 폭탄 아이콘(BOOM 게이지와 동일). 아이스 블루 면 위에 크게 올린다.
      const img = this.scene.add.image(0, 0, BOMB_ASSET.key);
      const target = Math.min(w, h) * 0.72;
      img.setScale(target / Math.max(img.width, img.height));
      c.add(img);
      return c;
    }

    if (textureKey && this.scene.textures.exists(textureKey)) {
      const img = this.scene.add.image(0, 0, textureKey);
      const pad = 20;
      const scale = Math.min((w - pad) / img.width, (h - pad) / img.height);
      img.setScale(scale);
      c.add(img);
    } else if (word) {
      const text = this.scene.add
        .text(
          0,
          0,
          word,
          phaserSolid(
            `${Math.round(Math.min(w, h) * 0.22)}px`,
            TEXT.solid,
            dpr,
          ),
        )
        .setOrigin(0.5);
      c.add(text);
    } else {
      // 빈 칸(과일 없던 칸) — 잘못 뒤집었을 때 왜 틀렸는지 보이게 중립 X 마크. 두껍고 둥근 끝으로 청키하게.
      const m = Math.min(w, h) * 0.22;
      const thickness = Math.round(Math.min(w, h) * 0.13);
      const cap = thickness / 2;
      const x = this.scene.add.graphics();
      x.lineStyle(thickness, COLOR.tileBorder, 1);
      x.beginPath();
      x.moveTo(-m, -m);
      x.lineTo(m, m);
      x.moveTo(m, -m);
      x.lineTo(-m, m);
      x.strokePath();
      // 네 꼭짓점에 두께 반경 원을 찍어 끝을 둥글게(round cap) — 묵직한 인상.
      x.fillStyle(COLOR.tileBorder, 1);
      [
        [-m, -m],
        [m, m],
        [m, -m],
        [-m, m],
      ].forEach(([px, py]) => x.fillCircle(px, py, cap));
      c.add(x);
    }
    return c;
  }

  private buildBack(w: number, h: number): Phaser.GameObjects.Container {
    const c = this.scene.add.container(0, 0);
    const g = this.scene.add.graphics();
    // 카드 면·프레임 없이 파라솔만 보이게 한다. 터치 범위는 씬의 셀 히트테스트라 영향 없음.

    // 방사형 파라솔 — 중심에서 부채꼴로 코랄·크림을 번갈아 채운다(위에서 본 우산).
    const radius = Math.min(w, h) * 0.4;
    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle(i % 2 === 0 ? COLOR.parasolStripe : COLOR.parasolGap, 1);
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, radius, a0, a1, false);
      g.closePath();
      g.fillPath();
    }
    // 외곽 림
    g.lineStyle(Math.max(2, radius * 0.06), COLOR.parasolRim, 1);
    g.strokeCircle(0, 0, radius);
    // 중심 꼭지(골드 + 림)
    const tip = radius * 0.13;
    g.fillStyle(COLOR.parasolTip, 1);
    g.fillCircle(0, 0, tip);
    g.lineStyle(Math.max(1.5, radius * 0.03), COLOR.parasolRim, 1);
    g.strokeCircle(0, 0, tip);

    c.add(g);
    return c;
  }

  /** 지정한 면으로 뒤집는다. 이미 그 면이거나 애니메이션 중이면 무시(콜백은 즉시 호출). */
  flipTo(faceUp: boolean, onComplete?: () => void): void {
    if (this.flipping || this.faceUp === faceUp) {
      onComplete?.();
      return;
    }
    this.flipping = true;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 0,
      duration: FLIP_HALF_MS,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.faceUp = faceUp;
        this.front.setVisible(faceUp);
        this.back.setVisible(!faceUp);
        this.scene.tweens.add({
          targets: this.container,
          scaleX: 1,
          duration: FLIP_HALF_MS,
          ease: "Sine.easeOut",
          onComplete: () => {
            this.flipping = false;
            onComplete?.();
          },
        });
      },
    });
  }

  reveal(onComplete?: () => void): void {
    this.flipTo(true, onComplete);
  }

  conceal(onComplete?: () => void): void {
    this.flipTo(false, onComplete);
  }

  /** 오답 시 카드를 좌우로 짧게 흔든다(원위치 복귀). */
  shake(): void {
    const baseX = this.container.x;
    const amount = Math.min(this.w, this.h) * 0.12;
    this.scene.tweens.add({
      targets: this.container,
      x: baseX - amount,
      duration: 55,
      yoyo: true,
      repeat: 4,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.container.x = baseX;
      },
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
