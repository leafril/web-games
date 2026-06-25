/**
 * 물방울+꽃잎 머지 파티클 튜닝 — dev 슬라이더(page.tsx)가 런타임에 mutate 한다.
 * speed·gravity 는 emitter create 시 고정이라 변경 시 emitter 재생성이 필요하고
 * (page 가 retune 이벤트 발사 → GameScene 재생성), fadeFrom·count 류는 매 프레임/emit
 * 마다 읽혀 즉시 반영된다. phaser 비의존(순수 데이터)이라 page 가 정적 import 해도 안전.
 *
 * - dropSpeed/petalSpeed: 최대 속도(min 은 0.55배)
 * - gravity: 중력(drops 그대로, petals 0.9배) — 클수록 빨리 떨어져 범위 억제
 * - life: 최대 수명(ms) — 속도와 별개로 "얼마나 오래 날아가나" = 사실상 범위 손잡이
 * - fadeFrom: 수명 진행도 이 지점부터 fade(작을수록 일찍 사라짐)
 * - countBase/countMax: 개수 = base + level*2.2, max 까지
 * - petalRatio: 물방울 대비 꽃잎 개수 배율
 * - thickMin/thickMax: 꽃잎 두께 랜덤 배수 범위(파티클별). 폭이 넓을수록 다양, max 클수록 두꺼움
 */
export const MERGE_TUNING = {
  dropSpeed: 600,
  petalSpeed: 700,
  gravity: 1000,
  life: 800,
  fadeFrom: 0.55,
  countBase: 2,
  countMax: 15,
  petalRatio: 1.4,
  thickMin: 0.55,
  thickMax: 3,
};
