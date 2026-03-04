import { useMemo, useState } from "react";
import { useKitchenContext } from "../context/kitchenContext";
import { suggestResources } from "./capacityPlanner";
import { runGA } from "./ga";
import { generateRandomOrders } from "./randomOrders";
import { simulate } from "./simulate";

export default function KitchenPanel() {
  const { orders, addOrders, clearOrders } = useKitchenContext();

  const [fifo, setFifo] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiInfo, setAiInfo] = useState(null);

  const [targetPct, setTargetPct] = useState(50);
  const [suggestion, setSuggestion] = useState(null);

  // jei vėliau norėsi "Apply suggested config", čia laikysim aktyvią konfigūraciją
  const baseConfig = useMemo(
    () => ({
      grills: 1,
      fryers: 2,
      drinks: 1,
      icecreams: 1,
      packs: 1,
      cooks: 1,
    }),
    [],
  );

  const hasOrders = orders.length > 0;

  function resetResults() {
    setFifo(null);
    setAi(null);
    setAiInfo(null);
    setSuggestion(null);
  }

  function handleGenerate() {
    addOrders(generateRandomOrders(10));
    resetResults();
  }

  function handleRunFifo() {
    const res = simulate(orders, { config: baseConfig });
    setFifo(res.metrics);
  }

  function handleRunAI() {
    const gaParams = {
      populationSize: 40,
      generations: 60,
      eliteCount: 8,
      mutationRate: 0.25,
      objective: "avg",
      seed: 123,
    };

    const simOptions = { config: baseConfig };

    const { bestMetrics } = runGA(orders, gaParams, simOptions);

    setAi(bestMetrics);
    setAiInfo({
      populationSize: gaParams.populationSize,
      generations: gaParams.generations,
      eliteCount: gaParams.eliteCount,
      mutationRate: gaParams.mutationRate,
      objective: gaParams.objective,
      seed: gaParams.seed,
    });
  }

  function handleSuggest() {
    console.log(
      "SUGGEST input orderIds:",
      orders.map((o) => o.orderId),
    );
    const result = suggestResources(orders, Number(targetPct), {
      baseConfig,
      ranges: {
        grills: [1, 2],
        fryers: [2, 4],
        drinks: [1, 2],
        icecreams: [1, 2],
        packs: [1, 3],
        cooks: [1, 4],
      },
      ga: {
        populationSize: 40,
        generations: 60,
        eliteCount: 8,
        mutationRate: 0.25,
        objective: "avg",
        seed: 123,
      },
    });

    setSuggestion(result);
  }

  function handleClear() {
    clearOrders();
    resetResults();
  }

  const improvement =
    fifo && ai
      ? {
          avg:
            ((fifo.avgCompletion - ai.avgCompletion) / fifo.avgCompletion) *
            100,
          makespan: ((fifo.makespan - ai.makespan) / fifo.makespan) * 100,
        }
      : null;

  return (
    <div className="p-4 border-l border-black/10 h-full flex flex-col">
      {/* Header */}
      <div className="mb-3">
        <div className="font-bold text-lg">Kitchen</div>
        <div className="text-sm text-black/60">Orders: {orders.length}</div>
        <div className="text-xs text-black/50 mt-1">
          Base config: cooks {baseConfig.cooks}, grills {baseConfig.grills},
          fryers {baseConfig.fryers}, packs {baseConfig.packs}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-2 mb-3">
        {/* Row 1 */}
        <div className="flex gap-2 flex-wrap">
          <button
            className="px-3 py-2 rounded-lg bg-black text-white"
            onClick={handleGenerate}
          >
            Generate 10 random
          </button>

          <button
            className="px-3 py-2 rounded-lg bg-black/10 disabled:opacity-50"
            disabled={!hasOrders}
            onClick={handleRunFifo}
          >
            Run FIFO
          </button>

          <button
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
            disabled={!hasOrders}
            onClick={handleRunAI}
          >
            Run AI (GA)
          </button>

          <button
            className="px-3 py-2 rounded-lg bg-black/10"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>

        {/* Row 2 */}
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-sm text-black/60">Target improvement %</span>

          <input
            type="number"
            min="1"
            max="80"
            value={targetPct}
            onChange={(e) => setTargetPct(e.target.value)}
            className="w-24 px-2 py-2 rounded-lg border border-black/20 text-sm"
          />

          <button
            className="px-3 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
            disabled={!hasOrders}
            onClick={handleSuggest}
          >
            Suggest resources
          </button>

          <span className="text-xs text-black/50">
            (Find cheapest config reaching target)
          </span>
        </div>
      </div>

      {/* Results (scrollable area) */}
      <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-2">
        {/* FIFO */}
        {fifo && (
          <div className="p-3 rounded-xl bg-black/5">
            <div className="font-bold">FIFO metrics</div>
            <div>Avg completion: {fifo.avgCompletion.toFixed(1)} s</div>
            <div>Makespan: {fifo.makespan.toFixed(1)} s</div>
          </div>
        )}

        {/* GA */}
        {ai && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="font-bold">AI metrics (Genetic Algorithm)</div>
            <div>Avg completion: {ai.avgCompletion.toFixed(1)} s</div>
            <div>Makespan: {ai.makespan.toFixed(1)} s</div>

            {improvement && (
              <div className="mt-2 text-sm">
                <div>
                  Avg improvement: <b>{improvement.avg.toFixed(1)}%</b>
                </div>
                <div>
                  Makespan improvement:{" "}
                  <b>{improvement.makespan.toFixed(1)}%</b>
                </div>
              </div>
            )}

            {aiInfo && (
              <div className="mt-2 text-xs text-black/60">
                GA params: pop={aiInfo.populationSize}, gen={aiInfo.generations}
                , elite={aiInfo.eliteCount}, mut={aiInfo.mutationRate}, seed=
                {aiInfo.seed}
              </div>
            )}
          </div>
        )}

        {/* Suggestion */}
        {suggestion && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
            <div className="font-bold">
              AI Recommendation (Capacity Planning)
            </div>

            <div className="text-sm text-black/70 mt-1">
              Tried configs: {suggestion.tried}. {suggestion.note}
            </div>

            {suggestion.baseline && (
              <div className="mt-2 text-sm">
                <div>
                  Baseline FIFO avg:{" "}
                  <b>
                    {suggestion.baseline.fifoMetrics.avgCompletion.toFixed(1)} s
                  </b>
                </div>
                <div>
                  Target avg (−{Number(targetPct)}%):{" "}
                  <b>
                    {(
                      suggestion.baseline.fifoMetrics.avgCompletion *
                      (1 - Number(targetPct) / 100)
                    ).toFixed(1)}{" "}
                    s
                  </b>
                </div>
              </div>
            )}

            {suggestion.best ? (
              <div className="mt-3 text-sm">
                <div className="font-semibold">Suggested config</div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-1">
                  <div>
                    cooks: <b>{suggestion.best.config.cooks}</b>
                  </div>
                  <div>
                    packs: <b>{suggestion.best.config.packs}</b>
                  </div>
                  <div>
                    grills: <b>{suggestion.best.config.grills}</b>
                  </div>
                  <div>
                    fryers: <b>{suggestion.best.config.fryers}</b>
                  </div>
                  <div>
                    drinks: <b>{suggestion.best.config.drinks}</b>
                  </div>
                  <div>
                    icecreams: <b>{suggestion.best.config.icecreams}</b>
                  </div>
                </div>

                <div className="mt-2">
                  Predicted AI avg:{" "}
                  <b>{suggestion.best.aiMetrics.avgCompletion.toFixed(1)} s</b>{" "}
                  ({suggestion.best.improvementPct.toFixed(1)}% improvement)
                </div>

                <div>
                  Predicted makespan:{" "}
                  <b>{suggestion.best.aiMetrics.makespan.toFixed(1)} s</b>
                </div>

                <div className="text-xs text-black/60 mt-1">
                  Estimated cost score: {suggestion.best.cost}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-black/70">
                No config reached target in current ranges. Increase cooks/packs
                ranges or lower target.
              </div>
            )}
          </div>
        )}

        {/* Orders list */}
        <div className="pt-2">
          <div className="font-bold text-sm mb-2">Orders</div>
          <div className="space-y-2">
            {orders.map((o) => (
              <div
                key={o.orderId}
                className="p-2 rounded-lg bg-black/5 text-sm"
              >
                <div className="font-semibold">{o.orderId}</div>
                <div className="text-black/60">Items: {o.items.length}</div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="text-sm text-black/60">No orders yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
