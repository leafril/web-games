import { useEffect, useRef, useState } from "react";

import ItemFramePanelImg from "../assets/ItemFramePanel.png";
import ExplosionIconImg from "../assets/ExplosionIcon.png";

type ItemButtonProps = {
  /** 적립된 능력 카운트 — 1 이상일 때만 활성·연출. */
  charges: number;
  /** 발사(능력 1 소모). */
  onFire: () => void;
};

/** 홀로 스윕 그라데이션 — 카드(reward-card-art) 룩의 대각 무지개 글린트, 단 더 얇은 줄기. */
const ITEM_HOLO_GRADIENT =
  "linear-gradient(115deg, transparent 45%, rgba(255,255,255,0.55) 48%, rgba(255,210,80,0.7) 50%, rgba(120,220,180,0.6) 52%, transparent 55%)";

/**
 * 얼음 깨기 아이템 버튼 — 충전(charges≥1) 동안 2초 주기 펄스 펀치 + 홀로그램 스윕(카드 효과).
 * 위치·크기는 부모 wrapper(HUD_LAYOUT.item)가 잡고, 여기선 버튼 내용·상호작용·연출만 담당한다.
 */
export const ItemButton = ({ charges, onFire }: ItemButtonProps) => {
  const usable = charges > 0; // 적립된 charge 가 있을 때만 활성.
  const [pressed, setPressed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const holoRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);

  // 사용 가능 동안만 — 펄스 펀치(콘텐츠 스케일)와 홀로그램 스윕(대각 글린트)을 화살표 바운스와
  // 한 박자(1200ms)로 묶는다. 셋 다 같은 [usable] 시점에 시작되므로 주기만 같으면 영구 위상 락.
  // 펀치는 화살표가 버튼에 닿는 순간(arrow offset 0.3~0.42)에 튕기게 정렬 — 화살표 탭 → 버튼 반응.
  // 펀치는 button 이 아닌 내부 콘텐츠에 걸어 누름 스케일(button transform)과 충돌하지 않게 한다.
  useEffect(
    function pulseAndHolo() {
      if (!usable) {
        return;
      }
      const punch = contentRef.current?.animate(
        [
          { transform: "scale(1)", offset: 0 }, // 화살표 상승 중 — 정지
          { transform: "scale(1)", offset: 0.3 }, // 화살표 도착(닿기 직전)
          { transform: "scale(1.16)", offset: 0.42 }, // 임팩트 — 화살표 squash 와 동시 펀치
          { transform: "scale(0.96)", offset: 0.54 },
          { transform: "scale(1.04)", offset: 0.66 },
          { transform: "scale(1)", offset: 0.78 },
          { transform: "scale(1)", offset: 1 },
        ],
        { duration: 1200, iterations: Infinity, easing: "ease-out" },
      );
      const holo = holoRef.current?.animate(
        [
          { backgroundPosition: "200% 50%", offset: 0 },
          { backgroundPosition: "200% 50%", offset: 0.3 }, // 도착 전엔 화면 밖(off)으로 대기
          { backgroundPosition: "-100% 50%", offset: 0.7 }, // 임팩트에 맞춰 글린트 스윕
          { backgroundPosition: "-100% 50%", offset: 1 },
        ],
        {
          duration: 1200,
          iterations: Infinity,
          easing: "ease-out",
        },
      );
      return () => {
        punch?.cancel();
        holo?.cancel();
      };
    },
    [usable],
  );

  // 충전됐을 때만 — 안내 화살표가 ① 아래에서 위로 슉 이동(비율 1 유지) → ② 도착한 자리에서
  // squash & stretch(버튼에 톡 닿아 눌렸다 길쭉, 잔탄성 후 복귀) → ③ 아래로 내려가 반복.
  // 이동과 변형을 한 박자에 섞지 않고 offset 으로 분리한다. 닿는 면이 위(꼭지)라 origin 은 center top.
  useEffect(
    function bounceArrow() {
      if (!usable) {
        return;
      }
      const bounce = arrowRef.current?.animate(
        [
          // ① 아래 → 위 이동 (비율 정상)
          {
            transform: "translateX(-50%) translateY(55%) scaleX(1) scaleY(1)",
            offset: 0,
          },
          {
            transform: "translateX(-50%) translateY(-15%) scaleX(1) scaleY(1)",
            offset: 0.3,
          },
          // ② 도착 후 squash → stretch → 잔탄성 → 정상
          {
            transform:
              "translateX(-50%) translateY(-15%) scaleX(1.28) scaleY(0.72)",
            offset: 0.42,
          },
          {
            transform:
              "translateX(-50%) translateY(-15%) scaleX(0.82) scaleY(1.22)",
            offset: 0.56,
          },
          {
            transform:
              "translateX(-50%) translateY(-15%) scaleX(1.08) scaleY(0.94)",
            offset: 0.68,
          },
          {
            transform: "translateX(-50%) translateY(-15%) scaleX(1) scaleY(1)",
            offset: 0.78,
          },
          // ③ 아래로 복귀(다음 사이클 준비)
          {
            transform: "translateX(-50%) translateY(55%) scaleX(1) scaleY(1)",
            offset: 1,
          },
        ],
        { duration: 1200, iterations: Infinity, easing: "ease-in-out" },
      );
      return () => bounce?.cancel();
    },
    [usable],
  );

  return (
    <button
      type="button"
      aria-label="얼음 깨기"
      disabled={!usable}
      onPointerDown={() => {
        if (!usable) {
          return;
        }
        setPressed(true);
        onFire();
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: usable ? "pointer" : "default",
        transform: pressed ? "scale(0.92)" : "none",
        transition: "transform 0.07s ease, filter 0.12s ease",
        // 능력 없으면 흐릿·탈색으로 비활성 표시.
        filter: usable ? "none" : "grayscale(0.7) opacity(0.45)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* 펄스 타겟 — 셸·아이콘·홀로를 한 덩어리로 스케일. isolation 으로 screen 블렌드를 버튼 안에 가둠. */}
      <div
        ref={contentRef}
        style={{ position: "absolute", inset: 0, isolation: "isolate" }}
      >
        {/* 셸 = Unity prefab 추출 PNG(홀로그램 패널). */}
        <span
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            backgroundImage: `url(${ItemFramePanelImg.src})`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* 아이콘 — 폭파(풀컬러 원본). mask 아닌 background-image 로 색·외곽선 그대로. */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${ExplosionIconImg.src})`,
            backgroundSize: "67%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
          }}
        />
        {/* 홀로그램 스윕 — 패널 알파로 마스크해 패널 모양 안에서만 빛난다. screen 블렌드로 색조
            영향 없이 하이라이트만(스윕 위치는 JS 로 2초 주기). 평소(off) 화면 밖(200%)이라 안 보임. */}
        <span
          ref={holoRef}
          style={{
            position: "absolute",
            inset: 0,
            background: ITEM_HOLO_GRADIENT,
            backgroundSize: "220% 100%",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "200% 50%",
            maskImage: `url(${ItemFramePanelImg.src})`,
            WebkitMaskImage: `url(${ItemFramePanelImg.src})`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* 충전 안내 화살표 — 버튼 아래에서 위로 통통(squash & stretch)으로 "여기 눌러" 유도.
          색·면은 능력 게이지와 같은 아이시 톤(시안 #3CFFFF 글래스 + 흰 키라인 + 블루 섀도)으로
          맞춰 "능력" 임을 한눈에. contentRef(펄스 스케일) 밖에 둬 펄스와 독립. usable 일 때만. */}
      {usable && (
        <span
          ref={arrowRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            marginTop: "11cqh",
            width: "40%",
            transformOrigin: "center top",
            transform: "translateX(-50%)",
            filter: "drop-shadow(0 2px 3px rgba(70,105,160,0.4))",
            pointerEvents: "none",
            willChange: "transform",
          }}
        >
          {/* SVG polygon — clip-path 와 달리 fill + stroke(키라인)를 함께. strokeLinejoin round 로
              꼭지를 둥글려 통통한 톤. overflow visible 로 stroke 가 viewBox 밖에서도 안 잘림. */}
          <svg
            viewBox="0 0 100 84"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              overflow: "visible",
            }}
          >
            <defs>
              <linearGradient
                id="dropItemArrowFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                {/* 위 밝은 시안 → 아래 능력 시안(게이지 채움 #3CFFFF) — 윗면 sheen 느낌. */}
                <stop offset="0%" stopColor="#caffff" />
                <stop offset="100%" stopColor="#3cffff" />
              </linearGradient>
            </defs>
            <polygon
              points="50,6 94,78 6,78"
              fill="url(#dropItemArrowFill)"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="9"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
};
