/** Adds amounts in major currency units, such as dollars. */
export function sumAmounts(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
