import { createContext, useContext, useState } from "react";
import { expandReceiptToOrder } from "../kitchen/expandReceipt";

const KitchenContext = createContext(null);

export function KitchenProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [counter, setCounter] = useState(1);

  function addOrderFromReceipt(receiptItems) {
    const orderId = `O${counter}`;
    setCounter((c) => c + 1);
    const order = expandReceiptToOrder(orderId, receiptItems);
    setOrders((prev) => [...prev, order]);
    return order;
  }

  function addOrders(newOrders) {
    setOrders((prev) => [...prev, ...newOrders]);
  }

  function clearOrders() {
    setOrders([]);
    setCounter(1);
  }

  const value = {
    orders,
    setOrders,
    addOrderFromReceipt,
    addOrders,
    clearOrders,
  };

  return (
    <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>
  );
}

export function useKitchenContext() {
  const ctx = useContext(KitchenContext);
  if (!ctx)
    throw new Error("useKitchenContext must be used inside KitchenProvider");
  return ctx;
}
