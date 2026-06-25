type HapticType = "light" | "medium" | "heavy";

/**
 * 햅틱 피드백. 지원되는 브라우저에서만 navigator.vibrate 로 가벼운 진동을 준다.
 * fire-and-forget — 실패해도 UX 에 영향 없음.
 */
export const playHaptic = (type: HapticType): void => {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }
  const ms = type === "heavy" ? 16 : type === "medium" ? 10 : 6;
  try {
    navigator.vibrate(ms);
  } catch {
    // best-effort
  }
};
