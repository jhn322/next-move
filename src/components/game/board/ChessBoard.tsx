"use client";

import { useState, useEffect } from "react";
import { useStockfish } from "../../../hooks/useStockfish";
import { STORAGE_KEY, DEFAULT_STATE } from "../../../config/game";
import { useRouter } from "next/navigation";
import { useChessGame } from "../../../hooks/useChessGame";
import { useGameTimer } from "../../../hooks/useGameTimer";
import { useGameDialogs } from "../../../hooks/useGameDialogs";
import { useMoveHandler } from "../../../hooks/useMoveHandler";
import { Bot, BOTS_BY_DIFFICULTY } from "@/components/game/data/bots";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useHintEngine } from "@/hooks/useHintEngine";
import useHighlightedSquares from "./HighlightedSquares";
import GameDialogs from "../dialogs/GameDialogs";
import GameControls from "@/components/game/controls/GameControls";
import SquareComponent from "@/components/game/board/Square";
import Piece from "@/components/game/board/Piece";
import VictoryModal from "../modal/VictoryModal";
import PlayerProfile from "./PlayerProfile";
import BotSelectionPanel from "@/components/game/controls/BotSelectionPanel";
import PawnPromotionModal from "./PawnPromotionModal";

const ChessBoard = ({ difficulty }: { difficulty: string }) => {
  const [shouldPulse, setShouldPulse] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [showBotSelection, setShowBotSelection] = useState(true);
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(
    null
  );

  const { handleRightClick, handleLeftClick, clearHighlights, isHighlighted } =
    useHighlightedSquares();

  const router = useRouter();

  // Hooks ----------------------------------------------------
  const {
    game,
    board,
    setBoard,
    history,
    setHistory,
    currentMove,
    setCurrentMove,
    lastMove,
    setLastMove,
    gameStarted,
    setGameStarted,
    makeMove,
    moveBack,
    moveForward,
    playerColor,
    setPlayerColor,
    capturedPieces,
    resetCapturedPieces,
    pendingPromotion,
    setPendingPromotion,
  } = useChessGame(difficulty);

  const { getBotMove } = useStockfish(game, selectedBot, makeMove);
  const { getHint, isCalculating } = useHintEngine();

  // Load saved state for piece set
  const [pieceSet, setPieceSet] = useState<string>("staunty");

  // Initialize game timer
  const { gameTime, whiteTime, blackTime, resetTimers } = useGameTimer(
    game,
    gameStarted,
    undefined
  );

  useEffect(() => {
    // Load selected bot
    const savedBot = localStorage.getItem("selectedBot");
    if (savedBot) {
      const parsedBot = JSON.parse(savedBot);
      // Check if the saved bot is from the current difficulty by comparing with available bots
      const isFromCurrentDifficulty = BOTS_BY_DIFFICULTY[difficulty].some(
        (bot) => bot.name === parsedBot.name
      );
      // Only use the saved bot if it's from the current difficulty
      setSelectedBot(
        isFromCurrentDifficulty ? parsedBot : BOTS_BY_DIFFICULTY[difficulty][0]
      );
    } else {
      // If there's no saved bot, use the first bot from the difficulty category
      setSelectedBot(BOTS_BY_DIFFICULTY[difficulty][0]);
    }

    // Check if there's a saved game state and if the game was started
    const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    // If there's a saved state and the game was started, don't show bot selection
    setShowBotSelection(savedState?.gameStarted ? false : true);

    if (savedState?.pieceSet) {
      setPieceSet(savedState.pieceSet);
    }
  }, [difficulty]);

  const {
    showDifficultyDialog,
    showColorDialog,
    pendingDifficulty,
    pendingColor,
    setPendingDifficulty,
    setPendingColor,
    handleResign,
    handleDifficultyDialogOpen,
    handleColorDialogOpen,
    handleRestart: handleModalClose,
    setShowDifficultyDialog,
    setShowColorDialog,
    showVictoryModal,
    isResignationModal,
    handleCancelDialog,
    handleConfirmResign,
    setShowVictoryModal,
    setIsResignationModal,
    showNewBotDialog,
    setShowNewBotDialog,
    handleNewBotDialog,
  } = useGameDialogs();

  const {
    selectedPiece,
    setSelectedPiece,
    possibleMoves,
    setPossibleMoves,
    handleSquareClick: originalHandleSquareClick,
  } = useMoveHandler(
    game,
    board,
    setBoard,
    playerColor,
    makeMove,
    setHistory,
    setCurrentMove,
    setLastMove,
    setGameStarted,
    getBotMove,
    setShowBotSelection,
    showBotSelection
  );

  const { playSound } = useGameSounds();
  // -----------------------------------------------------------

  // Add sound to game start
  useEffect(() => {
    if (gameStarted && !showBotSelection) {
      playSound("game-start");
    }
  }, [gameStarted, showBotSelection, playSound]);

  // Save state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const gameState = {
        fen: game.fen(),
        playerColor,
        gameTime,
        whiteTime,
        blackTime,
        difficulty,
        gameStarted,
        history,
        currentMove,
        lastMove,
        pieceSet,
        capturedPieces,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    }
  }, [
    game,
    playerColor,
    gameTime,
    whiteTime,
    blackTime,
    difficulty,
    gameStarted,
    history,
    currentMove,
    lastMove,
    pieceSet,
    capturedPieces,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined" && selectedBot) {
      localStorage.setItem("selectedBot", JSON.stringify(selectedBot));
    }
  }, [selectedBot]);

  // Clear hint move when a move is made
  useEffect(() => {
    setHintMove(null);
  }, [lastMove]);

  // Clear highlights when a move is made
  useEffect(() => {
    if (lastMove) {
      clearHighlights();
    }
  }, [lastMove, clearHighlights]);

  const handleSelectBot = (bot: Bot) => {
    playSound("choice");
    setSelectedBot(bot);
    setShowBotSelection(false);
  };

  const handleDifficultyChange = (newDifficulty: string) => {
    if (gameStarted) {
      handleDifficultyDialogOpen(newDifficulty);
    } else {
      localStorage.removeItem("selectedBot");
      handleGameReset();
      router.push(`/play/${newDifficulty.toLowerCase()}`);
    }
  };

  const handleConfirmDifficultyChange = () => {
    if (pendingDifficulty) {
      localStorage.removeItem("chess-game-state");

      localStorage.removeItem("selectedBot");
      router.push(`/play/${pendingDifficulty.toLowerCase()}`);
    }
    setShowDifficultyDialog(false);
    setPendingDifficulty(null);
    setGameStarted(false); // Reset game started state
  };

  // Pulse border when showing bot selection
  useEffect(() => {
    if (showBotSelection) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [showBotSelection]);

  // Game status display
  const getGameStatus = () => {
    if (game.isCheckmate())
      return `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins!`;
    if (game.isDraw()) return "Game is a draw!";
    if (game.isCheck())
      return `${game.turn() === "w" ? "White" : "Black"} is in check!`;
    return `${game.turn() === "w" ? "White" : "Black"} turn to move`;
  };

  const handleRematch = () => {
    handleModalClose();
    setTimeout(handleGameReset, 0);
  };

  // Game restart
  const handleGameReset = () => {
    game.reset();
    setBoard(game.board());
    setSelectedPiece(null);
    setPossibleMoves([]);
    resetTimers();
    setGameStarted(false);
    setHistory([{ fen: DEFAULT_STATE.fen, lastMove: null }]);
    setCurrentMove(1);
    setLastMove(null);
    resetCapturedPieces();
    setHintMove(null);

    // Save state with preserved player color
    const currentState = {
      ...DEFAULT_STATE,
      playerColor,
      difficulty,
      lastMove: null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));

    if (playerColor === "b") {
      setTimeout(getBotMove, 500);
    }
  };

  const handleColorChange = (color: "w" | "b") => {
    if (gameStarted) {
      handleColorDialogOpen(color);
      setShowColorDialog(true);
    } else {
      // If no game in progress, change color directly
      setPlayerColor(color);
      game.reset();
      setBoard(game.board());
      setSelectedPiece(null);
      setPossibleMoves([]);
      resetTimers();
      setGameStarted(false);
      resetCapturedPieces();
      setLastMove(null);
      setHintMove(null);

      // Save the new state with updated color
      const newState = {
        ...DEFAULT_STATE,
        playerColor: color,
        difficulty,
        lastMove: null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

      if (color === "b") {
        setTimeout(getBotMove, 500);
      }
    }
  };

  const handleConfirmColorChange = () => {
    if (pendingColor) {
      setPlayerColor(pendingColor);
      game.reset();
      setBoard(game.board());
      setSelectedPiece(null);
      setPossibleMoves([]);
      resetTimers();
      setGameStarted(false);
      resetCapturedPieces();
      setLastMove(null);
      setHintMove(null);

      // Save the new state with updated color
      const newState = {
        ...DEFAULT_STATE,
        playerColor: pendingColor,
        difficulty,
        lastMove: null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

      if (pendingColor === "b") {
        setTimeout(getBotMove, 500);
      }
    }
    setShowColorDialog(false);
    setPendingColor(null);
  };

  // Add useEffect to show modal on game over
  useEffect(() => {
    if (game.isGameOver() && gameStarted) {
      setShowVictoryModal(true);
      setIsResignationModal(false);
    }
  }, [
    game.isGameOver(),
    gameStarted,
    setShowVictoryModal,
    setIsResignationModal,
  ]);

  const handleNewBot = () => {
    handleModalClose();
    setTimeout(() => {
      handleGameReset();
      setShowBotSelection(true); // Show bot selection again
      // highlight the difficulty section
      const difficultySection = document.querySelector(
        "[data-highlight-difficulty]"
      );
      difficultySection?.classList.add("highlight-difficulty");
      setTimeout(() => {
        difficultySection?.classList.remove("highlight-difficulty");
      }, 8000);
    }, 0);
  };

  const confirmNewBot = () => {
    // Remove selected bot from localStorage
    localStorage.removeItem("selectedBot");

    // Reset game and show bot selection
    handleModalClose();
    // Select the first bot from the current difficulty
    setSelectedBot(BOTS_BY_DIFFICULTY[difficulty][0]);
    setShowBotSelection(true);
    handleGameReset();

    // Close dialog if it was open
    setShowNewBotDialog(false);
  };

  const handleHintRequest = () => {
    if (game.turn() === playerColor && !game.isGameOver()) {
      playSound("choice");
      getHint(game, (from, to, promotion) => {
        setHintMove({ from, to });
        if (promotion) {
        }
      });
    }
  };

  const handleSquareClick = (row: number, col: number) => {
    handleLeftClick(); // Clear highlights on left click
    originalHandleSquareClick(row, col);
  };

  // Handle pawn promotion piece selection
  const handlePromotionSelect = (pieceType: "q" | "r" | "n" | "b") => {
    if (pendingPromotion) {
      const { from, to } = pendingPromotion;
      const moveSuccessful = makeMove(from, to, pieceType);

      if (moveSuccessful) {
        const gameState = {
          fen: game.fen(),
          playerColor,
          gameTime,
          whiteTime,
          blackTime,
          difficulty,
          gameStarted: true,
          history,
          currentMove,
          lastMove,
          pieceSet,
          capturedPieces,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));

        // If it's the bot's turn and the game is not over, trigger the bot move
        if (game.turn() !== playerColor && !game.isGameOver()) {
          setTimeout(getBotMove, 1000);
        }
      }
    }
  };

  // Cancel pawn promotion
  const handlePromotionCancel = () => {
    setPendingPromotion(null);
  };

  /* Bot Selection Panel */
  <BotSelectionPanel
    bots={BOTS_BY_DIFFICULTY[difficulty]}
    onSelectBot={handleSelectBot}
    difficulty={difficulty}
    onDifficultyChange={handleDifficultyChange}
    selectedBot={selectedBot}
  />;

  return (
    <div className="flex flex-col h-full w-full">
      <main className="flex flex-col w-full items-center justify-start">
        <div className="flex flex-col lg:flex-row w-full lg:items-start sm:items-center justify-center gap-4 lg:max-h-[calc(100vh-40px)]">
          <div className="relative w-full max-w-[min(80vh,90vw)] lg:max-w-[107vh]">
            {/* Chess board and profiles */}
            <div className="flex mb-4 lg:hidden">
              <PlayerProfile
                difficulty={difficulty}
                isBot={true}
                selectedBot={selectedBot}
                lastMove={lastMove}
                game={game}
                playerColor={playerColor}
                capturedPieces={capturedPieces}
                pieceSet={pieceSet}
              />
            </div>

            <div className="relative w-full aspect-square">
              {/* Show overlay when no bot is selected OR when bot selection is showing */}
              {(!selectedBot || showBotSelection) && (
                <div className="absolute z-10 rounded-lg flex items-center justify-center">
                  <span className="text-white text-4xl">
                    {/* <CardTitle>Select a Bot to Play</CardTitle> */}
                  </span>
                </div>
              )}
              <div className="flex flex-col lg:flex-row w-full items-center lg:items-start justify-center gap-4">
                <div className="hidden lg:flex flex-col justify-between self-stretch">
                  <PlayerProfile
                    difficulty={difficulty}
                    isBot={true}
                    selectedBot={selectedBot}
                    lastMove={lastMove}
                    game={game}
                    playerColor={playerColor}
                    capturedPieces={capturedPieces}
                    pieceSet={pieceSet}
                  />
                  <div className="mt-4">
                    <PlayerProfile
                      difficulty={difficulty}
                      isBot={false}
                      playerColor={playerColor}
                      capturedPieces={capturedPieces}
                      pieceSet={pieceSet}
                    />
                  </div>
                </div>
                <div className="w-full h-full grid grid-cols-8 border border-border rounded-lg overflow-hidden">
                  {board.map((row, rowIndex) =>
                    row.map((_, colIndex) => {
                      const actualRowIndex =
                        playerColor === "w" ? rowIndex : 7 - rowIndex;
                      const actualColIndex =
                        playerColor === "w" ? colIndex : 7 - colIndex;
                      const piece = board[actualRowIndex][actualColIndex];
                      const square = `${"abcdefgh"[actualColIndex]}${
                        8 - actualRowIndex
                      }`;
                      const isKingInCheck =
                        game.isCheck() &&
                        piece?.type.toLowerCase() === "k" &&
                        piece?.color === game.turn();
                      const isLastMove =
                        lastMove &&
                        (square === lastMove.from || square === lastMove.to);
                      const isHintMove =
                        hintMove &&
                        (square === hintMove.from || square === hintMove.to);
                      const showRank =
                        playerColor === "w" ? colIndex === 0 : colIndex === 7;
                      const showFile =
                        playerColor === "w" ? rowIndex === 7 : rowIndex === 0;
                      const coordinate = showRank
                        ? `${8 - actualRowIndex}`
                        : showFile
                        ? `${"abcdefgh"[actualColIndex]}`
                        : "";

                      return (
                        <SquareComponent
                          key={`${rowIndex}-${colIndex}`}
                          isLight={(actualRowIndex + actualColIndex) % 2 === 0}
                          isSelected={
                            selectedPiece?.row === actualRowIndex &&
                            selectedPiece?.col === actualColIndex
                          }
                          isPossibleMove={possibleMoves.includes(square)}
                          onClick={() =>
                            handleSquareClick(actualRowIndex, actualColIndex)
                          }
                          onContextMenu={(e) => handleRightClick(square, e)}
                          difficulty={difficulty}
                          isCheck={isKingInCheck}
                          isLastMove={isLastMove ?? false}
                          isHintMove={isHintMove ?? false}
                          isRedHighlighted={isHighlighted(square)}
                          showRank={showRank}
                          showFile={showFile}
                          coordinate={coordinate}
                        >
                          {piece && (
                            <Piece
                              type={
                                piece.color === "w"
                                  ? piece.type.toUpperCase()
                                  : piece.type.toLowerCase()
                              }
                              pieceSet={pieceSet}
                            />
                          )}
                        </SquareComponent>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="flex mt-4 lg:hidden">
              <PlayerProfile
                difficulty={difficulty}
                isBot={false}
                playerColor={playerColor}
                capturedPieces={capturedPieces}
                pieceSet={pieceSet}
              />
            </div>
          </div>

          {/* Game Controls on the right */}
          <div className="w-full lg:w-80 lg:flex flex-col">
            {showBotSelection ? (
              <div className={shouldPulse ? "pulse-border" : ""}>
                <BotSelectionPanel
                  bots={BOTS_BY_DIFFICULTY[difficulty]}
                  onSelectBot={handleSelectBot}
                  difficulty={difficulty}
                  onDifficultyChange={handleDifficultyChange}
                  selectedBot={selectedBot}
                />
              </div>
            ) : (
              <div>
                <GameControls
                  difficulty={difficulty}
                  gameStatus={getGameStatus()}
                  onResign={handleResign}
                  onColorChange={handleColorChange}
                  onDifficultyChange={handleDifficultyChange}
                  playerColor={playerColor}
                  gameTime={gameTime}
                  whiteTime={whiteTime}
                  blackTime={blackTime}
                  game={game}
                  onMoveBack={moveBack}
                  onMoveForward={moveForward}
                  canMoveBack={currentMove > 1}
                  canMoveForward={currentMove < history.length}
                  onRematch={handleGameReset}
                  history={history}
                  pieceSet={pieceSet}
                  onPieceSetChange={setPieceSet}
                  onNewBot={handleNewBot}
                  handleNewBotDialog={handleNewBotDialog}
                  onHintRequested={handleHintRequest}
                  isCalculatingHint={isCalculating}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <VictoryModal
        isOpen={showVictoryModal}
        onClose={handleCancelDialog}
        onRematch={handleRematch}
        onNewBot={handleNewBot}
        game={game}
        difficulty={difficulty}
        isResignation={isResignationModal}
        onConfirmResign={handleConfirmResign}
        playerColor={playerColor}
        handleNewBotDialog={handleNewBotDialog}
        selectedBot={selectedBot}
        playerName="Player"
      />

      <GameDialogs
        showDifficultyDialog={showDifficultyDialog}
        showColorDialog={showColorDialog}
        showNewBotDialog={showNewBotDialog}
        onConfirmDifficultyChange={handleConfirmDifficultyChange}
        onConfirmColorChange={handleConfirmColorChange}
        onConfirmNewBot={confirmNewBot}
        onCancelDialog={handleCancelDialog}
      />

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <PawnPromotionModal
          color={playerColor}
          pieceSet={pieceSet}
          onSelect={handlePromotionSelect}
          onCancel={handlePromotionCancel}
        />
      )}
    </div>
  );
};

export default ChessBoard;
