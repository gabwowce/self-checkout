import { ORDER_PACK } from "./productOps";

/**
 * simulateDispatch – Dispatch policy simuliacija su parametrizuota "policy" (svoriais).
 *
 * options:
 * - config
 * - saucePackExtra
 * - weights: {
 *    wWait, wDur, wPack, wAuto, wFinish, wCritical
 *   }
 *
 * Grąžina:
 *  { metrics, timeline, orderResults, usedConfig }
 */
export function simulateDispatch(ordersSequence, options = {}) {
  const saucePackExtra = options.saucePackExtra ?? 0;

  const cfg = {
    grills: options.config?.grills ?? 1,
    fryers: options.config?.fryers ?? 2,
    drinks: options.config?.drinks ?? 1,
    icecreams: options.config?.icecreams ?? 1,
    packs: options.config?.packs ?? 1,
    cooks: options.config?.cooks ?? 1,
  };

  const weights = {
    wWait: options.weights?.wWait ?? 1.0, // penalize waiting until start
    wDur: options.weights?.wDur ?? 0.2, // penalize longer tasks
    wPack: options.weights?.wPack ?? -0.3, // negative => pack earlier
    wAuto: options.weights?.wAuto ?? -0.15, // negative => prefer auto (grill/fryer)
    wFinish: options.weights?.wFinish ?? -0.8, // negative => finish orders
    wCritical: options.weights?.wCritical ?? -0.25, // negative => prioritize "critical"
  };

  const timeline = [];

  // availability arrays (seconds)
  const grillFree = Array(cfg.grills).fill(0);
  const fryerFree = Array(cfg.fryers).fill(0);
  const drinksFree = Array(cfg.drinks).fill(0);
  const icecreamFree = Array(cfg.icecreams).fill(0);
  const packFree = Array(cfg.packs).fill(0);
  const cookFree = Array(cfg.cooks).fill(0);

  function stationLabel(base, idx) {
    return `${base}#${idx + 1}`;
  }

  function pickEarliestIndex(arr) {
    let bestIdx = 0;
    let bestVal = arr[0] ?? 0;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < bestVal) {
        bestVal = arr[i];
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  // ----- Build internal orders + tasks -----
  const orders = ordersSequence.map((o) => {
    const items = (o.items ?? []).map((it, idx) => ({
      key: `${o.orderId}:item:${idx}`,
      orderId: o.orderId,
      type: "item",
      station: it.station,
      label: it.productId,
      machineTime: it.machineTime ?? 0,
      humanTime: it.humanTime ?? 0,
      // OPTIONAL: jei turi critical flagą savo itemuose – gerai. Jei ne, tiesiog false.
      critical: Boolean(it.critical),
      status: "pending", // pending | running | done
      doneAt: null,
    }));

    return {
      orderId: o.orderId,
      sauceCount: o.sauceCount ?? 0,
      items,
      pack: {
        key: `${o.orderId}:pack`,
        orderId: o.orderId,
        type: "pack",
        station: "pack",
        label: "PACK",
        duration:
          ORDER_PACK.machineTime +
          (saucePackExtra > 0 ? (o.sauceCount ?? 0) * saucePackExtra : 0),
        status: "pending",
        doneAt: null,
        unlocked: false,
      },
    };
  });

  function updateCompleted(t) {
    for (const o of orders) {
      for (const it of o.items) {
        if (it.status === "running" && it.doneAt != null && it.doneAt <= t) {
          it.status = "done";
        }
      }
      if (
        o.pack.status === "running" &&
        o.pack.doneAt != null &&
        o.pack.doneAt <= t
      ) {
        o.pack.status = "done";
      }
    }
  }

  function unlockPacksIfReady() {
    for (const o of orders) {
      if (o.pack.unlocked) continue;
      if (o.items.every((x) => x.status === "done")) o.pack.unlocked = true;
    }
  }

  function allDone() {
    for (const o of orders) {
      for (const it of o.items) if (it.status !== "done") return false;
      if (o.pack.status !== "done") return false;
    }
    return true;
  }

  function nextRunningDoneAt(t) {
    let next = Infinity;
    for (const o of orders) {
      for (const it of o.items) {
        if (it.status === "running" && it.doneAt != null && it.doneAt > t) {
          next = Math.min(next, it.doneAt);
        }
      }
      if (
        o.pack.status === "running" &&
        o.pack.doneAt != null &&
        o.pack.doneAt > t
      ) {
        next = Math.min(next, o.pack.doneAt);
      }
    }
    return next;
  }

  function getOrderById(orderId) {
    return orders.find((x) => x.orderId === orderId);
  }

  function remainingTasksCount(orderId) {
    const o = getOrderById(orderId);
    if (!o) return 0;
    let count = 0;
    for (const it of o.items) if (it.status !== "done") count++;
    if (o.pack.status !== "done") count++;
    return count;
  }

  // ----- Earliest start calculators -----
  function earliestStartAuto(t, stationFreeArr) {
    const cookIdx = pickEarliestIndex(cookFree);
    const stIdx = pickEarliestIndex(stationFreeArr);
    const start = Math.max(t, cookFree[cookIdx], stationFreeArr[stIdx]); // serviceStart
    return { start, cookIdx, stIdx };
  }

  function earliestStartManual(t, stationFreeArr) {
    const cookIdx = pickEarliestIndex(cookFree);
    const stIdx = pickEarliestIndex(stationFreeArr);
    const start = Math.max(t, cookFree[cookIdx], stationFreeArr[stIdx]);
    return { start, cookIdx, stIdx };
  }

  // ----- Schedulers -----
  function scheduleAutoAt(start, task, stationFreeArr, stationBaseName) {
    const {
      start: s,
      cookIdx,
      stIdx,
    } = earliestStartAuto(start, stationFreeArr);

    const serviceStart = s;
    const serviceEnd = serviceStart + task.humanTime;

    cookFree[cookIdx] = serviceEnd;

    timeline.push({
      orderId: task.orderId,
      label: `${task.label} (service)`,
      station: stationLabel("cook", cookIdx),
      start: serviceStart,
      end: serviceEnd,
    });

    const machineStart = serviceEnd;
    const machineEnd = machineStart + task.machineTime;

    stationFreeArr[stIdx] = machineEnd;

    timeline.push({
      orderId: task.orderId,
      label: task.label,
      station: stationLabel(stationBaseName, stIdx),
      start: machineStart,
      end: machineEnd,
    });

    task.status = "running";
    task.doneAt = machineEnd;

    return machineEnd;
  }

  function scheduleManualAt(
    start,
    task,
    stationFreeArr,
    stationBaseName,
    duration,
  ) {
    const {
      start: s,
      cookIdx,
      stIdx,
    } = earliestStartManual(start, stationFreeArr);

    const st = s;
    const en = st + duration;

    cookFree[cookIdx] = en;
    stationFreeArr[stIdx] = en;

    timeline.push({
      orderId: task.orderId,
      label: task.label,
      station: stationLabel(stationBaseName, stIdx),
      start: st,
      end: en,
    });

    timeline.push({
      orderId: task.orderId,
      label: `${task.label} (human)`,
      station: stationLabel("cook", cookIdx),
      start: st,
      end: en,
    });

    task.status = "running";
    task.doneAt = en;

    return en;
  }

  function getStationArr(task) {
    if (task.type === "pack") return packFree;
    if (task.station === "grill") return grillFree;
    if (task.station === "fryer") return fryerFree;
    if (task.station === "drinks") return drinksFree;
    if (task.station === "icecream") return icecreamFree;
    return null;
  }

  function isAuto(task) {
    return (
      task.type === "item" &&
      (task.station === "grill" || task.station === "fryer")
    );
  }

  function isManual(task) {
    return (
      task.type === "pack" ||
      (task.type === "item" &&
        (task.station === "drinks" || task.station === "icecream"))
    );
  }

  // ----- Policy score -----
  function taskDuration(task) {
    if (task.type === "pack") return task.duration ?? 0;
    return task.machineTime ?? 0;
  }

  function computeScore(task, t, start) {
    const dur = taskDuration(task);
    const wait = Math.max(0, start - t);

    const isPack = task.type === "pack" ? 1 : 0;
    const isAutoFlag = isAuto(task) ? 1 : 0;
    const rem = remainingTasksCount(task.orderId);

    const critical = task.critical ? 1 : 0;

    // lower score = better
    return (
      weights.wWait * wait +
      weights.wDur * dur +
      weights.wPack * isPack +
      weights.wAuto * isAutoFlag +
      weights.wFinish * rem +
      weights.wCritical * critical
    );
  }

  // ----- Main loop -----
  let t = 0;

  while (!allDone()) {
    updateCompleted(t);
    unlockPacksIfReady();

    // candidate tasks (PENDING only)
    const candidates = [];
    for (const o of orders) {
      for (const it of o.items) {
        if (it.status === "pending") candidates.push(it);
      }
      if (o.pack.unlocked && o.pack.status === "pending")
        candidates.push(o.pack);
    }

    // jei nieko pending nėra, reiškia viskas running -> šokam į next done
    if (!candidates.length) {
      const nextT = nextRunningDoneAt(t);
      if (!Number.isFinite(nextT)) break;
      t = nextT;
      continue;
    }

    const evaluated = candidates
      .map((task) => {
        const arr = getStationArr(task);
        if (!arr) return null;

        const { start } = isAuto(task)
          ? earliestStartAuto(t, arr)
          : earliestStartManual(t, arr);
        const score = computeScore(task, t, start);

        return { task, start, score };
      })
      .filter(Boolean);

    if (!evaluated.length) {
      const nextT = nextRunningDoneAt(t);
      if (!Number.isFinite(nextT)) break;
      t = nextT;
      continue;
    }

    evaluated.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      // mažas tie-break: jei score equal, greičiau startuojantis laimi
      if (a.start !== b.start) return a.start - b.start;
      return 0;
    });

    const best = evaluated[0];

    // jei geriausias start ateityje -> šokam ten
    if (best.start > t) {
      t = best.start;
      continue;
    }

    const task = best.task;

    if (isAuto(task)) {
      const arr = task.station === "grill" ? grillFree : fryerFree;
      scheduleAutoAt(t, task, arr, task.station);
      continue;
    }

    if (task.type === "pack") {
      scheduleManualAt(t, task, packFree, "pack", task.duration ?? 0);
      continue;
    }

    if (task.station === "drinks") {
      scheduleManualAt(t, task, drinksFree, "drinks", task.machineTime ?? 0);
      continue;
    }

    if (task.station === "icecream") {
      scheduleManualAt(
        t,
        task,
        icecreamFree,
        "icecream",
        task.machineTime ?? 0,
      );
      continue;
    }

    // fallback
    t += 0.0001;
  }

  // ----- metrics -----
  const orderResults = orders.map((o) => {
    let readyTime = 0;
    for (const it of o.items) readyTime = Math.max(readyTime, it.doneAt ?? 0);

    const completionTime = o.pack.doneAt ?? readyTime;

    return { orderId: o.orderId, readyTime, completionTime };
  });

  const makespan = orderResults.length
    ? Math.max(...orderResults.map((x) => x.completionTime))
    : 0;

  const avgCompletion = orderResults.length
    ? orderResults.reduce((s, x) => s + x.completionTime, 0) /
      orderResults.length
    : 0;

  return {
    metrics: { makespan, avgCompletion },
    timeline,
    orderResults,
    usedConfig: cfg,
    usedWeights: weights,
  };
}
