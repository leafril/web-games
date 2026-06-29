import { useEffect, useRef, useState } from "react";

import { PILL, SIDE_ICON_SIZE } from "./constants";
import { SEMANTIC } from "../tokens";
import BombIconImg from "../assets/BombIcon.png";

type BoomGaugeProps = {
  /** 0..1 — 다음 폭탄까지 게이지 채움(정답 카드마다 충전). */
  fillRatio: number;
  /** 적립된 폭탄 수(라운드에서 소진). */
  banked: number;
};

/**
 * BOOM 게이지 — drop 능력 게이지의 아이시 셸 + 깊은 well + 시안 채움을 가로 막대로 편 것.
 * 카드 그리드 바로 위 좌측에 둔다(원래 위치). 폭발 아이콘은 좌변에 절반 오버랩, 적립 폭탄 수를
 * 게이지 가운데에 띄운다. 가득 차면 폭탄 1개 적립 후 0 으로 스냅(드레인 없이 즉시).
 */
export const BoomGauge = ({ fillRatio, banked }: BoomGaugeProps) => {
  const clampedFill = Math.min(Math.max(fillRatio, 0), 1);
  // 이전 fill 비교는 렌더 중 state 보정(React 공식 패턴). 줄 때(폭탄 적립 리셋)는 스냅.
  const [prevFill, setPrevFill] = useState(clampedFill);
  const isDraining = clampedFill < prevFill;
  if (clampedFill !== prevFill) {
    setPrevFill(clampedFill);
  }

  const iconRef = useRef<HTMLDivElement>(null);
  const prevBankedRef = useRef(banked);

  // 폭탄이 새로 적립되는 순간 아이콘이 톡 튀어오르는 팡 1회.
  useEffect(
    function popOnBank() {
      if (banked !== prevBankedRef.current) {
        iconRef.current?.animate(
          [
            { transform: "scale(1)", offset: 0 },
            { transform: "scale(1.5)", offset: 0.35 },
            { transform: "scale(0.9)", offset: 0.6 },
            { transform: "scale(1.12)", offset: 0.8 },
            { transform: "scale(1)", offset: 1 },
          ],
          { duration: 480, easing: "ease-out" },
        );
      }
      prevBankedRef.current = banked;
    },
    [banked],
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        containerType: "size",
      }}
    >
      {/* 게이지 셸 — 아이시 형제 틴트(PILL 팔레트 공유). */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: PILL.fill,
          border: PILL.border,
          borderRadius: "9999px",
          boxShadow: PILL.shadow,
          overflow: "hidden",
          padding: "8cqh",
          boxSizing: "border-box",
        }}
      >
        {/* 내부 트랙 — 깊은 아이시 well. 채움만 보이고 텍스트는 없다. */}
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
          {/* 흰 헤드(바닥) — 충전마다 즉시 목표치로 앞서 늘어난다. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${clampedFill * 100}%`,
              background: "rgba(255,255,255,0.92)",
              transition: isDraining ? "none" : "width 0.1s linear",
            }}
          />
          {/* 채움(위) — 주색상(BOOM 은 긍정 보상) + 윗면 흰 sheen. 줄 때는 스냅. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${clampedFill * 100}%`,
              background: `linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%), ${SEMANTIC.primary}`,
              transition: isDraining ? "none" : "width 0.5s ease-out",
            }}
          />
        </div>
      </div>

      {/* 폭탄 아이콘 — 중앙을 프레임 우변(left 100%)에 맞춤(우측 절반 오버랩).
          (안쪽 iconRef 의 팝 scale 애니메이션은 이 변환과 합성된다). */}
      <div
        style={{
          position: "absolute",
          left: "100%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: SIDE_ICON_SIZE,
          height: SIDE_ICON_SIZE,
        }}
      >
        <div
          ref={iconRef}
          style={{
            width: "100%",
            height: "100%",
            backgroundImage: `url(${BombIconImg.src})`,
            backgroundSize: "80%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>
    </div>
  );
};
