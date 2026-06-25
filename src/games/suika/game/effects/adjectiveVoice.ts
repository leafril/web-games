import type * as Phaser from "phaser";

import Amazing from "../assets/Amazing.wav";
import Awesome from "../assets/Awesome.wav";
import Big from "../assets/Big.wav";
import Good from "../assets/Good.wav";
import Great from "../assets/Great.wav";
import Huge from "../assets/Huge.wav";
import Juicy from "../assets/Juicy.wav";
import Nice from "../assets/Nice.wav";
import Sweet from "../assets/Sweet.wav";

/** 칭찬 형용사 음성 — 키(형용사)는 comboPraise 의 ADJECTIVES 와 일치한다. */
const VOICES: Record<string, { key: string; src: string }> = {
  Big: { key: "adj-big", src: Big },
  Good: { key: "adj-good", src: Good },
  Nice: { key: "adj-nice", src: Nice },
  Great: { key: "adj-great", src: Great },
  Sweet: { key: "adj-sweet", src: Sweet },
  Juicy: { key: "adj-juicy", src: Juicy },
  Awesome: { key: "adj-awesome", src: Awesome },
  Huge: { key: "adj-huge", src: Huge },
  Amazing: { key: "adj-amazing", src: Amazing },
};

/** preload 단계에서 형용사 음성 9종을 로드. */
export const preloadAdjectiveVoices = (scene: Phaser.Scene) => {
  Object.values(VOICES).forEach((v) => scene.load.audio(v.key, v.src));
};

/**
 * 형용사 음성 1회 재생 후 onEnd 콜백 — 칭찬에서 "형용사 → 과일 발음" 순차 재생용.
 * 해당 형용사 클립이 없으면 즉시 onEnd 로 떨어진다(과일 발음은 그대로 이어짐).
 */
export const playAdjectiveVoice = (
  scene: Phaser.Scene,
  adjective: string,
  onEnd?: () => void,
) => {
  const voice = VOICES[adjective];
  if (!voice) {
    onEnd?.();
    return;
  }
  const sound = scene.sound.add(voice.key);
  sound.once("complete", () => {
    sound.destroy();
    onEnd?.();
  });
  sound.play();
};
