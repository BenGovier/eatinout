/**
 * For each restaurant in MongoDB, resolves geo from `zipCode` via postcodes.io (same as before),
 * then writes `lat`, `lng`, and GeoJSON `location` (Point, [lng, lat]) to that document.
 *
 * Usage:
 *   node scripts/restaurant-postcodes-from-db.mjs
 *   npm run fill-geo-db
 *
 * Lookups are cached per normalized UK postcode so shared postcodes hit the API once.
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
  const { latitude, longitude } = data.result;
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
  };
}

const DELAY_MS = 75;
/** @type {Map<string, Awaited<ReturnType<typeof lookupPostcodeIo>>>} */
const postcodeCache = new Map();

async function resolveGeoForNormalizedPostcode(normalized) {
  const cached = postcodeCache.get(normalized);
  if (cached) return cached;
  const got = await lookupPostcodeIo(normalized);
  postcodeCache.set(normalized, got);
  await sleep(DELAY_MS);
  return got;
}

/** Same shape as `geoPointFromLatLng` in lib/restaurant-geo.ts — [lng, lat] for 2dsphere. */
function locationPoint(lat, lng) {
  return {
    type: "Point",
    coordinates: [lng, lat],
  };
}

async function main() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in environment variables");
  }

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const coll = mongoose.connection.db.collection("restaurants");

  const cursor = coll
    .find(
      { zipCode: { $exists: true, $nin: [null, ""] } },
      { projection: { name: 1, zipCode: 1 } },
    )
    .sort({ _id: 1 });

  let succeeded = 0;
  let failed = 0;
  /** Distinct `zipCode` values from the DB for any restaurant that did not get geo. */
  const failedPostcodes = new Set();

  for await (const doc of cursor) {
    const id = doc._id?.toHexString?.() ?? String(doc._id);
    const name = typeof doc.name === "string" ? doc.name.trim() : "";
    const rawZip = String(doc.zipCode ?? "").trim();

    const normalized = normalizeUkPostcode(rawZip);
    if (!normalized) {
      failed += 1;
      if (rawZip) failedPostcodes.add(rawZip);
      console.error(
        `FAIL id=${id} name="${name}" zip="${rawZip}" reason=invalid or non-UK postcode`,
      );
      continue;
    }

    const got = await resolveGeoForNormalizedPostcode(normalized);
    if (!got.ok) {
      failed += 1;
      if (rawZip) failedPostcodes.add(rawZip);
      console.error(
        `FAIL id=${id} name="${name}" zip="${rawZip}" (${normalized}) reason=${got.error}`,
      );
      continue;
    }

    const lat = got.lat;
    const lng = got.lng;
    const location = locationPoint(lat, lng);
    const write = await coll.updateOne(
      { _id: doc._id },
      {
        $set: {
          lat,
          lng,
          location,
          updatedAt: new Date(),
        },
      },
    );

    if (write.matchedCount === 0) {
      failed += 1;
      if (rawZip) failedPostcodes.add(rawZip);
      console.error(
        `FAIL id=${id} name="${name}" zip="${rawZip}" (${normalized}) reason=document not found on save`,
      );
      continue;
    }

    succeeded += 1;
  }

  const total = succeeded + failed;
  console.log(
    `Summary: ${succeeded} succeeded, ${failed} failed, ${total} restaurants`,
  );

  if (failedPostcodes.size > 0) {
    const sorted = [...failedPostcodes].sort((a, b) =>
      a.localeCompare(b, "en-GB", { sensitivity: "base" }),
    );
    console.log(`Postcodes with failed geo lookup (${sorted.length} unique):`);
    for (const pc of sorted) {
      console.log(`  ${pc}`);
    }
  }

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
