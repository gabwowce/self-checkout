import { ITEM_OPS_BY_ID } from "./productOps";

/**
 * receiptItem: { id, name, qty, type, priceCents, ... }
 * returns KitchenOrder:
 * {
 *   orderId, createdAtMs,
 *   items: [{ unitId, productId, station, machineTime, humanTime }],
 *   sauceCount
 * }
 */
export function expandReceiptToOrder(
  orderId,
  receiptItems,
  createdAtMs = Date.now(),
) {
  const expandedIds = [];
  let sauceCount = 0;

  for (const r of receiptItems) {
    const ops = ITEM_OPS_BY_ID[r.id];
    if (!ops) throw new Error(`Missing ITEM_OPS_BY_ID mapping for: ${r.id}`);

    if (ops.combo) {
      for (let k = 0; k < r.qty; k++) expandedIds.push(...ops.combo);
      continue;
    }

    if (ops.station === "none") {
      sauceCount += r.qty;
      continue;
    }

    for (let k = 0; k < r.qty; k++) expandedIds.push(r.id);
  }

  const items = expandedIds.map((productId, idx) => {
    const ops = ITEM_OPS_BY_ID[productId];
    if (!ops || ops.combo) throw new Error(`Invalid ops for: ${productId}`);

    return {
      unitId: `${productId}#${idx + 1}`,
      productId,
      station: ops.station, // grill | fryer | drinks | icecream
      machineTime: ops.machineTime,
      humanTime: ops.humanTime,
    };
  });

  return { orderId, createdAtMs, items, sauceCount };
}
