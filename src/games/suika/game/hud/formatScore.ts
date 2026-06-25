/**
 * 현재 점수 표기 — 1000 미만은 그대로, 1000 이상은 1자리 내림 K(룰렛이 굴릴 짧은 형태).
 * (예: 1234 → "1.2K", 9999 → "9.9K", 12345 → "12K")
 */
export const formatScoreK = (score: number): string => {
  if (score < 1000) {
    return `${score}`;
  }
  const k = Math.floor(score / 100) / 10;
  if (k < 10) {
    return `${k}K`;
  }
  return `${Math.floor(score / 1000)}K`;
};

/**
 * 최고 점수 컴팩트 표기 — K/M/B, 소수 2자리(뒤 0 제거). (예: 5550 → "5.55K", 4390 → "4.39K")
 * 현재 점수(formatScoreK)보다 정밀해 최고기록을 또렷이 보여준다.
 */
export const formatCompactScore = (n: number): string => {
  const units = [
    { v: 1_000_000_000, s: "B" },
    { v: 1_000_000, s: "M" },
    { v: 1_000, s: "K" },
  ];
  for (const { v, s } of units) {
    if (n >= v) {
      return (n / v).toFixed(2).replace(/\.?0+$/, "") + s;
    }
  }
  return String(n);
};
