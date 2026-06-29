"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type PhaserNS from "phaser";

import { PORTRAIT_GAME_WIDTH as W } from "./dimensions";
import { Hud } from "./hud";
import { GAME_OVER_PAUSE_MS, GAME_TIME_MS } from "./constants";
import { GAUGE_H_FRAC, GAUGE_BOTTOM_FRAC } from "./layout";
import { SEMANTIC } from "./tokens";
import { loadDisplayFont, textOutline, textBubble } from "./typography";
import type { MemoryHudConfig } from "./types";

/** 고정 월드 높이 — 비치 배경(BeachBg.png 853×1844, 비율 0.4626)에 맞춰 720×1556. 이미지가 월드를
 *  찌그러짐 없이 꽉 채운다. 월드가 커질 일 없는 고정 격자 게임이라 가변 대신 고정 + contain. */
const WORLD_H = Math.round((W * 1844) / 853);

/** worldH 기준 하단 시간 게이지 밴드 %(씬의 gaugeTop·게이지 높이와 동일 좌표). */
const timerBandFor = (worldH: number) => {
  const gaugeH = Math.round(worldH * GAUGE_H_FRAC);
  const top = worldH - Math.round(worldH * GAUGE_BOTTOM_FRAC) - gaugeH;
  return {
    top: `${(top / worldH) * 100}%`,
    height: `${(gaugeH / worldH) * 100}%`,
  };
};

/** 레터박스 배경 — 비치 이미지 위/아래 가장자리 색(하늘 → 모래)으로 깔아, contain 으로 생기는
 *  얇은 위아래 띠가 이미지의 연장처럼 보이게(거의 안 보임). */
const STAGE_BG =
  "linear-gradient(180deg, #79dbfc 0%, #79dbfc 30%, #f7cf83 48%, #f7cf83 100%)";

/** 일시정지 오버레이가 열린 직후, 안드로이드 합성 click 고스트가 백드롭에 떨어져 바로 닫히는 것을
 *  막는 가드 구간. 이 시간 안의 백드롭 클릭은 무시한다(drop 과 동일 패턴). */
const BACKDROP_GUARD_MS = 350;

/** 일시정지 Resume pill — drop 의 primary 글래스 pill 과 같은 톤. */
const PAUSE_PILL_PRIMARY: CSSProperties = {
  // 공용 외곽선형 — 흰 채움 + 브라운 윤곽.
  ...textOutline(),
  minWidth: 200,
  padding: "12px 32px",
  borderRadius: 9999,
  cursor: "pointer",
  border: "2px solid rgba(255,255,255,0.92)",
  background: `linear-gradient(180deg, ${SEMANTIC.primaryLight} 0%, ${SEMANTIC.primary} 100%)`, // Primary 민트(주 CTA)
  boxShadow: "0 0 0 2px rgba(142,115,87,0.5), 0 3px 6px rgba(142,115,87,0.3)",
  fontSize: 22,
};

/** GAME OVER(TIME UP) 오버레이 — drop 과 같은 dim + 팝 텍스트. 잠깐 떴다 자동 재시작 때 사라진다. */
const TimeUpOverlay = () => {
  const textRef = useRef<HTMLDivElement>(null);
  useEffect(function popTimeUp() {
    textRef.current?.animate(
      [
        { transform: "scale(0.5)", opacity: 0, offset: 0 },
        { transform: "scale(1.12)", opacity: 1, offset: 0.6 },
        { transform: "scale(1)", opacity: 1, offset: 1 },
      ],
      { duration: 500, easing: "ease-out", fill: "both" },
    );
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9500,
        background: "rgba(40,70,110,0.4)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={textRef}
        style={{
          // 공용 버블 스타일 — 콤보·승패 배너와 동일.
          ...textBubble(),
          fontSize: "clamp(36px, 10vw, 96px)",
          whiteSpace: "nowrap",
        }}
      >
        TIME UP!
      </div>
    </div>
  );
};

/**
 * memory 게임 셸 — drop 의 GameContainer 패턴을 그대로 본떴다. 투명 Phaser 캔버스 위에 React DOM
 * HUD 오버레이를 합성하고, 씬에는 registry 로 HUD 콜백(MemoryHudConfig)을 주입한다. 일시정지·
 * 게임오버 오버레이는 박스가 아니라 viewport 전체를 덮는다(가로 화면 레터박스까지 균일 dim).
 */
export const GameShell = () => {
  // 1. refs
  const canvasParentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserNS.Game | null>(null);
  // 일시정지 오버레이가 열린 시각 — 직후 고스트 클릭으로 바로 닫히는 것을 막는 가드용.
  const pausedAtRef = useRef(0);

  // 2. state — 씬이 콜백으로 채우는 HUD 데이터.
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [boom, setBoom] = useState({ ratio: 0, banked: 0 });
  const [timer, setTimer] = useState({
    ratio: 1,
    seconds: GAME_TIME_MS / 1000,
  });
  const [paused, setPaused] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  // 하단 시간 게이지 밴드 % — 고정 worldH(WORLD_H) 기준(씬과 동일).
  const timerBand = timerBandFor(WORLD_H);

  // 4. effects — Phaser 인스턴스 부팅(마운트 1회).
  useEffect(function bootGame() {
    let disposed = false;

    const boot = async () => {
      const Phaser = await import("phaser");
      const { WireframeScene } = await import("./WireframeScene");
      const parent = canvasParentRef.current;
      if (disposed || !parent) {
        return;
      }

      // 게임 헤딩 폰트가 첫 렌더에 적용되도록 로드 대기(best-effort).
      try {
        await loadDisplayFont();
      } catch {
        // 폰트 로드 실패해도 fallback 으로 진행.
      }
      if (disposed) {
        return;
      }

      // 백킹 = 디자인×dpr(상한 2: 픽셀 비용 dpr², 저사양 폰 fps 보호). FIT(contain)으로 박스에 맞춘다.
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);

      // 씬은 React 외부라 registry 로 HUD 콜백을 받는다(drop 의 dropConfig 주입과 동일 패턴).
      const hudConfig: MemoryHudConfig = {
        onScore: setScore,
        onCombo: setCombo,
        onBoom: (ratio, banked) => setBoom({ ratio, banked }),
        onTimer: (ratio, seconds) => setTimer({ ratio, seconds }),
        onGameOver: () => {
          setTimeUp(true);
          window.setTimeout(() => setTimeUp(false), GAME_OVER_PAUSE_MS);
        },
      };

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: W * dpr,
        height: WORLD_H * dpr,
        // 투명 — 씬이 비치 배경·카드를 그리고, 레터박스는 부모 STAGE_BG 가 채운다.
        transparent: true,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [WireframeScene],
      });
      game.registry.set("dpr", dpr);
      game.registry.set("worldH", WORLD_H);
      game.registry.set("memoryHud", hudConfig);
      gameRef.current = game;
    };

    void boot();

    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // 3. handlers
  const pauseGame = () => {
    const game = gameRef.current;
    if (!game || paused) {
      return;
    }
    game.scene.getScenes(true).forEach((scene) => {
      game.scene.pause(scene.scene.key);
    });
    game.sound.pauseAll();
    pausedAtRef.current = Date.now(); // 직후 백드롭 고스트 클릭 무시 기준 시각.
    setPaused(true);
  };

  const resumeGame = () => {
    const game = gameRef.current;
    if (!game) {
      return;
    }
    game.scene.getScenes(false).forEach((scene) => {
      game.scene.resume(scene.scene.key);
    });
    game.sound.resumeAll();
    setPaused(false);
  };

  // 5. render
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: STAGE_BG,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 스테이지 박스 — 고정 720×WORLD_H 비율을 유지하는 "뷰포트에 들어가는 가장 큰 박스"(contain).
          비치 이미지가 박스를 정확히 채우고, 비율 차이로 생기는 얇은 위아래(또는 좌우) 띠는
          STAGE_BG(하늘→모래)가 채워 거의 안 보인다. 카드는 잘리지 않는다. */}
      <div
        style={{
          position: "relative",
          width: `min(100dvw, calc(100dvh * ${W} / ${WORLD_H}))`,
          height: `min(100dvh, calc(100dvw * ${WORLD_H} / ${W}))`,
          overflow: "hidden",
        }}
      >
        {/* Phaser 캔버스 — 박스를 꽉 채움(FIT). */}
        <div ref={canvasParentRef} style={{ position: "absolute", inset: 0 }} />

        {/* HUD — 박스 기준 absolute 오버레이. */}
        <Hud
          score={score}
          combo={combo}
          boomRatio={boom.ratio}
          boomBanked={boom.banked}
          timerRatio={timer.ratio}
          timerSeconds={timer.seconds}
          timerTop={timerBand.top}
          timerHeight={timerBand.height}
          onPause={pauseGame}
        />
      </div>

      {/* 일시정지 오버레이 — 씬을 멈춘 동안만. 백드롭/Resume 클릭으로 재개. */}
      {paused && (
        <div
          onClick={(e) => {
            // 백드롭(버튼 바깥)만 + 열린 직후 고스트 클릭 구간 제외.
            if (e.target !== e.currentTarget) {
              return;
            }
            if (Date.now() - pausedAtRef.current < BACKDROP_GUARD_MS) {
              return;
            }
            resumeGame();
          }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9500,
            background: "rgba(40,70,110,0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button type="button" onClick={resumeGame} style={PAUSE_PILL_PRIMARY}>
            Resume
          </button>
        </div>
      )}

      {/* TIME UP — 전체 시간 종료. 한 텀 머문 뒤 씬이 자동 재시작(dev 루프)하며 사라진다. */}
      {timeUp && <TimeUpOverlay />}
    </div>
  );
};
