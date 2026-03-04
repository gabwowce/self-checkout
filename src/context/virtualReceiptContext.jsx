import { createContext, useContext, useState } from "react";

const VirtualReceiptContext = createContext();

export const VirtualReceiptProvider = ({ children }) => {
  const [receiptItems, setReceiptItems] = useState([]);
  console.log("VirtualReceiptContext: receiptItems", receiptItems);

  function addToVirtualReceipt(product) {
    setReceiptItems((prev) => {
      const existing = prev.find((x) => x.id === product.id);
      if (!existing) return [...prev, { ...product, qty: 1 }];
      return prev.map((x) =>
        x.id === product.id ? { ...x, qty: x.qty + 1 } : x,
      );
    });
  }

  function decrementFromVirtualReceipt(productId) {
    setReceiptItems((prev) => {
      const existing = prev.find((x) => x.id === productId);
      if (!existing) return prev;

      if (existing.qty <= 1) return prev.filter((x) => x.id !== productId);

      return prev.map((x) =>
        x.id === productId ? { ...x, qty: x.qty - 1 } : x,
      );
    });
  }

  function removeFromVirtualReceipt(productId) {
    setReceiptItems((prev) => prev.filter((x) => x.id !== productId));
  }

  function clearReceipt() {
    setReceiptItems([]);
  }

  return (
    <VirtualReceiptContext.Provider
      value={{
        receiptItems,
        addToVirtualReceipt,
        removeFromVirtualReceipt,
        decrementFromVirtualReceipt,
        clearReceipt,
      }}
    >
      {children}
    </VirtualReceiptContext.Provider>
  );
};

export const useVirtualReceiptContext = () => {
  const context = useContext(VirtualReceiptContext);

  if (!context) {
    throw new Error(
      "useVirtualReceiptContext must be used inside VirtualReceiptProvider",
    );
  }

  return context;
};
