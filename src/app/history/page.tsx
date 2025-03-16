"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Trophy,
  X,
  Minus,
  Clock,
  History,
  AlertCircle,
  BarChart3,
  Calendar,
  Timer,
  CheckCircle2,
  Gamepad2,
  Swords,
  Medal,
  Brain,
  Trash2,
  Flag,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { BOTS_BY_DIFFICULTY, Bot } from "@/components/game/data/bots";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { isSessionValid } from "../../lib/auth-service";
import {
  getUserGameHistory,
  clearUserGameHistory,
  GameHistory,
} from "@/lib/mongodb-service";
import HistoryLoading from "./loading";
import Link from "next/link";

interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  resigns: number;
  winRate: number;
  averageMovesPerGame: number;
  averageGameTime: number;
  beatenBots: Array<{ name: string; difficulty: string; id: number }>;
}

const HistoryPage = () => {
  const { status, session } = useAuth();
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

  // Get the default tab from URL parameters
  const [defaultTab, setDefaultTab] = useState("history");

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["history", "stats", "bots"].includes(tabParam)) {
        setDefaultTab(tabParam);
      }
    }
  }, []);

  useEffect(() => {
    const fetchGameData = async () => {
      if (status === "loading") {
        return;
      }

      if (status === "authenticated" && session?.user?.id) {
        setLoading(true);
        setError(null);

        try {
          // Check if session is valid
          if (!isSessionValid(session)) {
            setError("Your session has expired. Please sign in again.");
            setTimeout(() => {
              router.push("/auth/signin");
            }, 2000);
            return;
          }

          // Fetch game history using direct fetch
          const history = await getUserGameHistory(session.user.id);
          setGameHistory(history || []);

          // Calculate game stats
          if (history && history.length > 0) {
            const wins = history.filter(
              (game: GameHistory) => game.result === "win"
            ).length;
            const losses = history.filter(
              (game: GameHistory) => game.result === "loss"
            ).length;
            const draws = history.filter(
              (game: GameHistory) => game.result === "draw"
            ).length;
            const resigns = history.filter(
              (game: GameHistory) => game.result === "resign"
            ).length;
            const totalGames = history.length;
            const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

            // Calculate average moves per game
            const totalMoves = history.reduce(
              (sum: number, game: GameHistory) => sum + game.moves_count,
              0
            );
            const averageMovesPerGame =
              totalGames > 0 ? totalMoves / totalGames : 0;

            // Calculate average game time
            const totalTime = history.reduce(
              (sum: number, game: GameHistory) => sum + game.time_taken,
              0
            );
            const averageGameTime = totalGames > 0 ? totalTime / totalGames : 0;

            // Get list of beaten bots
            const beatenBots: Array<{
              name: string;
              difficulty: string;
              id: number;
            }> = [];
            history.forEach((game: GameHistory) => {
              if (game.result === "win") {
                const botName = game.opponent;
                const difficulty = game.difficulty;

                // Find the bot in BOTS_BY_DIFFICULTY to get its ID
                const botInDifficulty = BOTS_BY_DIFFICULTY[
                  difficulty as keyof typeof BOTS_BY_DIFFICULTY
                ]?.find((bot: Bot) => bot.name === botName);

                // Check if this bot is already in the list
                const existingBot = beatenBots.find(
                  (bot) => bot.name === botName
                );

                if (!existingBot) {
                  beatenBots.push({
                    name: botName,
                    difficulty,
                    id: botInDifficulty?.id || 0,
                  });
                }
              }
            });

            setGameStats({
              totalGames,
              wins,
              losses,
              draws,
              resigns,
              winRate,
              averageMovesPerGame,
              averageGameTime,
              beatenBots,
            });
          } else {
            setMessage("No games found in your history");
          }
        } catch (error: unknown) {
          console.error("Unexpected error:", error);

          // Check if this is an authentication error
          if (
            error instanceof Error &&
            (error.message.includes("401") ||
              error.message.includes("auth") ||
              error.message.includes("permission"))
          ) {
            setError("Authentication error. Please sign in again.");
            setTimeout(() => {
              router.push("/auth/signin");
            }, 2000);
          } else {
            setError("An unexpected error occurred. Please try again.");
          }
        } finally {
          setLoading(false);
        }
      } else if (status === "unauthenticated") {
        setError("You need to sign in to view your game history");
        setTimeout(() => {
          router.push("/auth/signin");
        }, 2000);
      }
    };

    fetchGameData();
  }, [status, session, refreshTrigger, router]);

  if (status === "loading" || loading) {
    return <HistoryLoading />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case "win":
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case "loss":
        return <X className="h-4 w-4 text-red-500" />;
      case "draw":
        return <Minus className="h-4 w-4 text-blue-500" />;
      case "resign":
        return <Flag className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Get all bots from all difficulties
  const getAllBots = () => {
    const allBots: Array<Bot & { difficulty: string }> = [];
    Object.keys(BOTS_BY_DIFFICULTY).forEach((difficulty) => {
      BOTS_BY_DIFFICULTY[difficulty as keyof typeof BOTS_BY_DIFFICULTY].forEach(
        (bot) => {
          allBots.push({
            ...bot,
            difficulty,
          });
        }
      );
    });
    return allBots;
  };

  const allBots = getAllBots();

  // Check if a bot has been beaten
  const isBotBeaten = (botName: string) => {
    if (!gameStats) return false;
    return gameStats.beatenBots.some((bot) => bot.name === botName);
  };

  const handleClearHistory = async () => {
    if (!session?.user?.id) {
      setError("You need to be signed in to clear your history");
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      const success = await clearUserGameHistory(session.user.id);
      if (success) {
        setGameHistory([]);
        setGameStats(null);
        setMessage("Game history cleared successfully");

        // Trigger a refresh
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error clearing history:", error);

      // Check if this is an authentication error
      if (
        error instanceof Error &&
        (error.message.includes("401") ||
          error.message.includes("auth") ||
          error.message.includes("permission"))
      ) {
        setError("Authentication error. Please sign in again.");
        setTimeout(() => {
          router.push("/auth/signin");
        }, 2000);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsClearing(false);
    }
  };

  const renderClearHistoryButton = () => {
    if (gameHistory.length === 0) return null;

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            disabled={isClearing}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Game History</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete <strong>ALL</strong> of your:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Game History</strong> - All past games
                </li>
                <li>
                  <strong>Statistics</strong> - Win/loss records and averages
                </li>
                <li>
                  <strong>Bot Challenge Records</strong> - All bots you&apos;ve
                  defeated
                </li>
              </ul>
              <p className="text-destructive font-semibold mt-2">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearHistory}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? "Clearing..." : "Clear All History"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4 space-y-8">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Game History
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Statistics
          </TabsTrigger>
          <TabsTrigger value="bots" className="flex items-center gap-2">
            <Brain className="h-4 w-4" /> Bot Challenges
          </TabsTrigger>
        </TabsList>

        {/* Game History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <History className="h-6 w-6" /> Game History
              </CardTitle>
              <CardDescription>
                View your past games and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {gameHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="mb-4">
                    {message || "No games found in your history."}
                  </p>
                  <p className="text-muted-foreground">
                    Play some games to see your history here!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Opponent</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Moves</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gameHistory.map((game) => (
                        <TableRow key={game.id}>
                          <TableCell>
                            {format(new Date(game.date), "MMM d, yyyy")}
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(game.date), "h:mm a")}
                            </div>
                          </TableCell>
                          <TableCell>{game.opponent}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-medium",
                                game.difficulty === "beginner" &&
                                  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                game.difficulty === "easy" &&
                                  "bg-green-500/10 text-green-500 border-green-500/20",
                                game.difficulty === "intermediate" &&
                                  "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
                                game.difficulty === "advanced" &&
                                  "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                game.difficulty === "hard" &&
                                  "bg-violet-500/10 text-violet-500 border-violet-500/20",
                                game.difficulty === "expert" &&
                                  "bg-purple-500/10 text-purple-500 border-purple-500/20",
                                game.difficulty === "master" &&
                                  "bg-orange-500/10 text-orange-500 border-orange-500/20",
                                game.difficulty === "grandmaster" &&
                                  "bg-red-500/10 text-red-500 border-red-500/20"
                              )}
                            >
                              {game.difficulty.charAt(0).toUpperCase() +
                                game.difficulty.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {getResultIcon(game.result)}
                              <span
                                className={cn(
                                  "capitalize",
                                  game.result === "win" && "text-yellow-500",
                                  game.result === "loss" && "text-red-500",
                                  game.result === "draw" && "text-blue-500",
                                  game.result === "resign" && "text-orange-500"
                                )}
                              >
                                {game.result}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{game.moves_count}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatTime(game.time_taken)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <BarChart3 className="h-6 w-6" /> Game Statistics
              </CardTitle>
              <CardDescription>
                View your performance metrics and game analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gameStats && gameStats.totalGames > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Game Count Stats */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Gamepad2 className="h-5 w-5 text-primary" /> Games
                        Played
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-4">
                        {gameStats.totalGames}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="flex flex-col items-center">
                          <div className="text-xl font-semibold text-yellow-500">
                            {gameStats.wins}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Wins
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="text-xl font-semibold text-red-500">
                            {gameStats.losses}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Losses
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="text-xl font-semibold text-blue-500">
                            {gameStats.draws}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Draws
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Win Rate */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" /> Win Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-4">
                        {gameStats.winRate.toFixed(1)}%
                      </div>
                      <Progress
                        value={gameStats.winRate}
                        className="h-2"
                        indicatorClassName={cn(
                          gameStats.winRate >= 60
                            ? "bg-green-500"
                            : gameStats.winRate >= 40
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Average Moves */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Swords className="h-5 w-5 text-blue-500" /> Average
                        Moves
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {gameStats.averageMovesPerGame.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        Moves per game
                      </div>
                    </CardContent>
                  </Card>

                  {/* Average Time */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Timer className="h-5 w-5 text-orange-500" /> Average
                        Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {formatTime(Math.round(gameStats.averageGameTime))}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        Time per game
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-500" /> Recent
                        Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {gameHistory.slice(0, 5).map((game) => (
                          <div
                            key={game.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              {getResultIcon(game.result)}
                              <div>
                                <div className="font-medium">
                                  {game.opponent}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(game.date),
                                    "MMM d, yyyy • h:mm a"
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-medium",
                                game.difficulty === "beginner" &&
                                  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                game.difficulty === "easy" &&
                                  "bg-green-500/10 text-green-500 border-green-500/20",
                                game.difficulty === "intermediate" &&
                                  "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
                                game.difficulty === "advanced" &&
                                  "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                game.difficulty === "hard" &&
                                  "bg-violet-500/10 text-violet-500 border-violet-500/20",
                                game.difficulty === "expert" &&
                                  "bg-purple-500/10 text-purple-500 border-purple-500/20",
                                game.difficulty === "master" &&
                                  "bg-orange-500/10 text-orange-500 border-orange-500/20",
                                game.difficulty === "grandmaster" &&
                                  "bg-red-500/10 text-red-500 border-red-500/20"
                              )}
                            >
                              {game.difficulty.charAt(0).toUpperCase() +
                                game.difficulty.slice(1)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="mb-4">No statistics available yet.</p>
                  <p className="text-muted-foreground">
                    Play some games to see your statistics here!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bot Challenges Tab */}
        <TabsContent value="bots">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Brain className="h-6 w-6" /> Bot Challenges
              </CardTitle>
              <CardDescription>
                Track which bots you&apos;ve defeated and which ones you still
                need to conquer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gameStats && gameStats.totalGames > 0 ? (
                <div className="space-y-8">
                  {Object.keys(BOTS_BY_DIFFICULTY).map((difficulty) => (
                    <div key={difficulty} className="space-y-4">
                      <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            difficulty === "beginner" &&
                              "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                            difficulty === "easy" &&
                              "bg-green-500/10 text-green-500 border-green-500/20",
                            difficulty === "intermediate" &&
                              "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
                            difficulty === "advanced" &&
                              "bg-blue-500/10 text-blue-500 border-blue-500/20",
                            difficulty === "hard" &&
                              "bg-violet-500/10 text-violet-500 border-violet-500/20",
                            difficulty === "expert" &&
                              "bg-purple-500/10 text-purple-500 border-purple-500/20",
                            difficulty === "master" &&
                              "bg-orange-500/10 text-orange-500 border-orange-500/20",
                            difficulty === "grandmaster" &&
                              "bg-red-500/10 text-red-500 border-red-500/20"
                          )}
                        >
                          {difficulty.charAt(0).toUpperCase() +
                            difficulty.slice(1)}
                        </Badge>
                        <span>Bots</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {BOTS_BY_DIFFICULTY[
                          difficulty as keyof typeof BOTS_BY_DIFFICULTY
                        ].map((bot) => (
                          <Link
                            key={bot.name}
                            href={`/play/${difficulty}/${bot.id}`}
                            className={cn(
                              "block",
                              isBotBeaten(bot.name)
                                ? "cursor-pointer"
                                : "cursor-pointer"
                            )}
                          >
                            <Card
                              className={cn(
                                "border transition-all hover:shadow-md",
                                isBotBeaten(bot.name) &&
                                  "border-green-500 bg-green-50 dark:bg-green-950/20"
                              )}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage
                                      src={bot.image}
                                      alt={bot.name}
                                    />
                                    <AvatarFallback>
                                      {bot.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="font-semibold">
                                      {bot.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {bot.description}
                                    </div>
                                  </div>
                                  {isBotBeaten(bot.name) ? (
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                  ) : (
                                    <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/50" />
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
                      <Medal className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">
                        {gameStats.beatenBots.length} of {allBots.length} bots
                        defeated
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="mb-4">No bot challenges completed yet.</p>
                  <p className="text-muted-foreground">
                    Defeat bots to track your conquests here!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {renderClearHistoryButton()}
    </div>
  );
};

export default HistoryPage;
