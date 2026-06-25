import * as Phaser from "phaser";

/**
 * 얼음 왕국 분위기 — 떠다니는 눈/서리 입자. **월드 공간**(scrollFactor 1)이라 카메라가 층을
 * 따라 내려가면 입자가 위로 스쳐 지나가 하강감을 준다(고정 배경의 정적함 해소). 정지 중엔
 * 천천히 흩날리는 분위기. emitter 는 매 프레임 카메라 상단을 따라가 현재 화면을 채운다(Scene update).
 */
const SNOW_TEX = "ice-snow";

const ensureSnowTexture = (scene: Phaser.Scene) => {
  if (scene.textures.exists(SNOW_TEX)) {
    return;
  }
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(8, 8, 8); // 부드러운 바깥
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 5); // 단단한 중심
  g.generateTexture(SNOW_TEX, 16, 16);
  g.destroy();
};

/**
 * 눈 emitter 생성 — 화면(width×height) 범위에 흩뿌려 천천히 낙하. 반환된 emitter 의 위치를
 * Scene update 에서 카메라 상단(scrollY)으로 갱신하면 현재 화면을 따라 계속 채운다.
 */
export const createIceSnow = (
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.GameObjects.Particles.ParticleEmitter => {
  ensureSnowTexture(scene);
  return scene.add
    .particles(0, 0, SNOW_TEX, {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      frequency: 40,
      quantity: 1,
      lifespan: 4500,
      speedY: { min: 12, max: 40 }, // 살짝 낙하 — 큰 하강감은 카메라 스크롤이 만든다
      speedX: { min: -8, max: 8 },
      scale: { min: 0.3, max: 0.85 },
      alpha: { start: 0.85, end: 0.15 },
      rotate: { min: 0, max: 360 },
    })
    .setDepth(-50); // 배경(-100) 앞, 과일(0) 뒤
};
