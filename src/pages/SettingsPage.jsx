import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  getKey, setKey, forgetKey, hasKey, isRemembered,
  getModel, setModel, testKey, DEFAULT_MODEL,
} from "../lib/gemini.js";
import { clearPrefix } from "../lib/storage.js";
import { useFavorites } from "../hooks/useFavorites.js";
import { GROUPS, TEAMS } from "../data/teams.js";
import InstallCard from "../components/InstallCard.jsx";

export default function SettingsPage() {
  const [keyInput, setKeyInput] = useState(() => getKey());
  const [remember, setRemember] = useState(() => isRemembered() || !hasKey());
  const [model, setModelInput] = useState(getModel);
  const [status, setStatus] = useState(null); // {ok, msg}
  const [testing, setTesting] = useState(false);
  const [cleared, setCleared] = useState(null);
  const [shared, setShared] = useState(null);
  const { favs, toggle } = useFavorites();

  const share = async () => {
    const data = {
      title: "Golazo · World Cup 2026",
      text: "Live World Cup scores in IST — free, no ads, works offline.",
      url: "https://pbparthas.github.io/wc-tracker/",
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        setShared("Link copied to clipboard!");
      }
    } catch { /* user cancelled the share sheet */ }
  };

  const save = () => {
    setKey(keyInput, remember);
    setModel(model);
    setStatus({ ok: true, msg: keyInput ? "Saved on this device." : "Key removed." });
  };

  const test = async () => {
    setKey(keyInput, remember);
    setModel(model);
    setTesting(true);
    setStatus(null);
    try {
      await testKey();
      setStatus({ ok: true, msg: "Key works — AI features are live. ✨" });
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    }
    setTesting(false);
  };

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <Link to="/" style={{ fontSize: 13, textDecoration: "none" }}>← Home</Link>
      <h2 className="disp" style={{ fontSize: 20, fontWeight: 800, margin: "10px 0" }}>SETTINGS</h2>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Gemini AI (optional)</div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
          Previews, recaps and digests run on your own free Gemini key. Get one in a minute at{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer noopener">
            aistudio.google.com/apikey
          </a>{" "}
          — no card needed.
        </p>
        <div className="field">
          <label htmlFor="gkey">API key</label>
          <input
            id="gkey"
            className="input"
            type="password"
            autoComplete="off"
            placeholder="Paste your Gemini API key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
        </div>
        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember on this device
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            (off = wiped when the app closes)
          </span>
        </label>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="gmodel">Model</label>
          <input
            id="gmodel"
            className="input"
            list="models"
            value={model}
            onChange={(e) => setModelInput(e.target.value)}
            placeholder={DEFAULT_MODEL}
          />
          <datalist id="models">
            <option value="gemini-2.5-flash" />
            <option value="gemini-2.5-flash-lite" />
            <option value="gemini-2.0-flash" />
          </datalist>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <button className="btn accent" onClick={save}>Save</button>
          <button className="btn" onClick={test} disabled={testing || !keyInput}>
            {testing ? "Testing…" : "Test key"}
          </button>
          {hasKey() && (
            <button
              className="btn ghost"
              onClick={() => {
                forgetKey();
                setKeyInput("");
                setStatus({ ok: true, msg: "Key forgotten." });
              }}
            >
              Forget key
            </button>
          )}
        </div>
        {status && (
          <p style={{ marginTop: 10, fontSize: 13, color: status.ok ? "var(--saffron)" : "var(--live)" }}>{status.msg}</p>
        )}
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
          🔒 Your key is stored only on this device and sent only to Google (in a header, never a URL).
          It never touches this app's servers — there are none.
        </p>
      </div>

      <InstallCard />

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Favourite teams</div>
        {GROUPS.map((g) => (
          <div key={g.id} className="team-grid" style={{ marginBottom: 6 }}>
            {g.teams.map((c) => (
              <button
                key={c}
                className={"iconbtn" + (favs.includes(c) ? " on" : "")}
                onClick={() => toggle(c)}
                style={{ fontSize: 11, padding: "6px 2px" }}
              >
                {TEAMS[c].flag} {c}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Storage</div>
        <button
          className="btn"
          onClick={() => setCleared(clearPrefix(""))}
        >
          Clear cached data
        </button>
        {cleared !== null && (
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            Cleared {cleared} cached entries (key, favourites and preferences kept).
          </p>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20, fontSize: 12, color: "var(--muted)" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>About</div>
        <p style={{ marginBottom: 10 }}>
          Golazo · FIFA World Cup 2026 tracker. Live data from ESPN's public feed; stories by Gemini with
          your own key. No accounts, no analytics, no tracking — everything stays on your device.
        </p>
        <p style={{ marginBottom: 12 }}>
          Unofficial fan project — not affiliated with or endorsed by FIFA, ESPN or any team.
          All trademarks belong to their owners.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={share}>📤 Share Golazo</button>
          <a
            className="btn ghost"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            href="https://github.com/pbparthas/wc-tracker/issues"
            target="_blank"
            rel="noreferrer noopener"
          >
            🐞 Report a problem
          </a>
        </div>
        {shared && <p style={{ marginTop: 8, color: "var(--saffron)" }}>{shared}</p>}
      </div>
    </div>
  );
}
