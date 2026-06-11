import React, { useState } from "react";

/* ESPN's logo image renders correctly everywhere; emoji flags are the fallback
   (they break on Windows, and England/Scotland have no ISO emoji anyway). */
export default function Flag({ team, size = 22 }) {
  const [broken, setBroken] = useState(false);
  if (team?.logo && !broken) {
    return (
      <img
        src={team.logo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        style={{ borderRadius: 3, objectFit: "contain", flex: "0 0 auto" }}
      />
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{team?.flag || "🏳️"}</span>;
}
