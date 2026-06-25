/**
 * 과일 진화 체인 — 게임 내장 정적 데이터(단일 출처). 머지 순서대로 obj_01…obj_11.
 * - name : 충돌 라벨 + 진화 체인 인덱스 키
 * - r    : 반경(물리·렌더 크기)
 * - en   : 매달림·콜아웃에 노출하는 표시 단어(기본값 — words 주입 시 대체)
 * - juice: 머지 파편 색
 */
export const CHAIN = [
  { name: "obj_01", r: 20, en: "Ice", juice: 0xbfe3ff },
  { name: "obj_02", r: 26, en: "Blueberry", juice: 0x6b6bd9 },
  { name: "obj_03", r: 33, en: "Kiwi", juice: 0x9acd5a },
  { name: "obj_04", r: 40, en: "Strawberry", juice: 0xff4d6a },
  { name: "obj_05", r: 48, en: "Peach", juice: 0xffb37a },
  { name: "obj_06", r: 57, en: "Apple", juice: 0xe23b3b },
  { name: "obj_07", r: 67, en: "Orange", juice: 0xffa733 },
  { name: "obj_08", r: 78, en: "Coconut", juice: 0x9c6644 },
  { name: "obj_09", r: 90, en: "Melon", juice: 0x8fd96b },
  { name: "obj_10", r: 104, en: "Watermelon", juice: 0xff5a6a },
  { name: "obj_11", r: 120, en: "Pineapple", juice: 0xffd633 },
] as const;

/** 체인 name → 인덱스. 충돌 라벨로 과일 단계를 역참조한다. */
export const INDEX_BY_NAME = new Map<string, number>(
  CHAIN.map((f, i) => [f.name, i]),
);
