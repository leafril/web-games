"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { gameHeadingFont, GAME_HEADING_FONT_FAMILY } from "@/lib/fonts";
import { playHaptic } from "@/lib/haptic";
import { GameContainer, type GameResult } from "./game";

/** 게임 스테이지 톤(#d6e2f3) — 투명 캔버스 뒤·레터박스에 비친다. */
const STAGE_BG = "#d6e2f3";

/**
 * suika 라우트 어댑터 — 자기완결 게임 코어(game/GameContainer)를 앱에 연결한다.
 * 게임 코어는 외부 의존을 props 로만 받으므로 여기서 폰트·햅틱을 주입하고,
 * 게임 결과를 받아 최소 결과 화면으로 잇는다. 백엔드·단어·발음은 없다(이미지 전용).
 */
export const SuikaGame = () => {
  const router = useRouter();
  const [result, setResult] = useState<GameResult | null>(null);

  const goHome = () => {
    router.push("/");
  };

  return (
    <div
      className={gameHeadingFont.className}
      style={{
        position: "fixed",
        inset: 0,
        background: STAGE_BG,
        overflow: "hidden",
      }}
    >
      {/* result 도착 시 GameContainer unmount → Phaser 인스턴스 destroy(루프·오디오·입력 정지).
          retry 는 result=null 로 리셋 → GameContainer 재마운트로 fresh 게임. */}
      {!result && (
        <GameContainer
          fontFamily={GAME_HEADING_FONT_FAMILY}
          playHaptic={playHaptic}
          onGameEnd={setResult}
          onExit={goHome}
        />
      )}
      {result && (
        <ResultOverlay
          score={result.score}
          onRetry={() => setResult(null)}
          onHome={goHome}
        />
      )}
    </div>
  );
};

type ResultOverlayProps = {
  score: number;
  onRetry: () => void;
  onHome: () => void;
};

const ResultOverlay = ({ score, onRetry, onHome }: ResultOverlayProps) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: "0 24px",
        textAlign: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        color: "#fff",
        fontFamily: "var(--font-display)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 18, letterSpacing: 2, opacity: 0.7 }}>
          SCORE
        </span>
        <span
          style={{ fontSize: 64, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(score).toLocaleString()}
        </span>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={onRetry}
          style={{
            borderRadius: 9999,
            background: "#fff",
            color: "#000",
            padding: "12px 32px",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          다시하기
        </button>
        <button
          type="button"
          onClick={onHome}
          style={{
            borderRadius: 9999,
            border: "1px solid rgba(255,255,255,0.4)",
            color: "#fff",
            padding: "12px 32px",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          메뉴
        </button>
      </div>
    </div>
  );
};
