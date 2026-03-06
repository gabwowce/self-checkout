import { ORDER_PACK } from "./productOps";

/**
 * Parametrinė virtuvės simuliacija.
 *
 * ordersSequence: KitchenOrder[] (eilė, kurią paduoda FIFO arba GA)
 *
 * options:
 *  - saucePackExtra: number (sekundės už 1 sauce per order)
 *  - config: {
 *      grills: number,
 *      fryers: number,
 *      drinks: number,
 *      icecreams: number,
 *      packs: number,
 *      cooks: number,
 *    }
 *
 * Grąžina:
 *  {
 *    metrics: { makespan, avgCompletion },
 *    timeline: [{ orderId, label, station, start, end }],
 *    orderResults: [{ orderId, readyTime, completionTime }]
 *  }
 */
export function simulate(ordersSequence, options = {}) {
  const saucePackExtra = options.saucePackExtra ?? 0;

  const cfg = {
    grills: options.config?.grills ?? 1,
    fryers: options.config?.fryers ?? 2,
    drinks: options.config?.drinks ?? 1,
    icecreams: options.config?.icecreams ?? 1,
    packs: options.config?.packs ?? 1,
    cooks: options.config?.cooks ?? 1,
  };

  // availability arrays (seconds)
  const grillFree = Array(cfg.grills).fill(0);
  const fryerFree = Array(cfg.fryers).fill(0);
  const drinksFree = Array(cfg.drinks).fill(0);
  const icecreamFree = Array(cfg.icecreams).fill(0);
  const packFree = Array(cfg.packs).fill(0);
  const cookFree = Array(cfg.cooks).fill(0);

  const timeline = [];
  const orderResults = [];

  function pickEarliestIndex(freeArr) {
    let bestIdx = 0;
    let bestVal = freeArr[0] ?? 0;
    for (let i = 1; i < freeArr.length; i++) {
      if (freeArr[i] < bestVal) {
        bestVal = freeArr[i];
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  function stationLabel(base, idx) {
    // pvz "fryer#2"
    return `${base}#${idx + 1}`;
  }

  /**
   * Auto stotelė: žmogus tik aptarnauja START (humanTime),
   * tada mašina/stotelė dirba machineTime.
   */
  function scheduleAutoStation({
    orderId,
    label,
    stationFreeArr,
    stationBaseName,
    machineTime,
    humanTime,
    prevEnd,
  }) {
    // pasirink stotelę, kuri greičiausiai atsilaisvins
    const stIdx = pickEarliestIndex(stationFreeArr);

    // žmogus ir stotelė turi sutapti laike
    const cookIdx = pickEarliestIndex(cookFree);

    // kada realiai galim pradėti "įdėti" produktą (service)
    const serviceStart = Math.max(
      prevEnd,
      stationFreeArr[stIdx], // stotelė turi būti laisva
      cookFree[cookIdx], // žmogus turi būti laisvas
    );

    const serviceEnd = serviceStart + humanTime;

    // atnaujinam žmogų
    cookFree[cookIdx] = serviceEnd;

    timeline.push({
      orderId,
      label: `${label} (service)`,
      station: stationLabel("cook", cookIdx),
      start: serviceStart,
      end: serviceEnd,
    });

    // mašina pradeda dirbti iškart po service (įdėjimo)
    const machineStart = serviceEnd;
    const machineEnd = machineStart + machineTime;

    // atnaujinam stotelę
    stationFreeArr[stIdx] = machineEnd;

    timeline.push({
      orderId,
      label,
      station: stationLabel(stationBaseName, stIdx),
      start: machineStart,
      end: machineEnd,
    });

    return machineEnd;
  }

  /**
   * Manual stotelė: žmogus dirba VISĄ duration.
   * Reikia ir žmogaus, ir stotelės (pvz pack stalo).
   */
  function scheduleManualStation({
    orderId,
    label,
    stationFreeArr,
    stationBaseName,
    duration,
    prevEnd,
  }) {
    // parenkam greičiausiai laisvą stotelę ir žmogų
    const stIdx = pickEarliestIndex(stationFreeArr);
    const cookIdx = pickEarliestIndex(cookFree);

    const start = Math.max(prevEnd, stationFreeArr[stIdx], cookFree[cookIdx]);
    const end = start + duration;

    stationFreeArr[stIdx] = end;
    cookFree[cookIdx] = end;

    timeline.push({
      orderId,
      label,
      station: stationLabel(stationBaseName, stIdx),
      start,
      end,
    });

    timeline.push({
      orderId,
      label: `${label} (human)`,
      station: stationLabel("cook", cookIdx),
      start,
      end,
    });

    return end;
  }

  for (const order of ordersSequence) {
    const itemFinishTimes = [];

    for (const item of order.items) {
      const prevEnd = 0; // itemai paraleliai orderio viduje

      if (item.station === "grill") {
        const end = scheduleAutoStation({
          orderId: order.orderId,
          label: item.productId,
          stationFreeArr: grillFree,
          stationBaseName: "grill",
          machineTime: item.machineTime,
          humanTime: item.humanTime,
          prevEnd,
        });
        itemFinishTimes.push(end);
      }

      if (item.station === "fryer") {
        const end = scheduleAutoStation({
          orderId: order.orderId,
          label: item.productId,
          stationFreeArr: fryerFree,
          stationBaseName: "fryer",
          machineTime: item.machineTime,
          humanTime: item.humanTime,
          prevEnd,
        });
        itemFinishTimes.push(end);
      }

      if (item.station === "drinks") {
        const duration = item.machineTime; // drinks pas tave rankinis (machine==human)
        const end = scheduleManualStation({
          orderId: order.orderId,
          label: item.productId,
          stationFreeArr: drinksFree,
          stationBaseName: "drinks",
          duration,
          prevEnd,
        });
        itemFinishTimes.push(end);
      }

      if (item.station === "icecream") {
        const duration = item.machineTime;
        const end = scheduleManualStation({
          orderId: order.orderId,
          label: item.productId,
          stationFreeArr: icecreamFree,
          stationBaseName: "icecream",
          duration,
          prevEnd,
        });
        itemFinishTimes.push(end);
      }
    }

    const readyTime = itemFinishTimes.length ? Math.max(...itemFinishTimes) : 0;

    // PACK per order
    const packDuration =
      ORDER_PACK.machineTime +
      (saucePackExtra > 0 ? order.sauceCount * saucePackExtra : 0);

    const packedAt = scheduleManualStation({
      orderId: order.orderId,
      label: "PACK",
      stationFreeArr: packFree,
      stationBaseName: "pack",
      duration: packDuration,
      prevEnd: readyTime,
    });

    orderResults.push({
      orderId: order.orderId,
      readyTime,
      completionTime: packedAt,
    });
  }

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
  };
}
