import React, { useState } from "react";
import { Link } from "react-router-dom";

/* Renders ✨ AI content: never auto-generates, nudges to Settings without a key,
   and renders model output as TEXT through a minimal formatter — never as HTML. */

function renderInline(text, keyBase) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <b key={keyBase + "-" + i}>{part}</b> : part));
}

export function AiText({ text }) {
  const paras = text
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.replace(/^#+\s*/gm, "").trim())
    .filter(Boolean);
  return (
    <div className="ai-body">
      {paras.map((p, i) => (
        <p key={i}>
          {p.split("\n").map((line, j, arr) => (
            <React.Fragment key={j}>
              {renderInline(line, `p${i}l${j}`)}
              {j < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}

export default function AiCard({ title, ai, cta = "✨ Generate", note }) {
  const { text, generatedAt, loading, error, generate, keyReady } = ai;
  // Previously generated text starts collapsed so long AI reads don't push the
  // rest of the page down; text you just asked for opens because you want it.
  const [open, setOpen] = useState(() => !text);
  const runGenerate = () => {
    setOpen(true);
    generate();
  };
  return (
    <div className="card ai-card">
      <div className="ai-head">
        {text ? (
          <button className="ai-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <span className="eyebrow">✨ {title}</span>
            <span className="ai-chev" aria-hidden="true">{open ? "▾ hide" : "▸ read"}</span>
          </button>
        ) : (
          <span className="eyebrow">✨ {title}</span>
        )}
        {!text && keyReady && (
          <button className="btn accent" onClick={runGenerate} disabled={loading}>
            {loading ? "Writing…" : cta}
          </button>
        )}
      </div>
      {!keyReady && (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          AI stories run on your own free Gemini key.{" "}
          <Link to="/settings">Add your key in Settings →</Link>
        </p>
      )}
      {keyReady && !text && !loading && !error && note && (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>{note}</p>
      )}
      {loading && !text && (
        <p className="pulse" style={{ fontSize: 13, color: "var(--muted)" }}>Gemini is writing…</p>
      )}
      {text && open && <AiText text={text} />}
      {error && <p className="ai-err">{error.message || String(error)}</p>}
      {text && open && (
        <div className="ai-foot">
          <span>
            AI-generated{generatedAt ? ` · ${generatedAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })} IST` : ""} · may contain mistakes
          </span>
          <button className="btn ghost" style={{ padding: "4px 10px", minHeight: 30 }} onClick={runGenerate} disabled={loading}>
            {loading ? "Writing…" : "↻ Redo"}
          </button>
        </div>
      )}
      {!text && keyReady && !loading && (
        <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
          Uses your Gemini free-tier quota · generated once, then cached on this device
        </p>
      )}
    </div>
  );
}
