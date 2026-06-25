/**
 * 런타임 튜닝 가능한 게임 파라미터 — 개발 중 DevTuningPanel(DOM)이 값을 바꾸고
 * GameScene/Anchor(Phaser)가 spawn 시점에 읽는다. 같은 모듈 싱글톤이라
 * 패널에서 바꾸면 다음 생성부터 즉시 반영된다.
 *
 * 여기 값이 곧 커밋 기본값 — prod 에선 패널이 안 뜨므로 이 기본값 그대로 쓰인다.
 */
export const DEV_TUNING = {
  /** 보너스 발판을 마일스톤 라인보다 이만큼 위에 띄운다(m). */
  anchorAboveMilestoneM: 1.5,
  /** 보너스 발판 표시 가로(px). 세로 두께는 고정(작지만 단단한 디딤돌). */
  anchorWidthPx: 110,
};

export type DevTuningKey = keyof typeof DEV_TUNING;

/** DevTuningPanel 이 렌더할 슬라이더 메타. key 는 DEV_TUNING 필드와 1:1. */
export const DEV_TUNING_SCHEMA: ReadonlyArray<{
  key: DevTuningKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}> = [
  {
    key: "anchorAboveMilestoneM",
    label: "발판 높이(마일스톤+)",
    min: 0,
    max: 5,
    step: 0.1,
    unit: "m",
  },
  {
    key: "anchorWidthPx",
    label: "발판 크기",
    min: 40,
    max: 260,
    step: 5,
    unit: "px",
  },
];
