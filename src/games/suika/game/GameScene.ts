import * as Phaser from "phaser";

import { createStrokedText } from "./lib/textHelpers";
import { CHAIN, INDEX_BY_NAME } from "./config/chain";
import { FIRE_DESCENT_EVENT } from "./events";

import TrophyImg from "./assets/Trophy.png";
import IceFloorImg from "./assets/IceFloor.png";
import IceBinImg from "./assets/IceBinTier.png";
import IceBinBrokenImg from "./assets/IceBinBroken.png";
import IceCastleImg from "./assets/IceCastle.png";
import StripeBgImg from "./assets/StripeBackground.png";
import { FRUIT_BODY_FILL, FRUIT_BODY_ORIGIN } from "./assets/fruitOverrides";
import { LOCAL_OBJECTS } from "./config/objects";
import type {
  DropGameConfig,
  GameResult,
  MergeObject,
  MergedObject,
} from "./types";
import { playComboPop } from "./effects/comboPop";
import {
  playAdjectiveVoice,
  preloadAdjectiveVoices,
} from "./effects/adjectiveVoice";
import { playComboPraise } from "./effects/comboPraise";
import { playNameTag } from "./effects/nameTag";
import { playChargeBolt, preloadChargeBolt } from "./effects/chargeBolt";
import { playBombSound, preloadBombSound } from "./effects/bombSound";
import { playDustCloud } from "./effects/dustCloud";
import { playDropCountdown } from "./effects/countdown";
import { drawDropGuide } from "./effects/dropGuide";
import { playGaugePulse } from "./effects/gaugePulse";
import { GAUGE_TUNING } from "./effects/gaugeTuning";
import { cancelLandSquish, playLandSquish } from "./effects/landSquish";
import { PHYSICS_TUNING } from "./effects/physicsTuning";
import { SCORE_TUNING } from "./effects/scoreTuning";
import {
  applyDormantStyle,
  clearDormantStyle,
  destroyDormantStyle,
  playShatterParticles,
  playShatterSound,
  playShatterTest,
  preloadDormantSounds,
  preloadIceTextures,
  reskinDormantIce,
  setSelectedIce,
} from "./effects/dormantStyle";
import { preloadBgm, startBgm } from "./effects/bgm";
import type { MergeHandle } from "./effects/mergePresets";
import { MERGE_PRESETS } from "./effects/mergePresets";
import { MERGE_PULL_MS, playMergePull } from "./effects/mergePull";
import { playMergeSound, preloadMergeSounds } from "./effects/mergeSound";
import { cancelMergePunch, playMergePunch } from "./effects/mergePunch";
import { createIceSnow } from "./effects/iceSnow";
import { ICE_WALL_CONFIG } from "./effects/iceWall";
import { PREFILL_TUNING } from "./effects/prefillTuning";
import { THAW_TUNING } from "./effects/thawTuning";
import { playWordCallout } from "./effects/wordCallout";
import { Combo } from "./systems/Combo";

/**
 * drop-next — drop 엔드리스 "층-쏟아짐 연쇄" 엔진.
 * 코어 루프(#123) + 엔드리스·오버플로·드롭 UX.
 *
 * - 엔드리스: 층을 내려갈수록 동적 생성, 지난 층은 cull(성능). 전역 Matter bounds가
 *   좌우·천장 담당 → 층마다 받침대(floor)만.
 * - 오버플로: 활성 층 상단 데드라인 초과 체류 → 경고 → 게임오버. 쏟아짐/도미노 전환
 *   중엔 타이머 정지(억울한 죽음 방지).
 * - 드롭 UX: 상단 매달림 + 포인터 조준 + 놓기 + 쿨다운 + 다음 과일 미리보기.
 *
 * 라이브 drop/ 무수정. 스텁: BE 단어·오디오·도감·ResultScreen·테마(후속 슬라이스).
 */

const VIEW_W = 720;
const VIEW_H = 1280;
/** 층 간 거리(=하강 시 낙하 구간). 크게 하면 떨어지는 구간이 길어지고 위층이 화면 밖으로 밀려나
 *  안 보인다(위층은 제거 X). 통 채움 깊이는 FILL_SPAN 으로 분리해 TIER_H 와 무관하게 유지. */
const TIER_H = 1600;
/** 통 채움 기준 깊이 — prefill 채움 높이·fullness 분모. TIER_H 와 분리(이걸 키워야 통이 더 채워짐).
 *  과거엔 TIER_H 와 같은 값(1100)이라 TIER_H 를 키우면 통이 과충전됐다. */
const FILL_SPAN = 1100;
const WORLD_BOTTOM = 100_000; // 사실상 무한 (전역 bounds 바닥)
const FLOOR_H = 59; // 통 바닥에서 바닥 윗면(과일 안착면)까지. 새 통 슬랩 윗면 = bottom-58.7 에 맞춤.

/** 충돌 원 반경 / 스프라이트 프레임 내접 반경. 1=프레임 내접, <1 로 투명 여백 흡수. */
const BODY_RADIUS_RATIO = 1.0;
// 반발계수는 PHYSICS_TUNING.restitution(dev 슬라이더)으로 분리 — 과일 탄성 손잡이.
/** 과일 마찰 — 낮을수록 잘 구르고 미끄러짐. */
const FRUIT_FRICTION = 0.4;
/** 과일 공기저항 — 낮을수록 속도 감쇠가 적어 여러 번 통통 튄다(기본 0.01). */
const FRUIT_FRICTION_AIR = 0.005;
/** 미리채움 행 구성 — 바닥→위 각 행의 과일 index(서로 다름). 층마다 +tier 만큼 올려 깐다(escalation). */
const PREFILL_ROW_FRUITS = [4, 3, 2, 1, 0]; // obj_05,04,03,02,01 (바닥이 큰 과일)
// 채움 높이·간격·layout 주기는 PREFILL_TUNING(dev 슬라이더) 으로 분리 — 받는 통 밸런스 손잡이.
/** 시작 prefill 안착용 물리 pre-step 수(60Hz). 최대 낙하 ~fillRatio*FILL_SPAN 를 덮을 만큼. */
const PREFILL_SETTLE_STEPS = 90;

// 진화 체인·역참조 맵은 config/chain.ts 가 단일 출처(로컬 기본 words 도 거기서 파생).
// 표시 라벨·발음·텍스처는 호스트 주입 config.objects(없으면 LOCAL_OBJECTS)에서 파생 —
// init() 에서 name 기준 맵으로 구성한다(labelByName·srcByName·audioByName).

/** 층별 목표 = TARGET_BASE + tier. */
const TARGET_BASE = 8; // tier 0 목표 = obj_09 (수박)
const DROP_MIN_INDEX = 0;
const DROP_MAX_INDEX = 4; // 떨굴 수 있는 과일 = obj_01~05

// 동종 연쇄 해동 손잡이(접촉 여유·ring 스태거)는 THAW_TUNING(dev 슬라이더)으로 분리 —
// 깨짐 번짐 속도·연쇄 전파 거리 손잡이. thawCluster 가 점화마다 현재 값을 읽어 즉시 반영.
// 한계선(통 벽 top)·드롭 위치는 BIN_TOP_FRAC·HANG_FRAC(화면 비율)로 앵커 — 위 카메라 앵커 참조.
/** 게임오버 — 과일이 "완전히"(아랫면 cy+radius 까지) 한계선 위로 넘은 채 이 시간 지나면. */
const DANGER_MS = 3000;
/** 한계선 경고 표시 — 통 채움(바닥~한계선)이 이 비율 이상일 때만 빨갛게 보임(평소 숨김). */
const WARN_FILL_RATIO = 0.7;
/** 경고 채움 측정 — 이 속도 미만(가라앉은) 과일만 센다(낙하 중 과일 제외 → 드롭마다 깜빡임 방지). */
const SETTLE_SPEED = 1.5;
const DROP_COOLDOWN_MS = 1000;
/** 하강(리셔플) 능력 뱅크 상한 — 게이지가 threshold 채울 때마다 +1, 여기까지만 적립. */
const MAX_DESCENT_CHARGES = 3;
/** 하강 발사 후 카메라가 따라가기까지의 지연(ms) — 충돌벽은 즉시 사라지고 과일이 먼저 떨어진 뒤
 *  카메라가 늦게 쫓아오게 한다. 짧으면 전환이 빨라 깨짐 체감이 약하다. */
const DESCENT_CAM_LAG_MS = 350;
const DESCENT_SHAKE_MS = 360;
const DESCENT_SHAKE_INTENSITY = 0.008; // 흔들림 세기(줄임).
const DESCENT_BURST_POINTS = 6; // 바닥선 따라 파편 분출 지점 수
const DESCENT_SHARD_SIZE = 82; // 파편 분사 세기(크게=멀리·큼)
const DESCENT_SHARD_DURATION = 900; // 파편 수명(ms) — 기본보다 길게(너무 빨리 사라지지 않게).

/**
 * 연쇄 머지 순차화 간격 — 한 연쇄의 단계 사이 간격(머지 결과가 다음 머지에 참여하는 쿨다운).
 * 1→2→3 단계가 읽히게 한다. 다른 위치의 독립 연쇄는 이 간격과 무관하게 병렬로 진행된다.
 * MERGE_PULL_MS(170) 이상이어야 직전 새 과일이 등장(punch)한 뒤 다음 머지가 실행돼 중간 단계가
 * 안 스킵된다. 키울수록 또렷하지만 긴 연쇄가 느려진다.
 */
const MERGE_STEP_MS = 200;
/** TEST: 하강을 능력 카운트 없이도 발사(검증용). page.tsx 의 TEST_ALWAYS_DESCENT 와 함께 끈다. */
const TEST_ALWAYS_DESCENT = true;
const GEN_AHEAD = 1; // 활성 층보다 몇 층 아래까지 미리 생성
/** 카메라가 activeTier 깊이를 추격하는 ease 계수·프레임당 최대 이동(다단 하강 멀미 방지 상한). */
const CAM_EASE = 0.12;
const CAM_MAX_STEP = 80;
/** 활성 통 바닥을 화면 세로 이 비율 위치에 앵커(레퍼런스 ~88%) — viewH 무관하게 통 위치 고정. */
const FLOOR_ANCHOR_FRAC = 0.88;
/** 통 벽 top(=한계선) 화면 세로 비율(레퍼런스 ~37%). 바닥~여기가 통 몸체 = (0.88−0.37)*viewH. */
const BIN_TOP_FRAC = 0.37;
/** 매달린 과일(드롭) 화면 세로 비율 — 통 벽 top(0.37) 약간 위. 값↑ = 더 아래(낮게). */
const HANG_FRAC = 0.31;
/** 와이어프레임 레이아웃 패스 — Phaser HUD(점수·게이지·발사버튼 등)를 만들되 숨긴다. HTML 와이어프레임으로 대체. */
const SHOW_PHASER_HUD = false;
/**
 * 상단 HUD 레이아웃(720×1280 월드, scrollFactor 0) — 레퍼런스(Tasty Travels) 매칭.
 * 좌상단 트로피(최고기록) · 중앙 점수 pill 위에 하강 게이지 + tier 배지.
 */
const HUD = {
  rowY: 120, // 트로피·점수 pill 중심 y
  scorePillW: 220,
  scorePillH: 80,
  scoreFontPx: 48,
  gaugeW: 176, // 점수 pill 보다 좁게 — pill 윗변에 얹는다
  gaugeH: 26,
  gaugeInset: 4,
  tierBadge: 48,
  trophyPillW: 168,
  trophyPillH: 56,
  trophyX: 26, // 트로피 아이콘 좌측 시작
} as const;

const HUD_COLOR = {
  ink: 0x2b2440, // 어두운 보더·트로피 pill (fooding ink 톤)
  cream: 0xfff3d6, // 점수 pill 면
  blue: 0x4cc2ff, // 게이지 fill (ADR-0014 게이지 색)
  blueGlow: 0x9ee4ff, // 상승 시 번쩍이는 밝은 파랑
  track: 0x7a4a22, // 게이지 빈 구간(브라운)
  green: 0x5fc24a, // +N 증가 강조
} as const;

const TROPHY_TEXTURE = "trophy"; // 좌상단 최고기록 아이콘(RhosGFX vector-icon-pack)
const ICE_FLOOR_TEXTURE = "ice-floor"; // 발사 버튼 아이콘용(갈라지는 얼음 바닥)
const ICE_BIN_TEXTURE = "ice-bin"; // 층별 통(9.png U-프레임: 벽+바닥 한 몸)
const ICE_BIN_BROKEN_TEXTURE = "ice-bin-broken"; // 발사 시 스왑 — 바닥 깨진 통(기둥 동일, 바닥 부서짐)
const ICE_CASTLE_TEXTURE = "ice-castle"; // 배경 = 얼음 성(상단 성 + 하단 플랫, 화면 고정)
const STRIPE_BG_TEXTURE = "stripe-bg"; // 배경 = 파스텔 세로 줄무늬 벽지(seamless 타일, 화면 고정)
/** 받는 통 비움 확률 구간 경계 — 현재 통 채움 비율(통 높이 대비)을 low/mid/high 로 가른다. */
const FULLNESS_LOW = 0.3;
const FULLNESS_HIGH = 0.6;
/** 정점 완성(체인 끝 둘) → 통 전체 도미노 폭발의 과일당 간격(ms). 폭심에서 거리순 파동. */
/** 파인애플 터치 폭탄 — 폭심 반경(px)과 도미노 제거 간격. */
const BOMB_RADIUS = 230;
const BOMB_STEP_MS = 30;
/** 착지 꿀렁임 — 떨어진(맞힌) 과일이 이 속도 이상이어야 진짜 착지 충격(드롭 초기 y:3 고려). */
const LAND_IMPACT_SPEED = 3;
/** 맞은 과일이 이 속도 미만이어야 "멈춰 있던 것"으로 본다 — settle 진동·cascade 난장(둘 다 빠름) 제외. */
const LAND_REST_SPEED = 1.5;

const OPEN_FLOOR_EVENT = "drop-next:open-floor";
const RESET_EVENT = "drop-next:reset";
const TEST_COMBO_EVENT = "drop-next:test-combo";
const MERGE_PRESET_EVENT = "drop-next:merge-preset"; // CustomEvent<number>
const TEST_MERGE_EVENT = "drop-next:test-merge";
const MERGE_RETUNE_EVENT = "drop-next:merge-retune"; // 슬라이더 변경 → emitter 재생성
const TEST_SHATTER_EVENT = "drop-next:test-shatter";
const ICE_SELECT_EVENT = "drop-next:ice-select"; // CustomEvent<number>
const TEST_SQUISH_EVENT = "drop-next:test-squish"; // dev — 착지 꿀렁임 효과만 격리 테스트
const DEBUG_EVENT = "drop-next:debug"; // dev — 하단 디버그 readout 표시 토글(튜닝 패널 연동). CustomEvent<boolean>
// FIRE_DESCENT_EVENT 는 phaser-free events.ts 로 이관(SSR 안전) — 여기선 import 해 내부 사용 + re-export.
export { FIRE_DESCENT_EVENT };
/** 씬 → React HUD 브리지. 머지 게이지·발사 카운트가 바뀔 때만 발행. */
export const GAUGE_EVENT = "drop-next:gauge"; // CustomEvent<{ ratio; charges; maxCharges }>
/** 씬 → React HUD 브리지. 점수·레벨(=activeTier)이 바뀔 때만 발행. */
export const SCORE_EVENT = "drop-next:score"; // CustomEvent<{ score; level }>
export type ScoreEventDetail = {
  score: number;
  level: number; // = activeTier (내려간 깊이)
};
export type GaugeEventDetail = {
  ratio: number; // 0..1 = descentGauge / threshold (다음 충전까지 진행)
  charges: number; // 뱅크된 발사 카운트
  maxCharges: number; // 발사 카운트 상한
};

type FruitImage = Phaser.Physics.Matter.Image;
type Body = MatterJS.BodyType;

const targetOfTier = (t: number) => Math.min(TARGET_BASE + t, CHAIN.length - 1);

type TierRecord = {
  floor: Body | null;
  floorOpened: boolean;
  bin: Phaser.GameObjects.Image | null; // 층 통(벽+바닥 한 몸). 발사 시 깨짐 처리 대상.
  visuals: Phaser.GameObjects.GameObject[];
};

export class GameScene extends Phaser.Scene {
  /** 호스트 주입 부팅 설정(registry "dropConfig"). 미주입 시 빈 객체 → 전부 fallback. */
  private config: DropGameConfig = {};
  /** 해석된 머지 객체 풀 — config.objects ?? LOCAL_OBJECTS. */
  private objects: MergeObject[] = LOCAL_OBJECTS;
  /** name → 표시 라벨(매달림·콜아웃). 미주입 객체는 CHAIN.en 으로 폴백. */
  private labelByName = new Map<string, string>();
  /** name → 객체 이미지 URL(있을 때만). 없으면 절차적 얼음 텍스처로 폴백. */
  private srcByName = new Map<string, string>();
  /** name → 발음 MP3 URL(있을 때만). 없으면 무음. */
  private audioByName = new Map<string, string>();
  /** 객체 등장(매달림) 누적 횟수 — 게임오버 결과(mergedObjects) 집계. */
  private mergedCounts = new Map<string, number>();
  /** 플레이 시작 ISO 8601 — 결과(GameResult)용. create()에서 stamp. */
  private startedAtIso = "";

  private activeTier = 0;
  private tiers = new Map<number, TierRecord>();
  private merging = new WeakSet<Body>();
  /**
   * 활성 과일 body 집합 — 매 프레임 핫패스(updateDanger·guideRestY)가 localWorld.bodies
   * 전체(floor·벽·매달림 포함)를 full-scan 하지 않도록 과일만 모아 둔다. spawnFruit add,
   * 과일 destroy delete, 순회(eachFruit) 시 active 체크로 누락분 prune 해 정합을 자가 복구.
   */
  private fruitBodies = new Set<Body>();
  /** 머지 실행 큐 — 충돌로 발견된 쌍을 쌓아 readyAt(재료 과일 쿨다운) 이 지나면 실행한다. */
  private mergeQueue: { a: Body; b: Body; readyAt: number }[] = [];
  /** 머지로 생긴 과일이 다음 머지에 참여 가능한 시각 — 연쇄 안에서만 STEP 간격을 강제(연쇄끼리는 병렬). */
  private mergeCooldownUntil = new WeakMap<Body, number>();
  /** 휴면 과일(prefill 기본). 휴면끼리는 안 합쳐지고, 같은-과일 활성 접촉으로 점화된다. */
  private dormant = new Set<Body>();
  /** 진행 중 연쇄 해동(thawCluster)이 점유한 휴면 — ring 스태거 동안 중복 점화·재전파 차단. */
  private thawScheduled = new WeakSet<Body>();

  private hanging: FruitImage | null = null;
  private hangingBody: Body | null = null;
  /** 방금 떨군 과일 — 착지 꿀렁임은 이 과일의 착지에서만(캐스케이드·ripple 충돌 제외). */
  private lastDropped: Body | null = null;
  private nextIndex = 0;
  /** 현재 매달린 과일 idx — 가이드라인 색·반경 계산용. */
  private hangingIndex = 0;
  private canDrop = false;
  private pointerX = VIEW_W / 2;

  private transitionLock = false;
  /** 하강 후 카메라 추격을 미루는 기한(scene.time.now 기준). 이 시각까지 followCamera 가 카메라를 잡아둠. */
  private cameraHoldUntil = 0;
  private isGameOver = false;
  /** 시작 카운트다운(GO!)이 끝나 플레이가 시작됐는지 — 그 전엔 첫 매달림·위험판정을 보류. */
  private started = false;
  private overLineSince: number | null = null;
  private combo = new Combo();
  /** 레벨 가중 하강 게이지 — 머지 결과 레벨만큼 누적, threshold 초과 시 하강(하강 시 0 리셋). */
  private descentGauge = 0;
  /** 머지 점수(판당) — 머지 결과 단계 초선형 × 콤보 배수. 공중 머지 포함. BE score 산출 토대. */
  private score = 0;
  private mergePresetIndex = 0; // dev — 머지 파티클 시안 선택

  private mergeHandle!: MergeHandle;
  private dangerLine!: Phaser.GameObjects.Rectangle;
  /** 드롭 가이드라인 — 매달림 활성 시 매 프레임 redraw, 그 외엔 clear. world 좌표. */
  private guideGfx!: Phaser.GameObjects.Graphics;
  private fpsText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private gainText!: Phaser.GameObjects.Text;
  private tierText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private gaugeFill!: Phaser.GameObjects.Rectangle;
  private gaugeShine!: Phaser.GameObjects.Rectangle;
  private gaugeGlow!: Phaser.GameObjects.Rectangle;
  /** 하단 우측 하강(리셔플) 능력 버튼 — 카운트 소모 발사. count>0 일 때만 interactive. */
  private fireBg!: Phaser.GameObjects.Graphics;
  private fireIcon!: Phaser.GameObjects.Image;
  private fireBadgeBg!: Phaser.GameObjects.Graphics;
  private fireBadge!: Phaser.GameObjects.Text;
  private fireButton!: Phaser.GameObjects.Rectangle; // 투명 인터랙티브 히트존
  /** 보유 하강(리셔플) 발사 카운트 — 머지 게이지가 threshold 채울 때마다 +1(상한 MAX_DESCENT_CHARGES). */
  private descentCharges = 0;
  /** 발사 버튼 위 포인터다운 = 발사 탭 — 이 포인터의 조준/드롭을 끝까지 억제하는 플래그. */
  private descentTap = false;
  private iceSnow!: Phaser.GameObjects.Particles.ParticleEmitter;

  /** 게이지 fill 은 실제 게이지로 부드럽게 보간(lerp). 상승 감지는 prev 비교. */
  private gaugeDisplayRatio = 0;
  private prevGaugeForHud = 0;
  /** 직전 프레임 콤보 카운트 — >0 에서 0 으로 끊기는 프레임을 연쇄 종료(=충전 확정)로 잡는다. */
  private prevComboCount = 0;
  /** 현재 연쇄에서 만든 최고 과일 인덱스 — 칭찬에서 6단계+(≥5) 과일 언급에 쓴다. 연쇄 종료 시 -1 리셋. */
  private maxMergeIdxThisCombo = -1;
  /** 현재 연쇄에서 머지로 만든 6단계+ 과일 중 최고 단계의 오브젝트·인덱스 — 연쇄 종료 시 그 옆에 이름표 1회. */
  private tagFruit: FruitImage | null = null;
  private tagFruitIdx = -1;
  /** 칭찬 음성(형용사+과일 발음)이 흐르는 동안 true — drop 음성이 끼어들어 칭찬을 덮지 않게 억제. */
  private praiseSpeaking = false;
  /** React HUD 로 publish 한 마지막 값 — 변할 때만 이벤트 발행(매 프레임 발행 방지). */
  private prevPublishedGauge = -1;
  private prevPublishedCharges = -1;
  private prevPublishedScore = -1;
  private prevPublishedLevel = -1;
  private prevScoreForHud = 0;
  /** 최고기록 — 현재는 세션 내 최고 점수(placeholder). cutover 시 서버 bestScores fetch 로 대체. */
  private bestScore = 0;
  private gainTween: Phaser.Tweens.Tween | null = null;
  /** 런타임 뷰포트 높이(폭 720 고정, 세로 가변). create()에서 실제 캔버스 높이로 설정 — 폰 비율에 맞춰 레터박스 없이 채움. */
  private viewH = VIEW_H;

  private onOpenFloor = () => this.openFloor(this.activeTier);
  private onReset = () => this.scene.restart();
  // dev — 머지 없이 화면 중앙에 콤보 팝을 띄워 pulse 튜닝을 즉시 확인.
  private onTestCombo = () => {
    const cam = this.cameras.main;
    playComboPop(
      this,
      cam.scrollX + VIEW_W / 2,
      cam.scrollY + this.viewH / 2,
      Phaser.Math.Between(2, 9),
    );
  };
  // React 아이템 버튼 → 능력 발사(카운트 1 소모). fireDescent 가 카운트·락 가드를 자체 보유.
  private onFireDescent = () => {
    this.fireDescent();
  };
  // dev — 머지 파티클 시안 전환(emitter 재생성).
  private onMergePreset = (e: Event) => {
    this.setMergePreset((e as CustomEvent<number>).detail);
  };
  // dev — 튜닝 슬라이더 변경 → 현재 시안을 새 MERGE_TUNING 값으로 재생성.
  private onMergeRetune = () => {
    this.setMergePreset(this.mergePresetIndex);
  };
  // dev — 하단 디버그 readout(fps·tier·bodies…)을 튜닝 패널 열림에 맞춰 표시. 닫으면 깨끗한 HUD.
  private onDebug = (e: Event) => {
    const on = (e as CustomEvent<boolean>).detail;
    this.fpsText?.setVisible(on);
    this.infoText?.setVisible(on);
  };
  // dev — 화면 중앙에 얼음 깨짐 1회(파티클 + 소리) 테스트.
  private onTestShatter = () => {
    const cam = this.cameras.main;
    playShatterTest(
      this,
      cam.scrollX + VIEW_W / 2,
      cam.scrollY + this.viewH / 2,
      120,
    );
  };
  // dev — 착지 꿀렁임 효과만 격리 테스트(화면 중앙에 과일 띄워 squash). 트리거와 분리해 효과 검증.
  private onTestSquish = () => {
    const cam = this.cameras.main;
    const img = this.spawnFruit(
      cam.scrollX + VIEW_W / 2,
      cam.scrollY + this.viewH / 2,
      6,
    );
    img.setStatic(true);
    playLandSquish(this, img, CHAIN[6].name, img.displayWidth);
    this.time.delayedCall(600, () => img.destroy());
  };
  // dev — 휴면 얼음 버블 선택. 새로 깔리는 것 + 이미 깔린 것 모두 교체.
  private onIceSelect = (e: Event) => {
    setSelectedIce((e as CustomEvent<number>).detail);
    for (const body of this.dormant) {
      reskinDormantIce(body.gameObject as FruitImage);
    }
  };
  // dev — 화면 중앙에 현재 시안 burst(랜덤 과일 즙 색).
  private onTestMerge = () => {
    const cam = this.cameras.main;
    const fruit = CHAIN[Phaser.Math.Between(0, CHAIN.length - 1)];
    this.mergeHandle.emit(
      cam.scrollX + VIEW_W / 2,
      cam.scrollY + this.viewH / 2,
      5,
      fruit.juice,
    );
  };

  constructor() {
    super("GameScene");
  }

  /** dev — 머지 파티클 시안 전환. 기존 핸들을 버리고 새 시안으로 재생성. */
  private setMergePreset(index: number) {
    if (index < 0 || index >= MERGE_PRESETS.length) {
      return;
    }
    this.mergeHandle.destroy();
    this.mergePresetIndex = index;
    this.mergeHandle = MERGE_PRESETS[index].create(this);
  }

  /**
   * 부팅 설정 해석 — preload 전에 registry 에서 config 를 읽어 name 기준 라벨·텍스처·발음 맵을 만든다.
   * restart 시 재실행되며, registry·config 객체는 게임 수명 동안 유지되므로 같은 풀로 다시 구성된다.
   */
  init() {
    this.config = (this.registry.get("dropConfig") as DropGameConfig) ?? {};
    this.objects = this.config.objects ?? LOCAL_OBJECTS;
    this.labelByName.clear();
    this.srcByName.clear();
    this.audioByName.clear();
    for (const obj of this.objects) {
      this.labelByName.set(obj.name, obj.label);
      if (obj.imageUrl) {
        this.srcByName.set(obj.name, obj.imageUrl);
      }
      if (obj.audioUrl) {
        this.audioByName.set(obj.name, obj.audioUrl);
      }
    }
  }

  /** name 의 표시 라벨 — config 주입 라벨 우선, 없으면 CHAIN 내장 en. */
  private labelOf(name: string, fallback: string) {
    return this.labelByName.get(name) ?? fallback;
  }

  /**
   * 이미지 URL 이 없는 객체(예: obj_01 얼음)의 fallback 텍스처 — juice 색 얼음 공을 절차적으로 1회 생성.
   * 텍스처는 게임 수명 동안 유지되므로 restart 시 exists 체크로 건너뛴다. 폭 720 고정·DPR 무관.
   */
  private ensureFallbackTextures() {
    for (const f of CHAIN) {
      if (this.srcByName.has(f.name) || this.textures.exists(f.name)) {
        continue;
      }
      const r = 64;
      const d = r * 2;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(f.juice, 1);
      g.fillCircle(r, r, r - 2);
      // 좌상단 흰 하이라이트 + 흰 림 — 얼음 공 느낌(투명 여백 없이 충돌원에 꽉 참).
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(r * 0.68, r * 0.62, r * 0.32);
      g.lineStyle(3, 0xffffff, 0.5);
      g.strokeCircle(r, r, r - 2);
      g.generateTexture(f.name, d, d);
      g.destroy();
    }
  }

  /** 점수·도달 깊이 publish — config.onScore 우선, 없으면 window 이벤트(dev 무대 호환). */
  private publishScore(score: number, level: number) {
    if (this.config.onScore) {
      this.config.onScore(score, level);
      return;
    }
    const detail: ScoreEventDetail = { score, level };
    window.dispatchEvent(new CustomEvent(SCORE_EVENT, { detail }));
  }

  /** 능력 게이지 publish — config.onGauge 우선, 없으면 window 이벤트(dev 무대 호환). */
  private publishGauge(ratio: number, charges: number, maxCharges: number) {
    if (this.config.onGauge) {
      this.config.onGauge(ratio, charges, maxCharges);
      return;
    }
    const detail: GaugeEventDetail = { ratio, charges, maxCharges };
    window.dispatchEvent(new CustomEvent(GAUGE_EVENT, { detail }));
  }

  /** 최종 단계(파인애플) 첫 완성 1회 통지 — 진화바 실루엣 공개용. 이후 호출은 무시. */
  private apexUnlocked = false;
  private publishApexUnlock() {
    if (this.apexUnlocked) {
      return;
    }
    this.apexUnlocked = true;
    this.config.onApexUnlock?.();
  }

  /** 게임오버 결과 — 집계된 등장 객체 + 점수·깊이·시간 구간. 호스트가 세션 로그·결과 화면으로 변환. */
  private buildResult(): GameResult {
    const mergedObjects: MergedObject[] = [...this.mergedCounts].map(
      ([name, count]) => ({
        name,
        label: this.labelOf(name, name),
        count,
      }),
    );
    return {
      score: this.score,
      level: this.activeTier,
      mergedObjects,
      startedAt: this.startedAtIso,
      endedAt: new Date().toISOString(),
    };
  }

  preload() {
    CHAIN.forEach((f) => {
      const src = this.srcByName.get(f.name);
      if (src) {
        this.load.image(f.name, src);
      }
    });
    this.load.image(TROPHY_TEXTURE, TrophyImg.src);
    this.load.image(ICE_FLOOR_TEXTURE, IceFloorImg.src); // 발사 버튼 아이콘용
    this.load.image(ICE_BIN_TEXTURE, IceBinImg.src); // 층별 통(벽+바닥 한 몸)
    this.load.image(ICE_BIN_BROKEN_TEXTURE, IceBinBrokenImg.src); // 발사 시 스왑(바닥 깨진 통)
    this.load.image(ICE_CASTLE_TEXTURE, IceCastleImg.src);
    this.load.image(STRIPE_BG_TEXTURE, StripeBgImg.src); // 배경 줄무늬 벽지
    preloadBgm(this);
    preloadMergeSounds(this);
    preloadAdjectiveVoices(this);
    preloadChargeBolt(this);
    preloadBombSound(this);
    preloadDormantSounds(this);
    preloadIceTextures(this);
  }

  create() {
    this.activeTier = 0;
    this.tiers = new Map();
    this.merging = new WeakSet();
    this.fruitBodies = new Set();
    this.mergeQueue = [];
    this.mergeCooldownUntil = new WeakMap();
    this.dormant = new Set();
    this.thawScheduled = new WeakSet();
    this.hanging = null;
    this.hangingBody = null;
    this.lastDropped = null;
    this.canDrop = false;
    this.pointerX = VIEW_W / 2;
    this.descentTap = false;
    this.descentCharges = 0;
    this.transitionLock = false;
    this.cameraHoldUntil = 0;
    this.isGameOver = false;
    this.started = false;
    this.overLineSince = null;
    this.combo.reset();
    this.prevComboCount = 0;
    this.maxMergeIdxThisCombo = -1;
    this.tagFruit = null;
    this.tagFruitIdx = -1;
    this.praiseSpeaking = false;
    this.apexUnlocked = false;
    this.descentGauge = 0;
    this.score = 0;
    this.gaugeDisplayRatio = 0;
    this.prevGaugeForHud = 0;
    this.prevPublishedGauge = -1;
    this.prevPublishedCharges = -1;
    this.prevPublishedScore = -1;
    this.prevPublishedLevel = -1;
    this.prevScoreForHud = 0;
    this.bestScore = 0;
    this.gainTween = null;
    this.mergedCounts.clear();
    this.startedAtIso = new Date().toISOString();

    // 이미지 URL 없는 객체(obj_01 얼음)의 절차적 텍스처 — 첫 spawnFruit(prefill) 전에 보장.
    this.ensureFallbackTextures();

    // 좌우 경계를 벽 두께만큼 안으로 들여 과일이 벽 안쪽 면에 부딪히게(벽 속 파묻힘 제거).
    const wallW = ICE_WALL_CONFIG.width;
    this.matter.world.setBounds(wallW, 0, VIEW_W - wallW * 2, WORLD_BOTTOM, 64);
    this.matter.world.setGravity(0, 1);
    // sleeping 끔 — 모든 바디가 매 프레임 중력 적용(항상 awake). 조기 취침으로 인한 공중
    // floater 원천 차단. 지난 층은 cull 로 바디 수가 bounded 라 성능 유지(저사양 실측은 추후).
    (
      this.matter.world.engine as unknown as { enableSleeping: boolean }
    ).enableSleeping = false;
    // DPR — 백킹이 디자인×dpr 라 카메라를 origin 좌상단 + zoom dpr 로 맞춰야 월드(720×1280)가
    // 백킹에 꽉 차게 매핑된다(흐림 제거). setZoom 만 하고 origin 안 하면 화면 밖으로 잘림.
    const dpr = (this.registry.get("dpr") as number) ?? 1;
    // 백킹 높이(scale.height) = 디자인높이×dpr. 폭은 720 고정, 세로는 폰 비율대로 가변 →
    // 카메라 zoom(dpr) 적용 후 월드 가시 높이 = scale.height/dpr = 실제 디자인 높이.
    this.viewH = this.scale.height / dpr;
    this.cameras.main.setOrigin(0, 0);
    this.cameras.main.setZoom(dpr);
    this.cameras.main.setBackgroundColor("#d6e2f3"); // 줄무늬 벽지 베이스색 — 타일 밖(letterbox)도 톤 일치
    this.cameras.main.scrollY = TIER_H - FLOOR_ANCHOR_FRAC * this.viewH; // 통 바닥을 화면 ~88%에

    // 벽·바닥은 층별 통 이미지(ensureTier)가 담당. 배경은 파스텔 줄무늬 벽지(아래 drawBackground).
    this.drawBackground();
    // 떠다니는 눈 — 하강 시 위로 스쳐 하강감(update 에서 카메라 따라감).
    this.iceSnow = createIceSnow(this, VIEW_W, this.viewH);

    // 시작 층 + 한 층 미리.
    this.ensureTier(0);
    for (let t = 1; t <= GEN_AHEAD; t++) {
      this.ensureTier(t);
    }
    // prefill 은 쏟아짐 연쇄용 동적 바디라 static 이 아님 → 시작 순간 중력으로 떨어진다.
    // 첫 렌더 전에 물리를 미리 돌려 더미를 안착시킨다(시작 화면이 "공중에서 낙하" 대신 settled).
    // collisionstart 등록 전이라 이 settle 중 머지 핸들러는 안 돌고, 휴면끼리는 어차피 안 합쳐진다.
    this.settlePrefill();

    this.matter.world.on("collisionstart", this.onCollision, this);

    // 발사 버튼 탭 = 발사(리셔플), 그 외 = 조준/드롭. `over`(포인터 아래 인터랙티브 목록)로
    // 갈라 입력 충돌 0. descentTap 플래그로 발사 포인터의 드롭을 끝까지 억제.
    this.input.on(
      "pointerdown",
      (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.includes(this.fireButton)) {
          this.descentTap = true;
          this.fireDescent();
          return;
        }
        const pineapple = over.find((o) => this.isPineapple(o));
        if (pineapple) {
          this.descentTap = true; // 폭탄 탭이 드롭(pointerup)으로 이어지지 않게 억제.
          this.explodePineapple(pineapple as FruitImage);
          return;
        }
        this.descentTap = false;
        this.pointerX = this.clampX(p.worldX);
      },
    );
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.descentTap) {
        return;
      }
      this.pointerX = this.clampX(p.worldX);
    });
    this.input.on("pointerup", () => {
      if (this.descentTap) {
        this.descentTap = false;
        return;
      }
      this.releaseHanging();
    });

    // 데드라인(활성 층 상단 인근) — world 좌표라 카메라와 함께 스크롤.
    this.dangerLine = this.add
      .rectangle(VIEW_W / 2, 0, VIEW_W, 5, 0xff4c4c) // 화면 끝에서 끝까지(full width)
      .setDepth(8)
      .setAlpha(0); // 평소 숨김 — 통 채움 70%↑ 일 때만 경고로 표시(updateDanger).
    // 드롭 가이드라인 — 문짝(-1) 위·과일(0) 아래라 쌓인 과일에 자연스레 가림.
    this.guideGfx = this.add.graphics().setDepth(-0.5);

    this.mergeHandle = MERGE_PRESETS[this.mergePresetIndex].create(this);

    // 와이어프레임 패스: HUD 객체는 만들되(updateHud 등 참조 안전) 화면엔 숨긴다.
    const hudStart = this.children.list.length;
    this.buildHud();
    if (!SHOW_PHASER_HUD) {
      for (let i = hudStart; i < this.children.list.length; i++) {
        (
          this.children.list[i] as Phaser.GameObjects.GameObject & {
            setVisible?: (v: boolean) => void;
          }
        ).setVisible?.(false);
      }
    }

    this.nextIndex = this.randDropIndex();
    // 시작 카운트다운(3·2·1·GO!) — 끝나면 첫 과일 매달림 + 플레이 시작. 그 전엔 입력(canDrop=false)·
    // 위험판정(started=false)이 멈춰 있어 억울한 게임오버가 없다. 보드(prefill)는 미리 안착돼 보인다.
    playDropCountdown(this, VIEW_W, this.viewH, () => {
      this.started = true;
      this.spawnHanging();
    });

    const stopBgm = startBgm(this);

    window.addEventListener(OPEN_FLOOR_EVENT, this.onOpenFloor);
    window.addEventListener(FIRE_DESCENT_EVENT, this.onFireDescent);
    window.addEventListener(RESET_EVENT, this.onReset);
    window.addEventListener(TEST_COMBO_EVENT, this.onTestCombo);
    window.addEventListener(MERGE_PRESET_EVENT, this.onMergePreset);
    window.addEventListener(TEST_MERGE_EVENT, this.onTestMerge);
    window.addEventListener(MERGE_RETUNE_EVENT, this.onMergeRetune);
    window.addEventListener(TEST_SHATTER_EVENT, this.onTestShatter);
    window.addEventListener(ICE_SELECT_EVENT, this.onIceSelect);
    window.addEventListener(TEST_SQUISH_EVENT, this.onTestSquish);
    window.addEventListener(DEBUG_EVENT, this.onDebug);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopBgm();
      window.removeEventListener(OPEN_FLOOR_EVENT, this.onOpenFloor);
      window.removeEventListener(FIRE_DESCENT_EVENT, this.onFireDescent);
      window.removeEventListener(RESET_EVENT, this.onReset);
      window.removeEventListener(TEST_COMBO_EVENT, this.onTestCombo);
      window.removeEventListener(MERGE_PRESET_EVENT, this.onMergePreset);
      window.removeEventListener(TEST_MERGE_EVENT, this.onTestMerge);
      window.removeEventListener(MERGE_RETUNE_EVENT, this.onMergeRetune);
      window.removeEventListener(TEST_SHATTER_EVENT, this.onTestShatter);
      window.removeEventListener(ICE_SELECT_EVENT, this.onIceSelect);
      window.removeEventListener(TEST_SQUISH_EVENT, this.onTestSquish);
      window.removeEventListener(DEBUG_EVENT, this.onDebug);
      // restart 흐름의 SHUTDOWN 시점엔 matter.world 가 이미 null 일 수 있다(tower-battle 동일).
      if (this.matter.world) {
        this.matter.world.off("collisionstart", this.onCollision, this);
      }
    });
  }

  update() {
    this.followCamera();
    this.iceSnow.setY(this.cameras.main.scrollY); // 눈 emitter 를 화면 상단에 고정

    if (this.hanging && this.canDrop && !this.transitionLock) {
      this.hanging.setPosition(this.pointerX, this.hangY());
      this.drawGuide();
    } else {
      this.guideGfx.clear();
    }
    this.processMergeQueue(); // 큐에 쌓인 머지를 간격 두고 하나씩 실행(순차화)
    this.combo.update(this.time.now);
    // 연쇄(콤보)가 끊긴 프레임 = 누적 게이지를 확정한다. 머지마다 흰 헤드가 앞서 늘다가, 연쇄가
    // 끝나면 여기서 충전 판정 → 시안이 따라 채워지고 카운트가 오른다. 단발 머지도 window 후 0 으로
    // 끊겨 동일 경로.
    const comboNow = this.combo.current;
    if (this.prevComboCount > 0 && comboNow === 0) {
      const chargesBefore = this.descentCharges;
      this.commitGauge();
      // 위치 = 통 상단(한계선) 높이의 가로 중앙 — dangerLine 과 같은 world 좌표(칭찬과 공유).
      const lineY = (this.activeTier + 1) * TIER_H - this.binBodyH();
      // 능력 카운트 +1 → 화면 중앙에서 번개가 솟아 게이지로 빨려드는 연출 + 햅틱. 빨려든 시점에
      // onChargeArrive 로 게이지 아이콘을 펄스시킨다(번개가 에너지를 꽂는 느낌).
      if (this.descentCharges > chargesBefore) {
        playChargeBolt(this, VIEW_W, VIEW_H, () =>
          this.config.onChargeArrive?.(),
        );
        this.config.playHaptic?.("light"); // 충전 보상 햅틱.
      }
      // 연쇄 종료 통합 판정 — 최고 콤보 3+ 또는 최고 과일 6단계+(≥5)면 통 상단에 칭찬 1회.
      if (this.prevComboCount >= 3 || this.maxMergeIdxThisCombo >= 5) {
        const bestFruit = this.maxMergeIdxThisCombo;
        const adjective = playComboPraise(
          this,
          VIEW_W / 2,
          lineY,
          this.prevComboCount,
          bestFruit,
        );
        // 칭찬 음성 — 형용사 클립 재생 후, 6단계+ 과일이면 짧은 텀을 두고 그 발음(BE audioUrl)을
        // 잇는다. 텀으로 두 목소리(형용사 클립·BE 발음)가 한 단어처럼 붙지 않게 분리한다.
        // praiseSpeaking 동안엔 drop 음성을 억제해 칭찬을 덮지 않게 하고, 과일 발음은 priority 로
        // 재생해 혹시 흐르던 발음이 있어도 끊고 무조건 들린다.
        this.praiseSpeaking = true;
        playAdjectiveVoice(this, adjective, () => {
          if (bestFruit < 5) {
            this.praiseSpeaking = false;
            return;
          }
          const name = CHAIN[bestFruit].name;
          const url = this.audioByName.get(name);
          if (!url) {
            this.praiseSpeaking = false;
            return;
          }
          this.time.delayedCall(220, () => {
            this.config.playAudio?.(
              url,
              this.labelOf(name, CHAIN[bestFruit].en),
              { priority: true },
            );
            this.praiseSpeaking = false;
          });
        });
      }
      // 6단계+ 과일이 이번 연쇄에서 머지됐으면 그 과일(최고 단계 하나) 옆에 이름표 1회 — 폭탄 등으로
      // 이미 사라졌으면 건너뛴다(따라갈 대상 없음).
      if (this.tagFruit?.active && this.tagFruitIdx >= 5) {
        const name = CHAIN[this.tagFruitIdx].name;
        playNameTag(
          this,
          this.tagFruit,
          this.labelOf(name, CHAIN[this.tagFruitIdx].en),
          VIEW_W,
        );
      }
      this.tagFruit = null;
      this.tagFruitIdx = -1;
      this.maxMergeIdxThisCombo = -1; // 연쇄 종료 — 다음 연쇄를 위해 리셋.
    }
    this.prevComboCount = comboNow;
    this.updateDanger();
    this.updateHud();
  }

  /**
   * activeTier 깊이로 카메라를 부드럽게 추격. 다단 하강이면 목표가 한 번에 깊어져 더 빨리
   * 따라간다(연쇄 하강 대응). 이동 중엔 transitionLock=true → 드롭·오버플로 타이머 정지.
   */
  private followCamera() {
    const cam = this.cameras.main;
    // 카메라 지연 — 바닥은 이미 사라졌지만 카메라는 잠시 멈춰, 과일이 먼저 떨어지는 걸 보여준다.
    // transitionLock 은 openFloor 에서 켜져 hold 동안 유지(입력·오버플로 정지).
    if (this.time.now < this.cameraHoldUntil) {
      return;
    }
    const targetY =
      (this.activeTier + 1) * TIER_H - FLOOR_ANCHOR_FRAC * this.viewH;
    const dist = targetY - cam.scrollY;
    if (Math.abs(dist) > 2) {
      cam.scrollY += Phaser.Math.Clamp(
        dist * CAM_EASE,
        -CAM_MAX_STEP,
        CAM_MAX_STEP,
      );
      this.transitionLock = true;
    } else if (this.transitionLock) {
      cam.scrollY = targetY;
      this.transitionLock = false;
      // 방금 내려온 위층(깨진 통=기둥)은 남겨둔다 — 일부러 안 지움.
      // 메모리 누적은 openFloor 의 cullTier(activeTier-2)(2칸 이상 위)가 막는다.
    }
  }

  // ── 층 생성/제거 ─────────────────────────────────────────────

  /**
   * 시작 prefill 더미를 화면 표시 전에 미리 안착시킨다 — matter 엔진을 60Hz 고정 스텝으로
   * 여러 번 수동 구동. 이미지 좌표는 body.position 을 직접 읽으므로 스텝만 하면 자동 반영되고,
   * 얼음 오버레이는 첫 PRE_UPDATE 의 follow 가 정렬한다. 시작 시 1회뿐(이후 새 층은 플레이 중
   * update 루프가 카메라 도달 전 자연 안착시킴)이라 비용은 무시 가능.
   */
  private settlePrefill() {
    const fixedDelta = 1000 / 60;
    for (let i = 0; i < PREFILL_SETTLE_STEPS; i++) {
      this.matter.world.step(fixedDelta);
    }
  }

  private ensureTier(t: number) {
    if (this.tiers.has(t)) {
      return;
    }
    const bottom = (t + 1) * TIER_H;
    // 바닥은 좌우 벽 안쪽 면 사이에만 둔다(벽 뒤로 안 삐져나오게).
    const wallW = ICE_WALL_CONFIG.width;
    const innerW = VIEW_W - wallW * 2;
    const floor = this.matter.add.rectangle(
      VIEW_W / 2,
      bottom - FLOOR_H / 2,
      innerW,
      FLOOR_H,
      { isStatic: true, label: `floor-${t}` },
    );
    // 층 통 — U-프레임(벽+바닥 한 몸) 1장. 폭=VIEW_W(기둥이 좌우 끝에 밀착), 높이=바닥~한계선
    // 통 몸체 높이 = binBodyH()(화면 비율 기반) → 기둥 top 이 한계선에 옴. 바닥을 층 바닥에 맞추고
    // 위는 빈 틈 → 분리된 통으로 읽힌다(벽처럼 안 이어짐).
    const bin = this.add
      .image(0, bottom, ICE_BIN_TEXTURE)
      .setOrigin(0, 1) // 통 바닥-왼쪽 기준 → 바닥을 층 바닥에 맞춤
      .setDisplaySize(VIEW_W, this.binBodyH())
      .setDepth(-1); // 과일(0) 뒤
    this.tiers.set(t, {
      floor,
      floorOpened: false,
      bin,
      visuals: [bin],
    });
    this.prefillTier(t);
  }

  private cullTier(t: number) {
    if (t < 0) {
      return;
    }
    const rec = this.tiers.get(t);
    if (!rec) {
      return;
    }
    if (rec.floor) {
      this.matter.world.remove(rec.floor);
    }
    rec.visuals.forEach((v) => v.destroy());
    this.tiers.delete(t);
  }

  /** 통 t 의 채움 비율 0~1 — 가장 높이 쌓인 과일까지의 높이 / 통 높이(빈 통=0, 천장까지=1). */
  private tierFullness(t: number): number {
    const top = t * TIER_H;
    const bottom = (t + 1) * TIER_H;
    let minY = bottom; // 가장 높이 쌓인(=작은 y) 과일
    for (const body of this.eachFruit()) {
      if (body === this.hangingBody) {
        continue;
      }
      const cy = body.position.y;
      if (cy < top || cy > bottom) {
        continue;
      }
      if (cy < minY) {
        minY = cy;
      }
    }
    return Phaser.Math.Clamp((bottom - minY) / FILL_SPAN, 0, 1);
  }

  /**
   * 파인애플을 폭탄으로 무장 — 터치 가능(setInteractive) + 진화바 공개. 머지·dev 생성 양쪽 공통.
   */
  private armPineapple(fruit: FruitImage) {
    fruit.setInteractive();
    this.publishApexUnlock();
  }

  /** 포인터 아래 인터랙티브 오브젝트가 파인애플(최종 단계)인지 — pointerdown 폭탄 분기용. */
  private isPineapple(o: Phaser.GameObjects.GameObject) {
    const body = (o as FruitImage).body as Body | null;
    return body?.label === CHAIN[CHAIN.length - 1].name;
  }

  /**
   * 파인애플 터치 폭탄 — 탭한 파인애플 주변 BOMB_RADIUS 안의 과일을 폭심에서 바깥으로 퍼지며
   * 파편 연출과 함께 제거한다(파인애플 자신 포함).
   */
  private explodePineapple(pineapple: FruitImage) {
    const px = pineapple.x;
    const py = pineapple.y;
    this.cameras.main.shake(300, 0.012);
    playBombSound(this);
    const r2 = BOMB_RADIUS * BOMB_RADIUS;
    const targets: { body: Body; img: FruitImage; d2: number }[] = [];
    for (const body of this.eachFruit()) {
      if (body === this.hangingBody) {
        continue;
      }
      const dx = body.position.x - px;
      const dy = body.position.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) {
        continue;
      }
      const img = body.gameObject as FruitImage | null;
      if (!img) {
        continue;
      }
      this.merging.add(body); // 제거 중 일반 머지 차단
      targets.push({ body, img, d2 });
    }
    targets.sort((a, b) => a.d2 - b.d2); // 폭심부터 퍼지는 파동
    targets.forEach((tgt, i) => {
      this.time.delayedCall(i * BOMB_STEP_MS, () => {
        if (!tgt.img.active) {
          return;
        }
        const idx = INDEX_BY_NAME.get(tgt.body.label) ?? 0;
        // 콤보 효과 — 폭탄 제거도 머지 연쇄처럼 콤보를 누적(팝·점수). 연쇄 종료 칭찬은 update 가 판정.
        const comboCount = this.combo.bump(this.time.now);
        this.maxMergeIdxThisCombo = Math.max(this.maxMergeIdxThisCombo, idx);
        if (comboCount >= 2) {
          playComboPop(
            this,
            tgt.body.position.x,
            tgt.body.position.y,
            comboCount,
          );
        }
        this.score += Math.round(
          Math.pow(idx, SCORE_TUNING.levelExp) *
            (1 + (comboCount - 1) * SCORE_TUNING.comboFactor),
        );
        this.mergeHandle.emit(
          tgt.body.position.x,
          tgt.body.position.y,
          idx,
          CHAIN[idx].juice,
        );
        if (this.dormant.delete(tgt.body)) {
          clearDormantStyle(tgt.img);
        }
        cancelLandSquish(tgt.img);
        this.fruitBodies.delete(tgt.body);
        tgt.img.destroy();
      });
    });
  }

  /** 통 t 범위의 휴면 prefill 과일을 제거 — 받는 통을 비워 공간 확보(쏟아질 더미 받을 자리). */
  private clearTierPrefill(t: number) {
    const top = t * TIER_H;
    const bottom = (t + 1) * TIER_H;
    for (const body of [...this.dormant]) {
      const cy = body.position.y;
      if (cy < top || cy > bottom) {
        continue;
      }
      this.dormant.delete(body);
      this.fruitBodies.delete(body);
      const img = body.gameObject as FruitImage | null;
      destroyDormantStyle(img); // 얼음 오버레이·follow 리스너 정리(안 하면 오버레이 잔존·누수)
      img?.destroy();
    }
  }

  /** 한 층 범위의 휴면 과일을 활성화(쏟아질 때 — 떨어지며 서로 머지해 더미를 thinning). */
  private wakeTierFruits(t: number) {
    const top = t * TIER_H;
    const bottom = (t + 1) * TIER_H;
    for (const body of this.eachFruit()) {
      if (body.position.y < top || body.position.y > bottom) {
        continue;
      }
      this.wake(body);
      if (this.dormant.delete(body)) {
        clearDormantStyle(body.gameObject as FruitImage | null); // 활성 — 원색 복구
      }
    }
  }

  /** 휴면 바디를 깨운다 — isSleeping=false·sleepCounter=0 (Matter Sleeping.set(false) 핵심). */
  private wake(body: Body) {
    const b = body as Body & { isSleeping: boolean; sleepCounter: number };
    b.isSleeping = false;
    b.sleepCounter = 0;
  }

  /**
   * 동종 연쇄 해동 — 갓 해동된 seed 에서 시작해, **닿아 있는**(중심거리 ≤ 두 반경합 + slop)
   * 같은-과일 휴면으로 thaw 를 전파(flood). 접점을 타고 장전된 무리가 통째 풀려난다.
   * 깨운 바디엔 미세 nudge 를 줘 재충돌→머지를 유도. (옛 반경 블라스트 대체: 거리 무관 "아무 거나
   * 깨우기"가 아니라 *물리적으로 닿은* 같은-과일만 이어 깬다 → 무리 모양 그대로 읽히는 연쇄.)
   */
  private thawCluster(seed: Body) {
    const label = seed.label;
    // seed 는 호출부에서 이미 해동(ring 0). 여기선 닿은 같은-과일 휴면을 ring(전파 거리)별로
    // 모아 둔다 — 점유(thawScheduled)만 먼저 찍고, 실제 해동은 ring 마다 늦춰 fuse 처럼 번지게.
    const waves: Body[][] = [];
    let frontier: Body[] = [seed];
    while (frontier.length > 0) {
      const wave: Body[] = [];
      for (const cur of frontier) {
        const cr = (cur as Body & { circleRadius?: number }).circleRadius ?? 0;
        for (const body of this.dormant) {
          if (body.label !== label || this.thawScheduled.has(body)) {
            continue; // 같은 과일 + 아직 점유 안 된 것만
          }
          const sum =
            cr +
            ((body as Body & { circleRadius?: number }).circleRadius ?? 0) +
            THAW_TUNING.contactSlop;
          const dx = body.position.x - cur.position.x;
          const dy = body.position.y - cur.position.y;
          if (dx * dx + dy * dy > sum * sum) {
            continue; // 닿아 있지 않음 — 전파 안 함
          }
          this.thawScheduled.add(body); // 이번 flood 점유 — 중복 점화·재전파 차단
          wave.push(body);
        }
      }
      if (wave.length > 0) {
        waves.push(wave);
      }
      frontier = wave; // 새로 닿은 것에서 다시 바깥으로(flood)
    }
    // ring 별로 점점 늦춰 해동 → 점화점에서 바깥으로 깨짐(shatter)이 번진다.
    waves.forEach((wave, i) => {
      this.time.delayedCall((i + 1) * THAW_TUNING.stepMs, () => {
        for (const body of wave) {
          this.thawScheduled.delete(body);
          if (!this.dormant.delete(body)) {
            continue; // 그새 제거됨(컬링·finale) — 건너뜀
          }
          clearDormantStyle(body.gameObject as FruitImage | null); // 얼음 깨짐 + 원색 복구
          this.wake(body);
          // 미세 nudge — 떨어진 같은-라벨 바디가 굴러 재충돌→collisionstart→머지하도록.
          this.matter.body.setVelocity(body, {
            x: Phaser.Math.FloatBetween(-0.8, 0.8),
            y: -0.8,
          });
          // resting-contact 보정 — 이미 닿아 있던 같은-과일은 새 collisionstart 가 안 떠서
          // 안 합쳐지는 경우가 있다. 깨어난 즉시 닿아 있는 활성 같은-과일을 찾아 직접 머지.
          this.mergeTouchingActive(body);
        }
      });
    });
  }

  /**
   * 깨어난 과일(body)이 **이미 닿아 있는** 같은-과일 활성체와 머지되게 한다 — resting-contact 라
   * 새 collisionstart 가 안 떠서 onCollision 이 안 불리는 누락을 메운다. 닿은 이웃을 찾으면 합성
   * 충돌 쌍으로 onCollision 을 직접 호출해 **머지 로직(연출·점수·게이지)을 그대로 재사용**한다.
   */
  private mergeTouchingActive(body: Body) {
    if (this.merging.has(body) || this.dormant.has(body)) {
      return;
    }
    const label = body.label;
    if (!label || !INDEX_BY_NAME.has(label)) {
      return;
    }
    const r = (body as Body & { circleRadius?: number }).circleRadius ?? 0;
    for (const other of this.eachFruit()) {
      if (
        other === body ||
        other === this.hangingBody ||
        other.label !== label ||
        this.dormant.has(other) ||
        this.merging.has(other)
      ) {
        continue;
      }
      const sum =
        r + ((other as Body & { circleRadius?: number }).circleRadius ?? 0) + 8; // 닿음 여유[px]
      const dx = other.position.x - body.position.x;
      const dy = other.position.y - body.position.y;
      if (dx * dx + dy * dy > sum * sum) {
        continue; // 안 닿음
      }
      // 닿은 같은-과일 활성 쌍 → 합성 collision 으로 onCollision 호출(머지 로직 재사용).
      this.onCollision({
        pairs: [{ bodyA: body, bodyB: other }],
      } as unknown as Phaser.Physics.Matter.Events.CollisionStartEvent);
      return;
    }
  }

  /** 층별 prefill — N 티어마다 random(흩뿌림), 나머지는 row(전도체). 빈 통은 하강 시점 결정(openFloor). */
  private prefillTier(t: number) {
    const isRandom = (t + 1) % PREFILL_TUNING.randomEvery === 0;
    if (isRandom) {
      this.prefillRandom(t);
    } else {
      this.prefillRows(t);
    }
  }

  /** row 레이아웃 — 바닥부터 행 단위로, 한 행은 같은 과일 일렬, 행마다 다른 과일(+tier escalation). */
  private prefillRows(t: number) {
    const floorY = (t + 1) * TIER_H - FLOOR_H;
    const fillTopY = floorY - PREFILL_TUNING.fillRatio * FILL_SPAN;
    const cap = Math.max(0, targetOfTier(t) - 2);
    let cy = floorY;
    for (const base of PREFILL_ROW_FRUITS) {
      const idx = Phaser.Math.Clamp(base + t, 0, cap);
      const r = CHAIN[idx].r;
      cy -= r; // 행 중심
      if (cy < fillTopY) {
        break; // 채움 높이 초과 — 상단 헤드룸 보존
      }
      const step = 2 * r + PREFILL_TUNING.gap;
      const m = ICE_WALL_CONFIG.width;
      for (let x = m + r; x <= VIEW_W - m - r; x += step) {
        if (Math.random() > PREFILL_TUNING.density) {
          continue; // 칸 비움 — 같은-과일 연속 줄을 끊어 캐스케이드·게이지 억제.
        }
        this.spawnFruit(x, cy, idx, true);
      }
      cy -= r + PREFILL_TUNING.gap; // 다음 행 위로
    }
  }

  /**
   * 우연성 레이아웃 — 가로 슬롯마다 **임의 레벨/크기의 딱붙은 mono-무리**(blob)를 바닥부터 쌓고,
   * 일부 슬롯은 비운다(density = 통로). per-cell 독립 랜덤은 같은-과일 인접이 없어 점화해도 안 터지는데,
   * mono-무리는 tight 라 꽂으면 self-climb 으로 잘 터진다. 어느 무리가 클지/어디 비었는지는 매판 우연.
   * 떨굴 수 있는 레벨(0~DROP_MAX_INDEX)만 깔아 매칭 점화 가능, 큰 무리일수록 보너스↑.
   */
  /** 랜덤 레이아웃 — 격자 위치에 저레벨 위주 가중 분포로 흩뿌림(휴면). 단순·우연성 위주. */
  private prefillRandom(t: number) {
    const floorY = (t + 1) * TIER_H - FLOOR_H;
    const fillTopY = floorY - PREFILL_TUNING.fillRatio * FILL_SPAN;
    const cell = PREFILL_TUNING.cell;
    const m = ICE_WALL_CONFIG.width;
    const xStart = m + cell / 2;
    const xEnd = VIEW_W - m - cell / 2;
    for (let y = floorY - cell / 2; y > fillTopY; y -= cell) {
      for (let x = xStart; x <= xEnd; x += cell) {
        if (Math.random() > PREFILL_TUNING.density) {
          continue; // 칸 비움 — 총 연료량 억제.
        }
        const jx = x + Phaser.Math.Between(-6, 6);
        const jy = y + Phaser.Math.Between(-6, 6);
        this.spawnFruit(jx, jy, this.prefillLevel(t), true);
      }
    }
  }

  /** 랜덤 단계 분포 — 저레벨 위주(65%), 중(25%), 고(10%, 목표-2 cap). */
  private prefillLevel(t: number): number {
    const cap = Math.max(2, targetOfTier(t) - 2);
    const r = Math.random();
    if (r < 0.65) {
      return Phaser.Math.Between(0, 1);
    }
    if (r < 0.9) {
      return Phaser.Math.Between(2, Math.min(3, cap));
    }
    return Phaser.Math.Between(Math.min(4, cap), cap);
  }

  // ── 과일 ─────────────────────────────────────────────────────

  private spawnFruit(
    x: number,
    y: number,
    index: number,
    dormant = false,
  ): FruitImage {
    const def = CHAIN[index];
    const img = this.matter.add.image(x, y, def.name) as FruitImage;
    // setScale 이 바디까지 함께 스케일하므로 바디를 먼저 네이티브 프레임 내접 원으로
    // 잡고 scale → 바디·표시가 항상 같은 비율(시각/충돌 일치).
    const native = img.width || def.r * 2;
    // 충돌원 = def.r 고정. 이미지는 본체가 그 원을 채우게 1/bodyFill 만큼 키워 오버레이 →
    // 여백·꼭지는 원 밖으로 삐져나온다(과일별 칼 트리밍 불필요). bodyFill 미지정 = 1(이미지=원).
    const fill = FRUIT_BODY_FILL[def.name] ?? 1;
    img.setCircle((native / 2) * BODY_RADIUS_RATIO * fill, {
      restitution: PHYSICS_TUNING.restitution,
      friction: FRUIT_FRICTION,
      frictionAir: FRUIT_FRICTION_AIR,
      label: def.name,
    });
    img.setScale((def.r * 2) / (native * fill));
    // 본체가 텍스처 중앙에 없으면(잎·꼭지로 치우침) origin 으로 본체 중심을 충돌원에 얹는다.
    // setCircle 이 origin 을 건드리므로 그 뒤에 덮어쓴다(이미지 수술 대신 코드로 정렬).
    const origin = FRUIT_BODY_ORIGIN[def.name];
    if (origin) {
      img.setOrigin(origin[0], origin[1]);
    }
    if (dormant) {
      this.dormant.add(img.body as Body);
      applyDormantStyle(img); // 휴면 표시(교체 가능). 활성화 시 해제.
    }
    this.fruitBodies.add(img.body as Body);
    return img;
  }

  /**
   * 활성 과일 body 순회 — localWorld.bodies 전체(floor·벽·매달림 포함) 대신 과일만 돈다.
   * destroy 시 delete 를 빠뜨린 stale body 는 gameObject active 체크로 여기서 청소(prune)해
   * 정합을 자가 복구한다. 호출부는 매달림(hangingBody)·층 범위 등 자체 필터를 추가로 건다.
   */
  private *eachFruit(): Generator<Body> {
    for (const body of this.fruitBodies) {
      const img = body.gameObject as FruitImage | null;
      if (!img || !img.active) {
        this.fruitBodies.delete(body);
        continue;
      }
      yield body;
    }
  }

  // ── 드롭 UX (매달림·조준·놓기·쿨다운) ────────────────────────

  /** 통 몸체(벽) 높이 = 바닥앵커~벽top 사이 화면 비율 × viewH. 폰 높이에 비례해 레퍼런스 비율 유지. */
  private binBodyH() {
    return (FLOOR_ANCHOR_FRAC - BIN_TOP_FRAC) * this.viewH;
  }

  private hangY() {
    return (
      (this.activeTier + 1) * TIER_H -
      (FLOOR_ANCHOR_FRAC - HANG_FRAC) * this.viewH
    );
  }

  private randDropIndex() {
    return Phaser.Math.Between(DROP_MIN_INDEX, DROP_MAX_INDEX);
  }

  private clampX(x: number) {
    const m = ICE_WALL_CONFIG.width + 28; // 기둥 안쪽 + 과일 반경 여유
    return Phaser.Math.Clamp(x, m, VIEW_W - m);
  }

  /** 매달린 과일 → 착지 예상 지점까지 가이드라인을 그린다(매 프레임). 색은 고정(dropGuide). */
  private drawGuide() {
    const r = CHAIN[this.hangingIndex].r;
    const fromY = this.hangY(); // 매달린 과일 중심 — 선이 과일(depth 0) 뒤로 깔려 본체 밑에서 항상 이어짐(반경 오차·블롭 모양 무관)
    // 끝점을 안착 "중심"이 아니라 "바닥"(restY + r)으로 — 쌓인 과일 표면까지 닿는다. 겹치는 부분은
    // 가이드가 과일보다 뒤(depth -0.5)라 자연스레 가려져 표면에 붙어 보인다.
    const restY = this.guideRestY(this.pointerX, r) + r;
    drawDropGuide(this.guideGfx, this.pointerX, fromY, restY);
  }

  /**
   * x 열에 반경 r 과일을 떨어뜨릴 때 안착할 중심 y. 활성 층의 과일·바닥 중 가장 높은 표면.
   * 과일 위에 얹힐 땐 두 원의 접점 기하(수평 오프셋 dx 고려)로 안착 중심을 구한다.
   */
  private guideRestY(x: number, r: number): number {
    const tierTop = this.activeTier * TIER_H;
    const tierBottom = (this.activeTier + 1) * TIER_H;
    let restY = tierBottom - FLOOR_H - r; // 빈 열 — 바닥에 안착
    for (const body of this.eachFruit()) {
      if (body === this.hangingBody) {
        continue;
      }
      const by = body.position.y;
      if (by < tierTop || by > tierBottom) {
        continue; // 활성 층만
      }
      const sum =
        ((body as Body & { circleRadius?: number }).circleRadius ?? 0) + r;
      const dx = body.position.x - x;
      if (Math.abs(dx) >= sum) {
        continue; // 이 열 밖
      }
      const top = by - Math.sqrt(sum * sum - dx * dx); // 이 과일 위에 얹힐 때 중심 y
      if (top < restY) {
        restY = top;
      }
    }
    return restY;
  }

  private spawnHanging() {
    if (this.isGameOver) {
      return;
    }
    const idx = this.nextIndex;
    this.hangingIndex = idx;
    this.nextIndex = this.randDropIndex();
    const img = this.spawnFruit(this.pointerX, this.hangY(), idx);
    img.setSensor(true);
    img.setStatic(true);
    this.hanging = img;
    this.hangingBody = img.body as Body;
    this.canDrop = true;

    // 단어 라벨(spring pop) + 발음은 매달리는 "스폰 순간"에만(tower-battle 선례 — 머지·연쇄엔 안 함).
    const name = CHAIN[idx].name;
    const label = this.labelOf(name, CHAIN[idx].en);
    playWordCallout(this, img, label);
    // 발음(drop 음성) — config.audioUrl 이 있으면 호스트 어댑터(playAudio)로 재생. 없으면 무음.
    // 칭찬이 말하는 동안엔 건너뛴다(칭찬·6단계 과일 발음을 덮지 않게). 시각 라벨은 그대로 노출.
    const url = this.audioByName.get(name);
    if (url && !this.praiseSpeaking) {
      this.config.playAudio?.(url, label);
    }
    // 등장 집계 + 호스트 알림(도감·세션). 매달림 = 객체 1회 등장.
    this.mergedCounts.set(name, (this.mergedCounts.get(name) ?? 0) + 1);
    this.config.onObjectMerge?.(name);
  }

  private releaseHanging() {
    if (
      !this.hanging ||
      !this.canDrop ||
      this.transitionLock ||
      this.isGameOver
    ) {
      return;
    }
    const f = this.hanging;
    f.setStatic(false);
    f.setSensor(false);
    // 정적→dynamic 전환 시 sleeping 이면 중력 적분이 안 돼 공중에 떠버린다 →
    // 명시적으로 깨우고 살짝 아래 속도를 줘 확실히 낙하시킨다.
    const body = f.body as Body;
    this.wake(body);
    this.matter.body.setVelocity(body, { x: 0, y: 3 });
    this.lastDropped = body; // 착지 꿀렁임은 이 과일의 착지에서만
    this.hanging = null;
    this.hangingBody = null;
    this.canDrop = false;
    this.time.delayedCall(DROP_COOLDOWN_MS, () => this.spawnHanging());
  }

  // ── 머지 + 목표 ─────────────────────────────────────────────

  private onCollision(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
    if (this.isGameOver) {
      return;
    }
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      if (a === this.hangingBody || b === this.hangingBody) {
        continue; // 매달린 과일은 머지 제외
      }
      // 착지 꿀렁임 — 다른 단계 과일 위로 빠르게 떨어진 쪽을 squash(머지될 쌍은 머지 펀치가 처리).
      this.tryLandSquish(a, b);
      if (!a.label || a.label !== b.label || !INDEX_BY_NAME.has(a.label)) {
        continue;
      }
      const aDormant = this.dormant.has(a);
      const bDormant = this.dormant.has(b);
      if (aDormant && bDormant) {
        continue; // 휴면끼리는 안 점화 — 매칭 열쇠(활성 같은-색 과일)가 닿아야만 깬다
      }
      if (aDormant || bDormant) {
        // 동종 점화: 활성 과일이 같은 과일 휴면에 직접 닿음 → 그 휴면을 깨우고, 닿아 있는
        // 같은-과일 휴면으로 연쇄 해동(flood) → 장전된 무리가 접점을 타고 통째 풀려남.
        const sleeper = aDormant ? a : b;
        if (this.thawScheduled.has(sleeper)) {
          continue; // 진행 중 flood 가 곧 해동할 휴면 — 중복 점화 금지(웨이브가 처리)
        }
        this.dormant.delete(sleeper);
        clearDormantStyle(sleeper.gameObject as FruitImage | null);
        this.wake(sleeper);
        this.thawCluster(sleeper);
      }
      if (this.merging.has(a) || this.merging.has(b)) {
        continue;
      }
      const nextIdx = (INDEX_BY_NAME.get(a.label) ?? -1) + 1;
      if (nextIdx >= CHAIN.length) {
        continue; // 파인애플은 최종 단계 — 합쳐지지 않고 보드에 남는다(터치 폭탄으로 소모).
      }
      // 발견 즉시 실행하지 않고 큐에 넣는다. merging 잠금으로 같은 쌍 재발견·다른 머지의 소비를
      // 막는다 — 큐가 실행을 보장하므로 머지 누락은 없다.
      this.merging.add(a);
      this.merging.add(b);
      // 실행 가능 시각 = 재료 과일의 쿨다운 종료. 직전 머지 결과(같은 연쇄)면 STEP 만큼 미뤄지고,
      // 쿨다운 없는 과일(독립)이면 now → 즉시. 그래서 다른 위치 연쇄는 서로 안 기다리고 병렬 진행한다.
      const readyAt = Math.max(
        this.mergeCooldownUntil.get(a) ?? 0,
        this.mergeCooldownUntil.get(b) ?? 0,
      );
      this.mergeQueue.push({ a, b, readyAt });
    }
  }

  /**
   * 큐에 쌓인 머지 중 readyAt 이 지난 것을 한 프레임에 **모두** 실행한다 — 서로 다른 위치의
   * 독립 연쇄가 병렬로 진행된다. 같은 연쇄의 다음 단계는 직전 결과의 쿨다운(readyAt) 때문에
   * 아직 안 와 자연히 순차로 남는다. 대기 중 한쪽이 사라졌으면(쏟아짐 cull 등) 그 쌍은 버린다.
   */
  private processMergeQueue() {
    if (this.isGameOver || this.mergeQueue.length === 0) {
      return;
    }
    const now = this.time.now;
    const stillWaiting: { a: Body; b: Body; readyAt: number }[] = [];
    for (const pair of this.mergeQueue) {
      if (now < pair.readyAt) {
        stillWaiting.push(pair); // 쿨다운 대기 중(연쇄 다음 단계)
        continue;
      }
      const { a, b } = pair;
      if (!this.fruitBodies.has(a) || !this.fruitBodies.has(b)) {
        // 대기 중 한쪽이 제거됨(쏟아짐 cull·게임오버 등) → 머지 취소(잠금 해제).
        this.merging.delete(a);
        this.merging.delete(b);
        continue;
      }
      this.executeMerge(a, b);
    }
    this.mergeQueue = stillWaiting;
  }

  /** 머지 1건 실행 — pull·새 과일 등장(punch)·콤보·점수·게이지. 발견은 onCollision, 실행은 큐. */
  private executeMerge(a: Body, b: Body) {
    const nextIdx = (INDEX_BY_NAME.get(a.label) ?? -1) + 1;
    // 공중 머지(쏟아질 때 둘 다 빠르게 낙하 중 합쳐짐)는 게이지에 안 센다 — 머지·연출은 정상.
    // 플레이어 드롭은 떨군 과일만 빠르고 받는 더미는 정지라 "둘 다 빠름"이 아님 → 게이지에 셈.
    // 그래서 OR 아닌 AND. mergeMaxSpeed 0 이면 속도 무시(전부 셈).
    const maxSpeed = GAUGE_TUNING.mergeMaxSpeed;
    const airborneMerge =
      maxSpeed > 0 &&
      Math.hypot(a.velocity.x, a.velocity.y) > maxSpeed &&
      Math.hypot(b.velocity.x, b.velocity.y) > maxSpeed;

    const ga = a.gameObject as FruitImage | null;
    const gb = b.gameObject as FruitImage | null;
    const mx = (a.position.x + b.position.x) / 2;
    const my = (a.position.y + b.position.y) / 2;
    playMergeSound(this);
    this.config.playHaptic?.("light"); // 머지 햅틱(네이티브 앱에서만, 그 외 no-op).
    // 머지되는 두 과일이 중앙으로 빨려드는 끌어당김 연출(복제 그림, 물리 무관).
    playMergePull(
      this,
      a.position.x,
      a.position.y,
      b.position.x,
      b.position.y,
      mx,
      my,
      a.label,
      ga?.displayWidth ?? gb?.displayWidth ?? CHAIN[nextIdx - 1].r * 2,
    );
    // 사라지는 과일의 진행 중 펀치 취소 → 중간 단계 유령 제거.
    if (ga) {
      cancelMergePunch(ga);
      cancelLandSquish(ga);
    }
    if (gb) {
      cancelMergePunch(gb);
      cancelLandSquish(gb);
    }
    this.fruitBodies.delete(a);
    this.fruitBodies.delete(b);
    ga?.destroy();
    gb?.destroy();
    const newFruit = this.spawnFruit(mx, my, nextIdx);
    // 이 결과가 곧바로 다음 머지에 쓰이면(같은 연쇄) STEP 만큼 미뤄 1→2→3 순차로 읽히게 한다.
    // 다른 위치의 독립 머지는 쿨다운이 없어 즉시 실행되므로 서로 안 기다린다.
    this.mergeCooldownUntil.set(
      newFruit.body as Body,
      this.time.now + MERGE_STEP_MS,
    );
    if (nextIdx === CHAIN.length - 1) {
      this.armPineapple(newFruit); // 파인애플 = 폭탄: 터치 유도 펄스 + 진화바 공개.
    }
    // 물리 바디는 즉시 생겨 연쇄·충돌은 정상. 그림만 숨겼다가 끌어당김이 끝나(두 과일이
    // 사라진) 뒤 등장 + burst + punch. 그새 연쇄로 사라졌으면(active=false) 건너뛴다.
    newFruit.setVisible(false);
    this.time.delayedCall(MERGE_PULL_MS, () => {
      if (!newFruit.active) {
        return;
      }
      newFruit.setVisible(true);
      // 즙 색 = 합쳐진(결과) 과일의 대표 색.
      this.mergeHandle.emit(mx, my, nextIdx, CHAIN[nextIdx].juice);
      playMergePunch(
        this,
        newFruit,
        CHAIN[nextIdx].name,
        newFruit.displayWidth,
      );
    });

    // 연속 머지 콤보 — 전역 단일 카운터(window 안 이어지면 누적). 2 이상부터 머지 자리에 팝.
    const comboCount = this.combo.bump(this.time.now);
    this.maxMergeIdxThisCombo = Math.max(this.maxMergeIdxThisCombo, nextIdx);
    // 6단계+ 머지 결과면 이름표 후보로 기록 — 더 높은(같으면 더 나중) 단계로만 갱신해, 연쇄 종료
    // 시점에 "제일 높은 것 하나"만 그 과일 옆에 띄운다.
    if (nextIdx >= 5 && nextIdx >= this.tagFruitIdx) {
      this.tagFruit = newFruit;
      this.tagFruitIdx = nextIdx;
    }
    if (comboCount >= 2) {
      playComboPop(this, mx, my, comboCount);
    }

    // 머지 점수 — 결과 단계 초선형 × 콤보 배수. 공중 머지도 가산(게이지만 제외 — 점수는 하강
    // 폭주와 무관). 정점 잭팟은 별도(#134).
    this.score += Math.round(
      Math.pow(nextIdx, SCORE_TUNING.levelExp) *
        (1 + (comboCount - 1) * SCORE_TUNING.comboFactor),
    );

    // ladder climb 은 이제 *접촉 구동* — 합쳐진 결과(활성)가 다음 단 같은-과일 휴면에 닿으면
    // 위 동종 점화(thawCluster)가 다시 걸려 색을 타고 오른다. 별도 반경 전파 없음.

    // 레벨 가중 하강 게이지 — 결과 과일 레벨(nextIdx)만큼 **누적만** 한다. 충전 판정(threshold
    // 도달 = 장전, 카운트 +1)은 머지 즉시가 아니라 **연쇄(콤보)가 끝나는 순간** commitGauge()
    // 에서 한다 — 흰 헤드가 먼저 늘고 연쇄가 끝나면 시안이 따라 채워지는 잔상 추격 연출과 맞춤.
    // 공중 머지는 제외(airborneMerge) — 쏟아짐 캐스케이드가 게이지를 자동 재충전해 플런지가
    // 폭주하지 않게(플런지는 발사 탭의 연속으로 플레이어가 주도).
    if (!airborneMerge) {
      this.descentGauge += nextIdx;
    }
  }

  /**
   * 과일끼리의 충돌 → "떨어진 과일이 멈춰 있던 과일을 맞힘"일 때만, **맞은(멈춰 있던) 과일**을 꿀렁.
   * 빠른 쪽=lander, 느린 쪽=hit. lander 가 충분히 빠르고(LAND_IMPACT) hit 이 거의 멈춰(LAND_REST)
   * 있어야 = 진짜 착지. 둘 다 빠르면(settle·cascade 난장) 제외. 실제 머지될 쌍도 제외(머지 펀치 담당).
   */
  private tryLandSquish(a: Body, b: Body) {
    if (
      !a.label ||
      !b.label ||
      !INDEX_BY_NAME.has(a.label) ||
      !INDEX_BY_NAME.has(b.label)
    ) {
      return; // 둘 다 과일일 때만
    }
    const willMerge =
      a.label === b.label &&
      !this.dormant.has(a) &&
      !this.dormant.has(b) &&
      !this.merging.has(a) &&
      !this.merging.has(b);
    if (willMerge) {
      return;
    }
    const sa = Math.hypot(a.velocity.x, a.velocity.y);
    const sb = Math.hypot(b.velocity.x, b.velocity.y);
    const aIsLander = sa >= sb;
    const lander = aIsLander ? a : b; // 빠른 쪽 = 떨어진 과일
    const hit = aIsLander ? b : a; // 느린 쪽 = 맞은 과일
    if (lander !== this.lastDropped) {
      return; // 플레이어가 떨군 과일의 착지에서만 — 캐스케이드·ripple 충돌 제외
    }
    const landerSpeed = aIsLander ? sa : sb;
    const hitSpeed = aIsLander ? sb : sa;
    if (landerSpeed < LAND_IMPACT_SPEED || hitSpeed > LAND_REST_SPEED) {
      return; // 진짜 착지(빠른 게 멈춘 걸 맞힘)가 아니면 제외
    }
    if (this.dormant.has(hit)) {
      return; // 맞은 게 휴면(얼음)이면 제외 — 얼음 오버레이가 따로라 squash 깨짐
    }
    const idx = INDEX_BY_NAME.get(hit.label) ?? 0;
    const img = hit.gameObject as FruitImage | null;
    if (img) {
      playLandSquish(this, img, CHAIN[idx].name, img.displayWidth);
    }
  }

  /**
   * 발사(플레이어 버튼 탭) — 보유 카운트>0 이고 전환/게임오버 아닐 때만 1 소모 + 받침대 개방.
   * 하강이 보드를 섞어(리셔플) 새 무리를 만든다 = "이 보드 다 캤다, 섞어" 의 실행.
   */
  private fireDescent() {
    if (
      (TEST_ALWAYS_DESCENT || this.descentCharges > 0) &&
      !this.transitionLock &&
      !this.isGameOver
    ) {
      if (this.descentCharges > 0) {
        this.descentCharges -= 1;
      }
      playBombSound(this); // 하강(층 쏟아짐) 폭발음 — openFloor 의 얼음 깨짐과 겹쳐 "쾅+쨍".
      this.config.playHaptic?.("light"); // 하강 햅틱.
      this.openFloor(this.activeTier);
    }
  }

  /**
   * 연쇄 종료 시 누적 게이지를 충전 카운트로 확정한다. threshold 만큼 모일 때마다 카운트 +1 하고
   * 그만큼 게이지를 차감한다(여러 칸 동시 충전 가능). cap(MAX_DESCENT_CHARGES) 도달 시 잔여 게이지는
   * threshold 로 고정(full)해 둬, 하나 쓰면 곧장 재적립되게 한다.
   */
  private commitGauge() {
    while (
      this.descentGauge >= GAUGE_TUNING.threshold &&
      this.descentCharges < MAX_DESCENT_CHARGES
    ) {
      this.descentCharges += 1;
      this.descentGauge -= GAUGE_TUNING.threshold;
    }
    if (this.descentCharges >= MAX_DESCENT_CHARGES) {
      this.descentGauge = Math.min(this.descentGauge, GAUGE_TUNING.threshold);
    }
  }

  /**
   * 받침대 개방 → 낙하. 충돌벽(floor)은 **즉시** 제거해 과일이 바로 떨어지고(+통 스왑·셰이크·파편),
   * 카메라는 DESCENT_CAM_LAG_MS 만큼 **늦게** 따라간다(followCamera 가 cameraHoldUntil 까지 잡아둠).
   * "바닥이 사라지고 과일이 떨어진 뒤 카메라가 쫓아온다"는 체감.
   */
  private openFloor(t: number) {
    const rec = this.tiers.get(t);
    if (!rec || rec.floorOpened || rec.floor === null) {
      return;
    }
    rec.floorOpened = true;
    this.transitionLock = true; // 전환 동안 재발사·오버플로 정지(카메라 정착 시 해제).
    this.overLineSince = null;

    // 바닥 깨짐 연출 — 통 스왑 + 셰이크 + 파편.
    rec.bin
      ?.setTexture(ICE_BIN_BROKEN_TEXTURE)
      .setDisplaySize(VIEW_W, this.binBodyH());
    this.cameras.main.shake(DESCENT_SHAKE_MS, DESCENT_SHAKE_INTENSITY);
    playShatterSound(this);
    const burstY = (t + 1) * TIER_H - FLOOR_H / 2;
    const wallW = ICE_WALL_CONFIG.width;
    const span = VIEW_W - wallW * 2;
    for (let i = 0; i < DESCENT_BURST_POINTS; i++) {
      const x = wallW + span * ((i + 0.5) / DESCENT_BURST_POINTS);
      playShatterParticles(this, x, burstY, DESCENT_SHARD_SIZE, {
        duration: DESCENT_SHARD_DURATION,
      });
      // 조각과 같은 지점에서 먼지 구름이 피어올라 무너짐의 묵직함을 더한다(조각보다 넓게).
      playDustCloud(this, x, burstY, DESCENT_SHARD_SIZE * 1.6);
    }

    // 충돌벽(floor) 즉시 제거 → 과일이 바로 떨어진다.
    // 받는 통(t+1) 비움 결정 — 현재 통(t) 채움 비율 3구간 확률. 많이 쌓였으면 거의 비워 공간 확보.
    const fullness = this.tierFullness(t);
    const emptyChance =
      fullness < FULLNESS_LOW
        ? PREFILL_TUNING.emptyLow
        : fullness < FULLNESS_HIGH
          ? PREFILL_TUNING.emptyMid
          : PREFILL_TUNING.emptyHigh;
    if (Math.random() < emptyChance) {
      this.clearTierPrefill(t + 1);
    }
    this.matter.world.remove(rec.floor);
    rec.floor = null;
    // 쏟아질 층(t) 활성화 → 떨어지며 머지해 thinning. 휴면으로 두면 죽은 더미로 쌓여 억울한 게임오버.
    this.wakeTierFruits(t);

    this.activeTier = Math.max(this.activeTier, t + 1);
    this.ensureTier(this.activeTier + GEN_AHEAD); // 다음 pour 대상 준비
    this.cullTier(this.activeTier - 2); // 지난 층 정리

    // 카메라는 좀 늦게 따라간다 — 이 시각까지 followCamera 가 카메라를 잡아둔다.
    this.cameraHoldUntil = this.time.now + DESCENT_CAM_LAG_MS;
  }

  // ── 오버플로 / 게임오버 ─────────────────────────────────────

  /**
   * 오버플로 판정 + 한계선 경고 표시.
   * - 게임오버: 과일이 "완전히"(아랫면 cy+radius 까지) 한계선 위로 넘은 채 DANGER_MS 경과.
   * - 한계선: 평소 숨김. 통 채움(바닥~한계선)이 WARN_FILL_RATIO 이상이면 빨갛게(채울수록 진하게),
   *   넘어서 카운트다운 중이면 강하게 깜빡인다. 낙하 중(빠른) 과일은 채움 측정에서 제외.
   */
  private updateDanger() {
    const lineY = (this.activeTier + 1) * TIER_H - this.binBodyH();
    this.dangerLine.setY(lineY);

    if (this.isGameOver || this.transitionLock || !this.started) {
      this.dangerLine.setAlpha(0);
      this.overLineSince = null;
      return;
    }

    const tierTop = this.activeTier * TIER_H;
    const tierBottom = (this.activeTier + 1) * TIER_H;
    const floorY = tierBottom - FLOOR_H;
    const zoneH = floorY - lineY; // 바닥~한계선 사이 채울 수 있는 높이
    let over = false;
    let highestTop = floorY; // 가장 높이 쌓인(가라앉은) 과일의 윗면 — 기본 빈 통=바닥
    for (const body of this.eachFruit()) {
      if (body === this.hangingBody) {
        continue;
      }
      const cy = body.position.y;
      if (cy < tierTop || cy > tierBottom) {
        continue; // 활성 층만
      }
      const radius =
        (body as Body & { circleRadius?: number }).circleRadius ?? 0;
      if (cy + radius < lineY) {
        over = true; // 아랫면까지 선 위 = 완전히 넘음
      }
      // 경고 채움 — 낙하 중(빠른) 과일은 제외해 드롭마다 깜빡이지 않게.
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed < SETTLE_SPEED) {
        highestTop = Math.min(highestTop, cy - radius);
      }
    }

    if (over) {
      if (this.overLineSince === null) {
        this.overLineSince = this.time.now;
      }
      if (this.time.now - this.overLineSince > DANGER_MS) {
        this.triggerGameOver();
        return;
      }
    } else {
      this.overLineSince = null;
    }

    // 한계선 표시 — 채움 70% 미만이면 숨김.
    const fillRatio = Phaser.Math.Clamp((floorY - highestTop) / zoneH, 0, 1.5);
    if (fillRatio < WARN_FILL_RATIO) {
      this.dangerLine.setAlpha(0);
      return;
    }
    if (over) {
      // 게임오버 카운트다운 — 강하게 깜빡여 위급함을 알림.
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 90);
      this.dangerLine.setAlpha(0.7 + 0.3 * pulse);
      return;
    }
    // 70%~100% 구간 — 채울수록 진하게.
    const t = Phaser.Math.Clamp(
      (fillRatio - WARN_FILL_RATIO) / (1 - WARN_FILL_RATIO),
      0,
      1,
    );
    this.dangerLine.setAlpha(0.35 + 0.55 * t);
  }

  private triggerGameOver() {
    if (this.isGameOver) {
      return;
    }
    this.isGameOver = true;
    this.canDrop = false;
    if (this.hanging) {
      if (this.hangingBody) {
        this.fruitBodies.delete(this.hangingBody);
      }
      this.hanging.destroy();
      this.hanging = null;
      this.hangingBody = null;
    }
    // GAME OVER 연출·결과 전환은 호스트(GameContainer)가 onGameEnd 수신 후 React 오버레이로 처리한다.
    this.config.onGameEnd?.(this.buildResult());
  }

  // ── 배경 ─────────────────────────────────────────────────────

  /**
   * 배경 — 파스텔 세로 줄무늬 벽지. seamless 타일이라 tileSprite 로 화면 전체를 덮는다.
   * scrollFactor 0 으로 화면에 고정 — 줄무늬는 Y축 균일이라 하강해도 모양이 같고, 지속 하강감은
   * 떠다니는 눈(iceSnow)·층별 통이 만든다. 타일 텍스처는 1254px(줄 주기 ~125px)이라 720 화면에
   * ~6줄 노출. 늘리는 게 아니라 반복이므로 줄 폭이 안 뭉개진다.
   */
  private drawBackground() {
    this.add
      .tileSprite(0, 0, VIEW_W, this.viewH, STRIPE_BG_TEXTURE)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-100);
  }

  // ── HUD ─────────────────────────────────────────────────────

  /**
   * chunky pill 1장 — 드롭섀도(아래 오프셋) + 면 + 윗면 글로시 하이라이트 + ink 보더.
   * fooding 입체 톤(DESIGN.md): 평면 단색이 아니라 떠 있는 장난감처럼. scrollFactor 0 고정.
   */
  private drawPill(
    depth: number,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: number,
    radius = h / 2,
  ) {
    const g = this.add.graphics().setScrollFactor(0).setDepth(depth);
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(x, y + 7, w, h, radius); // 드롭섀도
    g.fillStyle(fill, 1);
    g.fillRoundedRect(x, y, w, h, radius); // 면
    const glossH = h * 0.4;
    g.fillStyle(0xffffff, 0.22);
    g.fillRoundedRect(
      x + 7,
      y + 5,
      w - 14,
      glossH,
      Math.min(radius, glossH / 2),
    ); // 윗면 글로시
    g.lineStyle(4, HUD_COLOR.ink, 1);
    g.strokeRoundedRect(x, y, w, h, radius); // ink 보더
    return g;
  }

  private buildHud() {
    // 텍스트 resolution = dpr(registry 단일 출처). 카메라 zoom dpr 와 함께 굵은 글자도 선명.
    const dpr = (this.registry.get("dpr") as number) ?? 1;
    const cx = VIEW_W / 2;

    // ── 중앙 상단: 점수 pill 윗변에 하강 게이지를 얹어 한 묶음으로(레퍼런스). tier 배지가 게이지 좌측 캡. ──
    const pillTop = HUD.rowY - HUD.scorePillH / 2;
    const gaugeY = pillTop; // 게이지 중심 = pill 윗변(얹힘)
    const gaugeLeft = cx - HUD.gaugeW / 2;
    const fillH = HUD.gaugeH - HUD.gaugeInset * 2;

    // 점수 pill(크림) — 먼저 그려 게이지가 위에 얹히게. 큰 파랑 점수는 살짝 아래(게이지가 윗변 먹음).
    this.drawPill(
      10,
      cx - HUD.scorePillW / 2,
      pillTop,
      HUD.scorePillW,
      HUD.scorePillH,
      HUD_COLOR.cream,
    );
    this.scoreText = createStrokedText(this, dpr, cx, HUD.rowY + 8, "0", {
      fontSize: `${HUD.scoreFontPx}px`,
      color: "#36c0f0",
      stroke: "#ffffff",
      strokeThickness: 7,
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(11);

    // 게이지 트랙(브라운, chunky) — pill 윗변에 얹음.
    this.drawPill(
      12,
      gaugeLeft,
      gaugeY - HUD.gaugeH / 2,
      HUD.gaugeW,
      HUD.gaugeH,
      HUD_COLOR.track,
    );
    // 게이지 fill(파랑) + 윗면 shine + glow(상승 시 번쩍). 폭은 updateHud 가 보간해 세팅.
    this.gaugeFill = this.add
      .rectangle(gaugeLeft + HUD.gaugeInset, gaugeY, 0, fillH, HUD_COLOR.blue)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(13);
    this.gaugeShine = this.add
      .rectangle(
        gaugeLeft + HUD.gaugeInset,
        gaugeY - fillH * 0.22,
        0,
        fillH * 0.34,
        0xffffff,
        0.4,
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(14);
    this.gaugeGlow = this.add
      .rectangle(
        gaugeLeft + HUD.gaugeInset,
        gaugeY,
        0,
        fillH,
        HUD_COLOR.blueGlow,
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(15)
      .setAlpha(0);
    // tier 배지(파랑 chunky 사각) — 게이지 좌측 끝을 캡.
    const bs = HUD.tierBadge;
    this.drawPill(
      16,
      gaugeLeft - bs / 2,
      gaugeY - bs / 2,
      bs,
      bs,
      HUD_COLOR.blue,
      14,
    );
    this.tierText = createStrokedText(this, dpr, gaugeLeft, gaugeY, "0", {
      fontSize: "28px",
      color: "#ffffff",
      stroke: "#2b2440",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(17);

    // 증가분 "+N" — 점수 pill 우측에서 번쩍였다 사라짐(레퍼런스 +12). 단일 텍스트 재사용.
    this.gainText = createStrokedText(
      this,
      dpr,
      cx + HUD.scorePillW / 2,
      HUD.rowY + 8,
      "",
      {
        fontSize: "30px",
        color: "#ffffff",
        stroke: "#3f7a2a",
        strokeThickness: 5,
      },
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(17)
      .setAlpha(0);

    // ── 좌상단: 최고기록 — Brawl 둥근 사각형 패널(어두운 면 + 아이콘 좌측 오버플로 + 흰 스트로크 숫자) ──
    const bpLeft = 80;
    const bpW = 150;
    const bpH = 60;
    const bpTop = HUD.rowY - bpH / 2;
    const bpRadius = 16;
    const trophyCx = bpLeft; // 아이콘 중심 = 패널 좌측 변(오버플로)
    const trophySize = 76;
    const bestPanel = this.add.graphics().setScrollFactor(0).setDepth(10);
    bestPanel.fillStyle(0x08060f, 1);
    bestPanel.fillRoundedRect(bpLeft, bpTop, bpW, bpH, bpRadius); // 어두운 면(키트 #08060f)
    // 트로피 아이콘 — 패널 좌측 변에 걸쳐 삐져나옴 + 드롭섀도(어두운 복제 오프셋).
    this.add
      .image(trophyCx, HUD.rowY + 5, TROPHY_TEXTURE)
      .setDisplaySize(trophySize, trophySize)
      .setTint(0x000000)
      .setAlpha(0.45)
      .setScrollFactor(0)
      .setDepth(11);
    this.add
      .image(trophyCx, HUD.rowY - 2, TROPHY_TEXTURE)
      .setDisplaySize(trophySize, trophySize)
      .setScrollFactor(0)
      .setDepth(12);
    this.bestText = createStrokedText(this, dpr, bpLeft + 54, HUD.rowY, "0", {
      fontSize: "32px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(13);

    // ── 상단 우측: 하강(리셔플) 능력 버튼 — 게이지가 채운 카운트를 소모해 발사. 레퍼런스는 능력
    //    버튼을 상단 HUD 아래·가운데 드롭 열 옆에 플랭킹(우측 끝 = 카운트 배지 버튼). ──
    const fbw = 120;
    const fbh = 120;
    const fbx = VIEW_W - 20 - fbw; // top-left, 우측 끝
    const fby = 178; // 상단 HUD(rowY 120) 바로 아래
    const fbcx = fbx + fbw / 2;
    const fbcy = fby + fbh / 2;
    this.fireBg = this.drawPill(18, fbx, fby, fbw, fbh, HUD_COLOR.green, 28);
    // 아이콘 = 갈라지는 얼음 바닥(IceFloor 재활용 — "이 바닥을 깬다"). 추후 전용 크랙 아트로 교체 가능.
    this.fireIcon = this.add
      .image(fbcx, fbcy, ICE_FLOOR_TEXTURE)
      .setScrollFactor(0)
      .setDepth(19);
    this.fireIcon.setScale(
      Math.min(
        (fbw * 0.78) / this.fireIcon.width,
        (fbh * 0.78) / this.fireIcon.height,
      ),
    );
    // 카운트 배지(우상단 빨강 원, 레퍼런스 망치의 "1"처럼) — 보유 발사 횟수. count 0 이면 숨김.
    const badgeR = 26;
    this.fireBadgeBg = this.drawPill(
      20,
      fbcx + fbw / 2 - badgeR * 2,
      fby - badgeR + 8,
      badgeR * 2,
      badgeR * 2,
      0xe23b3b,
      badgeR,
    );
    this.fireBadge = createStrokedText(
      this,
      dpr,
      fbcx + fbw / 2 - badgeR,
      fby + 8,
      "0",
      {
        fontSize: "32px",
        color: "#ffffff",
        stroke: "#7a1f1f",
        strokeThickness: 5,
      },
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21);
    // 탭 히트존(투명 인터랙티브) — over 로 조준/드롭과 분리. count>0 일 때만 interactive(updateHud).
    this.fireButton = this.add
      .rectangle(fbcx, fbcy, fbw, fbh, 0xffffff, 0)
      .setScrollFactor(0)
      .setDepth(22);

    // ── 디버그(spike 튜닝용) — 하단에 작게. 기본 숨김, 튜닝 패널 열 때만 표시(onDebug). ──
    this.fpsText = this.add
      .text(VIEW_W - 16, this.viewH - 30, "", {
        fontSize: "22px",
        color: "#1b3a0e",
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(10)
      .setVisible(false);
    this.infoText = this.add
      .text(16, this.viewH - 30, "", { fontSize: "20px", color: "#1b3a0e" })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10)
      .setVisible(false);
  }

  private updateHud() {
    // fps 텍스트는 디버그 패널(onDebug)로만 보임 — 숨김 상태에선 매 프레임 캔버스 텍스처
    // 재생성(fps 문자열이 매번 바뀜)을 피하려 visible 일 때만 갱신.
    if (this.fpsText.visible) {
      this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
    }

    // 게이지 — 실제 비율로 부드럽게 보간(lerp). 게이지가 오르면 pulse/glow.
    const ratio = Phaser.Math.Clamp(
      this.descentGauge / GAUGE_TUNING.threshold,
      0,
      1,
    );
    this.gaugeDisplayRatio = Phaser.Math.Linear(
      this.gaugeDisplayRatio,
      ratio,
      0.25,
    );
    const fillW = (HUD.gaugeW - HUD.gaugeInset * 2) * this.gaugeDisplayRatio;
    this.gaugeFill.width = fillW;
    this.gaugeShine.width = Math.max(0, fillW - 6);
    this.gaugeGlow.width = fillW;
    if (this.descentGauge > this.prevGaugeForHud) {
      playGaugePulse(this, this.gaugeFill, this.gaugeGlow);
    }
    this.prevGaugeForHud = this.descentGauge;

    // React HUD 브리지 — 게이지/카운트가 바뀐 프레임만 발행. 부드러운 채움은 React 쪽 CSS 보간.
    if (
      this.descentGauge !== this.prevPublishedGauge ||
      this.descentCharges !== this.prevPublishedCharges
    ) {
      this.publishGauge(ratio, this.descentCharges, MAX_DESCENT_CHARGES);
      this.prevPublishedGauge = this.descentGauge;
      this.prevPublishedCharges = this.descentCharges;
    }

    // 발사 버튼 상태 — 카운트 배지 갱신 + count>0 이면 밝게·맥동·interactive, 0 이면 흐릿·비활성.
    const hasCharge = this.descentCharges > 0 && !this.isGameOver;
    const lit = hasCharge && !this.transitionLock;
    this.fireBadge.setText(`${this.descentCharges}`);
    // 발사 카운트 배지(빨간) — React 능력 게이지가 카운트를 담당하므로 Phaser HUD 숨김 시 표시 안 함.
    this.fireBadge.setVisible(SHOW_PHASER_HUD && this.descentCharges > 0);
    this.fireBadgeBg.setVisible(SHOW_PHASER_HUD && this.descentCharges > 0);
    this.fireIcon.setAlpha(hasCharge ? 1 : 0.5);
    if (lit) {
      this.fireBg.setAlpha(0.85 + 0.15 * Math.sin(this.time.now / 220)); // 준비 맥동
      if (!this.fireButton.input?.enabled) {
        this.fireButton.setInteractive();
      }
    } else {
      this.fireBg.setAlpha(hasCharge ? 1 : 0.4);
      if (this.fireButton.input?.enabled) {
        this.fireButton.disableInteractive();
      }
    }

    // 점수 — 증가분을 "+N" 으로 번쩍. 최고기록 placeholder(세션 최고) 갱신.
    this.scoreText.setText(`${this.score}`);
    if (this.score > this.prevScoreForHud) {
      this.flashGain(this.score - this.prevScoreForHud);
    }
    this.prevScoreForHud = this.score;
    this.bestScore = Math.max(this.bestScore, this.score);
    this.bestText.setText(`${this.bestScore}`);

    this.tierText.setText(`${this.activeTier}`);

    // React HUD 브리지 — 점수·레벨이 바뀐 프레임만 발행.
    if (
      this.score !== this.prevPublishedScore ||
      this.activeTier !== this.prevPublishedLevel
    ) {
      this.publishScore(this.score, this.activeTier);
      this.prevPublishedScore = this.score;
      this.prevPublishedLevel = this.activeTier;
    }

    // 디버그 readout 도 패널(onDebug)로만 보임 — 숨김 상태에선 bodies 카운트·setText 를 건너뛴다.
    if (this.infoText.visible) {
      const bodies = (
        this.matter.world.localWorld as unknown as { bodies: Body[] }
      ).bodies.length;
      this.infoText.setText(
        `tier ${this.activeTier} · bodies ${bodies} · gauge ${this.descentGauge.toFixed(0)} · next ${CHAIN[this.nextIndex].name}`,
      );
    }
  }

  /** 점수 증가분 "+N" 을 점수 pill 우상단에서 팝→페이드(단일 텍스트 재사용, 캐스케이드 스팸 방지). */
  private flashGain(amount: number) {
    this.gainText.setText(`+${amount}`);
    this.gainTween?.stop();
    this.gainText.setAlpha(1).setScale(1);
    this.gainTween = this.tweens.add({
      targets: this.gainText,
      scale: { from: 1.3, to: 1 },
      alpha: { from: 1, to: 0 },
      duration: 700,
      ease: "Cubic.easeOut",
    });
  }
}

export { OPEN_FLOOR_EVENT, RESET_EVENT, VIEW_W, VIEW_H };
