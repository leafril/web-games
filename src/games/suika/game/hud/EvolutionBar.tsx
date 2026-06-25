import { FRUIT_OVERRIDES } from "../assets/fruitOverrides";
import { ICY } from "./constants";

/** 시작 얼음 블록(obj_01) 색 — 오버라이드 이미지가 없어 얼음색 원으로 렌더. */
const ICE_BASE_COLOR = "#bfe3ff";

export type EvolutionItem = {
  name: string;
  /** 과일 이미지 URL. null 이면 얼음색 원(시작 블록). */
  src: string | null;
};

/** 기본 진화 체인 — 로컬 얼음 테마(서버 없이 동작). 키 순서(obj_01…obj_11)가 머지 순서. */
const LOCAL_EVOLUTION_CHAIN: EvolutionItem[] = Object.keys(FRUIT_OVERRIDES).map(
  (name) => ({ name, src: FRUIT_OVERRIDES[name] ?? null }),
);

type EvolutionBarProps = {
  /** 진화 체인 항목(머지 순서). 없으면 로컬 얼음 테마. BE imageUrl 주입 시 그것으로 대체. */
  items?: EvolutionItem[];
  /** 최종 단계(파인애플) 완성 여부 — false 면 마지막 항목을 검은 실루엣으로 가려 궁금증을 준다. */
  apexUnlocked?: boolean;
};

/**
 * 진화 바 — 머지 체인 순서 가이드(글래스 스트립 + 과일 11개). 표시 전용.
 * 위치·크기는 부모 wrapper(HUD_LAYOUT.evolution), 여기선 스트립 내용만.
 * 마지막 항목(파인애플)은 완성 전까지 실루엣 — 처음 만들면 공개된다.
 */
export const EvolutionBar = ({
  items = LOCAL_EVOLUTION_CHAIN,
  apexUnlocked = false,
}: EvolutionBarProps) => {
  return (
    // 바깥 — 슬롯 높이를 채우고 스트립을 세로 중앙에. 표시 전용(pointerEvents none).
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        className="flex w-full items-center gap-[3px] rounded-full p-[5px]"
        style={{
          background: ICY.strip,
          border: ICY.border,
          boxShadow: ICY.shadow,
        }}
      >
        {items.map((fruit, index) => {
          // 마지막 항목(파인애플)은 완성 전까지 검은 실루엣으로 가린다.
          const hidden = index === items.length - 1 && !apexUnlocked;
          return fruit.src ? (
            <img
              key={fruit.name}
              src={fruit.src}
              alt={hidden ? "???" : fruit.name}
              className="aspect-square min-w-0 flex-1 object-contain"
              style={
                hidden ? { filter: "brightness(0)", opacity: 0.5 } : undefined
              }
            />
          ) : (
            <div
              key={fruit.name}
              className="aspect-square min-w-0 flex-1 rounded-full"
              style={{
                background: `radial-gradient(circle at 35% 30%, #eaf7ff, ${ICE_BASE_COLOR})`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
