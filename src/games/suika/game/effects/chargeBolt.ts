import * as Phaser from "phaser";

import EnergyIconImg from "../assets/EnergyIcon.png";
import PowerUpSfx from "../assets/PowerUp.mp3";
import { HUD_LAYOUT } from "../hud/constants";

/**
 * 능력 카운트 +1 연출 — 화면 중앙에서 에너지 번개(게이지 아이콘과 같은 그림)가 톡 솟아 크게
 * 머물다가, HUD 게이지 아이콘 위치로 축소·회전하며 빨려든다. 효과음 1회. 빨려든 시점에 onArrive
 * 콜백 → 호스트가 게이지 아이콘을 펄스시킨다(번개가 에너지를 꽂아넣는 느낌).
 *
 * 좌표는 scrollFactor(0) screen 공간(=게임-박스 0..viewW/H). 게이지 아이콘은 DOM HUD(zIndex 위)라
 * 번개가 그 뒤로 사라지며 "빨려드는" 느낌이 난다. 색·크기·timing 을 여기서만 만진다.
 */
const BOLT_TEXTURE = "charge-bolt";
const BOLT_SOUND = "charge-bolt-up";

const RISE_MS = 240; // 작게서 크게 톡 솟는 등장
const HOLD_MS = 160; // 크게 머무는 텀
const SUCK_MS = 380; // 게이지로 빨려드는 비행
const BIG_SIZE = 220; // 등장 최대 크기(px)
const SMALL_SIZE = 64; // 게이지 도착 크기(px)
const VOLUME = 0.55;

/** "70%" → 0.7. */
const pct = (s: string) => parseFloat(s) / 100;

/** Scene.preload 에서 1회 호출. */
export const preloadChargeBolt = (scene: Phaser.Scene) => {
  scene.load.image(BOLT_TEXTURE, EnergyIconImg.src);
  scene.load.audio(BOLT_SOUND, PowerUpSfx);
};

export const playChargeBolt = (
  scene: Phaser.Scene,
  viewW: number,
  viewH: number,
  onArrive?: () => void,
) => {
  // 도착 지점 = HUD 게이지 아이콘(슬롯 우측 변에 중심, 세로 가운데). HUD_LAYOUT 과 같은 출처라 drift 없음.
  const g = HUD_LAYOUT.gauge;
  const toX = (pct(g.left) + pct(g.width)) * viewW;
  const toY = (pct(g.top) + pct(g.height) / 2) * viewH;

  scene.sound.play(BOLT_SOUND, { volume: VOLUME });

  // 등장 = 화면 중앙(screen 공간).
  const startX = viewW / 2;
  const startY = viewH / 2;
  const bolt = scene.add
    .image(startX, startY, BOLT_TEXTURE)
    .setScrollFactor(0)
    .setDepth(50)
    .setAngle(-12)
    .setAlpha(0);
  // 텍스처 px 기준 scale 환산(에셋 크기 바뀌어도 안전).
  const toScale = (px: number) => px / bolt.width;
  bolt.setScale(toScale(BIG_SIZE) * 0.3);

  // 1) 등장 — 작게서 크게 톡 솟으며 살짝 위로.
  scene.tweens.add({
    targets: bolt,
    scale: toScale(BIG_SIZE),
    y: startY - 36,
    alpha: 1,
    angle: 6,
    ease: "Back.easeOut",
    duration: RISE_MS,
    onComplete: () => {
      // 2) 잠깐 머문 뒤 → 3) 게이지로 축소·회전하며 빨려든다(가속 ease).
      scene.time.delayedCall(HOLD_MS, () => {
        scene.tweens.add({
          targets: bolt,
          x: toX,
          y: toY,
          scale: toScale(SMALL_SIZE),
          angle: 340,
          ease: "Cubic.easeIn",
          duration: SUCK_MS,
          onComplete: () => {
            bolt.destroy();
            onArrive?.(); // 빨려든 순간 — 게이지 아이콘 펄스 트리거.
          },
        });
      });
    },
  });
};
