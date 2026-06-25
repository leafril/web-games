import { BEST_ICON_SIZE, ICY, ICY_TEXT } from "./constants";
import { formatCompactScore } from "./formatScore";

type BestScoreFrameProps = {
  icon?: string;
  best: number;
};

/**
 * 최고 점수 프레임 — 능력 게이지와 같은 레이아웃(아이시 프레임 + 내부 패딩 + 좌측 오버랩 아이콘).
 * 차이는 fill·카운트 대신 최고 점수 숫자를 가운데 둔 것뿐.
 */
export const BestScoreFrame = ({ icon, best }: BestScoreFrameProps) => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        containerType: "size",
      }}
    >
      {/* 프레임 — 능력 게이지와 동일 레이아웃, 아이시 형제 틴트(ICY 공유). */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: ICY.fill,
          border: ICY.border,
          borderRadius: "18cqh",
          boxShadow: ICY.shadow,
          overflow: "hidden",
          padding: "6cqh",
          boxSizing: "border-box",
        }}
      >
        {/* 내부 트랙 — 아이콘이 덮는 왼쪽만큼 paddingLeft 로 숫자를 "아이콘 오른쪽 공간" 가운데로. */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: "10cqh",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: "36cqh",
          }}
        >
          <span
            style={{
              ...ICY_TEXT,
              fontSize: "52cqh",
              WebkitTextStroke: `0.12em ${ICY.textStroke}`,
              paintOrder: "stroke fill",
              lineHeight: 1,
            }}
          >
            {formatCompactScore(best)}
          </span>
        </div>
      </div>

      {/* 아이콘 — 중앙을 프레임 좌변(left 0)에 맞춤(좌측 절반 오버랩). 프레임 위치(left 8%)가 왼쪽 여백을
          줘 화면 밖 클립 방지. 숫자는 paddingLeft 로 밀려 안 겹침. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: BEST_ICON_SIZE,
          height: BEST_ICON_SIZE,
          background: "transparent",
          backgroundImage: icon ? `url(${icon})` : undefined,
          backgroundSize: "80%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
};
