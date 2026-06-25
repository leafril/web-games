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
import BgmSrc from "./assets/Bgm.mp3";

const BGM_VOLUME = 0.2;
const BACKGROUND_FALLBACK = "#B2DEFB";
const GESTURE_EVENTS = ["pointerdown", "touchstart", "click", "keydown"];

/** 캔버스를 뷰포트에 contain 으로 맞춘 박스. 720:1280 비율 유지, 중앙 정렬. */
// Phaser Scale.FIT 이 이 parent 안에 캔버스를 비율 유지해 letterbox·center 한다.
const STAGE_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
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
        // 캔버스(ENVELOP)가 화면을 꽉 채우므로 배경은 로드 전 깜빡임 방지용 색만.
        backgroundColor: BACKGROUND_FALLBACK,
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
      transparent: true,
      render: { antialias: true },
      physics: {
        default: "matter",
        matter: { gravity: { x: 0, y: 1 }, debug: false },
      },
      scene: [PreloadScene, GameScene, HudScene],
      // 백킹은 디자인 × dpr(카메라 zoom 이 디자인 좌표 유지). ENVELOP 으로 화면을
      // 꽉 채우고(세로 기기 cover), 넘치는 축은 잘린다 — 레터박스·중복 배경 없음.
      scale: {
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent,
        width: PORTRAIT_GAME_WIDTH * dpr,
        height: PORTRAIT_GAME_HEIGHT * dpr,
      },
    });

    game.registry.set("dpr", dpr);
    game.registry.set("viewportScale", 1);

    // cover(ENVELOP) 로 잘리는 가장자리만큼 inset 을 계산해 HUD 가 화면 밖으로
    // 밀리지 않게 한다. 디자인 좌표 기준 좌우/상하 crop 의 절반.
    const applyViewportInset = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.max(
        vw / PORTRAIT_GAME_WIDTH,
        vh / PORTRAIT_GAME_HEIGHT,
      );
      const insetX = Math.max(0, (PORTRAIT_GAME_WIDTH - vw / scale) / 2);
      const insetY = Math.max(0, (PORTRAIT_GAME_HEIGHT - vh / scale) / 2);
      game.registry.set("viewportInset", {
        top: insetY,
        right: insetX,
        bottom: insetY,
        left: insetX,
      });
    };
    applyViewportInset();
    window.addEventListener("resize", applyViewportInset);
    game.events.on(GAME_EVENT.GAME_ENDED, (gameResult: GameResult) => {
      onGameEndRef.current(gameResult);
    });
    game.scene.start(SCENES.preload, { assets: LOCAL_ANIMALS });

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
      window.removeEventListener("resize", applyViewportInset);
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
