import { useState } from "react";
import { useKitchenContext } from "../context/KitchenContext";
import { generateRandomOrders } from "../kitchen/randomOrders";
import { simulate } from "../kitchen/simulate";

export default function KitchenSimulator() {
  const { orders, addOrders, clearOrders } = useKitchenContext();
  const [fifoMetrics, setFifoMetrics] = useState(null);

  function onGenerate() {
    addOrders(generateRandomOrders(10));
  }

  function onRunFifo() {
    const result = simulate(orders);
    setFifoMetrics(result.metrics);
  }

  return (
    <div className="p-4">
      <div className="font-bold text-lg">Kitchen Simulator</div>
      <div className="text-sm text-black/60 mb-3">
        Orders in queue: {orders.length}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          className="px-3 py-2 rounded-lg bg-black text-white"
          onClick={onGenerate}
        >
          Generate 10 random
        </button>
        <button
          className="px-3 py-2 rounded-lg bg-black/10"
          onClick={onRunFifo}
          disabled={orders.length === 0}
        >
          Run FIFO
        </button>
        <button
          className="px-3 py-2 rounded-lg bg-black/10"
          onClick={clearOrders}
        >
          Clear
        </button>
      </div>

      {fifoMetrics && (
        <div className="mt-4 p-3 rounded-xl bg-black/5">
          <div>
            <b>FIFO</b>
          </div>
          <div>Avg completion: {fifoMetrics.avgCompletion.toFixed(1)} s</div>
          <div>Makespan: {fifoMetrics.makespan.toFixed(1)} s</div>
        </div>
      )}
    </div>
  );
}
