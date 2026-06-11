import React, { useEffect, useRef } from "react";
import { istDateKey, shortDayLabel } from "../lib/time.js";

export default function DatePager({ dates, selected, onSelect }) {
  const ref = useRef(null);
  const today = istDateKey();

  useEffect(() => {
    const el = ref.current?.querySelector(`[data-day="${selected}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selected]);

  return (
    <div className="pager" ref={ref} role="tablist" aria-label="Match days">
      {dates.map((d) => {
        const { dow, dm } = shortDayLabel(d);
        return (
          <button
            key={d}
            data-day={d}
            role="tab"
            aria-selected={selected === d}
            className={"pager-day" + (selected === d ? " on" : "") + (d === today ? " today" : "")}
            onClick={() => onSelect(d)}
          >
            <div className="dow">{d === today ? "TODAY" : dow}</div>
            <div className="dm">{dm}</div>
          </button>
        );
      })}
    </div>
  );
}
