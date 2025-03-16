"use client";

import Link from "next/link";
import {
  Baby,
  Gamepad2,
  BookOpen,
  Sword,
  Crosshair,
  Target,
  Trophy,
  Award,
  ChevronRight,
  Sparkles,
  Brain,
  Zap,
  Shield,
  Swords,
  ChevronDown,
  Save,
  History,
  Medal,
  PartyPopper,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import Image from "next/image";
import PlayerProfile from "@/components/PlayerProfile";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BOTS_BY_DIFFICULTY, Bot } from "@/components/game/data/bots";
import { useAuth } from "@/context/auth-context";
import { getUserGameStats } from "@/lib/game-service";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const difficultyLevels = [
  {
    name: "Beginner",
    href: "/play/beginner",
    description:
      "Learn the basics with a bot that makes predictable moves. Perfect for newcomers to chess or those looking to build confidence.",
    color: "bg-emerald-500/30 hover:bg-emerald-500/20 border-emerald-500/50",
    textColor: "text-emerald-500",
    icon: Baby,
    gradient: "from-emerald-500/20 to-emerald-500/5",
    hoverGradient: "hover:from-emerald-500/30 hover:to-emerald-500/10",
    eloRange: "800-1000",
    eloValue: 20,
    playStyle: "Random",
    styleIcon: Brain,
  },
  {
    name: "Easy",
    href: "/play/easy",
    description:
      "Practice basic strategies with slightly improved moves. Focuses on capturing pieces and developing simple threats to win the game.",
    color: "bg-green-500/30 hover:bg-green-500/20 border-green-500/50",
    textColor: "text-green-500",
    icon: Gamepad2,
    gradient: "from-green-500/20 to-green-500/5",
    hoverGradient: "hover:from-green-500/30 hover:to-green-500/10",
    eloRange: "1000-1200",
    eloValue: 30,
    playStyle: "Aggressive",
    styleIcon: Zap,
  },
  {
    name: "Intermediate",
    href: "/play/intermediate",
    description:
      "Test your skills against a bot with moderate tactical chess awareness. It recognizes basic patterns and responds to threats intelligently.",
    color: "bg-cyan-500/30 hover:bg-cyan-500/20 border-cyan-500/50",
    textColor: "text-cyan-500",
    icon: BookOpen,
    gradient: "from-cyan-500/20 to-cyan-500/5",
    hoverGradient: "hover:from-cyan-500/30 hover:to-cyan-500/10",
    eloRange: "1200-1400",
    eloValue: 40,
    playStyle: "Balanced",
    styleIcon: Shield,
  },
  {
    name: "Advanced",
    href: "/play/advanced",
    description:
      "Face stronger tactical play and strategic planning. Understands positional advantages and can execute multi-move combinations.",
    color: "bg-blue-500/30 hover:bg-blue-500/20 border-blue-500/50",
    textColor: "text-blue-500",
    icon: Sword,
    gradient: "from-blue-500/20 to-blue-500/5",
    hoverGradient: "hover:from-blue-500/30 hover:to-blue-500/10",
    eloRange: "1400-1600",
    eloValue: 50,
    playStyle: "Positional",
    styleIcon: Brain,
  },
  {
    name: "Hard",
    href: "/play/hard",
    description:
      "Challenge yourself with advanced strategies and combinations. Plays with purpose and can exploit weaknesses in your position.",
    color: "bg-violet-500/30 hover:bg-violet-500/20 border-violet-500/50",
    textColor: "text-violet-500",
    icon: Crosshair,
    gradient: "from-violet-500/20 to-violet-500/5",
    hoverGradient: "hover:from-violet-500/30 hover:to-violet-500/10",
    eloRange: "1600-1800",
    eloValue: 60,
    playStyle: "Tactical",
    styleIcon: Swords,
  },
  {
    name: "Expert",
    href: "/play/expert",
    description:
      "Test yourself against sophisticated positional understanding. Executes long-term plans and creates complex tactical opportunities.",
    color: "bg-purple-500/30 hover:bg-purple-500/20 border-purple-500/50",
    textColor: "text-purple-500",
    icon: Target,
    gradient: "from-purple-500/20 to-purple-500/5",
    hoverGradient: "hover:from-purple-500/30 hover:to-purple-500/10",
    eloRange: "1800-2000",
    eloValue: 70,
    playStyle: "Dynamic",
    styleIcon: Zap,
  },
  {
    name: "Master",
    href: "/play/master",
    description:
      "Face the second strongest bot with sophisticated chess understanding. Calculates deeply and rarely makes mistakes in its execution.",
    color: "bg-orange-500/30 hover:bg-orange-500/20 border-orange-500/50",
    textColor: "text-orange-500",
    icon: Award,
    gradient: "from-orange-500/20 to-orange-500/5",
    hoverGradient: "hover:from-orange-500/30 hover:to-orange-500/10",
    eloRange: "2000-2200",
    eloValue: 85,
    playStyle: "Strategic",
    styleIcon: Brain,
  },
  {
    name: "Grandmaster",
    href: "/play/grandmaster",
    description:
      "Challenge the ultimate bot with masterful chess execution. Plays at near-perfect level with deep calculation and strategic brilliance.",
    color: "bg-red-500/30 hover:bg-red-500/20 border-red-500/50",
    textColor: "text-red-500",
    icon: Trophy,
    gradient: "from-red-500/20 to-red-500/5",
    hoverGradient: "hover:from-red-500/30 hover:to-red-500/10",
    eloRange: "2200-2400",
    eloValue: 100,
    playStyle: "Universal",
    styleIcon: Swords,
  },
];

export default function Home() {
  const router = useRouter();
  const { session, signIn } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<
    (typeof difficultyLevels)[0] | null
  >(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(
    {}
  );
  const [gameStats, setGameStats] = useState<{
    beatenBots: Array<{ name: string; difficulty: string }>;
    totalGames: number;
  } | null>(null);
  const [nextBot, setNextBot] = useState<(Bot & { difficulty: string }) | null>(
    null
  );
  const [allBotsBeaten, setAllBotsBeaten] = useState(false);

  // Track mouse position for spotlight effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Fetch game stats and determine next bot
  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.user?.id) return;

      try {
        const stats = await getUserGameStats(session.user.id, session);
        setGameStats(stats);

        // Get all bots in order of difficulty
        const allBots: Array<Bot & { difficulty: string }> = [];
        Object.keys(BOTS_BY_DIFFICULTY).forEach((difficulty) => {
          BOTS_BY_DIFFICULTY[
            difficulty as keyof typeof BOTS_BY_DIFFICULTY
          ].forEach((bot) => {
            allBots.push({ ...bot, difficulty });
          });
        });

        // Find the first unbeaten bot
        const nextUnbeatenBot = allBots.find(
          (bot) => !stats.beatenBots.some((beaten) => beaten.name === bot.name)
        );

        if (nextUnbeatenBot) {
          setNextBot(nextUnbeatenBot);
          setAllBotsBeaten(false);
        } else {
          setNextBot(null);
          setAllBotsBeaten(true);
        }
      } catch (error) {
        console.error("Error fetching game stats:", error);
      }
    };

    fetchStats();
  }, [session]);

  // Check for saved game
  const getSavedGameDifficulty = () => {
    if (typeof window === "undefined") return null;

    const saved = localStorage.getItem("chess-game-state");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        return state.fen ? state.difficulty : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const savedDifficulty = getSavedGameDifficulty();

  const handleDifficultyClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    level: (typeof difficultyLevels)[0]
  ) => {
    // If there's a saved game and user is clicking a different difficulty
    if (
      savedDifficulty &&
      savedDifficulty.toLowerCase() !== level.name.toLowerCase()
    ) {
      e.preventDefault();
      setPendingDifficulty(level);
      setShowDialog(true);
    }
  };

  const handleConfirm = () => {
    if (pendingDifficulty) {
      localStorage.removeItem("chess-game-state");
      router.push(pendingDifficulty.href);
    }
    setShowDialog(false);
  };

  const toggleCardExpansion = (e: React.MouseEvent, levelName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCards((prev) => ({
      ...prev,
      [levelName]: !prev[levelName],
    }));
  };

  return (
    <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"></div>
      <div className="absolute top-0 left-0 right-0 h-[500px] -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent blur-3xl opacity-30"></div>

      {/* Chess pattern background */}
      <div
        className="absolute inset-0 -z-20 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M0 0h30v30H0V0zm30 30h30v30H30V30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      ></div>

      {/* Chess piece decorations */}
      <div className="absolute top-20 right-[5%] opacity-5 dark:opacity-10 rotate-12 hidden lg:block">
        <Image
          src="/pieces/staunty/wn.svg"
          alt="Knight"
          width={120}
          height={120}
        />
      </div>
      <div className="absolute bottom-20 left-[5%] opacity-5 dark:opacity-10 -rotate-12 hidden lg:block">
        <Image
          src="/pieces/staunty/wq.svg"
          alt="Queen"
          width={150}
          height={150}
        />
      </div>

      <div className="max-w-7xl w-full px-4 sm:px-8 py-4 sm:py-6 space-y-6 sm:space-y-10">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center space-y-4 pt-6 sm:pt-4">
          <div className="relative inline-block">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              Welcome to <span className="text-primary">NextMove</span>
            </h1>
            <div className="absolute -top-6 sm:-top-6 sm:-right-6 right-0 text-primary">
              <Sparkles className="h-8 w-8 animate-pulse" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl">
            Master your chess skills against increasingly challenging bot
            opponents
          </p>
          <div className="h-1 w-20 bg-gradient-to-r from-primary/50 to-primary rounded-full mt-4"></div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Difficulty Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {difficultyLevels.map((level) => (
              <Link
                key={level.name}
                href={level.href}
                onClick={(e) => handleDifficultyClick(e, level)}
                className={`relative p-5 rounded-xl border border-border/50 bg-gradient-to-br ${level.gradient} ${level.hoverGradient} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group overflow-hidden animate-fadeIn flex flex-col`}
                onMouseEnter={() => {
                  setHoveredCard(level.name);
                }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  setMousePosition({ x, y });
                }}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  animationDelay: `${difficultyLevels.indexOf(level) * 100}ms`,
                }}
              >
                {/* Spotlight effect */}
                {hoveredCard === level.name && (
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity"
                    style={{
                      background: `radial-gradient(circle 100px at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.15), transparent 70%)`,
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Saved game badge - only visible on sm and larger screens */}
                {savedDifficulty?.toLowerCase() ===
                  level.name.toLowerCase() && (
                  <div className="absolute bottom-3 left-3 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-lg z-10 animate-pulse hidden sm:block">
                    Saved Game
                  </div>
                )}

                {/* Card content */}
                <div className="flex flex-col h-full z-10 relative">
                  <div className="flex items-start gap-4 mb-3">
                    <div
                      className={`p-2.5 rounded-lg ${
                        level.color.split(" ")[0]
                      } bg-opacity-30 backdrop-blur-sm transform transition-transform group-hover:rotate-3 duration-300`}
                    >
                      <level.icon
                        className={`h-6 w-6 ${level.textColor} group-hover:scale-110 transition-transform`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">{level.name}</h2>
                        {/* Save icon for mobile */}
                        {savedDifficulty?.toLowerCase() ===
                          level.name.toLowerCase() && (
                          <div
                            className="relative sm:hidden"
                            title="Saved Game"
                          >
                            <div
                              className={`${
                                level.color.split(" ")[0]
                              } px-2 py-1 rounded-full animate-pulse flex items-center gap-1.5`}
                            >
                              <Save className={`h-4 w-4 ${level.textColor}`} />
                              <span
                                className={`text-xs font-medium ${level.textColor}`}
                              >
                                Saved
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <level.styleIcon
                          className={`h-3.5 w-3.5 ${level.textColor}`}
                        />
                        <span
                          className={`text-xs font-medium ${level.textColor}`}
                        >
                          {level.playStyle} Style
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => toggleCardExpansion(e, level.name)}
                      className={`sm:hidden p-1.5 rounded-full ${
                        level.color.split(" ")[0]
                      } ${level.textColor} transition-transform duration-300 ${
                        expandedCards[level.name] ? "rotate-180" : "rotate-0"
                      }`}
                      aria-label={
                        expandedCards[level.name]
                          ? "Collapse details"
                          : "Expand details"
                      }
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Mobile collapsible content */}
                  <div
                    className={`sm:hidden transition-all duration-300 ease-in-out overflow-hidden ${
                      expandedCards[level.name]
                        ? "max-h-96 opacity-100 mb-4"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="text-muted-foreground text-sm">
                      {level.description}
                    </p>

                    {/* ELO Rating Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium">ELO Rating</span>
                        <span className={`${level.textColor} font-medium`}>
                          {level.eloRange}
                        </span>
                      </div>
                      <Progress
                        value={level.eloValue}
                        className="h-1.5"
                        indicatorClassName={level.color.split(" ")[0]}
                      />
                    </div>

                    {/* Play button for expanded mobile view */}
                    <div className="flex justify-end mt-4">
                      <div
                        className={`${level.textColor} flex items-center gap-1 text-sm font-medium`}
                      >
                        Play now{" "}
                        <ChevronRight className="h-4 w-4 animate-bounceX" />
                      </div>
                    </div>
                  </div>

                  {/* Desktop always visible content */}
                  <div className="hidden sm:block">
                    <p className="text-muted-foreground text-sm min-h-[4.5rem]">
                      {level.description}
                    </p>

                    {/* ELO Rating Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium">ELO Rating</span>
                        <span className={`${level.textColor} font-medium`}>
                          {level.eloRange}
                        </span>
                      </div>
                      <Progress
                        value={level.eloValue}
                        className="h-1.5"
                        indicatorClassName={level.color.split(" ")[0]}
                      />
                    </div>
                  </div>

                  {/* Mobile ELO summary when collapsed */}
                  <div
                    className={`sm:hidden ${
                      expandedCards[level.name] ? "hidden" : "block"
                    } mt-2 mb-1`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">
                        ELO:{" "}
                        <span className={`${level.textColor}`}>
                          {level.eloRange}
                        </span>
                      </span>
                      <div
                        className={`sm:hidden ${level.textColor} flex items-center gap-1 text-xs font-medium`}
                      >
                        Play{" "}
                        <ChevronRight className="h-3 w-3 animate-bounceX" />
                      </div>
                    </div>
                  </div>

                  <div
                    className={`mt-auto pt-3 self-end ${level.textColor} sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hidden sm:flex items-center gap-1 text-sm font-medium transform sm:group-hover:translate-x-0 sm:-translate-x-2`}
                  >
                    Play now{" "}
                    <ChevronRight className="h-4 w-4 animate-bounceX" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Right Side Content */}
          <div className="lg:row-span-1 space-y-6">
            {/* Player Profile Card */}
            <PlayerProfile className="mb-6" />

            {/* Challenge Description */}
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-6 sticky top-6 shadow-lg">
              <div className="relative">
                <h2 className="text-2xl font-bold mb-4 inline-block">
                  The Ultimate Chess Challenge
                </h2>
                <div className="h-1 w-12 bg-primary/50 rounded-full mb-5"></div>
              </div>

              <p className="text-muted-foreground leading-relaxed mb-6">
                Can you conquer all eight categories of bot opponents? With a
                total of 48 unique bots, your journey begins at the beginner
                level and progresses toward the formidable Grandmaster bot.
              </p>

              {/* Progress Link */}
              <Link
                href="/history?tab=bots"
                className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors mb-6 group"
                scroll={false}
              >
                <div className="bg-primary/10 p-2 rounded-full">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium flex items-center gap-2">
                    Bot Progression
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Track your victories and challenges
                  </p>
                </div>
                {gameStats && (
                  <Badge variant="secondary" className="ml-2">
                    {gameStats.beatenBots.length}/48
                  </Badge>
                )}
              </Link>

              {/* Stats Section */}
              <div className="space-y-4">
                {allBotsBeaten ? (
                  <div className="text-center space-y-4 py-4">
                    <div className="bg-primary/10 p-4 rounded-full inline-block">
                      <PartyPopper className="h-8 w-8 text-primary animate-bounce" />
                    </div>
                    <h3 className="font-bold text-xl">Congratulations!</h3>
                    <p className="text-muted-foreground">
                      You&apos;ve beaten all the bots! Want to challenge
                      yourself again?
                    </p>
                    <Button
                      className="w-full mt-2"
                      size="lg"
                      onClick={() => router.push("/play/beginner")}
                    >
                      Start Again
                    </Button>
                  </div>
                ) : nextBot ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Medal className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Next Challenge</h3>
                        <p className="text-sm text-muted-foreground">
                          Beat this bot to progress
                        </p>
                      </div>
                    </div>

                    {/* Next Bot Card */}
                    <Link
                      href={`/play/${nextBot.difficulty.toLowerCase()}/${
                        nextBot.id
                      }`}
                      className="block p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={nextBot.image} alt={nextBot.name} />
                          <AvatarFallback>
                            {nextBot.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{nextBot.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {nextBot.description}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                nextBot.difficulty.toLowerCase() ===
                                  "beginner" &&
                                  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                nextBot.difficulty.toLowerCase() === "easy" &&
                                  "bg-green-500/10 text-green-500 border-green-500/20",
                                nextBot.difficulty.toLowerCase() ===
                                  "intermediate" &&
                                  "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                nextBot.difficulty.toLowerCase() ===
                                  "advanced" &&
                                  "bg-purple-500/10 text-purple-500 border-purple-500/20",
                                nextBot.difficulty.toLowerCase() === "hard" &&
                                  "bg-orange-500/10 text-orange-500 border-orange-500/20",
                                nextBot.difficulty.toLowerCase() === "expert" &&
                                  "bg-red-500/10 text-red-500 border-red-500/20",
                                nextBot.difficulty.toLowerCase() === "master" &&
                                  "bg-pink-500/10 text-pink-500 border-pink-500/20",
                                nextBot.difficulty.toLowerCase() ===
                                  "grandmaster" &&
                                  "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              )}
                            >
                              {nextBot.difficulty.charAt(0).toUpperCase() +
                                nextBot.difficulty.slice(1).toLowerCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Rating: {nextBot.rating}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">
                      Sign in to track your progress and see your next
                      challenge!
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => signIn("google", "/")}
                    >
                      Sign In with Google
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              Start New Game?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have a saved game in progress. Starting a new game will lose
              your current progress. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
