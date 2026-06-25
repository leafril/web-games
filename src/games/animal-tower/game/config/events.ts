import type { GameResult } from "@/games/animal-tower/engine/gameTypes";

export const GAME_EVENT = {
  BLOCK_SETTLED: "tower-battle:block-settled",
  BLOCK_SPAWNED: "tower-battle:block-spawned",
  GAME_ENDED: "tower-battle:game-ended",
  ROTATE_REQUESTED: "tower-battle:rotate-requested",
  SWAP_REQUESTED: "tower-battle:swap-requested",
  SWAP_DEPLETED: "tower-battle:swap-depleted",
} as const;

export type BlockSettledPayload = {
  peakY: number;
  droppedCount: number;
};

export type BlockSpawnedPayload = {
  animalName: string;
};

type GameEndedPayload = GameResult;
