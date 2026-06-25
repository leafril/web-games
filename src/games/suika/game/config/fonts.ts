/**
 * 게임 폰트 family — 호스트가 주입한다(self-contained: 게임 코어는 폰트 로딩을 소유하지 않음).
 *
 * 모노레포에서는 어댑터가 부팅 시 `setGameFont(GAME_HEADING_FONT_FAMILY)` 로 next/font family 를
 * 넣고, 별도 레포로 분리하면 그쪽 폰트 family 를 주입한다. 주입 전엔 시스템 sans-serif fallback.
 *
 * createStrokedText·comboPop·wordCallout 등 Phaser Text 가 `getGameFont()` 로 읽는다.
 */
let gameFontFamily = "sans-serif";

export const setGameFont = (family: string) => {
  gameFontFamily = family;
};

export const getGameFont = () => gameFontFamily;
