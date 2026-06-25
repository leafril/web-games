/**
 * Next.js 가 정적 오디오 에셋 import 를 URL 문자열로 변환하는 것의 타입 선언.
 * 이미지(png/jpg 등)는 Next 가 자체 선언(StaticImageData)을 제공하므로 오디오만 둔다.
 */
declare module "*.wav" {
  const src: string;
  export default src;
}

declare module "*.mp3" {
  const src: string;
  export default src;
}

declare module "*.ogg" {
  const src: string;
  export default src;
}
