import type { ReactNode } from "react";

import { BoomGauge } from "./BoomGauge";
import { ComboText } from "./ComboText";
import { HUD_LAYOUT } from "./constants";
import { PauseButton } from "./PauseButton";
import { ScoreFrame } from "./ScoreFrame";
import { TimerBar } from "./TimerBar";

/** 레이아웃 슬롯 한 칸 — 게임-박스 기준 absolute 배치 + cqh 컨테이너. height 없으면 정사각(일시정지). */
type SlotLayout = {
  left: string;
  top: string;
  width: string;
  height?: string;
};

const HudSlot = ({
  layout,
  children,
}: {
  layout: SlotLayout;
  children: ReactNode;
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: layout.left,
        top: layout.top,
        width: layout.width,
        ...(layout.height
          ? { height: layout.height }
          : { aspectRatio: "1 / 1" }),
        // 자식이 cqh(컨테이너 높이 단위)로 둥글기·폰트를 잡는다.
        containerType: "size",
        zIndex: 9100,
      }}
    >
      {children}
    </div>
  );
};

type HudProps = {
  score: number;
  combo: number;
  /** BOOM 게이지 — 채움 비율·적립 폭탄 수. */
  boomRatio: number;
  boomBanked: number;
  /** 게임 타이머 — 남은 비율·남은 초. */
  timerRatio: number;
  timerSeconds: number;
  /** 타이머 밴드 세로 위치·높이(% of 박스) — worldH 가변이라 GameShell 이 런타임에 계산해 넘긴다. */
  timerTop: string;
  timerHeight: string;
  /** 일시정지. */
  onPause?: () => void;
};

/**
 * HUD 오버레이 — 게임-박스 안에서 모든 HUD 요소를 HUD_LAYOUT 좌표로 배치한다(drop 과 동일 패턴).
 * 부모(GameShell)가 게임-박스(캔버스와 같은 종횡비)를 letterbox 하므로 HUD 가 캔버스에 고정된다.
 * 데이터·콜백은 전부 props — Scene 이 registry 콜백으로 부모 state 를 채운다(presentational).
 */
export const Hud = ({
  score,
  combo,
  boomRatio,
  boomBanked,
  timerRatio,
  timerSeconds,
  timerTop,
  timerHeight,
  onPause,
}: HudProps) => {
  return (
    <>
      <HudSlot layout={HUD_LAYOUT.score}>
        <ScoreFrame score={score} />
      </HudSlot>
      <HudSlot layout={HUD_LAYOUT.pause}>
        <PauseButton onPress={onPause} />
      </HudSlot>
      <HudSlot layout={HUD_LAYOUT.combo}>
        <ComboText combo={combo} />
      </HudSlot>
      <HudSlot layout={HUD_LAYOUT.boom}>
        <BoomGauge fillRatio={boomRatio} banked={boomBanked} />
      </HudSlot>
      <HudSlot
        layout={{
          left: HUD_LAYOUT.timer.left,
          width: HUD_LAYOUT.timer.width,
          top: timerTop,
          height: timerHeight,
        }}
      >
        <TimerBar ratio={timerRatio} seconds={timerSeconds} />
      </HudSlot>
    </>
  );
};
