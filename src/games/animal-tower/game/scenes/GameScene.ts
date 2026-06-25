import * as Phaser from "phaser";

import {
  playCountdown,
  COUNTDOWN_PALETTE,
} from "@/games/animal-tower/engine/countdown";
import {
  PORTRAIT_GAME_HEIGHT,
  PORTRAIT_GAME_WIDTH,
} from "@/games/animal-tower/engine/dimensions";
import type { ViewportInset } from "@/games/animal-tower/engine/viewport";
import type {
  EncounteredWord,
  GameResult,
} from "@/games/animal-tower/engine/gameTypes";
import {
  recordEncounter,
  toEncounteredWords,
} from "@/games/animal-tower/engine/encounteredWords";
import {
  PLATFORM,
  REGISTRY,
  SCENES,
  TEXTURES,
} from "../config/assetKeys";
import type { BlockDef } from "../config/assetKeys";
import { GAME_EVENT } from "../config/events";
import {
  PLATFORM_BOTTOM_MARGIN_PX,
  SWAPS_PER_ROUND,
  heightInMetersFromPeakY,
  worldYAtMeters,
} from "../config/gameplay";
import {
  MILESTONE_INTERVAL_M,
  crossedMilestones,
  reachedMilestone,
} from "../config/milestone";
import { DEV_TUNING } from "../config/devTuning";
import { paletteHex, fontSizePx } from "../config/theme";
import { playCollisionStars } from "../effects/collisionStars";
import { playIdleHint, type IdleHintController } from "../effects/idleHint";
import { playMilestoneCelebrate } from "../effects/milestoneCelebrate";
import { playMilestoneConfetti } from "../effects/milestoneConfetti";
import { playCloudPuff } from "../effects/cloudPuff";
import { playSpawnPop } from "../effects/spawnPop";
import { Anchor, MilestoneLine } from "../objects";

const COUNTDOWN_SECONDS = 3;
const COUNTDOWN_FONT_SIZE_PX = fontSizePx["4xl"];
const COUNTDOWN_DEPTH = 100;

const HANG_X_DEFAULT = PORTRAIT_GAME_WIDTH / 2;
/** 탑 윗면(towerTopY)이 viewport 상단에서 얼마나 아래에 보이게 할지(카메라 follow 기준점). 회전·교체로 매달림 외접 박스가 변해도 카메라가 흔들리지 않도록 hangY 가 아닌 towerTopY 를 기준으로 한다. */
const TOWER_TOP_VIEWPORT_OFFSET_Y_PX = 384;
/** 떨군 블록이 굴러떨어질 때 화면에 유지할 y. 이 아래로 벗어나면 카메라가 블록을 따라 내려간다. */
const FALLING_BLOCK_VIEWPORT_Y = 760;
/** 블록 추적 종료 후 탑 윗면으로 복귀할 때 lerp 계수(0~1, 클수록 빠름). 0 이면 멈춤. */
const CAMERA_RETURN_LERP = 0.12;
const HANG_X_MARGIN_PX = 96;
/** 행거 아랫면과 탑 정점 윗면 사이 안전 간격. 곂침 방지용. */
const HANG_TO_TOP_GAP_PX = 96;
/** 마일스톤 축하 텍스트의 화면 고정 y (scrollFactor 0). 상단 매달림 동물과 겹치지 않게 그 아래. */
const MILESTONE_CELEBRATE_VIEWPORT_Y = 500;
/** 보너스 발판의 탑 중심 대비 좌우 거리(px) 랜덤 범위. 좌우 번갈아 → 왼쪽 −max~−min, 오른쪽 min~max.
 * 최종 중심 x 는 보이는 영역(viewportInset)에 맞춰 클램프된다(spawnAnchor) — cover 잘림 대응. */
const ANCHOR_X_MIN_PX = 200;
const ANCHOR_X_MAX_PX = 300;
/** 발판 가장자리와 보이는 영역(inset 안쪽) 좌우 끝 사이 최소 여백(px). pop 오버슈트 여유 포함. */
const ANCHOR_SCREEN_MARGIN_PX = 20;
/** 마일스톤 돌파 시 다음 동물 스폰을 이만큼 미룬다 — 축하 연출이 끝난 뒤 등장하도록. */
const MILESTONE_SPAWN_HOLD_MS = 1400;

/** 배경 스크롤 레이어 — 블록·눈금선·플랫폼보다 뒤. */
const BG_DEPTH = -200;
/** 하늘 그라데이션 색 스톱 — SKY_START_M 부터 단조 감광. 메도우 sky 위에 덮어 그림. */
const SKY_START_COLOR = 0x9dd4fb; // 10m 지점 메도우 하늘색과 일치 → 이음새 0
const SKY_MID = 0x5e92c8; // 성층권 — 밝은 중간 파랑(너무 어둡지 않게)
const SPACE_COLOR = 0x000731; // 우주
/** 색 스톱 높이(m): START(깊어지기 시작) → MID → SPACE(우주색 도달) → 단색. */
const SKY_START_M = 10;
const SKY_MID_M = 20;
const SKY_SPACE_M = 30;
/** 우주 단색을 이 높이(m)까지 채워 둔다(상한 안전망). */
const SPACE_CEIL_M = 120;

/** 별 레이어 — 그라데이션 위·블록 뒤. */
const STAR_DEPTH = BG_DEPTH + 1;
/** 별 개수(생성 범위 전체). */
const STAR_COUNT = 110;
/** 별이 보이기 시작하는 높이(m, 여기선 거의 투명) → FULL 에서 또렷. */
const STAR_START_M = 15;
const STAR_FULL_M = 30;
/** 별을 흩뿌리는 최상단 높이(m). */
const STAR_TOP_M = 60;
const STAR_MIN_R = 1;
const STAR_MAX_R = 2.5;

/** 이 높이(m) 이상 마일스톤은 발판을 구름으로 — 별 뜨는 성층권(STAR_START_M)부터 잔디흙이
 * 우주 배경에 뜨면 이질적이라. 그 아래(5·10m)는 잔디 디딤돌(어포던스 학습 + 메도우 테마). */
const ANCHOR_CLOUD_FROM_M = STAR_START_M;

/** 받침대 흙블록 시각 치수 — 충돌(PLATFORM.height 얇은 슬랩)과 분리된 데코 전용.
 * 흙 몸통은 유한 높이 + 아래 모서리 둥글게 → 공중에 뜬 블록. 색은 전부 단색(그라데이션 없음). */
const PLATFORM_DEPTH = -1;
const PLATFORM_GRASS_FACE_H = 30;
const PLATFORM_SCALLOP_R = 18;
const PLATFORM_TOP_RADIUS = 22;
const PLATFORM_SOIL_DEPTH = 50;
const PLATFORM_BOTTOM_RADIUS = 20;
const PLATFORM_DIRT_SPOT_W = 46;
const PLATFORM_DIRT_SPOT_H = 14;
const PLATFORM_DIRT_SPOT_TOP_GAP = 28;
/** 회전 버튼 1회 클릭당 시계방향 회전 각도(=20°). */
const ROTATION_STEP_RAD = Math.PI / 9;

/** 더 작을수록 settled 판정이 까다로워진다(=물리가 더 오래 살아남음). */
const REST_SPEED_THRESHOLD = 0.15;
/** 0.001(매우 엄격) → 0.005(원본) 범위에서 튜닝. 작을수록 회전 도중 잠깐 느려지는 순간을 settled로 안 잡음. */
const REST_ANGULAR_SPEED_THRESHOLD = 0.001;
/** 60fps 기준 90프레임 = 1.5초 동안 연속 정지해야 settled 확정. 회전 감속 구간이 1초 넘게 보이는 케이스 차단. */
const REST_FRAMES_REQUIRED = 90;
/** 블록이 이 시간 안에 rest 못 하면 안전망 발동. 탑 전체 검사로 바뀌어 더 길게. */
const REST_TIMEOUT_MS = 30000;

const PHASE = {
  countdown: "countdown",
  playing: "playing",
  ended: "ended",
} as const;
type Phase = (typeof PHASE)[keyof typeof PHASE];

/** 월드 하단을 이 거리 이상 통과하면 화면 밖 낙하로 판정한다. */
const WORLD_BOTTOM_FALLOUT_PX = 240;

/** 중력 강도 (Phaser Matter default 1) — 오리지널 ATB의 사뿐한 낙하 느낌. */
const GRAVITY_Y = 0.4;

// Matter 충돌은 두 body friction의 min을 사용하므로 블록·플랫폼 모두 동일 값으로 올린다.
/** 동마찰 (default 0.1) — 쌓기 안정성 + 자연스러운 마찰. */
const BLOCK_FRICTION = 0.7;
/** 정마찰 (default 0.5) — 정지 상태에서 미끄러짐 시작 임계. */
const BLOCK_FRICTION_STATIC = 1.0;
/** 탄성 (default 0) — 쌓기 게임은 튕김 없음. */
const BLOCK_RESTITUTION = 0;
/** 공기 저항 (default 0.01) — 너무 높이면 낙하 속도 부자연. default 약간 위. */
const BLOCK_FRICTION_AIR = 0.02;
/** 단위 면적당 무게 (default 0.001). */
const BLOCK_DENSITY = 0.001;
/** 충돌 침투 허용 (Matter default 0.05). 높이면 착지 때 파고들었다 튕겨 나옴(pop) → 기본값으로. */
const BLOCK_SLOP = 0.05;

/** 첫 매달림 동물 등장 후 사용자가 아무 조작도 안 하면 손가락 안내가 뜨기까지의 대기 시간. 매 게임 1회만 노출. */
const IDLE_HINT_DELAY_MS = 3000;

/** 정규화된 fromVerts를 displayWidth × displayHeight 픽셀 좌표로 스케일. */
const buildMatterShape = (block: BlockDef) => ({
  type: "fromVerts" as const,
  verts: block.shape.verts.map((poly) =>
    poly.map(({ x, y }) => ({
      x: x * block.displayWidth,
      y: y * block.displayWidth * block.aspectRatio,
    })),
  ),
  flagInternal: block.shape.flagInternal,
});

export class GameScene extends Phaser.Scene {
  private phase: Phase = PHASE.countdown;
  private hangingBlock: Phaser.Physics.Matter.Image | null = null;
  private droppedBlock: Phaser.Physics.Matter.Image | null = null;
  private restFrameCount = 0;
  private restTimeoutEvent: Phaser.Time.TimerEvent | null = null;
  private isDraggingHangingBlock = false;
  private dragStartPointerX = 0;
  private dragStartBlockX = 0;
  /** 매 라운드 매달림 블록 변경 가능 횟수. spawn 시 SWAPS_PER_ROUND 로 reset, swap 사용 시 -1. */
  private remainingSwaps = 0;
  private settledBlocks: Phaser.Physics.Matter.Image[] = [];
  private droppedCount = 0;
  /** 정착 푸드들의 가장 작은 y값(=가장 높이 쌓인 위치). y는 화면 좌표라 작을수록 위. */
  private peakY = PORTRAIT_GAME_HEIGHT;
  /** 직전까지 돌파한 최고 5m 마일스톤(m). 새 돌파 판정의 상태. */
  private lastMilestone = 0;
  /** 마일스톤 돌파가 막 일어났으면 true — 다음 동물 스폰을 축하 종료 후로 미룬다. */
  private pendingMilestoneHold = false;
  /** wordId → 만난 단어 + 누적 횟수. drop 마다 누적. GameResult·BE payload 소스. */
  private encounters = new Map<number, EncounteredWord>();
  private startedAt = "";
  private endedAt = "";
  /** 첫 매달림 동물 등장 후 IDLE_HINT_DELAY_MS 동안 입력 없으면 fire. 첫 조작·게임 종료 시 cancel. */
  private idleHintTimer: Phaser.Time.TimerEvent | null = null;
  /** 손가락 안내가 화면에 표시 중인 동안만 non-null. 첫 조작 시 stop() → null. */
  private idleHint: IdleHintController | null = null;
  /** PreloadScene 이 registry 에 올린 셔플된 세션 단어 풀. create() 에서 주입. */
  private blocks: BlockDef[] = [];
  /** 다음 목표 마일스톤 눈금선(한 번에 하나). 돌파 시 다음 목표 높이로 이동. create()에서 생성. */
  private milestoneLine!: MilestoneLine;
  /** 마일스톤 돌파마다 띄운 보너스 발판들. scene 종료 시 일괄 정리. */
  private anchors: Anchor[] = [];

  constructor() {
    super(SCENES.game);
  }

  init(): void {
    this.phase = PHASE.countdown;
    this.hangingBlock = null;
    this.droppedBlock = null;
    this.restFrameCount = 0;
    this.restTimeoutEvent = null;
    this.isDraggingHangingBlock = false;
    this.remainingSwaps = 0;
    this.settledBlocks = [];
    this.droppedCount = 0;
    this.peakY = PORTRAIT_GAME_HEIGHT;
    this.lastMilestone = 0;
    this.pendingMilestoneHold = false;
    this.encounters = new Map();
    this.startedAt = "";
    this.endedAt = "";
    this.idleHintTimer = null;
    this.idleHint = null;
    this.blocks = [];
    this.anchors = [];
  }

  create(): void {
    this.blocks =
      (this.registry.get(REGISTRY.blocks) as BlockDef[] | undefined) ?? [];
    // 캔버스 백킹은 디자인 × dpr, 카메라 zoom 으로 게임 좌표를 디자인 그대로 유지.
    // setOrigin(0, 0): zoom pivot 을 viewport 좌상단으로 옮긴다. 기본값(0.5, 0.5)은
    // viewport 중앙 기준으로 확대해 world (0,0)이 화면 밖으로 밀려난다.
    const dpr = (this.registry.get("dpr") as number) ?? 1;
    this.cameras.main.setOrigin(0, 0);
    this.cameras.main.setZoom(dpr);
    this.matter.world.setGravity(0, GRAVITY_Y);
    // sleep 활성 — 정착 블록은 sleep 시켜 매 프레임 솔버 비용·drift 모두 차단.
    // 다만 활성(낙하 중) 블록은 spawn 시 sleepThreshold = Infinity 로 자동 sleep 을 막아,
    // 어색한 각도에서 Matter heuristic 이 조기 sleep 시키는 원래 버그를 회피한다.
    // 우리 자체 settle 판정(90프레임 + 엄격 임계)이 통과한 시점에 수동 sleep 시킨다.
    (
      this.matter.world.engine as unknown as { enableSleeping: boolean }
    ).enableSleeping = true;
    this.createSky();
    this.createStars();
    this.milestoneLine = new MilestoneLine(this);
    this.milestoneLine.showMilestone(MILESTONE_INTERVAL_M);
    this.createPlatform();
    this.scene.launch(SCENES.hud);
    playCountdown(
      this,
      {
        seconds: COUNTDOWN_SECONDS,
        depth: COUNTDOWN_DEPTH,
        fontSize: COUNTDOWN_FONT_SIZE_PX,
        // 카운트다운 — 4종 공통 색 언어(흰 텍스트 + brown900 외곽선, HUD 통일).
        // overlay 제거 (alpha 0) — 게임 배경 그대로 보임.
        color: COUNTDOWN_PALETTE.text,
        goColor: COUNTDOWN_PALETTE.go,
        stroke: COUNTDOWN_PALETTE.stroke,
        strokeThickness: 8,
        overlayColor: paletteHex.surface.cream,
        overlayAlpha: 0,
        worldWidth: PORTRAIT_GAME_WIDTH,
        worldHeight: PORTRAIT_GAME_HEIGHT,
      },
      () => this.startPlaying(),
    );

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
    this.events.on(GAME_EVENT.ROTATE_REQUESTED, this.onRotateRequested, this);
    this.events.on(GAME_EVENT.SWAP_REQUESTED, this.onSwapRequested, this);
    this.matter.world.on("collisionstart", this.onMatterCollisionStart, this);
    if (process.env.NODE_ENV === "development") {
      window.addEventListener(
        "tower-battle:test-milestone",
        this.onTestMilestone,
      );
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dismissIdleHint();
      if (process.env.NODE_ENV === "development") {
        window.removeEventListener(
          "tower-battle:test-milestone",
          this.onTestMilestone,
        );
      }
      this.input.off("pointerdown", this.onPointerDown, this);
      this.input.off("pointermove", this.onPointerMove, this);
      this.input.off("pointerup", this.onPointerUp, this);
      this.events.off(
        GAME_EVENT.ROTATE_REQUESTED,
        this.onRotateRequested,
        this,
      );
      this.events.off(GAME_EVENT.SWAP_REQUESTED, this.onSwapRequested, this);
      // restart 흐름에서 SHUTDOWN 이 호출되는 시점에 matter.world 가 이미 null
      // 로 정리된 케이스가 있어 가드 후 off.
      if (this.matter.world) {
        this.matter.world.off(
          "collisionstart",
          this.onMatterCollisionStart,
          this,
        );
      }
    });
  }

  /** Matter 충돌 시작마다 contact point 에서 별 burst 를 띄운다. */
  private onMatterCollisionStart(
    event: Phaser.Physics.Matter.Events.CollisionStartEvent,
  ): void {
    if (this.phase !== PHASE.playing) {
      return;
    }
    for (const pair of event.pairs) {
      const supports = pair.collision?.supports;
      if (!supports || supports.length === 0) {
        continue;
      }
      const point = supports[0];
      playCollisionStars(this, point.x, point.y);
    }
  }

  private startPlaying(): void {
    this.phase = PHASE.playing;
    this.startedAt = new Date().toISOString();
    this.spawnHangingBlock();
    this.scheduleIdleHint();
  }

  /** 매 게임 1회 호출 — startPlaying 직후. 만료되면 한 번만 손가락 안내가 뜨고 다시 스케줄되지 않는다. */
  private scheduleIdleHint(): void {
    if (this.idleHintTimer || this.idleHint) {
      return;
    }
    this.idleHintTimer = this.time.delayedCall(IDLE_HINT_DELAY_MS, () => {
      this.idleHintTimer = null;
      if (this.phase !== PHASE.playing || !this.hangingBlock) {
        return;
      }
      this.idleHint = playIdleHint(this, this.hangingBlock);
    });
  }

  private dismissIdleHint(): void {
    if (this.idleHintTimer) {
      this.idleHintTimer.remove(false);
      this.idleHintTimer = null;
    }
    if (this.idleHint) {
      this.idleHint.stop();
      this.idleHint = null;
    }
  }

  private pickRandomBlock(): BlockDef | undefined {
    return this.blocks[Math.floor(Math.random() * this.blocks.length)];
  }

  private findBlockByKey(key: string): BlockDef | undefined {
    return this.blocks.find((b) => b.key === key);
  }

  private spawnHangingBlock(): void {
    const block = this.pickRandomBlock();
    if (!block) {
      return;
    }
    this.installHangingBlock(block, HANG_X_DEFAULT);
    this.remainingSwaps = SWAPS_PER_ROUND;
  }

  private onSwapRequested(): void {
    if (
      this.phase !== PHASE.playing ||
      !this.hangingBlock ||
      this.remainingSwaps <= 0 ||
      this.isDraggingHangingBlock
    ) {
      return;
    }
    this.dismissIdleHint();
    const oldKey = this.hangingBlock.texture.key;
    const candidates = this.blocks.filter((b) => b.key !== oldKey);
    if (candidates.length === 0) {
      return;
    }
    const newBlock = candidates[Math.floor(Math.random() * candidates.length)];
    if (!newBlock) {
      return;
    }
    const x = this.hangingBlock.x;
    // 등장 pop(playSpawnPop)이 아직 도는 중에 연타로 destroy 하면, 죽은 Matter body 의
    // scaleX 를 트윈이 계속 써서 Body.scale 이 크래시한다 → destroy 전에 트윈 정리.
    this.tweens.killTweensOf(this.hangingBlock);
    this.hangingBlock.destroy();
    this.installHangingBlock(newBlock, x);
    this.remainingSwaps -= 1;
    if (this.remainingSwaps <= 0) {
      this.events.emit(GAME_EVENT.SWAP_DEPLETED);
    }
  }

  /** 매달림 image 생성·hangY 정렬·등장 pop·HUD notify 를 묶는 단일 절차. */
  private installHangingBlock(block: BlockDef, x: number): void {
    // FE-7 이전부터 검증된 생성 경로. body 는 shape(=정규화 verts × displayWidth)
    // 에서 만들어져 텍스처 크기와 무관하게 디자인 좌표로 정확하다. 충돌 정합은
    // 이 한 줄로 보장된다.
    //
    // setDisplaySize 는 호출하지 않는다 — Phaser Matter Image 는 sprite scale 을
    // 바꾸면 물리 body 도 같은 배율로 scale 하므로, 원격 래스터(native 크기 임의)
    // 를 setDisplaySize 로 맞추면 body 가 비대칭으로 찌그러져 충돌이 깨진다.
    // sprite 표시 크기 보정은 PreloadScene 에서 텍스처를 디자인 치수로 굽는
    // 방식으로 분리한다 (texture 차원의 문제 → preload 책임).
    //
    // isStatic 은 옵션이 아닌 setStatic() 명시 호출로 적용한다. Matter Body.setStatic
    // 은 호출 시점에 body 가 이미 static 이면 _original 을 캡처하지 않아(`if (!part.isStatic)`
    // 가드) 이후 setStatic(false) 에서 복원할 mass/inertia 가 사라지는 함정이 있다.
    // 따라서 dynamic 상태로 생성 → setStatic(true) 순서로 _original 을 안전하게 박는다.
    this.hangingBlock = this.matter.add.image(x, 0, block.key, undefined, {
      shape: buildMatterShape(block),
      friction: BLOCK_FRICTION,
      frictionStatic: BLOCK_FRICTION_STATIC,
      frictionAir: BLOCK_FRICTION_AIR,
      restitution: BLOCK_RESTITUTION,
      density: BLOCK_DENSITY,
      slop: BLOCK_SLOP,
    });
    this.hangingBlock.setStatic(true);
    this.hangingBlock.setY(this.computeHangY());
    playCloudPuff(
      this,
      this.hangingBlock.x,
      this.hangingBlock.y,
      block.displayWidth,
    );
    playSpawnPop(this, this.hangingBlock);
    this.events.emit(GAME_EVENT.BLOCK_SPAWNED, {
      animalName: block.animalName,
    });
  }

  /** 좌대(또는 가장 높이 쌓인 settled)의 윗면 y. */
  private getTowerTopY(): number {
    if (this.settledBlocks.length === 0) {
      return PORTRAIT_GAME_HEIGHT - PLATFORM_BOTTOM_MARGIN_PX - PLATFORM.height;
    }
    let topY = PORTRAIT_GAME_HEIGHT;
    for (const block of this.settledBlocks) {
      const body = block.body as MatterJS.BodyType | null;
      if (!body) {
        continue;
      }
      if (body.bounds.min.y < topY) {
        topY = body.bounds.min.y;
      }
    }
    return topY;
  }

  /** 회전 반영된 행거 외접 박스의 절반 높이. */
  private getHangingHalfHeight(): number {
    if (!this.hangingBlock) {
      return 0;
    }
    const body = this.hangingBlock.body as MatterJS.BodyType | null;
    if (!body) {
      return 0;
    }
    return (body.bounds.max.y - body.bounds.min.y) / 2;
  }

  private computeHangY(): number {
    return (
      this.getTowerTopY() - HANG_TO_TOP_GAP_PX - this.getHangingHalfHeight()
    );
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.phase !== PHASE.playing || !this.hangingBlock) {
      return;
    }
    this.dismissIdleHint();
    this.isDraggingHangingBlock = true;
    this.dragStartPointerX = pointer.worldX;
    this.dragStartBlockX = this.hangingBlock.x;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDraggingHangingBlock || !this.hangingBlock) {
      return;
    }
    const deltaX = pointer.worldX - this.dragStartPointerX;
    this.moveHangingBlockX(this.dragStartBlockX + deltaX);
  }

  private onPointerUp(): void {
    if (!this.isDraggingHangingBlock) {
      return;
    }
    this.isDraggingHangingBlock = false;
    this.dropHangingBlock();
  }

  private moveHangingBlockX(worldX: number): void {
    if (!this.hangingBlock) {
      return;
    }
    const clampedX = Phaser.Math.Clamp(
      worldX,
      HANG_X_MARGIN_PX,
      PORTRAIT_GAME_WIDTH - HANG_X_MARGIN_PX,
    );
    this.hangingBlock.setPosition(clampedX, this.computeHangY());
  }

  private onRotateRequested(): void {
    if (this.phase !== PHASE.playing || !this.hangingBlock) {
      return;
    }
    this.dismissIdleHint();
    this.hangingBlock.setRotation(
      this.hangingBlock.rotation + ROTATION_STEP_RAD,
    );
    this.hangingBlock.setY(this.computeHangY());
  }

  private dropHangingBlock(): void {
    if (!this.hangingBlock) {
      return;
    }
    const released = this.hangingBlock;
    const blockDef = this.findBlockByKey(released.texture.key);
    if (blockDef) {
      // 만난 단어 누적 (wordId dedupe + count). GameResult·BE payload 단일 소스.
      recordEncounter(this.encounters, {
        id: blockDef.id,
        nameEn: blockDef.animalName,
        nameKo: blockDef.nameKo,
        imageUrl: blockDef.imageUrl,
        audioUrl: blockDef.audioUrl,
      });
    }
    // 매달림 → 낙하: body 재생성 없이 isStatic 토글로 전환해 polygon 분해·body
    // 할당·GameObject 재할당 비용을 매 드롭마다 0 으로 만든다(=드롭 stutter 제거).
    // _original 복원으로 mass/inertia 가 dynamic 시절 값으로 돌아가려면 spawn 시점에
    // dynamic→static 순서로 세팅돼 있어야 한다(installHangingBlock 주석 참조).
    released.setStatic(false);
    const releasedBody = released.body as MatterJS.BodyType | null;
    if (releasedBody) {
      // setStatic(false) 는 isSleeping 을 복원하지 않아 정적 시절 sleep 상태가
      // 남으면 중력이 무시될 수 있다. 명시적으로 깨운다.
      (releasedBody as unknown as { isSleeping: boolean }).isSleeping = false;
      // 활성 블록은 Matter 기본 sleepThreshold(60프레임)로 자동 sleep 되면 어색한
      // 각도에서 굳는 원래 버그가 재발한다. Infinity 로 자동 sleep 을 끄고,
      // settle 판정 통과 시점에 handleBlockSettled 가 수동 sleep 시킨다.
      (releasedBody as unknown as { sleepThreshold: number }).sleepThreshold =
        Infinity;
    }
    this.droppedBlock = released;
    this.hangingBlock = null;
    this.restFrameCount = 0;
    this.restTimeoutEvent = this.time.delayedCall(REST_TIMEOUT_MS, () => {
      this.handleBlockEjected();
    });
  }

  update(): void {
    if (this.phase === PHASE.ended) {
      return;
    }
    this.updateCameraFollow();
    if (this.checkEjection()) {
      return;
    }
    if (!this.droppedBlock) {
      return;
    }
    // droppedBlock + 모든 settledBlocks 가 동시에 정지 상태일 때만 settled 카운트.
    // 위 블록 충격으로 settled 가 흔들리면 카운트 리셋되어 탑 전체 안정 후 진행.
    const allBlocks = [this.droppedBlock, ...this.settledBlocks];
    const allAtRest = allBlocks.every((block) => {
      const body = block.body as MatterJS.BodyType | null;
      return (
        body !== null &&
        body.speed < REST_SPEED_THRESHOLD &&
        body.angularSpeed < REST_ANGULAR_SPEED_THRESHOLD
      );
    });
    if (allAtRest) {
      this.restFrameCount += 1;
      if (this.restFrameCount >= REST_FRAMES_REQUIRED) {
        this.handleBlockSettled();
      }
    } else {
      this.restFrameCount = 0;
    }
  }

  private checkEjection(): boolean {
    // 블록이 화면 하단을 일정 거리 이상 통과하면 게임 오버.
    // x 좌표 검사는 하지 않는다 (좌대 너머로 미끄러진 블록은 중력으로 자연 낙하).
    // y 검사는 droppedBlock + settledBlocks 모두 — 위 블록 충격으로 정착 블록이 밀려 떨어져도 종료.
    const candidates = this.droppedBlock
      ? [this.droppedBlock, ...this.settledBlocks]
      : this.settledBlocks;
    for (const block of candidates) {
      if (block.y > PORTRAIT_GAME_HEIGHT + WORLD_BOTTOM_FALLOUT_PX) {
        this.endGame();
        return true;
      }
    }
    return false;
  }

  private endGame(): void {
    if (this.phase === PHASE.ended) {
      return;
    }
    this.phase = PHASE.ended;
    this.endedAt = new Date().toISOString();
    this.dismissIdleHint();
    if (this.restTimeoutEvent) {
      this.restTimeoutEvent.remove(false);
      this.restTimeoutEvent = null;
    }
    // 통일 게임 I/O 계약 (ADR-0004). 높이·푸드 카운트 등 game-specific 통계는
    // 결과 화면에서 사라짐 — 인지된 trade-off(#27). 게임 중 HUD 엔 그대로.
    // score 는 HUD 표시 높이(m) × 100 — BE play_session.score 기록용 (UI 표시 없음).
    const result: GameResult = {
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      encounteredWords: toEncounteredWords(this.encounters),
      score: Math.round(heightInMetersFromPeakY(this.peakY) * 100),
    };
    this.game.events.emit(GAME_EVENT.GAME_ENDED, result);
  }

  private updateCameraFollow(): void {
    // 카메라 scrollY 는 기본적으로 탑 윗면(towerTopY) 기준 — 매달림 회전·교체로 외접
    // 박스가 변해 hangY 가 흔들려도 카메라는 영향받지 않아야 정착 블록들이 화면 안에서
    // 출렁이는 것처럼 보이지 않는다.
    const towerTopY = this.getTowerTopY();
    const towerTarget = Math.min(0, towerTopY - TOWER_TOP_VIEWPORT_OFFSET_Y_PX);
    // 단, 떨군 블록이 탑 옆으로 굴러 기본 프레임 아래로 벗어나면 그 블록을 따라 내려가
    // 어떻게 되는지 끝까지 보여 준다(정착·낙하종료 시 droppedBlock=null → 자동 복귀).
    let target = towerTarget;
    let following = false;
    if (this.droppedBlock) {
      const followY = Math.min(
        0,
        this.droppedBlock.y - FALLING_BLOCK_VIEWPORT_Y,
      );
      if (followY > towerTarget) {
        target = followY;
        following = true;
      }
    }
    // 추적 중엔 타이트하게(블록이 화면에서 미끄러지지 않게), 복귀·평소엔 lerp 로 부드럽게.
    this.cameras.main.scrollY = following
      ? target
      : Phaser.Math.Linear(
          this.cameras.main.scrollY,
          target,
          CAMERA_RETURN_LERP,
        );
    if (this.hangingBlock) {
      this.hangingBlock.setY(this.computeHangY());
    }
  }

  private handleBlockSettled(): void {
    if (!this.droppedBlock) {
      return;
    }
    const settled = this.droppedBlock;
    this.settledBlocks.push(settled);
    this.droppedCount += 1;
    // HUD '높이'는 탑의 실제 윗면 기준이어야 한다. centroid(settled.y)는 회전된 큰
    // 블록에서 정점보다 m 값이 작게 표시되는 미세 오차를 만든다.
    const settledBody = settled.body as MatterJS.BodyType | null;
    if (settledBody && settledBody.bounds.min.y < this.peakY) {
      this.peakY = settledBody.bounds.min.y;
    }
    this.celebrateMilestonesIfCrossed();
    // settle 확정된 블록은 수동 sleep 시켜 drift 를 차단한다.
    // - sleepThreshold 를 Matter 기본값(60)으로 복귀: 충돌로 깨어난 뒤 다시 정지하면
    //   Matter 가 자동 재 sleep 하도록.
    // - 잔존 속도 0 으로 정리한 뒤 isSleeping = true.
    // 위에서 새 블록이 떨어져 충돌하면 Matter 가 collision-wake 로 깨워주므로
    // 흔들림·연쇄 토폴 같은 게임 느낌은 유지된다.
    if (settledBody) {
      (settledBody as unknown as { sleepThreshold: number }).sleepThreshold =
        60;
      this.matter.body.setVelocity(settledBody, { x: 0, y: 0 });
      this.matter.body.setAngularVelocity(settledBody, 0);
      (settledBody as unknown as { isSleeping: boolean }).isSleeping = true;
    }
    this.events.emit(GAME_EVENT.BLOCK_SETTLED, {
      peakY: this.peakY,
      droppedCount: this.droppedCount,
    });
    this.advanceToNextBlock();
  }

  /**
   * peakY 갱신 직후 호출 — 새 5m 마일스톤을 넘었으면 탑 윗면 위에서 축하 연출.
   * 무한 등반·승리 없음(#106)이라 종료가 아닌 인-플레이 보상으로만 작동한다.
   * 큰 블록으로 여러 구간을 한 번에 점프해도 축하는 최고 구간 1회만 띄운다.
   */
  private celebrateMilestonesIfCrossed(): void {
    const heightM = heightInMetersFromPeakY(this.peakY);
    if (crossedMilestones(this.lastMilestone, heightM).length === 0) {
      return;
    }
    this.lastMilestone = reachedMilestone(heightM);
    this.milestoneLine.burstMilestone();
    this.milestoneLine.showMilestone(this.lastMilestone + MILESTONE_INTERVAL_M);
    this.spawnAnchor(this.lastMilestone);
    this.fireMilestoneCelebration();
    this.pendingMilestoneHold = true;
  }

  /**
   * 돌파한 마일스톤 높이에 보너스 발판(디딤돌)을 띄운다. 좌우 번갈아(홀수 왼쪽·짝수 오른쪽)
   * + 그 쪽에서 거리 200~300px 랜덤. 높이·치수는 DEV_TUNING.
   *
   * 생성 위치는 마일스톤 순간 화면 안(탑 꼭대기 위 ~100px)이라, 등장 연출을 생성 즉시
   * 발동한다 — 무음·무동작으로 슥 생기면 축하 진앙(중앙)에서 떨어진 발판에 시선이 안 가
   * 인식이 떨어지므로, scale pop + 먼지 puff 로 시선을 끌고 "단단한 발판"임을 강조한다.
   */
  private spawnAnchor(milestoneM: number): void {
    const ordinal = milestoneM / MILESTONE_INTERVAL_M; // 1, 2, 3 …
    const side = ordinal % 2 === 1 ? -1 : 1; // 홀수 왼쪽, 짝수 오른쪽
    const width = DEV_TUNING.anchorWidthPx;
    const half = width / 2;
    // cover 모드에서 좌우가 잘리므로(viewportInset), 카메라 월드폭(720)이 아니라 실제
    // 보이는 영역 [inset.left, WIDTH-inset.right] 기준으로 발판 중심을 클램프한다.
    // MilestoneLine 과 같은 inset 출처 → 가로선과 동일한 안전 영역. 어떤 기기·폭에도 안 잘림.
    const inset = this.registry.get("viewportInset") as
      | ViewportInset
      | undefined;
    const leftBound = (inset?.left ?? 0) + ANCHOR_SCREEN_MARGIN_PX + half;
    const rightBound =
      PORTRAIT_GAME_WIDTH -
      (inset?.right ?? 0) -
      ANCHOR_SCREEN_MARGIN_PX -
      half;
    const magnitude =
      ANCHOR_X_MIN_PX + Math.random() * (ANCHOR_X_MAX_PX - ANCHOR_X_MIN_PX);
    const desiredX = PORTRAIT_GAME_WIDTH / 2 + side * magnitude;
    const x = Math.min(Math.max(desiredX, leftBound), rightBound);
    const landingY = worldYAtMeters(
      milestoneM + DEV_TUNING.anchorAboveMilestoneM,
    );
    const variant = milestoneM >= ANCHOR_CLOUD_FROM_M ? "cloud" : "grass";
    const anchor = new Anchor(this, x, landingY, width, variant);
    this.anchors.push(anchor);

    // 등장 연출 — 시각 컨테이너만 spring pop(Back.Out 오버슈트=바운스), 발판 윗면에 먼지 puff.
    playSpawnPop(this, anchor.root);
    playCloudPuff(this, x, landingY, width);
  }

  /** 마일스톤 축하 연출(텍스트·콘페티·격려)을 한 번에 발동. 실제 돌파 + dev 테스트 공용. */
  private fireMilestoneCelebration(): void {
    playMilestoneCelebrate(
      this,
      PORTRAIT_GAME_WIDTH / 2,
      MILESTONE_CELEBRATE_VIEWPORT_Y,
      this.lastMilestone,
    );
    playMilestoneConfetti(this);
  }

  /** dev 전용 — 버튼 이벤트로 마일스톤 효과를 즉시 테스트. 실제 높이와 무관하게 다음 5m 발동. */
  private readonly onTestMilestone = (): void => {
    this.lastMilestone += MILESTONE_INTERVAL_M;
    this.milestoneLine.burstMilestone();
    this.milestoneLine.showMilestone(this.lastMilestone + MILESTONE_INTERVAL_M);
    this.spawnAnchor(this.lastMilestone);
    this.fireMilestoneCelebration();
  };

  private handleBlockEjected(): void {
    // rest timeout fallback. game over 대신 정착 인정 후 다음 블록으로.
    // 진짜 게임 오버는 checkEjection의 화면 밖 낙하 검사가 잡는다.
    if (!this.droppedBlock) {
      return;
    }
    this.handleBlockSettled();
  }

  private advanceToNextBlock(): void {
    if (!this.droppedBlock) {
      return;
    }
    this.droppedBlock = null;
    this.restFrameCount = 0;
    if (this.restTimeoutEvent) {
      this.restTimeoutEvent.remove(false);
      this.restTimeoutEvent = null;
    }
    if (this.phase !== PHASE.playing) {
      return;
    }
    // 마일스톤 돌파 직후엔 축하 연출이 끝난 뒤 동물이 등장하도록 스폰만 미룬다
    // (droppedBlock 은 위에서 이미 null 처리 — update 가 같은 블록을 재정착으로 오인하지 않음).
    if (this.pendingMilestoneHold) {
      this.pendingMilestoneHold = false;
      this.time.delayedCall(MILESTONE_SPAWN_HOLD_MS, () => {
        if (this.phase === PHASE.playing && !this.hangingBlock) {
          this.spawnHangingBlock();
        }
      });
      return;
    }
    this.spawnHangingBlock();
  }

  /**
   * 배경 스크롤 레이어 — 카메라가 위로 스크롤하면 발밑 메도우가 멀어지고 하늘이 점점
   * 깊어져 우주가 드러난다(자연스러운 상승감). 정적 DOM 배경 대체.
   *   메도우: 월드 Y 0..H (지면 + 밝은 하늘, ~0~10m)
   *   하늘: SKY_START_M(10m) 지점 메도우 하늘색에서 시작해 우주(SKY_SPACE_M=20m)까지
   *         *단조 감광* 절차적 그라데이션을 메도우 sky 위에 덮어 그림 → 이음새 0.
   *   우주: 그 위 ~ SPACE_CEIL_M 까지 #000731 단색(별 타일 나오면 교체)
   * (이미지 이음새 색을 AI 가 못 맞춰 절차적 그라데이션으로 대체 — 명도 역전 제거.)
   */
  private createSky(): void {
    const w = PORTRAIT_GAME_WIDTH;
    // 메도우 — 월드 Y 0..H, 지면+밝은 하늘. 10m 아래 sky·지면은 그대로 보인다.
    this.add
      .image(0, 0, TEXTURES.bgMeadow)
      .setOrigin(0, 0)
      .setDepth(BG_DEPTH)
      .setDisplaySize(w, PORTRAIT_GAME_HEIGHT);

    // 하늘 그라데이션 — 10m(메도우 하늘색)부터 위로만 덮어 단조 감광 → 우주(20m).
    const startY = worldYAtMeters(SKY_START_M);
    const midY = worldYAtMeters(SKY_MID_M);
    const spaceY = worldYAtMeters(SKY_SPACE_M);
    const ceilY = worldYAtMeters(SPACE_CEIL_M);
    const g = this.add.graphics().setDepth(BG_DEPTH);
    // seg1: 10m(메도우 하늘색) → MID.
    g.fillGradientStyle(SKY_MID, SKY_MID, SKY_START_COLOR, SKY_START_COLOR, 1);
    g.fillRect(0, midY, w, startY - midY);
    // seg2: MID → 우주색.
    g.fillGradientStyle(SPACE_COLOR, SPACE_COLOR, SKY_MID, SKY_MID, 1);
    g.fillRect(0, spaceY, w, midY - spaceY);
    // 우주 단색 (상한까지)
    g.fillStyle(SPACE_COLOR, 1);
    g.fillRect(0, ceilY, w, spaceY - ceilY);
  }

  /**
   * 별 레이어 — 성층권(~STAR_START_M)부터 위로 흩뿌린다. 고도가 높을수록 alpha 가
   * 올라가 또렷해진다(낮은 곳에선 밝은 하늘이라 거의 안 보임). 정적이라 한 번 그리면 끝.
   */
  private createStars(): void {
    const w = PORTRAIT_GAME_WIDTH;
    const topY = worldYAtMeters(STAR_TOP_M);
    const bottomY = worldYAtMeters(STAR_START_M);
    const g = this.add.graphics().setDepth(STAR_DEPTH);
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const y = Phaser.Math.Between(topY, bottomY);
      const m = heightInMetersFromPeakY(y);
      const alpha = Phaser.Math.Clamp(
        (m - STAR_START_M) / (STAR_FULL_M - STAR_START_M),
        0,
        1,
      );
      if (alpha <= 0) {
        continue;
      }
      const x = Phaser.Math.Between(0, w);
      const r = Phaser.Math.FloatBetween(STAR_MIN_R, STAR_MAX_R);
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(x, y, r);
    }
  }

  private createPlatform(): void {
    const x = PORTRAIT_GAME_WIDTH / 2;
    const yCenter =
      PORTRAIT_GAME_HEIGHT - PLATFORM_BOTTOM_MARGIN_PX - PLATFORM.height / 2;
    // 충돌 body 는 잔디 윗면(=landing line, PLATFORM_TOP_Y) 기준 얇은 사각형 그대로.
    // 흙 몸통은 시각 전용이라 물리에 포함하지 않는다 — 높이 계산·정착 판정 불변.
    this.matter.add.rectangle(x, yCenter, PLATFORM.width, PLATFORM.height, {
      isStatic: true,
      friction: BLOCK_FRICTION,
      frictionStatic: BLOCK_FRICTION_STATIC,
      restitution: BLOCK_RESTITUTION,
      slop: BLOCK_SLOP,
    });
    this.drawPlatformVisual(x, yCenter - PLATFORM.height / 2);
  }

  /**
   * 받침대 흙블록 시각 — 충돌(얇은 슬랩)과 분리된 순수 데코. 잔디 윗면(grassTopY =
   * landing line) + 늘어진 술(scallop) + 갈색 흙 몸통(화면 하단까지) + 흙 점.
   */
  private drawPlatformVisual(centerX: number, grassTopY: number): void {
    const w = PLATFORM.width;
    const left = centerX - w / 2;
    const soilTopY = grassTopY + PLATFORM_GRASS_FACE_H;
    const soilBottomY = soilTopY + PLATFORM_SOIL_DEPTH;
    const g = this.add.graphics().setDepth(PLATFORM_DEPTH);

    // 흙 몸통 — 유한 높이, 아래 모서리만 둥글게 → 공중에 뜬 블록.
    g.fillStyle(paletteHex.block.soil, 1);
    g.fillRoundedRect(left, soilTopY, w, soilBottomY - soilTopY, {
      tl: 0,
      tr: 0,
      bl: PLATFORM_BOTTOM_RADIUS,
      br: PLATFORM_BOTTOM_RADIUS,
    });
    // 흙 점 — 어두운 갈색 대시 2개
    g.fillStyle(paletteHex.block.soilShade, 1);
    [centerX - 100, centerX + 64].forEach((sx) => {
      g.fillRoundedRect(
        sx - PLATFORM_DIRT_SPOT_W / 2,
        soilTopY + PLATFORM_DIRT_SPOT_TOP_GAP,
        PLATFORM_DIRT_SPOT_W,
        PLATFORM_DIRT_SPOT_H,
        PLATFORM_DIRT_SPOT_H / 2,
      );
    });

    // 잔디 — 단색(그라데이션 없음). 술 bump + 윗면 모두 같은 green, 갈색 흙 위에서 형태가 드러남.
    g.fillStyle(paletteHex.block.platform, 1);
    for (
      let cx = left + PLATFORM_SCALLOP_R;
      cx <= left + w - PLATFORM_SCALLOP_R + 1;
      cx += PLATFORM_SCALLOP_R * 2
    ) {
      g.fillCircle(cx, soilTopY, PLATFORM_SCALLOP_R);
    }
    g.fillRoundedRect(left, grassTopY, w, PLATFORM_GRASS_FACE_H, {
      tl: PLATFORM_TOP_RADIUS,
      tr: PLATFORM_TOP_RADIUS,
      bl: 0,
      br: 0,
    });
  }
}
