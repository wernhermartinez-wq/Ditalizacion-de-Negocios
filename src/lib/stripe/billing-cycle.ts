export const BILLING_TIME_ZONE = "Europe/Berlin";

type LocalDate = { year: number; month: number; day: number };

const berlinDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BILLING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function localDate(date: Date): LocalDate {
  const parts = berlinDateFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
}

function berlinMidnightUnix(year: number, month: number, day: number) {
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BILLING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date(utcGuess));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const representedAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  const offset = representedAsUtc - utcGuess;
  return Math.floor((utcGuess - offset) / 1000);
}

export type BillingAnchor = {
  chargeImmediately: boolean;
  unix: number | null;
};

export function getNextBillingAnchor(now = new Date()): BillingAnchor {
  const current = localDate(now);
  if (current.day === 15) return { chargeImmediately: true, unix: null };

  const targetMonth = current.day < 15 ? current.month : current.month + 1;
  const normalized = new Date(Date.UTC(current.year, targetMonth - 1, 15));
  const unix = berlinMidnightUnix(
    normalized.getUTCFullYear(),
    normalized.getUTCMonth() + 1,
    normalized.getUTCDate(),
  );

  return { chargeImmediately: false, unix };
}
