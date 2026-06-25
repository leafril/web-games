import type { Word } from "./word";
import type { EncounteredWord } from "./gameTypes";

/** 만난 블록을 id 로 dedupe·count++ 누적. 첫 만남 순서는 Map 삽입 순서로 보존. */
export const recordEncounter = (
  encounters: Map<number, EncounteredWord>,
  word: Word,
): void => {
  const existing = encounters.get(word.id);
  if (existing) {
    existing.count += 1;
    return;
  }
  encounters.set(word.id, { ...word, count: 1 });
};

/** 결과(GameResult.encounteredWords)용. 첫 만남 순서 보존. */
export const toEncounteredWords = (
  encounters: Map<number, EncounteredWord>,
): EncounteredWord[] => Array.from(encounters.values());
