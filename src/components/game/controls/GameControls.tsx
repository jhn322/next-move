import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Piece from "@/components/game/board/Piece";
import { Chess, Square } from "chess.js";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Flag,
  UserPlus,
  AlertCircle,
  HandshakeIcon,
  Lightbulb,
  PlayCircle,
  Swords,
  TrendingUp,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BOTS_BY_DIFFICULTY } from "@/components/game/data/bots";
import { useRouter } from "next/navigation";
import { Bot } from "@/components/game/data/bots";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface GameControlsProps {
  difficulty: string;
  gameStatus: string;
  onResign: () => void;
  onDifficultyChange: (difficulty: string) => void;
  playerColor: "w" | "b";
  gameTime: number;
  whiteTime: number;
  blackTime: number;
  game: Chess;
  onMoveBack: () => void;
  onMoveForward: () => void;
  canMoveBack: boolean;
  canMoveForward: boolean;
  onRematch: () => void;
  history: { fen: string; lastMove: { from: string; to: string } | null }[];
  pieceSet: string;
  onNewBot: () => void;
  handleNewBotDialog: () => void;
  onHintRequested: () => void;
  isCalculatingHint: boolean;
  selectedBot?: Bot & { difficulty?: string };
}

interface GameStatusIndicatorProps {
  game: Chess;
}

interface PlayerIndicatorProps {
  color: "w" | "b";
  isActive: boolean;
  children: React.ReactNode;
}

// Game Status UI
const GameStatusIndicator = ({ game }: GameStatusIndicatorProps) => {
  if (game.isCheckmate()) {
    return (
      <div className="inline-flex items-center gap-1 sm:gap-2 bg-red-500/10 text-red-500 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full animate-pulse">
        <Swords className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="font-semibold text-xs sm:text-sm">Checkmate!</span>
      </div>
    );
  }

  if (game.isCheck()) {
    return (
      <div className="inline-flex items-center gap-1 sm:gap-2 bg-yellow-500/10 text-yellow-500 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full animate-pulse">
        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="font-semibold text-xs sm:text-sm">Check!</span>
      </div>
    );
  }

  if (game.isDraw()) {
    return (
      <div className="inline-flex items-center gap-1 sm:gap-2 bg-blue-500/10 text-blue-500 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
        <HandshakeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="font-semibold text-xs sm:text-sm">Draw!</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 sm:gap-2 bg-green-500/10 text-green-500 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
      <PlayCircle className="h-3 w-3 sm:h-4 sm:w-4" />
      <span className="font-semibold text-xs sm:text-sm">In Progress</span>
    </div>
  );
};

// Player(s) UI
const PlayerIndicator = ({
  color,
  isActive,
  children,
}: PlayerIndicatorProps) => {
  const getColors = () => {
    if (color === "w") {
      return {
        bg: isActive ? "bg-blue-500/10" : "bg-blue-500/5",
        text: isActive ? "text-blue-500" : "text-blue-500/50",
        border: isActive ? "border-blue-500/20" : "border-transparent",
      };
    }
    return {
      bg: isActive ? "bg-red-500/10" : "bg-red-500/5",
      text: isActive ? "text-red-500" : "text-red-500/50",
      border: isActive ? "border-red-500/20" : "border-transparent",
    };
  };

  const { bg, text, border } = getColors();

  return (
    <div
      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg border ${bg} ${text} ${border} transition-all duration-200`}
    >
      <Crown
        className={`h-4 w-4 sm:h-5 sm:w-5 ${
          isActive ? "animate-pulse" : "opacity-50"
        } ${color === "w" ? "fill-current" : ""}`}
      />
      <span className="font-medium text-sm sm:text-base">{children}</span>
    </div>
  );
};

const GameControls = ({
  gameStatus,
  onResign,
  playerColor,
  gameTime,
  whiteTime,
  blackTime,
  game,
  onMoveBack,
  onMoveForward,
  canMoveBack,
  canMoveForward,
  onRematch,
  history,
  pieceSet,
  handleNewBotDialog,
  onHintRequested,
  isCalculatingHint,
  difficulty,
  selectedBot,
}: GameControlsProps) => {
  const router = useRouter();
  const currentTurn = gameStatus.toLowerCase().includes("white") ? "w" : "b";
  const isGameOver = game.isGameOver() || game.isResigned;
  const isPlayerWinner = useCallback(() => {
    if (game.isCheckmate()) {
      const losingColor = game.turn();
      return losingColor !== playerColor;
    }
    return false;
  }, [game, playerColor]);

  // Function to find the next harder bot
  const findNextHarderBot = useCallback(() => {
    if (!selectedBot) return null;

    const difficulties = [
      "beginner",
      "easy",
      "intermediate",
      "advanced",
      "hard",
      "expert",
      "master",
      "grandmaster",
    ];

    // Find current difficulty index
    const currentDifficultyIndex = difficulties.indexOf(difficulty);

    // Get all bots in the current difficulty
    const botsInCurrentDifficulty = BOTS_BY_DIFFICULTY[difficulty];

    // Find the current bot's index
    const currentBotIndex = botsInCurrentDifficulty.findIndex(
      (bot) => bot.id === selectedBot.id
    );

    // If there's a next bot in the same difficulty
    if (currentBotIndex < botsInCurrentDifficulty.length - 1) {
      const nextBot = botsInCurrentDifficulty[currentBotIndex + 1];
      return { bot: nextBot, difficulty };
    }

    // If we need to move to the next difficulty
    if (currentDifficultyIndex < difficulties.length - 1) {
      const nextDifficulty = difficulties[currentDifficultyIndex + 1];
      const nextDifficultyBots = BOTS_BY_DIFFICULTY[nextDifficulty];
      if (nextDifficultyBots && nextDifficultyBots.length > 0) {
        return { bot: nextDifficultyBots[0], difficulty: nextDifficulty };
      }
    }

    return null;
  }, [selectedBot, difficulty]);

  // Handle navigation to the next harder bot
  const handlePlayNextBot = () => {
    game.reset();
    game.isResigned = false;

    const nextBotInfo = findNextHarderBot();
    if (nextBotInfo) {
      router.push(`/play/${nextBotInfo.difficulty}/${nextBotInfo.bot.id}`);
    }
  };

  useEffect(() => {
    const scrollArea = document.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [history.length]);

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getMoveNumber = (index: number) => {
    return Math.ceil((index + 1) / 2);
  };

  const formatMove = (move: { from: string; to: string } | null) => {
    if (!move) return "-";
    return `${move.from}-${move.to}`;
  };

  const getPieceMoved = (fen: string, move: { from: string; to: string }) => {
    const tempGame = new Chess(fen);
    const piece = tempGame.get(move.from as Square);
    return piece ? piece.type : null;
  };

  return (
    <div className="space-y-3 laptop-screen:space-y-2 rounded-lg border border-border bg-card p-3 w-full lg:p-4 max-h-[calc(100vh-8rem)] laptop-screen:max-h-[calc(100vh-6rem)] overflow-y-auto">
      {/* Game Info Group */}
      <div className="space-y-2 laptop-screen:space-y-1">
        <Card className="border-0 shadow-none">
          <CardHeader className="p-2 pb-1 md:p-3 md:pb-1 lg:p-4 lg:pb-2">
            <CardTitle className="flex items-center text-sm sm:text-md">
              <span className="mr-2 text-muted-foreground text-xs sm:text-sm">
                Game Status:
              </span>
              <GameStatusIndicator game={game} />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0 md:p-3 md:pt-0 lg:p-4 lg:pt-0">
            <div className="flex items-center gap-3">
              <PlayerIndicator color="w" isActive={currentTurn === "w"}>
                White
              </PlayerIndicator>
              <span className="text-muted-foreground font-medium">vs</span>
              <PlayerIndicator color="b" isActive={currentTurn === "b"}>
                Black
              </PlayerIndicator>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader className="p-2 pb-1 md:p-3 md:pb-1 lg:p-4 lg:pb-2">
            <CardTitle className="text-sm sm:text-md">Game Timer</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0 md:p-3 md:pt-0 lg:p-4 lg:pt-0 space-y-1 sm:space-y-2 laptop-screen:space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs sm:text-sm">
                Total:
              </span>
              <span className="font-mono text-base sm:text-xl">
                {formatTime(gameTime)}
              </span>
            </div>
            <div className="h-px bg-border/50" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs sm:text-sm">
                White:
              </span>
              <span
                className={`font-mono text-base sm:text-xl ${
                  currentTurn === "w" && !game.isGameOver()
                    ? "text-blue-400"
                    : ""
                }`}
              >
                {formatTime(whiteTime)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs sm:text-sm">
                Black:
              </span>
              <span
                className={`font-mono text-base sm:text-xl ${
                  currentTurn === "b" && !game.isGameOver()
                    ? "text-red-400"
                    : ""
                }`}
              >
                {formatTime(blackTime)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Move History */}
      <Card className="border-0 shadow-none">
        <CardHeader className="p-2 pb-1 md:p-3 md:pb-1 lg:p-4 lg:pb-2">
          <CardTitle className="text-sm sm:text-md">Move History</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0 md:p-3 md:pt-0 lg:p-4 lg:pt-0">
          <ScrollArea className="h-[200px] sm:h-[300px] md:h-[300px] lg:h-[300px] xl:h-[400px] laptop-screen:h-[200px] w-full rounded-md border">
            <div className="p-2 sm:p-4 space-y-1">
              {history.slice(1).map((historyItem, index) => {
                const pieceType = historyItem.lastMove
                  ? getPieceMoved(history[index].fen, historyItem.lastMove)
                  : null;

                const isLatestMove = index === history.length - 2;

                return (
                  <div
                    key={index}
                    className="flex items-center text-xs sm:text-sm"
                  >
                    {index % 2 === 0 ? (
                      // White's move
                      <div className="flex items-center w-full bg-accent/50 rounded-sm">
                        <span className="text-muted-foreground w-3 sm:w-4 text-right mr-2 sm:mr-4 pl-1 sm:pl-2">
                          {getMoveNumber(index)}.
                        </span>
                        <div className="flex items-center gap-1 text-blue-400 w-full py-0.5 sm:py-1 pr-1 sm:pr-2">
                          <div className="flex-1 flex items-center">
                            <span
                              className={`${
                                isLatestMove
                                  ? "bg-primary/20 rounded-[2px] px-1 -ml-1"
                                  : ""
                              }`}
                            >
                              {formatMove(historyItem.lastMove)}
                            </span>
                          </div>
                          {pieceType && (
                            <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center brightness-0 dark:brightness-0 dark:invert">
                              <Piece
                                type={pieceType.toUpperCase()}
                                pieceSet={pieceSet}
                                variant="symbol"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Black's move
                      <div className="flex items-center w-full bg-background">
                        <span className="text-muted-foreground w-3 sm:w-4 text-right mr-2 sm:mr-4 pl-1 sm:pl-2">
                          {getMoveNumber(index)}.
                        </span>
                        <div className="flex items-center gap-1 text-red-400 w-full py-0.5 sm:py-1 pr-1 sm:pr-2">
                          <div className="flex-1 flex items-center">
                            <span
                              className={`${
                                isLatestMove
                                  ? "bg-primary/20 rounded-[2px] px-1 -ml-1"
                                  : ""
                              }`}
                            >
                              {formatMove(historyItem.lastMove)}
                            </span>
                          </div>
                          {pieceType && (
                            <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center brightness-0 dark:brightness-0 dark:invert">
                              <Piece
                                type={pieceType.toUpperCase()}
                                pieceSet={pieceSet}
                                variant="symbol"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Player Controls Group */}
      <div className="space-y-2">
        <Card className="border-0 shadow-none">
          <CardHeader className="p-2 pb-1 md:p-3 md:pb-1 lg:p-4 lg:pb-2">
            <CardTitle className="text-sm sm:text-md">Game Controls</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0 md:p-3 md:pt-0 lg:p-4 lg:pt-0 space-y-2 sm:space-y-3 laptop-screen:space-y-2">
            {/* Move Controls */}
            <div className="flex gap-3 laptop-screen:gap-2 justify-center">
              <Button
                variant="outline"
                size="default"
                onClick={onMoveBack}
                disabled={!canMoveBack || isGameOver}
                className="flex-1 py-1.5 sm:py-2 md:py-3 laptop-screen:py-1.5 text-sm sm:text-base font-medium flex items-center justify-center gap-2"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                Back
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={onMoveForward}
                disabled={!canMoveForward || isGameOver}
                className="flex-1 py-1.5 sm:py-2 md:py-3 laptop-screen:py-1.5 text-sm sm:text-base font-medium flex items-center justify-center gap-2"
              >
                Forward
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            <div className="h-px bg-border/50 my-1"></div>

            {/* Primary Action Buttons */}
            <div className="space-y-2 laptop-screen:space-y-1">
              {/* "Next Bot" button only when player wins */}
              {isGameOver && isPlayerWinner() && selectedBot && (
                <>
                  <div className="mb-4 text-center">
                    <span className="text-xs text-muted-foreground">
                      Ready for a tougher challenge?
                    </span>
                    {(() => {
                      const nextBotInfo = findNextHarderBot();
                      if (nextBotInfo) {
                        return (
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage
                                src={nextBotInfo.bot.image}
                                alt={nextBotInfo.bot.name}
                              />
                              <AvatarFallback>B</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-xs">
                              {nextBotInfo.bot.name}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded-full capitalize">
                              {nextBotInfo.difficulty}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded-full">
                              {nextBotInfo.bot.rating} ELO
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handlePlayNextBot}
                          variant="default"
                          className="w-full py-1.5 sm:py-2 md:py-3 laptop-screen:py-1.5 text-sm sm:text-base font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                        >
                          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                          Next Challenge
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Face the next stronger opponent with higher ELO rating
                          and skill level
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}

              {/* Game Action Buttons */}
              <div className="flex gap-3 laptop-screen:gap-2">
                {/* Hint Button */}
                {!isGameOver && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={onHintRequested}
                          variant="outline"
                          disabled={
                            game.isGameOver() ||
                            game.turn() !== playerColor ||
                            isCalculatingHint
                          }
                          className="flex-1 py-1.5 sm:py-2 md:py-3 laptop-screen:py-1.5 text-sm sm:text-base font-medium flex items-center justify-center gap-2"
                        >
                          <Lightbulb
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${
                              isCalculatingHint ? "animate-pulse" : ""
                            }`}
                          />
                          {isCalculatingHint ? "Thinking..." : "Hint"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Get a suggestion for your next move</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Rematch Button - Only show when game is over */}
                {isGameOver ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={onRematch}
                          variant="secondary"
                          className="flex-1 py-1.5 sm:py-2 md:py-3 laptop-screen:py-1.5 text-sm sm:text-base font-medium flex items-center justify-center gap-2"
                        >
                          <HandshakeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          Rematch
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Play again versus the same bot and settings</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={onResign}
                          variant="destructive"
                          className="flex-1 py-1.5 sm:py-2 md:py-3 laptop-screen:py-1.5 text-sm sm:text-base font-medium flex items-center justify-center gap-2"
                        >
                          <Flag className="h-4 w-4 sm:h-5 sm:w-5" />
                          Resign
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Forfeit the current game</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* New Bot Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleNewBotDialog}
                      variant="outline"
                      className="w-full py-1.5 sm:py-2 md:py-3 laptop-screen:py-1.5 text-sm sm:text-base font-medium flex items-center justify-center gap-2"
                    >
                      <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                      New Bot
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Choose a different bot to play against</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GameControls;
