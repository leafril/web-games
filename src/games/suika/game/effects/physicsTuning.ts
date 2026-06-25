/**
 * 과일 물리 손맛 튜닝 — dev 슬라이더(page.tsx)가 런타임에 mutate. spawnFruit 가 생성 시 읽으므로
 * **새로 떨군 과일에 반영**(기존 더미는 리셋 시). phaser 비의존(순수 데이터).
 *
 * - restitution: 반발계수(닿을 때 튀는 정도). 0=안 튐, 0.85+=탱탱볼(단 더미가 잘 안 가라앉음).
 */
export const PHYSICS_TUNING = {
  restitution: 0.3,
};
