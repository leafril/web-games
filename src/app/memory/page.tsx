"use client";

import dynamic from "next/dynamic";

// Phaser 는 브라우저 전용 — SSR 비활성화로 클라이언트에서만 부팅한다.
const GameShell = dynamic(
  () => import("@/games/memory/GameShell").then((m) => m.GameShell),
  { ssr: false },
);

export default function MemoryPage() {
  return <GameShell />;
}
