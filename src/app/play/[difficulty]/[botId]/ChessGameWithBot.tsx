"use client";

import { useParams, useRouter } from "next/navigation";
import ChessBoard from "@/components/game/board/ChessBoard";
import { useEffect, useState } from "react";
import { findBotById } from "@/lib/bot-utils";
import { Bot } from "@/components/game/data/bots";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ChessGameWithBot() {
  const params = useParams();
  const router = useRouter();
  const difficulty = params.difficulty as string;
  const botId = params.botId ? parseInt(params.botId as string, 10) : null;

  const [selectedBot, setSelectedBot] = useState<
    (Bot & { difficulty: string }) | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (botId) {
      const bot = findBotById(botId);
      if (bot) {
        setSelectedBot(bot);
        setError(null);
      } else {
        setError(`Bot with ID ${botId} not found`);
      }
    }
  }, [botId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          onClick={() => router.push(`/play/${difficulty}`)}
        >
          Go Back to {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}{" "}
          Difficulty
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 p-4 min-h-[calc(100vh-4rem)]">
      <ChessBoard difficulty={difficulty} initialBot={selectedBot} />
    </div>
  );
}
