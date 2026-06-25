import * as Phaser from "phaser";

import { MERGE_TUNING } from "./mergeTuning";

/**
 * 머지 파티클 시안 모음 — dev 패널에서 전환하며 비교한다. MERGE_PRESETS 순서는
 * mergePresetMeta 라벨과 일치. 색(tint)은 호출부가 머지 결과 과일의 대표 즙 색을 준다.
 *
 * 시안이 emitter 를 1개 쓰든(단일) 2개 쓰든(섞기) 호출부는 모르게, create 는 핸들
 * (emit/destroy)을 돌려준다.
 */
type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

export type MergeHandle = {
  emit: (x: number, y: number, level: number, tint: number) => void;
  destroy: () => void;
};

export type MergePreset = {
  create: (scene: Phaser.Scene) => MergeHandle;
};

const countOf = (base: number, step: number, max: number, level: number) =>
  Math.min(Math.round(base + level * step), max);

// ── 물방울 궤적 헬퍼 — 속도에 따라 누우며(방향) 늘었다 줄었다(stretch) 한다. ──
type Particle = Phaser.GameObjects.Particles.Particle;
const SPEED_REF = 520; // 이 속도에서 가장 길쭉. 느려질수록 둥글어짐.
const speedRatio = (p: Particle) =>
  Math.min(Math.hypot(p.velocityX, p.velocityY) / SPEED_REF, 1);
/** 이동 방향으로 눕는다(포물선 따라 회전). */
const petalRotate = (p: Particle) =>
  Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX));
/** 빠를수록 이동축으로 길쭉. */
const petalScaleX = (p: Particle) => 0.5 + speedRatio(p) * 0.95;
/** 빠를수록 얇게(부피 유지하듯). 느리면 통통. */
const petalScaleY = (p: Particle) => 0.62 - speedRatio(p) * 0.44;

// 파티클별 랜덤 배수 — onEmit 에서 1회 정해 보존(onUpdate 로 유지).
//  - sizeJitter: 전체 크기(큰·작은 페탈 섞임). scaleX·scaleY 양쪽에 곱하며, 먼저 호출된 쪽이 정한다(??=).
//  - thickJitter: 두께만(굵은·가는 섞임).
type PetalParticle = Particle & { thickJitter?: number; sizeJitter?: number };
const rollSize = (pp: PetalParticle) =>
  (pp.sizeJitter ??= Phaser.Math.FloatBetween(0.6, 1.4));
const petalScaleXConfig = {
  onEmit: (p?: Particle) => {
    if (!p) {
      return 0.5;
    }
    const pp = p as PetalParticle;
    return petalScaleX(p) * rollSize(pp);
  },
  onUpdate: (p?: Particle) => {
    if (!p) {
      return 0.5;
    }
    const pp = p as PetalParticle;
    return petalScaleX(p) * (pp.sizeJitter ?? 1);
  },
};
const petalScaleYConfig = {
  onEmit: (p?: Particle) => {
    if (!p) {
      return 0.5;
    }
    const pp = p as PetalParticle;
    pp.thickJitter = Phaser.Math.FloatBetween(
      MERGE_TUNING.thickMin,
      MERGE_TUNING.thickMax,
    );
    return petalScaleY(p) * pp.thickJitter * rollSize(pp);
  },
  onUpdate: (p?: Particle) => {
    if (!p) {
      return 0.5;
    }
    const pp = p as PetalParticle;
    return petalScaleY(p) * (pp.thickJitter ?? 1) * (pp.sizeJitter ?? 1);
  },
};

// 수명 마지막 구간에서만 살짝 fade — 그 전엔 불투명(뚝 끊김 방지). fadeFrom 은 dev 에서 실시간 조정.
const tailFade = {
  onUpdate: (_p?: Particle, _key?: string, t?: number) => {
    const from = MERGE_TUNING.fadeFrom;
    const tt = t ?? 0;
    return tt < from ? 1 : Math.max(0, 1 - (tt - from) / (1 - from));
  },
};

// ── 텍스처 헬퍼(흰색 베이스 — tint 100% 먹음) ──

const ensureBlob = (scene: Phaser.Scene, key: string) => {
  if (scene.textures.exists(key)) {
    return;
  }
  const size = 64;
  const r = size / 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let i = 10; i >= 1; i--) {
    g.fillStyle(0xffffff, 0.14);
    g.fillCircle(r, r, (r - 2) * (i / 10));
  }
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(r * 0.66, r * 0.56, r * 0.16);
  g.generateTexture(key, size, size);
  g.destroy();
};

/** 꽃잎/타원 — 가로로 길쭉한 흰 타원. 회전·얇아짐과 함께 쓰면 과즙 조각 느낌. */
const ensurePetal = (scene: Phaser.Scene, key: string) => {
  if (scene.textures.exists(key)) {
    return;
  }
  const w = 36;
  const h = 18;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(w / 2, h / 2, w - 4, h - 4);
  g.generateTexture(key, w, h);
  g.destroy();
};

// ── 시안 ──

/** 물방울 + 꽃잎 섞기 — 사방으로 튀고, 꽃잎은 속도 따라 눕고 늘었다 줄며 날아간다. */
const mixed: MergePreset = {
  create: (scene) => {
    ensureBlob(scene, "mp-blob");
    ensurePetal(scene, "mp-petal");
    const drops = scene.add.particles(0, 0, "mp-blob", {
      speed: {
        min: MERGE_TUNING.dropSpeed * 0.55,
        max: MERGE_TUNING.dropSpeed,
      },
      angle: { min: -180, max: 0 }, // 위 반구(좌·상·우) → 솟았다 떨어지는 포물선
      lifespan: {
        min: MERGE_TUNING.life * 0.55,
        max: MERGE_TUNING.life * 0.85,
      },
      scale: { start: 0.4, end: 0.06 },
      alpha: tailFade,
      gravityY: MERGE_TUNING.gravity, // 빨리 떨어져 범위 억제
      blendMode: Phaser.BlendModes.NORMAL,
      emitting: false,
    });
    drops.setDepth(7);
    const petals = scene.add.particles(0, 0, "mp-petal", {
      speed: {
        min: MERGE_TUNING.petalSpeed * 0.55,
        max: MERGE_TUNING.petalSpeed,
      },
      angle: { min: -180, max: 0 }, // 위 반구
      // 속도에 따라 누우며(방향) 늘었다 줄었다 — 빠르면 길쭉·얇게, 정점에선 통통·둥글게.
      rotate: { onUpdate: petalRotate },
      scaleX: petalScaleXConfig,
      scaleY: petalScaleYConfig,
      alpha: tailFade,
      lifespan: { min: MERGE_TUNING.life * 0.6, max: MERGE_TUNING.life },
      gravityY: MERGE_TUNING.gravity * 0.9,
      blendMode: Phaser.BlendModes.NORMAL,
      emitting: false,
    });
    petals.setDepth(7);
    return {
      emit: (x, y, level, tint) => {
        const n = countOf(
          MERGE_TUNING.countBase,
          2.2,
          MERGE_TUNING.countMax,
          level,
        );
        drops.setParticleTint(tint);
        drops.explode(Math.round(n * 0.7), x, y);
        petals.setParticleTint(tint);
        petals.explode(Math.round(n * MERGE_TUNING.petalRatio), x, y);
      },
      destroy: () => {
        drops.destroy();
        petals.destroy();
      },
    };
  },
};

export const MERGE_PRESETS: MergePreset[] = [mixed];
