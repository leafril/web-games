/**
 * 색 토큰 단일 출처 — neutral(외곽선·텍스트·그림자) / surface(면) / semantic(상태·액센트) 3계층.
 * DOM(HUD)은 hex 문자열을 그대로, Phaser(Card·Scene)는 toInt() 로 0x 숫자로 쓴다.
 *
 * 레퍼런스 토큰 기준: 외곽선·모든 텍스트를 Outline-Primary(#b7854d) 하나로 통일, 액센트·상태는
 * semantic 1토큰씩, 그림자는 부드러운 모래색.
 */

/** 외곽선·텍스트·그림자 — 골든 브라운 계열. */
export const NEUTRAL = {
  outline: "#b7854d", // Outline-Primary = Text-Primary (보더·프레임·키라인·모든 숫자/?/텍스트)
  outlineSoft: "#d4b18a", // Outline-Secondary (카드 안쪽 매트 라인)
  shadow: "#dcc8a7", // 부드러운 모래 그림자
  ink: "#4a3a20", // 짙은 골든 브라운(outline 과 같은 색조, 명도만 낮춤) — 텍스트 외곽선
} as const;

/** 면 — 아이보리 패널·게이지 트랙. */
export const SURFACE = {
  panel: "#fff8ee", // Card BG (카드·pill 면 위)
  panelInner: "#f8f3eb", // Card Inner (pill 그라데이션 아래)
  well: "#e2c992", // Gauge Empty (게이지 빈 트랙)
  gloss: "rgba(255,255,255,0.92)", // pill 안쪽 글로시 림
} as const;

/** 상태·액센트 — 의미를 가진 비비드 색. */
export const SEMANTIC = {
  primary: "#5fd3ec", // Accent-Cool / Gauge Fill — 맑은 투명 바다색(배경 하늘 톤)
  primaryLight: "#82e1f4",
  primaryDeep: "#3bb2cb",
  accent: "#ffb84c", // Accent-Warm / Button Fill (일시정지·콤보)
  accentLight: "#ffd37a", // Button Highlight
  success: "#7cd66d", // 정답·성공 배너
  danger: "#ff7a6a", // 오답·폭탄 게이지·임박
  dangerDeep: "#e23b2e", // 실패 배너 — 성공(시안)과 명도 대비를 벌린 진빨강
  bombFace: "#7ed0e8", // 폭탄 카드 면 — 아이스 밤 아이콘에 맞춘 아이스 블루
  milestoneGold: "#f3e34e", // 10콤보+ 숫자 채움 · 보너스 배너 — 밝은 레몬 골드
} as const;

/** "#rrggbb" → 0xrrggbb (Phaser fillStyle/lineStyle 용). */
export const toInt = (hex: string): number => parseInt(hex.slice(1), 16);
