/**
 * Adds amounts in major currency units, such as dollars.
 * Each value is rounded to integer cents before it is added, so two-decimal
 * totals such as 0.1 + 0.2 stay exact.
 */
export function sumAmounts(amounts: readonly number[]): number {
  const cents = amounts.reduce((total, amount) => total + Math.round(amount * 100), 0);
  return cents / 100;
}
