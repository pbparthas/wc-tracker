/* Official 2026 FIFA World Cup knockout bracket skeleton.
   Sources: Wikipedia "2026 FIFA World Cup knockout stage"; FIFA.com knockout-stage bracket;
   Olympics.com R32 bracket; Sky Sports day-by-day fixtures; CBS Sports / NBC Sports brackets;
   FIFA-authorized ticketing slot codes (Ticketmaster/StubHub/Ticombo/Gametime) for per-match
   date/time/feeder-slot confirmation. Cross-checked across >=2 sources per match.
   Kickoff times are ISO-8601 UTC. Feeder labels resolve to real teams live.

   Timezone basis (late Jun / Jul 2026, all DST-aware):
     US Eastern = EDT (UTC-4), US Central = CDT (UTC-5), US Mountain = MDT (UTC-6),
     US Pacific + Vancouver = PDT (UTC-7); Mexico City & Monterrey = CST (UTC-6, Mexico
     no longer observes DST). Most outlets quote ET; local + UTC computed from venue offset. */
export const KO_SKELETON = [
  // ---- Round of 32 (matches 73-88, Jun 28 - Jul 3) ----
  { no: 73, round: "R32", date: "2026-06-28T19:00:00Z", city: "Los Angeles", venue: "SoFi Stadium", home: "Runner-up Group A", away: "Runner-up Group B" },
  { no: 74, round: "R32", date: "2026-06-29T20:30:00Z", city: "Boston", venue: "Gillette Stadium", home: "Winner Group E", away: "3rd Group A/B/C/D/F" },
  { no: 75, round: "R32", date: "2026-06-30T01:00:00Z", city: "Monterrey", venue: "Estadio BBVA", home: "Winner Group F", away: "Runner-up Group C" },
  { no: 76, round: "R32", date: "2026-06-29T17:00:00Z", city: "Houston", venue: "NRG Stadium", home: "Winner Group C", away: "Runner-up Group F" },
  { no: 77, round: "R32", date: "2026-06-30T21:00:00Z", city: "New York New Jersey", venue: "MetLife Stadium", home: "Winner Group I", away: "3rd Group C/D/F/G/H" },
  { no: 78, round: "R32", date: "2026-06-30T17:00:00Z", city: "Dallas", venue: "AT&T Stadium", home: "Runner-up Group E", away: "Runner-up Group I" },
  { no: 79, round: "R32", date: "2026-07-01T01:00:00Z", city: "Mexico City", venue: "Estadio Azteca", home: "Winner Group A", away: "3rd Group C/E/F/H/I" },
  { no: 80, round: "R32", date: "2026-07-01T16:00:00Z", city: "Atlanta", venue: "Mercedes-Benz Stadium", home: "Winner Group L", away: "3rd Group E/H/I/J/K" },
  { no: 81, round: "R32", date: "2026-07-02T00:00:00Z", city: "San Francisco Bay Area", venue: "Levi's Stadium", home: "Winner Group D", away: "3rd Group B/E/F/I/J" },
  { no: 82, round: "R32", date: "2026-07-01T20:00:00Z", city: "Seattle", venue: "Lumen Field", home: "Winner Group G", away: "3rd Group A/E/H/I/J" },
  { no: 83, round: "R32", date: "2026-07-02T23:00:00Z", city: "Toronto", venue: "BMO Field", home: "Runner-up Group K", away: "Runner-up Group L" },
  { no: 84, round: "R32", date: "2026-07-02T19:00:00Z", city: "Los Angeles", venue: "SoFi Stadium", home: "Winner Group H", away: "Runner-up Group J" },
  { no: 85, round: "R32", date: "2026-07-03T03:00:00Z", city: "Vancouver", venue: "BC Place", home: "Winner Group B", away: "3rd Group E/F/G/I/J" },
  { no: 86, round: "R32", date: "2026-07-03T22:00:00Z", city: "Miami", venue: "Hard Rock Stadium", home: "Winner Group J", away: "Runner-up Group H" },
  { no: 87, round: "R32", date: "2026-07-04T01:30:00Z", city: "Kansas City", venue: "Arrowhead Stadium", home: "Winner Group K", away: "3rd Group D/E/I/J/L" },
  { no: 88, round: "R32", date: "2026-07-03T18:00:00Z", city: "Dallas", venue: "AT&T Stadium", home: "Runner-up Group D", away: "Runner-up Group G" },

  // ---- Round of 16 (matches 89-96, Jul 4 - Jul 7) ----
  { no: 89, round: "R16", date: "2026-07-04T21:00:00Z", city: "Philadelphia", venue: "Lincoln Financial Field", home: "Winner Match 74", away: "Winner Match 77" },
  { no: 90, round: "R16", date: "2026-07-04T17:00:00Z", city: "Houston", venue: "NRG Stadium", home: "Winner Match 73", away: "Winner Match 75" },
  { no: 91, round: "R16", date: "2026-07-05T20:00:00Z", city: "New York New Jersey", venue: "MetLife Stadium", home: "Winner Match 76", away: "Winner Match 78" },
  { no: 92, round: "R16", date: "2026-07-06T01:00:00Z", city: "Mexico City", venue: "Estadio Azteca", home: "Winner Match 79", away: "Winner Match 80" },
  { no: 93, round: "R16", date: "2026-07-06T19:00:00Z", city: "Dallas", venue: "AT&T Stadium", home: "Winner Match 83", away: "Winner Match 84" },
  { no: 94, round: "R16", date: "2026-07-07T00:00:00Z", city: "Seattle", venue: "Lumen Field", home: "Winner Match 81", away: "Winner Match 82" },
  { no: 95, round: "R16", date: "2026-07-07T16:00:00Z", city: "Atlanta", venue: "Mercedes-Benz Stadium", home: "Winner Match 86", away: "Winner Match 88" },
  { no: 96, round: "R16", date: "2026-07-07T20:00:00Z", city: "Vancouver", venue: "BC Place", home: "Winner Match 85", away: "Winner Match 87" },

  // ---- Quarter-finals (matches 97-100, Jul 9 - Jul 11) ----
  { no: 97, round: "QF", date: "2026-07-09T20:00:00Z", city: "Boston", venue: "Gillette Stadium", home: "Winner Match 89", away: "Winner Match 90" },
  { no: 98, round: "QF", date: "2026-07-10T19:00:00Z", city: "Los Angeles", venue: "SoFi Stadium", home: "Winner Match 93", away: "Winner Match 94" },
  { no: 99, round: "QF", date: "2026-07-11T21:00:00Z", city: "Miami", venue: "Hard Rock Stadium", home: "Winner Match 91", away: "Winner Match 92" },
  { no: 100, round: "QF", date: "2026-07-12T01:00:00Z", city: "Kansas City", venue: "Arrowhead Stadium", home: "Winner Match 95", away: "Winner Match 96" },

  // ---- Semi-finals (matches 101-102, Jul 14 & Jul 15) ----
  { no: 101, round: "SF", date: "2026-07-14T19:00:00Z", city: "Dallas", venue: "AT&T Stadium", home: "Winner Match 97", away: "Winner Match 98" },
  { no: 102, round: "SF", date: "2026-07-15T19:00:00Z", city: "Atlanta", venue: "Mercedes-Benz Stadium", home: "Winner Match 99", away: "Winner Match 100" },

  // ---- Third-place play-off (match 103, Jul 18) ----
  { no: 103, round: "THIRD", date: "2026-07-18T21:00:00Z", city: "Miami", venue: "Hard Rock Stadium", home: "Loser Match 101", away: "Loser Match 102" },

  // ---- Final (match 104, Jul 19) ----
  { no: 104, round: "FINAL", date: "2026-07-19T19:00:00Z", city: "New York New Jersey", venue: "MetLife Stadium", home: "Winner Match 101", away: "Winner Match 102" },
];
