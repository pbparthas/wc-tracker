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
const eplTabs = () => {
  const order = windowOpen("epl")
    ? [["/epl", "TRANSFERS"], ["/epl/matches", "MATCHES"]]
    : [["/epl/matches", "MATCHES"], ["/epl", "TRANSFERS"]];
  return [["/", "⌂"], ...order, ["/epl/table", "TABLE"], ["/epl/clubs", "CLUBS"]];
};

export default function BottomTabs() {
  const { pathname } = useLocation();
  const tabs = pathname.startsWith("/epl") ? eplTabs() : WC_TABS;
  return (
    <nav className="tabs" aria-label="Sections">
      <div className="tabs-inner">
        {tabs.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/" || to === "/epl"}
            className={({ isActive }) => "tab" + (to === "/" ? " home" : "") + (isActive ? " on" : "")}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
