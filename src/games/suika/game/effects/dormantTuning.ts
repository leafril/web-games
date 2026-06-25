/**
 * 얼음 깨짐(shatter) 파티클 튜닝 — dev 슬라이더(page.tsx)가 런타임에 mutate 한다.
 * 수동 파티클이라(emitter 아님) 매 깨짐마다 값을 읽어 즉시 반영(재생성 불필요).
 * phaser 비의존(순수 데이터)이라 page 가 정적 import 해도 안전.
 *
 * - count: 조각 수
 * - scaleMin/scaleMax: 조각 크기 배율 범위
 * - distance: baseSize(얼음 크기) 대비 분사 속도 배율
 * - gravity: 중력 가속(px/s²) — 조각이 포물선 그리며 떨어진다
 * - duration: 조각 수명(ms)
 * - volume: shatter 소리 볼륨
 * - colorIndex: SHARD_COLORS 팔레트 인덱스(조각 색). 0 = 원본 흰 얼음.
 */
/** 얼음 조각 추천 색 팔레트 — dev 슬라이더(SHATTER colorIndex)로 선택. 흰 베이스에 tint 로 적용.
 *  0 원본 흰얼음 → 갈수록 채도↑(옅은 배경에서 가시성↑). */
export const SHARD_COLORS = [
  0xd5f3ff, // 0 원본 흰 얼음
  0x9fe4ff, // 1 밝은 시안
  0x6cc6ef, // 2 스카이 시안
  0x4cc2ff, // 3 게임 블루
  0x2f86d6, // 4 딥 블루
];
/** 휴면 얼음 오버레이 튜닝 — dev 슬라이더가 런타임 mutate. scale = 과일 대비 얼음 크기 배율,
 *  alpha = 오버레이 불투명도(낮을수록 안 과일이 잘 비침). */
export const ICE_TUNING = {
  scale: 1.14,
  alpha: 0.7,
};

export const SHATTER_TUNING = {
  count: 20,
  scaleMin: 0.3,
  scaleMax: 1.2,
  distance: 1.5,
  gravity: 1200,
  duration: 600,
  volume: 0.5,
  colorIndex: 0,
};
