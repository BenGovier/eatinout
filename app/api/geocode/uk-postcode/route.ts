import { NextRequest, NextResponse } from "next/server";
import { normalizeUkPostcode } from "@/lib/uk-postcode";

const GEOCODE_TIMEOUT_MS = 10_000;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("postcode")?.trim() ?? "";
  const normalized = normalizeUkPostcode(raw);

  if (!normalized) {
    return NextResponse.json(
      { success: false, message: "Enter a valid UK postcode" },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const upstream = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`,
      { method: "GET", signal: controller.signal, cache: "no-store" },
    );

    clearTimeout(timeoutId);

    if (upstream.status === 404) {
      return NextResponse.json(
        { success: false, message: "Postcode not found" },
        { status: 404 },
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, message: "Postcode lookup failed" },
        { status: 502 },
      );
    }

    const data = (await upstream.json()) as {
      status?: number;
      result?: {
        postcode: string;
        latitude: number;
        longitude: number;
        admin_district?: string;
        region?: string;
      };
    };

    if (data.status !== 200 || !data.result) {
      return NextResponse.json(
        { success: false, message: "Invalid response from postcode service" },
        { status: 502 },
      );
    }

    const { latitude, longitude, postcode } = data.result;
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return NextResponse.json(
        { success: false, message: "No coordinates for this postcode" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      lat: latitude,
      lng: longitude,
      normalizedPostcode: postcode ?? normalized,
    });
  } catch (e: unknown) {
    clearTimeout(timeoutId);
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        message: aborted ? "Postcode lookup timed out" : "Postcode lookup failed",
      },
      { status: 504 },
    );
  }
}
