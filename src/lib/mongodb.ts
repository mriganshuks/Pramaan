import mongoose from "mongoose";
import { ApiError } from "@/lib/api";

const MONGODB_URI = process.env.MONGODB_URI;

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

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new ApiError("Database is not configured. Add MONGODB_URI on the server.", 503, "DATABASE_NOT_CONFIGURED");
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  cached.conn = null;

  try {
    return await openConnection();
  } catch {
    cached.conn = null;
    cached.promise = null;

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => undefined);
    }

    return openConnection();
  }
}

async function openConnection() {
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI as string, {
        family: 4,
        tls: true,
        serverSelectionTimeoutMS: 10000,
      })
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;

  return cached.conn;
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>) {
  await connectToDatabase();

  try {
    return await operation();
  } catch {
    cached.conn = null;
    cached.promise = null;

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => undefined);
    }

    await connectToDatabase();
    return operation();
  }
}
