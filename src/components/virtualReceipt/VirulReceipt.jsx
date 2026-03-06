import { useKitchenContext } from "../../context/KitchenContext";
import { useVirtualReceiptContext } from "../../context/virtualReceiptContext";
import { formatEur } from "../../helpers/priceConverter";

export default function VirtualReceipt() {
  const {
    receiptItems,
    addToVirtualReceipt,
    decrementFromVirtualReceipt,
    removeFromVirtualReceipt,
    clearReceipt,
  } = useVirtualReceiptContext();

  const { addOrderFromReceipt } = useKitchenContext();

  const total = receiptItems.reduce((sum, x) => sum + x.priceCents * x.qty, 0);

  function handleSendToKitchen() {
    if (receiptItems.length === 0) return;
    addOrderFromReceipt(receiptItems);
    clearReceipt?.();
  }

  return (
    <div className="h-full w-full p-4 flex flex-col">
      <div className="font-bold text-lg mb-3">Receipt</div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
        {receiptItems.length === 0 ? (
          <div className="text-sm text-black/60">No items yet</div>
        ) : (
          receiptItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-black/10 pb-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {item.name}
                </div>
                <div className="text-xs text-black/60">
                  {formatEur(item.priceCents)} × {item.qty} ={" "}
                  {formatEur(item.priceCents * item.qty)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="h-9 w-9 rounded-lg bg-black/5 hover:bg-black/10 text-lg"
                  onClick={() => decrementFromVirtualReceipt(item.id)}
                  aria-label={`Decrease ${item.name}`}
                >
                  −
                </button>
                <button
                  className="h-9 w-9 rounded-lg bg-black/5 hover:bg-black/10 text-lg"
                  onClick={() => addToVirtualReceipt(item)}
                  aria-label={`Increase ${item.name}`}
                >
                  +
                </button>
                <button
                  className="text-xs px-2 py-1 rounded-md bg-black/5 hover:bg-black/10"
                  onClick={() => removeFromVirtualReceipt(item.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center justify-between font-bold">
        <span>Total</span>
        <span>{formatEur(total)}</span>
      </div>

      <button
        className="mt-4 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition w-full font-bold disabled:opacity-50"
        onClick={handleSendToKitchen}
        disabled={receiptItems.length === 0}
      >
        SEND TO KITCHEN
      </button>
    </div>
  );
}
