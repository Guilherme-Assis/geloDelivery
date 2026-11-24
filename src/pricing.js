export function hasPrice(flavor) {
  return Number.isInteger(flavor?.priceCents) && flavor.priceCents >= 0;
}

export function isOnOffer(flavor) {
  return hasPrice(flavor) && flavor.originalPriceCents > flavor.priceCents;
}

export function priceCart(items, flavorsById) {
  if (!items?.length) return null;
  let subtotal = 0n;
  let total = 0n;
  const lines = [];

  for (const item of items) {
    const flavor = flavorsById.get(item.id);
    if (!hasPrice(flavor) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 2147483647) {
      return null;
    }
    const lineTotal = BigInt(flavor.priceCents) * BigInt(item.quantity);
    subtotal += BigInt(flavor.originalPriceCents) * BigInt(item.quantity);
    total += lineTotal;
    lines.push({ ...item, name: flavor.name, unitPriceCents: flavor.priceCents, lineTotal });
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return { lines, subtotal, total, discount: subtotal - total };
}
