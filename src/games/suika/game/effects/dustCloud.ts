import * as Phaser from "phaser";

/**
 * 먼지 구름 — 바닥이 깨질 때 부서진 가루가 피어오르는 연출. 얼음 조각(shatter)과 겹쳐
 * "쾅" 하고 무너지는 묵직함을 더한다. 소프트 원형 퍼프가 위로 부풀며 옅어진다.
 * 통이 얼음이라 흙먼지(갈색)가 아니라 흰 서리 가루색. 텍스처는 코드 생성(lazy).
 */

const DUST_TEX = "dust-puff";

/**
 * 먼지 퍼프 튜닝 — 한 번의 호출(playDustCloud)이 만드는 구름.
 * - puffs: 퍼프 수
 * - color: 먼지색(흰~연푸른 서리)
 * - alpha: 시작 불투명도(낮을수록 옅음)
 * - scaleMin/scaleMax: 시작 크기 배율(baseSize 대비)
 * - growth: 끝 크기 = 시작 × growth(부풀어오름)
 * - riseMin/riseMax: 위로 떠오르는 거리(px)
 * - drift: 좌우 흔들림 폭(px)
 * - duration: 퍼프 수명(ms)
 */
export const DUST_TUNING = {
  puffs: 5,
  color: 0xeaf4ff,
  alpha: 0.4,
  scaleMin: 0.8,
  scaleMax: 1.3,
  growth: 2.2,
  riseMin: 40,
  riseMax: 90,
  drift: 50,
  duration: 700,
};

/** 텍스처 기준 지름(px) — startScale 환산 분모. */
const DUST_TEX_SIZE = 128;

/** 소프트 원형 먼지 텍스처 — 중심 진하고 가장자리 투명(옅은 동심원 누적). lazy 1회. */
const ensureDustTexture = (scene: Phaser.Scene) => {
  if (scene.textures.exists(DUST_TEX)) {
    return;
  }
  const r = DUST_TEX_SIZE / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // 바깥(큰 반경)부터 안(작은 반경)으로 옅은 흰 원을 겹쳐 중심이 누적돼 진해지는 soft edge.
  const layers = 16;
  for (let i = layers; i > 0; i--) {
    g.fillStyle(0xffffff, 0.06);
    g.fillCircle(r, r, (r * i) / layers);
  }
  g.generateTexture(DUST_TEX, DUST_TEX_SIZE, DUST_TEX_SIZE);
  g.destroy();
};

/**
 * 먼지 구름 1회 — (x,y)에서 퍼프 여러 개가 위로 부풀며 옅어진다.
 * baseSize: 퍼프 기준 지름(px). opts 로 색·수명 덮어쓰기.
 */
export const playDustCloud = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  baseSize: number,
  opts?: { tint?: number; duration?: number },
) => {
  ensureDustTexture(scene);
  const durMs = opts?.duration ?? DUST_TUNING.duration;
  const tint = opts?.tint ?? DUST_TUNING.color;
  for (let i = 0; i < DUST_TUNING.puffs; i++) {
    const startScale =
      (baseSize / DUST_TEX_SIZE) *
      Phaser.Math.FloatBetween(DUST_TUNING.scaleMin, DUST_TUNING.scaleMax);
    const rise = Phaser.Math.FloatBetween(
      DUST_TUNING.riseMin,
      DUST_TUNING.riseMax,
    );
    const drift = Phaser.Math.FloatBetween(
      -DUST_TUNING.drift,
      DUST_TUNING.drift,
    );
    const x0 = x + Phaser.Math.FloatBetween(-baseSize, baseSize) * 0.3;
    const puff = scene.add
      .image(x0, y, DUST_TEX)
      .setDepth(19) // 얼음 조각(depth 20) 바로 뒤 — 먼지가 조각 뒤 배경으로 깔린다.
      .setTint(tint)
      .setAlpha(DUST_TUNING.alpha)
      .setScale(startScale);
    scene.tweens.add({
      targets: puff,
      x: x0 + drift,
      y: y - rise,
      scale: startScale * DUST_TUNING.growth,
      alpha: 0,
      duration: durMs,
      ease: "Sine.Out",
      onComplete: () => puff.destroy(),
    });
  }
};
