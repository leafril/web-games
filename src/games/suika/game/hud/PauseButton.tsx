import { useState } from "react";

import { ICY } from "./constants";
import PauseIconImg from "../assets/PauseIcon.png";

type PauseButtonProps = {
  /** 누르면 호출(일시정지 진입). */
  onPress?: () => void;
};

/**
 * 일시정지 버튼 — 아이시 원형 글래스 프레임 + pause 아이콘. 위치·크기는 부모 wrapper(HUD_LAYOUT.pause).
 * 아이콘은 프레임의 67%라 프레임과 사이에 패딩이 남고, 누를 때만 톤이 변한다.
 */
export const PauseButton = ({ onPress }: PauseButtonProps) => {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      aria-label="메뉴"
      onPointerDown={() => {
        setPressed(true);
        onPress?.();
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
        cursor: "pointer",
        transform: pressed ? "scale(0.86)" : "scale(1)",
        transition: "transform 0.08s ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* 아이시 원형 프레임 — HUD 프레임 가족(ICY) 면·키라인·그림자, 원형(50%). */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: ICY.fill,
          border: ICY.border,
          borderRadius: "50%",
          boxShadow: ICY.shadow,
        }}
      />
      {/* pause 아이콘 — 흰 실루엣 PNG 그대로. 프레임의 67%. 누를 때만 살짝 어둡게. */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${PauseIconImg.src})`,
          backgroundSize: "67%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          filter: pressed ? "brightness(0.85)" : "none",
          transition: "filter 0.12s ease",
        }}
      />
    </button>
  );
};
