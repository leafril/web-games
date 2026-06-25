/**
 * HUD 공유 상수 — 아이시 글래스 팔레트 + 요소 레이아웃 좌표.
 * page.tsx 에 흩어져 있던 매직넘버를 한곳으로(응집도). 좌표는 게임-박스 기준 % 라
 * 화면 비율이 달라도 캔버스에 고정된다(GameContainer 가 박스를 letterbox).
 */

/** 서리 무대(#d6e2f3·#bfe3ff)에 맞춘 글로시 아이시 글래스 — 점수·최고점수·게이지·진화바·일시정지 공유. */
export const ICY = {
  fill: "linear-gradient(180deg, #dcecfb 0%, #c2d9f3 100%)",
  strip:
    "linear-gradient(180deg, rgba(220,236,251,0.62) 0%, rgba(194,217,243,0.62) 100%)",
  gaugeWell: "#7c9ecb",
  border: "2px solid rgba(255,255,255,0.75)",
  shadow:
    "0 0 0 1.5px rgba(125,165,215,0.55), inset 0 2px 3px rgba(255,255,255,0.6), 0 3px 6px rgba(70,105,160,0.28)",
  textStroke: "#6a93cc",
} as const;

/** 흰 글자 + 부드러운 블루 외곽선(아이시 스티커 톤) — HUD 숫자 공통. */
export const ICY_TEXT = {
  color: "#ffffff",
  fontFamily: "var(--font-display)",
  fontWeight: 900,
  letterSpacing: "-0.01em",
} as const;

/**
 * HUD 요소 레이아웃 — 게임-박스 기준 %. 정사각(아이템·일시정지)은 height 생략(aspectRatio 1:1).
 * 점수·게이지 밑변(top+height)을 맞춰 한 줄로 정렬한다.
 */
export const HUD_LAYOUT = {
  score: { left: "38.5%", top: "7.15%", width: "23%", height: "5.0%" },
  best: { left: "8%", top: "8.15%", width: "22%", height: "4.0%" },
  gauge: { left: "69%", top: "8.15%", width: "25%", height: "4.0%" },
  item: { left: "81.4%", top: "14%", width: "12.6%" },
  pause: { left: "85.9%", top: "3%", width: "8.1%" },
  evolution: { left: "3%", top: "92%", width: "94%", height: "6%" },
} as const;

/**
 * 프레임 변에 절반 오버랩되는 아이콘 크기 — 컨테이너 높이 배수. 트로피(최고점수)·번개(게이지)는
 * 실루엣이 달라 따로 둔다.
 */
export const BEST_ICON_SIZE = "170cqh";
export const GAUGE_ICON_SIZE = "160cqh";
