/**
 * 세로 분할·게이지 밴드 치수 — GameShell(박스·캔버스 크기 계산)과 WireframeScene(보드·그리드·
 * 게이지 배치)이 공유한다. 월드 폭은 720 고정, 높이는 화면 비율에 맞춰 가변(worldH)이라 보드가
 * 세로를 꽉 채운다. 상단 아이시 HUD 영역은 worldH 의 고정 비율(SCENE_FRAC)이라 HUD 요소(% 배치)가
 * 화면 비율과 무관하게 항상 보드 위 아이시 영역에 머문다.
 */

/** 상단 아이시 HUD 영역이 차지하는 세로 비율(= 기존 420/1280). 보드는 이 아래부터 바닥까지. */
export const SCENE_FRAC = 420 / 1280;

/** 카드 그리드 하단 시간 게이지 밴드 치수. */
// worldH 비례라 화면 크기와 무관하게 일정하다. DOM 타이머 밴드(GameShell)와 씬 게이지 밴드
// (카드 하단 경계)가 이 값을 함께 따른다.
export const GAUGE_H_FRAC = 0.04;
export const GAUGE_GAP = 32; // 카드 마지막 줄과 게이지 사이 간격(디자인 px)
// 게이지 아래 보드 여백 = 점수 HUD 위 여백과 동일(HUD_LAYOUT.score.top "7.15%"). worldH 비례라
// 화면 크기와 무관하게 상단·하단 여백이 같다.
export const GAUGE_BOTTOM_FRAC = 0.0915;
