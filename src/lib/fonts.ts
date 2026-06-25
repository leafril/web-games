import { Jua } from "next/font/google";

/**
 * 게임 HUD·오버레이 공용 디스플레이 폰트. 무료 Google Font(Jua) — 둥글고 굵은
 * 톤이 캐주얼 게임에 맞는다. Phaser canvas 와 React DOM 이 같은 family 문자열을
 * 이 모듈에서 import 해 쓴다.
 */
export const gameHeadingFont = Jua({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-game-heading",
});

/** Phaser TextStyle.fontFamily · CSS 토큰이 공통으로 쓰는 폰트 우선순위 문자열. */
export const GAME_HEADING_FONT_FAMILY = `${gameHeadingFont.style.fontFamily}, "Apple SD Gothic Neo", sans-serif`;
