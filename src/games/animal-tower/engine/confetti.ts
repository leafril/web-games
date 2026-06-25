export type ConfettiPiece = {
  side: "left" | "right";
  w: number;
  h: number;
  r: number;
  color: string;
  fx: number;
  fy: number;
  rot: number;
  dur: number;
  delay: number;
};

const CONFETTI_COUNT = 42;
const CONFETTI_COLORS = [
  "#ffd34d",
  "#ff5b6e",
  "#1ec9a9",
  "#3aa6ff",
  "#ff8a3d",
  "#fff",
  "#8b3ed1",
];

const round = (n: number, digits = 1): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/** 마일스톤 축하 색종이 조각 생성(좌우로 흩뿌림). */
export const buildConfettiPieces = (): ConfettiPiece[] => {
  const out: ConfettiPiece[] = [];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const isLeft = i % 2 === 0 ? Math.random() < 0.9 : Math.random() < 0.1;
    const sign = isLeft ? 1 : -1;
    const fx = sign * (340 + Math.random() * 320);
    const fy = 280 + Math.random() * 180;
    const rot = (Math.random() * 720 + 360) * (Math.random() > 0.5 ? 1 : -1);
    const shape = Math.random();
    let w: number;
    let h: number;
    let r: number;
    if (shape < 0.5) {
      w = 4 + Math.random() * 3;
      h = 11 + Math.random() * 9;
      r = 1.5;
    } else if (shape < 0.82) {
      w = 7 + Math.random() * 5;
      h = w * (0.8 + Math.random() * 0.4);
      r = 1.5;
    } else {
      w = 5 + Math.random() * 4;
      h = w;
      r = w / 2;
    }
    out.push({
      side: isLeft ? "left" : "right",
      w: round(w),
      h: round(h),
      r: round(r),
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ??
        "#ffd34d",
      fx: Math.round(fx),
      fy: Math.round(fy),
      rot: Math.round(rot),
      dur: round(2.0 + Math.random() * 0.9, 2),
      delay: round(Math.random() * 0.3, 2),
    });
  }
  return out;
};
