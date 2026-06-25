import type { Word } from "@/games/animal-tower/engine/word";

/** createGame → PreloadScene → GameScene 로 전달되는 초기 데이터. */
export type GameSceneInitData = {
  /** BE 단어 풀 (page.tsx 가 playWordsQueryOptions 응답을 그대로 전달). */
  assets: Word[];
};
