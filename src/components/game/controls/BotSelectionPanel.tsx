import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Info,
  Baby,
  Gamepad2,
  Swords,
  Sword,
  Crosshair,
  Target,
  Trophy,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface Bot {
  name: string;
  image: string;
  rating: number;
  description: string;
  skillLevel: number;
  depth: number;
  moveTime: number;
  flag: string;
}

interface BotSelectionPanelProps {
  bots: Bot[];
  onSelectBot: (bot: Bot) => void;
  difficulty: string;
  onDifficultyChange: (difficulty: string) => void;
  selectedBot: Bot | null;
}

const BotSelectionPanel = ({
  bots,
  onSelectBot,
  difficulty,
  onDifficultyChange,
  selectedBot,
}: BotSelectionPanelProps) => {
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

  // Determine if the word starts with a vowel
  const getGrammar = (word: string) => {
    return /^[aeiou]/i.test(word) ? "an" : "a";
  };

  const capitalizedDifficulty =
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const grammar = getGrammar(difficulty);

  const difficultyIcons = {
    beginner: { icon: Baby, color: "text-emerald-500" },
    easy: { icon: Gamepad2, color: "text-green-500" },
    intermediate: { icon: Swords, color: "text-cyan-500" },
    advanced: { icon: Sword, color: "text-blue-500" },
    hard: { icon: Crosshair, color: "text-violet-500" },
    expert: { icon: Target, color: "text-purple-500" },
    master: { icon: Award, color: "text-orange-500" },
    grandmaster: { icon: Trophy, color: "text-red-500" },
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-3 w-full lg:min-w-[280px] lg:max-w-md lg:p-4">
      <Card className="border-0 shadow-none">
        <CardHeader className="p-3 pb-2 lg:p-4 lg:pb-2">
          <CardTitle className="text-lg lg:text-xl">
            Select {grammar} {capitalizedDifficulty} Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 lg:p-4 lg:pt-0">
          {/* Mobile Layout (< 1024px) */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-3 gap-3">
            {bots.map((bot) => (
              <div
                key={bot.name}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={bot.image} alt={bot.name} />
                  <AvatarFallback>{bot.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{bot.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Rating: {bot.rating}
                  </div>
                  <Image
                    src={bot.flag}
                    alt={`${bot.name} flag`}
                    className="w-5 h-3 mt-1"
                    width={20}
                    height={12}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => onSelectBot(bot)}
                  variant={
                    selectedBot?.name === bot.name ? "default" : "outline"
                  }
                >
                  {selectedBot?.name === bot.name ? "Selected" : "Select"}
                </Button>
              </div>
            ))}
          </div>

          {/* Desktop Layout (≥ 1024px) */}
          <div className="hidden lg:block space-y-4">
            {bots.map((bot) => (
              <div key={bot.name} className="flex items-center gap-3">
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={bot.image} alt={bot.name} />
                  <AvatarFallback>{bot.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate max-w-[100px]">
                      {bot.name}
                    </span>
                    <div className="flex-shrink-0">
                      <Image
                        src={bot.flag}
                        alt={`${bot.name} flag`}
                        className="w-5 h-3"
                        width={20}
                        height={12}
                      />
                    </div>
                  </div>
                  <div className="text-xs">Rating: {bot.rating}</div>
                </div>
                <Button
                  className="flex-shrink-0 ml-auto"
                  onClick={() => onSelectBot(bot)}
                  variant={
                    selectedBot?.name === bot.name ? "default" : "outline"
                  }
                >
                  {selectedBot?.name === bot.name ? "Selected" : "Select"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          Difficulty category
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Change the skill level category of the bot.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select value={difficulty} onValueChange={onDifficultyChange}>
          <SelectTrigger className="w-full">
            <SelectValue>
              <div className="flex items-center gap-2">
                {(() => {
                  const { icon: Icon, color } =
                    difficultyIcons[difficulty as keyof typeof difficultyIcons];
                  return <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />;
                })()}
                <span className="capitalize truncate">{difficulty}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {difficulties.map((diff) => {
              const { icon: Icon, color } =
                difficultyIcons[diff as keyof typeof difficultyIcons];
              return (
                <SelectItem key={diff} value={diff}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="capitalize">{diff}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
export default BotSelectionPanel;
