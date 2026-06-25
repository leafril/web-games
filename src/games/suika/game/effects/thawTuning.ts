/**
 * 동종 연쇄 해동(thawCluster) 튜닝 — dev 패널(page.tsx)이 런타임에 mutate 한다. thawCluster 가
 * 점화마다 현재 값을 읽으므로 **리셋 없이 즉시 반영**(다음 연쇄부터). phaser 비의존(순수 데이터)
 * 이라 page 가 정적 import 해도 게임 번들을 끌어오지 않는다.
 *
 * - stepMs: ring(점화점 기준 전파 거리)별 해동 지연[ms]. 깨짐이 바깥으로 번지는 속도 —
 *   클수록 천천히 좌르륵, 작을수록 거의 동시에 펑.
 * - contactSlop: "닿음" 판정 여유[px]. 중심거리 ≤ 두 반경합 + 이 값이면 연쇄 전파. 클수록
 *   살짝 떨어진 무리·단 사이까지 이어져 climb 이 잘 끊기지 않는다(너무 크면 반경 블라스트화).
 */
export const THAW_TUNING = {
  stepMs: 100,
  contactSlop: 6,
};
