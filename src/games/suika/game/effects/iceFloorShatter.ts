import * as Phaser from "phaser";

import { playShatterParticles, playShatterSound } from "./dormantStyle";

/**
 * 받침대 개방 연출 — 얼음 바닥이 깨지며 떨어진다(기존 door swing 대체). 교체 가능한 단위.
 *
 * 폭 전체에 얼음 파편을 분출(+shatter 소리·카메라 셰이크)하고, 좌/우 바 조각은 바깥으로
 * 살짝 기울며 아래로 떨어져 페이드. 물리 floor 제거(GameScene)와 동시에 호출.
 *
 * 느낌 조정은 ICE_FLOOR_SHATTER_CONFIG, 완전 교체는 playIceFloorShatter 통째.
 */

export const ICE_FLOOR_SHATTER_CONFIG = {
  burstPoints: 6, // 폭 따라 파편 분출 지점 수
  burstYOffset: 24, // 분출 y = 바닥 표면 아래 이만큼(눈 몸통에서 깨지게)
  shardSize: 64, // 파편 분사 세기(클수록 멀리)
  fallDistance: 240, // 깨진 바 조각이 떨어지는 거리(px)
  fallDuration: 440,
  fallEase: "Quad.easeIn", // 무겁게 떨어지듯 가속
  tiltDeg: 12, // 떨어지며 바깥쪽으로 기우는 각(deg)
  shakeDuration: 240,
  shakeIntensity: 0.012,
} as const;

export const playIceFloorShatter = (
  scene: Phaser.Scene,
  leftDoor: Phaser.GameObjects.Image,
  rightDoor: Phaser.GameObjects.Image,
) => {
  const c = ICE_FLOOR_SHATTER_CONFIG;
  scene.cameras.main.shake(c.shakeDuration, c.shakeIntensity);
  playShatterSound(scene); // 내부 throttle 로 다발 분출에도 소리 1회

  // 바닥 바 구간(좌 문짝 좌끝 ~ 우 문짝 우끝)에 파편 버스트 — 바닥선이 쩍 갈라지듯.
  const burstY = leftDoor.y + c.burstYOffset;
  const left = leftDoor.x; // origin(0) → 좌끝
  const span = rightDoor.x - left; // origin(1) → 우끝
  for (let i = 0; i < c.burstPoints; i++) {
    const x = left + span * ((i + 0.5) / c.burstPoints);
    playShatterParticles(scene, x, burstY, c.shardSize);
  }

  // 깨진 두 조각이 바깥으로 기울며 떨어져 사라짐.
  [leftDoor, rightDoor].forEach((door, idx) => {
    scene.tweens.add({
      targets: door,
      y: door.y + c.fallDistance,
      angle: idx === 0 ? -c.tiltDeg : c.tiltDeg,
      alpha: 0,
      duration: c.fallDuration,
      ease: c.fallEase,
    });
  });
};
