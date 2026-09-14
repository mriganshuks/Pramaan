import fs from "node:fs";
import mongoose from "mongoose";

const raw = fs.readFileSync(".env.local", "utf8");
const line = raw.split(/\r?\n/).find((item) => item.startsWith("MONGODB_URI="));
const uri = line?.split("=").slice(1).join("=").replace(/^"|"$/g, "");

try {
  await mongoose.connect(uri);
  console.log("OK default", mongoose.connection.readyState);
  await mongoose.disconnect();
} catch (error) {
  console.error("FAIL default", error.name, error.message);
  process.exit(1);
}
