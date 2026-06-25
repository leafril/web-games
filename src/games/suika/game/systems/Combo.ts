/**
 * 전역 연속 머지 콤보 — 위치·사슬 구분 없이 전체에서 하나의 카운터. window 안에 머지가
 * 이어지면(어디서 일어나든) +1, 끊기면 0. 표시 위치만 호출부가 머지 지점으로 준다.
 *
 * scene 불필요(순수 상태+계산) — 시간은 호출부가 nowMs 로 주입한다.
 */
const COMBO_WINDOW_MS = 1200;

export class Combo {
  private count = 0;
  private maxCount = 0;
  private lastAt = 0;

  /** 머지 1회. window 안이면 +1, 벗어났으면 1부터 다시. 현재 카운트를 돌려준다. */
  bump(nowMs: number): number {
    if (nowMs - this.lastAt > COMBO_WINDOW_MS) {
      this.count = 0;
    }
    this.count += 1;
    this.lastAt = nowMs;
    this.maxCount = Math.max(this.maxCount, this.count);
    return this.count;
  }

  /** 매 프레임 — window 가 지나면 콤보가 끊긴 것으로 본다. */
  update(nowMs: number) {
    if (this.count > 0 && nowMs - this.lastAt > COMBO_WINDOW_MS) {
      this.count = 0;
    }
  }

  reset() {
    this.count = 0;
    this.maxCount = 0;
    this.lastAt = 0;
  }

  get current() {
    return this.count;
  }

  get max() {
    return this.maxCount;
  }
}
