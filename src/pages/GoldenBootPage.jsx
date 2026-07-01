import React from "react";
import { Link } from "react-router-dom";
import TopScorers from "../components/TopScorers.jsx";

export default function GoldenBootPage() {
  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <Link to="/" style={{ fontSize: 13, textDecoration: "none" }}>← Home</Link>
      <h2 className="disp" style={{ fontSize: 20, fontWeight: 800, margin: "10px 0" }}>
        GOLDEN <span style={{ color: "var(--gold)" }}>BOOT</span>
      </h2>
      <TopScorers />
      <div style={{ height: 20 }} />
    </div>
  );
}
