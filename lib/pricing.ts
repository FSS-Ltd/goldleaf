export type Days = 1 | 2 | 3 | 4 | 5;
export const DAYS: Days[] = [1, 2, 3, 4, 5];
export const DISCOUNT: Record<Days, number> = { 1: 0, 2: 0, 3: 0, 4: 0.05, 5: 0.1 };

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/** Standard weekly prices are rounded to £5; founding prices have no discount or rounding. */
export function weekly(sessionFee: number, days: Days, discounted = true): number {
  const price = sessionFee * days * (1 - (discounted ? DISCOUNT[days] : 0));
  return discounted ? roundTo5(price) : price;
}

/** Monthly = weekly x 52 / 12. */
export const monthly = (weeklyPrice: number): number => Math.round((weeklyPrice * 52) / 12);
