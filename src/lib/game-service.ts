import { Chess } from "chess.js";
import { Bot, BOTS_BY_DIFFICULTY } from "@/components/game/data/bots";
import { Session } from "next-auth";
import { DIFFICULTY_LEVELS } from "@/config/game";
import {
  GameHistory,
  saveGameResult as saveGameToDb,
  getUserGameHistory as getGameHistoryFromDb,
  clearUserGameHistory as clearHistoryFromDb,
} from "./mongodb-service";

interface SaveGameResultParams {
  userId: string;
  game: Chess;
  difficulty: string;
  playerColor: "w" | "b";
  selectedBot: Bot | null;
  gameTime: number;
  movesCount: number;
  isResignation?: boolean;
  session: Session | null;
}

/**
 * Determines the game result from the player's perspective
 */
export const determineGameResult = (
  game: Chess,
  playerColor: "w" | "b",
  isResignation?: boolean
): "win" | "loss" | "draw" | "resign" => {
  if (isResignation) {
    return "resign";
  }

  if (game.isDraw()) {
    return "draw";
  }

  if (game.isCheckmate()) {
    const losingColor = game.turn();
    const winningColor = losingColor === "w" ? "b" : "w";
    return winningColor === playerColor ? "win" : "loss";
  }

  // Default case (should not happen)
  return "draw";
};

/**
 * Normalize difficulty to ensure it matches one of the valid difficulty levels
 */
const normalizeDifficulty = (difficulty: string): string => {
  // Convert to lowercase for case-insensitive comparison
  const normalizedDifficulty = difficulty.toLowerCase();

  // Check if the difficulty is one of the valid keys in DIFFICULTY_LEVELS
  if (Object.keys(DIFFICULTY_LEVELS).includes(normalizedDifficulty)) {
    return normalizedDifficulty;
  }

  // Map "medium" to "intermediate" for backward compatibility
  if (normalizedDifficulty === "medium") {
    return "intermediate";
  }

  // Default to "intermediate" if not recognized
  return "intermediate";
};

/**
 * Saves a game result to the database
 */
export const saveGameResult = async ({
  userId,
  game,
  difficulty,
  playerColor,
  selectedBot,
  gameTime,
  movesCount,
  isResignation = false,
}: SaveGameResultParams): Promise<GameHistory | null> => {
  try {
    if (!userId || !selectedBot) {
      console.error("Missing required parameters to save game result");
      return null;
    }

    const result = determineGameResult(game, playerColor, isResignation);
    const normalizedDifficulty = normalizeDifficulty(difficulty);

    const gameData: Omit<GameHistory, "id"> = {
      user_id: userId,
      opponent: selectedBot.name,
      result,
      date: new Date().toISOString(),
      moves_count: movesCount,
      time_taken: gameTime,
      difficulty: normalizedDifficulty,
      fen: game.fen(),
    };

    return await saveGameToDb(gameData);
  } catch (error) {
    console.error("Unexpected error saving game result:", error);
    return null;
  }
};

/**
 * Gets all game history for a user
 */
export const getUserGameHistory = async (
  userId: string,
  session: Session | null
): Promise<GameHistory[]> => {
  try {
    if (!userId || !session) {
      console.error("Missing required parameters to fetch game history");
      throw new Error("Authentication required");
    }

    const gameHistory = await getGameHistoryFromDb(userId);

    // Normalize difficulty values in the retrieved data
    return gameHistory.map((game) => ({
      ...game,
      difficulty: normalizeDifficulty(game.difficulty),
    }));
  } catch (error) {
    console.error("Unexpected error fetching game history:", error);
    throw error;
  }
};

/**
 * Gets statistics about a user's game history
 */
export const getUserGameStats = async (
  userId: string,
  session: Session | null
) => {
  try {
    if (!userId || !session) {
      console.error("Missing required parameters to fetch game stats");
      throw new Error("Authentication required");
    }

    const gameHistory = await getUserGameHistory(userId, session);

    if (gameHistory.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        resigns: 0,
        winRate: 0,
        averageMovesPerGame: 0,
        averageGameTime: 0,
        beatenBots: [] as Array<{
          name: string;
          difficulty: string;
          id: number;
        }>,
      };
    }

    // Calculate statistics
    const wins = gameHistory.filter((game) => game.result === "win").length;
    const losses = gameHistory.filter((game) => game.result === "loss").length;
    const draws = gameHistory.filter((game) => game.result === "draw").length;
    const resigns = gameHistory.filter(
      (game) => game.result === "resign"
    ).length;
    const totalGames = gameHistory.length;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    const totalMoves = gameHistory.reduce(
      (sum, game) => sum + game.moves_count,
      0
    );
    const averageMovesPerGame = totalGames > 0 ? totalMoves / totalGames : 0;

    const totalTime = gameHistory.reduce(
      (sum, game) => sum + game.time_taken,
      0
    );
    const averageGameTime = totalGames > 0 ? totalTime / totalGames : 0;

    // Get list of bots the player has beaten
    const beatenBots = Array.from(
      new Set(
        gameHistory
          .filter((game) => game.result === "win")
          .map((game) => {
            // Find the bot in BOTS_BY_DIFFICULTY to get its ID
            const difficulty = normalizeDifficulty(game.difficulty);
            const botInDifficulty = BOTS_BY_DIFFICULTY[
              difficulty as keyof typeof BOTS_BY_DIFFICULTY
            ]?.find((bot) => bot.name === game.opponent);

            return {
              name: game.opponent,
              difficulty: normalizeDifficulty(game.difficulty),
              id: botInDifficulty?.id || 0,
            };
          })
      )
    );

    return {
      totalGames,
      wins,
      losses,
      draws,
      resigns,
      winRate,
      averageMovesPerGame,
      averageGameTime,
      beatenBots,
    };
  } catch (error) {
    console.error("Error calculating game stats:", error);
    throw error;
  }
};

export const clearUserGameHistory = async (
  userId: string,
  session: Session | null
): Promise<boolean> => {
  try {
    if (!userId || !session) {
      console.error("Missing required parameters to clear game history");
      return false;
    }

    const success = await clearHistoryFromDb(userId);

    if (success && typeof window !== "undefined") {
      // Clear all game-related data from localStorage
      localStorage.removeItem("last-saved-game-id");
      localStorage.removeItem("last-saved-game-fen");
      localStorage.removeItem("chess-game-history");
      localStorage.removeItem("chess-game-stats");
      localStorage.removeItem("chess-last-game-result");
    }

    return success;
  } catch (error) {
    console.error("Unexpected error clearing game history:", error);
    return false;
  }
};
