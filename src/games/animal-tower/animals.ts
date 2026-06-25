import type { Word } from "./engine/word";

import Bear from "./game/assets/animals/Bear.png";
import Beaver from "./game/assets/animals/Beaver.png";
import Camel from "./game/assets/animals/Camel.png";
import Cheetah from "./game/assets/animals/Cheetah.png";
import Cow from "./game/assets/animals/Cow.png";
import Deer from "./game/assets/animals/Deer.png";
import Elephant from "./game/assets/animals/Elephant.png";
import Fox from "./game/assets/animals/Fox.png";
import Goat from "./game/assets/animals/Goat.png";
import Hippo from "./game/assets/animals/Hippo.png";
import Horse from "./game/assets/animals/Horse.png";
import Husky from "./game/assets/animals/Husky.png";
import Lion from "./game/assets/animals/Lion.png";
import Moose from "./game/assets/animals/Moose.png";
import Owl from "./game/assets/animals/Owl.png";
import Penguin from "./game/assets/animals/Penguin.png";
import Pig from "./game/assets/animals/Pig.png";
import PolarBear from "./game/assets/animals/PolarBear.png";
import Rabbit from "./game/assets/animals/Rabbit.png";
import Raccoon from "./game/assets/animals/Raccoon.png";
import Rhino from "./game/assets/animals/Rhino.png";
import Seal from "./game/assets/animals/Seal.png";
import Sheep from "./game/assets/animals/Sheep.png";
import Squirrel from "./game/assets/animals/Squirrel.png";
import Tiger from "./game/assets/animals/Tiger.png";
import Wolf from "./game/assets/animals/Wolf.png";
import Zebra from "./game/assets/animals/Zebra.png";

type AnimalArt = { nameEn: string; nameKo: string; src: string };

// nameEn 은 ANIMAL_SHAPES 키와 매칭(대소문자·공백 무관). 히트박스가 여기 정의된 28종 중
// 매칭되는 27종만 블록이 된다.
const ANIMALS: AnimalArt[] = [
  { nameEn: "Bear", nameKo: "곰", src: Bear.src },
  { nameEn: "Beaver", nameKo: "비버", src: Beaver.src },
  { nameEn: "Camel", nameKo: "낙타", src: Camel.src },
  { nameEn: "Cheetah", nameKo: "치타", src: Cheetah.src },
  { nameEn: "Cow", nameKo: "소", src: Cow.src },
  { nameEn: "Deer", nameKo: "사슴", src: Deer.src },
  { nameEn: "Elephant", nameKo: "코끼리", src: Elephant.src },
  { nameEn: "Fox", nameKo: "여우", src: Fox.src },
  { nameEn: "Goat", nameKo: "염소", src: Goat.src },
  { nameEn: "Hippo", nameKo: "하마", src: Hippo.src },
  { nameEn: "Horse", nameKo: "말", src: Horse.src },
  { nameEn: "Husky", nameKo: "허스키", src: Husky.src },
  { nameEn: "Lion", nameKo: "사자", src: Lion.src },
  { nameEn: "Moose", nameKo: "무스", src: Moose.src },
  { nameEn: "Owl", nameKo: "부엉이", src: Owl.src },
  { nameEn: "Penguin", nameKo: "펭귄", src: Penguin.src },
  { nameEn: "Pig", nameKo: "돼지", src: Pig.src },
  { nameEn: "PolarBear", nameKo: "북극곰", src: PolarBear.src },
  { nameEn: "Rabbit", nameKo: "토끼", src: Rabbit.src },
  { nameEn: "Raccoon", nameKo: "너구리", src: Raccoon.src },
  { nameEn: "Rhino", nameKo: "코뿔소", src: Rhino.src },
  { nameEn: "Seal", nameKo: "물개", src: Seal.src },
  { nameEn: "Sheep", nameKo: "양", src: Sheep.src },
  { nameEn: "Squirrel", nameKo: "다람쥐", src: Squirrel.src },
  { nameEn: "Tiger", nameKo: "호랑이", src: Tiger.src },
  { nameEn: "Wolf", nameKo: "늑대", src: Wolf.src },
  { nameEn: "Zebra", nameKo: "얼룩말", src: Zebra.src },
];

/**
 * 게임 코어(buildBlocks)에 넘기는 로컬 동물 풀. BE 단어 API 를 대체한다.
 * 발음 음성은 없어 audioUrl 은 빈 문자열 — GameScene 이 로드를 건너뛴다(무음).
 */
export const LOCAL_ANIMALS: Word[] = ANIMALS.map((animal, index) => ({
  id: index + 1,
  nameEn: animal.nameEn,
  nameKo: animal.nameKo,
  imageUrl: animal.src,
  audioUrl: "",
}));
