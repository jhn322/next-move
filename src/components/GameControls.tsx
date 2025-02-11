import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Chess } from "chess.js";

interface GameControlsProps {
  difficulty: string;
  gameStatus: string;
  onRestart: () => void;
  onResign: () => void;
  onColorChange: (color: "w" | "b") => void;
  onDifficultyChange: (difficulty: string) => void;
  playerColor: "w" | "b";
  gameTime: number;
  whiteTime: number;
  blackTime: number;
  game: Chess;
}

const GameControls = ({
  difficulty,
  gameStatus,
  onRestart,
  onResign,
  onColorChange,
  onDifficultyChange,
  playerColor,
  gameTime,
  whiteTime,
  blackTime,
  game,
}: GameControlsProps) => {
  const difficulties = ["easy", "intermediate", "hard", "expert"];
  const currentTurn = gameStatus.toLowerCase().includes("white") ? "w" : "b";

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      {/* Game Info Group */}
      <div className="space-y-2">
        <Card className="border-0 shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Game Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  currentTurn === "w"
                    ? "bg-blue-400 animate-pulse"
                    : "bg-blue-400/30"
                }`}
              />
              <span
                className={`font-medium ${
                  currentTurn === "w"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                White
              </span>
              <span className="text-muted-foreground mx-1">vs</span>
              <div
                className={`w-3 h-3 rounded-full ${
                  currentTurn === "b"
                    ? "bg-red-400 animate-pulse"
                    : "bg-red-400/30"
                }`}
              />
              <span
                className={`font-medium ${
                  currentTurn === "b"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Black
              </span>
            </div>
            {game.isCheck() && (
              <p className="text-yellow-500 font-medium mt-2">Check!</p>
            )}
            {game.isCheckmate() && (
              <p className="text-red-500 font-medium mt-2">Checkmate!</p>
            )}
            {game.isDraw() && (
              <p className="text-blue-500 font-medium mt-2">Draw!</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Game Time</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-mono text-xl">{formatTime(gameTime)}</span>
            </div>
            <div className="h-px bg-border/50" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">White:</span>
              <span
                className={`font-mono text-xl ${
                  currentTurn === "w" && !game.isGameOver()
                    ? "text-blue-400"
                    : ""
                }`}
              >
                {formatTime(whiteTime)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Black:</span>
              <span
                className={`font-mono text-xl ${
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

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Player Controls Group */}
      <div className="space-y-2">
        <Card className="border-0 shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Play As</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex gap-3">
              <Button
                onClick={() => onColorChange("w")}
                variant={playerColor === "w" ? "default" : "outline"}
                className="flex-1"
              >
                White
              </Button>
              <Button
                onClick={() => onColorChange("b")}
                variant={playerColor === "b" ? "default" : "outline"}
                className="flex-1"
              >
                Black
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Game Controls</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <Button onClick={onRestart} variant="default" className="w-full">
              Restart Game
            </Button>
            <Button onClick={onResign} variant="destructive" className="w-full">
              Resign
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Settings Group */}
      <div className="space-y-2">
        <Card className="border-0 shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Difficulty</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-2">
              {difficulties.map((diff) => (
                <Button
                  key={diff}
                  onClick={() => onDifficultyChange(diff)}
                  variant={difficulty === diff ? "default" : "outline"}
                  className="w-full capitalize"
                >
                  {diff}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GameControls;
