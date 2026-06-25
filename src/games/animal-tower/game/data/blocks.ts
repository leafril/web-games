import decomp from "poly-decomp";

import type { Word } from "@/games/animal-tower/engine/word";
import {
  ANIMAL_DISPLAY_WIDTH_PX,
  ANIMAL_SHAPES,
  DEFAULT_BLOCK_DISPLAY_WIDTH_PX,
  TEXTURES,
} from "../config/assetKeys";
import type { AnimalShapeEntry, BlockDef } from "../config/assetKeys";

// Matter.js의 fromVerts는 concave polygon을 자동으로 convex 조각으로 분해해야 한다.
// poly-decomp가 globalThis.decomp로 노출돼 있으면 Matter가 자동 인식한다.
// 누락 시 외곽이 convex hull로 폴백되어 다리·꼬리 사이가 채워진다.
// buildBlocks 가 verts 를 그대로 넘기므로 이 모듈이 import 되면 decomp 가 등록된다.
(globalThis as { decomp?: unknown }).decomp = decomp;

/**
 * 운영-FE 이름 매칭은 대소문자·공백 차이에 깨지면 안 된다 (실수 흡수).
 * 비교 전에 lowercase + 모든 공백 제거로 정규화한다. PascalCase 자체가 계약이
 * 아니라 "같은 동물을 가리키는가"가 계약 — 표기 변형은 모두 같은 동물로 본다.
 * 내부 공백까지 흡수하므로 "PolarBear"·"Polar Bear"·"polar bear" 가 모두 매칭된다
 * (Snowy Owl 등 2단어 동물의 FE 키 ↔ BE nameEn 표기 차이 흡수).
 */
const normalize = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, "");

const SHAPE_BY_NAME: ReadonlyMap<string, AnimalShapeEntry> = new Map(
  Object.entries(ANIMAL_SHAPES).map(([name, shape]) => [
    normalize(name),
    shape,
  ]),
);

const DISPLAY_WIDTH_BY_NAME: ReadonlyMap<string, number> = new Map(
  Object.entries(ANIMAL_DISPLAY_WIDTH_PX).map(([name, px]) => [
    normalize(name),
    px,
  ]),
);

const buildBlockDef = (word: Word, shape: AnimalShapeEntry): BlockDef => ({
  id: word.id,
  key: `${TEXTURES.blockPrefix}${word.id}`,
  imageUrl: word.imageUrl,
  audioUrl: word.audioUrl,
  animalName: word.nameEn,
  nameKo: word.nameKo,
  shape: {
    type: "fromVerts",
    verts: shape.verts,
    flagInternal: shape.flagInternal,
  },
  displayWidth:
    DISPLAY_WIDTH_BY_NAME.get(normalize(word.nameEn)) ??
    DEFAULT_BLOCK_DISPLAY_WIDTH_PX,
  aspectRatio: shape._meta.rawHeight / shape._meta.rawWidth,
});

/**
 * BE 단어 풀을 tower-battle 블록 정의로 변환한다.
 *
 * hitbox(ANIMAL_SHAPES)는 FE 가 28 동물에 대해 고정 보유 — 매칭은 정규화
 * (lowercase + 공백 제거) 된 영문 이름으로 한다. 그래도 못 찾은 단어는 충돌박스가
 * 없어 게임이 깨지므로 제외하되, **조용히 버리지 않고 console.warn** 으로
 * 시끄럽게 남겨 QA·운영이 백필 단계에서 바로 발견하게 한다 (오타까지 자동
 * 교정하지는 않음 — 엉뚱한 동물 노출 위험).
 */
export const buildBlocks = (words: readonly Word[]): BlockDef[] =>
  words.flatMap((word) => {
    const shape = SHAPE_BY_NAME.get(normalize(word.nameEn));
    if (!shape) {
      console.warn(
        `[tower-battle] 단어 "${word.nameEn}" (id=${word.id}) 에 매칭되는 동물 shape 가 없어 블록에서 제외됩니다. 운영이 등록한 영문 이름이 ANIMAL_SHAPES 동물명과 같은지(대소문자·공백 무관) 백필을 확인하세요.`,
      );
      return [];
    }
    return [buildBlockDef(word, shape)];
  });
