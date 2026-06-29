import { PILL } from "./constants";
import { SEMANTIC } from "../tokens";
import { textOutline } from "../typography";
import ClockIconImg from "../assets/ClockIcon.png";

/** fill 위 대각선 스트라이프(45° 흰 빗금) — 채움이 비치볼/물결 느낌. */
const STRIPE =
  "repeating-linear-gradient(-45deg, rgba(255,255,255,0.1) 0, rgba(255,255,255,0.1) 9px, rgba(255,255,255,0) 9px, rgba(255,255,255,0) 20px)";
/** fill 윗면 흰 sheen(상단 광택). */
const SHEEN =
  "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%)";

type TimerBarProps = {
  /** 0..1 — 남은 시간 비율. */
  ratio: number;
  /** 남은 초(올림). */
  seconds: number;
};

/** 남은 시간이 이 비율 이하면 fill 을 경고색(따뜻한 빨강)으로. */
const LOW_RATIO = 0.2;

/**
 * 하단 게임 타이머 — drop 능력 게이지와 같은 아이시 셸 + 깊은 well 을 가로로 길게 편 막대.
 * 남은 시간만큼 시안으로 차 있고, 임박하면 경고색으로 바뀐다. 가운데에 남은 초를 띄운다.
 */
export const TimerBar = ({ ratio, seconds }: TimerBarProps) => {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const low = clamped <= LOW_RATIO;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        containerType: "size",
        background: PILL.fill,
        border: PILL.border,
        borderRadius: "9999px",
        boxShadow: PILL.shadow,
        overflow: "hidden",
        padding: "8cqh",
        boxSizing: "border-box",
      }}
    >
      {/* 내부 트랙 — 깊은 아이시 well. */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: PILL.gaugeWell,
          borderRadius: "9999px",
          boxShadow: "inset 0 1px 3px rgba(40,70,110,0.5)",
          overflow: "hidden",
        }}
      >
        {/* 남은 시간 fill — 좌→우로 줄어든다. 임박하면 경고색. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${clamped * 100}%`,
            // 대각선 스트라이프(맨 위) → 윗면 sheen → 베이스 색. 임박하면 베이스만 경고색.
            background: low
              ? `${STRIPE}, ${SHEEN}, ${SEMANTIC.danger}`
              : `${STRIPE}, ${SHEEN}, ${SEMANTIC.primary}`,
            // 씬이 1초마다 비율을 갱신 → 1s linear 로 그 사이를 부드럽게 채운다(연속 드레인처럼 보임).
            transition: "width 1s linear",
          }}
        />
        {/* 남은 초 — 트랙 중앙 오버레이. 왼쪽에 시계 아이콘. */}
        <span
          style={{
            // 외곽선형 — 흰 채움 + ink 윤곽. 가변 배경(시안 fill·모래 트랙) 둘 다에서 또렷.
            ...textOutline(),
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.18em",
            // 기본 62cqh 의 1.5배.
            fontSize: "93cqh",
          }}
        >
          {/* 시계 아이콘 — 흰 실루엣 PNG. 숫자 높이에 비례(em). */}
          <span
            aria-hidden
            style={{
              width: "0.85em",
              height: "0.85em",
              flexShrink: 0,
              backgroundImage: `url(${ClockIconImg.src})`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          />
          {seconds}
        </span>
      </div>
    </div>
  );
};
