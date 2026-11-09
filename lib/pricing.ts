import { site } from "@/content/site";

export type Days = 1 | 2 | 3 | 4 | 5;
export const DAYS: Days[] = [1, 2, 3, 4, 5];
export const DISCOUNT: Record<Days, number> = { 1: 0, 2: 0, 3: 0, 4: 0.05, 5: 0.1 };

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/** Weekly price per child, rounded to the nearest 5 pounds. Pass discounted = false for the founding rate, which never takes multi-day discounts. */
export function weekly(rate: number, days: Days, discounted = true, minutes = site.sessionMinutes): number {
  return roundTo5(rate * (minutes / 60) * days * (1 - (discounted ? DISCOUNT[days] : 0)));
}

/** Monthly = weekly x 52 / 12. */
export const monthly = (weeklyPrice: number): number => Math.round((weeklyPrice * 52) / 12);
