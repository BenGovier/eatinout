const LONDON = "Europe/London";

const dayKeyFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((p) => p.type === type)?.value ?? "";
}

// A week ends at Monday 00:00 London (exclusive), which customers read as
// "Sunday 11:59pm". Shift exact-midnight bounds back a minute for display only.
function toDisplayInstant(date: Date): Date {
  const parts = clockFormat.formatToParts(date);
  if (part(parts, "hour") === "00" && part(parts, "minute") === "00") {
    return new Date(date.getTime() - 60_000);
  }
  return date;
}

function londonDayKey(date: Date) {
  const parts = dayKeyFormat.formatToParts(date);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

export interface UseByParts {
  day: string;
  time: string;
  isToday: boolean;
  isPast: boolean;
}

export function getUseByParts(
  expiresAt: string | number | Date,
  now: Date = new Date()
): UseByParts | null {
  const raw = new Date(expiresAt);
  if (Number.isNaN(raw.getTime())) return null;
  const display = toDisplayInstant(raw);
  const dayParts = dayFormat.formatToParts(display);
  return {
    day: `${part(dayParts, "weekday")} ${part(dayParts, "day")} ${part(dayParts, "month")}`,
    time: timeFormat.format(display).replace(/\s+/g, "").toLowerCase(),
    isToday: londonDayKey(display) === londonDayKey(now),
    isPast: raw.getTime() <= now.getTime(),
  };
}

export function formatValidUntil(expiresAt: string | number | Date, now?: Date): string {
  const parts = getUseByParts(expiresAt, now);
  if (!parts) return "";
  return parts.isToday
    ? `today, ${parts.time}`
    : `${parts.day}, ${parts.time}`;
}
