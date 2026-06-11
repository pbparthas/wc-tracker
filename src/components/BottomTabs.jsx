import React from "react";
import { NavLink } from "react-router-dom";

const TABS = [
  ["/", "MATCHES"],
  ["/groups", "GROUPS"],
  ["/knockout", "KNOCKOUT"],
  ["/teams", "TEAMS"],
];

export default function BottomTabs() {
  return (
    <nav className="tabs" aria-label="Sections">
      <div className="tabs-inner">
        {TABS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => "tab" + (isActive ? " on" : "")}>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
