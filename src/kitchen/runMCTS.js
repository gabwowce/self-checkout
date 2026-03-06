import { simulateDispatch } from "./simulateDispatch";

/**
 * MCTS per order sequence.
 *
 * Kiekvienas medis renkasi kitą orderį sekoje.
 * Pilna seka įvertinama per simulateDispatch().
 *
 * Grąžina:
 * {
 *   bestSequence,
 *   bestSim,
 *   info
 * }
 */
export function runMCTS(orders, mctsOptions = {}, simOptions = {}) {
  if (!orders || orders.length === 0) {
    return {
      bestSequence: [],
      bestSim: {
        metrics: { avgCompletion: 0, makespan: 0 },
        timeline: [],
        orderResults: [],
      },
      info: {
        iterations: 0,
        exploration: 0,
        objective: "avg",
        seed: null,
      },
    };
  }

  const {
    iterations = 1000,
    exploration = 1.41,
    objective = "avg", // "avg" | "makespan"
    seed = 123,
  } = mctsOptions;

  const rng = makeRng(seed);

  const root = createNode({
    parent: null,
    action: null,
    partialSequence: [],
    remainingOrders: orders.slice(),
  });

  let globalBest = {
    value: Infinity,
    sequence: null,
    sim: null,
  };

  for (let i = 0; i < iterations; i++) {
    // 1. Selection
    let node = root;
    while (!isTerminal(node) && isFullyExpanded(node)) {
      node = selectBestUCT(node, exploration);
    }

    // 2. Expansion
    if (!isTerminal(node) && !isFullyExpanded(node)) {
      node = expand(node, rng);
    }

    // 3. Rollout
    const rolloutSequence = rollout(node, rng);

    const sim = simulateDispatch(rolloutSequence, simOptions);
    const value =
      objective === "makespan"
        ? sim.metrics.makespan
        : sim.metrics.avgCompletion;

    // MCTS maxina reward, tai reward = -value
    const reward = -value;

    if (value < globalBest.value) {
      globalBest = {
        value,
        sequence: rolloutSequence,
        sim,
      };
    }

    // 4. Backpropagation
    backpropagate(node, reward, value);
  }

  // Iš root galima ištraukti "labiausiai lankytą" kelią
  const bestSequenceByTree = extractBestSequence(root);

  const finalSequence =
    globalBest.sequence ?? bestSequenceByTree ?? orders.slice();
  const finalSim =
    globalBest.sim ?? simulateDispatch(finalSequence, simOptions);

  return {
    bestSequence: finalSequence,
    bestSim: finalSim,
    info: {
      iterations,
      exploration,
      objective,
      seed,
      bestValue: globalBest.value,
    },
  };
}

function createNode({ parent, action, partialSequence, remainingOrders }) {
  return {
    parent,
    action, // kuris orderis buvo pridėtas į šį node
    partialSequence,
    remainingOrders,
    children: [],
    untriedActions: remainingOrders.slice(),
    visits: 0,
    totalReward: 0,
    totalValue: 0,
  };
}

function isTerminal(node) {
  return node.remainingOrders.length === 0;
}

function isFullyExpanded(node) {
  return node.untriedActions.length === 0;
}

function expand(node, rng) {
  const idx = Math.floor(rng() * node.untriedActions.length);
  const action = node.untriedActions[idx];

  // pašalinam iš untriedActions
  node.untriedActions.splice(idx, 1);

  const nextPartial = [...node.partialSequence, action];
  const nextRemaining = node.remainingOrders.filter(
    (o) => o.orderId !== action.orderId,
  );

  const child = createNode({
    parent: node,
    action,
    partialSequence: nextPartial,
    remainingOrders: nextRemaining,
  });

  node.children.push(child);
  return child;
}

function selectBestUCT(node, exploration) {
  let bestChild = null;
  let bestScore = -Infinity;

  for (const child of node.children) {
    if (child.visits === 0) {
      return child;
    }

    const exploitation = child.totalReward / child.visits;
    const explorationTerm =
      exploration * Math.sqrt(Math.log(node.visits) / child.visits);

    const uct = exploitation + explorationTerm;

    if (uct > bestScore) {
      bestScore = uct;
      bestChild = child;
    }
  }

  return bestChild;
}

function rollout(node, rng) {
  const remaining = shuffle(node.remainingOrders, rng);
  return [...node.partialSequence, ...remaining];
}

function backpropagate(node, reward, value) {
  let current = node;
  while (current) {
    current.visits += 1;
    current.totalReward += reward;
    current.totalValue += value;
    current = current.parent;
  }
}

function extractBestSequence(root) {
  const seq = [];
  let current = root;

  while (current.children.length > 0) {
    let bestChild = current.children[0];

    for (const child of current.children) {
      // galima rinktis pagal visits arba pagal mean value
      if (child.visits > bestChild.visits) {
        bestChild = child;
      }
    }

    if (!bestChild.action) break;
    seq.push(bestChild.action);
    current = bestChild;
  }

  // jei medis nepilnas, grąžinam bent jau tai, ką turim
  if (seq.length === 0) return null;
  return seq;
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeRng(seed) {
  if (seed === null || seed === undefined) return Math.random;

  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
