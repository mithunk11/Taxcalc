export const major = (value: number) => Math.max(0, Math.round((Number.isFinite(value) ? value : 0) * 100));
export const toMajor = (minor: number) => minor / 100;

export function percent(amount: number, basisPoints: number) {
  return Math.round((amount * basisPoints) / 10000);
}

export function taxBands(amount: number, bands: Array<{ upTo: number; rate: number }>) {
  let remaining = Math.max(0, amount);
  let previous = 0;
  let total = 0;
  for (const band of bands) {
    const width = Math.max(0, band.upTo - previous);
    const slice = Math.min(remaining, width);
    total += percent(slice, band.rate);
    remaining -= slice;
    previous = band.upTo;
    if (remaining <= 0) break;
  }
  if (remaining > 0) total += percent(remaining, bands.at(-1)?.rate ?? 0);
  return total;
}

export function solveGross(targetNet: number, calculate: (gross: number) => number) {
  const target = Math.max(0, Math.round(targetNet));
  if (target === 0) return 0;
  let low = 0;
  let high = Math.max(target * 2, major(10000));
  while (calculate(high) < target && high < major(1_000_000_000)) high *= 2;
  for (let i = 0; i < 90 && high - low > 1; i += 1) {
    const mid = Math.floor((low + high) / 2);
    if (calculate(mid) < target) low = mid + 1;
    else high = mid;
  }
  return high;
}
