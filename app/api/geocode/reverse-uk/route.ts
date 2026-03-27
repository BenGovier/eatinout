import { NextRequest, NextResponse } from "next/server";

/** Nominatim requires a valid User-Agent identifying the app (see https://operations.osmfoundation.org/policies/nominatim/). */
const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  "EatinOut/1.0 (https://eatinout.com; contact: hello@eatinout.com)";

const NOMINATIM_TIMEOUT_MS = 12_000;

export async function GET(req: NextRequest) {
  const latRaw = req.nextUrl.searchParams.get("lat");
  const lngRaw = req.nextUrl.searchParams.get("lng");
  const lat = latRaw != null ? Number.parseFloat(latRaw) : NaN;
  const lng = lngRaw != null ? Number.parseFloat(lngRaw) : NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { success: false, message: "Invalid lat/lng" },
      { status: 400 },
    );
  }

  let postcodeFromPc: string | null = null;
  try {
    const pcRes = await fetch(
      `https://api.postcodes.io/postcodes/lonlat/${encodeURIComponent(String(lng))},${encodeURIComponent(String(lat))}`,
      { method: "GET", cache: "no-store" },
    );
    if (pcRes.ok) {
      const pcJson = (await pcRes.json()) as {
        status?: number;
        result?: { postcode?: string };
      };
      if (pcJson.status === 200 && pcJson.result?.postcode) {
        postcodeFromPc = pcJson.result.postcode;
      }
    }
  } catch {
    // nearest UK postcode unavailable; may still get postcode from Nominatim
  }

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const nomUrl = new URL("https://nominatim.openstreetmap.org/reverse");
    nomUrl.searchParams.set("lat", String(lat));
    nomUrl.searchParams.set("lon", String(lng));
    nomUrl.searchParams.set("format", "json");
    nomUrl.searchParams.set("addressdetails", "1");
    nomUrl.searchParams.set("zoom", "18");

    const nomRes = await fetch(nomUrl.toString(), {
      headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" },
      signal: ac.signal,
      cache: "no-store",
    });

    clearTimeout(to);

    if (!nomRes.ok) {
      return NextResponse.json(
        { success: false, message: "Address lookup failed" },
        { status: 502 },
      );
    }

    const nom = (await nomRes.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = nom.address || {};

    const housePart = [a.house_number, a.house].filter(Boolean).join(" ").trim();
    const road = a.road || a.pedestrian || a.street || a.footway || "";
    let addressLine = [housePart, road].filter(Boolean).join(" ").trim();
    if (!addressLine && nom.display_name) {
      addressLine = nom.display_name.split(",").slice(0, 2).join(",").trim();
    }

    const city =
      a.city ||
      a.town ||
      a.village ||
      a.suburb ||
      a.city_district ||
      a.hamlet ||
      "";
    const state = a.state || a.county || a.region || "";
    const postcodeFromNom = a.postcode?.trim() || null;
    const postcode = postcodeFromPc || postcodeFromNom;

    if (!postcode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Could not find a UK postcode for this point. Try another location.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      lat,
      lng,
      postcode,
      address: addressLine || null,
      city: city || null,
      state: state || null,
    });
  } catch (e: unknown) {
    clearTimeout(to);
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        message: aborted ? "Address lookup timed out" : "Address lookup failed",
      },
      { status: 504 },
    );
  }
}
