"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Phaser from "phaser";

import { gameHeadingFont } from "@/lib/fonts";
import {
  PORTRAIT_GAME_WIDTH,
  PORTRAIT_GAME_HEIGHT,
} from "./engine/dimensions";
import { SCENES } from "./engine/sceneKeys";
import { unlockAudio } from "./engine/webAudio";
import type { GameResult } from "./engine/gameTypes";
import { PreloadScene, GameScene, HudScene } from "./game/scenes";
import { GAME_EVENT } from "./game/config/events";
import { LOCAL_ANIMALS } from "./animals";
import Background from "./game/assets/Background.jpg";
import BgmSrc from "./assets/Bgm.mp3";

const BGM_VOLUME = 0.2;
const BACKGROUND_FALLBACK = "#B2DEFB";
const GESTURE_EVENTS = ["pointerdown", "touchstart", "click", "keydown"];

/** 캔버스를 뷰포트에 contain 으로 맞춘 박스. 720:1280 비율 유지, 중앙 정렬. */
const STAGE_STYLE: React.CSSProperties = {
  position: "relative",
  width: `min(100vw, calc(100dvh * ${PORTRAIT_GAME_WIDTH} / ${PORTRAIT_GAME_HEIGHT}))`,
  height: `min(100dvh, calc(100vw * ${PORTRAIT_GAME_HEIGHT} / ${PORTRAIT_GAME_WIDTH}))`,
};

export const AnimalTowerGame = () => {
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
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BACKGROUND_FALLBACK,
        backgroundImage: `url(${Background.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* result 도착 시 캔버스 unmount → Phaser destroy. retry 는 result=null 로 재마운트. */}
      {!result && <PhaserStage onGameEnd={setResult} />}
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

type PhaserStageProps = {
  onGameEnd: (result: GameResult) => void;
};

const PhaserStage = ({ onGameEnd }: PhaserStageProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onGameEndRef = useRef(onGameEnd);
  onGameEndRef.current = onGameEnd;

  useEffect(function bootGame() {
    const parent = parentRef.current;
    if (!parent || gameRef.current) {
      return;
    }

    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: PORTRAIT_GAME_WIDTH * dpr,
      height: PORTRAIT_GAME_HEIGHT * dpr,
      transparent: true,
      render: { antialias: true },
      physics: {
        default: "matter",
        matter: { gravity: { x: 0, y: 1 }, debug: false },
      },
      scene: [PreloadScene, GameScene, HudScene],
      scale: { mode: Phaser.Scale.NONE, parent },
    });

    game.registry.set("dpr", dpr);
    game.registry.set("viewportInset", { top: 0, right: 0, bottom: 0, left: 0 });
    game.registry.set("viewportScale", 1);
    game.events.on(GAME_EVENT.GAME_ENDED, (gameResult: GameResult) => {
      onGameEndRef.current(gameResult);
    });
    game.scene.start(SCENES.preload, { assets: LOCAL_ANIMALS });

    const canvas = parent.querySelector("canvas");
    if (canvas) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.objectFit = "contain";
    }

    gameRef.current = game;

    // BGM(HTMLAudio) + Web Audio unlock — 브라우저 autoplay 정책상 첫 제스처 후 시작.
    const bgm = new Audio(BgmSrc);
    bgm.loop = true;
    bgm.volume = BGM_VOLUME;
    let started = false;
    const startAudio = () => {
      if (started) {
        return;
      }
      started = true;
      unlockAudio();
      void bgm.play().catch(() => {
        // autoplay 차단 등 — best-effort
      });
      GESTURE_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, startAudio, true),
      );
    };
    GESTURE_EVENTS.forEach((evt) =>
      document.addEventListener(evt, startAudio, true),
    );

    return function destroyGame() {
      GESTURE_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, startAudio, true),
      );
      bgm.pause();
      bgm.src = "";
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={parentRef} style={STAGE_STYLE} />;
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
          style={{
            fontSize: 64,
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
          }}
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
