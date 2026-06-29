import { CARD_COUNT, GRID_COLS, GRID_ROWS, WORD_POOL } from "./constants";

// 한 라운드: 12칸 중 일부에만 단어 카드를 둔다(나머지 빈 칸).
// placement: 활성 셀 인덱스 → 단어. wordCounts: 단어 → 장수(그룹 크기).
export type RoundData = {
  placement: Map<number, string>;
  wordCounts: Record<string, number>;
};

const randInt = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1));

const shuffle = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
  return arr;
};

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/**
 * 활성 카드 cards장(짝수)을 그룹(과일 종류)으로 나눠 배치한다. 그룹 수는 minWords~maxWords
 * 범위에서 무작위(과일 풀·쌍 수로 상한), 각 그룹 크기는 짝수(최소 2장)로 무작위 분배해
 * 매번 비율이 달라진다. 그룹 1개면 한 종류만 나오는 라운드.
 */
export const buildRound = (
  cards: number,
  minWords: number,
  maxWords: number,
): RoundData => {
  // 짝수 단위(쌍)로 다룬다 → 각 그룹 크기·총 카드가 항상 짝수.
  const totalPairs = Math.floor(Math.min(cards, CARD_COUNT) / 2);
  const maxGroups = Math.min(maxWords, WORD_POOL.length, totalPairs);
  const minGroups = Math.min(Math.max(1, minWords), maxGroups);
  const groupCount = randInt(minGroups, maxGroups);

  // 각 그룹 1쌍(2장)씩 깔고 남은 쌍을 무작위 그룹에 분배 → 짝수 크기, 비율 다양.
  const pairs = new Array<number>(groupCount).fill(1);
  for (let extra = totalPairs - groupCount; extra > 0; extra--) {
    const g = Math.floor(Math.random() * groupCount);
    pairs[g] = (pairs[g] ?? 0) + 1;
  }

  const words = shuffle([...WORD_POOL]).slice(0, groupCount);
  const cells = shuffle(range(CARD_COUNT)).slice(0, totalPairs * 2);

  const placement = new Map<number, string>();
  const wordCounts: Record<string, number> = {};
  let k = 0;
  words.forEach((word, gi) => {
    const size = (pairs[gi] ?? 0) * 2;
    wordCounts[word] = size;
    for (let j = 0; j < size; j++) {
      placement.set(cells[k] as number, word);
      k++;
    }
  });

  return { placement, wordCounts };
};

// ── 보너스 패턴 배치 ──
// 12칸을 (열, 행)으로 주소화한다. 논리 격자는 GRID_COLS 열 × (블록당 GRID_ROWS) × 블록.
const COLS = GRID_COLS;
const ROWS = CARD_COUNT / GRID_COLS; // 3열 × 4행 = 12

const cellAt = (col: number, row: number): number =>
  Math.floor(row / GRID_ROWS) * (GRID_COLS * GRID_ROWS) +
  (row % GRID_ROWS) * GRID_COLS +
  col;

const fallbackWord = (w: string | undefined): string => w ?? WORD_POOL[0];

// 세로 일렬: 각 열을 서로 다른 과일로 (열 수 = 종류 수, 열마다 ROWS장).
const patternColumns = (): RoundData => {
  const words = shuffle([...WORD_POOL]).slice(0, COLS);
  const placement = new Map<number, string>();
  const wordCounts: Record<string, number> = {};
  for (let col = 0; col < COLS; col++) {
    const word = fallbackWord(words[col]);
    wordCounts[word] = (wordCounts[word] ?? 0) + ROWS;
    for (let row = 0; row < ROWS; row++) {
      placement.set(cellAt(col, row), word);
    }
  }
  return { placement, wordCounts };
};

// 상하 분할: 위 절반 / 아래 절반을 두 과일로 (각 COLS × ROWS/2 장).
const patternTopBottom = (): RoundData => {
  const words = shuffle([...WORD_POOL]).slice(0, 2);
  const top = fallbackWord(words[0]);
  const bottom = fallbackWord(words[1]);
  const placement = new Map<number, string>();
  const wordCounts: Record<string, number> = {};
  const half = Math.floor(ROWS / 2);
  for (let row = 0; row < ROWS; row++) {
    const word = row < half ? top : bottom;
    for (let col = 0; col < COLS; col++) {
      placement.set(cellAt(col, row), word);
      wordCounts[word] = (wordCounts[word] ?? 0) + 1;
    }
  }
  return { placement, wordCounts };
};

// 가로 줄무늬: 각 행을 서로 다른 과일로 (행 수 = 종류 수, 행마다 COLS장).
// 주의: 보드가 3열이라 한 줄 = 3장(홀수) — "항상 짝수" 규칙의 예외(보너스 패턴).
const patternRows = (): RoundData => {
  const words = shuffle([...WORD_POOL]).slice(0, ROWS);
  const placement = new Map<number, string>();
  const wordCounts: Record<string, number> = {};
  for (let row = 0; row < ROWS; row++) {
    const word = fallbackWord(words[row % Math.max(words.length, 1)]);
    for (let col = 0; col < COLS; col++) {
      placement.set(cellAt(col, row), word);
      wordCounts[word] = (wordCounts[word] ?? 0) + 1;
    }
  }
  return { placement, wordCounts };
};

const BONUS_PATTERNS: Array<() => RoundData> = [
  patternColumns,
  patternTopBottom,
  patternRows,
];

/** 보너스 패턴 하나를 무작위로 골라 만든다(만판 12칸, 구조화된 배치). */
export const buildBonusRound = (): RoundData => {
  const make =
    BONUS_PATTERNS[Math.floor(Math.random() * BONUS_PATTERNS.length)] ??
    patternColumns;
  return make();
};
