/**
 * 타이포그래피 단일 출처 — 글꼴(실체는 OneMobilePop 하나)과 텍스트 프리셋(솔리드·외곽선형).
 * 색 정의는 tokens.ts, 폰트 family 는 lib/fonts 가 출처. 이 파일은 그 둘을 묶어 프리셋으로 낸다.
 *
 * 같은 폰트를 DOM·Phaser 두 형태로 가리킨다 — Phaser 캔버스는 CSS 변수를 못 읽어 raw 문자열이 필요하다.
 * 텍스트는 두 가지로만 표현하고 각각 한 디자인으로 통일한다: 면으로 읽는 솔리드형(점수·카드·배너,
 * 브라운 단일 채움), 게이지/배경 위에서 또렷해야 하는 외곽선형(타이머·콤보·Resume·TIME UP,
 * 흰 채움 + 프레임 외곽선과 같은 Outline-Primary(골든 브라운) bold 윤곽).
 */

import type { CSSProperties } from "react";

import { GAME_HEADING_FONT_FAMILY } from "@/lib/fonts";
import { NEUTRAL, SURFACE } from "./tokens";

/** 글꼴 — DOM 은 CSS 변수, Phaser 는 raw family(동일 OneMobilePop). */
export const FONT = {
  display: "var(--font-display)", // DOM(HUD)
  displayRaw: GAME_HEADING_FONT_FAMILY, // Phaser TextStyle
} as const;

/** 외곽선형 윤곽 두께(em) — 단일 외곽선 스타일의 고정값(bold). */
const OUTLINE_W = "0.1em";

/** DOM 텍스트 공통 베이스 — display 폰트 + heavy weight. 색·외곽선은 프리셋이 얹는다. */
const DOM_BASE: CSSProperties = {
  fontFamily: FONT.display,
  fontWeight: 900,
  letterSpacing: "-0.01em",
};

/** 솔리드형(DOM) — 채움색만(외곽선 없음). */
export const textSolid = (color: string): CSSProperties => ({
  ...DOM_BASE,
  color,
});

/**
 * 외곽선형(DOM) — 흰 채움 + 짙은 ink 윤곽(버블과 같은 텍스트 외곽선 색). 받침(게이지·pill) 위
 * 흰 글자를 또렷하게. paintOrder 로 윤곽을 글자 뒤에 깐다. 색·두께가 고정이라 인자를 받지 않는다.
 */
export const textOutline = (): CSSProperties => ({
  ...DOM_BASE,
  WebkitTextFillColor: "#ffffff",
  WebkitTextStroke: `${OUTLINE_W} ${NEUTRAL.ink}`,
  paintOrder: "stroke fill",
});

/** 익스트루드 오프셋(em) — 아래로 0.03em 씩 6겹. DOM(text-shadow)·Phaser(레이어 offset) 공용. */
export const EXTRUDE_OFFSETS = [0.03, 0.06, 0.09, 0.12, 0.15, 0.18];

/**
 * 버블형(DOM) — 크림 채움(카드 면) + 보더·익스트루드(선·돌출 색). 콤보·승패 배너·TIME UP 공용
 * chunky 스타일. strokeEm 으로 보더 두께를, lineColor 로 보더·익스트루드 색을 조절한다.
 * 기본은 짙은 ink — 배경(시안 바다·모래)이 뭐든 명도 대비로 글자를 떼어낸다.
 */
export const textBubble = (
  strokeEm = "0.16em",
  lineColor: string = NEUTRAL.ink,
): CSSProperties => ({
  ...DOM_BASE,
  color: SURFACE.panel,
  WebkitTextStroke: `${strokeEm} ${lineColor}`,
  paintOrder: "stroke fill",
  textShadow: EXTRUDE_OFFSETS.map(
    (offset) => `0 ${offset}em 0 ${lineColor}`,
  ).join(", "),
});

/** Phaser 캔버스 첫 렌더 전 display 폰트 로드(best-effort, 실패해도 fallback 진행). */
export const loadDisplayFont = () =>
  document.fonts.load(`900 48px ${FONT.displayRaw}`);

/** Phaser add.text() 의 style — TextStyle 에 구조적으로 대입 가능. */
type PhaserTextStyle = {
  fontFamily: string;
  fontSize: string;
  color: string;
  resolution: number;
};

/** 솔리드형(Phaser) — 캔버스 텍스트는 전부 솔리드. heavy 디스플레이 폰트라 합성 bold 는 안 쓴다. */
export const phaserSolid = (
  fontSize: string,
  color: string,
  dpr: number,
): PhaserTextStyle => ({
  fontFamily: FONT.displayRaw,
  fontSize,
  color,
  resolution: dpr,
});

/** Phaser 버블 맨 위 레이어 — 채움(기본 크림 카드 면) + 짙은 ink 보더(밝은 배경서 글자를 분리, 0.08 비율). */
export const phaserBubbleTop = (
  fontSize: string,
  dpr: number,
  color: string = SURFACE.panel,
): PhaserTextStyle & { stroke: string; strokeThickness: number } => ({
  fontFamily: FONT.displayRaw,
  fontSize,
  color,
  stroke: NEUTRAL.ink,
  strokeThickness: Math.round(parseInt(fontSize, 10) * 0.08),
  resolution: dpr,
});

/** Phaser 익스트루드 레이어 — 짙은 ink 채움만. 맨 위 레이어 아래로 여러 겹 겹쳐 입체 두께를 만든다. */
export const phaserBubbleLayer = (
  fontSize: string,
  dpr: number,
): PhaserTextStyle => phaserSolid(fontSize, NEUTRAL.ink, dpr);
