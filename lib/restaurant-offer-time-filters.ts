/** Shared between `/api/restaurants/all` and map client-side filtering. */

export function parseMealTimeRange(
  mealTimeStr: string,
): { start: number; end: number } | null {
  const lowerStr = mealTimeStr.toLowerCase();

  if (lowerStr.includes("morning") || lowerStr.includes("7am-12pm")) {
    return { start: 7, end: 12 };
  }
  if (lowerStr.includes("afternoon") || lowerStr.includes("12pm-5pm")) {
    return { start: 12, end: 17 };
  }
  if (lowerStr.includes("evening") || lowerStr.includes("5pm-late")) {
    return { start: 17, end: 24 };
  }

  return null;
}

export function parseValidHours(
  validHours: string,
): { start: number; end: number } | null {
  try {
    const parts = validHours.split("-").map((p) => p.trim());
    if (parts.length !== 2) return null;

    const startHour = parseInt(parts[0].split(":")[0], 10);
    const endHour = parseInt(parts[1].split(":")[0], 10);

    if (isNaN(startHour) || isNaN(endHour)) return null;

    if (endHour < startHour) {
      return { start: startHour, end: endHour + 24 };
    }

    return { start: startHour, end: endHour };
  } catch {
    return null;
  }
}

export function timeRangesOverlap(
  range1: { start: number; end: number },
  range2: { start: number; end: number },
): boolean {
  return range1.start < range2.end && range2.start < range1.end;
}
