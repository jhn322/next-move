"use client";

import { useState, useEffect, useCallback } from "react";
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
import PreMadeMove from "./PreMadeMove";
import { useAuth } from "@/context/auth-context";
import { getUserSettings } from "@/lib/mongodb-service";

interface ChessBoardProps {
  difficulty: string;
  initialBot?: (Bot & { difficulty: string }) | null;
}

const ChessBoard = ({ difficulty, initialBot }: ChessBoardProps) => {
  const [shouldPulse, setShouldPulse] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [showBotSelection, setShowBotSelection] = useState(true);
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(
    null
  );

  const [whitePiecesBottom, setWhitePiecesBottom] = useState(true);
  const [isPreMadeMove, setIsPreMadeMove] = useState<
    (square: string) => boolean
  >(() => () => false);
  const [preMadeMoveHandler, setPreMadeMoveHandler] = useState<
    (row: number, col: number) => boolean
  >(() => () => false);
  const [isPreMadePossibleMove, setIsPreMadePossibleMove] = useState<
    (square: string) => boolean
  >(() => () => false);

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

  // Load user settings from MongoDB or localStorage
  const { status, session } = useAuth();
  const [pieceSet, setPieceSet] = useState("staunty");
  const [showCoordinates, setShowCoordinates] = useState(true);

  // Initialize game timer
  const { gameTime, whiteTime, blackTime, resetTimers } = useGameTimer(
    game,
    gameStarted,
    undefined
  );

  // Add state for player name
  const [playerName, setPlayerName] = useState("Player");

  // Load player name from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPlayerName = localStorage.getItem("chess-player-name");
      if (savedPlayerName) {
        setPlayerName(savedPlayerName);
      }
    }
  }, []);

  // Load user settings from MongoDB or localStorage
  useEffect(() => {
    const loadSettings = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const settings = await getUserSettings(session.user.id);
          if (settings) {
            setPieceSet(settings.piece_set || "staunty");
            setShowCoordinates(settings.show_coordinates !== false);
            setWhitePiecesBottom(settings.white_pieces_bottom !== false);
          }
        } catch (error) {
          console.error("Error loading user settings:", error);
          // Fallback to localStorage
          loadFromLocalStorage();
        }
      } else {
        // Not authenticated, use localStorage
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      if (typeof window !== "undefined") {
        const savedPieceSet = localStorage.getItem("chess_piece_set");
        const savedShowCoordinates = localStorage.getItem(
          "chess_show_coordinates"
        );
        const savedWhitePiecesBottom = localStorage.getItem(
          "chess_white_pieces_bottom"
        );

        if (savedPieceSet) setPieceSet(savedPieceSet);
        if (savedShowCoordinates !== null) {
          setShowCoordinates(savedShowCoordinates !== "false");
        }
        if (savedWhitePiecesBottom !== null) {
          setWhitePiecesBottom(savedWhitePiecesBottom !== "false");
        }
      }
    };

    loadSettings();
  }, [status, session]);

  useEffect(() => {
    if (initialBot) {
      // Extract just the Bot properties if a bot with difficulty is passed
      const botWithoutDifficulty: Bot = {
        id: initialBot.id,
        name: initialBot.name,
        image: initialBot.image,
        rating: initialBot.rating,
        description: initialBot.description,
        skillLevel: initialBot.skillLevel,
        depth: initialBot.depth,
        moveTime: initialBot.moveTime,
        flag: initialBot.flag,
      };

      setSelectedBot(botWithoutDifficulty);
      setShowBotSelection(false);
      setGameStarted(true);

      if (playerColor === "b") {
        game.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1");
        setBoard(game.board());
        setHistory([{ fen: game.fen(), lastMove: null }]);
      }

      localStorage.setItem("selectedBot", JSON.stringify(botWithoutDifficulty));
    }
  }, [initialBot, difficulty, game, playerColor]);

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
      const firstBot = BOTS_BY_DIFFICULTY[difficulty][0];
      setSelectedBot(firstBot);
    }

    // Check if there's a saved game state
    const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

    if (
      savedState?.fen &&
      (savedState.fen !== DEFAULT_STATE.fen ||
        savedState.playerColor === "b") &&
      (savedState.lastMove !== null ||
        (savedState.history && savedState.history.length > 1))
    ) {
      setShowBotSelection(false);
      setGameStarted(true);

      // Load the saved FEN which might be modified for black players
      if (savedState.fen) {
        game.load(savedState.fen);
        setBoard(game.board());
      }

      // Set player color
      if (savedState.playerColor) {
        setPlayerColor(savedState.playerColor);
      }
    } else {
      setShowBotSelection(true);
      setGameStarted(false);

      // If there's a saved state but no moves have been made, remove it
      if (
        savedState &&
        (!savedState.lastMove ||
          (savedState.history && savedState.history.length <= 1))
      ) {
        localStorage.removeItem(STORAGE_KEY);
      }

      // Initialize the game based on player color
      if (savedState?.playerColor === "b") {
        game.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1");
        setBoard(game.board());
        setPlayerColor("b");
      }
    }

    if (savedState?.pieceSet) {
      setPieceSet(savedState.pieceSet);
    }
  }, [difficulty, game]);

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
    if (typeof window !== "undefined" && gameStarted) {
      const hasMovesBeenMade =
        lastMove !== null || (history && history.length > 1);

      if (hasMovesBeenMade) {
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

  // Save state when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        if (gameStarted) {
          const hasMovesBeenMade =
            lastMove !== null || (history && history.length > 1);

          if (hasMovesBeenMade) {
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
          } else {
            // If no moves made, remove any saved state
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };
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

  const handleSelectBot = (bot: Bot | (Bot & { difficulty: string })) => {
    const botWithoutDifficulty: Bot = {
      id: bot.id,
      name: bot.name,
      image: bot.image,
      rating: bot.rating,
      description: bot.description,
      skillLevel: bot.skillLevel,
      depth: bot.depth,
      moveTime: bot.moveTime,
      flag: bot.flag,
    };

    setSelectedBot(botWithoutDifficulty);
  };

  const handleDifficultyChange = (newDifficulty: string) => {
    if (gameStarted) {
      handleDifficultyDialogOpen(newDifficulty);
    } else {
      localStorage.removeItem("selectedBot");
      handleGameReset(false);
      setIsPreMadeMove(() => () => false);
      setPreMadeMoveHandler(() => () => false);
      setIsPreMadePossibleMove(() => () => false);
      router.push(`/play/${newDifficulty.toLowerCase()}`);
    }
  };

  const handleConfirmDifficultyChange = () => {
    if (pendingDifficulty) {
      localStorage.removeItem("chess-game-state");
      localStorage.removeItem("selectedBot");
      setIsPreMadeMove(() => () => false);
      setPreMadeMoveHandler(() => () => false);
      setIsPreMadePossibleMove(() => () => false);
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
    setTimeout(() => handleGameReset(true), 0);
  };

  // Game restart
  const handleGameReset = (setStarted = true) => {
    game.reset();
    game.isResigned = false;

    // If player is black, set up the board for black to move first
    if (playerColor === "b") {
      game.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1");
    }

    setBoard(game.board());
    setSelectedPiece(null);
    setPossibleMoves([]);
    resetTimers();
    setGameStarted(setStarted);
    setHistory([{ fen: game.fen(), lastMove: null }]);
    setCurrentMove(1);
    setLastMove(null);
    resetCapturedPieces();
    setHintMove(null);
    setIsPreMadeMove(() => () => false);
    setPreMadeMoveHandler(() => () => false);
    setIsPreMadePossibleMove(() => () => false);

    // Save state with preserved player color
    const currentState = {
      ...DEFAULT_STATE,
      playerColor,
      difficulty,
      lastMove: null,
      gameStarted: setStarted, // Use the parameter value
      fen: game.fen(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  };

  const handleColorChange = (color: "w" | "b") => {
    if (gameStarted) {
      handleColorDialogOpen(color);
      setShowColorDialog(true);
    } else {
      // If no game in progress, change color directly
      setPlayerColor(color);
      game.reset();

      if (color === "b") {
        game.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1");
      }

      setBoard(game.board());
      setSelectedPiece(null);
      setPossibleMoves([]);
      resetTimers();
      setGameStarted(false);
      resetCapturedPieces();
      setLastMove(null);
      setHintMove(null);
      setIsPreMadeMove(() => () => false);
      setPreMadeMoveHandler(() => () => false);
      setIsPreMadePossibleMove(() => () => false);

      // Save the new state with updated color
      const newState = {
        ...DEFAULT_STATE,
        playerColor: color,
        difficulty,
        lastMove: null,
        fen: game.fen(), // Save the current FEN which might be modified for black
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    }
  };

  const handleConfirmColorChange = () => {
    if (pendingColor) {
      setPlayerColor(pendingColor);
      game.reset();

      if (pendingColor === "b") {
        game.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1");
      }

      setBoard(game.board());
      setSelectedPiece(null);
      setPossibleMoves([]);
      resetTimers();
      setGameStarted(false);
      resetCapturedPieces();
      setLastMove(null);
      setHintMove(null);
      setIsPreMadeMove(() => () => false);
      setPreMadeMoveHandler(() => () => false);
      setIsPreMadePossibleMove(() => () => false);

      // Save the new state with updated color
      const newState = {
        ...DEFAULT_STATE,
        playerColor: pendingColor,
        difficulty,
        lastMove: null,
        fen: game.fen(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
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
      handleGameReset(false);
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
    handleGameReset(false);

    // Close dialog if it was open
    setShowNewBotDialog(false);
  };

  const handleHintRequest = () => {
    if (game.turn() === playerColor && !game.isGameOver()) {
      getHint(game, (from, to, promotion) => {
        setHintMove({ from, to });
        if (promotion) {
        }
      });
    }
  };

  const handlePreMadeMoveChange = useCallback(
    (handler: (square: string) => boolean) => {
      setIsPreMadeMove(() => handler);
    },
    []
  );

  const handlePreMadeMoveSquareClick = useCallback(
    (handler: (row: number, col: number) => boolean) => {
      setPreMadeMoveHandler(() => handler);
    },
    []
  );

  const handlePreMadePossibleMovesChange = useCallback(
    (handler: (square: string) => boolean) => {
      setIsPreMadePossibleMove(() => handler);
    },
    []
  );

  const handleSquareClick = (row: number, col: number) => {
    // First try to handle as a pre-made move if it's not the player's turn
    if (game.turn() !== playerColor) {
      try {
        const handled = preMadeMoveHandler(row, col);
        if (handled) {
          // If the pre-made move was handled, don't proceed with normal move handling
          return;
        }
      } catch (error) {
        console.error("Error handling pre-made move:", error);
      }
    }

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

  // Add a specific effect to handle navigation back to the game
  useEffect(() => {
    // This effect runs when the component mounts (including when navigating back to the game)
    const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

    // If there's a valid saved game state with a non-default FEN, ensure we show the game controls
    if (
      savedState?.fen &&
      (savedState.fen !== DEFAULT_STATE.fen || savedState.playerColor === "b")
    ) {
      // This is a saved game, so make sure we show the game controls
      setShowBotSelection(false);

      const hasMovesBeenMade =
        savedState.lastMove !== null ||
        (savedState.history && savedState.history.length > 1);

      if (hasMovesBeenMade) {
        setGameStarted(true);

        // Also ensure the gameStarted flag is set in localStorage
        if (!savedState.gameStarted) {
          savedState.gameStarted = true;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
        }

        if (savedState.fen) {
          game.load(savedState.fen);
          setBoard(game.board());
        }
      } else {
        setGameStarted(false);
        localStorage.removeItem(STORAGE_KEY);

        if (savedState.playerColor === "b") {
          game.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1");
          setBoard(game.board());
          setPlayerColor("b");
        }
      }
    }
  }, [game]);

  return (
    <div className="flex flex-col h-full w-full">
      <main className="flex flex-col w-full items-center justify-start">
        <PreMadeMove
          game={game}
          board={board}
          playerColor={playerColor}
          makeMove={makeMove}
          getBotMove={getBotMove}
          onPreMadeMoveChange={handlePreMadeMoveChange}
          onHandleSquareClick={handlePreMadeMoveSquareClick}
          onPossibleMovesChange={handlePreMadePossibleMovesChange}
          setSelectedPiece={setSelectedPiece}
          setPossibleMoves={setPossibleMoves}
        />

        <div className="flex flex-col lg:flex-row w-full items-center lg:items-start justify-center gap-4 lg:max-h-[calc(100vh-40px)]">
          <div className="relative w-full max-w-[min(85vh,95vw)] sm:max-w-[min(85vh,85vw)] md:max-w-[min(90vh,80vw)] lg:max-w-[107vh]">
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
                      // Determine if we should flip the board based on player color and settings
                      // By default, always show player's pieces at the bottom
                      const shouldFlipBoard = whitePiecesBottom
                        ? playerColor === "b"
                        : playerColor === "w";

                      const actualRowIndex = shouldFlipBoard
                        ? 7 - rowIndex
                        : rowIndex;
                      const actualColIndex = shouldFlipBoard
                        ? 7 - colIndex
                        : colIndex;
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

                      // Check if this piece can be taken by the current player
                      const canBeTaken = !!(
                        piece &&
                        piece.color !== playerColor &&
                        possibleMoves.includes(square)
                      );

                      // Always show coordinates in the same position regardless of board orientation
                      const showRank = showCoordinates && colIndex === 0;
                      const showFile = showCoordinates && rowIndex === 7;

                      // But the coordinate values need to account for the board orientation
                      const rankValue = 8 - actualRowIndex;
                      const fileValue = "abcdefgh"[actualColIndex];

                      const coordinate = showCoordinates
                        ? showRank
                          ? `${rankValue}`
                          : showFile
                          ? fileValue
                          : ""
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
                          isPreMadeMove={isPreMadeMove(square)}
                          isPreMadePossibleMove={isPreMadePossibleMove(square)}
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
                              canBeTaken={canBeTaken}
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
          <div className="w-full sm:max-w-[min(85vh,85vw)] md:max-w-[min(90vh,80vw)] lg:w-80 lg:flex flex-col">
            <div className="flex flex-col lg:flex-row w-full lg:items-start sm:items-center justify-center gap-4">
              {/* Bot selection panel */}
              {showBotSelection ? (
                <div className={`w-full ${shouldPulse ? "pulse-border" : ""}`}>
                  <BotSelectionPanel
                    bots={BOTS_BY_DIFFICULTY[difficulty]}
                    onSelectBot={handleSelectBot}
                    difficulty={difficulty}
                    onDifficultyChange={handleDifficultyChange}
                    selectedBot={selectedBot}
                    playerColor={playerColor}
                    onColorChange={handleColorChange}
                    useDirectNavigation={true}
                  />
                </div>
              ) : (
                <div className="w-full">
                  <GameControls
                    difficulty={difficulty}
                    gameStatus={getGameStatus()}
                    onResign={handleResign}
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
                    onRematch={handleRematch}
                    history={history}
                    pieceSet={pieceSet}
                    onNewBot={handleNewBot}
                    handleNewBotDialog={handleNewBotDialog}
                    onHintRequested={handleHintRequest}
                    isCalculatingHint={isCalculating}
                    selectedBot={selectedBot || undefined}
                  />
                </div>
              )}
            </div>
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
        playerName={playerName}
        gameTime={gameTime}
        movesCount={history.length - 1}
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
