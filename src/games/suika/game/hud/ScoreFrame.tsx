import { ICY, ICY_TEXT } from "./constants";
import { RollingNumber } from "./RollingNumber";
import { formatScoreK } from "./formatScore";

type ScoreFrameProps = {
  score: number;
};

/**
 * 중앙 현재 점수 프레임 — 아이시 글래스 pill + 룰렛 숫자(스티커 톤). hero 라 형제(최고점수·게이지)와
 * 같은 ICY 팔레트를 공유하되 가운데에서 위계를 가진다. 폰트·둥글기는 cqh(바깥 wrapper 높이 기준).
 */
export const ScoreFrame = ({ score }: ScoreFrameProps) => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ICY.fill,
        border: ICY.border,
        borderRadius: "18cqh",
        boxShadow: ICY.shadow,
        overflow: "hidden",
      }}
    >
      <span
        style={{
          ...ICY_TEXT,
          // 프레임 높이 기준 — cqh = 컨테이너(프레임) 높이 1%.
          fontSize: "64cqh",
          WebkitTextStroke: `0.1em ${ICY.textStroke}`,
          paintOrder: "stroke fill",
          lineHeight: 1,
        }}
      >
        <RollingNumber text={formatScoreK(score)} />
      </span>
    </div>
  );
};
