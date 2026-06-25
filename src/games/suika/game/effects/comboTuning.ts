/**
 * 콤보 펄스 팝 튜닝값 — dev 패널(page.tsx)이 런타임에 mutate 한다. 바꾸면 다음 팝부터 반영.
 * phaser 비의존(순수 데이터)이라 page 가 정적 import 해도 게임 번들을 끌어오지 않는다.
 *
 * - popInMs: 0.4→1.0 등장 속도
 * - pulseMs: 맥동 한 방향 시간(작을수록 빠름)
 * - pulseRepeat: yoyo 왕복 추가 횟수(총 repeat+1 회)
 * - pulseMaxScale: 맥동 시 부풀어 오르는 최대 배율
 * - pulseJitter: 부푸는 배율의 매-팝 랜덤 변동폭(±). 0=규칙적, 클수록 들쭉날쭉
 */
export const COMBO_PULSE_TUNING = {
  popInMs: 120,
  pulseMs: 60,
  pulseRepeat: 1,
  pulseMaxScale: 1.15,
  pulseJitter: 0.03,
};
