import React, { useEffect } from "react";
import AiCard from "./AiCard.jsx";
import { useAiContent } from "../hooks/useAiContent.js";
import { playerPrompt } from "../lib/prompts.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/* Bottom sheet with a player's roster details and an on-demand AI profile. */
export default function PlayerSheet({ player, team, onClose }) {
  const profile = useAiContent(
    `player:${team.code}:${player.id || player.name}`,
    () => playerPrompt(player, team),
    { ttlMs: WEEK }
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const facts = [
    player.posName && ["Position", player.posName],
    player.jersey && ["Shirt", "#" + player.jersey],
    player.age && ["Age", player.age],
    player.height && ["Height", player.height],
    player.weight && ["Weight", player.weight],
  ].filter(Boolean);

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet card"
        role="dialog"
        aria-modal="true"
        aria-label={player.name}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          {player.headshot && (
            <img
              src={player.headshot}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              style={{ borderRadius: "50%", objectFit: "cover", background: "var(--pitch)", flex: "0 0 auto" }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="disp" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>
              {player.name.toUpperCase()}
            </div>
            <div className="eyebrow" style={{ marginTop: 4 }}>
              {team.flag} {team.name}
            </div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {facts.length > 0 && (
          <div className="fact-grid">
            {facts.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        )}

        <AiCard title="Player profile" ai={profile} cta="✨ Player profile" />
      </div>
    </div>
  );
}
