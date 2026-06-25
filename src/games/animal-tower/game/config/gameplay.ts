import { PORTRAIT_GAME_HEIGHT } from "@/games/animal-tower/engine/dimensions";
import { PLATFORM } from "./assetKeys";

/** Phase 1 임시 환산. 게임 월드 픽셀을 m 단위로 표시할 때 쓰는 비율.
 * 이전 100 → 100/1.5 로 낮춰 같은 탑 높이 픽셀이 1.5배 큰 m 값으로 표시되도록 한다.
 * 배경 레이어 높이(m→px) 산정에도 쓰여 export. */
export const PX_PER_METER = 100 / 1.5;

/** 좌대를 화면 하단에서 띄우는 거리. 좌대 아래에 회전·변경 버튼 공간 확보. GameScene·HudScene 공유. */
export const PLATFORM_BOTTOM_MARGIN_PX = 264;

/** 좌대 윗면 y 좌표(=탑 높이 측정 기준선). 좌대 자체 높이는 탑 높이에 포함하지 않음. */
const PLATFORM_TOP_Y =
  PORTRAIT_GAME_HEIGHT - PLATFORM_BOTTOM_MARGIN_PX - PLATFORM.height;

/** 매 라운드(매달림 1회) 동안 매달린 동물을 다른 종류로 바꿀 수 있는 최대 횟수. */
export const SWAPS_PER_ROUND = 3;

/**
 * peakY (탑 최고점의 y 좌표 — 작을수록 위) → 미터 단위 높이.
 * HUD 표시 ("Height: 2.3m") + GameResult.score 계산 단일 출처.
 */
export const heightInMetersFromPeakY = (peakY: number): number =>
  Math.max(0, (PLATFORM_TOP_Y - peakY) / PX_PER_METER);

/**
 * 미터 단위 높이 → 월드 y 좌표 (heightInMetersFromPeakY 의 역).
 * "특정 높이의 월드 위치"가 필요할 때 사용 (배경 높이 눈금선 등). m=0 은 좌대 윗면.
 */
export const worldYAtMeters = (meters: number): number =>
  PLATFORM_TOP_Y - meters * PX_PER_METER;
