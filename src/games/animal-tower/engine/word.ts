/**
 * 게임이 블록 데이터로 다루는 단위 타입. 원래 학습 단어(BE)에서 왔으나
 * animal-tower 는 로컬 동물 데이터만 쓴다 — id·label 정도만 실제로 사용한다.
 */
export type Word = {
  id: number;
  nameEn: string;
  nameKo: string;
  imageUrl: string;
  audioUrl: string;
};
