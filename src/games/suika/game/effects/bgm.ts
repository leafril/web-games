import * as Phaser from "phaser";

import BgmSrc from "../assets/Bgm.mp3";

/**
 * 배경음악 — 게임 내내 루프. 교체 가능한 단위.
 * 브라우저 autoplay 정책상 첫 유저 제스처 전엔 오디오 컨텍스트가 잠겨 있어,
 * locked 면 UNLOCKED 이벤트를 한 번 기다렸다 재생한다.
 */
const BGM_KEY = "drop-bgm";
const VOLUME = 0.3;

/** Scene.preload 에서 1회 호출. */
export const preloadBgm = (scene: Phaser.Scene) => {
  scene.load.audio(BGM_KEY, BgmSrc);
};

/** Scene.create 에서 호출. SHUTDOWN 정리용 stop 함수를 돌려준다. */
export const startBgm = (scene: Phaser.Scene) => {
  const play = () => {
    if (!scene.sound.get(BGM_KEY)) {
      scene.sound.play(BGM_KEY, { loop: true, volume: VOLUME });
    }
  };

  if (scene.sound.locked) {
    scene.sound.once(Phaser.Sound.Events.UNLOCKED, play);
  } else {
    play();
  }

  return () => {
    scene.sound.off(Phaser.Sound.Events.UNLOCKED, play);
    scene.sound.stopByKey(BGM_KEY);
  };
};
