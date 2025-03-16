"use server";

import { MongoClient, ObjectId } from "mongodb";

interface MongoDoc {
  _id?: ObjectId;
}

type SerializedDoc<T> = {
  [K in keyof Omit<T, "_id">]: T[K] extends Date
    ? string
    : T[K] extends ObjectId
    ? string
    : T[K] extends object
    ? SerializedDoc<T[K]>
    : T[K];
} & {
  id?: string;
};

export interface UserSettings {
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  location: string;
  avatar_url: string;
  preferred_difficulty: string;
  sound_enabled: boolean;
  piece_set: string;
  white_pieces_bottom: boolean;
  show_coordinates: boolean;
  enable_animations: boolean;
  enable_confetti: boolean;
  timezone: string;
  clock_format: "12" | "24";
  country_flag: string;
  flair: string;
}

interface UserSettingsDoc extends UserSettings, MongoDoc {}

export interface GameHistory {
  id: string;
  user_id: string;
  opponent: string;
  result: "win" | "loss" | "draw" | "resign";
  date: string;
  moves_count: number;
  time_taken: number;
  difficulty: string;
  fen: string;
}

interface GameHistoryDoc extends Omit<GameHistory, "id">, MongoDoc {}

// MongoDB connection
let client: MongoClient | null = null;

async function getClient() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please add your MongoDB URI to .env.local");
  }

  if (client) {
    return client;
  }

  client = await MongoClient.connect(process.env.MONGODB_URI);
  return client;
}

// Helper function to serialize MongoDB documents
function serializeDocument<T extends { _id?: ObjectId }>(
  doc: T | null
): SerializedDoc<T> | null {
  if (!doc) return null;

  // First, convert the entire document to a plain object
  const plainDoc = JSON.parse(JSON.stringify(doc));

  // Then create a new object with only the properties we want
  const serialized: SerializedDoc<T> = {} as SerializedDoc<T>;

  // Handle _id separately
  if (plainDoc._id) {
    serialized.id = plainDoc._id.toString();
  }

  // Copy all other properties, ensuring they are plain values
  Object.entries(plainDoc).forEach(([key, value]) => {
    if (key !== "_id") {
      const typedKey = key as keyof SerializedDoc<T>;
      if (value instanceof Date) {
        serialized[typedKey] =
          value.toISOString() as SerializedDoc<T>[typeof typedKey];
      } else if (typeof value === "object" && value !== null) {
        // For nested objects, ensure they're also plain objects
        serialized[typedKey] = JSON.parse(
          JSON.stringify(value)
        ) as SerializedDoc<T>[typeof typedKey];
      } else {
        serialized[typedKey] = value as SerializedDoc<T>[typeof typedKey];
      }
    }
  });

  return serialized;
}

// User Settings Operations
export async function getUserSettings(
  userId: string
): Promise<UserSettings | null> {
  const client = await getClient();
  const collection = client.db("chess").collection("user_settings");
  const doc = await collection.findOne<UserSettingsDoc>({ user_id: userId });
  return serializeDocument(doc);
}

export async function saveUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<boolean> {
  const client = await getClient();
  const collection = client.db("chess").collection("user_settings");

  const result = await collection.updateOne(
    { user_id: userId },
    { $set: { ...settings, user_id: userId } },
    { upsert: true }
  );

  return result.acknowledged;
}

// Game History Operations
export async function saveGameResult(
  gameData: Omit<GameHistory, "id">
): Promise<GameHistory | null> {
  const client = await getClient();
  const collection = client.db("chess").collection("game_history");

  // Ensure the data is properly serialized before saving
  const serializedData = JSON.parse(
    JSON.stringify({
      ...gameData,
      date: new Date(gameData.date).toISOString(),
      moves_count: Number(gameData.moves_count),
      time_taken: Number(gameData.time_taken),
    })
  );

  const result = await collection.insertOne(serializedData);
  if (result.acknowledged) {
    // Return a plain object with the inserted ID
    return JSON.parse(
      JSON.stringify({
        ...serializedData,
        id: result.insertedId.toString(),
      })
    ) as GameHistory;
  }
  return null;
}

export async function getUserGameHistory(
  userId: string
): Promise<GameHistory[]> {
  const client = await getClient();
  const collection = client.db("chess").collection("game_history");

  const games = await collection
    .find<GameHistoryDoc>({ user_id: userId })
    .sort({ date: -1 })
    .toArray();

  // Ensure proper serialization of each game document
  return games
    .map((game) => {
      const serialized = serializeDocument(game);
      if (!serialized) return null;

      // Ensure all fields are plain values by double-serializing
      return JSON.parse(
        JSON.stringify({
          ...serialized,
          date: serialized.date.toString(),
          moves_count: Number(serialized.moves_count),
          time_taken: Number(serialized.time_taken),
        })
      ) as GameHistory;
    })
    .filter((game): game is GameHistory => game !== null);
}

export async function clearUserGameHistory(userId: string): Promise<boolean> {
  const client = await getClient();
  const collection = client.db("chess").collection("game_history");

  const result = await collection.deleteMany({ user_id: userId });
  return result.acknowledged;
}

export async function deleteUserAccount(userId: string): Promise<boolean> {
  const client = await getClient();

  try {
    // Delete user settings
    const settingsCollection = client.db("chess").collection("user_settings");
    await settingsCollection.deleteOne({ user_id: userId });

    // Delete game history
    const historyCollection = client.db("chess").collection("game_history");
    await historyCollection.deleteMany({ user_id: userId });

    // Delete from users collection if it exists
    const usersCollection = client.db("chess").collection("users");
    await usersCollection.deleteOne({ _id: new ObjectId(userId) });

    // Delete from accounts collection if it exists
    const accountsCollection = client.db("chess").collection("accounts");
    await accountsCollection.deleteOne({ userId });

    // Delete from sessions collection if it exists
    const sessionsCollection = client.db("chess").collection("sessions");
    await sessionsCollection.deleteMany({ userId });

    return true;
  } catch (error) {
    console.error("Error deleting user account:", error);
    return false;
  }
}
