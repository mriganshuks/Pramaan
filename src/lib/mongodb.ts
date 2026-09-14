import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

// Set bufferCommands false so queries fail fast rather than hanging indefinitely
mongoose.set("bufferCommands", false);

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || {
  conn: null,
  promise: null,
};

global.mongoose = cached;

let warnedOffline = false;

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) {
    if (!warnedOffline) {
      console.warn("[AI Studio] MONGODB_URI not configured — using in-memory mock store.");
      warnedOffline = true;
    }
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  cached.conn = null;

  try {
    return await openConnection();
  } catch (error) {
    cached.conn = null;
    cached.promise = null;

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => undefined);
    }

    if (!warnedOffline) {
      console.warn("[AI Studio] MongoDB connection failed — falling back to in-memory store:", (error as Error).message);
      warnedOffline = true;
    }
    return null;
  }
}

async function openConnection(): Promise<typeof mongoose> {
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI as string, {
        family: 4,
        serverSelectionTimeoutMS: 5000,
      })
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>): Promise<T> {
  await connectToDatabase();
  return operation();
}

