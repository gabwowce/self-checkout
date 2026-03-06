import { simulateDispatch } from "./simulateDispatch";

/**
 * Advanced AI (real):
 * GA optimizuoja:
 *  - orderių permutaciją
 *  - dispatch policy weights
 *
 * Grąžina: bestSequence, bestSim, info (įskaitant bestWeights)
 */
export function runAdvancedGA(orders, gaOptions = {}, simOptions = {}) {
  if (!orders || orders.length === 0) {
    return {
      bestSequence: [],
      bestSim: {
        metrics: { avgCompletion: 0, makespan: 0 },
        timeline: [],
        orderResults: [],
      },
      info: { ...gaOptions, bestWeights: null },
    };
  }

  const {
    populationSize = 60,
    generations = 100,
    eliteCount = Math.max(10, Math.floor((populationSize || 60) * 0.2)),
    mutationRate = 0.35,
    objective = "avg", // "avg" | "makespan"
    seed = 123,
  } = gaOptions;

  const rng = makeRng(seed);

  // ---- weights gene ----
  const WEIGHT_KEYS = [
    "wWait",
    "wDur",
    "wPack",
    "wAuto",
    "wFinish",
    "wCritical",
  ];

  const WEIGHT_BOUNDS = {
    wWait: [0.0, 3.0],
    wDur: [0.0, 2.0],
    wPack: [-2.0, 2.0],
    wAuto: [-2.0, 2.0],
    wFinish: [-3.0, 0.0], // negative: finish orders earlier
    wCritical: [-2.0, 2.0],
  };

  function randomWeights() {
    const w = {};
    for (const k of WEIGHT_KEYS) {
      const [lo, hi] = WEIGHT_BOUNDS[k];
      w[k] = lo + rng() * (hi - lo);
    }
    return w;
  }

  function clampWeight(k, v) {
    const [lo, hi] = WEIGHT_BOUNDS[k];
    return Math.max(lo, Math.min(hi, v));
  }

  function mutateWeights(w) {
    const out = { ...w };
    for (const k of WEIGHT_KEYS) {
      if (rng() < 0.45) {
        // gaussian-ish noise
        const noise = randn(rng) * 0.25;
        out[k] = clampWeight(k, out[k] + noise);
      }
    }
    return out;
  }

  function crossoverWeights(a, b) {
    const child = {};
    for (const k of WEIGHT_KEYS) {
      // blend
      const alpha = rng(); // 0..1
      child[k] = clampWeight(k, a[k] * alpha + b[k] * (1 - alpha));
    }
    return child;
  }

  // ---- chromosome ----
  function makeChromosome(seq) {
    return {
      seq,
      weights: randomWeights(),
    };
  }

  // ---- GA operators for sequences ----
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

  // Order Crossover (OX)
  function crossoverOX(parentA, parentB) {
    const n = parentA.length;
    if (n < 2) return parentA.slice();

    let i = Math.floor(rng() * n);
    let j = Math.floor(rng() * n);
    if (i > j) [i, j] = [j, i];
    if (i === j) j = Math.min(n - 1, i + 1);

    const child = new Array(n).fill(null);

    for (let k = i; k <= j; k++) child[k] = parentA[k];

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

  // ---- fitness ----
  function scoreChromosome(ch) {
    const sim = simulateDispatch(ch.seq, {
      ...simOptions,
      weights: ch.weights,
    });
    const value =
      objective === "makespan"
        ? sim.metrics.makespan
        : sim.metrics.avgCompletion;
    return { sim, value };
  }

  // ---- init population ----
  let population = [];
  for (let p = 0; p < populationSize; p++) {
    population.push(makeChromosome(shuffle(orders)));
  }

  let bestEval = scoreChromosome(population[0]);
  let best = population[0];

  // ---- evolve ----
  for (let gen = 0; gen < generations; gen++) {
    const evaluated = population.map((ch) => {
      const ev = scoreChromosome(ch);
      return { ch, ...ev };
    });

    evaluated.sort((a, b) => a.value - b.value);

    if (evaluated[0].value < bestEval.value) {
      bestEval = { sim: evaluated[0].sim, value: evaluated[0].value };
      best = evaluated[0].ch;
    }

    // elites
    const elites = evaluated.slice(0, eliteCount).map((x) => x.ch);

    // next
    const next = elites.slice();

    function pickParent() {
      // tournament selection
      const a = evaluated[Math.floor(rng() * evaluated.length)];
      const b = evaluated[Math.floor(rng() * evaluated.length)];
      return a.value < b.value ? a.ch : b.ch;
    }

    while (next.length < populationSize) {
      const pA = pickParent();
      const pB = pickParent();

      // crossover (sequence + weights)
      let childSeq = crossoverOX(pA.seq, pB.seq);
      let childWeights = crossoverWeights(pA.weights, pB.weights);

      // mutate
      if (rng() < mutationRate) childSeq = mutateSwap(childSeq);
      if (rng() < mutationRate) childWeights = mutateWeights(childWeights);

      next.push({ seq: childSeq, weights: childWeights });
    }

    population = next;
  }

  // final best sim (already in bestEval, but let's ensure consistent)
  const finalSim =
    bestEval.sim ??
    simulateDispatch(best.seq, { ...simOptions, weights: best.weights });

  return {
    bestSequence: best.seq,
    bestSim: finalSim,
    info: {
      populationSize,
      generations,
      eliteCount,
      mutationRate,
      objective,
      seed,
      bestWeights: best.weights,
    },
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

// approx gaussian from uniform RNG (Box-Muller)
function randn(rng) {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
