/**
 * Exports all restaurant documents from MongoDB to a JSON file.
 *
 * Usage:
 *   node scripts/export-restaurants-to-json.mjs
 *   node scripts/export-restaurants-to-json.mjs ./exports/restaurants.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_OUT = path.join(process.cwd(), "restaurants-export.json");

function jsonReplacer(_key, value) {
  if (value != null && typeof value.toHexString === "function") {
    return value.toHexString();
  }
  return value;
}

async function main() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in environment variables");
  }

  const outFile = path.resolve(process.argv[2] || DEFAULT_OUT);

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const coll = mongoose.connection.db.collection("restaurants");
  const docs = await coll.find({}).sort({ _id: 1 }).toArray();

  const json = JSON.stringify(docs, jsonReplacer, 2);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, `${json}\n`, "utf8");

  console.log(
    `[export-restaurants-to-json] Wrote ${docs.length} restaurants → ${outFile}`,
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("[export-restaurants-to-json]", err);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
