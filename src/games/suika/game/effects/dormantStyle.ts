import * as Phaser from "phaser";

import IceBubble1 from "../assets/IceBubble1.png";
import IceBubble2 from "../assets/IceBubble2.png";
import IceShatter1 from "../assets/IceShatter1.mp3";
import IceShatter2 from "../assets/IceShatter2.mp3";
import { ICE_TUNING, SHARD_COLORS, SHATTER_TUNING } from "./dormantTuning";

/**
 * 휴면 과일 표시 — 교체 가능한 단위. 과일을 반투명 얼음 크리스탈에 가둔다("안 합쳐지는 상태").
 * 과일이 비쳐 기대감을 주고, 활성화 시 얼음이 깨진다(조각 파티클 + shatter 소리). 텍스처는 코드 생성.
 *
 * 오버레이는 과일을 따라다닌다(prefill 이 settle 중 살짝 움직임). GameScene 호출부는 apply/clear 둘뿐.
 */
type FruitImage = Phaser.Physics.Matter.Image;

/**
 * 얼음막이 덮을 기준 = 과일 "본체"(충돌원) 지름. displayWidth 는 꼭지·여백을 포함한 이미지
 * 전체라 bodyFill 로 키운 과일(수박 등)에선 너무 큼 → 바디 circleRadius*2 를 쓴다. 비원형
 * 바디면 displayWidth 로 폴백.
 */
const bodyDiameter = (img: FruitImage): number => {
  const body = img.body as
    | (MatterJS.BodyType & { circleRadius?: number })
    | null;
  return body?.circleRadius ? body.circleRadius * 2 : img.displayWidth;
};

const SHARD_TEXS = [
  "ice-shard-0",
  "ice-shard-1",
  "ice-shard-2",
  "ice-shard-3",
  "ice-shard-4",
  "ice-shard-5",
];
const SHATTER_SOUNDS = [
  { key: "ice-shatter-1", src: IceShatter1 },
  { key: "ice-shatter-2", src: IceShatter2 },
];
/** 동시 다발(쏟아짐 시 층 전체 깸)에 소리가 겹쳐 시끄럽지 않게 throttle. */
let lastShatterSoundAt = -1000;

/** 휴면 얼음 버블 텍스처(구매 에셋, 투명 PNG) — dev 에서 선택. 0=1번, 1=7번. */
const ICE_BUBBLES = [
  { key: "ice-bubble-1", src: IceBubble1.src },
  { key: "ice-bubble-2", src: IceBubble2.src },
];

/** 얼음 버블 텍스처 preload — Scene.preload 에서 1회. */
export const preloadIceTextures = (scene: Phaser.Scene) => {
  ICE_BUBBLES.forEach((b) => scene.load.image(b.key, b.src));
};

/** 사용할 버블 인덱스(-1=랜덤). */
let selectedIceIndex = -1;
export const setSelectedIce = (index: number) => {
  selectedIceIndex = index;
};
const currentIceKey = () => {
  const i =
    selectedIceIndex < 0
      ? Phaser.Math.Between(0, ICE_BUBBLES.length - 1)
      : Phaser.Math.Clamp(selectedIceIndex, 0, ICE_BUBBLES.length - 1);
  return ICE_BUBBLES[i].key;
};

/** dev — 이미 깔린 휴면 과일의 얼음 텍스처·크기를 현재 선택으로 교체. */
export const reskinDormantIce = (img: FruitImage) => {
  const ice = img.getData("iceOverlay") as Phaser.GameObjects.Image | undefined;
  if (!ice) {
    return;
  }
  ice.setTexture(currentIceKey());
  ice.setAlpha(ICE_TUNING.alpha); // 슬라이더 라이브 반영(이미 깔린 휴면에도)
  const d = bodyDiameter(img) * ICE_TUNING.scale;
  ice.setDisplaySize(d, d);
};

/** 불규칙 다각형 점 — 중심에서 각도별 랜덤 반경. 삐죽한 얼음 파편 모양. */
const makeShardPoints = (s: number): Phaser.Types.Math.Vector2Like[] => {
  const c = s / 2;
  const sides = Phaser.Math.Between(5, 7);
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides + Phaser.Math.FloatBetween(-0.35, 0.35);
    const r = (c - 3) * Phaser.Math.FloatBetween(0.45, 1.0);
    pts.push({ x: c + Math.cos(a) * r, y: c + Math.sin(a) * r });
  }
  return pts;
};

/** 얼음 조각 텍스처 — 변형마다 절차적 불규칙 다각(비대칭·뾰족) 1회 생성. */
const ensureShardTextures = (scene: Phaser.Scene) => {
  const s = 28;
  SHARD_TEXS.forEach((key) => {
    if (scene.textures.exists(key)) {
      return;
    }
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const pts = makeShardPoints(s);
    // 순백 베이스(단일 색) — 실제 색은 playShatterParticles 에서 SHARD_COLORS tint 로 입힌다.
    g.fillStyle(0xffffff, 1);
    g.fillPoints(pts, true);
    g.generateTexture(key, s, s);
    g.destroy();
  });
};

const randomShardKey = () =>
  SHARD_TEXS[Phaser.Math.Between(0, SHARD_TEXS.length - 1)];

/** 효과음 preload — Scene.preload 에서 1회. */
export const preloadDormantSounds = (scene: Phaser.Scene) => {
  SHATTER_SOUNDS.forEach((s) => scene.load.audio(s.key, s.src));
};

/** shatter 소리 — 동시 다발이면 throttle(첫 1개만). */
export const playShatterSound = (scene: Phaser.Scene) => {
  if (scene.time.now - lastShatterSoundAt < 90) {
    return;
  }
  lastShatterSoundAt = scene.time.now;
  const s = SHATTER_SOUNDS[Phaser.Math.Between(0, SHATTER_SOUNDS.length - 1)];
  scene.sound.play(s.key, {
    volume: SHATTER_TUNING.volume,
    rate: Phaser.Math.FloatBetween(0.92, 1.1),
  });
};

/**
 * 얼음 조각이 사방으로 튀며 회전·페이드(깨짐 연출).
 * opts.tint: 조각 색(배경에 묻힐 때 대비용). opts.duration: 수명(ms, 기본 SHATTER_TUNING).
 */
export const playShatterParticles = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  baseSize: number,
  opts?: { tint?: number; duration?: number },
) => {
  ensureShardTextures(scene);
  const count = SHATTER_TUNING.count;
  // 사방으로 분사 + 중력으로 포물선 낙하. onUpdate 에서 위치를 직접 적분한다.
  const baseSpeed = Math.max(baseSize * SHATTER_TUNING.distance, 60) * 1.8;
  const g = SHATTER_TUNING.gravity;
  const durMs = opts?.duration ?? SHATTER_TUNING.duration;
  const durSec = durMs / 1000;
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.3, 0.3);
    const speed = baseSpeed * Phaser.Math.FloatBetween(0.7, 1.3);
    const vx = Math.cos(ang) * speed;
    const vy0 = Math.sin(ang) * speed; // 초기 속도(위 음수면 솟았다 떨어짐)
    const rot0 = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const spin = Phaser.Math.FloatBetween(-2.5, 2.5);
    const shard = scene.add
      .image(x, y, randomShardKey())
      .setDepth(20)
      .setRotation(rot0)
      .setScale(
        Phaser.Math.FloatBetween(
          SHATTER_TUNING.scaleMin,
          SHATTER_TUNING.scaleMax,
        ),
      );
    // 베이스가 순백이라 tint 가 곧 조각 색. dev 슬라이더(SHATTER_TUNING.colorIndex)로 선택.
    const tint =
      opts?.tint ?? SHARD_COLORS[SHATTER_TUNING.colorIndex] ?? SHARD_COLORS[0];
    shard.setTint(tint);
    scene.tweens.add({
      targets: shard,
      alpha: 0,
      scale: 0.4,
      duration: durMs,
      ease: "Quad.In",
      onUpdate: (tween) => {
        const t = tween.progress * durSec; // 경과 초
        shard.x = x + vx * t;
        shard.y = y + vy0 * t + 0.5 * g * t * t; // 포물선(중력)
        shard.rotation = rot0 + spin * tween.progress;
      },
      onComplete: () => shard.destroy(),
    });
  }
};

/** dev — 화면 임의 지점에 깨짐 1회(파티클 + 소리) 테스트용. */
export const playShatterTest = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
) => {
  playShatterParticles(scene, x, y, size);
  playShatterSound(scene);
};

/** 휴면 표시 — 얼음 오버레이를 띄워 과일을 가둔다. */
export const applyDormantStyle = (img: FruitImage) => {
  const scene = img.scene;

  // depth 를 따로 안 준다 — 과일 생성 직후 add 되므로 displayList 상 그 과일 바로 위.
  // 그래야 겹쳐 쌓인 휴면 더미에서 얼음이 자기 과일에 붙고 앞뒤 겹침을 대략 따라간다.
  const ice = scene.add
    .image(img.x, img.y, currentIceKey())
    .setAlpha(ICE_TUNING.alpha);
  const d = bodyDiameter(img) * ICE_TUNING.scale;
  ice.setDisplaySize(d, d);

  // 과일이 settle 중 움직이면 따라간다.
  const follow = () => {
    if (!img.active) {
      return;
    }
    ice.setPosition(img.x, img.y);
  };
  scene.events.on(Phaser.Scenes.Events.PRE_UPDATE, follow);

  img.setData("iceOverlay", ice);
  img.setData("iceFollow", follow);
};

/** 휴면 표시 제거 — 깨짐 연출 없이 오버레이·follow 리스너를 조용히 정리(prefill 통째 제거 시). */
export const destroyDormantStyle = (img: FruitImage | null) => {
  if (!img) {
    return;
  }
  const ice = img.getData("iceOverlay") as Phaser.GameObjects.Image | undefined;
  const follow = img.getData("iceFollow") as (() => void) | undefined;
  if (follow) {
    img.scene.events.off(Phaser.Scenes.Events.PRE_UPDATE, follow);
  }
  ice?.destroy();
  img.setData("iceOverlay", null);
  img.setData("iceFollow", null);
};

/** 휴면 해제 — 얼음이 조각으로 깨지며(파티클 + 소리) 사라진다(활성화 시). */
export const clearDormantStyle = (img: FruitImage | null) => {
  if (!img) {
    return;
  }
  const ice = img.getData("iceOverlay") as Phaser.GameObjects.Image | undefined;
  const follow = img.getData("iceFollow") as (() => void) | undefined;
  if (follow) {
    img.scene.events.off(Phaser.Scenes.Events.PRE_UPDATE, follow);
  }
  if (ice) {
    playShatterParticles(img.scene, ice.x, ice.y, ice.displayWidth);
    playShatterSound(img.scene);
    ice.destroy();
  }
  img.setData("iceOverlay", null);
  img.setData("iceFollow", null);
};
