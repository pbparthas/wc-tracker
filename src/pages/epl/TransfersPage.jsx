import React, { useEffect, useState } from "react";
import AiCard from "../../components/AiCard.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchTransactions, fetchTeams } from "../../lib/espn.js";
import { useCached } from "../../hooks/useCached.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useAiContent } from "../../hooks/useAiContent.js";
import { transferDigestPrompt, confirmedMovesPrompt, rumorMillPrompt } from "../../lib/prompts.js";
import { istDateKey, IST } from "../../lib/time.js";

const EPL = COMPETITIONS.epl;
const HOUR = 60 * 60 * 1000;

function WindowBar() {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const closes = new Date(EPL.window.closesIso);
  const msLeft = closes.getTime() - Date.now();
  const closesIst = closes.toLocaleString("en-IN", {
    timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
  if (msLeft <= 0) {
    return (
      <div className="card" style={{ padding: 14, marginBottom: 10 }}>
        <div className="eyebrow">{EPL.window.label}</div>
        <div className="disp" style={{ fontSize: 22, fontWeight: 800, color: "var(--muted)" }}>WINDOW CLOSED</div>
      </div>
    );
  }
  const deadlineDay = msLeft < 24 * HOUR;
  const finalWeek = msLeft < 7 * 24 * HOUR;
  return (
    <div className="card" style={{
      padding: 14, marginBottom: 10,
      borderColor: deadlineDay ? "var(--live)" : finalWeek ? "var(--saffron)" : undefined,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow">{EPL.window.label}</span>
        <span className="eyebrow" style={{ color: deadlineDay ? "var(--live)" : "var(--saffron)" }}>
          {deadlineDay && <span className="pulse">● </span>}OPEN
        </span>
      </div>
      <div className={"disp" + (deadlineDay ? " pulse" : "")} style={{
        fontSize: deadlineDay ? 28 : 24, fontWeight: 800, margin: "6px 0 2px",
        color: deadlineDay ? "var(--live)" : "var(--saffron)",
      }}>
        {deadlineDay
          ? `DEADLINE DAY — ${Math.max(1, Math.floor(msLeft / HOUR))}H LEFT`
          : `${Math.ceil(msLeft / (24 * HOUR))} DAYS LEFT`}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        Deadline: {closesIst} <span style={{ color: "var(--saffron)", fontWeight: 600 }}>IST</span>
        {finalWeek && !deadlineDay && <span style={{ color: "var(--saffron)", marginLeft: 8 }}>Final week!</span>}
      </div>
    </div>
  );
}

export default function TransfersPage() {
  const { data: moves, loading, error, refresh } = useCached("transfers:epl", 30 * 60 * 1000, () =>
    fetchTransactions(EPL.slug)
  );
  const { data: clubs } = useCached("clubs:epl", 7 * 24 * HOUR, () => fetchTeams(EPL.slug));
  const { favs } = useFavorites("epl");
  const [mine, setMine] = useState(false);
  const [showFeed, setShowFeed] = useState(false);

  const favNames = favs
    .map((id) => (clubs || []).find((c) => c.id === id)?.name)
    .filter(Boolean);

  const digest = useAiContent(
    "transferDigest3:epl:" + istDateKey(),
    () => transferDigestPrompt(EPL.name),
    { ttlMs: 6 * HOUR, grounding: true }
  );

  const rumors = useAiContent(
    "transferRumors2:epl:" + istDateKey(),
    () => rumorMillPrompt(EPL.name),
    { ttlMs: 6 * HOUR, grounding: true }
  );

  const movesAi = useAiContent(
    "transferMoves2:epl:" + istDateKey(),
    () => confirmedMovesPrompt(EPL.name),
    { ttlMs: 6 * HOUR, grounding: true }
  );

  const feedDown = !!error && !moves;

  const isMine = (m) =>
    (m.toId && favs.includes(m.toId)) ||
    (m.fromId && favs.includes(m.fromId)) ||
    favNames.some((n) => n === m.to || n === m.from);
  const shown = (moves || []).filter((m) => !mine || isMine(m));

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <span className="eyebrow">{EPL.flag} {EPL.name} · transfers</span>
        <button className="iconbtn" style={{ fontSize: 14, padding: "6px 12px" }} onClick={refresh} disabled={loading} aria-label="Refresh transfers">
          {loading ? "…" : "↻"}
        </button>
      </div>

      <WindowBar />

      <AiCard
        title="Today's transfer digest"
        ai={digest}
        cta="✨ What happened today?"
        note="Confirmed deals first, then a clearly labelled rumor mill — searched live, never invented."
      />

      <AiCard
        title="Rumor tracker"
        ai={rumors}
        cta="✨ Latest rumors"
        note="Credible rumors only, each rated by firmness — powered by live search."
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 0 8px" }}>
        <h2 className="disp" style={{ fontSize: 18, fontWeight: 800 }}>CONFIRMED MOVES</h2>
        {favs.length > 0 && (
          <button className={"iconbtn" + (mine ? " on" : "")} style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setMine((m) => !m)}>
            ★ My clubs
          </button>
        )}
      </div>

      <AiCard
        title="Confirmed moves (via search)"
        ai={movesAi}
        cta="✨ Fetch confirmed deals"
        note="Gemini searches for this window's completed transfers — confirmed only, newest first."
      />

      {!feedDown && (moves?.length ?? 0) > 0 && (
        <button
          className="ai-toggle"
          onClick={() => setShowFeed((s) => !s)}
          style={{ width: "100%", padding: "8px 0", marginBottom: 8, fontSize: 12, color: "var(--muted)" }}
        >
          <span>ESPN feed · {moves.length} moves</span>
          <span className="ai-chev">{showFeed ? "▾ hide" : "▸ show"}</span>
        </button>
      )}

      {feedDown && (
        <div className="card" style={{ padding: 12, marginBottom: 10, fontSize: 12, color: "var(--muted)" }}>
          ESPN's transfer feed isn't answering ({error}).
        </div>
      )}

      {loading && !moves && <p className="pulse" style={{ color: "var(--muted)", fontSize: 13 }}>Loading transfers…</p>}

      {showFeed && shown.map((m, i) => (
        <div key={m.player + m.date + i} className="card" style={{ padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <b style={{ fontSize: 14 }}>{m.player}</b>
            {m.fee && <span style={{ color: "var(--saffron)", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>{m.fee}</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            {m.fromLogo && <img src={m.fromLogo} alt="" width={14} height={14} loading="lazy" />}
            {m.from || "Free agent"} <span style={{ color: "var(--saffron)" }}>→</span>
            {m.toLogo && <img src={m.toLogo} alt="" width={14} height={14} loading="lazy" />}
            <b style={{ color: "var(--chalk)" }}>{m.to}</b>
            {m.date && <span>· {new Date(m.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST })}</span>}
          </div>
        </div>
      ))}
      {showFeed && moves && shown.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          {mine ? "No moves involving your clubs yet this window." : "No confirmed moves reported yet."}
        </p>
      )}
      <p style={{ fontSize: 11, color: "var(--muted)", margin: "10px 0 20px" }}>
        AI features searched via your Gemini key · ESPN public feed
      </p>
    </div>
  );
}
