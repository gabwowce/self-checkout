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
  const [rightView, setRightView] = useState("receipt");

  // 🔥 JEI KITCHEN → VISAS EKRANAS
  if (rightView === "kitchen") {
    return (
      <div className="h-screen w-screen bg-white">
        <div className="p-3 border-b flex justify-between">
          <div className="font-bold">Kitchen</div>

          <button
            className="px-4 py-2 bg-black text-white rounded"
            onClick={() => setRightView("receipt")}
          >
            Back to POS
          </button>
        </div>

        <div className="h-[calc(100vh-56px)]">
          <KitchenPanel />
        </div>
      </div>
    );
  }

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
                        ? "bg-[#e11d48] border-[#e11d48]"
                        : "bg-[#111827] border-white/10",
                    ].join(" ")}
                  >
                    <div className="text-xl">{meta.icon}</div>
                    <div className="text-[11px] font-semibold">
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
            <div>Select a category</div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 bg-white text-black flex flex-col">
        <div className="p-3 border-b flex justify-between">
          <div className="font-bold">Receipt</div>

          <button
            className="px-3 py-2 rounded bg-black text-white"
            onClick={() => setRightView("kitchen")}
          >
            Kitchen
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <VirulReceipt />
        </div>
      </div>
    </div>
  );
}
