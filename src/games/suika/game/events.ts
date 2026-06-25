/**
 * React HUD ↔ Phaser Scene 사이 window 이벤트 이름. phaser 비의존 모듈이라
 * SSR 경로(GameContainer)와 씬 양쪽이 같은 출처를 안전하게 공유한다.
 *
 * GameContainer 가 이 상수를 GameScene 에서 값으로 import 하면 GameScene → `phaser` 가
 * 서버(SSR)에서 eager-load 되어 `window is not defined` 로 깨진다. 그래서 phaser 를
 * 안 끌어오는 이 파일로 분리한다.
 */

/** React → 씬. 능력(얼음 깨기/하강) 발사 — 능력 카운트 1 소모. */
export const FIRE_DESCENT_EVENT = "drop-next:fire-descent";
