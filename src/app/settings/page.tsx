"use client";

import { useAuth } from "@/context/auth-context";
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Check,
  Crown,
  Grid3X3,
  Palette,
  Volume2,
  VolumeX,
  Zap,
  PartyPopper,
  Clock,
  Flag,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  saveAllSettings,
  getPieceSet,
  getShowCoordinates,
  getEnableAnimations,
} from "@/lib/settings";
import { useRouter } from "next/navigation";
import { isSessionValid } from "../../lib/auth-service";
import {
  getUserSettings,
  saveUserSettings,
  UserSettings,
} from "@/lib/mongodb-service";
import SettingsLoading from "./loading";

export default function SettingsPage() {
  const { status, session } = useAuth();
  const [settings, setSettings] = useState<Omit<UserSettings, "user_id">>({
    display_name: "",
    first_name: "",
    last_name: "",
    location: "",
    avatar_url: "",
    preferred_difficulty: "intermediate",
    sound_enabled: true,
    piece_set: "staunty",
    white_pieces_bottom: true,
    show_coordinates: true,
    enable_animations: true,
    enable_confetti: true,
    timezone: "UTC",
    clock_format: "24",
    country_flag: "",
    flair: "",
  });
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [flairDialogOpen, setFlairDialogOpen] = useState(false);
  const router = useRouter();

  // Define the piece sets
  const pieceSets = [
    "staunty",
    "california",
    "cardinal",
    "cburnett",
    "chessicons",
    "chessmonk",
    "chessnut",
    "freestaunton",
    "fresca",
    "gioco",
    "governor",
    "icpieces",
    "kosal",
    "maestro",
    "merida_new",
    "pixel",
    "riohacha",
    "tatiana",
  ];

  // Function to load user settings
  const loadUserSettings = useCallback(async () => {
    if (status === "authenticated" && session?.user?.id) {
      setLoading(true);
      setError(null);

      try {
        const settingsData = await getUserSettings(session.user.id);

        if (settingsData) {
          setSettings({
            display_name: settingsData.display_name || "",
            first_name: settingsData.first_name || "",
            last_name: settingsData.last_name || "",
            location: settingsData.location || "",
            avatar_url: settingsData.avatar_url || "",
            preferred_difficulty:
              settingsData.preferred_difficulty || "intermediate",
            sound_enabled: settingsData.sound_enabled !== false,
            piece_set: settingsData.piece_set || getPieceSet(),
            white_pieces_bottom: settingsData.white_pieces_bottom !== false,
            show_coordinates: settingsData.show_coordinates !== false,
            enable_animations: settingsData.enable_animations !== false,
            enable_confetti: settingsData.enable_confetti !== false,
            timezone: settingsData.timezone || "UTC",
            clock_format: settingsData.clock_format || "24",
            country_flag: settingsData.country_flag || "",
            flair: settingsData.flair || "",
          });
        } else {
          // No settings found, use defaults
          setSettings({
            display_name: session.user.name || "",
            first_name: "",
            last_name: "",
            location: "",
            avatar_url: session.user.image || "",
            preferred_difficulty: "intermediate",
            sound_enabled: true,
            piece_set: getPieceSet(),
            white_pieces_bottom: true,
            show_coordinates: getShowCoordinates(),
            enable_animations: getEnableAnimations(),
            enable_confetti: true,
            timezone: "UTC",
            clock_format: "24",
            country_flag: "",
            flair: "",
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        setError("Failed to load settings. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  }, [status, session]);

  // Add a function to handle authentication errors
  const handleAuthError = useCallback(
    (error: Error) => {
      console.error("Authentication error:", error);
      setError("Authentication error. Please sign in again.");

      // Redirect to sign in page after a short delay
      setTimeout(() => {
        router.push("/auth/signin");
      }, 2000);
    },
    [router, setError]
  );

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session) {
      router.push("/auth/signin");
      return;
    }

    // Check if the session is valid
    if (session) {
      const valid = isSessionValid(session);
      if (!valid) {
        handleAuthError(new Error("Session is invalid"));
        return;
      }

      loadUserSettings();
    }
  }, [status, session, router, handleAuthError, loadUserSettings]);

  // Load available avatars
  useEffect(() => {
    const avatars = [
      "/avatars/aang.png",
      "/avatars/bojack.png",
      "/avatars/bubblegum.png",
      "/avatars/finn.png",
      "/avatars/homer.png",
      "/avatars/jake.png",
      "/avatars/marceline.png",
      "/avatars/mordecai.png",
      "/avatars/patrick.png",
      "/avatars/peter.png",
      "/avatars/rigby.png",
      "/avatars/sandy.png",
      "/avatars/spongebob.png",
      "/avatars/squidward.png",
    ];

    setAvailableAvatars(avatars);
  }, []);

  const handleSaveSettings = async () => {
    if (!session?.user?.id) {
      setError("You need to be signed in to save settings");
      return;
    }

    setSaveMessage("");
    setLoading(true);

    try {
      const success = await saveUserSettings(session.user.id, settings);

      if (success) {
        // Save to localStorage for offline use
        saveAllSettings({
          pieceSet: settings.piece_set,
          whitePiecesBottom: settings.white_pieces_bottom,
          showCoordinates: settings.show_coordinates,
          enableAnimations: settings.enable_animations,
          soundEnabled: settings.sound_enabled,
          enableConfetti: settings.enable_confetti,
          timezone: settings.timezone,
          clockFormat: settings.clock_format,
          countryFlag: settings.country_flag,
          flair: settings.flair,
        });

        // Also save individual settings for backward compatibility
        localStorage.setItem("chess_piece_set", settings.piece_set);
        localStorage.setItem(
          "chess_white_pieces_bottom",
          settings.white_pieces_bottom.toString()
        );
        localStorage.setItem(
          "chess_show_coordinates",
          settings.show_coordinates.toString()
        );
        localStorage.setItem(
          "chess_enable_animations",
          settings.enable_animations.toString()
        );
        localStorage.setItem(
          "chess_sound_enabled",
          settings.sound_enabled.toString()
        );
        localStorage.setItem(
          "chess_enable_confetti",
          settings.enable_confetti.toString()
        );
        localStorage.setItem("chess_timezone", settings.timezone);
        localStorage.setItem("chess_clock_format", settings.clock_format);
        localStorage.setItem("chess_country_flag", settings.country_flag);
        localStorage.setItem("chess_flair", settings.flair);

        setSaveMessage("Settings saved successfully");
        setTimeout(() => setSaveMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings. Please try again.");

      if (
        error instanceof Error &&
        (error.message.includes("401") ||
          error.message.includes("auth") ||
          error.message.includes("permission"))
      ) {
        handleAuthError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (avatarPath: string) => {
    setSettings({ ...settings, avatar_url: avatarPath });
    setAvatarDialogOpen(false);
  };

  if (status === "loading" || loading) {
    return <SettingsLoading />;
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

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>User Settings</CardTitle>
          <CardDescription>
            Manage your account settings and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {saveMessage && !error && (
            <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/20">
              <Check className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Success</AlertTitle>
              <AlertDescription className="text-green-500">
                {saveMessage}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="game">Game Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={settings.display_name}
                  onChange={(e) =>
                    setSettings({ ...settings, display_name: e.target.value })
                  }
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={settings.first_name}
                  onChange={(e) =>
                    setSettings({ ...settings, first_name: e.target.value })
                  }
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={settings.last_name}
                  onChange={(e) =>
                    setSettings({ ...settings, last_name: e.target.value })
                  }
                  maxLength={50}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-muted-foreground mt-1.5">
                  {session?.user?.email || "No email available"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={settings.location}
                  onChange={(e) =>
                    setSettings({ ...settings, location: e.target.value })
                  }
                  maxLength={100}
                  placeholder="City, Country"
                />
              </div>

              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-4">
                  <Dialog
                    open={avatarDialogOpen}
                    onOpenChange={setAvatarDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="p-0 h-auto w-auto rounded-full relative group"
                      >
                        <Avatar className="h-16 w-16 cursor-pointer border-2 border-primary/50 group-hover:border-primary transition-all">
                          <AvatarImage src={settings.avatar_url} alt="Avatar" />
                          <AvatarFallback>
                            {settings.display_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-xs text-white font-medium">
                            Change
                          </span>
                        </div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Choose Avatar</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[300px] mt-2">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-2">
                          {availableAvatars.map((avatar, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              className="p-1 h-auto relative"
                              onClick={() => handleAvatarSelect(avatar)}
                            >
                              <div className="relative">
                                <Avatar className="h-16 w-16 border-2 border-transparent hover:border-primary transition-all">
                                  <AvatarImage
                                    src={avatar}
                                    alt={`Avatar ${index + 1}`}
                                  />
                                  <AvatarFallback>?</AvatarFallback>
                                </Avatar>
                                {avatar === settings.avatar_url && (
                                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                    <Check className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Select an avatar to represent you in games
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Country Flag</Label>
                <Select
                  value={settings.country_flag || "none"}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      country_flag: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select country flag">
                      <div className="flex items-center gap-2">
                        <Flag className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        {settings.country_flag ? (
                          <div className="flex items-center gap-2">
                            <Image
                              src={`/flags/${settings.country_flag}.png`}
                              alt={settings.country_flag}
                              width={20}
                              height={12}
                              className="h-3 w-5"
                            />
                            <span className="capitalize">
                              {settings.country_flag.toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <span>Select country flag</span>
                        )}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "none",
                      "ad",
                      "am",
                      "ar",
                      "au",
                      "ba",
                      "bg",
                      "ca",
                      "cn",
                      "cu",
                      "cy",
                      "cz",
                      "de",
                      "dk",
                      "ec",
                      "eng",
                      "fi",
                      "fr",
                      "ge",
                      "gr",
                      "ie",
                      "il",
                      "in",
                      "is",
                      "it",
                      "jp",
                      "kr",
                      "lt",
                      "lu",
                      "lv",
                      "my",
                      "no",
                      "nz",
                      "ph",
                      "pk",
                      "ps",
                      "pt",
                      "ro",
                      "rs",
                      "ru",
                      "sct",
                      "se",
                      "sy",
                      "tr",
                      "ua",
                      "ug",
                      "us",
                      "uy",
                      "wls",
                    ].map((flag) => (
                      <SelectItem key={flag} value={flag}>
                        <div className="flex items-center gap-2">
                          {flag !== "none" ? (
                            <>
                              <Image
                                src={`/flags/${flag}.png`}
                                alt={flag}
                                width={20}
                                height={12}
                                className="h-3 w-5"
                              />
                              <span className="capitalize">
                                {flag.toUpperCase()}
                              </span>
                            </>
                          ) : (
                            <span>None</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Flair</Label>
                <div className="flex items-center gap-4">
                  <Dialog
                    open={flairDialogOpen}
                    onOpenChange={setFlairDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-muted-foreground" />
                          <span>{settings.flair || "Choose a flair"}</span>
                        </div>
                        <span className="text-2xl">{settings.flair}</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Choose Flair</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[300px]">
                        <div className="grid grid-cols-5 gap-2 p-2">
                          {[
                            "⚔️",
                            "🎮",
                            "🎯",
                            "🎲",
                            "🏆",
                            "👑",
                            "⭐",
                            "💫",
                            "✨",
                            "🌟",
                            "🌈",
                            "💥",
                            "🔥",
                            "⚡",
                            "🌀",
                            "🌪️",
                            "🌊",
                            "☄️",
                            "🌌",
                            "🌠",
                            "🪐",
                            "🌙",
                            "☀️",
                            "🌤️",
                            "🌍",
                            "🌎",
                            "🌏",
                            "🧭",
                            "🕹️",
                            "🎼",
                            "🎵",
                            "🎶",
                            "🎤",
                            "🎧",
                            "🎷",
                            "🎸",
                            "🎻",
                            "🥁",
                            "📯",
                            "🎺",
                            "🎹",
                            "📀",
                            "💿",
                            "📸",
                            "🎥",
                            "🎬",
                            "📽️",
                            "📡",
                            "🔮",
                            "🕶️",
                            "🕵️‍♂️",
                            "🕵️‍♀️",
                            "🤖",
                            "👾",
                            "🎃",
                            "💀",
                            "👻",
                            "👽",
                            "🛸",
                            "🚀",
                            "🛰️",
                            "🛠️",
                            "🗡️",
                            "🔫",
                            "🏹",
                            "🛡️",
                            "💣",
                            "📜",
                            "🏰",
                            "🕌",
                            "🛕",
                            "⛩️",
                            "🌋",
                            "🏔️",
                            "⛰️",
                            "🗻",
                            "🏕️",
                            "🌄",
                            "🌅",
                            "🎑",
                            "🏜️",
                            "🏝️",
                            "🏞️",
                            "🌇",
                            "🌆",
                            "🏙️",
                            "🌃",
                            "🌉",
                            "🌁",
                            "🛤️",
                            "🚆",
                            "🚄",
                            "🛳️",
                            "🚢",
                            "⛵",
                            "🛶",
                            "🛺",
                            "🚘",
                            "🚖",
                            "🚍",
                            "🚌",
                            "🚋",
                            "🚊",
                            "🚉",
                            "🚁",
                            "🛩️",
                            "🦄",
                            "🐉",
                            "🐲",
                            "🐍",
                            "🦅",
                            "🦇",
                            "🐺",
                            "🦊",
                            "🐗",
                            "🦬",
                            "🦓",
                            "🦒",
                            "🐪",
                            "🐫",
                            "🦘",
                            "🐃",
                            "🐂",
                            "🐄",
                            "🦝",
                            "🦡",
                            "🦢",
                            "🦜",
                            "🐧",
                            "🦆",
                            "🐦",
                            "🕊️",
                            "🐕",
                            "🐩",
                            "🐈",
                            "🦁",
                            "🐅",
                            "🐆",
                            "🐎",
                            "🦏",
                            "🐘",
                            "🦛",
                            "🐁",
                            "🐀",
                            "🐿️",
                            "🦔",
                            "🐾",
                            "🦖",
                            "🦕",
                            "🦦",
                            "🦨",
                            "🦥",
                            "🦫",
                            "🐓",
                            "🦃",
                            "🦩",
                            "🦉",
                            "🎭",
                            "🎨",
                            "🖌️",
                            "🖍️",
                            "📝",
                            "✏️",
                            "🖊️",
                            "🖋️",
                            "📖",
                            "📚",
                            "🔖",
                            "🏹",
                            "🛠️",
                            "⚒️",
                            "🔨",
                            "⛏️",
                            "🧨",
                            "🚀",
                          ].map((emoji, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              className="h-12 text-2xl hover:bg-accent"
                              onClick={() => {
                                setSettings({ ...settings, flair: emoji });
                                setFlairDialogOpen(false);
                              }}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) =>
                    setSettings({ ...settings, timezone: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select timezone">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{settings.timezone}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Intl.supportedValuesOf("timeZone").map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clock_format">Clock Format</Label>
                <div className="flex gap-3 mt-2">
                  <Button
                    onClick={() =>
                      setSettings({ ...settings, clock_format: "12" })
                    }
                    variant={
                      settings.clock_format === "12" ? "default" : "outline"
                    }
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    12-hour
                  </Button>
                  <Button
                    onClick={() =>
                      setSettings({ ...settings, clock_format: "24" })
                    }
                    variant={
                      settings.clock_format === "24" ? "default" : "outline"
                    }
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    24-hour
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="game" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="piece_set">Chess Piece Set</Label>
                <Select
                  value={settings.piece_set}
                  onValueChange={(value) =>
                    setSettings({ ...settings, piece_set: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select piece set">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="capitalize truncate">
                          {settings.piece_set.replace("_", " ")}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {pieceSets.map((set) => (
                      <SelectItem key={set} value={set}>
                        <div className="flex items-center gap-2">
                          <span className="capitalize">
                            {set.replace("_", " ")}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 flex justify-center">
                  <div className="grid grid-cols-4 gap-2 p-2 bg-muted/30 rounded-md">
                    {["k", "q", "r", "b"].map((piece) => (
                      <div key={piece} className="w-8 h-8">
                        <Image
                          src={`/pieces/${settings.piece_set}/w${piece}.svg`}
                          alt={`${piece} piece`}
                          width={32}
                          height={32}
                          className="w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="white_pieces_bottom">
                  White Pieces Position
                </Label>
                <div className="flex gap-3 mt-2">
                  <Button
                    onClick={() =>
                      setSettings({ ...settings, white_pieces_bottom: true })
                    }
                    variant={
                      settings.white_pieces_bottom ? "default" : "outline"
                    }
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Crown className="h-4 w-4 fill-current" />
                    Bottom
                  </Button>
                  <Button
                    onClick={() =>
                      setSettings({ ...settings, white_pieces_bottom: false })
                    }
                    variant={
                      !settings.white_pieces_bottom ? "default" : "outline"
                    }
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    Top
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound_enabled">Sound</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable game sounds
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {settings.sound_enabled ? (
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    id="sound_enabled"
                    checked={settings.sound_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, sound_enabled: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show_coordinates">Board Coordinates</Label>
                  <p className="text-sm text-muted-foreground">
                    Show coordinates on the chess board
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    id="show_coordinates"
                    checked={settings.show_coordinates}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, show_coordinates: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_animations">Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable game animations
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    id="enable_animations"
                    checked={settings.enable_animations}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enable_animations: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_confetti">Victory Confetti</Label>
                  <p className="text-sm text-muted-foreground">
                    Show confetti animation when winning a game
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <PartyPopper className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    id="enable_confetti"
                    checked={settings.enable_confetti}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enable_confetti: checked })
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveSettings} disabled={loading}>
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
