import { runGA } from "./ga";
import { simulate } from "./simulate";

const DEFAULT_COST = {
  cooks: 10,
  grills: 6,
  fryers: 5,
  packs: 3,
  drinks: 2,
  icecreams: 2,
};

// helper
function clampInt(x, min, max) {
  const n = Number.parseInt(x, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function calcCost(cfg, cost) {
  return (
    cfg.cooks * cost.cooks +
    cfg.grills * cost.grills +
    cfg.fryers * cost.fryers +
    cfg.packs * cost.packs +
    cfg.drinks * cost.drinks +
    cfg.icecreams * cost.icecreams
  );
}

/**
 * Randa rekomenduojamą virtuvės konfigūraciją, kad pasiektų target improvement.
 *
 * targetImprovementPct: pvz 50 => norim -50% avgCompletion lyginant su FIFO baseline
 *
 * returns:
 * {
 *   baseline: { fifoMetrics, config }
 *   best: { config, aiMetrics, aiSequence, cost, improvementPct }
 *   tried: number
 *   note: string
 * }
 */
export function suggestResources(
  orders,
  targetImprovementPct,
  {
    baseConfig = {
      grills: 1,
      fryers: 2,
      drinks: 1,
      icecreams: 1,
      packs: 1,
      cooks: 1,
    },
    // search ranges (keisk jei nori)
    ranges = {
      grills: [1, 2],
      fryers: [2, 4],
      drinks: [1, 2],
      icecreams: [1, 2],
      packs: [1, 3],
      cooks: [1, 4],
    },
    // GA params
    ga = {
      populationSize: 40,
      generations: 60,
      eliteCount: 8,
      mutationRate: 0.25,
      objective: "avg",
      seed: 123,
    },
    costWeights = DEFAULT_COST,
  } = {},
) {
  console.log(
    "PLANNER orderIds:",
    orders.map((o) => o.orderId),
  );
  if (!orders || orders.length === 0) {
    return {
      baseline: null,
      best: null,
      tried: 0,
      note: "No orders to analyze.",
    };
  }

  // Baseline = FIFO su baseConfig
  const fifoRes = simulate(orders, { config: baseConfig });
  const fifoMetrics = fifoRes.metrics;

  const targetAvg =
    fifoMetrics.avgCompletion * (1 - targetImprovementPct / 100);

  let best = null;
  let tried = 0;

  const minG = clampInt(ranges.grills[0], 1, 10);
  const maxG = clampInt(ranges.grills[1], minG, 10);
  const minF = clampInt(ranges.fryers[0], 1, 10);
  const maxF = clampInt(ranges.fryers[1], minF, 10);
  const minD = clampInt(ranges.drinks[0], 1, 10);
  const maxD = clampInt(ranges.drinks[1], minD, 10);
  const minI = clampInt(ranges.icecreams[0], 1, 10);
  const maxI = clampInt(ranges.icecreams[1], minI, 10);
  const minP = clampInt(ranges.packs[0], 1, 10);
  const maxP = clampInt(ranges.packs[1], minP, 10);
  const minC = clampInt(ranges.cooks[0], 1, 10);
  const maxC = clampInt(ranges.cooks[1], minC, 10);

  // bruteforce per mažą erdvę (čia OK, variantų nedaug)
  for (let cooks = minC; cooks <= maxC; cooks++) {
    for (let packs = minP; packs <= maxP; packs++) {
      for (let grills = minG; grills <= maxG; grills++) {
        for (let fryers = minF; fryers <= maxF; fryers++) {
          for (let drinks = minD; drinks <= maxD; drinks++) {
            for (let icecreams = minI; icecreams <= maxI; icecreams++) {
              const cfg = { cooks, packs, grills, fryers, drinks, icecreams };

              // GA optimal sequence for this config
              const simOptions = { config: cfg };
              const { bestSequence, bestMetrics } = runGA(
                orders,
                ga,
                simOptions,
              );

              tried++;

              const avg = bestMetrics.avgCompletion;
              if (avg > targetAvg) continue; // nepasiekė target

              const improvementPct =
                ((fifoMetrics.avgCompletion - avg) /
                  fifoMetrics.avgCompletion) *
                100;

              const cost = calcCost(cfg, costWeights);

              // rinkis pigiausią; jei vienoda kaina – geresnį avg
              if (
                !best ||
                cost < best.cost ||
                (cost === best.cost && avg < best.aiMetrics.avgCompletion)
              ) {
                best = {
                  config: cfg,
                  aiMetrics: bestMetrics,
                  aiSequence: bestSequence,
                  cost,
                  improvementPct,
                };
              }
            }
          }
        }
      }
    }
  }

  let note = "";
  if (!best) {
    note =
      "No configuration in the given ranges reached the target. Increase ranges (e.g. cooks/packs) or lower target.";
  } else {
    note =
      "Found a configuration that reaches the target improvement with minimum estimated cost.";
  }

  return {
    baseline: { fifoMetrics, config: baseConfig },
    best,
    tried,
    note,
  };
}
