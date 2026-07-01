/* One-time social preview rasterization → public/og.png (committed).
   Run with: npm run og */
import sharp from "sharp";

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#e2d6ba"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8caa4"/>
      <stop offset="1" stop-color="#e2d6ba"/>
    </linearGradient>
  </defs>
  <!-- the topbins mark: a golazo curled into the top corner -->
  <line x1="60" y1="470" x2="580" y2="470" stroke="#23281f" stroke-width="8" opacity="0.35"/>
  <path d="M100 470 L100 210 L520 210 L520 470" stroke="#23281f" stroke-width="20" stroke-linecap="round" fill="none"/>
  <g stroke="#23281f" stroke-width="4" opacity="0.32">
    <line x1="356" y1="222" x2="356" y2="352"/><line x1="406" y1="222" x2="406" y2="352"/>
    <line x1="456" y1="222" x2="456" y2="352"/>
    <line x1="330" y1="258" x2="506" y2="258"/><line x1="330" y1="304" x2="506" y2="304"/>
  </g>
  <path d="M118 560 Q 270 540 452 300" stroke="#a83226" stroke-width="15" fill="none" stroke-linecap="round" stroke-dasharray="2 32"/>
  <circle cx="462" cy="276" r="48" fill="#a83226"/>
  <polygon points="462,257 480.1,270.1 473.2,291.4 450.8,291.4 443.9,270.1" fill="#e2d6ba"/>
  <!-- wordmark -->
  <text x="845" y="265" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="104" letter-spacing="2">
    <tspan fill="#23281f">GOLA</tspan><tspan fill="#a83226">ZO</tspan>
  </text>
  <text x="845" y="338" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="33" fill="#23281f">
    FIFA World Cup 2026 · live in IST
  </text>
  <text x="845" y="402" text-anchor="middle" font-family="sans-serif" font-weight="500" font-size="25" fill="#6d7261">
    Bracket · squads · stats · AI match stories
  </text>
  <text x="845" y="462" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="24" fill="#a83226">
    Free · no ads · no account · works offline
  </text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(new URL("../public/og.png", import.meta.url).pathname);
console.log("Social preview written to public/og.png");
