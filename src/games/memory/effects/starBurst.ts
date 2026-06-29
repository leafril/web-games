// 카드 뒤집기 VFX — 별 파티클 버스트. 텍스처는 STAR_PARTICLE(preload 에서 로드), 색은 tint 로 입힌다.

import { STAR_PARTICLE } from "../assets";

// 흰·분홍·노랑·시안 — 파티클마다 랜덤으로 입힐 색(채도 있게 해 밝은 배경서도 읽히게).
const STAR_COLORS = [0xffffff, 0xff9ed2, 0xffd54a, 0x82e1f4];

const pickStarColor = (): number =>
  STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)] ?? 0xffffff;

const STAR_COUNT = 10;

/**
 * 지정 좌표 중앙에서 별 파티클을 원형 링(ring burst)으로 퍼뜨린다. 모든 별이 같은 속도·균등
 * 각도로 나가 속 빈 원 대형을 이룬다. 색은 파티클마다 흰·분홍·노랑 중 무작위.
 */
export const playStarBurst = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  spread: number,
): void => {
  const lifeMs = 350;
  // 이동거리 ≈ speed × 수명. 반경(spread*0.6)은 고정이고 수명이 짧을수록 더 빠르게 퍼진다.
  const speed = (spread * 0.6 * 1000) / lifeMs;
  const emitter = scene.add.particles(0, 0, STAR_PARTICLE.key, {
    emitting: false,
    lifespan: lifeMs,
    // 좁은 속도 범위 → 대체로 같은 반경(링)이되 반경이 살짝 흩어진다.
    speed: { min: speed * 0.8, max: speed * 1.05 },
    angle: { min: 0, max: 360 }, // 각도 랜덤 → 둘레에 흩어진 링
    scale: { min: 0.25, max: 0.4 }, // 별마다 크기 랜덤(페이드는 alpha 가 담당)
    // 수명 2/3 지점까지 또렷하게(alpha 1) 유지하다가 끝에서만 사라진다.
    alpha: [1, 1, 1, 0],
    rotate: { min: 0, max: 360 },
    tint: { onEmit: () => pickStarColor() },
  });
  emitter.setDepth(50);
  emitter.explode(STAR_COUNT, x, y);
  scene.time.delayedCall(lifeMs + 150, () => emitter.destroy());
};
