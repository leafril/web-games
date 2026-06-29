// memory 라운드 게임 상수. 1단계(라운드 루프 골격)에서는 단어를 플레이스홀더 텍스트로 쓴다.
// 실제 단어 이미지·발음·encounteredWords 는 학습 레이어 단계에서 교체한다.

// 이미지가 있는 과일 단어(투명 배경). 학습 레이어에서 단어·이미지 세트를 확장한다.
export const WORD_POOL = ["APPLE", "BANANA"] as const;

// 그리드: 위·아래 두 블록 × (3 × 2) = 총 12칸. (와이어프레임 레이아웃 유지)
export const GRID_COLS = 3;
export const GRID_ROWS = 2;
export const GRID_BLOCKS = 2;
export const CARD_COUNT = GRID_COLS * GRID_ROWS * GRID_BLOCKS;

// 난이도 레벨: 활성 카드 수(cards, 짝수) + 그룹(과일 종류) 수 범위(minWords~maxWords).
// 그룹 수는 범위 내 무작위, 총 카드를 그룹들에 짝수 단위로 쪼개 비율이 매번 달라진다.
// 카드 2장부터 세분화, 가속 곡선 + 암기 시간↓.
export type LevelConfig = {
  cards: number;
  minWords: number;
  maxWords: number;
};
export const LEVELS: LevelConfig[] = [
  { cards: 2, minWords: 1, maxWords: 1 },
  { cards: 4, minWords: 1, maxWords: 2 },
  { cards: 4, minWords: 2, maxWords: 2 },
  { cards: 6, minWords: 2, maxWords: 2 },
  { cards: 6, minWords: 2, maxWords: 3 },
  { cards: 8, minWords: 2, maxWords: 3 },
  { cards: 8, minWords: 3, maxWords: 4 },
  { cards: 10, minWords: 3, maxWords: 4 },
  { cards: 12, minWords: 3, maxWords: 4 },
  { cards: 12, minWords: 4, maxWords: 4 },
  { cards: 12, minWords: 4, maxWords: 4 },
  { cards: 12, minWords: 4, maxWords: 4 }, // 바닥
];

// 카드를 뒤집기 전 외우게 보여주는 시간(ms). 일반·폭탄 라운드, 모든 레벨 동일하게 고정.
export const MEMORIZE_MS = 700;

// 승급: 저~중레벨(HIGH_BAND_LEVEL 미만)은 1회, 중~고레벨은 2회 연속 성공.
export const HIGH_BAND_LEVEL = 5; // 0-based 레벨 인덱스(=LV6)부터 2회 필요
export const WINS_TO_ADVANCE_LOW = 1;
export const WINS_TO_ADVANCE_HIGH = 2;

// 실패 시 레벨 하락 폭(소프트 리셋).
export const FAIL_LEVEL_DROP = 2;

// 라운드 구성은 현재 레벨 고정이 아니라 [레벨−CONFIG_WINDOW, 레벨] 중 무작위.
export const CONFIG_WINDOW = 2;

// 튜토리얼: 2종·4장 이하 레벨(cards ≤ 4). 이 구간을 넘으면 보너스 패턴 배치가 등장.
export const TUTORIAL_LEVEL_COUNT = LEVELS.filter((l) => l.cards <= 4).length;
// 튜토리얼 이후 라운드에서 보너스 패턴이 나올 확률.
export const BONUS_PATTERN_CHANCE = 0.2;

// bomb 게이지: 정답 카드를 이만큼 맞추면 게이지가 차고 bomb 1개 적립(게이지 0부터 재충전).
export const BOOM_GAUGE_MAX = 50;
// 라운드 실패 시 bomb 게이지에서 깎는 양.
export const BOOM_GAUGE_FAIL_PENALTY = 10;
// bomb 라운드에서 첫 폭탄을 터뜨릴 때 주는 게임 시간 보너스(ms).
export const BOMB_TIME_BONUS_MS = 10000;

// 점수·콤보.
export const BASE_SCORE = 10; // 정답 카드 1장 기본 점수(× 콤보 배수)
export const COMBO_MULT_CAP = 10; // 콤보 배수 상한
export const BOMB_SCORE = 50; // 폭탄 1개 점수(플랫)

// 라운드 성공 칭찬 배너 문구 — 매번 무작위로 하나.
export const PRAISE_WORDS = [
  "GOOD!",
  "NICE!",
  "GREAT!",
  "AWESOME!",
  "AMAZING!",
] as const;

// 라운드 타이밍(ms).
export const WIN_PAUSE_MS = 500; // 성공 후 다음 라운드까지
export const FAIL_PAUSE_MS = 1000; // 실패 후 다음 라운드까지(X 표시 인지할 여유)

// 전체 게임 시간 제한(ms).
export const GAME_TIME_MS = 60000; // 60초
export const GAME_OVER_PAUSE_MS = 1800; // 게임 종료 배너 후 재시작까지
