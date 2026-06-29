import { PILL } from "./constants";
import { RollingNumber } from "./RollingNumber";
import { SEMANTIC } from "../tokens";
import { textOutline } from "../typography";

/** 게이지 채움 윗면 광택 — 타이머·BOOM 게이지와 같은 톤. */
const SHEEN =
  "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%)";

type ScoreFrameProps = {
  score: number;
};

/**
 * 중앙 현재 점수 프레임 — 게이지(타이머·BOOM)와 같은 이중 보더: 아이시 셸 + 깊은 트랙. 트랙을
 * 주색상(바다색)으로 채우고 숫자는 공용 외곽선형(흰 채움 + 시안 윤곽)으로 얹는다. hero 라 형제
 * (레벨·게이지)와 같은 PILL 팔레트를 공유하되 가운데에서 위계를 가진다. 폰트·둥글기는 cqh(셸 높이 기준).
 */
export const ScoreFrame = ({ score }: ScoreFrameProps) => {
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
        // 게이지(8cqh)와 같은 절대 두께 — 점수 프레임이 더 높아 같은 px 를 내려면 더 낮은 cqh.
        padding: "4.5cqh",
        boxSizing: "border-box",
      }}
    >
      {/* 내부 트랙 — 주색상(바다색) 채움 + 윗면 sheen + 깊은 inset(게이지 well 톤). */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `${SHEEN}, ${SEMANTIC.primary}`,
          borderRadius: "9999px",
          boxShadow: "inset 0 1px 3px rgba(40,70,110,0.5)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            // 외곽선형 — 흰 채움 + ink 윤곽. 시안 트랙 위에서 또렷.
            ...textOutline(),
            fontSize: "64cqh",
            lineHeight: 1,
          }}
        >
          <RollingNumber text={String(score)} />
        </span>
      </div>
    </div>
  );
};
