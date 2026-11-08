export type Days = 1 | 2 | 3 | 4 | 5;
export const DAYS: Days[] = [1, 2, 3, 4, 5];
export const DISCOUNT: Record<Days, number> = { 1: 0, 2: 0, 3: 0.05, 4: 0.1, 5: 0.15 };

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/** Weekly price per child, rounded to the nearest 5 pounds. */
export function weekly(rate: number, days: Days, minutes = 105): number {
  return roundTo5(rate * (minutes / 60) * days * (1 - DISCOUNT[days]));
}

/** Monthly = weekly x 52 / 12. */
export const monthly = (weeklyPrice: number): number => Math.round((weeklyPrice * 52) / 12);
