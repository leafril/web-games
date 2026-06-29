import * as Phaser from "phaser";

import {
  PORTRAIT_GAME_WIDTH as W,
  PORTRAIT_GAME_HEIGHT as H,
} from "./dimensions";
import { TEXT } from "./theme";
import { SEMANTIC } from "./tokens";
import {
  phaserSolid,
  phaserBubbleTop,
  phaserBubbleLayer,
  EXTRUDE_OFFSETS,
} from "./typography";
import { Card, FLIP_TOTAL_MS } from "./Card";
import { buildRound, buildBonusRound, type RoundData } from "./round";
import {
  WORD_ASSETS,
  WORD_ASSET_LIST,
  BOMB_ASSET,
  FLIP_SFX,
  FAIL_SFX,
  BGM,
  STAR_PARTICLE,
  NOVA_GLOW,
  NOVA_GLASS,
  SUNBURST_RAYS,
} from "./assets";
import { playStarBurst } from "./effects/starBurst";
import { playNovaBurst } from "./effects/nova";
import BeachBgImg from "./assets/BeachBg.png";
import { GAUGE_H_FRAC, GAUGE_BOTTOM_FRAC, GAUGE_GAP } from "./layout";
import type { MemoryHudConfig } from "./types";
import {
  CARD_COUNT,
  GRID_COLS,
  LEVELS,
  MEMORIZE_MS,
  PRAISE_WORDS,
  HIGH_BAND_LEVEL,
  WINS_TO_ADVANCE_LOW,
  WINS_TO_ADVANCE_HIGH,
  FAIL_LEVEL_DROP,
  CONFIG_WINDOW,
  TUTORIAL_LEVEL_COUNT,
  BONUS_PATTERN_CHANCE,
  BOOM_GAUGE_MAX,
  BOOM_GAUGE_FAIL_PENALTY,
  BOMB_TIME_BONUS_MS,
  BASE_SCORE,
  COMBO_MULT_CAP,
  BOMB_SCORE,
  WIN_PAUSE_MS,
  FAIL_PAUSE_MS,
  GAME_TIME_MS,
  GAME_OVER_PAUSE_MS,
} from "./constants";

// memory 그룹 체인 루프. 12칸 중 일부에만 단어 카드 → 잠깐 공개(암기) → 엎기 →
// 같은 단어를 그룹으로 연속 뒤집기. 한 그룹 끝나기 전 다른 단어를 뒤집으면 라운드 종료.
// 전체 게임 시간 제한(60초), 정답·콤보로 점수 누적. HUD(점수·레벨·BOOM·콤보·타이머)는 Phaser 가
// 그리지 않고 registry 로 받은 콜백(MemoryHudConfig)으로 React DOM 오버레이에 넘긴다.

const PLAY_PAD = 32;
const GRID_GAP = 18;

// Beach 배경(BeachBg.png) 위 카드 시작 위치 — 이미지 해안선(거품/모래 경계 ≈ 0.25) 아래 모래,
// 폭탄 게이지(상단 ~28~31%) 바로 아래부터.
const SAND_TOP_FRAC = 0.31;

// 드래그 경로 히트테스트 샘플 간격(디자인 px). 빠른 스와이프에 카드 건너뜀(터널링) 방지.
const DRAG_SAMPLE_STEP = 24;

type CellRect = { cx: number; cy: number; w: number; h: number };
type Phase = "memorize" | "recall" | "resolved";

export class WireframeScene extends Phaser.Scene {
  private dpr = 1;
  // 월드 높이는 화면 비율에 맞춰 가변(GameShell 이 registry 로 주입). 폭은 720 고정.
  // gaugeTop = 하단 시간 게이지 밴드 top.
  private worldH = H;
  private gaugeTop =
    H - Math.round(H * GAUGE_BOTTOM_FRAC) - Math.round(H * GAUGE_H_FRAC);
  private hud: MemoryHudConfig = {};
  private cellRects: CellRect[] = [];
  // 셀 인덱스별 카드. 빈 칸은 undefined.
  private cardByCell: (Card | undefined)[] = [];

  private phase: Phase = "memorize";
  private round: RoundData = { placement: new Map(), wordCounts: {} };
  private remaining: Record<string, number> = {};
  private currentWord: string | null = null;
  private clearedCells = new Set<number>();
  private activeCount = 0;

  // 동적 난이도: 밴드별 연속 성공으로 레벨 +1, 실패 시 −FAIL_LEVEL_DROP.
  private levelIndex = 0;
  private successStreak = 0;

  // 점수·콤보: 정답 카드마다 점수 가산, 오답 시 콤보 0.
  private score = 0;
  private combo = 0;
  // 콤보는 정답 카드 2장(같은 카드 쌍)당 1 — 누적 정답 카드 수로 짝을 센다.
  private comboCardStreak = 0;

  private banner?: Phaser.GameObjects.Container;

  // bomb 게이지: 정답 카드마다 충전, 한계 넘으면 bomb 적립(여러 개 가능). 라운드 종료 후 소진.
  private boomGauge = 0;
  private pendingBombCount = 0;
  private bombActive = false;

  // 전체 게임 시간 제한. 0이면 게임 종료.
  private gameStartTime = 0;
  private gameOver = false;
  // 마지막으로 DOM 에 밀어 넣은 남은 초 — 초가 바뀔 때만 emit(매 프레임 setState 리렌더 방지).
  private lastTimerSec = -1;

  // 한 번의 누름(스트로크) 동안 이미 처리한 셀 인덱스 — 같은 스트로크 재처리 방지.
  private strokeHit = new Set<number>();
  private lastX = 0;
  private lastY = 0;

  constructor() {
    super("WireframeScene");
  }

  preload(): void {
    this.load.image("beachBg", BeachBgImg.src);
    WORD_ASSET_LIST.forEach((a) => this.load.image(a.key, a.src));
    this.load.image(BOMB_ASSET.key, BOMB_ASSET.src);
    this.load.image(STAR_PARTICLE.key, STAR_PARTICLE.src);
    this.load.image(NOVA_GLOW.key, NOVA_GLOW.src);
    this.load.image(NOVA_GLASS.key, NOVA_GLASS.src);
    this.load.image(SUNBURST_RAYS.key, SUNBURST_RAYS.src);
    this.load.audio(FLIP_SFX.key, FLIP_SFX.src);
    this.load.audio(FAIL_SFX.key, FAIL_SFX.src);
    this.load.audio(BGM.key, BGM.src);
  }

  create(): void {
    this.dpr = (this.registry.get("dpr") as number) ?? 1;
    this.hud = (this.registry.get("memoryHud") as MemoryHudConfig) ?? {};
    this.worldH = (this.registry.get("worldH") as number) ?? H;
    this.gaugeTop =
      this.worldH -
      Math.round(this.worldH * GAUGE_BOTTOM_FRAC) -
      Math.round(this.worldH * GAUGE_H_FRAC);
    this.cameras.main.setOrigin(0, 0);
    this.cameras.main.setZoom(this.dpr);

    this.drawPlayPanel();
    this.computeCells();
    this.setupInput();

    // HUD 초기값을 DOM 으로 밀어 넣는다(첫 렌더 정합).
    this.hud.onScore?.(0);
    this.hud.onCombo?.(0);
    this.hud.onBoom?.(0, 0);
    this.hud.onTimer?.(1, GAME_TIME_MS / 1000);

    // 배경음악 루프 시작(이미 재생 중이면 건너뜀). 일시정지는 GameShell 의 sound.pauseAll 로 연동.
    if (!this.sound.get(BGM.key)?.isPlaying) {
      this.sound.play(BGM.key, { loop: true, volume: 0.35 });
    }

    this.gameStartTime = this.time.now;
    this.startRound();
  }

  update(time: number): void {
    if (this.gameOver) {
      return;
    }
    const remainingMs = Math.max(0, GAME_TIME_MS - (time - this.gameStartTime));
    // 초가 바뀔 때만 DOM 갱신. 비율은 초 기준으로 맞춰 막대가 1초에 한 칸씩 줄되,
    // TimerBar 의 1s linear transition 이 그 사이를 부드럽게 채운다(매 프레임 리렌더 회피).
    const sec = Math.ceil(remainingMs / 1000);
    if (sec !== this.lastTimerSec) {
      this.lastTimerSec = sec;
      this.hud.onTimer?.(sec / (GAME_TIME_MS / 1000), sec);
    }
    if (remainingMs <= 0) {
      this.triggerGameOver();
    }
  }

  // ── 라운드 루프 ──

  private startRound(): void {
    if (this.gameOver) {
      return;
    }
    this.banner?.destroy();
    this.banner = undefined;
    this.cardByCell.forEach((c) => c?.destroy());
    this.cardByCell = new Array(CARD_COUNT).fill(undefined);
    this.clearedCells.clear();
    this.strokeHit.clear();
    this.currentWord = null;
    this.bombActive = false;

    // 적립된 bomb이 있으면 이번 라운드는 bomb 라운드(게이지는 유지·이어서 충전).
    if (this.pendingBombCount > 0) {
      this.pendingBombCount--;
      this.hud.onBoom?.(this.boomGauge / BOOM_GAUGE_MAX, this.pendingBombCount);
      this.startBombRound();
      return;
    }

    // 암기 시간은 플레이어 현재 레벨 기준.
    const playerLevel = LEVELS[this.levelIndex] ?? LEVELS[0];
    if (!playerLevel) {
      return;
    }

    // 튜토리얼을 넘기면 일정 확률로 보너스 패턴 배치. 아니면 [레벨−CONFIG_WINDOW, 레벨]
    // 구간의 무작위 구성으로 라운드를 만든다.
    const pastTutorial = this.levelIndex >= TUTORIAL_LEVEL_COUNT;
    if (pastTutorial && Math.random() < BONUS_PATTERN_CHANCE) {
      this.round = buildBonusRound();
    } else {
      const lo = Math.max(0, this.levelIndex - CONFIG_WINDOW);
      const configIndex =
        lo + Math.floor(Math.random() * (this.levelIndex - lo + 1));
      const cfg = LEVELS[configIndex] ?? playerLevel;
      this.round = buildRound(cfg.cards, cfg.minWords, cfg.maxWords);
    }
    this.remaining = { ...this.round.wordCounts };
    this.activeCount = this.round.placement.size;

    // 12칸 전부 뒷면으로 생성(동일한 뒷면). 단어 없는 칸은 빈 카드.
    const fruitCards: Card[] = [];
    for (let idx = 0; idx < CARD_COUNT; idx++) {
      const r = this.cellRects[idx];
      if (!r) {
        continue;
      }
      const word = this.round.placement.get(idx);
      const card = new Card(this, {
        x: r.cx,
        y: r.cy,
        width: r.w,
        height: r.h,
        word: word ?? "",
        textureKey: word
          ? WORD_ASSETS[word as keyof typeof WORD_ASSETS]?.key
          : undefined,
        faceUp: false,
        dpr: this.dpr,
      });
      this.cardByCell[idx] = card;
      if (word) {
        fruitCards.push(card);
      }
    }

    // 과일 카드만 잠깐 공개(암기) → 다시 엎기 → 입력 허용.
    this.phase = "memorize";
    fruitCards.forEach((c) => c.reveal());
    this.time.delayedCall(FLIP_TOTAL_MS + MEMORIZE_MS, () => {
      fruitCards.forEach((c) => c.conceal());
      this.time.delayedCall(FLIP_TOTAL_MS, () => {
        this.phase = "recall";
      });
    });
  }

  private onCardHit(index: number): void {
    if (this.phase !== "recall" || this.clearedCells.has(index)) {
      return;
    }
    const card = this.cardByCell[index];
    if (!card) {
      return;
    }

    // bomb 라운드: 정답 무관 뒤집으면 보상, 실패 없음. 전부 뒤집으면 종료.
    if (this.bombActive) {
      const firstBomb = this.clearedCells.size === 0;
      card.reveal();
      this.registerBomb();
      this.playFlipSfx();
      // 별은 매 카드, nova 는 2장(짝)마다. registerBomb 도 comboCardStreak 를 올린다.
      this.spawnStarVfx(index);
      if (this.comboCardStreak % 2 === 0) {
        this.spawnNovaVfx(index);
      }
      this.clearedCells.add(index);
      if (firstBomb) {
        // 첫 폭탄에만 게임 시간 +10초(시작 시각을 당겨 남은 시간 연장).
        this.gameStartTime += BOMB_TIME_BONUS_MS;
        this.showTimeBonus();
      }
      if (this.clearedCells.size === this.activeCount) {
        this.endBombRound();
      }
      return;
    }

    const word = this.round.placement.get(index);

    // 빈 카드(과일 아님) 또는 현재 그룹과 다른 단어 → 터치 카드만 X 표시하고 빠르게 종료.
    if (
      word === undefined ||
      (this.currentWord !== null && word !== this.currentWord)
    ) {
      card.reveal(() => card.shake());
      this.breakCombo();
      this.endRound(false);
      return;
    }

    // 같은 단어(또는 새 그룹 시작) → 정답.
    this.currentWord = word;
    card.reveal();
    this.registerCorrect();
    this.playFlipSfx();
    // 별은 매 정답 카드마다, nova(빛살·구슬)는 2장(짝)을 맞춘 순간에만. registerCorrect 가 방금
    // comboCardStreak 를 올렸으므로, 여기서 짝수면 이번 카드로 짝이 완성된 것이다(콤보 오르는 시점과 동일).
    this.spawnStarVfx(index);
    if (this.comboCardStreak % 2 === 0) {
      this.spawnNovaVfx(index);
    }
    this.chargeBoom();
    this.clearedCells.add(index);
    this.remaining[word] = (this.remaining[word] ?? 1) - 1;
    if (this.remaining[word] === 0) {
      this.currentWord = null; // 그룹 완료 → 다음 그룹 시작 가능
    }
    if (this.clearedCells.size === this.activeCount) {
      this.endRound(true);
    }
  }

  private endRound(win: boolean): void {
    this.phase = "resolved";
    this.adjustDifficulty(win);
    if (!win) {
      this.sound.play(FAIL_SFX.key, { volume: 0.6 });
      this.boomGauge = Math.max(0, this.boomGauge - BOOM_GAUGE_FAIL_PENALTY);
      this.hud.onBoom?.(this.boomGauge / BOOM_GAUGE_MAX, this.pendingBombCount);
    }
    this.showBanner(
      win ? this.praiseForCombo(this.combo) : "MISS!",
      win ? SEMANTIC.primaryLight : SEMANTIC.dangerDeep,
    );
    this.time.delayedCall(win ? WIN_PAUSE_MS : FAIL_PAUSE_MS, () =>
      this.startRound(),
    );
  }

  // 정답 카드마다 게이지 충전. 한계 도달하면 bomb 1개 적립하고 게이지 0부터 재충전.
  private chargeBoom(): void {
    this.boomGauge++;
    if (this.boomGauge >= BOOM_GAUGE_MAX) {
      this.boomGauge = 0;
      this.pendingBombCount++;
    }
    this.hud.onBoom?.(this.boomGauge / BOOM_GAUGE_MAX, this.pendingBombCount);
  }

  // ── 점수·콤보 ──

  // 정답 카드: 같은 카드 2장당 콤보 1 + 기본점수 × 콤보 배수.
  private registerCorrect(): void {
    this.bumpComboPerPair();
    const mult = Math.max(1, Math.min(this.combo, COMBO_MULT_CAP));
    this.addScore(BASE_SCORE * mult);
  }

  // 폭탄: 콤보는 이어가되 점수는 플랫.
  private registerBomb(): void {
    this.bumpComboPerPair();
    this.addScore(BOMB_SCORE);
  }

  // 정답 카드 2장마다 콤보 1 — 누적 카드 수가 짝수가 될 때만 콤보를 올린다.
  private bumpComboPerPair(): void {
    this.comboCardStreak++;
    if (this.comboCardStreak % 2 === 0) {
      this.combo++;
      this.hud.onCombo?.(this.combo);
    }
  }

  private breakCombo(): void {
    this.combo = 0;
    this.comboCardStreak = 0;
    this.hud.onCombo?.(0);
  }

  private addScore(points: number): void {
    this.score += points;
    this.hud.onScore?.(this.score);
  }

  // ── bomb 라운드 ──
  // 전체 12칸이 bomb 카드. 일반 라운드처럼 잠깐 앞면 공개 → 엎기 → 입력 허용.
  // 아무거나 뒤집으면 보상(실패 없음), 전부 뒤집으면 종료. 난이도·게이지 변화 없음(보너스).

  private startBombRound(): void {
    this.bombActive = true;
    this.activeCount = CARD_COUNT;
    const bombs: Card[] = [];
    for (let idx = 0; idx < CARD_COUNT; idx++) {
      const r = this.cellRects[idx];
      if (!r) {
        continue;
      }
      const card = new Card(this, {
        x: r.cx,
        y: r.cy,
        width: r.w,
        height: r.h,
        word: "",
        isBomb: true,
        faceUp: false,
        dpr: this.dpr,
      });
      this.cardByCell[idx] = card;
      bombs.push(card);
    }

    // 앞면 공개(BONUS 알림) → 엎기 → 입력 허용.
    this.phase = "memorize";
    this.showBanner("BONUS", SEMANTIC.milestoneGold);
    bombs.forEach((c) => c.reveal());
    this.time.delayedCall(FLIP_TOTAL_MS + MEMORIZE_MS, () => {
      this.banner?.destroy();
      this.banner = undefined;
      bombs.forEach((c) => c.conceal());
      this.time.delayedCall(FLIP_TOTAL_MS, () => {
        this.phase = "recall";
      });
    });
  }

  private endBombRound(): void {
    this.bombActive = false;
    this.phase = "resolved";
    this.showBanner(this.praiseForCombo(this.combo), SEMANTIC.milestoneGold);
    this.time.delayedCall(WIN_PAUSE_MS, () => this.startRound());
  }

  // 승급: 저~중레벨은 1회, 중~고레벨은 2회 연속 성공. 실패 시 −FAIL_LEVEL_DROP.
  private adjustDifficulty(win: boolean): void {
    if (!win) {
      this.levelIndex = Math.max(0, this.levelIndex - FAIL_LEVEL_DROP);
      this.successStreak = 0;
      return;
    }
    this.successStreak++;
    const winsNeeded =
      this.levelIndex < HIGH_BAND_LEVEL
        ? WINS_TO_ADVANCE_LOW
        : WINS_TO_ADVANCE_HIGH;
    if (this.successStreak >= winsNeeded) {
      this.levelIndex = Math.min(this.levelIndex + 1, LEVELS.length - 1);
      this.successStreak = 0;
    }
  }

  // 전체 게임 시간 종료 → 게임 오버 오버레이(React) 후 재시작(dev 루프).
  private triggerGameOver(): void {
    this.gameOver = true;
    this.phase = "resolved";
    this.hud.onTimer?.(0, 0);
    this.hud.onGameOver?.();
    this.time.delayedCall(GAME_OVER_PAUSE_MS, () => this.restartGame());
  }

  private restartGame(): void {
    this.gameOver = false;
    this.levelIndex = 0;
    this.successStreak = 0;
    this.boomGauge = 0;
    this.pendingBombCount = 0;
    this.bombActive = false;
    this.score = 0;
    this.combo = 0;
    this.comboCardStreak = 0;
    this.hud.onScore?.(0);
    this.hud.onCombo?.(0);
    this.hud.onBoom?.(0, 0);
    this.lastTimerSec = -1;
    this.gameStartTime = this.time.now;
    this.startRound();
  }

  // ── 입력: 탭 + 드래그 연속 뒤집기 ──

  private setupInput(): void {
    const onDown = (p: Phaser.Input.Pointer) => {
      this.strokeHit.clear();
      this.lastX = p.worldX;
      this.lastY = p.worldY;
      this.hitAt(p.worldX, p.worldY);
    };
    const onMove = (p: Phaser.Input.Pointer) => {
      if (!p.isDown) {
        return;
      }
      const dx = p.worldX - this.lastX;
      const dy = p.worldY - this.lastY;
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(dx, dy) / DRAG_SAMPLE_STEP),
      );
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        this.hitAt(this.lastX + dx * t, this.lastY + dy * t);
      }
      this.lastX = p.worldX;
      this.lastY = p.worldY;
    };

    this.input.on("pointerdown", onDown);
    this.input.on("pointermove", onMove);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointerdown", onDown);
      this.input.off("pointermove", onMove);
    });
  }

  private hitAt(x: number, y: number): void {
    for (let i = 0; i < this.cardByCell.length; i++) {
      if (this.strokeHit.has(i)) {
        continue;
      }
      const card = this.cardByCell[i];
      if (card?.contains(x, y)) {
        this.strokeHit.add(i);
        this.onCardHit(i);
      }
    }
  }

  // ── PLAY AREA ──

  // Beach 배경 — 하늘·바다·해안선·모래·소품이 한 일러스트(BeachBg.png). 고정 월드(720×1557, 이미지
  // 비율)를 꽉 채워 그린다(가장 먼저 그려 카드보다 뒤). HUD pill 은 하늘, 카드는 모래 위에 얹힌다.
  private drawPlayPanel(): void {
    this.add
      .image(0, 0, "beachBg")
      .setOrigin(0, 0)
      .setDisplaySize(W, this.worldH)
      .setDepth(-100);
  }

  // 하단 타이머(DOM) 위로 "+10s"가 떠오르며 사라지는 연출(월드 좌표 고정).
  private showTimeBonus(): void {
    const x = W / 2;
    const y = this.gaugeTop - 30;
    const t = this.add
      .text(x, y, "+10s", phaserSolid("44px", TEXT.solid, this.dpr))
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({
      targets: t,
      y: y - 68,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  private computeCells(): void {
    const left = PLAY_PAD;
    const innerW = W - PLAY_PAD * 2;
    // 카드는 비치 이미지 해안선 아래(모래)부터 채운다.
    const top = Math.round(this.worldH * SAND_TOP_FRAC);

    // 카드는 보드 상단부터 게이지 밴드 바로 위까지만 채운다(나머지는 시간 게이지 차지).
    const gridsBottom = this.gaugeTop - GAUGE_GAP;

    // 균일 3열 × 4행 격자(블록 분할 없음). 모든 간격이 GRID_GAP 로 동일. row-major 인덱스(row*3+col)는
    // round.ts 의 cellAt(col,row) 와 일치해 보너스 패턴 배치도 그대로 맞는다.
    const rows = CARD_COUNT / GRID_COLS;
    const cellW = (innerW - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
    const cellH = (gridsBottom - top - GRID_GAP * (rows - 1)) / rows;

    this.cellRects = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.cellRects.push({
          cx: left + col * (cellW + GRID_GAP) + cellW / 2,
          cy: top + row * (cellH + GRID_GAP) + cellH / 2,
          w: cellW,
          h: cellH,
        });
      }
    }
  }

  // ── helpers ──

  // 정답 카드 뒤집기 효과음 — 콤보가 높을수록 피치를 올린다(콤보당 +35 cents, 최대 ~3반음).
  private playFlipSfx(): void {
    const detune = Math.min(this.combo * 35, 350);
    this.sound.play(FLIP_SFX.key, { detune, volume: 0.3 });
  }

  // 별 파티클 버스트 — 정답 카드를 뒤집을 때마다(매 카드) 해당 셀 중심에서.
  private spawnStarVfx(index: number): void {
    const r = this.cellRects[index];
    if (!r) {
      return;
    }
    playStarBurst(this, r.cx, r.cy, r.w);
  }

  // nova(방사형 빛살 + 중앙 빛 + 유리구슬) — 정답 카드 2장(짝)을 맞췄을 때만.
  private spawnNovaVfx(index: number): void {
    const r = this.cellRects[index];
    if (!r) {
      return;
    }
    playNovaBurst(this, r.cx, r.cy, r.w);
  }

  // 콤보가 높을수록 강한 칭찬. 콤보는 실패 때만 끊겨 연속 성공일수록 누적되므로 성취도를 그대로 반영.
  // 구간: 0~1 GOOD · 2~3 NICE · 4~5 GREAT · 6~9 AWESOME · 10+ AMAZING(10콤보 마일스톤과 정렬).
  private praiseForCombo(combo: number): string {
    const tier =
      combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 4 ? 2 : combo >= 2 ? 1 : 0;
    return PRAISE_WORDS[tier] ?? "GREAT!";
  }

  // 콤보와 같은 버블+익스트루드 디자인. CSS 다층 그림자를 못 쓰는 캔버스라, 골든 브라운 글자를
  // 아래로 1px 씩 겹쳐 익스트루드(입체 두께)를 만들고, 맨 위에 골드 채움 + 두꺼운 보더를 얹는다.
  private showBanner(text: string, fillColor?: string): void {
    this.banner?.destroy();
    // 화면 정중앙에 띄운다.
    const y = Math.round(this.worldH / 2);
    const size = "144px";
    const px = parseInt(size, 10);

    const container = this.add.container(W / 2, y).setDepth(100);
    // 익스트루드 — 공유 em 오프셋을 px 로 환산하되, 글자가 커서 비율을 줄여 얇게(콤보의 35%).
    const extrudeScale = 0.35;
    [...EXTRUDE_OFFSETS]
      .sort((a, b) => b - a)
      .forEach((offset) => {
        container.add(
          this.add
            .text(
              0,
              Math.round(offset * px * extrudeScale),
              text,
              phaserBubbleLayer(size, this.dpr),
            )
            .setOrigin(0.5),
        );
      });
    container.add(
      this.add
        .text(0, 0, text, phaserBubbleTop(size, this.dpr, fillColor))
        .setOrigin(0.5),
    );

    this.banner = container;
    // 긴 문구(AWESOME!·AMAZING! 등)가 화면 폭을 넘으면 통째로 축소해 맞춘다. 짧은 문구는 원본 크기.
    const maxWidth = W * 0.9;
    const textWidth = container.getBounds().width;
    const fitScale = textWidth > maxWidth ? maxWidth / textWidth : 1;
    this.tweens.add({
      targets: container,
      scale: { from: 0.6 * fitScale, to: fitScale },
      duration: 220,
      ease: "Back.easeOut",
    });
  }
}
