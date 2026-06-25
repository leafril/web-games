import type { MergeObject } from "../types";
import { FRUIT_OVERRIDES } from "../assets/fruitOverrides";
import { CHAIN } from "./chain";

/**
 * 로컬 얼음 기준 기본 객체 풀 — config.objects 미주입 시 fallback. 서버 연결 없이도 얼음 테마로 동작한다.
 * - label    : CHAIN 내장 표시 라벨
 * - imageUrl : 로컬 얼음 오버라이드(obj_01 은 오버라이드가 없어 undefined → 게임이 얼음 블록으로 렌더)
 * - audioUrl : 없음(무음) — BE 연결 시 objects 로 주입하면 발음이 울린다
 */
export const LOCAL_OBJECTS: MergeObject[] = CHAIN.map((f) => ({
  name: f.name,
  label: f.en,
  imageUrl: FRUIT_OVERRIDES[f.name],
}));
