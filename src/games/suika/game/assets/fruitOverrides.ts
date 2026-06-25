import Obj01 from "./fruit/Obj01.png";
import Obj02 from "./fruit/Obj02.png";
import Obj03 from "./fruit/Obj03.png";
import Obj04 from "./fruit/Obj04.png";
import Obj05 from "./fruit/Obj05.png";
import Obj06 from "./fruit/Obj06.png";
import Obj07 from "./fruit/Obj07.png";
import Obj08 from "./fruit/Obj08.png";
import Obj09 from "./fruit/Obj09.png";
import Obj10 from "./fruit/Obj10.png";
import Obj11 from "./fruit/Obj11.png";

/**
 * drop-next 전용 과일 아트 오버라이드 — 키 = CHAIN name(obj_01…).
 * 여기 있는 키만 drop 공유 placeholder 대신 사용한다(라이브 drop/ 무수정 — 공유 PNG 안 덮음).
 * 새 아트가 들어오면 `assets/fruit/`에 PNG 추가 + 이 맵에 한 줄.
 */
export const FRUIT_OVERRIDES: Record<string, string> = {
  obj_01: Obj01.src, // Ice — 얼음 캐릭터(플랫, 얼굴). 1단계 시작 블록(연파랑이라 절차 원은 배경에 묻혀 교체)
  obj_02: Obj02.src, // Blueberry — 블루베리(플랫, 얼굴). 제일 작은 과일
  obj_03: Obj03.src, // Kiwi — 키위 단면(플랫, 얼굴). 복숭아와 크기 스왑으로 작은 슬롯
  obj_04: Obj04.src, // Strawberry — 딸기(플랫, 얼굴, 하트형)
  obj_05: Obj05.src, // Peach — 복숭아(플랫, 얼굴). 키위와 크기 스왑으로 큰 슬롯으로 이동
  obj_06: Obj06.src, // Apple — 빨강 사과(플랫 PNG, 투명). 딸기와 크기 스왑으로 큰 슬롯으로 이동
  obj_07: Obj07.src, // Orange — 오렌지(플랫, 얼굴). 레몬 대체
  obj_08: Obj08.src, // Coconut — 코코넛(플랫, 얼굴)
  obj_09: Obj09.src, // Melon — 멜론(플랫, 얼굴, T자 꼭지)
  obj_10: Obj10.src, // Watermelon — 통수박(플랫, 얼굴)
  obj_11: Obj11.src, // Pineapple — 파인애플(플랫, 얼굴). 최종 왕관
};

/**
 * 시각 본체가 프레임 폭에서 차지하는 비율(0~1). 충돌원은 `def.r` 로 고정하고, 이미지는
 * `def.r*2 / bodyFill` 로 키워 **오버레이** → 본체가 충돌원을 꽉 채우고 여백·꼭지는 원 밖으로
 * 삐져나온다(트리밍 불필요). 미지정 = 1(이미지 = 충돌원, 기존 동작).
 * 측정: `magick <png> -trim info:` 의 본체 폭 / 프레임 폭. (본체는 수평 중앙이어야 함.)
 */
export const FRUIT_BODY_FILL: Record<string, number> = {
  obj_01: 0.93, // 얼음(플랫, 얼굴, 둥근 원) — 본체 폭 ~94%, 잎·꼭지 없어 중앙([0.5,0.5])
  obj_02: 0.93, // 블루베리(플랫, 얼굴) — 본체가 폭의 ~93%, 가로 중앙
  obj_03: 0.91, // 키위(플랫, 얼굴 단면) — 본체가 폭의 ~91%, 가로·세로 중앙(돌출부 없음)
  obj_04: 0.83, // 딸기(플랫, 얼굴) — 본체 폭(어깨)의 ~83%, 하트형이라 세로는 게임서 튜닝
  obj_05: 0.92, // 복숭아(플랫, 얼굴) — 본체가 폭의 ~92%, 가로 중앙(꼭지·잎으로 본체 살짝 아래)
  obj_06: 0.93, // 사과(플랫, 얼굴) — 본체가 폭의 ~93%, 가로 중앙(꼭지·잎으로 본체 살짝 아래)
  obj_07: 0.93, // 오렌지(플랫, 얼굴) — 본체가 폭의 ~93%, 가로 중앙(잎으로 본체 살짝 아래)
  obj_08: 0.84, // 코코넛(플랫, 얼굴) — 껍질 실루엣이 폭의 ~84%(잎·빨대 제외), 가로 중앙
  obj_09: 0.85, // 멜론(플랫, 얼굴) — 본체가 폭의 ~85%, T자 꼭지로 본체 아래로
  obj_10: 0.84, // 수박(플랫, 얼굴) — 본체가 폭의 ~84%, 가로 중앙(왕관·잎으로 본체 아래로)
  obj_11: 0.78, // 파인애플(플랫, 얼굴) — 본체 폭의 ~78%(오발), 잎 크라운으로 본체 아래
};

/**
 * 시각 본체의 중심(텍스처 폭·높이 대비 비율). 충돌원은 이미지 origin 에 놓이므로, 본체가 텍스처
 * 중앙에 없으면(잎·꼭지로 치우침) 여기서 본체 중심을 가리켜 충돌원에 얹는다. 이미지 수술 불필요 —
 * 원본을 정사각 리사이즈만 해 넣고 이 값을 게임 보며 튜닝. 미지정 = [0.5, 0.5](중앙).
 * 측정: 본체(잎·꼭지 제외) bbox 중심 / 프레임.
 */
export const FRUIT_BODY_ORIGIN: Record<string, [number, number]> = {
  obj_05: [0.5, 0.53], // 복숭아 — 가로 중앙, 꼭지·잎이 위로 삐져나와 본체가 살짝 아래
  obj_06: [0.5, 0.52], // 사과 — 가로 중앙, 꼭지·잎이 위로 삐져나와 본체가 살짝 아래
  obj_07: [0.5, 0.51], // 오렌지 — 가로 중앙, 잎이 위로 삐져나와 본체가 살짝 아래
  obj_10: [0.5, 0.55], // 수박 — 가로 중앙, 왕관·잎이 위로 삐져나와 본체가 아래로
  obj_08: [0.5, 0.49], // 코코넛 — 가로 중앙, 껍질 중심이 텍스처 중앙보다 살짝 위(잎·빨대가 위로 삐져나옴)
  obj_09: [0.5, 0.545], // 멜론 — 가로 중앙, T자 꼭지로 본체가 아래로
  obj_11: [0.5, 0.53], // 파인애플 — 가로 중앙, 잎 크라운으로 본체가 살짝 아래
};
