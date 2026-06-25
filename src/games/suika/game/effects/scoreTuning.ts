/**
 * 머지 점수 튜닝 — dev 슬라이더(page.tsx)가 런타임에 mutate(즉시 반영, 리셋 불필요).
 * phaser 비의존(순수 데이터).
 *
 * 머지 1회 점수 = round(결과 단계^levelExp × 콤보 배수). 초선형(levelExp>1)이라 큰 과일이
 * 압도적으로 비싸 "키워서 정점 만들기"가 곧 고득점(ADR-0014 개정 (l)). 공중 머지도 점수는
 * 가산한다(게이지만 제외 — 점수는 하강 폭주와 무관). 정점 잭팟은 별도(#134).
 *
 * - levelExp: 단계 지수. 2 = 레벨²(obj_09=81 vs obj_02=4). 1=선형, 클수록 큰 과일 가치 급증.
 * - comboFactor: 콤보 배수 = 1 + (콤보-1) × comboFactor. 콤보 1(단발)은 ×1, 이어질수록 ↑.
 */
export const SCORE_TUNING = {
  levelExp: 2,
  comboFactor: 0.1,
};
