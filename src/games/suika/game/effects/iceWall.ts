import * as Phaser from "phaser";

/**
 * 통 좌/우 얼음벽 — 절차 생성(플랫 일자 빙벽). 교체 가능한 단위.
 *
 * 바닥(IceFloor) 에셋의 팔레트만 가져와 세로 밴드로 그린다(그라데이션·장식 X) → 바닥과 색이
 * 같아 톤은 통일되면서 형태는 깔끔한 일자. 세로로 균일해 tileSprite 로 무한 높이 반복 + 카메라
 * 따라 흘러도 이음매가 없다. 우측 벽은 flipX 로 대칭. 벽 자체는 안 깨진다(바닥만 깸).
 */

// 바닥(IceFloor) 아트와 동일 팔레트 — 같은 재질로 읽힌다.
const FLOOR_SHADOW = 0xadcfe4; // 바깥 그늘면(가장 어두움)
const FLOOR_BODY = 0xcbe4f4; // 몸체(중간)
const FLOOR_LIGHT = 0xe1f1fc; // 안쪽 빛 받는 면(가장 밝음)
const SNOW = 0xffffff; // 안쪽 립 하이라이트

export const ICE_WALL_CONFIG = {
  width: 42, // 통 이미지 기둥 안쪽 변(밀착 크롭 후 5.8%×720≈42)에 물리 경계 정렬 — 과일이 기둥에 안착.
  depth: -2, // 문짝(-1)·과일(0) 뒤 → 바닥 바가 코너를 덮어 이음매 가림
  // 바닥 3색을 어두움→밝음 3단으로 분배(둥근 빙주 셰이딩). 몸체 = width - shadowW - lightW.
  shadowW: 7, // 바깥 그늘 띠 폭(~25%)
  lightW: 7, // 안쪽 빛 띠 폭(~25%, 흰 립 포함)
} as const;

const TEX_KEY = "ice-wall";

/** 좌측 벽 기준 세로 띠(플랫 일자, 3단 명암): 바깥=그늘 → 몸체 → 안쪽=빛+흰 립. 우측은 flipX 대칭. */
const ensureIceWallTexture = (scene: Phaser.Scene) => {
  if (scene.textures.exists(TEX_KEY)) {
    return;
  }
  const c = ICE_WALL_CONFIG;
  const w = c.width;
  const h = 16; // 세로 균일 → 작게
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(FLOOR_BODY, 1); // 몸체(중간)
  g.fillRect(0, 0, w, h);
  g.fillStyle(FLOOR_SHADOW, 1); // 바깥 그늘 띠
  g.fillRect(0, 0, c.shadowW, h);
  g.fillStyle(FLOOR_LIGHT, 1); // 안쪽 빛 받는 띠
  g.fillRect(w - c.lightW, 0, c.lightW, h);
  g.fillStyle(SNOW, 0.45); // 안쪽 립 소프트 하이라이트
  g.fillRect(w - 4, 0, 2, h);
  g.fillStyle(SNOW, 1); // 안쪽 립 크리스프
  g.fillRect(w - 2, 0, 2, h);
  g.generateTexture(TEX_KEY, w, h);
  g.destroy();
};

export type IceWalls = {
  /** 카메라 scrollY 를 받아 벽을 월드와 함께 흘린다(세로 균일이라 시각 변화 없지만 정합). */
  update: (scrollY: number) => void;
};

export const createIceWalls = (
  scene: Phaser.Scene,
  viewW: number,
  viewH: number,
): IceWalls => {
  ensureIceWallTexture(scene);
  const c = ICE_WALL_CONFIG;
  const left = scene.add
    .tileSprite(0, 0, c.width, viewH, TEX_KEY)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(c.depth);
  const right = scene.add
    .tileSprite(viewW, 0, c.width, viewH, TEX_KEY)
    .setOrigin(1, 0)
    .setScrollFactor(0)
    .setDepth(c.depth)
    .setFlipX(true); // 안쪽 빛/립이 중앙을 향하도록 대칭
  return {
    update: (scrollY: number) => {
      left.tilePositionY = scrollY;
      right.tilePositionY = scrollY;
    },
  };
};
