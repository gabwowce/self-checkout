import { useMemo, useState } from "react";
import { useKitchenContext } from "../context/KitchenContext";
import { runAdvancedGA } from "../kitchen/advancedAI";
import { runGA } from "../kitchen/ga";
import KitchenTimeline from "../kitchen/KitchenTimeline";
import { generateRandomOrders } from "../kitchen/randomOrders";
import { simulate } from "../kitchen/simulate";

// ---------------------
// helpers for rendering items nicely
// ---------------------
function getItemLabel(it) {
  console.log("getItemLabel", { it }); // DEBUG
  return (
    it?.name ??
    it?.title ??
    it?.label ??
    it?.productName ??
    it?.sku ??
    it?.productId ??
    "Item"
  );
}

function getItemQty(it) {
  const q =
    it?.qty ?? it?.quantity ?? it?.count ?? it?.amount ?? it?.units ?? 1;
  const n = Number(q);
  return Number.isFinite(n) ? n : 1;
}

function getMaybeStations(it) {
  // supports: station, stations[], ops[], steps[]
  if (it?.station) return [String(it.station)];
  if (Array.isArray(it?.stations)) return it.stations.map(String);
  if (Array.isArray(it?.ops)) {
    return it.ops
      .map((op) => op?.station ?? op?.resource ?? op?.type)
      .filter(Boolean)
      .map(String);
  }
  if (Array.isArray(it?.steps)) {
    return it.steps
      .map((s) => s?.station ?? s?.resource ?? s?.type)
      .filter(Boolean)
      .map(String);
  }
  return [];
}

function getMaybeDurations(it) {
  // supports: durationSec, timeSec, prepSec, ops[].dur
  const d =
    it?.durationSec ??
    it?.timeSec ??
    it?.prepSec ??
    it?.seconds ??
    it?.sec ??
    null;

  const out = [];
  if (d != null && Number.isFinite(Number(d))) out.push(Number(d));

  const fromOps = (arr) =>
    arr
      .map((x) => x?.durationSec ?? x?.durSec ?? x?.sec ?? x?.seconds)
      .filter((v) => v != null && Number.isFinite(Number(v)))
      .map(Number);

  if (Array.isArray(it?.ops)) out.push(...fromOps(it.ops));
  if (Array.isArray(it?.steps)) out.push(...fromOps(it.steps));

  return out;
}

export default function KitchenPanel() {
  const { orders, addOrders, clearOrders } = useKitchenContext();

  const [fifoRes, setFifoRes] = useState(null);
  const [gaRes, setGaRes] = useState(null);
  const [gaInfo, setGaInfo] = useState(null);

  const [advRes, setAdvRes] = useState(null);
  const [advInfo, setAdvInfo] = useState(null);

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

  function resetResults() {
    setFifoRes(null);
    setGaRes(null);
    setGaInfo(null);
    setAdvRes(null);
    setAdvInfo(null);
  }

  function handleGenerate() {
    addOrders(generateRandomOrders(10));
    resetResults();
  }

  function handleRunFifo() {
    const res = simulate(orders, { config: baseConfig });
    setFifoRes(res);
  }

  function handleRunGA() {
    const params = {
      populationSize: 40,
      generations: 60,
      eliteCount: 8,
      mutationRate: 0.25,
      objective: "avg",
      seed: 123,
    };

    const { bestSequence } = runGA(orders, params, { config: baseConfig });
    const sim = simulate(bestSequence, { config: baseConfig });

    setGaRes(sim);
    setGaInfo(params);
  }

  function handleRunAdvanced() {
    const params = {
      populationSize: 50,
      generations: 80,
      eliteCount: 10,
      mutationRate: 0.3,
      objective: "avg",
      seed: 123,
    };

    const simOptions = {
      config: baseConfig,
      weights: {
        wShort: 1.0,
        wFinishOrder: 1.3,
        wCritical: 0.9,
      },
    };

    const { bestSim, info } = runAdvancedGA(orders, params, simOptions);

    setAdvRes(bestSim);
    setAdvInfo(info);
  }

  function handleClear() {
    clearOrders();
    resetResults();
  }

  const hasOrders = orders.length > 0;

  function calcImprovement(base, other) {
    if (!base || !other) return null;
    return {
      avg:
        ((base.metrics.avgCompletion - other.metrics.avgCompletion) /
          base.metrics.avgCompletion) *
        100,
      makespan:
        ((base.metrics.makespan - other.metrics.makespan) /
          base.metrics.makespan) *
        100,
    };
  }

  const gaImprovement = calcImprovement(fifoRes, gaRes);
  const advImprovement = calcImprovement(fifoRes, advRes);

  return (
    <div className="p-6 h-full w-full overflow-auto">
      <div className="font-bold text-xl mb-2">Kitchen</div>

      <div className="text-sm text-black/60 mb-2">Orders: {orders.length}</div>
      <div className="text-xs text-black/50 mb-4">
        Base config: cooks {baseConfig.cooks}, grills {baseConfig.grills},
        fryers {baseConfig.fryers}, drinks {baseConfig.drinks}, icecreams{" "}
        {baseConfig.icecreams}, packs {baseConfig.packs}
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        <button
          className="px-4 py-2 rounded-lg bg-black text-white"
          onClick={handleGenerate}
        >
          Generate 10 random
        </button>

        <button
          className="px-4 py-2 rounded-lg bg-black/10 disabled:opacity-50"
          disabled={!hasOrders}
          onClick={handleRunFifo}
        >
          Run FIFO
        </button>

        <button
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
          disabled={!hasOrders}
          onClick={handleRunGA}
        >
          Run AI (GA)
        </button>

        <button
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
          disabled={!hasOrders}
          onClick={handleRunAdvanced}
        >
          Run Advanced AI (Dispatch)
        </button>

        <button
          className="px-4 py-2 rounded-lg bg-black/10"
          onClick={handleClear}
        >
          Clear
        </button>
      </div>

      {/* METRICS */}
      {(fifoRes || gaRes || advRes) && (
        <div className="grid gap-2 mb-8">
          {fifoRes && (
            <div className="p-4 rounded-xl bg-black/5">
              <div className="font-bold">FIFO metrics</div>
              <div>
                Avg completion: {fifoRes.metrics.avgCompletion.toFixed(1)} s
              </div>
              <div>Makespan: {fifoRes.metrics.makespan.toFixed(1)} s</div>
            </div>
          )}

          {gaRes && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="font-bold">AI metrics (Genetic Algorithm)</div>
              <div>
                Avg completion: {gaRes.metrics.avgCompletion.toFixed(1)} s
              </div>
              <div>Makespan: {gaRes.metrics.makespan.toFixed(1)} s</div>

              {gaImprovement && (
                <div className="mt-2 text-sm">
                  <div>
                    Avg improvement: <b>{gaImprovement.avg.toFixed(1)}%</b>
                  </div>
                  <div>
                    Makespan improvement:{" "}
                    <b>{gaImprovement.makespan.toFixed(1)}%</b>
                  </div>
                </div>
              )}

              {gaInfo && (
                <div className="mt-2 text-xs text-black/60">
                  GA params: pop={gaInfo.populationSize}, gen=
                  {gaInfo.generations}, elite={gaInfo.eliteCount}, mut=
                  {gaInfo.mutationRate}, seed={gaInfo.seed}
                </div>
              )}
            </div>
          )}

          {advRes && (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="font-bold">
                Advanced AI metrics (GA + Dispatch)
              </div>
              <div>
                Avg completion: {advRes.metrics.avgCompletion.toFixed(1)} s
              </div>
              <div>Makespan: {advRes.metrics.makespan.toFixed(1)} s</div>

              {advImprovement && (
                <div className="mt-2 text-sm">
                  <div>
                    Avg improvement: <b>{advImprovement.avg.toFixed(1)}%</b>
                  </div>
                  <div>
                    Makespan improvement:{" "}
                    <b>{advImprovement.makespan.toFixed(1)}%</b>
                  </div>
                </div>
              )}

              {advInfo && (
                <div className="mt-2 text-xs text-black/60">
                  Advanced params: pop={advInfo.populationSize}, gen=
                  {advInfo.generations}, elite={advInfo.eliteCount}, mut=
                  {advInfo.mutationRate}, seed={advInfo.seed}
                </div>
              )}
              {advInfo?.bestWeights && (
                <div className="mt-2 text-xs text-black/60">
                  Best weights:{" "}
                  {Object.entries(advInfo.bestWeights)
                    .map(([k, v]) => `${k}=${v.toFixed(2)}`)
                    .join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TIMELINES */}
      {(fifoRes || gaRes || advRes) && (
        <div className="space-y-10">
          {fifoRes && (
            <KitchenTimeline
              title="FIFO timeline"
              timeline={fifoRes.timeline}
              makespan={fifoRes.metrics.makespan}
              height={300}
            />
          )}

          {gaRes && (
            <KitchenTimeline
              title="GA timeline (order sequencing)"
              timeline={gaRes.timeline}
              makespan={gaRes.metrics.makespan}
              height={300}
            />
          )}

          {advRes && (
            <KitchenTimeline
              title="Advanced timeline (dispatch)"
              timeline={advRes.timeline}
              makespan={advRes.metrics.makespan}
              height={300}
            />
          )}
        </div>
      )}

      {/* Orders list */}
      <div className="mt-10">
        <div className="font-bold mb-2">Orders</div>

        {orders.length === 0 ? (
          <div className="text-sm text-black/60">No orders yet.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.orderId} className="p-3 rounded-xl bg-black/5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{o.orderId}</div>
                  <div className="text-xs text-black/60">
                    Items: {o.items?.length ?? 0}
                  </div>
                </div>

                {/* items details */}
                {!o.items || o.items.length === 0 ? (
                  <div className="text-sm text-black/60 mt-2">
                    No items in this order.
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {o.items.map((it, idx) => {
                      const label = getItemLabel(it);
                      const qty = getItemQty(it);
                      const stations = getMaybeStations(it);
                      const durs = getMaybeDurations(it);

                      return (
                        <div
                          key={`${o.orderId}-${idx}`}
                          className="p-2 rounded-lg bg-white border border-black/10"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium truncate">
                              {label}
                            </div>
                            <div className="text-sm text-black/70">× {qty}</div>
                          </div>

                          {(stations.length > 0 || durs.length > 0) && (
                            <div className="mt-1 text-xs text-black/60 flex flex-wrap gap-x-3 gap-y-1">
                              {stations.length > 0 && (
                                <span>
                                  Stations:{" "}
                                  <b>
                                    {Array.from(new Set(stations)).join(", ")}
                                  </b>
                                </span>
                              )}
                              {durs.length > 0 && (
                                <span>
                                  Durations:{" "}
                                  <b>{durs.map((s) => `${s}s`).join(", ")}</b>
                                </span>
                              )}
                            </div>
                          )}

                          {/* raw dump fallback (optional) */}
                          {/* <pre className="mt-2 text-[10px] text-black/50 overflow-auto">
                            {JSON.stringify(it, null, 2)}
                          </pre> */}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
