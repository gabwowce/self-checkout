import { expandReceiptToOrder } from "./expandReceipt";

// pasirink ID iš tavo produkto sąrašo
const PRODUCT_POOL = [
  "b-cheese",
  "b-double-cheese",
  "b-chicken",
  "b-bacon",
  "b-veggie",
  "f-small",
  "f-medium",
  "f-large",
  "d-cola-s",
  "d-cola-m",
  "d-cola-l",
  "d-water",
  "d-juice",
  "n-6",
  "n-9",
  "onion-rings",
  "dess-icecream",
  "dess-applepie",
  "dess-shake",
  "c-cheese-set",
  "c-double-set",
  "c-chicken-set",
  "s-ketchup",
  "s-garlic",
  "s-bbq",
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(arr) {
  return arr[randInt(0, arr.length - 1)];
}

export function generateRandomOrders(count = 10) {
  const orders = [];

  for (let i = 0; i < count; i++) {
    const itemsCount = randInt(1, 5); // kiek skirtingų produktų orderyje
    const receiptItems = [];

    for (let j = 0; j < itemsCount; j++) {
      const id = pickOne(PRODUCT_POOL);
      const qty = randInt(1, 2); // qty 1-2
      receiptItems.push({ id, name: id, qty, type: "X" });
    }

    const orderId = `R${i + 1}`;
    orders.push(expandReceiptToOrder(orderId, receiptItems));
  }

  return orders;
}
