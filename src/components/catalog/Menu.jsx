import { useMemo, useState } from "react";
import KitchenPanel from "../../kitchen/KitchenPanel";
import products from "../../seed/products.json";
import DragScroll from "../ui/DragScroll";
import VirulReceipt from "../virtualReceipt/VirulReceipt";
import CategoryMenu from "./CategoryMenu";

const CATEGORY_META = {
  BURGER: { label: "Burgers", icon: "🍔" },
  FRIES: { label: "Fries", icon: "🍟" },
  DRINK: { label: "Drinks", icon: "🥤" },
  COMBO: { label: "Combos", icon: "🍱" },
  DESSERT: { label: "Desserts", icon: "🧁" },
  SAUCE: { label: "Sauces", icon: "🥫" },
};

export default function Menu() {
  const categories = useMemo(() => {
    const uniq = Array.from(new Set(products.map((p) => p.type)));
    const preferred = ["BURGER", "FRIES", "DRINK", "COMBO", "DESSERT", "SAUCE"];
    return [
      ...preferred.filter((x) => uniq.includes(x)),
      ...uniq.filter((x) => !preferred.includes(x)),
    ];
  }, []);

  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? "");
  const [rightView, setRightView] = useState("receipt"); // "receipt" | "kitchen"

  return (
    <div className="flex h-screen w-full bg-[#0b0f14] text-white overflow-hidden">
      {/* LEFT */}
      <div className="flex-[2] min-w-0 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-[#0b0f14]/90 backdrop-blur border-b border-white/10">
          <div className="w-full px-6 py-4">
            <DragScroll
              axis="x"
              className="flex gap-3 overflow-x-auto no-scrollbar"
            >
              {categories.map((category) => {
                const meta = CATEGORY_META[category] ?? {
                  label: category,
                  icon: "🍔",
                };
                const active = selectedCategory === category;

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={[
                      "shrink-0 rounded-2xl border transition",
                      "flex flex-col items-center justify-center gap-1",
                      "w-16 h-16 sm:w-[72px] sm:h-[72px] lg:w-[78px] lg:h-[78px] 2xl:w-[88px] 2xl:h-[88px]",
                      active
                        ? "bg-[#e11d48] border-[#e11d48] shadow-[0_10px_30px_rgba(225,29,72,0.25)]"
                        : "bg-[#111827] border-white/10 hover:border-white/20",
                    ].join(" ")}
                  >
                    <div className="text-xl sm:text-2xl leading-none">
                      {meta.icon}
                    </div>
                    <div className="text-[11px] sm:text-[12px] font-semibold opacity-90">
                      {meta.label}
                    </div>
                  </button>
                );
              })}
            </DragScroll>
          </div>
        </div>

        <div className="flex-1 px-6 py-5 overflow-hidden">
          {selectedCategory ? (
            <CategoryMenu category={selectedCategory} />
          ) : (
            <div className="text-sm text-white/70">Select a category</div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 bg-white text-black overflow-hidden flex flex-col">
        {/* Top bar toggle */}
        <div className="p-3 border-b border-black/10 flex items-center justify-between">
          <div className="font-bold">
            {rightView === "receipt" ? "Receipt" : "Kitchen"}
          </div>

          <div className="flex gap-2">
            <button
              className={[
                "px-3 py-2 rounded-lg text-sm font-semibold border transition",
                rightView === "receipt"
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-black/20 hover:bg-black/5",
              ].join(" ")}
              onClick={() => setRightView("receipt")}
            >
              Receipt
            </button>

            <button
              className={[
                "px-3 py-2 rounded-lg text-sm font-semibold border transition",
                rightView === "kitchen"
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-black/20 hover:bg-black/5",
              ].join(" ")}
              onClick={() => setRightView("kitchen")}
            >
              Kitchen
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {rightView === "receipt" ? <VirulReceipt /> : <KitchenPanel />}
        </div>
      </div>
    </div>
  );
}
