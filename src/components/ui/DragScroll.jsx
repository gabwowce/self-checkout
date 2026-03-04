import { useRef } from "react";

export default function DragScroll({
  axis = "x", // "x" or "y"
  className = "",
  style = {},
  children,
}) {
  const ref = useRef(null);
  const isX = axis === "x";

  const onMouseDown = (e) => {
    const el = ref.current;
    if (!el) return;

    el.dataset.drag = "1";
    el.dataset.startX = String(e.pageX);
    el.dataset.startY = String(e.pageY);
    el.dataset.startScrollLeft = String(el.scrollLeft);
    el.dataset.startScrollTop = String(el.scrollTop);
  };

  const onMouseMove = (e) => {
    const el = ref.current;
    if (!el || el.dataset.drag !== "1") return;

    const startX = Number(el.dataset.startX);
    const startY = Number(el.dataset.startY);
    const startScrollLeft = Number(el.dataset.startScrollLeft);
    const startScrollTop = Number(el.dataset.startScrollTop);

    const dx = e.pageX - startX;
    const dy = e.pageY - startY;

    if (isX) el.scrollLeft = startScrollLeft - dx;
    else el.scrollTop = startScrollTop - dy;
  };

  const stopDrag = () => {
    const el = ref.current;
    if (!el) return;
    el.dataset.drag = "0";
  };

  return (
    <div
      ref={ref}
      className={[
        "select-none cursor-grab active:cursor-grabbing",
        className,
      ].join(" ")}
      style={{
        WebkitOverflowScrolling: "touch",
        touchAction: isX ? "pan-x" : "pan-y",
        ...style,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      {children}
    </div>
  );
}
