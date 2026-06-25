/**
 * tower-battle 디자인 토큰 (palette + typography + radius + shadow)
 *
 * 합의 캔버스: docs/palette-sample.html (시각화·결정 기록).
 *
 * 구조 (export 단위):
 *   1) colorScale         원자 색상 (Material 50–900). 직접 import 비추천.
 *   2) palette            CSS hex (#RRGGBB). DOM·Tailwind·SVG·CSS 사용.
 *   3) paletteHex         Phaser 0xRRGGBB 숫자. Graphics·tint·particle 사용.
 *   4) fontFamily         단일 family. DOM·Phaser 공통.
 *   5) fontSize           rem 문자열. DOM·CSS 사용.
 *   6) fontSizePx         px 숫자. Phaser canvas 사용.
 *   7) radius             px 문자열. CSS 사용.
 *   8) radiusPx           px 숫자. Phaser fillRoundedRect 사용.
 *   9) spacing            rem 문자열. DOM·CSS 사용.
 *  10) spacingPx          px 숫자. Phaser 사용.
 *  11) borderWidth        px 문자열. CSS border 사용.
 *  12) borderWidthPx      px 숫자. Phaser lineStyle 사용.
 *  13) shadow             CSS box-shadow 문자열. DOM·Tailwind 사용.
 *  14) shadowPhaser       Phaser 분해 형태 (color/alpha/offset). HudScene 사용.
 *
 * 규칙:
 *   - 컴포넌트는 colorScale 을 직접 import 하지 않는다. palette / paletteHex 경유.
 *   - 새 색·사이즈·radius·shadow 가 필요해지면 먼저 "역할" 을 정한다.
 *   - 사용처가 없는 토큰은 정의하지 않는다 (선예약 금지).
 *
 * Phaser 토큰 스케일 (fontSizePx·radiusPx·spacingPx·borderWidthPx·shadowPhaser):
 *   디자인 좌표 720×1280 마이그레이션과 함께 ×1.20 으로 스케일됨. DOM 측 토큰
 *   (fontSize·radius·spacing 등) 은 rem 기반이라 ViewportScaler 가 캔버스 비례를
 *   별도로 처리하므로 base 값 유지. 따라서 같은 키라도 DOM 과 Phaser 의 px 환산값이
 *   다르다 (예: spacing[8]=16px vs spacingPx[8]=19px).
 *   - palette ↔ paletteHex 두 export 는 같은 키 구조를 유지한다.
 *
 * 명명 결정 (캔버스 합의):
 *   - color 시맨틱: bg / surface / ink / brand / accent / semantic / block / toneSet
 *   - radius: 원자 스케일만 (xs/sm/md/lg/xl/2xl/pill). 시맨틱 alias 없음.
 *   - shadow: 사용처 명시 단일 토큰 (button). chunky shadow 는 게임 한정 시그니처 X.
 *   - typography: family 단일 (primary). 스케일 명명 (sm/xl/2xl/4xl).
 *   - 폐기: bg.sky*, block.tones, effect.*, button.*, shadow-1/3, shadow-pressed/card-soft/modal,
 *           radius-game-*, font.handwriting, body/gameHeading 분리, weight 토큰
 */

// ─────────────────────────────────────────────────────────────
// 1) Color Scale (raw) — 외부 소비자는 import 하지 않는다.
// ─────────────────────────────────────────────────────────────

const brown = {
  50: "#EFEBE9",
  100: "#D7CCC8",
  200: "#BCAAA4",
  300: "#A1887F",
  400: "#8D6E63",
  500: "#795548",
  600: "#6D4C41", // ★ PLATFORM.color
  700: "#5D4037",
  800: "#4E342E",
  900: "#3E2723", // ★ HUD ink / panel / stroke
} as const;

const amber = {
  100: "#FFECB3",
  200: "#FFE082",
  300: "#FFD54F", // ★ ROTATE_BUTTON / GO 텍스트
  400: "#FFCA28",
  500: "#FFC107", // pressed
  600: "#FFB300",
  700: "#FFA000",
} as const;

const yellow = {
  100: "#FFF9C4",
  200: "#FFF59D",
  300: "#FFF176", // ★ 충돌 별 — 노랑
  400: "#FFEE58",
  500: "#FFEB3B",
} as const;

const sky = {
  100: "#E1F5FE",
  200: "#B3E5FC",
  300: "#81D4FA", // ★ SWAP_BUTTON / 충돌 별 — 하늘
  400: "#4FC3F7",
  500: "#29B6F6", // pressed
  600: "#039BE5",
} as const;

const skyBg = {
  base: "#B7D4F0", // ★ TOWER_BATTLE_BACKGROUND_FALLBACK_COLOR (인라인 const, 토큰 X)
} as const;

const orange = { 200: "#FFCC80", 300: "#FFB74D" } as const;
const pink = { 200: "#F8BBD0", 300: "#F48FB1" } as const;
const green = {
  200: "#C5E1A5",
  300: "#AED581",
  400: "#9CCC65",
  500: "#8BC34A",
} as const;
const purple = { 200: "#E1BEE7", 300: "#CE93D8" } as const;
const red = { 300: "#E57373", 500: "#F44336", 700: "#D32F2F" } as const;

/** 받침대 흙(earth) 톤 — 잔디 받침 아래 흙 몸통·점. */
const earth = {
  soil: "#9C5E2E", // 흙 몸통
  shade: "#74441C", // 흙 점 / 바닥 음영
} as const;

const neutral = {
  white: "#FFFFFF",
  cream: "#FFF8E1",
  black: "#000000",
} as const;

export const colorScale = {
  brown,
  amber,
  yellow,
  sky,
  skyBg,
  orange,
  pink,
  green,
  purple,
  red,
  earth,
  neutral,
} as const;

// ─────────────────────────────────────────────────────────────
// 2) Color tokens (CSS hex strings) — DOM / Tailwind / SVG / inline style
// ─────────────────────────────────────────────────────────────

export const palette = {
  /** 화면·캔버스 배경. sky 폴백은 토큰화하지 않고 인라인 const 로 유지. */
  bg: {
    overlayDim: "rgba(0, 0, 0, 0.5)", // ★ countdown overlay
  },

  /** 카드·패널·모달 표면 */
  surface: {
    base: neutral.white,
    cream: neutral.cream,
    panelDark: brown[900],
    border: brown[900], // ★ HUD 패널 외곽선
  },

  /** 텍스트 색 */
  ink: {
    primary: brown[900],
    secondary: brown[700],
    muted: brown[500],
    inverse: neutral.white,
    onAccent: brown[900], // 노랑·하늘 버튼 위 텍스트
    stroke: brown[900], // 텍스트 외곽선
  },

  /** 브랜드 — 게임 정체성 */
  brand: {
    primary: brown[900],
    secondary: brown[600],
  },

  /** 강조 — 주요 액션 버튼·하이라이트 */
  accent: {
    yellow: amber[300], // 회전 / GO / featured 패널 bg
    yellowDeep: amber[500], // pressed
    sky: sky[300], // 스왑
    skyDeep: sky[500], // pressed
  },

  /** 시맨틱 — 상태 전달 (사용처는 미정, 미래 결과화면·경고 대비) */
  semantic: {
    success: green[500],
    successSoft: green[300],
    danger: red[500],
    dangerDeep: red[700],
    warning: orange[300],
    info: sky[400],
  },

  /** 게임 오브젝트 — 좌대 (동물 블록은 SVG 그림이라 색 토큰 없음) */
  block: {
    platform: green[400], // 잔디 (단색)
    platformBase: green[500], // 잔디 받침 아랫면 (legacy — assetKeys PLATFORM.colorBase)
    soil: earth.soil, // 흙 몸통
    soilShade: earth.shade, // 흙 점
  },

  /**
   * 게임 공용 파스텔 6톤. 별 burst·confetti·축하 파티클·결과화면 별·라운드
   * 클리어 flash 등 긍정 피드백 시각화 어디서든 import. 인덱스로 순환.
   */
  toneSet: {
    pastel6: [
      yellow[300], // 노랑
      orange[300], // 주황
      pink[300], // 분홍
      sky[300], // 하늘
      green[300], // 연두
      purple[300], // 연보라
    ],
  },
} as const;

// ─────────────────────────────────────────────────────────────
// 3) Color tokens (Phaser 0xRRGGBB 숫자) — palette 과 동일 키 구조.
//    alpha 가 있는 토큰(bg.overlayDim) 은 Phaser 에서 (color, alpha) 두 인자로
//    분해해 쓰므로 본 export 에서 제외. 사용처에서 0x000000 + 0.5 인라인.
// ─────────────────────────────────────────────────────────────

const toHex = (s: string): number => Number.parseInt(s.replace("#", ""), 16);

export const paletteHex = {
  surface: {
    base: toHex(neutral.white),
    cream: toHex(neutral.cream),
    panelDark: toHex(brown[900]),
    border: toHex(brown[900]),
  },
  ink: {
    primary: toHex(brown[900]),
    secondary: toHex(brown[700]),
    muted: toHex(brown[500]),
    inverse: toHex(neutral.white),
    onAccent: toHex(brown[900]),
    stroke: toHex(brown[900]),
  },
  brand: {
    primary: toHex(brown[900]),
    secondary: toHex(brown[600]),
  },
  accent: {
    yellow: toHex(amber[300]),
    yellowDeep: toHex(amber[500]),
    sky: toHex(sky[300]),
    skyDeep: toHex(sky[500]),
  },
  semantic: {
    success: toHex(green[500]),
    successSoft: toHex(green[300]),
    danger: toHex(red[500]),
    dangerDeep: toHex(red[700]),
    warning: toHex(orange[300]),
    info: toHex(sky[400]),
  },
  block: {
    platform: toHex(green[400]),
    platformBase: toHex(green[500]),
    soil: toHex(earth.soil),
    soilShade: toHex(earth.shade),
  },
  toneSet: {
    pastel6: [
      toHex(yellow[300]),
      toHex(orange[300]),
      toHex(pink[300]),
      toHex(sky[300]),
      toHex(green[300]),
      toHex(purple[300]),
    ],
  },
} as const;

// ─────────────────────────────────────────────────────────────
// 4) Typography — atomic 분리 (family + size). weight 토큰 없음.
//    DOM 은 fontSize (rem), Phaser 는 fontSizePx (px) 사용.
// ─────────────────────────────────────────────────────────────

/** 게임 폰트 스택. body·heading 모두 동일 family. DOM·Phaser 공통. */
export const fontFamily = {
  primary: '"One Mobile Pop", "Pretendard", sans-serif',
} as const;

/** 사이즈 스케일 (DOM — rem). 사용 중인 단계만 정의. */
export const fontSize = {
  sm: "0.875rem", //  14px — 본문·캡션
  xl: "1.75rem", //  28px ★ HUD (HUD_FONT_SIZE_PX)
  "2xl": "2rem", //  32px ★ 액션 버튼 (ACTION_BUTTON_FONT_SIZE_PX)
  "4xl": "6rem", //  96px ★ 카운트다운 (COUNTDOWN_FONT_SIZE_PX)
} as const;

/** 사이즈 스케일 (Phaser — px 숫자). 캔버스 720×1280 기준으로 base ×1.20. */
export const fontSizePx = {
  sm: 17,
  xl: 34,
  "2xl": 38,
  "4xl": 115,
} as const;

// ─────────────────────────────────────────────────────────────
// 5) Radius — 원자 스케일만. 시맨틱 alias 없음.
//    DOM 은 radius (px 문자열), Phaser 는 radiusPx (px 숫자) 사용.
//    css-units.md 룰: radius 는 px.
// ─────────────────────────────────────────────────────────────

/** 둥글기 스케일 (DOM — px 문자열). */
export const radius = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px", // ★ PANEL_RADIUS_PX (HUD 패널)
  xl: "20px", // ★ ACTION_BUTTON_RADIUS_PX (회전·스왑 버튼)
  "2xl": "24px",
  pill: "9999px",
} as const;

/** 둥글기 스케일 (Phaser — px 숫자). 캔버스 720×1280 기준으로 base ×1.20. pill 은 특수. */
export const radiusPx = {
  xs: 5,
  sm: 10,
  md: 14,
  lg: 19,
  xl: 24,
  "2xl": 29,
  pill: 9999,
} as const;

// ─────────────────────────────────────────────────────────────
// 6) Spacing — 4px base 스케일. 짝수 step 만 (홀수 5/7/9/11 미정의 — SP1 결정).
//    DOM 은 spacing (rem 문자열), Phaser 는 spacingPx (px 숫자).
// ─────────────────────────────────────────────────────────────

/** 간격 스케일 (DOM — rem 문자열). css-units.md 룰: 여백·패딩은 rem. */
export const spacing = {
  0: "0",
  1: "0.125rem", //  2px
  2: "0.25rem", //  4px
  3: "0.375rem", //  6px
  4: "0.5rem", //  8px
  6: "0.75rem", // 12px
  8: "1rem", // 16px
  10: "1.25rem", // 20px
  12: "1.5rem", // 24px
  16: "2rem", // 32px
  20: "2.5rem", // 40px
  24: "3rem", // 48px
  32: "4rem", // 64px
} as const;

/** 간격 스케일 (Phaser — px 숫자). 캔버스 720×1280 기준으로 base ×1.20. */
export const spacingPx = {
  0: 0,
  1: 2,
  2: 5,
  3: 7,
  4: 10,
  6: 14,
  8: 19,
  10: 24,
  12: 29,
  16: 38,
  20: 48,
  24: 58,
  32: 77,
} as const;

// ─────────────────────────────────────────────────────────────
// 7) Border width — 게임 UI 외곽선 두께. md(chunky) + hairline(유리 림).
//    DOM 은 borderWidth (px 문자열), Phaser 는 borderWidthPx (px 숫자).
// ─────────────────────────────────────────────────────────────

/** 외곽선 두께 (DOM — px 문자열). */
export const borderWidth = {
  md: "3px", // ★ HUD 패널 (게임 UI 표준 두께)
} as const;

/** 외곽선 두께 (Phaser — px 숫자). 캔버스 720×1280 기준으로 base ×1.20. */
export const borderWidthPx = {
  hairline: 2, // ★ liquid glass 림 (얇게 — drop DOM 1px 과 시각 일치)
  md: 4,
} as const;

// ─────────────────────────────────────────────────────────────
// 8) Shadow — 단일 토큰 (button). 사용처가 늘어나면 그때 추가.
//    DOM 은 shadow (CSS box-shadow 문자열), Phaser 는 shadowPhaser
//    (color/alpha/offsetY 분해 형태) 사용.
// ─────────────────────────────────────────────────────────────

/** CSS box-shadow 문자열. */
export const shadow = {
  button: "0 6px 0 rgba(0, 0, 0, 0.25)", // ★ 액션 버튼 — chunky black
  cardSoft: "0 4px 0 rgba(62, 39, 35, 0.08)", // ★ HUD 패널 grounding — 미묘한 brown tint
} as const;

/** Phaser용 분해 형태. offsetY 는 캔버스 720×1280 기준으로 base ×1.20. */
export const shadowPhaser = {
  button: {
    color: 0x000000,
    alpha: 0.25,
    offsetY: 7,
  },
  cardSoft: {
    color: 0x3e2723, // brown 900
    alpha: 0.08,
    offsetY: 5,
  },
} as const;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type Palette = typeof palette;
export type PaletteHex = typeof paletteHex;
export type FontFamily = typeof fontFamily;
export type FontSize = typeof fontSize;
export type FontSizePx = typeof fontSizePx;
export type Radius = typeof radius;
export type RadiusPx = typeof radiusPx;
export type Spacing = typeof spacing;
export type SpacingPx = typeof spacingPx;
export type BorderWidth = typeof borderWidth;
export type BorderWidthPx = typeof borderWidthPx;
export type Shadow = typeof shadow;
export type ShadowPhaser = typeof shadowPhaser;

// ─────────────────────────────────────────────────────────────
// 사용 예시 (이해용 — 실제 코드 아님)
// ─────────────────────────────────────────────────────────────
//
//  // Phaser
//  graphics.fillStyle(paletteHex.surface.panelDark);
//  text.setFontFamily(fontFamily.primary).setFontSize(fontSizePx.xl);
//  body.fillRoundedRect(-w / 2, -h / 2, w, h, radiusPx.xl);
//  shadow.fillStyle(shadowPhaser.button.color, shadowPhaser.button.alpha);
//  shadow.fillRoundedRect(-w / 2, -h / 2 + shadowPhaser.button.offsetY, w, h, radiusPx.xl);
//
//  // DOM (inline style)
//  <div style={{
//    background: palette.surface.panelDark,
//    color: palette.ink.inverse,
//    borderRadius: radius.lg,
//    boxShadow: shadow.button,
//    fontFamily: fontFamily.primary,
//    fontSize: fontSize.xl,
//  }} />
//
//  // 파스텔 6톤 순환 (별 burst·confetti·축하 파티클 등)
//  const toneCss = palette.toneSet.pastel6[i % palette.toneSet.pastel6.length];
//  const toneHex = paletteHex.toneSet.pastel6[i % paletteHex.toneSet.pastel6.length];
