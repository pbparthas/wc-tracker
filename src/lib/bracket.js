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

const GROUP_WINNER = /^Winner Group ([A-L])$/i;
const GROUP_RUNNERUP = /^Runner-up Group ([A-L])$/i;

// A group is "settled" once every team has played its three matches, so the top
// two are final and safe to drop into the bracket. Until then we leave the
// feeder label ("Winner Group A") in place rather than show a team that could
// still change.
function groupSettled(rows) {
  return Array.isArray(rows) && rows.length >= 2 && rows.every((e) => (e.p ?? 0) >= 3);
}

/* Resolve a feeder label to a real qualified team from the live standings.
   Group winners and runners-up resolve once their group is settled; third-place
   slots ("3rd Group C/E/F/H") and "Winner Match N" depend on results that don't
   exist yet, so they stay as labels. */
function resolveFeeder(label, standings) {
  if (!standings) return null;
  let m = GROUP_WINNER.exec(label);
  if (m) {
    const g = standings[m[1].toUpperCase()];
    return groupSettled(g) ? g[0].team : null;
  }
  m = GROUP_RUNNERUP.exec(label);
  if (m) {
    const g = standings[m[1].toUpperCase()];
    return groupSettled(g) ? g[1].team : null;
  }
  return null;
}

function placeholderTie(slot, standings) {
  const home = resolveFeeder(slot.home, standings);
  const away = resolveFeeder(slot.away, standings);
  return {
    id: `ko-${slot.no}`,
    home: home || { code: null, name: slot.home, flag: "", logo: null },
    away: away || { code: null, name: slot.away, flag: "", logo: null },
    hg: null,
    ag: null,
    state: "pre",
    status: "UP",
    kickoff: slot.date,
    city: slot.city,
    venue: slot.venue,
    stage: slot.round,
    placeholder: true,
  };
}

export function assembleBracket(liveMatches, standings) {
  const ko = (liveMatches || []).filter((m) => {
    const t = new Date(m.kickoff).getTime();
    if (isNaN(t)) return false;
    if (/^group/i.test(m.stage || "")) return false;
    // Explicit knockout label, or any post-group-stage fixture whose round the
    // feed left blank (API-Football sometimes ships an empty round note).
    return !!m.stage || t >= KO_START;
  });

  const slots = KO_SKELETON.map((s) => ({ ...s, t: Date.parse(s.date) }));

  // Greedily bind each fixture to the closest free slot by kickoff time.
  const pairs = [];
  for (const s of slots) {
    for (const f of ko) {
      const delta = Math.abs(new Date(f.kickoff).getTime() - s.t);
      if (delta <= BIND_TOLERANCE_MS) pairs.push({ no: s.no, fixture: f, fid: f.id, delta });
    }
  }
  pairs.sort((a, b) => a.delta - b.delta);
  const bound = new Map();
  const usedFixtures = new Set();
  for (const p of pairs) {
    if (bound.has(p.no) || usedFixtures.has(p.fid)) continue;
    bound.set(p.no, p.fixture);
    usedFixtures.add(p.fid);
  }

  return ROUNDS.map((round) => {
    const matches = slots
      .filter((s) => s.round === round.id)
      .sort((a, b) => a.t - b.t)
      .map((s) => bound.get(s.no) || placeholderTie(s, standings));
    return { ...round, matches };
  });
}
