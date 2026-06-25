type AudioChain = {
  ctx: AudioContext;
  master: GainNode;
};

const MASTER_GAIN_LEVEL = 0.7;

let chain: AudioChain | undefined;

/** 게임 공용 AudioContext + master GainNode 를 lazily 생성하고 필요 시 resume 한다. */
export const getAudioChain = (): AudioChain => {
  if (!chain) {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.setValueAtTime(MASTER_GAIN_LEVEL, ctx.currentTime);
    master.connect(ctx.destination);
    chain = { ctx, master };
  }
  if (chain.ctx.state === "suspended") {
    void chain.ctx.resume();
  }
  return chain;
};

/**
 * 사용자 제스처(touchstart/click)에서 호출. AudioContext resume + 무음 버퍼 재생으로
 * 모바일 브라우저의 오디오를 unlock 한다.
 */
export const unlockAudio = (): void => {
  const { ctx } = getAudioChain();
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
};

/** master gain 으로 라우팅된 오실레이터 톤(지수 감쇠). */
export const playTone = (
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  vol = 0.15,
): void => {
  const { ctx, master } = getAudioChain();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + duration);
};
