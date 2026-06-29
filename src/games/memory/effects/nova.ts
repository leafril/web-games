// 카드 뒤집기 VFX — 방사형 빛살(선버스트) + 중앙 흰 빛(nova bloom) + 그 주위로 커지는 원형 글라스 구체.

import { NOVA_GLOW, NOVA_GLASS, SUNBURST_RAYS } from "../assets";

const GLOW_TINT = 0xffdf7a; // 빛 — 밝은 골드
const RAY_TINT = 0xffe9a3; // 빛살 — glow 보다 옅은 골드(뒤로 깔려 은은하게)

/**
 * 지정 좌표에서 방사형 빛살이 회전하며 퍼지고, 중앙 흰 빛이 번지며, 그 둘레로 투명 글라스 구체
 * (밝은 림)가 커지며 사라진다. size 는 보통 카드 폭.
 */
export const playNovaBurst = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): void => {
  // 0) 방사형 빛살 — 카드보다 뒤(depth -10, 배경 -100 위)에서 굵기는 고정한 채 길이만 짧게 시작해
  // 바깥으로 뻗으며 사라진다. 카드가 중심을 가려 가운데는 빛살이 안 보이고, 카드 틈·구슬 바깥으로만
  // 새어나온다. ADD 블렌드 → 배경에 빛을 더해 발광. 빛살 굵기·바깥 페이드는 텍스처에서(레퍼런스 톤).
  const rays = scene.add.image(x, y, SUNBURST_RAYS.key);
  rays.setDepth(-10);
  rays.setTint(RAY_TINT);
  rays.setBlendMode("ADD");
  rays.setScale((size * 1.5) / rays.width); // 최종 길이로 고정(scale 로 굵기가 변하지 않게)
  rays.setAlpha(0.38);

  // 중심에서 바깥으로 자라는 원형 마스크로 빛살을 점점 드러낸다 — 길이가 짧→길게 뻗는 효과.
  // scale 을 키우면 굵기까지 커지므로, 굵기는 고정하고 reveal 반경만 키운다.
  const maskG = scene.make.graphics({}, false);
  const reveal = { r: size * 0.05 };
  const drawReveal = () => {
    maskG.clear();
    maskG.fillStyle(0xffffff);
    maskG.fillCircle(x, y, reveal.r);
  };
  drawReveal();
  rays.setMask(maskG.createGeometryMask());

  scene.tweens.add({
    targets: reveal,
    r: size * 0.9,
    duration: 440,
    ease: "Cubic.easeOut",
    onUpdate: drawReveal,
  });
  // 페이드아웃 종료(=빛살 소멸) 시점을 유리구슬 tween(460ms)과 맞춘다(생존시간 동일).
  scene.tweens.add({
    targets: rays,
    alpha: 0,
    delay: 180,
    duration: 280,
    ease: "Cubic.easeIn",
    onComplete: () => {
      rays.destroy();
      maskG.destroy();
    },
  });

  // 1) 중앙 빛 bloom — 작게 시작해 카드만큼 커지며 사라진다.
  // ADD 블렌드 → 배경 색에 더해져 어떤 배경에서도 발광(노란 배경+골드도 밝게 뜬다).
  const glow = scene.add.image(x, y, NOVA_GLOW.key);
  glow.setDepth(48);
  glow.setTint(GLOW_TINT);
  glow.setBlendMode("ADD");
  glow.setScale((size * 0.35) / glow.width);
  glow.setAlpha(0.6);
  scene.tweens.add({
    targets: glow,
    scale: (size * 1.15) / glow.width,
    alpha: 0,
    duration: 420,
    ease: "Cubic.easeOut",
    onComplete: () => glow.destroy(),
  });

  // 2) 유리구슬 — 굵은 림 + 옅은 면 + 상단 광택 텍스처가 커지며 사라진다.
  const glass = scene.add.image(x, y, NOVA_GLASS.key);
  glass.setDepth(49); // 흰 빛(48) 위, 별 파티클(50) 아래
  const base = size / glass.width; // 구체 지름 ≈ 카드 폭
  glass.setScale(base * 0.4);
  scene.tweens.add({
    targets: glass,
    scale: base * 1.3,
    alpha: 0,
    duration: 460,
    ease: "Cubic.easeOut",
    onComplete: () => glass.destroy(),
  });
};
