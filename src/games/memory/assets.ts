import AppleImg from "./assets/Apple.png";
import BananaImg from "./assets/Banana.png";
import BombIconImg from "./assets/BombIcon.png";
import StarParticleImg from "./assets/StarParticle.png";
import NovaGlowImg from "./assets/NovaGlow.png";
import NovaGlassImg from "./assets/NovaGlass.png";
import SunburstRaysImg from "./assets/SunburstRays.png";
import FlipSfxSrc from "./assets/GoSuccess3.wav";
import FailSfxSrc from "./assets/CuteCharacter.wav";
import BgmSrc from "./assets/MarimbaAdventure.mp3";

// 단어 → 카드 앞면 이미지. 학습 레이어 단계에서 실제 단어 이미지 세트로 확장한다.
// key 는 Phaser 텍스처 키(preload 에서 로드).
export const WORD_ASSETS = {
  APPLE: { key: "word-apple", src: AppleImg.src },
  BANANA: { key: "word-banana", src: BananaImg.src },
} as const;

export const WORD_ASSET_LIST = Object.values(WORD_ASSETS);

// 폭탄 카드 앞면 아이콘(BOOM 게이지와 같은 도화선 폭탄). key 는 Phaser 텍스처 키.
export const BOMB_ASSET = { key: "card-bomb", src: BombIconImg.src } as const;

// 정답 카드 뒤집기 효과음 — 콤보가 높을수록 피치를 올려 재생. key 는 Phaser 오디오 키.
export const FLIP_SFX = { key: "sfx-flip", src: FlipSfxSrc } as const;

// 라운드 실패 효과음. key 는 Phaser 오디오 키.
export const FAIL_SFX = { key: "sfx-fail", src: FailSfxSrc } as const;

// 배경음악(루프). key 는 Phaser 오디오 키.
export const BGM = { key: "bgm", src: BgmSrc } as const;

// 카드 뒤집기 VFX 별 파티클 텍스처(흰 통통 별). 색은 파티클 tint 로 입힌다.
export const STAR_PARTICLE = {
  key: "vfx-star",
  src: StarParticleImg.src,
} as const;

// 카드 뒤집기 VFX 중앙 흰 빛(nova bloom) 텍스처. 흰색이라 tint 로 색을 입힌다.
export const NOVA_GLOW = {
  key: "vfx-nova",
  src: NovaGlowImg.src,
} as const;

// 카드 뒤집기 VFX 유리구슬 텍스처(굵은 림 + 옅은 면 + 상단 광택).
export const NOVA_GLASS = {
  key: "vfx-glass",
  src: NovaGlassImg.src,
} as const;

// 카드 뒤집기 VFX 방사형 빛살(선버스트) 텍스처. 흰색이라 tint 로 색을 입히고 ADD 로 발광시킨다.
export const SUNBURST_RAYS = {
  key: "vfx-sunburst",
  src: SunburstRaysImg.src,
} as const;
