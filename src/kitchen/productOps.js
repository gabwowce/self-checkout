// seconds
export const ITEM_OPS_BY_ID = {
  // BURGERS -> grill
  "b-cheese": { station: "grill", machineTime: 180, humanTime: 8 },
  "b-double-cheese": { station: "grill", machineTime: 210, humanTime: 10 }, // storesnis
  "b-chicken": { station: "grill", machineTime: 190, humanTime: 9 },
  "b-bacon": { station: "grill", machineTime: 220, humanTime: 10 },
  "b-veggie": { station: "grill", machineTime: 170, humanTime: 8 },

  // FRIES -> fryer (2 units)
  "f-small": { station: "fryer", machineTime: 120, humanTime: 5 },
  "f-medium": { station: "fryer", machineTime: 150, humanTime: 6 },
  "f-large": { station: "fryer", machineTime: 180, humanTime: 7 },

  // DRINKS -> drinks
  "d-cola-s": { station: "drinks", machineTime: 15, humanTime: 15 },
  "d-cola-m": { station: "drinks", machineTime: 20, humanTime: 20 },
  "d-cola-l": { station: "drinks", machineTime: 25, humanTime: 25 },
  "d-water": { station: "drinks", machineTime: 10, humanTime: 10 },
  "d-juice": { station: "drinks", machineTime: 20, humanTime: 20 },

  // COMBOS -> split into items
  // Pastaba: combo pats NEGAMINAMAS. Jis išskaidomas į 3 itemus.
  "c-cheese-set": { combo: ["b-cheese", "f-medium", "d-cola-m"] },
  "c-double-set": { combo: ["b-double-cheese", "f-large", "d-cola-l"] },
  "c-chicken-set": { combo: ["b-chicken", "f-medium", "d-cola-m"] },

  // SNACKS -> fryer
  "n-6": { station: "fryer", machineTime: 140, humanTime: 6 },
  "n-9": { station: "fryer", machineTime: 170, humanTime: 7 },
  "onion-rings": { station: "fryer", machineTime: 150, humanTime: 6 },

  // SAUCES -> ignore in kitchen (arba įtrauk į PACK kaip +2s/order)
  "s-ketchup": { station: "none", machineTime: 0, humanTime: 0 },
  "s-garlic": { station: "none", machineTime: 0, humanTime: 0 },
  "s-bbq": { station: "none", machineTime: 0, humanTime: 0 },

  // DESSERTS -> icecream (ir apple pie traktuojam kaip “dessert station”)
  "dess-icecream": { station: "icecream", machineTime: 35, humanTime: 35 },
  "dess-applepie": { station: "icecream", machineTime: 45, humanTime: 10 }, // pašildymas + paėmimas (žmogus mažiau)
  "dess-shake": { station: "icecream", machineTime: 50, humanTime: 50 },
};

// order-level constants
export const ORDER_PACK = { station: "pack", machineTime: 20, humanTime: 20 };
