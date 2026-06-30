/* Builds the knockout bracket from a fixed 2026 skeleton (data/bracket2026.js)
   overlaid with live fixtures. The skeleton guarantees the full bracket — every
   round, correct labels, official dates/venues and feeder slots ("Winner Group
   A", "3rd Group C/E/F/H", "Winner Match 73") — renders immediately, instead of
   depending on the feed to publish knockout fixtures. Live fixtures snap onto
   their slot by kickoff proximity (the skeleton's dates are authoritative, so
   this needs no agreement with the feed on round labels or venue names) and
   fill in real teams, scores and kickoff times as matchups confirm. */
import { KO_SKELETON } from "../data/bracket2026.js";
import { ROUNDS } from "../data/phases.js";

const KO_START = Date.parse("2026-06-28T00:00:00Z");
// A live fixture binds to a slot only within this gap; nearest slot wins, so
// this is just the "no slot at all" cutoff. Rounds are days apart, so it can be
// generous without risking a cross-round mis-bind.
const BIND_TOLERANCE_MS = 18 * 60 * 60 * 1000;
// Team-identity binding tolerates much larger time drift (the skeleton's time
// may be off) but still won't reach across rounds: a team's matches in adjacent
// rounds are days apart, well beyond this window.
const TEAM_BIND_TOLERANCE_MS = 48 * 60 * 60 * 1000;

// A stable identity for matching feed teams against resolved feeder teams.
const teamKey = (t) => (t?.code || t?.name || "").toString().trim().toUpperCase();

const GROUP_WINNER = /^Winner Group ([A-L])$/i;
const GROUP_RUNNERUP = /^Runner-up Group ([A-L])$/i;
const WINNER_MATCH = /^Winner Match (\d+)$/i;
const LOSER_MATCH = /^Loser Match (\d+)$/i;
const ROUND_LABEL = Object.fromEntries(ROUNDS.map((r) => [r.id, r.label]));

/* Winner / loser of a finished, decided knockout fixture (penalties break a
   level tie). Used to resolve "Winner Match 74" feeders once match 74 is done. */
function decideResult(f) {
  if (!f || f.state !== "post") return null;
  if (f.hg > f.ag) return { winner: f.home, loser: f.away };
  if (f.ag > f.hg) return { winner: f.away, loser: f.home };
  if (f.phg != null && f.pag != null) {
    if (f.phg > f.pag) return { winner: f.home, loser: f.away };
    if (f.pag > f.phg) return { winner: f.away, loser: f.home };
  }
  return null;
}

// A feed fixture is a knockout fixture if it isn't a group game and either
// carries a knockout round label or kicks off on/after the knockout window.
function isKnockoutFixture(m) {
  const t = new Date(m.kickoff).getTime();
  if (isNaN(t)) return false;
  if (/^group/i.test(m.stage || "")) return false;
  return !!m.stage || t >= KO_START;
}

// A group is "settled" once every team has played its three matches, so the top
// two are final and safe to drop into the bracket. Until then we leave the
// feeder label ("Winner Group A") in place rather than show a team that could
// still change.
function groupSettled(rows) {
  return Array.isArray(rows) && rows.length >= 2 && rows.every((e) => (e.p ?? 0) >= 3);
}

/* Resolve a feeder label to a real team. Group winners/runners-up come from the
   settled standings; "Winner Match N" / "Loser Match N" come from the results of
   the matches already played, so a later-round slot fills in as soon as the side
   that feeds it is decided. Third-place slots stay as labels. */
function resolveFeeder(label, standings, results) {
  let m = GROUP_WINNER.exec(label);
  if (m) {
    const g = standings?.[m[1].toUpperCase()];
    return groupSettled(g) ? g[0].team : null;
  }
  m = GROUP_RUNNERUP.exec(label);
  if (m) {
    const g = standings?.[m[1].toUpperCase()];
    return groupSettled(g) ? g[1].team : null;
  }
  m = WINNER_MATCH.exec(label);
  if (m) return results?.get(Number(m[1]))?.winner || null;
  m = LOSER_MATCH.exec(label);
  if (m) return results?.get(Number(m[1]))?.loser || null;
  return null;
}

function placeholderTie(slot, standings, results) {
  const home = resolveFeeder(slot.home, standings, results);
  const away = resolveFeeder(slot.away, standings, results);
  return {
    id: `ko-${slot.no}`,
    matchNo: slot.no,
    home: home || { code: null, name: slot.home, flag: "", logo: null },
    away: away || { code: null, name: slot.away, flag: "", logo: null },
    hg: null,
    ag: null,
    state: "pre",
    status: "UP",
    kickoff: slot.date,
    city: slot.city,
    venue: slot.venue,
    stage: ROUND_LABEL[slot.round] || slot.round,
    placeholder: true,
  };
}

/* Bind the live knockout fixtures onto the static skeleton slots. Returns the
   slots (with resolved feeder teams), a slotNo->fixture map, and the set of
   fixture ids that were consumed. Shared by the bracket and the merged schedule
   so both agree on what's bound where. */
function bindSkeleton(liveMatches, standings) {
  const ko = (liveMatches || []).filter(isKnockoutFixture);

  const slots = KO_SKELETON.map((s) => ({
    ...s,
    t: Date.parse(s.date),
    homeTeam: resolveFeeder(s.home, standings),
    awayTeam: resolveFeeder(s.away, standings),
  }));

  const bound = new Map();
  const usedFixtures = new Set();

  // Pass 1 — bind by team identity. A fixture whose team matches a slot's
  // resolved feeder (e.g. the slot's "Winner Group A" resolved to Argentina, and
  // the fixture is Argentina vs Cabo Verde) IS that slot's match, regardless of
  // how far the feed's kickoff time drifts from the skeleton's. This also pins
  // the third-place opponent the standings can't resolve. A loose time guard
  // keeps a team's later-round fixture from matching its earlier-round slot.
  const cands = [];
  for (const f of ko) {
    const fh = teamKey(f.home);
    const fa = teamKey(f.away);
    if (!fh && !fa) continue;
    for (const s of slots) {
      if (Math.abs(new Date(f.kickoff).getTime() - s.t) > TEAM_BIND_TOLERANCE_MS) continue;
      const sh = teamKey(s.homeTeam);
      const sa = teamKey(s.awayTeam);
      let score = 0;
      if (sh && (sh === fh || sh === fa)) score++;
      if (sa && (sa === fh || sa === fa)) score++;
      if (score) cands.push({ no: s.no, fixture: f, fid: f.id, score });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands) {
    if (bound.has(c.no) || usedFixtures.has(c.fid)) continue;
    bound.set(c.no, c.fixture);
    usedFixtures.add(c.fid);
  }

  // Pass 2 — bind whatever's left to the closest free slot by kickoff time
  // (covers fixtures whose teams aren't resolvable yet, e.g. two third-placed
  // sides, and early fixtures before any group has settled).
  const pairs = [];
  for (const s of slots) {
    if (bound.has(s.no)) continue;
    for (const f of ko) {
      if (usedFixtures.has(f.id)) continue;
      const delta = Math.abs(new Date(f.kickoff).getTime() - s.t);
      if (delta <= BIND_TOLERANCE_MS) pairs.push({ no: s.no, fixture: f, fid: f.id, delta });
    }
  }
  pairs.sort((a, b) => a.delta - b.delta);
  for (const p of pairs) {
    if (bound.has(p.no) || usedFixtures.has(p.fid)) continue;
    bound.set(p.no, p.fixture);
    usedFixtures.add(p.fid);
  }

  // Decided results per match number, so later-round feeders can resolve.
  const results = new Map();
  for (const s of slots) {
    const r = decideResult(bound.get(s.no));
    if (r) results.set(s.no, r);
  }

  return { ko, slots, bound, usedFixtures, results };
}

export function assembleBracket(liveMatches, standings) {
  const { slots, bound, results } = bindSkeleton(liveMatches, standings);
  return ROUNDS.map((round) => {
    const matches = slots
      .filter((s) => s.round === round.id)
      .sort((a, b) => a.t - b.t)
      .map((s) => withMatchNo(bound.get(s.no), s) || placeholderTie(s, standings, results));
    return { ...round, matches };
  });
}

// Tag a bound fixture with the skeleton match number of the slot it filled, so
// the card can show "Match 73" to match the "Winner Match 73" feeder labels.
function withMatchNo(fixture, slot) {
  return fixture ? { ...fixture, matchNo: slot.no } : null;
}

/* The full match list for the Matches tab: group fixtures from the feed, plus
   every knockout slot — a bound live fixture where one exists, otherwise a
   skeleton placeholder (resolved teams where the group is settled). This keeps
   the schedule populated past the group stage even before the feed publishes
   the knockout fixtures. Sorted by kickoff. */
export function mergeKnockoutSchedule(liveMatches, standings) {
  const { ko, slots, bound, usedFixtures, results } = bindSkeleton(liveMatches, standings);
  const groupFixtures = (liveMatches || []).filter((m) => !isKnockoutFixture(m));
  const slotMatches = slots
    .slice()
    .sort((a, b) => a.t - b.t)
    .map((s) => withMatchNo(bound.get(s.no), s) || placeholderTie(s, standings, results));
  // Any feed knockout fixture that didn't bind to a slot — keep it rather than
  // drop real data.
  const leftovers = ko.filter((f) => !usedFixtures.has(f.id));
  return [...groupFixtures, ...slotMatches, ...leftovers].sort(
    (a, b) => new Date(a.kickoff) - new Date(b.kickoff)
  );
}
