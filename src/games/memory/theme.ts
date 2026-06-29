// Scene·Card 공용 팔레트(토큰 파생) + 카드 치수. 색은 tokens.ts, 폰트는 typography.ts 가 단일 출처.

import { NEUTRAL, SURFACE, SEMANTIC, toInt } from "./tokens";

// Phaser(Card·Scene)는 0x 숫자를 쓰므로 토큰을 toInt 로 변환.
export const COLOR = {
  // 카드 면·보더
  faceBg: toInt(SURFACE.panel),
  tileBorder: toInt(NEUTRAL.outline), // 바깥 라인
  tileBorderInner: toInt(NEUTRAL.outlineSoft), // 안쪽 매트 라인
  // 카드 뒷면 = 방사형 파라솔(해변 테마). 코랄·크림 줄무늬 + 브라운 림 + 골드 꼭지.
  parasolStripe: toInt(SEMANTIC.danger), // 코랄 줄
  parasolGap: toInt(SURFACE.panel), // 크림 줄
  parasolRim: toInt(NEUTRAL.outline), // 외곽 림
  parasolTip: toInt(SEMANTIC.accent), // 중심 꼭지(골드)
  // 폭탄 라운드 카드 면 — 아이스 블루(아이스 밤 아이콘에 맞춤). 앞면 폭탄 아이콘은 BOMB_ASSET 텍스처.
  bombBg: toInt(SEMANTIC.bombFace),
} as const;

export const TEXT = {
  // 모든 솔리드 텍스트(점수·카드 단어·뒷면 "?"·배너·+10s) 단일 채움색 = Text-Primary(브라운).
  // 배너는 성공/실패를 색이 아니라 문구(GREAT/MISS)로만 구분한다.
  solid: NEUTRAL.outline,
} as const;

export const TILE_RADIUS = 16;
