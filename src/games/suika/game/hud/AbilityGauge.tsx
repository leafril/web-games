import { useEffect, useRef, useState } from "react";

import { GAUGE_ICON_SIZE, ICY, ICY_TEXT } from "./constants";

type AbilityGaugeProps = {
  icon?: string;
  /** 0..1 — 게이지바 채움(머지 게이지 진행). */
  fillRatio: number;
  /** 현재 뱅크된 발사 카운트. */
  current: number;
  /** 발사 카운트 상한. */
  max: number;
  /** 충전 번개가 아이콘에 빨려든 순간마다 +1 — 이 값이 바뀌면 아이콘을 펄스(도착 타이밍에 맞춤). */
  pulse: number;
};

/**
 * 능력 게이지 — 아이시 셸 + 깊은 well 트랙 + 시안 채움 + 카운트 + 좌측 오버랩 아이콘.
 * 끝까지 차면(충전·발사로 0 리셋) 드레인 애니메이션 없이 즉시 0 으로 스냅 → 카운트만 올라가고
 * 게이지는 처음(0)부터 다시 차오른다. 늘어날 때만 width 를 보간한다.
 */
export const AbilityGauge = ({
  icon,
  fillRatio,
  current,
  max,
  pulse,
}: AbilityGaugeProps) => {
  const clampedFill = Math.min(Math.max(fillRatio, 0), 1);
  // 이전 fill 비교는 렌더 중 state 보정(React 공식 패턴) — ref mutate 는 StrictMode 이중 렌더에서
  // 깨져 스냅이 안 먹으므로 setState 패턴을 쓴다.
  const [prevFill, setPrevFill] = useState(clampedFill);
  const isDraining = clampedFill < prevFill;
  if (clampedFill !== prevFill) {
    setPrevFill(clampedFill);
  }

  const iconRef = useRef<HTMLDivElement>(null);
  const prevPulseRef = useRef(pulse);

  // 충전 번개가 아이콘에 빨려든 순간(pulse 증가) — 아이콘이 톡 튀어오르는 팡 1회. 카운트 증가 즉시가
  // 아니라 번개 도착 타이밍에 맞춘다. positioning 과 충돌 없게 inner 에 scale.
  useEffect(
    function popOnArrive() {
      if (pulse !== prevPulseRef.current) {
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
      prevPulseRef.current = pulse;
    },
    [pulse],
  );

  return (
    // containerType: size → 자식이 cqh(컨테이너 높이 단위)로 축 무관하게 크기·오프셋을 잡는다.
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        containerType: "size",
      }}
    >
      {/* 게이지 셸 — 아이시 형제 틴트(ICY 팔레트 공유). 얇은 내부 패딩으로 fill 을 안쪽에 가둠. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: ICY.fill,
          border: ICY.border,
          borderRadius: "18cqh",
          boxShadow: ICY.shadow,
          overflow: "hidden",
          padding: "4cqh",
          boxSizing: "border-box",
        }}
      >
        {/* 내부 트랙 — 빈 구간은 깊은 아이시(WELL)로 둬 시안 fill 이 또렷하게 얹히게. inset 으로 우묵. */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: ICY.gaugeWell,
            borderRadius: "10cqh",
            boxShadow: "inset 0 1px 3px rgba(40,70,110,0.5)",
            overflow: "hidden",
          }}
        >
          {/* 흰 헤드(바닥) — 머지마다 즉시 목표치로 앞서 늘어난다. 빠른 보간이라 시안보다 항상
              먼저 도달 → 시안이 덮지 못한 우측 구간이 흰 헤드로 노출(잔상 추격의 "예상 상승량"). */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${clampedFill * 100}%`,
              background: "rgba(255,255,255,0.92)",
              transition: isDraining ? "none" : "width 0.1s linear",
            }}
          />
          {/* 채움(위) — Fill 시안(#3CFFFF) + 윗면 흰 sheen. 느린 ease 로 흰 헤드를 뒤따라 덮으며
              수렴 → 연쇄가 끝나 머지가 멎으면 흰 헤드까지 주욱 채워진다. 줄 때(발사·충전 차감)는 스냅. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${clampedFill * 100}%`,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 45%), #3CFFFF",
              transition: isDraining ? "none" : "width 0.5s ease-out",
            }}
          />
          {/* 카운트 텍스트 — 게이지 중앙 오버레이(아이시 톤). */}
          <span
            style={{
              ...ICY_TEXT,
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "52cqh",
              WebkitTextStroke: `0.12em ${ICY.textStroke}`,
              paintOrder: "stroke fill",
            }}
          >
            {current}/{max}
          </span>
        </div>
      </div>

      {/* 능력 아이콘 — 가로중심을 프레임 오른쪽 변(x=100%)에 맞춤, 세로는 가운데. 우측으로 절반 오버랩.
          outer 가 위치·크기, inner(ref) 가 아이콘 그리기 + 충전 연출(scale 팡·글로우 맥동)을 맡는다. */}
      <div
        style={{
          position: "absolute",
          left: "100%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: GAUGE_ICON_SIZE,
          height: GAUGE_ICON_SIZE,
        }}
      >
        <div
          ref={iconRef}
          style={{
            width: "100%",
            height: "100%",
            background: "transparent",
            backgroundImage: icon ? `url(${icon})` : undefined,
            backgroundSize: "80%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>
    </div>
  );
};
