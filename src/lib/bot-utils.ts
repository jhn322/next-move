import { Bot, BOTS_BY_DIFFICULTY } from "@/components/game/data/bots";

/**
 * Find a bot by its ID
 * @param botId The ID of the bot to find
 * @returns The bot object or null if not found
 */
export const findBotById = (
  botId: number
): (Bot & { difficulty: string }) | null => {
  for (const [difficulty, bots] of Object.entries(BOTS_BY_DIFFICULTY)) {
    const bot = bots.find((b) => b.id === botId);
    if (bot) {
      return { ...bot, difficulty };
    }
  }
  return null;
};

/**
 * Get all bots with their difficulty level
 * @returns Array of all bots with their difficulty level
 */
export const getAllBots = (): Array<Bot & { difficulty: string }> => {
  const allBots: Array<Bot & { difficulty: string }> = [];

  Object.entries(BOTS_BY_DIFFICULTY).forEach(([difficulty, bots]) => {
    bots.forEach((bot) => {
      allBots.push({ ...bot, difficulty });
    });
  });

  return allBots;
};
