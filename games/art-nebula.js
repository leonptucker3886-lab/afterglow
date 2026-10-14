/* Nebula Cascades art — deep-space cluster slot.
 * Bespoke SVG symbols, viewBox 0 0 100 100. Rich but cheap: static gradients only.
 */
export const DEFS = `
<radialGradient id="nb-sat" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".5" stop-color="#f5a623"/><stop offset="1" stop-color="#8a4b00"/></radialGradient>
<linearGradient id="nb-ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7ff6ff"/><stop offset=".5" stop-color="#e6fdff"/><stop offset="1" stop-color="#3a9fd0"/></linearGradient>
<radialGradient id="nb-mars" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffb08a"/><stop offset=".55" stop-color="#e0522a"/><stop offset="1" stop-color="#6e1f0e"/></radialGradient>
<radialGradient id="nb-ice" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#eafcff"/><stop offset=".55" stop-color="#7fd4f5"/><stop offset="1" stop-color="#1d5f8a"/></radialGradient>
<radialGradient id="nb-cr" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#f3e8ff"/><stop offset=".5" stop-color="#b678ff"/><stop offset="1" stop-color="#4a1d9e"/></radialGradient>
<radialGradient id="nb-comet" cx=".6" cy=".5" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#ffe98a"/><stop offset=".7" stop-color="#ff9a3d"/><stop offset="1" stop-color="#ff3dc8" stop-opacity="0"/></radialGradient>
<radialGradient id="nb-bh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#0a0a18"/><stop offset=".8" stop-color="#3a0a5e"/><stop offset="1" stop-color="#ff3dc8" stop-opacity="0"/></radialGradient>
<linearGradient id="nb-tail" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ff9a3d" stop-opacity=".8"/><stop offset="1" stop-color="#ff3dc8" stop-opacity="0"/></linearGradient>`;

const S = (cx, cy, n, r1, r2, rot = -90) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180, r = i % 2 ? r2 : r1;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

export const ART = {
  saturn: `<circle cx="50" cy="50" r="24" fill="url(#nb-sat)"/><ellipse cx="42" cy="42" rx="9" ry="6" fill="#fff" opacity=".35"/><g transform="rotate(-18 50 50)"><ellipse cx="50" cy="50" rx="44" ry="12" fill="none" stroke="url(#nb-ring)" stroke-width="7"/><ellipse cx="50" cy="50" rx="44" ry="12" fill="none" stroke="#0a2a3a" stroke-width="1.5" opacity=".6"/></g>`,
  mars: `<circle cx="50" cy="50" r="26" fill="url(#nb-mars)"/><ellipse cx="40" cy="40" rx="10" ry="7" fill="#7d2c12" opacity=".5"/><ellipse cx="60" cy="62" rx="8" ry="5" fill="#7d2c12" opacity=".45"/><ellipse cx="42" cy="38" rx="10" ry="6" fill="#fff" opacity=".25"/>`,
  ice: `<circle cx="50" cy="50" r="26" fill="url(#nb-ice)"/><path d="M30 44l14-8 10 12-16 6z" fill="#fff" opacity=".5"/><path d="M56 66l12-6 4 10-12 4z" fill="#fff" opacity=".4"/><ellipse cx="40" cy="36" rx="9" ry="5" fill="#fff" opacity=".5"/>`,
  moon: `<path d="M63 12A38 38 0 1 0 63 88A30 30 0 1 1 63 12Z" fill="#e8ecff"/><circle cx="52" cy="42" r="5" fill="#b9c2e8" opacity=".7"/><circle cx="60" cy="62" r="3.6" fill="#b9c2e8" opacity=".7"/><circle cx="46" cy="66" r="2.6" fill="#b9c2e8" opacity=".6"/>`,
  star: `<polygon points="${S(50, 50, 5, 34, 14)}" fill="#ffe98a" stroke="#ff9a3d" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="50" r="7" fill="#fff"/>`,
  nova: `<g stroke="#fff" stroke-linecap="round"><line x1="50" y1="8" x2="50" y2="92" stroke-width="7"/><line x1="8" y1="50" x2="92" y2="50" stroke-width="7"/><line x1="20" y1="20" x2="80" y2="80" stroke-width="4.5"/><line x1="80" y1="20" x2="20" y2="80" stroke-width="4.5"/></g><circle cx="50" cy="50" r="12" fill="#fff"/><circle cx="50" cy="50" r="20" fill="none" stroke="#b8ff3b" stroke-width="3" opacity=".8"/>`,
  asteroid: `<path d="M28 30l22-12 24 8 10 24-8 24-26 10-24-8-10-22z" fill="#8a7f9e" stroke="#5a4f70" stroke-width="3" stroke-linejoin="round"/><circle cx="48" cy="48" r="7" fill="#5a4f70" opacity=".6"/><circle cx="62" cy="62" r="5" fill="#5a4f70" opacity=".55"/><ellipse cx="42" cy="36" rx="8" ry="5" fill="#cfc6e8" opacity=".5"/>`,
  crystal: `<polygon points="50,8 78,38 64,92 36,92 22,38" fill="url(#nb-cr)" stroke="#e8d8ff" stroke-width="3" stroke-linejoin="round"/><line x1="50" y1="8" x2="50" y2="92" stroke="#fff" stroke-width="2" opacity=".55"/><polygon points="50,14 62,36 38,36" fill="#fff" opacity=".35"/>`,
  comet: `<path d="M78 22Q48 44 18 82Q52 62 78 22Z" fill="url(#nb-tail)"/><circle cx="72" cy="34" r="17" fill="url(#nb-comet)"/><circle cx="72" cy="34" r="17" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/><rect x="30" y="66" width="40" height="17" rx="8.5" fill="#1a0b3a" stroke="#ffe98a" stroke-width="2.5"/><text x="50" y="79" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="11.5" fill="#ffe98a">WILD</text>`,
  blackhole: `<circle cx="50" cy="50" r="42" fill="url(#nb-bh)"/><ellipse cx="50" cy="50" rx="46" ry="14" fill="none" stroke="#ff9a3d" stroke-width="5" transform="rotate(-16 50 50)"/><ellipse cx="50" cy="50" rx="46" ry="14" fill="none" stroke="#fff" stroke-width="1.6" opacity=".6" transform="rotate(-16 50 50)"/><rect x="28" y="70" width="44" height="17" rx="8.5" fill="#1a0b3a" stroke="#ff3dc8" stroke-width="2.5"/><text x="50" y="83" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="11.5" fill="#ff9ad7">LINE</text>`,
};
