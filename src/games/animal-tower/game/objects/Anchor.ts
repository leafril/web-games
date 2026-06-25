import * as Phaser from "phaser";

import { ANCHOR_CLOUD_KEYS } from "../config/assetKeys";
import { paletteHex } from "../config/theme";

/** 동물(depth 0)보다 뒤, 마일스톤선(-50)보다 앞 — 동물이 발판 위에 그려지도록. */
const ANCHOR_DEPTH = -2;

// 정적 표면 마찰 — GameScene 블록 값과 동일 톤(쌓기 안정감 일관). 발판이 자기 표면 느낌을 소유한다.
const SURFACE_FRICTION = 0.7;
const SURFACE_FRICTION_STATIC = 1.0;
const SURFACE_RESTITUTION = 0;
const SURFACE_SLOP = 0.05; // Matter default — 높으면 착지 때 튕겨 나옴(pop)

/** root 타입 — grass 는 Container, cloud 는 Image. 둘 다 등장 pop(playSpawnPop)의 Transform 타깃. */
type AnchorRoot = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform;

/**
 * 발판 비주얼 변종 — 고도(biome)에 맞춰 GameScene 이 선택한다.
 * - grass: 지면~하늘(~15m). 시작 좌대와 같은 잔디+흙 디딤돌(평평한 윗면).
 * - cloud: 성층권(15m+). 흰 구름 스프라이트(잔디흙이 우주 배경에 뜨면 이질적이라).
 */
export type AnchorVariant = "grass" | "cloud";

// ── grass 디딤돌 치수 — 시작 좌대 디자인을 디딤돌 크기로 축약. 세로 두께는 폭과 무관히 고정. ──
const GRASS_FACE_H = 16;
const SOIL_DEPTH = 22;
const GRASS_TOTAL_H = GRASS_FACE_H + SOIL_DEPTH;
const GRASS_TOP_RADIUS = 10;
const GRASS_BOTTOM_RADIUS = 8;
const GRASS_SCALLOP_R = 8;

// ── cloud 구름 헐 — 둥근 구름 실루엣 근사 볼록 다각형(정규화 0~1). 평평 막대가 아닌 구름 형태로 충돌. ──
const CLOUD_HULL: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.5, y: 0.16 },
  { x: 0.74, y: 0.22 },
  { x: 0.9, y: 0.4 },
  { x: 0.92, y: 0.62 },
  { x: 0.78, y: 0.82 },
  { x: 0.5, y: 0.86 },
  { x: 0.22, y: 0.82 },
  { x: 0.08, y: 0.62 },
  { x: 0.1, y: 0.4 },
  { x: 0.26, y: 0.22 },
];
/** 헐 최상단 y(정규화) — 이 지점을 착지선(landingY)에 맞춘다. */
const CLOUD_HULL_TOP_Y = 0.16;
/** 스프라이트 세로 중심(정규화). 헐 centroid 가 대략 여기. */
const CLOUD_SPRITE_CENTER_Y = 0.5;

/**
 * 5m 마일스톤 보너스 발판. 윗면(landingY)이 착지선. 어느 높이·폭·변종으로 둘지는
 * 호출자 GameScene 의 정책. 카메라 따라 스크롤된다. 등장 연출(scale pop·먼지 puff)은
 * GameScene 이 root 를 받아 발동 — 충돌 body 와 분리된 시각만 애니메이션해 정착 판정을 건드리지 않는다.
 */
export class Anchor {
  /** 시각 노드(grass=Container, cloud=Image). 등장 scale pop 의 애니메이션 타깃. body 와 분리. */
  readonly root: AnchorRoot;

  constructor(
    scene: Phaser.Scene,
    x: number,
    landingY: number,
    widthPx: number,
    variant: AnchorVariant,
  ) {
    this.root =
      variant === "cloud"
        ? this.buildCloud(scene, x, landingY, widthPx)
        : this.buildGrass(scene, x, landingY, widthPx);
  }

  /** 잔디+흙 디딤돌 — 평평한 윗면(안 굴러떨어짐). 좌대와 같은 어포던스. */
  private buildGrass(
    scene: Phaser.Scene,
    x: number,
    landingY: number,
    widthPx: number,
  ): AnchorRoot {
    const half = widthPx / 2;
    const top = -GRASS_TOTAL_H / 2; // 컨테이너 로컬: 윗면(잔디 top = 착지선)
    const soilTop = top + GRASS_FACE_H;

    const g = scene.add.graphics();

    // 흙 몸통 — 아래 모서리만 둥글게 → 공중에 뜬 디딤돌.
    g.fillStyle(paletteHex.block.soil, 1);
    g.fillRoundedRect(-half, soilTop, widthPx, SOIL_DEPTH, {
      tl: 0,
      tr: 0,
      bl: GRASS_BOTTOM_RADIUS,
      br: GRASS_BOTTOM_RADIUS,
    });

    // 잔디 — 술(scallop) bump + 윗면, 좌대와 동일 단색 green.
    g.fillStyle(paletteHex.block.platform, 1);
    for (
      let cx = -half + GRASS_SCALLOP_R;
      cx <= half - GRASS_SCALLOP_R + 1;
      cx += GRASS_SCALLOP_R * 2
    ) {
      g.fillCircle(cx, soilTop, GRASS_SCALLOP_R);
    }
    g.fillRoundedRect(-half, top, widthPx, GRASS_FACE_H, {
      tl: GRASS_TOP_RADIUS,
      tr: GRASS_TOP_RADIUS,
      bl: 0,
      br: 0,
    });

    // 윗면(착지선)이 landingY 에 오도록 컨테이너 중심 배치 → top 이 landingY.
    const centerY = landingY + GRASS_TOTAL_H / 2;
    const root = scene.add.container(x, centerY, [g]).setDepth(ANCHOR_DEPTH);

    // 충돌 body — 평평한 윗면 사각형. 윗면 = landingY.
    scene.matter.add.rectangle(x, centerY, widthPx, GRASS_TOTAL_H, {
      isStatic: true,
      friction: SURFACE_FRICTION,
      frictionStatic: SURFACE_FRICTION_STATIC,
      restitution: SURFACE_RESTITUTION,
      slop: SURFACE_SLOP,
    });
    return root;
  }

  /** 흰 구름 발판(성층권) — 랜덤 구름 스프라이트 + 구름 모양 볼록헐 충돌. */
  private buildCloud(
    scene: Phaser.Scene,
    x: number,
    landingY: number,
    widthPx: number,
  ): AnchorRoot {
    const keyIndex = Math.floor(Math.random() * ANCHOR_CLOUD_KEYS.length);
    const key = ANCHOR_CLOUD_KEYS[keyIndex] ?? ANCHOR_CLOUD_KEYS[0];
    const source = scene.textures.get(key).getSourceImage();
    const aspect = source.height / source.width;
    const displayWidth = widthPx;
    const displayHeight = widthPx * aspect;

    // 착지선(헐 최상단)이 landingY 에 오도록 스프라이트 중심 배치.
    const centerY =
      landingY + displayHeight * (CLOUD_SPRITE_CENTER_Y - CLOUD_HULL_TOP_Y);

    const root = scene.add
      .image(x, centerY, key)
      .setDisplaySize(displayWidth, displayHeight)
      .setDepth(ANCHOR_DEPTH);

    // 충돌 body — 헐을 표시 크기로 스케일한 볼록 다각형. centroid 를 centerY 에 둔다.
    const verts = CLOUD_HULL.map((p) => ({
      x: p.x * displayWidth,
      y: p.y * displayHeight,
    }));
    scene.matter.add.fromVertices(x, centerY, verts, {
      isStatic: true,
      friction: SURFACE_FRICTION,
      frictionStatic: SURFACE_FRICTION_STATIC,
      restitution: SURFACE_RESTITUTION,
      slop: SURFACE_SLOP,
    });
    return root;
  }
}
