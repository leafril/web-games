/**
 * 게임 코어 공개 타입 — 호스트(모노레포 어댑터 또는 분리된 레포)와 주고받는 경계.
 * BE·모노레포 타입에 의존하지 않는다(self-contained). 어댑터가 BE 응답을 MergeObject 로 변환해 주입하고,
 * GameResult 를 받아 세션 로그·결과 화면으로 변환한다.
 */

/**
 * 머지되는 객체 한 항목(과일·얼음 등 테마 무관). `name`(체인 키 obj_01…)으로 게임 내부 단계와 결합한다.
 * imageUrl·audioUrl 은 선택 — 없으면 게임이 로컬 얼음 에셋·무음으로 fallback 한다(서버 없이 동작).
 */
export type MergeObject = {
  /** 진화 체인 키 — obj_01…obj_11. 게임 내부 CHAIN name 과 일치해야 결합된다. */
  name: string;
  /** 화면·콜아웃에 노출하는 표시 라벨(영어 단어 등). */
  label: string;
  /** 객체 이미지 URL. 없으면 로컬 얼음 테마(FRUIT_OVERRIDES)로 fallback. */
  imageUrl?: string;
  /** 발음·효과음 MP3 URL. 없으면 무음. */
  audioUrl?: string;
};

/** 게임이 만난 객체 한 항목(결과 집계). 호스트가 BE wordEncounters 등으로 변환한다. */
export type MergedObject = {
  name: string;
  label: string;
  count: number;
};

/** 게임 종료 결과 — 호스트가 받아 결과 화면·세션 로그로 변환한다. */
export type GameResult = {
  score: number;
  /** 도달 깊이(활성 tier) — 엔드리스라 클리어 개념 없이 깊이를 성과로 쓴다. */
  level: number;
  mergedObjects: MergedObject[];
  /** ISO 8601 — 플레이 시작·종료. */
  startedAt: string;
  endedAt: string;
};

/**
 * 게임 부팅 설정 — 진입점(GameContainer)에 넘기는 모든 외부 의존.
 * 전부 선택값이라 설정 없이도 로컬 얼음 테마·무음으로 부팅된다(개발·분리 환경).
 */
export type DropGameConfig = {
  /** 머지 객체 풀. 없으면 게임 내장 CHAIN + 로컬 얼음 에셋으로 동작. */
  objects?: MergeObject[];
  /** Phaser Text 폰트 family(호스트 주입). 없으면 시스템 sans-serif. */
  fontFamily?: string;
  /** 역대 최고 점수(BE bestScores). HUD best 프레임 초기값 — 없으면 0. */
  initialBest?: number;
  /** 네이티브 햅틱 재생 어댑터(머지 등). 없으면 no-op. type 은 lib/haptic 의 패턴 subset. */
  playHaptic?: (type: "light" | "medium" | "heavy") => void;
  /**
   * 발음·효과음 재생 어댑터. 없으면 무음.
   * priority=true(칭찬·6단계 과일 발음)는 재생 중인 발음을 끊고 무조건 재생한다 —
   * drop 음성 등 일반 발음에 막히지 않게. 기본(false)은 다른 발음 진행 중이면 건너뛴다.
   */
  playAudio?: (
    url: string,
    label: string,
    options?: { priority?: boolean },
  ) => void;
  /** 점수·도달 깊이 변동 시. */
  onScore?: (score: number, level: number) => void;
  /** 능력 게이지 변동 시(채움 비율·뱅크 카운트). */
  onGauge?: (ratio: number, charges: number, maxCharges: number) => void;
  /** 충전 번개가 게이지 아이콘에 빨려든 순간 — 호스트가 아이콘을 펄스시킨다(카운트 증가와 별개 타이밍). */
  onChargeArrive?: () => void;
  /** 객체가 등장(매달림)할 때 — name 으로 호스트가 집계. */
  onObjectMerge?: (name: string) => void;
  /** 최종 단계(파인애플)를 처음 완성했을 때 1회 — 진화바 실루엣 공개용. */
  onApexUnlock?: () => void;
  /** 게임 오버 시. */
  onGameEnd?: (result: GameResult) => void;
  /** 일시정지 중 홈(로비)으로 나가기 — 호스트(라우트)가 네비게이션 제공. 없으면 홈 버튼 미표시. */
  onExit?: () => void;
};
