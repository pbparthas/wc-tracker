import React, { useEffect, useState } from "react";
import Flag from "./Flag.jsx";
import StatusPill from "./StatusPill.jsx";
import { istParts, istDayLabel } from "../lib/time.js";

export default function Hero({ matches }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const live = matches.find((m) => m.state === "in");
  const next = matches
    .filter((m) => m.state === "pre" && new Date(m.kickoff) > new Date())
    .sort((x, y) => new Date(x.kickoff) - new Date(y.kickoff))[0];
  // Between days (or after the last whistle of the night): latest final score.
  const last =
    !live && !next
      ? matches
          .filter((m) => m.state === "post")
          .sort((x, y) => new Date(x.kickoff) - new Date(y.kickoff))
          .pop()
      : null;
  const m = live || next || last;

  let countdown = null;
  if (!live && next) {
    let s = Math.max(0, Math.floor((new Date(next.kickoff) - Date.now()) / 1000));
    const h = Math.floor(s / 3600);
    s %= 3600;
    const mn = Math.floor(s / 60);
    const sc = s % 60;
    countdown = `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}:${String(sc).padStart(2, "0")}`;
  }

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid var(--line)",
        background: "linear-gradient(180deg, var(--grad-hi) 0%, var(--grad-lo) 100%)",
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 680 220" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.14 }}>
        <circle cx="340" cy="260" r="190" fill="none" stroke="var(--chalk)" strokeWidth="2" />
        <line x1="0" y1="218" x2="680" y2="218" stroke="var(--chalk)" strokeWidth="2" />
        <circle cx="340" cy="260" r="4" fill="var(--chalk)" />
      </svg>
      <div className="wrap" style={{ position: "relative", padding: "18px 14px 22px" }}>
        <div className="eyebrow" style={{ marginBottom: 2 }}>FIFA World Cup 2026 · USA · Mexico · Canada</div>
        {m ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Flag team={m.home} size={30} />
              <span className="disp" style={{ fontSize: 22, fontWeight: 800 }}>
                {live || last ? `${m.hg ?? 0} : ${m.ag ?? 0}` : "vs"}
              </span>
              <Flag team={m.away} size={30} />
              <span style={{ fontWeight: 600 }}>
                {m.home.name} – {m.away.name}
              </span>
            </div>
            {live ? (
              <div style={{ marginTop: 8 }}>
                <StatusPill status={live.status} />
              </div>
            ) : next ? (
              <div style={{ marginTop: 10 }}>
                <span className="disp" style={{ fontSize: 40, fontWeight: 800, color: "var(--saffron)", fontVariantNumeric: "tabular-nums" }}>
                  {countdown}
                </span>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {istDayLabel(m.kickoff)} · {istParts(m.kickoff)?.time}{" "}
                  <span style={{ color: "var(--saffron)", fontWeight: 600 }}>IST</span> · {m.city}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                FULL-TIME · {istParts(m.kickoff)?.day} · {m.stage}
              </div>
            )}
          </div>
        ) : (
          <p style={{ marginTop: 12, color: "var(--muted)" }}>
            48 teams · 104 matches · 11 June – 19 July. Pull the latest fixtures with refresh.
          </p>
        )}
      </div>
    </div>
  );
}
