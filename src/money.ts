/**
 * Adds amounts in major currency units.
 * Each amount is rendered to 10 decimal places and rounded to cents from that text.
 */
export function sumAmounts(amounts: readonly number[]): number {
  const cents = amounts.reduce((total, amount) => total + amountToCents(amount), 0);
  return cents / 100;
}

function amountToCents(amount: number): number {
  const negative = amount < 0;
  const text = Math.abs(amount).toFixed(10);
  const [wholeText, fractionText = ""] = text.split(".");
  const fraction = `${fractionText}0000000000`.slice(0, 10);
  const centsPart = Number(fraction.slice(0, 2));
  const tail = Number(fraction.slice(2));
  const carry = tail >= 500_000_000 ? 1 : 0;
  let whole = Number(wholeText);
  let cents = centsPart + carry;
  if (cents >= 100) {
    whole += 1;
    cents -= 100;
  }
  const value = whole * 100 + cents;
  return negative ? -value : value;
}
