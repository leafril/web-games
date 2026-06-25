import type { ReactNode } from "react";

import EnergyIconImg from "../assets/EnergyIcon.png";
import TrophyIconImg from "../assets/TrophyIcon.png";
import { AbilityGauge } from "./AbilityGauge";
import { BestScoreFrame } from "./BestScoreFrame";
import { HUD_LAYOUT } from "./constants";
import { EvolutionBar, type EvolutionItem } from "./EvolutionBar";
import { ItemButton } from "./ItemButton";
import { PauseButton } from "./PauseButton";
import { ScoreFrame } from "./ScoreFrame";

/** 레이아웃 슬롯 한 칸 — 게임-박스 기준 absolute 배치 + cqh 컨테이너. height 없으면 정사각(아이템·일시정지). */
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
  best: number;
  /** 능력 게이지 — 채움 비율·뱅크 카운트·상한. */
  gaugeRatio: number;
  charges: number;
  maxCharges: number;
  /** 충전 번개가 아이콘에 빨려든 순간마다 +1 — 그 시점에 아이콘 펄스(카운트 증가와 별개 타이밍). */
  chargePulse: number;
  /** 진화 체인(없으면 로컬 얼음). */
  evolutionItems?: EvolutionItem[];
  /** 최종 단계(파인애플) 완성 여부 — 진화바 마지막 실루엣 공개용. */
  apexUnlocked?: boolean;
  /** 아이템 발사. */
  onItemFire: () => void;
  /** 일시정지. */
  onPause?: () => void;
};

/**
 * HUD 오버레이 — 게임-박스 안에서 모든 HUD 요소를 HUD_LAYOUT 좌표로 배치한다.
 * 부모(GameContainer)가 게임-박스(캔버스와 같은 종횡비)를 letterbox 하므로, HUD 가 캔버스에 고정된다.
 * 데이터·콜백은 전부 props — Scene 이벤트를 받아 부모가 채운다(presentational).
 */
export const Hud = ({
  score,
  best,
  gaugeRatio,
  charges,
  maxCharges,
  chargePulse,
  evolutionItems,
  apexUnlocked,
  onItemFire,
  onPause,
}: HudProps) => {
  return (
    <>
      <HudSlot layout={HUD_LAYOUT.best}>
        <BestScoreFrame icon={TrophyIconImg.src} best={best} />
      </HudSlot>
      <HudSlot layout={HUD_LAYOUT.score}>
        <ScoreFrame score={score} />
      </HudSlot>
      <HudSlot layout={HUD_LAYOUT.gauge}>
        <AbilityGauge
          icon={EnergyIconImg.src}
          fillRatio={gaugeRatio}
          current={charges}
          max={maxCharges}
          pulse={chargePulse}
        />
      </HudSlot>
      <HudSlot layout={HUD_LAYOUT.item}>
        <ItemButton charges={charges} onFire={onItemFire} />
      </HudSlot>
      <HudSlot layout={HUD_LAYOUT.pause}>
        <PauseButton onPress={onPause} />
      </HudSlot>
      <HudSlot layout={HUD_LAYOUT.evolution}>
        <EvolutionBar items={evolutionItems} apexUnlocked={apexUnlocked} />
      </HudSlot>
    </>
  );
};
