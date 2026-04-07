/**
 * Loads distinct restaurant postcodes (zipCode) from MongoDB, looks each up
 * at postcodes.io, and logs [[postcode, lat, lng, address], ...].
 *
 * Usage:
 *   node scripts/restaurant-postcodes-from-db.mjs
 */

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

/** Same pattern as lib/uk-postcode.ts */
const UK_POSTCODE_REGEX = /\b([A-Z]{1,2}\d[A-Z\d]?)\s?(\d[A-Z]{2})\b/i;
const VALID_UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2}$/i;

function normalizeUkPostcode(value) {
  if (!value?.trim()) return null;
  const match = String(value).trim().match(UK_POSTCODE_REGEX);
  if (!match) return null;
  const outward = match[1].toUpperCase();
  const inward = match[2].toUpperCase();
  const normalized = `${outward} ${inward}`;
  return VALID_UK_POSTCODE_REGEX.test(normalized) ? normalized : null;
}

/** Human-readable area line from postcodes.io ONSPD-style payload (no full street address). */
function buildAddressFromResult(r) {
  if (!r || typeof r !== "object") return "";
  const parts = [
    r.thoroughfare || r.dependent_thoroughfare,
    r.dependent_locality,
    r.post_town,
    r.admin_ward,
    r.admin_district,
    r.parish,
    r.admin_county,
    r.region,
    r.country,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : x))
    .filter(Boolean);
  const s = [...new Set(parts)].join(", ");
  return s || String(r.postcode || "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function lookupPostcodeIo(normalized) {
  const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`;
  const res = await fetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (res.status === 404 || data.status === 404) {
    return { ok: false, error: "not found" };
  }
  if (!res.ok || data.status !== 200 || !data.result) {
    return { ok: false, error: data.error || `http ${res.status}` };
  }
  const { latitude, longitude, postcode } = data.result;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return { ok: false, error: "no coordinates" };
  }
  return {
    ok: true,
    lat: latitude,
    lng: longitude,
    apiPostcode: postcode ?? normalized,
    address: buildAddressFromResult(data.result),
  };
}

async function main() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in environment variables");
  }

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const coll = mongoose.connection.db.collection("restaurants");

  const rawList = await coll.distinct("zipCode", {
    zipCode: { $exists: true, $nin: [null, ""] },
  });

  /** normalized -> first raw appearance from DB */
  const byNorm = new Map();
  for (const raw of rawList) {
    if (raw == null || String(raw).trim() === "") continue;
    const normalized = normalizeUkPostcode(String(raw));
    if (!normalized) continue;
    if (!byNorm.has(normalized)) {
      byNorm.set(normalized, String(raw).trim());
    }
  }

  const entries = [...byNorm.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const out = [];
  const DELAY_MS = 75;

  for (const [normalized, postcodeFromDb] of entries) {
    const got = await lookupPostcodeIo(normalized);
    if (!got.ok) {
      console.error(
        `[restaurant-postcodes-from-db] skip ${postcodeFromDb} (${normalized}): ${got.error}`,
      );
      await sleep(DELAY_MS);
      continue;
    }
    out.push([postcodeFromDb, got.lat, got.lng, got.address]);
    await sleep(DELAY_MS);
  }

  console.log(JSON.stringify(out, null, 2));

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
