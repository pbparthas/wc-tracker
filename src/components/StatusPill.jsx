import React from "react";

export default function StatusPill({ status }) {
  if (status.startsWith("LIVE") || status === "HT")
    return (
      <span style={{ color: "var(--live)", fontWeight: 700, fontSize: 11, letterSpacing: ".1em" }}>
        <span
          className="pulse"
          style={{ display: "inline-block", width: 7, height: 7, borderRadius: 99, background: "var(--live)", marginRight: 5 }}
        />
        {status}
      </span>
    );
  if (status === "FT")
    return <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700, letterSpacing: ".1em" }}>FULL TIME</span>;
  return null;
}
