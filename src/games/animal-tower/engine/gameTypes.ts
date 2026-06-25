import type { Word } from "./word";

/** 한 판에서 만난 블록 1개 + 누적 등장 횟수. */
export type EncounteredWord = Word & { count: number };

/** 게임 종료 결과 — 호스트가 받아 결과 화면으로 잇는다. */
export type GameResult = {
  /** ISO 8601 — 플레이 시작·종료. */
  startedAt: string;
  endedAt: string;
  /** 이번 판에 만난 블록들(집계). */
  encounteredWords: EncounteredWord[];
  /** 게임 점수(animal-tower: 도달 높이 m × 100). */
  score: number;
};
