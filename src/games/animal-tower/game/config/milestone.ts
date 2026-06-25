/**
 * 5m 마일스톤 돌파 판정 — 순수 로직 (Phaser·에셋 의존 0). 단독 단위 테스트 대상.
 *
 * tower-battle 은 무한 등반·승리 없음(NuviLabs/kids-fooding#106)이라, 높이가
 * MILESTONE_INTERVAL_M 배수를 넘을 때마다 축하 + (후속) 걸침 앵커를 띄운다.
 * 높이는 단조 증가(peakY = min)지만, 큰 블록 한 수로 여러 구간을 한 번에 점프할
 * 수 있으므로 "직전 마일스톤 대비 새로 돌파한 구간 전부"를 계산해야 한다.
 */

/** 마일스톤 간격 (m). */
export const MILESTONE_INTERVAL_M = 5;

/** heightM 까지 돌파한 최고 마일스톤 (m). 0 = 아직 첫 5m 미돌파. */
export const reachedMilestone = (heightM: number): number =>
  Math.floor(heightM / MILESTONE_INTERVAL_M) * MILESTONE_INTERVAL_M;

/**
 * 직전 최고 마일스톤(prevMilestone, m) 대비 heightM 에서 새로 돌파한 마일스톤들을
 * 오름차순으로 반환한다. 한 번에 여러 구간을 점프해도(예: 4.8 → 10.2) 모든 구간을
 * 중복·누락 없이 반환한다. 새로 돌파한 게 없으면 빈 배열.
 *
 * prevMilestone 은 항상 MILESTONE_INTERVAL_M 의 배수(초기 0)여야 한다.
 */
export const crossedMilestones = (
  prevMilestone: number,
  heightM: number,
): number[] => {
  const reached = reachedMilestone(heightM);
  const crossed: number[] = [];
  for (
    let m = prevMilestone + MILESTONE_INTERVAL_M;
    m <= reached;
    m += MILESTONE_INTERVAL_M
  ) {
    crossed.push(m);
  }
  return crossed;
};
