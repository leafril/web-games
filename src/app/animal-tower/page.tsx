"use client";

import dynamic from "next/dynamic";

// Phaser 는 브라우저 전용 — SSR 비활성화로 클라이언트에서만 부팅한다.
const AnimalTowerGame = dynamic(
  () => import("@/games/animal-tower/AnimalTowerGame").then((m) => m.AnimalTowerGame),
  { ssr: false },
);

export default function AnimalTowerPage() {
  return <AnimalTowerGame />;
}
