import { useState, useEffect, useCallback, useMemo } from "react";
import { Bot } from "@/components/game/data/bots";
import { useWindowSize } from "react-use";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Chess } from "chess.js";
import Confetti from "react-confetti";
import { saveGameResult } from "@/lib/game-service";
import { useAuth } from "@/context/auth-context";

const VICTORY_MESSAGES = [
  "Brilliant moves! Sweet victory!",
  "Checkmate! You're a tactical genius!",
  "The perfect strategy! Well played!",
  "Masterful play! The bot never stood a chance!",
  "Amazing win! Your chess skills are impressive!",
];

const DEFEAT_MESSAGES = [
  "You'll get them next time!",
  "A tough match! Keep practicing!",
  "So close! Learn from this and come back stronger!",
  "The bot got lucky this time!",
  "A challenging opponent! Ready for a rematch?",
];

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRematch: () => void;
  onNewBot: () => void;
  game: Chess;
  difficulty: string;
  isResignation?: boolean;
  onConfirmResign?: (game: Chess) => void;
  playerColor: "w" | "b";
  handleNewBotDialog: () => void;
  selectedBot: Bot | null;
  playerName: string;
  gameTime: number;
  movesCount: number;
}

const VictoryModal = ({
  isOpen,
  onClose,
  onRematch,
  game,
  difficulty,
  isResignation = false,
  onConfirmResign,
  playerColor,
  onNewBot,
  selectedBot,
  playerName: defaultPlayerName,
  gameTime,
  movesCount,
}: VictoryModalProps) => {
  const [message, setMessage] = useState<string | React.ReactNode>("");
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isRecycling, setIsRecycling] = useState(false);
  const [victoryMessage, setVictoryMessage] = useState("");
  const [defeatMessage, setDefeatMessage] = useState("");
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [playerAvatar, setPlayerAvatar] = useState("/default-pfp.png");
  const [resultSaved, setResultSaved] = useState(false);
  const { session } = useAuth();

  // Generate a unique game ID based on current state to prevent duplicate saves
  const gameStateId = useMemo(() => {
    if (!game || !selectedBot) return "";

    // Create a stable ID that doesn't change on refresh
    // Use the game FEN, bot name, player color, and difficulty
    // This is stable across refreshes for the same game state
    return `${game.fen()}_${selectedBot.name}_${playerColor}_${difficulty}`;
  }, [game, selectedBot, playerColor, difficulty]);

  // Load player data from localStorage and check if this game has already been saved
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPlayerName = localStorage.getItem("chess-player-name");
      const savedAvatarUrl = localStorage.getItem("chess-player-avatar");

      if (savedPlayerName) {
        setPlayerName(savedPlayerName);
      }

      if (savedAvatarUrl) {
        setPlayerAvatar(savedAvatarUrl);
      }

      // Check if this exact game result has already been saved
      // We use the game FEN as the primary key for detecting duplicates
      const savedGameFen = localStorage.getItem("last-saved-game-fen");

      if (savedGameFen === game.fen()) {
        console.log("Game result already saved, preventing duplicate save");
        setResultSaved(true);
      }
    }
  }, [game]);

  const isPlayerWinner = useCallback(() => {
    if (game.isCheckmate()) {
      const losingColor = game.turn() === "w" ? "w" : "b";
      const winningColor = losingColor === "w" ? "b" : "w";
      return winningColor === playerColor;
    }
    if (isResignation || game.isResigned) {
      return false;
    }
    return false;
  }, [game, playerColor, isResignation]);

  const renderWinnerText = useCallback(() => {
    if (isResignation) {
      return "Are you sure you want to resign?";
    }
    if (game.isDraw()) {
      if (game.isStalemate()) return "Stalemate - game is a draw!";
      if (game.isThreefoldRepetition()) return "Draw by repetition!";
      if (game.isInsufficientMaterial())
        return "Draw by insufficient material!";
      return "Game is a draw!";
    }
    if (game.isCheckmate()) {
      const losingColor = game.turn() === "w" ? "w" : "b";
      const winningColor = losingColor === "w" ? "b" : "w";
      const isPlayerWon = winningColor === playerColor;
      const winnerName = isPlayerWon ? "You" : selectedBot?.name || "Bot";
      return (
        <>
          <span className={isPlayerWon ? "text-blue-400" : "text-red-400"}>
            {winnerName}
          </span>{" "}
          won!
          <br />
          {isPlayerWon ? (
            <span className="text-green-500">{victoryMessage}</span>
          ) : (
            <span className="text-yellow-500">{defeatMessage}</span>
          )}
        </>
      );
    }
    return (
      <>
        <span className="text-red-400">{selectedBot?.name || "Bot"}</span> won
        by resignation!
      </>
    );
  }, [
    game,
    isResignation,
    playerColor,
    selectedBot,
    victoryMessage,
    defeatMessage,
  ]);

  // Save game result to database
  useEffect(() => {
    const saveResult = async () => {
      if (
        isOpen &&
        !isResignation &&
        session?.user?.id &&
        !resultSaved &&
        (game.isGameOver() || isResignation || game.isResigned) &&
        gameStateId
      ) {
        try {
          // Check one more time if this game has already been saved
          const savedGameFen = localStorage.getItem("last-saved-game-fen");
          if (savedGameFen === game.fen()) {
            console.log("Game already saved (double-check), skipping save");
            setResultSaved(true);
            return;
          }

          console.log("Saving game result:", gameStateId);
          await saveGameResult({
            userId: session.user.id,
            game,
            difficulty,
            playerColor,
            selectedBot,
            gameTime,
            movesCount,
            isResignation,
            session,
          });
          setResultSaved(true);

          localStorage.setItem("last-saved-game-id", gameStateId);
          localStorage.setItem("last-saved-game-fen", game.fen());
        } catch (error) {
          console.error("Error saving game result:", error);
        }
      }
    };

    saveResult();
  }, [
    isOpen,
    isResignation,
    session,
    resultSaved,
    game,
    difficulty,
    playerColor,
    selectedBot,
    gameTime,
    movesCount,
    gameStateId,
  ]);

  useEffect(() => {
    if (isOpen) {
      const randomVictoryIndex = Math.floor(
        Math.random() * VICTORY_MESSAGES.length
      );
      const randomDefeatIndex = Math.floor(
        Math.random() * DEFEAT_MESSAGES.length
      );
      setVictoryMessage(VICTORY_MESSAGES[randomVictoryIndex]);
      setDefeatMessage(DEFEAT_MESSAGES[randomDefeatIndex]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMessage(renderWinnerText());
      setShowConfetti(isPlayerWinner());
      setIsRecycling(true);
    }
  }, [
    isOpen,
    game,
    isResignation,
    playerColor,
    selectedBot,
    victoryMessage,
    defeatMessage,
    isPlayerWinner,
    renderWinnerText,
  ]);

  const handleRematch = () => {
    game.reset();
    game.isResigned = false;
    onRematch();
  };

  const handleNewBot = () => {
    game.reset();
    game.isResigned = false;
    onNewBot();
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={isRecycling}
          numberOfPieces={400}
          gravity={0.1}
          style={{ position: "fixed", zIndex: 100 }}
        />
      )}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg w-[95%] mx-auto p-4 sm:p-6 rounded-lg border bg-background shadow-lg">
          <DialogDescription id="victory-modal-description" className="sr-only">
            {isResignation
              ? "Confirm if you want to resign from the current game."
              : game.isDraw()
              ? "The game ended in a draw."
              : game.isCheckmate()
              ? `Game over by checkmate. ${
                  isPlayerWinner() ? "You won!" : "Bot won!"
                }`
              : "Game results and options for your next move."}
          </DialogDescription>
          <div className="absolute right-2 top-2 sm:right-4 sm:top-4">
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>

          <DialogHeader>
            <DialogTitle className="text-center text-xl sm:text-2xl font-bold break-words">
              {message}
            </DialogTitle>
            {!isResignation && (
              <div className="text-sm text-muted-foreground text-center pt-2 sm:pt-4 space-y-2">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-base sm:text-lg font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 sm:h-12 sm:w-12">
                      <AvatarImage src={playerAvatar} alt={playerName} />
                      <AvatarFallback>{playerName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{playerName}</span>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      ({playerColor === "w" ? "White" : "Black"})
                    </span>
                  </div>
                  <span className="text-muted-foreground mx-2">vs</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 sm:h-12 sm:w-12">
                      <AvatarImage
                        src={selectedBot?.image}
                        alt={selectedBot?.name}
                      />
                      <AvatarFallback>B</AvatarFallback>
                    </Avatar>
                    <span>{selectedBot?.name || "Bot"}</span>
                    <span className="text-muted-foreground text-sm sm:text-base">
                      ({playerColor === "w" ? "Black" : "White"})
                    </span>
                  </div>
                </div>
                <div className="text-sm sm:text-base font-medium text-muted-foreground capitalize">
                  {difficulty} Difficulty
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="flex gap-3 mt-6">
            {isResignation ? (
              <>
                <Button
                  onClick={() => onConfirmResign?.(game)}
                  variant="destructive"
                  className="flex-1 text-sm sm:text-base py-2 h-auto"
                >
                  Confirm
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 text-sm sm:text-base py-2 h-auto"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleRematch}
                  variant="default"
                  className="flex-1 text-sm sm:text-base py-2 h-auto"
                >
                  Rematch
                </Button>
                <Button
                  onClick={handleNewBot}
                  variant="outline"
                  className="flex-1 text-sm sm:text-base py-2 h-auto"
                >
                  New Bot
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VictoryModal;
