import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { windowOpen } from "../data/competitions.js";

const WC_TABS = [
  ["/", "⌂ HOME"],
  ["/matches", "MATCHES"],
  ["/groups", "GROUPS"],
  ["/knockout", "KNOCKOUT"],
  ["/teams", "TEAMS"],
];

/* Transfers lead while the window is open; matches take over for the season. */
const leagueTabs = (comp) => {
  const base = `/league/${comp}`;
  const order = windowOpen(comp)
    ? [[base, "TRANSFERS"], [`${base}/matches`, "MATCHES"]]
    : [[`${base}/matches`, "MATCHES"], [base, "TRANSFERS"]];
  return [["/", "⌂"], ...order, [`${base}/table`, "TABLE"], [`${base}/clubs`, "CLUBS"]];
};

export default function BottomTabs() {
  const { pathname } = useLocation();
  const comp = pathname.match(/^\/league\/([^/]+)/)?.[1];
  const tabs = comp ? leagueTabs(comp) : WC_TABS;
  return (
    <nav className="tabs" aria-label="Sections">
      <div className="tabs-inner">
        {tabs.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            // Exact-match the home and the league base (Transfers) so they
            // don't stay highlighted on sub-routes.
            end={to === "/" || /^\/league\/[^/]+$/.test(to)}
            className={({ isActive }) => "tab" + (to === "/" ? " home" : "") + (isActive ? " on" : "")}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
