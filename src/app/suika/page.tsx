"use client";

import dynamic from "next/dynamic";

// Phaser 는 브라우저 전용 — SSR 비활성화로 클라이언트에서만 부팅한다.
const SuikaGame = dynamic(
  () => import("@/games/suika/SuikaGame").then((m) => m.SuikaGame),
  { ssr: false },
);

export default function SuikaPage() {
  return <SuikaGame />;
}
