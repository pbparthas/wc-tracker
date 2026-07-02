/* Every prompt injects authoritative ESPN facts so the model never has to
   rely on (stale) training data for results. */
import { istParts, IST } from "./time.js";

function istToday() {
  return new Date().toLocaleDateString("en-IN", {
    timeZone: IST, weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

/* Rebuilt per call so the date anchor is always current. The date is the fix for
   the model otherwise guessing tense from stale training data — matches before
   today are played, matches today or later are not. */
export function systemInstruction() {
  return (
    'You are a football writer for "Golazo", an India-based FIFA World Cup 2026 tracker. ' +
    `Today is ${istToday()} (IST) — treat this as the present moment. Any match dated before today has already been ` +
    "played; any match dated today or later has NOT been played yet, so write about it in the future tense and never " +
    "state a score or result for it. " +
    "The match facts provided in each request are authoritative and current — trust them over your training data, " +
    "and never invent scores, scorers or events. Write 150-250 words, vivid but factual. All kickoff times you mention " +
    "are already in IST. Use light markdown only: short paragraphs and **bold** for emphasis. No headings, no bullet lists."
  );
}

/* Kept for callers that still import the constant; prefer systemInstruction(). */
export const SYSTEM = systemInstruction();

const row = (r) => `${r.team.name}: P${r.p} W${r.w} D${r.d} L${r.l} GD${r.gf - r.ga} Pts${r.pts}`;

export function previewPrompt(match, standings) {
  const p = istParts(match.kickoff);
  const lines = [
    `Write a pre-match preview for this FIFA World Cup 2026 match:`,
    `${match.home.name} vs ${match.away.name} — ${match.stage}${match.city ? ", " + match.city : ""}.`,
    `Kickoff: ${p ? `${p.day} at ${p.time} IST` : "TBC"}.`,
  ];
  for (const t of [match.home, match.away]) {
    if (t.trivia) lines.push(`${t.name} background: ${t.trivia}`);
    const g = t.group && standings?.[t.group];
    const r = g?.find((x) => x.team.code === t.code);
    if (r) lines.push(`${t.name} current group ${t.group} record: ${row(r)}.`);
  }
  lines.push("Cover the storylines, what is at stake, and players to watch.");
  return lines.join("\n");
}

export function recapPrompt(match, summary) {
  const lines = [
    `Write a post-match recap of this FIFA World Cup 2026 result:`,
    `${match.home.name} ${match.hg} - ${match.ag} ${match.away.name} (${match.stage}${match.city ? ", " + match.city : ""}).`,
  ];
  const evs = (summary?.events || []).filter((e) => ["goal", "og", "pen", "red"].includes(e.kind));
  if (evs.length) {
    lines.push("Key events (authoritative):");
    for (const e of evs) lines.push(`- ${e.minute} ${e.label}: ${e.player || e.text}${e.team ? ` (${e.team.name})` : ""}`);
  }
  if (summary?.info?.attendance) lines.push(`Attendance: ${summary.info.attendance}.`);
  lines.push("Tell the story of the match and what the result means.");
  return lines.join("\n");
}

export function digestPrompt(dayLabel, finished, upcoming) {
  const lines = [`Write a daily digest for Indian fans for ${dayLabel}.`];
  if (finished.length) {
    lines.push("Results so far (authoritative):");
    for (const m of finished) lines.push(`- ${m.home.name} ${m.hg}-${m.ag} ${m.away.name} (${m.stage})`);
  } else {
    lines.push("No completed matches yet today.");
  }
  if (upcoming.length) {
    lines.push("Coming up tonight IST (authoritative):");
    for (const m of upcoming) {
      const p = istParts(m.kickoff);
      lines.push(`- ${m.home.name} vs ${m.away.name} (${m.stage}) at ${p ? p.time : "TBC"} IST`);
    }
  }
  lines.push("Summarise the action and tell fans what to stay up for tonight.");
  return lines.join("\n");
}

export function teamPrompt(team, standings, fixtures) {
  const lines = [
    `Write a team deep-dive on ${team.name} at the FIFA World Cup 2026 (Group ${team.group}).`,
    `Background: ${team.trivia}`,
  ];
  const g = standings?.[team.group];
  if (g?.length) {
    lines.push(`Current Group ${team.group} table (authoritative):`);
    g.forEach((r, i) => lines.push(`${i + 1}. ${row(r)}`));
  }
  const played = fixtures.filter((m) => m.state === "post");
  if (played.length) {
    lines.push("Their results so far (authoritative):");
    for (const m of played) lines.push(`- ${m.home.name} ${m.hg}-${m.ag} ${m.away.name}`);
  }
  lines.push("Cover their star players, style of play, key storylines and realistic outlook in this tournament.");
  return lines.join("\n");
}

/* Emergency fallback when ESPN is unreachable — uses Google Search grounding,
   so the answer is clearly labelled as approximate in the UI. */
export function h2hPrompt(match, allMatches) {
  const form = (t) =>
    allMatches
      .filter((m) => m.state === "post" && (m.home.code === t.code || m.away.code === t.code))
      .map((m) => `- ${m.home.name} ${m.hg}-${m.ag} ${m.away.name} (${m.stage})`);
  const lines = [
    `Write a head-to-head and form guide for ${match.home.name} vs ${match.away.name} at the FIFA World Cup 2026.`,
  ];
  for (const t of [match.home, match.away]) {
    if (t.trivia) lines.push(`${t.name} background: ${t.trivia}`);
    const f = form(t);
    if (f.length) {
      lines.push(`${t.name} results this tournament (authoritative):`, ...f);
    } else {
      lines.push(`${t.name}: no completed matches this tournament yet.`);
    }
  }
  lines.push(
    "Cover their World Cup head-to-head history and memorable past meetings from your knowledge, their current " +
      "form using only the results listed above, and who the pattern favours. If you are unsure of exact " +
      "historical numbers, describe the history qualitatively rather than inventing counts."
  );
  return lines.join("\n");
}

/* Qualification scenarios during groups; knockout path once seeded. */
export function roadPrompt(team, standings, third, fixtures, rounds, isOut = false) {
  const lines = [
    `Explain the road ahead for ${team.name} at the FIFA World Cup 2026 — exactly what fans checking qualification scenarios want to know.`,
    "Format rules (authoritative): 12 groups of 4; the top 2 of each group AND the 8 best third-placed teams advance to a Round of 32, then R16, QF, SF and the final.",
  ];
  const g = standings?.[team.group];
  if (g?.length) {
    lines.push(`Current Group ${team.group} table (authoritative):`);
    g.forEach((r, i) => lines.push(`${i + 1}. ${row(r)}`));
  }
  const left = fixtures.filter((m) => m.state !== "post");

  // Deterministic ceiling so the model never claims a chance that the maths rules out.
  const myRow = g?.find((r) => r.team.code === team.code);
  if (myRow) {
    const remaining = left.length;
    const maxPts = myRow.pts + remaining * 3;
    const playedN = myRow.p;
    lines.push(
      `Maths anchor (authoritative): ${team.name} have ${myRow.pts} point(s) after ${playedN} game(s) with ` +
        `${remaining} still to play, so they can finish on at most ${maxPts} point(s).`
    );
  }
  if (left.length) {
    lines.push("Their remaining fixtures (authoritative):");
    for (const m of left) {
      const p = istParts(m.kickoff);
      lines.push(`- ${m.home.name} vs ${m.away.name} (${m.stage})${p ? ` — ${p.day}, ${p.time} IST` : ""}`);
    }
  }
  if (third?.length) {
    lines.push("Third-place ranking across all groups (authoritative; top 8 advance):");
    for (const r of third) {
      lines.push(`${r.rank}. Group ${r.group} ${r.team.name}: ${row(r)}${r.qualified ? "" : " — currently OUT"}`);
    }
  }
  // The team's own knockout results so far (win/loss, penalties included).
  const koPlayed = (fixtures || []).filter(
    (m) => m.state === "post" && /round of 32|round of 16|quarter|semi|final/i.test(m.stage || "")
  );
  if (koPlayed.length) {
    lines.push("Their knockout results so far (authoritative):");
    for (const m of koPlayed) {
      const isHome = m.home.code === team.code;
      const us = isHome ? m.hg : m.ag;
      const them = isHome ? m.ag : m.hg;
      const opp = isHome ? m.away.name : m.home.name;
      let verdict = us > them ? "WON" : us < them ? "LOST" : "drew";
      let pens = "";
      if (us === them && m.phg != null && m.pag != null) {
        const pu = isHome ? m.phg : m.pag;
        const pt = isHome ? m.pag : m.phg;
        pens = ` (${pu}-${pt} on penalties)`;
        verdict = pu > pt ? "WON" : pu < pt ? "LOST" : "drew";
      }
      lines.push(`- ${m.stage}: ${verdict} ${us}-${them} vs ${opp}${pens}`);
    }
  }
  const ko = (rounds || []).flatMap((r) =>
    (r.matches || []).filter(Boolean).map((m) => `- ${r.label}: ${m.home.name} vs ${m.away.name}`)
  );
  if (ko.length) {
    lines.push("Knockout bracket so far (authoritative; TBD = not yet decided):");
    lines.push(...ko);
  }
  if (isOut) {
    lines.push(
      `AUTHORITATIVE: ${team.name} have ALREADY BEEN ELIMINATED from the tournament. Do NOT describe any remaining path, ` +
        "future opponents or a route to the final — that path no longer exists. Instead, briefly recap how their tournament " +
        "went and where exactly it ended (the round and the result above)."
    );
  }
  lines.push(
    "State clearly and up front whether they have ALREADY been eliminated, are still alive, or have already qualified — " +
      "decide this strictly from the maths anchor and the tables above. If even their maximum possible points cannot reach " +
      "the top two of the group, and they cannot finish among the eight best third-placed teams, say plainly that they are " +
      "eliminated and do not describe a path that no longer exists. " +
      "Otherwise spell out concretely what results they need: best case, worst case, and which other matches matter. " +
      "If their group is finished, describe their knockout path and likely opponents instead. " +
      "Be precise with the points math and never invent results that are not listed above."
  );
  return lines.join("\n");
}

export function playerPrompt(player, team) {
  return [
    `Write a short profile of ${player.name}, in the ${team.name} squad.`,
    `Authoritative facts: position ${player.posName || player.pos || "unknown"}` +
      `${player.jersey ? `, shirt #${player.jersey}` : ""}${player.age ? `, age ${player.age}` : ""}.`,
    team.trivia ? `Team context: ${team.trivia}` : "",
    "Cover their club career, playing style, strengths and what to expect from them next. " +
      "If they have completed a confirmed transfer in the current window, mention it. " +
      "If you are not certain about this specific player, stick to what is generally known and never invent statistics.",
  ]
    .filter(Boolean)
    .join("\n");
}

/* League mode ------------------------------------------------------------- */

const todayLabel = () =>
  new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" });

export function transferDigestPrompt(leagueName, clubNames = []) {
  return (
    `Today is ${todayLabel()}. Using Google Search, write today's ${leagueName} transfer-window digest. ` +
    (clubNames.length ? `Give particular attention to any business involving: ${clubNames.join(", ")}. ` : "") +
    "Report ONLY what your search results support, preferring coverage from the last 48 hours, and include the " +
    "reported date for each deal. Start with CONFIRMED deals — player, clubs, fee where reported — only where " +
    "completion is reported by reliable outlets. Then a clearly separated final section titled exactly 'RUMOR MILL:' " +
    "with the most credible current rumors, each labelled by firmness (advanced talks / interest only). " +
    "Never present a rumor as a completed deal. If fresh coverage is thin, say so plainly — do not pad the digest " +
    "from memory or use pre-2026 knowledge for anyone's current status."
  );
}

/* Fallback when ESPN's transactions feed is unavailable. */
export function confirmedMovesPrompt(leagueName, clubNames = []) {
  return (
    `Today is ${todayLabel()}. Using Google Search, list the CONFIRMED ${leagueName} transfers of the current ` +
    "2026 summer window so far — completed deals only, per reliable outlets. One deal per line, formatted as: " +
    "**Player** — From club → To club (fee, reported date). Most recent first, up to 20 deals. " +
    (clubNames.length ? `Be sure to include any completed deals involving: ${clubNames.join(", ")}. ` : "") +
    "No rumors, no commentary. If you cannot verify a deal in search results, leave it out."
  );
}

export function clubPrompt(club, moves) {
  const lines = [
    `Write a profile of ${club.name} for a football app's club page, using Google Search to verify facts. Cover, in this order, with **bold** mini-headings:`,
    "1. **The club** — two sentences of history and identity (founded, ground, what they're known for).",
    "2. **Honours** — their major trophies with counts (league titles, domestic cups, European cups). If unsure of an exact count, say 'around' rather than inventing precision.",
    "3. **Last five seasons** — their league finishing position in each of the last five completed seasons, one compact line.",
    "4. **Right now** — current manager, the squad's shape, and what this window means for them.",
  ];
  if (moves?.length) {
    lines.push("Their confirmed moves this window (authoritative):");
    for (const m of moves.slice(0, 12)) {
      lines.push(`- ${m.player}: ${m.from || "?"} → ${m.to || "?"}${m.fee ? ` (${m.fee})` : ""}`);
    }
  }
  lines.push("Keep it under 220 words total.");
  return lines.join("\n");
}

export function leaguePreviewPrompt(match, leagueName) {
  const p = istParts(match.kickoff);
  return [
    `Using Google Search, write a pre-match preview for ${match.home.name} vs ${match.away.name} in the ${leagueName}.`,
    match.stage ? `This is ${match.stage}.` : "",
    p ? `Kickoff: ${p.day} at ${p.time} IST.` : "",
    "Cover recent form, key absences, the tactical matchup, and your prediction.",
    "Write 150-200 words, vivid but factual. Use light markdown: short paragraphs and **bold** for emphasis.",
  ].filter(Boolean).join("\n");
}

export function leagueRecapPrompt(match, summary, leagueName) {
  const lines = [
    `Write a post-match recap of ${match.home.name} ${match.hg} - ${match.ag} ${match.away.name} in the ${leagueName}.`,
    match.stage ? `${match.stage}.` : "",
  ];
  const evs = (summary?.events || []).filter((e) => ["goal", "og", "pen", "red"].includes(e.kind));
  if (evs.length) {
    lines.push("Key events (authoritative):");
    for (const e of evs) lines.push(`- ${e.minute} ${e.label}: ${e.player || e.text}${e.team ? ` (${e.team.name})` : ""}`);
  }
  lines.push("Tell the story of the match and what it means for both sides. 150-200 words.");
  return lines.filter(Boolean).join("\n");
}

export function rumorMillPrompt(leagueName, clubNames = []) {
  return (
    `Today is ${todayLabel()}. Using Google Search, compile the freshest ${leagueName} transfer RUMORS ` +
    "from the last 48 hours — credible sources only. For each: player, clubs involved, and firmness " +
    "(done deal pending medical / advanced talks / concrete interest / early links). " +
    (clubNames.length ? `Focus on rumors involving: ${clubNames.join(", ")}. ` : "") +
    "No completed deals (those go in the confirmed list). Most credible first, up to 12 items. " +
    "If credible rumor coverage is thin today, say so — don't pad from memory."
  );
}

export function espnDownPrompt() {
  return (
    "Using Google Search, find the latest FIFA World Cup 2026 scores: yesterday's results and today's fixtures " +
    "with kickoff times converted to IST. List them compactly. If a match is live right now, give the current score. " +
    "Only report what you find from search results dated today or yesterday."
  );
}

/* Post-tournament recap for the home archive card — everything it needs is in
   the played results, so no search grounding required. */
export function tournamentRecapPrompt(championName, matches) {
  const ko = (matches || [])
    .filter((m) => m.state === "post" && /round of 32|round of 16|quarter|semi|third|final/i.test(m.stage || ""))
    .map((m) => {
      const pens = m.phg != null && m.pag != null ? ` (${m.phg}-${m.pag} pens)` : "";
      return `- ${m.stage}: ${m.home.name} ${m.hg}-${m.ag} ${m.away.name}${pens}`;
    });
  return [
    "The FIFA World Cup 2026 has finished. Write a celebratory but factual recap of the tournament for fans revisiting it.",
    championName ? `Champions (authoritative): ${championName}.` : "",
    "Knockout results (authoritative — use ONLY these, do not invent scores or scorers):",
    ...ko,
    "Cover: the champions and how their run went, the final itself, the biggest upsets and shootout dramas visible in the results above.",
    "150-220 words.",
  ].filter(Boolean).join("\n");
}
