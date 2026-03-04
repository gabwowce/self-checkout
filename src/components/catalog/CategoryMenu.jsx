import { useVirtualReceiptContext } from "../../context/virtualReceiptContext";
import { formatEur } from "../../helpers/priceConverter";
import products from "../../seed/products.json";
import DragScroll from "../ui/DragScroll";

export default function CategoryMenu({ category }) {
  const productsByCategory = products.filter((p) => p.type === category);
  const { addToVirtualReceipt } = useVirtualReceiptContext();

  return (
    <DragScroll axis="y" className="h-full overflow-y-auto no-scrollbar pr-1">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {productsByCategory.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl bg-[#111827] border border-white/10 overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.35)]"
          >
            <div className="bg-white p-3">
              <img
                src={product.image}
                alt={product.name}
                className="w-full aspect-[16/9] object-contain"
                loading="lazy"
              />
            </div>

            <div className="p-3">
              <div className="text-sm font-semibold leading-snug min-h-[40px] overflow-hidden">
                {product.name}
              </div>

              <div className="mt-1 text-[11px] text-white/50">
                {product.type}
              </div>

              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="text-lg font-bold">
                  {formatEur(product.priceCents)}
                </div>

                <button
                  type="button"
                  className="h-10 w-10 rounded-xl bg-white text-black font-black text-xl leading-none
                             hover:bg-white/90 active:scale-95 transition"
                  onClick={() => addToVirtualReceipt(product)}
                  aria-label={`Add ${product.name}`}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DragScroll>
  );
}
