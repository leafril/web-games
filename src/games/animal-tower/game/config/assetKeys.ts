import { paletteHex, radiusPx } from "./theme";
import Finger from "../assets/Finger.png";
import Cloud from "../assets/Cloud.png";
import Cloud2 from "../assets/Cloud2.png";
import Cloud3 from "../assets/Cloud3.png";

import AnimalShapes from "../assets/AnimalShapes.json";

export { SCENES } from "@/games/animal-tower/engine/sceneKeys";

export const TEXTURES = {
  platform: "tower-battle-platform",
  blockPrefix: "tower-battle-block_",
  idleHintFinger: "tower-battle-idle-hint-finger",
  cloud: "tower-battle-cloud",
  cloud2: "tower-battle-cloud2",
  cloud3: "tower-battle-cloud3",
  /** 배경 스크롤 레이어 — 지면+밝은 하늘. */
  bgMeadow: "tower-battle-bg-meadow",
  /** 배경 스크롤 레이어 — 성층권(밝은 하늘→짙은 남색+별). */
  bgStratosphere: "tower-battle-bg-stratosphere",
} as const;

/** 사운드 키. word.id 별 발음 오디오 키는 이 prefix + id 로 만든다. */
export const SOUNDS = {
  blockAudioPrefix: "tower-battle-audio_",
  /** 마일스톤 격려 내레이션 키 prefix. 뒤에 0-based 변주 인덱스를 붙인다. */
  milestoneCheerPrefix: "tower-battle-cheer_",
  /** 동물 등장 "펑" 효과음. */
  spawnPoof: "tower-battle-spawn-poof",
} as const;

/** 마일스톤 격려 내레이션 변주 개수 (en-US 고정 에셋). 마일스톤마다 로테이션. */
export const MILESTONE_CHEER_COUNT = 2;

/** Scene 간 공유되는 registry 키. PreloadScene 이 set, GameScene 이 get. */
export const REGISTRY = {
  /** buildBlocks 결과(BlockDef[]). 셔플된 세션 단어 풀. */
  blocks: "tower-battle-blocks",
} as const;

/** idle 안내용 손가락 raster 에셋. PreloadScene 이 load.image 로 등록한다. */
export const IDLE_HINT_FINGER = {
  image: Finger,
} as const;

/** poof(등장 연출) + 성층권(15m+) 구름 발판 공용 흰 구름 텍스처. PreloadScene 이 전부 load.image 등록. */
export const CLOUD_TEXTURES = [
  { key: TEXTURES.cloud, image: Cloud },
  { key: TEXTURES.cloud2, image: Cloud2 },
  { key: TEXTURES.cloud3, image: Cloud3 },
] as const;

/** 성층권(15m+) 구름 발판이 마일스톤마다 랜덤으로 고르는 구름 텍스처 키 목록. */
export const ANCHOR_CLOUD_KEYS = [
  TEXTURES.cloud,
  TEXTURES.cloud2,
  TEXTURES.cloud3,
] as const;

/** Matter.js fromVerts shape 옵션 형태. verts는 0~1 정규화 좌표. */
type MatterFromVertsShape = {
  type: "fromVerts";
  verts: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>>;
  flagInternal: boolean;
};

export type BlockDef = {
  /** BE 단어 PK. 결과 화면 encounteredWords 집계 키(wordId dedupe). */
  id: number;
  /** Phaser 텍스처 키 (word id 기반 — nameEn 중복·특수문자 무관하게 안정). */
  key: string;
  /** Phaser 사운드 키 (발음 오디오). */
  audioKey: string;
  /** BE 단어 풀의 이미지 URL (원격 래스터). PreloadScene 이 load.image 로 등록. */
  imageUrl: string;
  /** BE 단어 풀의 발음 오디오 URL. PreloadScene 이 load.audio 로 등록. */
  audioUrl: string;
  /** 동물 영어 이름. HUD 라벨·callout·결과 카드 표기에 사용. ANIMAL_SHAPES lookup 키. */
  animalName: string;
  /** 동물 한국어 이름. 결과 카드 표기에 사용. */
  nameKo: string;
  /** Matter.js fromVerts hitbox (verts는 0~1 정규화 좌표) */
  shape: MatterFromVertsShape;
  /** 게임 내 표시 가로 픽셀 — 세로는 aspectRatio로 자동 계산 */
  displayWidth: number;
  /** 외곽 bbox의 세로/가로 비율 (height / width) */
  aspectRatio: number;
};

export type AnimalShapeEntry = {
  type: "fromVerts";
  verts: Array<Array<{ x: number; y: number }>>;
  flagInternal: boolean;
  _meta: { rawWidth: number; rawHeight: number; vertexCount: number };
};

/**
 * 동물 영어 이름 → Matter.js 충돌 폴리곤. FE-7 이후 이미지·오디오는 BE 풀에서
 * 오지만 hitbox 는 FE 가 28 동물에 대해 고정 보유한다. BE 가 등록한 단어의
 * 영문 이름이 이 맵의 키와 일치해야 블록이 생성된다 (불일치 단어는 buildBlocks
 * 에서 제외). 운영-FE 간 이름 계약.
 */
export const ANIMAL_SHAPES: Readonly<Record<string, AnimalShapeEntry>> =
  AnimalShapes as Readonly<Record<string, AnimalShapeEntry>>;

export const DEFAULT_BLOCK_DISPLAY_WIDTH_PX = 168;

/**
 * 동물별 displayWidth (가로 픽셀). 자연 비례에 가깝게 — 코끼리·하마·코뿔소는 크고
 * 다람쥐·토끼·여우는 작게. 세로는 aspectRatio 로 자동 계산.
 *
 * 등록하지 않은 동물은 DEFAULT_BLOCK_DISPLAY_WIDTH_PX 사용.
 *
 * 튜닝 가이드:
 * - 시각 면적이 다른 동물 대비 너무 커/작아 보이면 이 값 조정.
 * - 게임 안정성에 영향: 큰 동물일수록 위에 올리기 어려움 (균형 무게중심).
 */
export const ANIMAL_DISPLAY_WIDTH_PX: Readonly<Record<string, number>> = {
  // 소형
  Squirrel: 50,
  Rabbit: 70,
  Penguin: 102,
  Owl: 108,
  Fox: 114,
  Raccoon: 120,
  Beaver: 132,
  // 중형
  Goat: 132,
  Sheep: 114,
  Deer: 114,
  Husky: 138,
  Pig: 150,
  Wolf: 144,
  Cheetah: 150,
  Leopard: 150,
  Seal: 150,
  // 대형 (default 168)
  Tiger: 198,
  Lion: 192,
  Cow: 180,
  Zebra: 168,
  Camel: 174,
  Horse: 180,
  Bear: 180,
  PolarBear: 186,
  Moose: 186,
  // 초대형
  Hippo: 198,
  Rhino: 204,
  Elephant: 234,
};

/** 좌대(받침) 시각 치수 — game world 좌하단에 배치한다. */
export const PLATFORM = {
  width: 576,
  height: 40,
  color: paletteHex.block.platform, // 윗면 (green 400)
  colorBase: paletteHex.block.platformBase, // 아랫면 (green 500, 살짝 진함)
  radius: radiusPx.lg, // step 2 에서 token 자체가 ×1.20 으로 스케일됨
  /** 윗면 톤이 차지하는 비율 (0~1). 나머지는 base 톤. */
  topRatio: 0.75,
} as const;
