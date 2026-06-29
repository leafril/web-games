/**
 * Scene → React HUD 데이터 계약. WireframeScene 이 상태가 바뀔 때마다 호출하고, GameShell 이
 * 받아 DOM HUD 를 채운다(drop 의 onScore/onGauge 합성과 동일 패턴). 씬은 React 외부라 registry
 * 로 주입받는다(`registry.get("memoryHud")`).
 */
export type MemoryHudConfig = {
  /** 점수 변동. */
  onScore?: (score: number) => void;
  /** 콤보 변동(0 이면 끊김). */
  onCombo?: (combo: number) => void;
  /** BOOM 게이지 — 채움 비율(0..1)·적립 폭탄 수. */
  onBoom?: (ratio: number, banked: number) => void;
  /** 게임 타이머 — 남은 비율(0..1)·남은 초. */
  onTimer?: (ratio: number, seconds: number) => void;
  /** 전체 시간 종료(게임 오버 오버레이 트리거). */
  onGameOver?: () => void;
};
