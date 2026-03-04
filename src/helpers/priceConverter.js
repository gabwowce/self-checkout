export function formatEur(priceCents) {
  return `€${(priceCents / 100).toFixed(2)}`;
}
