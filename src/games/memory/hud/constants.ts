import { NEUTRAL, SURFACE } from "../tokens";

/**
 * HUD pill 공유 스타일 — 아이보리 스티커 톤(카드와 한 패밀리). 색은 tokens.ts(surface/neutral)에서.
 * 좌표는 게임-박스 기준 % 라 화면 비율이 달라도 캔버스에 고정된다(GameShell 이 박스를 letterbox).
 */
export const PILL = {
  fill: `linear-gradient(180deg, ${SURFACE.panel} 0%, ${SURFACE.panelInner} 100%)`,
  gaugeWell: SURFACE.well, // 게이지 빈 트랙
  border: `2px solid ${SURFACE.gloss}`,
  // 카드 보더 색(Outline-Primary, α0.8) 외곽 키라인 + 부드러운 모래 드롭섀도. 흰 inset 글로시는 제거.
  shadow: `0 0 0 1.5px ${NEUTRAL.outline}cc, 0 6px 14px rgba(196,166,118,0.4)`,
} as const;

/**
 * HUD 요소 레이아웃 — 게임-박스 기준 %. 정사각(일시정지)은 height 생략(aspectRatio 1:1).
 * 상단 한 줄에 최고점수(좌)·점수(중앙)·일시정지(우), 카드 그리드 바로 위 좌측에 BOOM 게이지,
 * 그 사이에 콤보·안내문, 하단에 게임 타이머를 둔다.
 */
export const HUD_LAYOUT = {
  score: { left: "31%", top: "5.9%", width: "38%", height: "6%" },
  // 윗변을 점수 프레임 윗변(top 5.9%)에 맞춰 내린다.
  pause: { left: "85.9%", top: "5.9%", width: "8.1%" },
  // 폭탄 게이지와 좌우 대칭(우측 미러). stat block(2줄)을 슬롯 하단 정렬해, 텍스트 밑줄을
  // 폭탄 게이지 밑줄(top 26% + height 3.4% = 29.4%)에 맞춘다 → slot 하단 29.4% = top 23.4%.
  combo: { left: "66.26%", top: "23.4%", width: "29.3%", height: "6%" },
  // 카드 그리드(상단 패널 경계 ≈ 32.8%) 바로 위. 좌변을 카드 그리드 좌측 카드 왼쪽 변
  // (PLAY_PAD 32/720 ≈ 4.44%)에 맞춘다. 가로 막대 + 좌측 오버랩 폭탄 아이콘.
  boom: { left: "4.44%", top: "26%", width: "29.3%", height: "3.4%" },
  // 카드 그리드(블루 보드) 하단 안쪽 시간 게이지 밴드 — 씬의 GAUGE_TOP(1222/1280)·GAUGE_H(40/1280)
  // 와 같은 좌표. 보드가 [카드] + [이 게이지] 로만 나뉘도록 그리드 바로 아래에 붙는다.
  timer: { left: "4.44%", top: "95.47%", width: "91.11%", height: "3.13%" },
} as const;

/** 프레임 변에 절반 오버랩되는 사이드 아이콘 크기 — 컨테이너 높이 배수(트로피·폭발). */
export const SIDE_ICON_SIZE = "190cqh";
