import { useEffect, useRef, useState } from "react";

import { SEMANTIC } from "../tokens";
import { textBubble } from "../typography";

type ComboTextProps = {
  /** 현재 콤보 수. 2 미만이면 표시하지 않는다. */
  combo: number;
};

const COMBO_LABEL = "COMBO";

/** 이 콤보 이상이면 COMBO 라벨을 글자별 레인보우로 — 마일스톤 보상 연출. */
const COMBO_RAINBOW_AT = 10;
/** COMBO 5글자 글자별 채움색(파스텔 무지개). 외곽선·익스트루드(ink)는 부모서 상속. */
const RAINBOW = ["#ff9eb5", "#ffd36e", "#86db74", "#5fd3ec", "#c79bff"];
/** 마일스톤(10콤보+) 숫자 채움 — 밝은 레몬 골드(토큰). */
const MILESTONE_GOLD = SEMANTIC.milestoneGold;

/** 4각 반짝임 별 모양(clip-path). */
const STAR_CLIP =
  "polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)";

/** 마일스톤 버스트 별 — 숫자 중심 기준 각도(deg)·거리(cqh)·크기(cqh)·시작지연(ms). 고정 배열로 매번 같은 패턴. */
const BURST_STARS = [
  { angle: -90, dist: 62, size: 18, delay: 0 },
  { angle: -38, dist: 70, size: 12, delay: 70 },
  { angle: 18, dist: 60, size: 16, delay: 130 },
  { angle: 68, dist: 54, size: 11, delay: 40 },
  { angle: 128, dist: 66, size: 15, delay: 110 },
  { angle: 180, dist: 58, size: 11, delay: 160 },
  { angle: -142, dist: 64, size: 14, delay: 90 },
] as const;

/**
 * 10의 배수 콤보를 찍는 순간 1회 재생하는 축하 버스트 — 퍼지는 링(ripple) + 둘레 별 반짝임.
 * 부모서 key 로 remount 시켜 매 마일스톤마다 처음부터 다시 튼다.
 */
const MilestoneBurst = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(function playBurst() {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const ripple = root.querySelector<HTMLElement>("[data-ripple]");
    const rippleAnim = ripple?.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.4)", opacity: 0.9 },
        { transform: "translate(-50%, -50%) scale(1.8)", opacity: 0 },
      ],
      { duration: 700, easing: "ease-out", fill: "forwards" },
    );
    const stars = Array.from(root.querySelectorAll<HTMLElement>("[data-star]"));
    const starAnims = stars.map((star) =>
      star.animate(
        [
          {
            transform: "translate(-50%, -50%) scale(0)",
            opacity: 0,
            offset: 0,
          },
          {
            transform: "translate(-50%, -50%) scale(1)",
            opacity: 1,
            offset: 0.4,
          },
          {
            transform: "translate(-50%, -50%) scale(0)",
            opacity: 0,
            offset: 1,
          },
        ],
        {
          duration: 650,
          delay: Number(star.dataset.delay),
          easing: "ease-out",
          fill: "forwards",
        },
      ),
    );
    return function stopBurst() {
      rippleAnim?.cancel();
      starAnims.forEach((anim) => anim.cancel());
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {/* 퍼지는 링 — 숫자 중심에서 바깥으로 번지며 사라진다. */}
      <span
        data-ripple
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "120cqh",
          height: "120cqh",
          borderRadius: "50%",
          border: "3cqh solid rgba(255, 238, 160, 0.85)",
          opacity: 0,
        }}
      />
      {BURST_STARS.map((star, i) => {
        const rad = (star.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * star.dist;
        const dy = Math.sin(rad) * star.dist;
        return (
          <span
            key={`${star.angle}-${i}`}
            data-star
            data-delay={star.delay}
            style={{
              position: "absolute",
              left: `calc(50% + ${dx}cqh)`,
              top: `calc(50% + ${dy}cqh)`,
              width: `${star.size}cqh`,
              height: `${star.size}cqh`,
              backgroundColor: i % 2 === 0 ? "#fff6c0" : "#ffffff",
              clipPath: STAR_CLIP,
              opacity: 0,
            }}
          />
        );
      })}
    </div>
  );
};

/** 위로 살짝 볼록한 아치 — 가운데 0, 양옆으로 갈수록 바깥으로 기울고 아래로 내린다. */
const archLetterTransform = (index: number, total: number): string => {
  const offset = index - (total - 1) / 2; // 가운데 기준 ±
  const angle = offset * 6; // deg — 바깥쪽 기울기
  const drop = Math.abs(offset) * 0.09; // em — 양옆 내림(위 볼록)
  return `translateY(${drop}em) rotate(${angle}deg)`;
};

/**
 * 점수 프레임 아래 콤보 표시 — "n COMBO". 콤보가 오를 때 팝 1회 + 숫자는 상시 펄스(맥동). 2 미만이면
 * 숨긴다. 공용 외곽선형(흰 채움 + 브라운 윤곽). 강조는 색이 아니라 크기·애니메이션으로 준다.
 */
export const ComboText = ({ combo }: ComboTextProps) => {
  const popRef = useRef<HTMLSpanElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const comboRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(combo);
  // 10의 배수 콤보를 찍을 때마다 증가 — 버스트(ripple+별)를 key 로 remount 시켜 재생한다.
  const [burstId, setBurstId] = useState(0);

  useEffect(
    function impactOnIncrease() {
      // 임팩트/펀치 — 크게 튀어나왔다 빠르게 정착(숫자에만). 2~9 는 약하게, 10콤보+ 는 대형.
      if (combo >= 2 && combo !== prevRef.current) {
        const isBig = combo >= COMBO_RAINBOW_AT;
        popRef.current?.animate(
          [
            { transform: `scale(${isBig ? 2 : 1.2})`, offset: 0 },
            { transform: "scale(1)", offset: 1 },
          ],
          {
            duration: isBig ? 260 : 150,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)", // ease-out — 빠른 감쇠(overshoot 없음)
          },
        );
        // 10·20·30… 마일스톤 도달 순간 축하 버스트 1회.
        if (combo % COMBO_RAINBOW_AT === 0) {
          setBurstId((id) => id + 1);
        }
      }
      prevRef.current = combo;
    },
    [combo],
  );

  useEffect(function waveCombo() {
    const el = comboRef.current;
    if (!el) {
      return;
    }
    const letters = Array.from(el.querySelectorAll<HTMLElement>("[data-wave]"));
    // 글자마다 시작 지연(stagger)을 줘 파도가 왼→오로 흐른다.
    const anims = letters.map((letter, i) =>
      letter.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-0.35em)" },
          { transform: "translateY(0)" },
        ],
        {
          duration: 1000,
          iterations: Infinity,
          delay: i * 120,
          easing: "ease-in-out",
        },
      ),
    );
    return function stopWave() {
      anims.forEach((anim) => anim.cancel());
    };
  }, []);

  useEffect(
    function flashNumber() {
      // 10콤보+ 마일스톤일 때만 — 숫자에 주기적 번쩍임(밝기 스파이크). 그 밖엔 끈다.
      if (combo < COMBO_RAINBOW_AT) {
        return;
      }
      const el = numRef.current;
      if (!el) {
        return;
      }
      const anim = el.animate(
        [
          { filter: "brightness(1)", offset: 0 },
          { filter: "brightness(2.4)", offset: 0.1 },
          { filter: "brightness(1)", offset: 0.3 },
          { filter: "brightness(1)", offset: 1 },
        ],
        { duration: 900, iterations: Infinity, easing: "ease-out" },
      );
      return function stopFlash() {
        anim.cancel();
      };
    },
    [combo],
  );

  useEffect(function pulseNumber() {
    const el = numRef.current;
    if (!el) {
      return;
    }
    // 더블 비트(심장박동) — 빠르게 두 번 뛰고 짧게 쉰다.
    const anim = el.animate(
      [
        { transform: "scale(1)", offset: 0 },
        { transform: "scale(1.2)", offset: 0.12 },
        { transform: "scale(1)", offset: 0.27 },
        { transform: "scale(1.2)", offset: 0.42 },
        { transform: "scale(1)", offset: 0.58 },
        { transform: "scale(1)", offset: 1 },
      ],
      { duration: 700, iterations: Infinity, easing: "ease-out" },
    );
    return function stopPulse() {
      anim.cancel();
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        // 텍스트 밑줄을 슬롯 하단(=게이지 밑줄)에 맞춘다.
        alignItems: "flex-end",
        // 텍스트 우측 끝(trailing edge)을 슬롯 우변=카드 그리드 오른쪽 열에 맞춘다.
        justifyContent: "flex-end",
        visibility: combo >= 2 ? "visible" : "hidden",
      }}
    >
      {/* 세로 스택(stacked) — 숫자 위, COMBO 라벨 아래. COMBO 가 블록 폭을 정하고 숫자는 그 가로 중앙. */}
      <span
        style={{
          // 콤보 — 크림 채움 + 주색상 deep 보더·익스트루드(두께 0.22em).
          ...textBubble("0.22em"),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12cqh",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {/* 숫자 + 버스트(ripple·별)를 겹쳐 둘 relative 박스. 버스트는 숫자 중심 기준 절대배치. */}
        <span style={{ position: "relative", display: "inline-flex" }}>
          {/* 마일스톤 버스트 — 10의 배수마다 key 가 바뀌어 remount·재생. */}
          {burstId > 0 && <MilestoneBurst key={burstId} />}
          {/* 임팩트 팝 wrapper — 숫자에만. 안쪽 numRef(박동)와 transform 을 분리한다.
            기준점을 아래로 — baseline(밑줄) 고정, 위로만 커진다. */}
          <span
            ref={popRef}
            style={{ display: "inline-block", transformOrigin: "bottom" }}
          >
            {/* 뒤 레이어: 외곽선·익스트루드(부모 상속). 앞 레이어: 그라디언트 채움만 겹쳐 둘 다 살린다. */}
            <span
              ref={numRef}
              style={{
                position: "relative",
                fontSize: "75cqh",
                display: "inline-block",
                // 맥동(scale) 기준점을 위로 — cap line 고정, 아래로만 커진다.
                transformOrigin: "top",
              }}
            >
              {combo}
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  WebkitTextStroke: "0",
                  textShadow: "none",
                  // 10콤보+ 면 골드 단색 채움, 아니면 위 시안 → 아래 흰 그라디언트(background-clip).
                  ...(combo >= COMBO_RAINBOW_AT
                    ? { WebkitTextFillColor: MILESTONE_GOLD }
                    : {
                        backgroundImage: `linear-gradient(180deg, ${SEMANTIC.primary} 0%, #ffffff 100%)`,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }),
                }}
              >
                {combo}
              </span>
            </span>
          </span>
        </span>
        {/* COMBO 라벨 — 위로 살짝 볼록한 아치(wrapper) + 글자별 웨이브(inner). */}
        <span
          ref={comboRef}
          style={{ fontSize: "40cqh", whiteSpace: "nowrap" }}
        >
          {COMBO_LABEL.split("").map((ch, i, arr) => (
            <span
              key={`${ch}-${i}`}
              style={{
                display: "inline-block",
                transform: archLetterTransform(i, arr.length),
              }}
            >
              <span
                data-wave="true"
                style={{
                  display: "inline-block",
                  // 10콤보+ 면 글자별 레인보우, 아니면 부모 채움(크림) 상속.
                  color: combo >= COMBO_RAINBOW_AT ? RAINBOW[i] : undefined,
                }}
              >
                {ch}
              </span>
            </span>
          ))}
        </span>
      </span>
    </div>
  );
};
