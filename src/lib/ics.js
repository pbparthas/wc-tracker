/* Client-side .ics generation — the $0, serverless way to get match reminders.
   The two classic ICS bugs are handled: text escaping and 75-octet line folding. */
const pad = (n) => String(n).padStart(2, "0");

function utcStamp(d) {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

const esc = (s) =>
  String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/* RFC 5545 content lines fold at 75 OCTETS (not characters). Iterate by code
   point and measure UTF-8 byte length so multi-byte glyphs (⚽, —, accented
   names) are never split mid-character and never overflow the octet limit.
   Continuation lines begin with a single space, which counts toward the 75. */
function fold(line) {
  const enc = new TextEncoder();
  const out = [];
  let cur = "";
  let curBytes = 0;
  for (const ch of line) {
    const chBytes = enc.encode(ch).length;
    if (curBytes + chBytes > 75) {
      out.push(cur);
      cur = " " + ch;
      curBytes = 1 + chBytes;
    } else {
      cur += ch;
      curBytes += chBytes;
    }
  }
  out.push(cur);
  return out.join("\r\n");
}

export function buildIcs(match) {
  const start = new Date(match.kickoff);
  const end = new Date(start.getTime() + 105 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Golazo//WC26 Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:espn-${match.id}@wc-tracker`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${esc(`⚽ ${match.home.name} vs ${match.away.name} — WC26 ${match.stage}`)}`,
    `LOCATION:${esc([match.venue, match.city].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc("FIFA World Cup 2026 · added from Golazo")}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`Kickoff soon: ${match.home.name} vs ${match.away.name}`)}`,
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(match) {
  const blob = new Blob([buildIcs(match)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wc26-${match.home.name}-vs-${match.away.name}.ics`.replace(/\s+/g, "-").toLowerCase();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
