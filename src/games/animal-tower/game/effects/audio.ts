import type * as Phaser from "phaser";

/**
 * 효과음 어댑터 — web-games 는 "순수 탑쌓기"로 게임 SFX(등장 펑·버튼 틱·마일스톤
 * 아르페지오)를 모두 제거했다. 시그니처만 유지한 no-op 이다. BGM 은 컨테이너가 별도 재생.
 */
export const playSpawnSound = (_scene: Phaser.Scene): void => {};

export const playReleaseSound = (): void => {};

export const playRotateSound = (): void => {};

export const playChangeSound = (): void => {};

export const playMilestoneSound = (): void => {};
