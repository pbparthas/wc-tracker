import React, { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getProxyUrl, setProxyUrl, testApiKey,
  fetchFixtures, fetchLineups, fetchFixtureEvents,
  fetchFixtureStats, fetchPlayerStats, LEAGUES,
} from "../lib/apifootball.js";
import { fetchSummary } from "../lib/espn.js";

function Section({ title, children }) {
  return (
    <div className="card" style={{ padding: 14, marginBottom: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function JsonBlock({ label, data, color }) {
  if (!data) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: color || "var(--chalk)", marginBottom: 4 }}>{label}</div>
      <pre style={{
        fontSize: 11, color: "var(--muted)", background: "rgba(255,255,255,0.03)",
        padding: 10, borderRadius: 6, overflow: "auto", maxHeight: 300, whiteSpace: "pre-wrap",
        wordBreak: "break-word", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function CompareRow({ label, espn, apif }) {
  const e = espn ?? "—";
  const a = apif ?? "—";
  const match = String(e) === String(a);
  return (
    <tr>
      <td style={{ padding: "4px 8px", fontSize: 12, color: "var(--muted)" }}>{label}</td>
      <td style={{ padding: "4px 8px", fontSize: 12 }}>{String(e)}</td>
      <td style={{ padding: "4px 8px", fontSize: 12 }}>{String(a)}</td>
      <td style={{ padding: "4px 8px", fontSize: 12 }}>{match ? "✓" : "≠"}</td>
    </tr>
  );
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function ApiCompare() {
  const [proxyInput, setProxyInput] = useState(getProxyUrl);
  const [keyStatus, setKeyStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  const [date, setDate] = useState(TODAY);
  const [league, setLeague] = useState("worldcup");
  const [fixtures, setFixtures] = useState(null);
  const [loadingFixtures, setLoadingFixtures] = useState(false);

  const [selectedFixture, setSelectedFixture] = useState(null);
  const [espnId, setEspnId] = useState("");
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);

  const saveProxy = () => {
    setProxyUrl(proxyInput);
    setKeyStatus({ ok: true, msg: "Saved." });
  };

  const doTest = async () => {
    setProxyUrl(proxyInput);
    setTesting(true);
    setKeyStatus(null);
    try {
      const info = await testApiKey();
      setKeyStatus({
        ok: true,
        msg: `Proxy works! Plan: ${info.plan} · ${info.remaining}/${info.limitDay} requests remaining today`,
      });
    } catch (e) {
      setKeyStatus({ ok: false, msg: e.message });
    }
    setTesting(false);
  };

  const loadFixtures = async () => {
    setLoadingFixtures(true);
    setFixtures(null);
    try {
      const season = league === "worldcup" ? 2026 :
        ["ucl", "uel"].includes(league) ? 2025 : 2025;
      const list = await fetchFixtures(LEAGUES[league], { date, season });
      setFixtures(list);
    } catch (e) {
      setFixtures({ error: e.message });
    }
    setLoadingFixtures(false);
  };

  const runComparison = useCallback(async () => {
    if (!selectedFixture || !espnId) return;
    setComparing(true);
    setComparison(null);
    const result = { espn: {}, apif: {} };

    try {
      const espnLeague = league === "worldcup" ? "soccer/fifa.world" :
        league === "epl" ? "soccer/eng.1" :
        league === "laliga" ? "soccer/esp.1" :
        league === "bundesliga" ? "soccer/ger.1" :
        league === "seriea" ? "soccer/ita.1" :
        league === "ligue1" ? "soccer/fra.1" :
        league === "championship" ? "soccer/eng.2" :
        league === "ucl" ? "soccer/uefa.champions" :
        league === "uel" ? "soccer/uefa.europa" :
        "soccer/fifa.world";
      result.espn.summary = await fetchSummary(espnId, espnLeague);
    } catch (e) {
      result.espn.error = e.message;
    }

    try {
      result.apif.lineups = await fetchLineups(selectedFixture.id);
    } catch (e) {
      result.apif.lineupsError = e.message;
    }

    try {
      result.apif.events = await fetchFixtureEvents(selectedFixture.id);
    } catch (e) {
      result.apif.eventsError = e.message;
    }

    try {
      result.apif.stats = await fetchFixtureStats(selectedFixture.id);
    } catch (e) {
      result.apif.statsError = e.message;
    }

    try {
      result.apif.players = await fetchPlayerStats(selectedFixture.id);
    } catch (e) {
      result.apif.playersError = e.message;
    }

    result.apif.fixture = selectedFixture;
    setComparison(result);
    setComparing(false);
  }, [selectedFixture, espnId, league]);

  const espnSummary = comparison?.espn?.summary;
  const apifLineups = comparison?.apif?.lineups;
  const apifPlayers = comparison?.apif?.players;

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <Link to="/settings" style={{ fontSize: 13, textDecoration: "none" }}>← Settings</Link>
      <h2 className="disp" style={{ fontSize: 20, fontWeight: 800, margin: "10px 0" }}>API COMPARISON</h2>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
        Compare ESPN (current) vs API-Football side by side for the same match.
        Uses 5 API-Football requests per comparison.
      </p>

      {/* Step 1: Proxy URL */}
      <Section title="Step 1 — Proxy connection">
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
          API-Football calls go through a Cloudflare Worker proxy that holds the API key server-side.
          The default proxy is pre-configured — just hit "Test connection".
        </p>
        <div className="field">
          <label style={{ fontSize: 11, color: "var(--muted)" }}>Proxy URL</label>
          <input
            className="input"
            type="url"
            autoComplete="off"
            placeholder="https://golazo-api-proxy.YOUR.workers.dev"
            value={proxyInput}
            onChange={(e) => setProxyInput(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button className="btn accent" onClick={saveProxy}>Save</button>
          <button className="btn" onClick={doTest} disabled={testing || !proxyInput}>
            {testing ? "Testing…" : "Test connection"}
          </button>
        </div>
        {keyStatus && (
          <p style={{ marginTop: 8, fontSize: 12, color: keyStatus.ok ? "var(--saffron)" : "var(--live)" }}>
            {keyStatus.msg}
          </p>
        )}
      </Section>

      {/* Step 2: Pick a match */}
      {proxyInput && (
        <Section title="Step 2 — Pick a match from API-Football">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <select
              className="input"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              style={{ width: "auto", flex: 1 }}
            >
              <option value="worldcup">World Cup</option>
              <option value="epl">Premier League</option>
              <option value="laliga">La Liga</option>
              <option value="bundesliga">Bundesliga</option>
              <option value="seriea">Serie A</option>
              <option value="ligue1">Ligue 1</option>
              <option value="championship">Championship</option>
              <option value="ucl">Champions League</option>
              <option value="uel">Europa League</option>
            </select>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "auto" }}
            />
            <button className="btn accent" onClick={loadFixtures} disabled={loadingFixtures}>
              {loadingFixtures ? "Loading…" : "Fetch"}
            </button>
          </div>

          {fixtures?.error && (
            <p style={{ fontSize: 12, color: "var(--live)" }}>{fixtures.error}</p>
          )}

          {Array.isArray(fixtures) && fixtures.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>No matches found for this date/league.</p>
          )}

          {Array.isArray(fixtures) && fixtures.length > 0 && (
            <div style={{ maxHeight: 240, overflow: "auto" }}>
              {fixtures.map((f) => (
                <button
                  key={f.id}
                  className={"card" + (selectedFixture?.id === f.id ? "" : "")}
                  onClick={() => { setSelectedFixture(f); setEspnId(""); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                    padding: "8px 10px", marginBottom: 4, fontSize: 12,
                    border: selectedFixture?.id === f.id ? "1px solid var(--saffron)" : undefined,
                    background: selectedFixture?.id === f.id ? "rgba(255,183,77,0.08)" : undefined,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{f.home.name}</span>
                  {" "}
                  {f.goals.home ?? "–"} : {f.goals.away ?? "–"}
                  {" "}
                  <span style={{ fontWeight: 700 }}>{f.away.name}</span>
                  <span style={{ color: "var(--muted)", marginLeft: 8 }}>
                    [{f.status}] ID: {f.id} · {f.league.round}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Step 3: Enter ESPN ID and compare */}
      {selectedFixture && (
        <Section title="Step 3 — Enter ESPN match ID and compare">
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            Selected: <strong>{selectedFixture.home.name} vs {selectedFixture.away.name}</strong> (API-Football ID: {selectedFixture.id})
          </p>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
            Find the ESPN match ID from the app's match list (the number in the URL like /#/match/<strong>736498</strong>)
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              type="text"
              placeholder="ESPN match ID (e.g. 736498)"
              value={espnId}
              onChange={(e) => setEspnId(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn accent"
              onClick={runComparison}
              disabled={comparing || !espnId}
            >
              {comparing ? "Comparing…" : "Compare"}
            </button>
          </div>
        </Section>
      )}

      {/* Results */}
      {comparison && (
        <>
          <Section title="Match basics">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ padding: "4px 8px", fontSize: 11, textAlign: "left", color: "var(--muted)" }}>Field</th>
                  <th style={{ padding: "4px 8px", fontSize: 11, textAlign: "left", color: "#4fc3f7" }}>ESPN</th>
                  <th style={{ padding: "4px 8px", fontSize: 11, textAlign: "left", color: "#ffd54f" }}>API-Football</th>
                  <th style={{ padding: "4px 8px", fontSize: 11 }}></th>
                </tr>
              </thead>
              <tbody>
                <CompareRow label="Home" espn={espnSummary?.match?.home?.name} apif={comparison.apif.fixture?.home?.name} />
                <CompareRow label="Away" espn={espnSummary?.match?.away?.name} apif={comparison.apif.fixture?.away?.name} />
                <CompareRow label="Home goals" espn={espnSummary?.match?.hg} apif={comparison.apif.fixture?.goals?.home} />
                <CompareRow label="Away goals" espn={espnSummary?.match?.ag} apif={comparison.apif.fixture?.goals?.away} />
                <CompareRow label="Status" espn={espnSummary?.match?.status} apif={comparison.apif.fixture?.statusLong} />
                <CompareRow label="Venue" espn={espnSummary?.info?.venue || espnSummary?.match?.venue} apif={comparison.apif.fixture?.venue} />
                <CompareRow label="Referee" espn={espnSummary?.info?.referee} apif={comparison.apif.fixture?.referee} />
              </tbody>
            </table>
          </Section>

          <Section title="Lineups comparison">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4fc3f7", marginBottom: 6 }}>ESPN</div>
                {espnSummary?.lineups ? (
                  <>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Home formation: {espnSummary.lineups.home?.formation || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Starters: {espnSummary.lineups.home?.starters?.length || 0}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                      {(espnSummary.lineups.home?.starters || []).map((p) => p.name).join(", ")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                      Headshots: {(espnSummary.lineups.home?.starters || []).filter((p) => p.headshot).length}/
                      {espnSummary.lineups.home?.starters?.length || 0}
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 11, color: "var(--muted)" }}>
                    {comparison.espn.error || "No lineups"}
                  </p>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ffd54f", marginBottom: 6 }}>API-Football</div>
                {apifLineups?.length > 0 ? (
                  <>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Home formation: {apifLineups[0]?.formation || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Starters: {apifLineups[0]?.starters?.length || 0}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                      {(apifLineups[0]?.starters || []).map((p) => p.name).join(", ")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                      Photos: {(apifLineups[0]?.starters || []).filter((p) => p.photo).length}/
                      {apifLineups[0]?.starters?.length || 0}
                      {" + coach: "}{apifLineups[0]?.coach || "—"}
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 11, color: "var(--muted)" }}>
                    {comparison.apif.lineupsError || "No lineups"}
                  </p>
                )}
              </div>
            </div>
          </Section>

          <Section title="Player stats comparison">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4fc3f7", marginBottom: 6 }}>ESPN</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Players with stats: {espnSummary?.playerStats ? Object.keys(espnSummary.playerStats).length : 0}
                </div>
                {espnSummary?.playerStats && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    Stat keys: {[...new Set(Object.values(espnSummary.playerStats).flatMap(Object.keys))].join(", ")}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ffd54f", marginBottom: 6 }}>API-Football</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Players with stats: {apifPlayers ? apifPlayers.reduce((n, t) => n + t.players.length, 0) : 0}
                </div>
                {apifPlayers?.[0]?.players?.[0] && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    Sample ({apifPlayers[0].players[0].name}): rating {apifPlayers[0].players[0].rating},
                    {" "}{apifPlayers[0].players[0].passes} passes ({apifPlayers[0].players[0].passAccuracy}% acc),
                    {" "}{apifPlayers[0].players[0].shots} shots
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Match stats comparison">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4fc3f7", marginBottom: 6 }}>ESPN</div>
                {espnSummary?.stats ? (
                  espnSummary.stats.map((s) => (
                    <div key={s.label} style={{ fontSize: 11, color: "var(--muted)" }}>
                      {s.label}: {s.home} — {s.away}
                    </div>
                  ))
                ) : <p style={{ fontSize: 11, color: "var(--muted)" }}>No stats</p>}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ffd54f", marginBottom: 6 }}>API-Football</div>
                {comparison.apif.stats?.length > 0 ? (
                  Object.entries(comparison.apif.stats[0]?.stats || {}).map(([k, v]) => (
                    <div key={k} style={{ fontSize: 11, color: "var(--muted)" }}>
                      {k}: {v} — {comparison.apif.stats[1]?.stats?.[k] ?? "—"}
                    </div>
                  ))
                ) : <p style={{ fontSize: 11, color: "var(--muted)" }}>{comparison.apif.statsError || "No stats"}</p>}
              </div>
            </div>
          </Section>

          <Section title="Events / Timeline">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4fc3f7", marginBottom: 6 }}>ESPN ({espnSummary?.events?.length || 0} events)</div>
                {(espnSummary?.events || []).slice(0, 15).map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--muted)" }}>
                    {e.minute} {e.kind} — {e.player}{e.playerOut ? ` (off: ${e.playerOut})` : ""}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ffd54f", marginBottom: 6 }}>API-Football ({comparison.apif.events?.length || 0} events)</div>
                {(comparison.apif.events || []).slice(0, 15).map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--muted)" }}>
                    {e.minute}' {e.type}/{e.detail} — {e.player}{e.assist ? ` (${e.assist})` : ""}
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Headshot samples">
            <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>First 5 players from each source — do the photos actually load?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4fc3f7", marginBottom: 6 }}>ESPN</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(espnSummary?.lineups?.home?.starters || []).slice(0, 5).map((p, i) => (
                    <div key={i} style={{ textAlign: "center", width: 52 }}>
                      {p.headshot ? (
                        <img src={p.headshot} alt="" width={40} height={40} style={{ borderRadius: "50%", background: "#222" }}
                          onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#333", lineHeight: "40px", fontSize: 14, textAlign: "center" }}>
                          {p.jersey || "?"}
                        </div>
                      )}
                      <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name?.split(" ").pop()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ffd54f", marginBottom: 6 }}>API-Football</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(apifLineups?.[0]?.starters || []).slice(0, 5).map((p, i) => (
                    <div key={i} style={{ textAlign: "center", width: 52 }}>
                      {p.photo ? (
                        <img src={p.photo} alt="" width={40} height={40} style={{ borderRadius: "50%", background: "#222" }}
                          onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#333", lineHeight: "40px", fontSize: 14, textAlign: "center" }}>
                          {p.number || "?"}
                        </div>
                      )}
                      <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name?.split(" ").pop()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Raw JSON (expandable)">
            <details>
              <summary style={{ fontSize: 12, cursor: "pointer", color: "var(--saffron)" }}>ESPN raw summary</summary>
              <JsonBlock label="ESPN fetchSummary()" data={espnSummary} color="#4fc3f7" />
            </details>
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 12, cursor: "pointer", color: "var(--saffron)" }}>API-Football raw responses</summary>
              <JsonBlock label="Fixture" data={comparison.apif.fixture} color="#ffd54f" />
              <JsonBlock label="Lineups" data={apifLineups} color="#ffd54f" />
              <JsonBlock label="Events" data={comparison.apif.events} color="#ffd54f" />
              <JsonBlock label="Stats" data={comparison.apif.stats} color="#ffd54f" />
              <JsonBlock label="Player Stats" data={apifPlayers} color="#ffd54f" />
            </details>
          </Section>
        </>
      )}
    </div>
  );
}
