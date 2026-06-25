import type { Metadata, Viewport } from "next";
import { gameHeadingFont } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web Games",
  description: "Phaser 미니 게임 모음 — Suika, Animal Tower",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={gameHeadingFont.variable}>
      <body>{children}</body>
    </html>
  );
}
