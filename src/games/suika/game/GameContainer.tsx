"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type PhaserNS from "phaser";

import { setGameFont } from "./config/fonts";
import { FIRE_DESCENT_EVENT } from "./events";
import { Hud, type EvolutionItem } from "./hud";
import type { DropGameConfig } from "./types";

/** GAME OVER 연출이 머문 뒤 결과(ResultScreen)로 넘어가기까지 — 플레이어가 "끝남"을 인지할 텀. */
const GAME_OVER_BEAT_MS = 1400;

/**
 * 일시정지 오버레이가 열린 직후 백드롭 닫힘을 무시하는 구간(ms). 일시정지 버튼은 pointerdown 으로
 * 즉시 오버레이를 여는데, 안드로이드는 같은 탭의 합성 click(최대 ~300ms 지연)이 직후 나타난
 * 백드롭으로 떨어져 곧장 resume(닫힘)된다. 이 구간만 백드롭 클릭을 무시해 고스트 클릭을 막는다
 * (iOS 의 즉시 열림 동작은 그대로 유지). 실제로 닫으려는 탭은 오버레이를 본 뒤라 이 구간 밖이다.
 */
const BACKDROP_GUARD_MS = 350;

/**
 * 스테이지 박스 최대 가로 비율 — 세로 디자인(GameScene VIEW_W:VIEW_H = 720:1280).
 *
 * drop 은 박스 비율을 그대로 월드로 쓰므로(세로 = 박스 비율대로 가변), 박스가 이 비율보다
 * 가로로 넓어지지 않게 cap 한다. 태블릿 가로(landscape)에서 통이 납작해지는 대신, 세로 게임을
 * 좌우 레터박스로 띄운다(tower-battle 의 `contain` 거동과 동일). 세로 화면에서는 `max-width`
 * 가 풀려 박스가 화면 폭을 꽉 채우고 더 긴 통(추가 플레이 공간)을 유지한다.
 */
const STAGE_ASPECT = "720 / 1280";

/**
 * GAME OVER 오버레이 — 통이 넘쳐 끝났을 때 HUD 까지 덮는 React 오버레이(일시정지와 같은 층).
 * 잠깐 팝으로 떴다가, 호스트가 결과 화면으로 교체하며 통째 unmount 된다.
 */
const GameOverOverlay = () => {
  const textRef = useRef<HTMLDivElement>(null);
  useEffect(function popGameOver() {
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
        background: "rgba(40,70,110,0.4)", // 4종 게임 공통 게임오버 dim(alpha 0.4)
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={textRef}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          // 4종 게임 공통 gameOver:countdown ≈ 0.6 비율. 카운트다운(120 월드px)에 맞춘 크기.
          fontSize: "clamp(36px, 10vw, 96px)",
          color: "#ffffff",
          WebkitTextStroke: "0.06em #3E2723", // brown900 — HUD·카운트다운 외곽선과 동일 톤
          paintOrder: "stroke fill",
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
        }}
      >
        GAME OVER
      </div>
    </div>
  );
};

/** 일시정지 버튼 공통 — 크기·폰트·라운드. 색·강조는 primary/secondary 가 덮는다. */
const PAUSE_PILL_BASE: CSSProperties = {
  minWidth: 200,
  padding: "12px 32px",
  borderRadius: 9999,
  color: "#ffffff",
  fontFamily: "var(--font-display)",
  fontWeight: 900,
  paintOrder: "stroke fill",
  cursor: "pointer",
};

/** Primary(Resume) — 권장 동작. 솔리드 아이시 글래스 pill(HUD 톤). */
const PAUSE_PILL_PRIMARY: CSSProperties = {
  ...PAUSE_PILL_BASE,
  border: "2px solid rgba(255,255,255,0.75)",
  background: "linear-gradient(180deg, #dcecfb 0%, #c2d9f3 100%)",
  boxShadow:
    "inset 0 2px 3px rgba(255,255,255,0.6), 0 3px 6px rgba(70,105,160,0.28)",
  fontSize: 22,
  WebkitTextStroke: "0.08em #6a93cc",
};

/** Secondary(Home) — 이탈. 고스트(반투명 면 + 얇은 키라인), 더 작고 옅어 위계를 낮춘다. */
const PAUSE_PILL_SECONDARY: CSSProperties = {
  ...PAUSE_PILL_BASE,
  border: "2px solid rgba(255,255,255,0.45)",
  background: "rgba(255,255,255,0.12)",
  fontSize: 19,
  WebkitTextStroke: "0.04em rgba(106,147,204,0.6)",
};

/**
 * 게임-박스 — 자기완결(self-contained) drop 게임 진입점. Phaser 캔버스와 React HUD 를
 * 한 박스 안에 합성하고, 외부 의존은 전부 DropGameConfig props 로 받는다(모노레포 의존 0).
 *
 * 동작:
 * - Phaser 부팅: 폭 720 고정, 세로는 박스 비율대로 가변(세로 드롭이라 길수록 플레이 공간↑).
 *   백킹을 디자인×dpr 로 키워 선명도 확보, dpr·dropConfig 를 registry 로 씬에 주입.
 * - HUD: 박스 기준 absolute 오버레이. onScore/onGauge 콜백으로 점수·게이지를 채운다.
 * - 입력: 아이템 발사는 FIRE_DESCENT_EVENT(씬이 수신), 일시정지는 씬 pause + 오버레이.
 *
 * 결과 화면·세션·홈 이탈은 호스트(라우트 어댑터)가 onGameEnd 로 받아 처리한다.
 */
export const GameContainer = (config: DropGameConfig) => {
  // 1. refs
  const canvasParentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserNS.Game | null>(null);
  // boot 은 1회지만 합성 콜백은 최신 호스트 콜백을 호출해야 하므로 ref 로 최신값 유지.
  const configRef = useRef(config);
  configRef.current = config;
  // GAME OVER 연출 후 호스트 onGameEnd 를 호출하는 지연 타이머 — unmount 시 정리.
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 일시정지 오버레이가 열린 시각 — 직후 안드로이드 고스트 클릭으로 바로 닫히는 것을 막는 가드용.
  const pausedAtRef = useRef(0);

  // 2. state — 씬이 콜백으로 채우는 HUD 데이터.
  const [score, setScore] = useState(0);
  // 이번 판 최고 점수(세션 내). 표시용 best 는 아래에서 역대 최고(config.initialBest)와 max.
  const [sessionBest, setSessionBest] = useState(0);
  const [gauge, setGauge] = useState({ ratio: 0, charges: 0, maxCharges: 3 });
  const [paused, setPaused] = useState(false);
  const [apexUnlocked, setApexUnlocked] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  // 충전 번개가 게이지에 빨려든 순간마다 +1 — AbilityGauge 가 이 변화에 아이콘을 펄스.
  const [chargePulse, setChargePulse] = useState(0);

  // 4. effects — Phaser 인스턴스 부팅(마운트 1회).
  useEffect(function bootGame() {
    let disposed = false;

    (async () => {
      const Phaser = await import("phaser");
      const { GameScene, VIEW_W, VIEW_H } = await import("./GameScene");
      const parent = canvasParentRef.current;
      if (disposed || !parent) {
        return;
      }

      // 폰트 주입 — 게임 코어는 폰트 로딩을 소유하지 않음. 호스트가 family 제공, 없으면 sans-serif.
      const fontFamily = configRef.current.fontFamily;
      if (fontFamily) {
        setGameFont(fontFamily);
      }

      // 백킹 = 디자인×dpr(상한 2: 픽셀 비용 dpr², 저사양 폰 fps 보호). 폭 720 고정, 세로 가변.
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
      const { clientWidth: cw, clientHeight: ch } = parent;
      const viewH = cw > 0 ? Math.round((VIEW_W * ch) / cw) : VIEW_H;

      // HUD 를 구동하는 onScore/onGauge 를 호스트 콜백 위에 합성한다(호스트도 받으면 함께 호출).
      const merged: DropGameConfig = {
        ...configRef.current,
        onScore: (s, level) => {
          setScore(s);
          setSessionBest((b) => Math.max(b, s));
          configRef.current.onScore?.(s, level);
        },
        onGauge: (ratio, charges, maxCharges) => {
          setGauge({ ratio, charges, maxCharges });
          configRef.current.onGauge?.(ratio, charges, maxCharges);
        },
        onApexUnlock: () => {
          setApexUnlocked(true);
          configRef.current.onApexUnlock?.();
        },
        onChargeArrive: () => {
          setChargePulse((n) => n + 1);
          configRef.current.onChargeArrive?.();
        },
        // GAME OVER 오버레이를 먼저 띄우고, 한 텀 뒤 호스트로 결과를 넘긴다(결과 화면 전환).
        onGameEnd: (result) => {
          setGameOver(true);
          endTimerRef.current = setTimeout(() => {
            configRef.current.onGameEnd?.(result);
          }, GAME_OVER_BEAT_MS);
        },
      };

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: VIEW_W * dpr,
        height: viewH * dpr,
        // 투명 — 씬이 그리기 전엔 부모 배경이 비친다.
        transparent: true,
        physics: {
          default: "matter",
          // 물리 스텝 120Hz — 기본 60Hz 고정 스텝은 120Hz 화면(ProMotion)에서 두 프레임에 한 번만
          // body 위치가 갱신돼 빠르게 떨어지는 과일이 점프(모션 저더)한다. 화면 주사율에 맞춰 매끈하게.
          // TODO: 저사양(60Hz) 기기엔 과한 비용 → 화면 주사율 감지해 적응형으로 분기 검토.
          matter: {
            gravity: { x: 0, y: 1 },
            debug: false,
            runner: { fps: 120 },
          },
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [GameScene],
      });
      // 씬은 React 외부라 registry 로 주입받는다 — dpr(선명도 보정)·dropConfig(외부 의존).
      game.registry.set("dpr", dpr);
      game.registry.set("dropConfig", merged);
      gameRef.current = game;
    })();

    return () => {
      disposed = true;
      if (endTimerRef.current) {
        clearTimeout(endTimerRef.current);
      }
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // 3. handlers
  const handleItemFire = () => {
    // 씬이 window 이벤트로 수신(fireDescent 가 카운트·락 가드 자체 보유).
    window.dispatchEvent(new CustomEvent(FIRE_DESCENT_EVENT));
  };

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

  // 표시 best = 역대 최고(호스트 주입, BE bestScores) 와 이번 판 최고 중 큰 값. initialBest 가 늦게
  // 로드돼도(비-suspense) 반영되고, 게임 중 갱신도 함께 잡는다.
  const best = Math.max(sessionBest, config.initialBest ?? 0);

  // 진화 바 — 호스트 objects 의 imageUrl 우선, 없으면 EvolutionBar 가 로컬 얼음 fallback.
  const evolutionItems: EvolutionItem[] | undefined = config.objects?.map(
    (obj) => ({ name: obj.name, src: obj.imageUrl ?? null }),
  );

  // 5. render
  return (
    // 바깥 — viewport 를 채우고 스테이지 박스를 가운데 정렬. 박스 좌우 레터박스는 호스트
    // 배경(STAGE_BG)이 비친다(이 박스는 투명).
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 스테이지 박스 — 세로 디자인 비율로 cap. 가로 화면에선 세로 박스로 좁아져 좌우
          레터박스(tower-battle contain 거동), 세로 화면에선 max-width 가 풀려 폭을 꽉 채운다.
          Phaser·HUD·오버레이가 모두 이 박스를 기준으로 배치된다. */}
      <div
        style={{
          position: "relative",
          height: "100%",
          aspectRatio: STAGE_ASPECT,
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        {/* Phaser 캔버스 — 박스를 꽉 채움(FIT, 캔버스 비율=박스 비율이라 레터박스 없음). */}
        <div ref={canvasParentRef} style={{ position: "absolute", inset: 0 }} />

        {/* HUD — 박스 기준 absolute 오버레이. 캔버스 위에 고정(zIndex 는 슬롯이 소유). */}
        <Hud
          score={score}
          best={best}
          gaugeRatio={gauge.ratio}
          charges={gauge.charges}
          maxCharges={gauge.maxCharges}
          chargePulse={chargePulse}
          evolutionItems={evolutionItems}
          apexUnlocked={apexUnlocked}
          onItemFire={handleItemFire}
          onPause={pauseGame}
        />
      </div>

      {/* 일시정지·GAME OVER 오버레이는 박스가 아니라 viewport 전체를 덮는다 — 가로 화면
          레터박스 영역까지 dim 이 균일하게 깔리도록 root 자식으로 둔다. */}
      {/* 일시정지 오버레이 — 씬을 멈춘 동안만. Resume(재개) + Home(로비, 호스트 onExit 있을 때만). */}
      {paused && (
        <div
          // 백드롭(버튼 바깥) 클릭 시 resume. 버튼 클릭은 currentTarget 이 아니라 무시된다.
          // 열린 직후(BACKDROP_GUARD_MS) 안드로이드 합성 click 고스트는 무시 — 바로 닫히는 버그 방지.
          onClick={(e) => {
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
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <button type="button" onClick={resumeGame} style={PAUSE_PILL_PRIMARY}>
            Resume
          </button>
          {config.onExit && (
            <button
              type="button"
              onClick={config.onExit}
              style={PAUSE_PILL_SECONDARY}
            >
              Home
            </button>
          )}
        </div>
      )}

      {/* GAME OVER — 통이 넘쳐 끝났을 때. 한 텀 머문 뒤 호스트가 결과 화면으로 교체한다. */}
      {gameOver && <GameOverOverlay />}
    </div>
  );
};
