import { useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { usePreMadeMove } from "@/hooks/usePreMadeMove";
import type { BoardSquare } from "@/types/types";

interface PreMadeMoveProps {
  game: Chess;
  board: BoardSquare[][];
  playerColor: "w" | "b";
  makeMove: (
    from: string,
    to: string,
    promotion?: "q" | "r" | "n" | "b"
  ) => boolean;
  getBotMove: () => void;
  onPreMadeMoveChange: (isPreMadeMove: (square: string) => boolean) => void;
  onHandleSquareClick: (handler: (row: number, col: number) => boolean) => void;
  onPossibleMovesChange: (isPossibleMove: (square: string) => boolean) => void;
}

const PreMadeMove = ({
  game,
  board,
  playerColor,
  makeMove,
  getBotMove,
  onPreMadeMoveChange,
  onHandleSquareClick,
  onPossibleMovesChange,
}: PreMadeMoveProps) => {
  const {
    isPreMadeMove,
    handlePreMadeMove,
    executePreMadeMove,
    preMadeMove,
    isPreMadePossibleMove,
  } = usePreMadeMove(game, board, playerColor, makeMove, getBotMove);

  // Use a ref to track the previous turn
  const prevTurnRef = useRef(game.turn());
  const executionAttemptedRef = useRef(false);

  // Pass the isPreMadeMove function to the parent component
  useEffect(() => {
    onPreMadeMoveChange(isPreMadeMove);
  }, [isPreMadeMove, onPreMadeMoveChange]);

  // Pass the isPreMadePossibleMove function to the parent component
  useEffect(() => {
    onPossibleMovesChange(isPreMadePossibleMove);
  }, [isPreMadePossibleMove, onPossibleMovesChange]);

  // Execute the pre-made move when the turn changes to the player's turn
  useEffect(() => {
    const currentTurn = game.turn();

    // Check if the turn has changed to the player's turn and we have a pre-made move
    if (
      currentTurn === playerColor &&
      prevTurnRef.current !== playerColor &&
      preMadeMove &&
      preMadeMove.to &&
      !executionAttemptedRef.current
    ) {
      console.log("Turn changed to player's turn, executing pre-made move");
      executionAttemptedRef.current = true;

      // Use a small delay to ensure the board is updated
      const timer = setTimeout(() => {
        const result = executePreMadeMove();
        console.log("Pre-made move execution result:", result);
        executionAttemptedRef.current = false;
      }, 300);

      return () => clearTimeout(timer);
    }

    // Reset execution attempted flag when turn changes
    if (prevTurnRef.current !== currentTurn) {
      executionAttemptedRef.current = false;
    }

    // Update the previous turn ref
    prevTurnRef.current = currentTurn;
  }, [game.turn(), playerColor, executePreMadeMove, preMadeMove]);

  // Pass the handlePreMadeMove function to the parent component
  useEffect(() => {
    onHandleSquareClick(handlePreMadeMove);
  }, [handlePreMadeMove, onHandleSquareClick]);

  return null;
};

export default PreMadeMove;
