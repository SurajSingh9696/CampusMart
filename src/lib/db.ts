import mongoose from "mongoose";
import { env, assertServerEnv } from "@/lib/env";

declare global {
  var mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cached = global.mongooseConn || { conn: null, promise: null };

global.mongooseConn = cached;

export async function connectDB() {
  assertServerEnv();

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(env.MONGODB_URI, {
      dbName: "campusmart",
      serverSelectionTimeoutMS: 7000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
