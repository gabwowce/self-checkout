import { useEffect, useMemo, useRef, useState } from "react";

const STATION_ORDER = ["cook", "grill", "fryer", "drinks", "icecream", "pack"];

function baseStationName(station) {
  const idx = station.indexOf("#");
  return idx === -1 ? station : station.slice(0, idx);
}

function niceLabel(s) {
  if (s.startsWith("cook")) return "Cook";
  if (s.startsWith("grill")) return "Grill";
  if (s.startsWith("fryer")) return "Fryer";
  if (s.startsWith("drinks")) return "Drinks";
  if (s.startsWith("icecream")) return "Ice cream";
  if (s.startsWith("pack")) return "Pack";
  return s;
}

export default function KitchenTimeline({
  title,
  timeline = [],
  makespan = 0,
  height = 260,
}) {
  const [selectedOrderId, setSelectedOrderId] = useState("ALL");

  // ✅ responsive chart width
  const chartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(900);

  useEffect(() => {
    const resize = () => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.clientWidth || 900);
      }
    };

    resize();

    // ResizeObserver > window resize (works for flex/sidebar changes)
    const ro = new ResizeObserver(resize);
    if (chartRef.current) ro.observe(chartRef.current);

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      ro.disconnect();
    };
  }, []);

  const stations = useMemo(() => {
    const uniq = Array.from(new Set(timeline.map((e) => e.station)));

    const grouped = {};
    for (const s of uniq) {
      const base = baseStationName(s);
      if (!grouped[base]) grouped[base] = [];
      grouped[base].push(s);
    }

    const bases = Object.keys(grouped).sort((a, b) => {
      const ia = STATION_ORDER.indexOf(a);
      const ib = STATION_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    const result = [];
    for (const base of bases) {
      const list = grouped[base].slice().sort((a, b) => {
        const na = parseInt(a.split("#")[1] || "1", 10);
        const nb = parseInt(b.split("#")[1] || "1", 10);
        return na - nb;
      });
      result.push(...list);
    }
    return result;
  }, [timeline]);

  const orderIds = useMemo(() => {
    const ids = Array.from(new Set(timeline.map((e) => e.orderId)));
    ids.sort();
    return ids;
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    if (selectedOrderId === "ALL") return timeline;
    return timeline.filter((e) => e.orderId === selectedOrderId);
  }, [timeline, selectedOrderId]);

  const rowH = 34;

  // ✅ px per second based on real container width
  const pxPerSec = makespan > 0 ? chartWidth / makespan : 1;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold">{title}</div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-black/60">Filter order</span>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="text-xs px-2 py-1 rounded-md border border-black/20"
          >
            <option value="ALL">ALL</option>
            {orderIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-xs text-black/60 mb-2">
        Makespan: <b>{makespan.toFixed(1)} s</b> (timeline width scaled)
      </div>

      <div
        className="border border-black/10 rounded-xl overflow-hidden bg-white"
        style={{ height }}
      >
        <div className="flex h-full">
          {/* LEFT station labels */}
          <div className="w-36 border-r border-black/10 bg-black/5 overflow-hidden">
            {stations.map((s) => (
              <div
                key={s}
                className="px-3 flex items-center text-xs font-semibold border-b border-black/10"
                style={{ height: rowH }}
                title={s}
              >
                {niceLabel(s)}
                {s.includes("#") ? (
                  <span className="ml-1 text-black/50">{s.split("#")[1]}</span>
                ) : null}
              </div>
            ))}
          </div>

          {/* RIGHT chart */}
          <div className="flex-1 overflow-auto">
            {/* this wrapper defines the actual width for the chart */}
            <div ref={chartRef} className="w-full h-full">
              <div
                className="relative"
                style={{
                  width: chartWidth, // ✅ full available width
                  height: stations.length * rowH,
                  minWidth: 320, // optional safety
                }}
              >
                {/* grid lines (kas 10% makespan) */}
                {Array.from({ length: 10 }).map((_, i) => {
                  const x = ((i + 1) * chartWidth) / 10;
                  const t = ((i + 1) * makespan) / 10;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-black/5"
                      style={{ left: x }}
                      title={`${t.toFixed(0)} s`}
                    />
                  );
                })}

                {stations.map((station, row) => {
                  const y = row * rowH;
                  const events = filteredTimeline
                    .filter((e) => e.station === station)
                    .sort((a, b) => a.start - b.start);

                  return (
                    <div
                      key={station}
                      className="absolute left-0 right-0 border-b border-black/10"
                      style={{ top: y, height: rowH }}
                    >
                      {events.map((e, idx) => {
                        const left = e.start * pxPerSec;
                        const width = Math.max(2, (e.end - e.start) * pxPerSec);

                        const isService = String(e.label).includes("(service)");
                        const isHuman = String(e.label).includes("(human)");

                        const bg = isService
                          ? "bg-amber-300"
                          : isHuman
                            ? "bg-indigo-300"
                            : "bg-emerald-300";

                        return (
                          <div
                            key={`${station}-${e.orderId}-${idx}`}
                            className={`absolute top-[6px] h-[22px] rounded-md ${bg} border border-black/20`}
                            style={{ left, width }}
                            title={`${e.orderId} | ${e.label} | ${e.start.toFixed(
                              1,
                            )}–${e.end.toFixed(1)}s`}
                          >
                            <div className="px-1 text-[10px] leading-[22px] truncate">
                              {e.orderId} · {e.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-2 text-[11px] text-black/60">
        <span>
          <span className="inline-block w-3 h-3 bg-emerald-300 border border-black/20 mr-1 align-middle" />
          station work
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-amber-300 border border-black/20 mr-1 align-middle" />
          cook service (start)
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-indigo-300 border border-black/20 mr-1 align-middle" />
          manual work (cook + station)
        </span>
      </div>
    </div>
  );
}
