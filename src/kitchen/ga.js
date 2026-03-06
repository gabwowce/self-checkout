import { simulate } from "./simulate";

/**
 * Genetinis algoritmas orderių eiliškumui optimizuoti.
 *
 * orders: KitchenOrder[]
 *
 * gaOptions:
 * - populationSize
 * - generations
 * - eliteCount
 * - mutationRate
 * - objective: "avg" | "makespan"
 * - seed
 *
 * simOptions: perduodama tiesiai į simulate(sequence, simOptions)
 * pvz:
 * { config: { cooks: 2, grills: 1, fryers: 2, packs: 1, drinks: 1, icecreams: 1 } }
 */
export function runGA(orders, gaOptions = {}, simOptions = {}) {
  if (!orders || orders.length === 0) {
    return {
      bestSequence: [],
      bestMetrics: { avgCompletion: 0, makespan: 0 },
    };
  }

  const {
    populationSize = 40,
    generations = 60,
    eliteCount = Math.max(4, Math.floor((populationSize || 40) * 0.2)),
    mutationRate = 0.25,
    objective = "avg",
    seed = null,
  } = gaOptions;

  const rng = makeRng(seed);

  // ---- helpers ----
  function score(sequence) {
    const { metrics } = simulate(sequence, simOptions);
    const value =
      objective === "makespan" ? metrics.makespan : metrics.avgCompletion;
    return { metrics, value };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function mutateSwap(sequence) {
    if (sequence.length < 2) return sequence.slice();
    const a = sequence.slice();
    const i = Math.floor(rng() * a.length);
    let j = Math.floor(rng() * a.length);
    if (j === i) j = (j + 1) % a.length;
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  }

  // Order Crossover (OX) – permutacijoms, išlaiko unikalius orderId
  function crossoverOX(parentA, parentB) {
    const n = parentA.length;
    if (n < 2) return parentA.slice();

    let i = Math.floor(rng() * n);
    let j = Math.floor(rng() * n);
    if (i > j) [i, j] = [j, i];
    if (i === j) j = Math.min(n - 1, i + 1);

    const child = new Array(n).fill(null);

    // 1) segmentas iš A
    for (let k = i; k <= j; k++) child[k] = parentA[k];

    // 2) pildom B tvarka, praleidžiant jau panaudotus
    const used = new Set(child.filter(Boolean).map((o) => o.orderId));
    let bIndex = 0;

    for (let k = 0; k < n; k++) {
      if (child[k] !== null) continue;

      while (bIndex < n && used.has(parentB[bIndex].orderId)) bIndex++;

      child[k] = parentB[bIndex];
      used.add(parentB[bIndex].orderId);
      bIndex++;
    }

    return child;
  }

  // ---- init population ----
  let population = [];
  for (let p = 0; p < populationSize; p++) {
    population.push(shuffle(orders));
  }

  // start best
  let bestEval = score(population[0]);
  let bestSequence = population[0];

  // ---- evolve ----
  for (let gen = 0; gen < generations; gen++) {
    const evaluated = population.map((seq) => {
      const ev = score(seq);
      return { seq, ...ev };
    });

    evaluated.sort((a, b) => a.value - b.value);

    if (evaluated[0].value < bestEval.value) {
      bestEval = { metrics: evaluated[0].metrics, value: evaluated[0].value };
      bestSequence = evaluated[0].seq;
    }

    // elite
    const elites = evaluated.slice(0, eliteCount).map((x) => x.seq);

    // next generation
    const next = elites.slice();

    // tournament selection
    function pickParent() {
      const a = evaluated[Math.floor(rng() * evaluated.length)];
      const b = evaluated[Math.floor(rng() * evaluated.length)];
      return a.value < b.value ? a.seq : b.seq;
    }

    while (next.length < populationSize) {
      const parentA = pickParent();
      const parentB = pickParent();

      let child = crossoverOX(parentA, parentB);

      if (rng() < mutationRate) child = mutateSwap(child);

      next.push(child);
    }

    population = next;
  }

  return {
    bestSequence,
    bestMetrics: bestEval.metrics,
  };
}

// deterministic-ish RNG (repeatable)
function makeRng(seed) {
  if (seed === null || seed === undefined) return Math.random;

  // mulberry32
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
