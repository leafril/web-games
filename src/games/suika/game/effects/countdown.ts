import * as Phaser from "phaser";

import { getGameFont } from "../config/fonts";

/**
 * 시작 카운트다운(3·2·1·GO!) — 화면 중앙에 screen-space(scrollFactor 0)로 띄운다. drop 은 카메라가
 * 깊이를 따라 스크롤하므로 공유 playCountdown(월드 좌표)을 그대로 못 쓴다 → 자리만 캔버스 중앙 고정,
 * 색은 4종 게임 공통 카운트다운 톤(흰 글자 + brown900 외곽선)을 같은 값으로 재현. onComplete 에서
 * 플레이를 시작한다(호출부가 첫 매달림).
 */
// 4종 게임 공통 카운트다운 색 — _shared COUNTDOWN_PALETTE 와 동일 값(self-contained 위해 재현).
const COLOR_TEXT = "#FFFFFF";
const COLOR_GO = "#FFFFFF";
const COLOR_STROKE = "#3E2723"; // brown900 — HUD 외곽선과 동일
const STEP_MS = 800;
const POP_MS = 120;
const POP_SCALE = 1.3;
const GO_FADE_MS = 400;
const GO_FADE_SCALE = 1.6;
const FONT_SIZE_PX = 120; // 4종 게임 공통(_shared countdownLg, portrait tower-battle ~115)과 동일 톤
const STROKE_PX = 8;
const DEPTH = 60;
const START_COUNT = 3;

export const playDropCountdown = (
  scene: Phaser.Scene,
  viewW: number,
  viewH: number,
  onComplete: () => void,
) => {
  let count = START_COUNT;
  const text = scene.add
    .text(viewW / 2, viewH / 2, String(count), {
      fontFamily: getGameFont(),
      fontSize: `${FONT_SIZE_PX}px`,
      color: COLOR_TEXT,
      stroke: COLOR_STROKE,
      strokeThickness: STROKE_PX,
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(DEPTH);

  const pop = () => {
    text.setScale(1);
    scene.tweens.add({
      targets: text,
      scale: POP_SCALE,
      duration: POP_MS,
      yoyo: true,
      ease: "Back.easeOut",
    });
  };
  pop(); // 첫 숫자도 톡.

  scene.time.addEvent({
    delay: STEP_MS,
    repeat: START_COUNT - 1, // 3 → 2 → 1 → GO!
    callback: () => {
      if (!scene.scene.isActive()) {
        return;
      }
      count--;
      if (count > 0) {
        text.setText(String(count));
        pop();
        return;
      }
      // GO! — 색 바꾸고 커지며 페이드 → 플레이 시작.
      text.setText("GO!").setColor(COLOR_GO).setScale(1);
      scene.tweens.add({
        targets: text,
        alpha: 0,
        scale: GO_FADE_SCALE,
        duration: GO_FADE_MS,
        ease: "Power2",
        onComplete: function startPlay() {
          text.destroy();
          if (scene.scene.isActive()) {
            onComplete();
          }
        },
      });
    },
  });
};
