/* Civil War art — parchment, iron & powder-smoke.
 * Bespoke SVG symbols, viewBox 0 0 100 100.
 * Portraits are stylized generic illustrations (no real-person likeness, no photos).
 */
export const DEFS = `
<linearGradient id="cw-parch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2e3c2"/><stop offset="1" stop-color="#c9a86a"/></linearGradient>
<linearGradient id="cw-iron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a93a8"/><stop offset=".5" stop-color="#4a5266"/><stop offset="1" stop-color="#23262f"/></linearGradient>
<linearGradient id="cw-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a7ec7"/><stop offset="1" stop-color="#24365e"/></linearGradient>
<linearGradient id="cw-grey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8a29a"/><stop offset="1" stop-color="#5e5850"/></linearGradient>
<linearGradient id="cw-butternut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c79a5e"/><stop offset="1" stop-color="#7a5a2a"/></linearGradient>
<radialGradient id="cw-flame" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ff9a3d"/><stop offset="1" stop-color="#a82a00" stop-opacity="0"/></radialGradient>`;

const face = (skin, beard, uniform, hat) => `
<circle cx="50" cy="42" r="22" fill="${skin}"/>
<path d="M50 56q-16 2-18 18l4 8h28l4-8q-2-16-18-18z" fill="${beard}"/>
<path d="M28 82q22-14 44 0v10H28z" fill="url(#${uniform})"/>
${hat}`;

export const ART = {
  virginian: face('#e8b88a', '#8a8a92', 'cw-grey', `<path d="M26 30q24-22 48 0l-6 8q-18-12-36 0z" fill="#3d3a35"/><rect x="24" y="26" width="52" height="8" fill="#24211d"/>`) + `<path d="M42 62q8 5 16 0" stroke="#5e5e66" stroke-width="2.5" fill="none"/>`,
  union: face('#e8b88a', 'none', 'cw-blue', `<ellipse cx="50" cy="22" rx="26" ry="9" fill="#1d2a4a"/><rect x="28" y="14" width="44" height="10" rx="4" fill="#1d2a4a"/><circle cx="50" cy="19" r="4" fill="url(#cw-iron)"/>`) + `<path d="M44 40h12" stroke="#3d2a1a" stroke-width="3" stroke-linecap="round"/>`,
  redbeard: face('#f0c09a', '#b34a1e', 'cw-butternut', `<path d="M28 32q22-20 44 0l-8 6q-14-10-28 0z" fill="#4a3418"/>`) + `<circle cx="42" cy="40" r="2.6" fill="#2a1a0e"/><circle cx="58" cy="40" r="2.6" fill="#2a1a0e"/>`,
  drum: `<ellipse cx="50" cy="62" rx="30" ry="26" fill="url(#cw-parch)" stroke="#7a5a2a" stroke-width="3"/><ellipse cx="50" cy="38" rx="30" ry="10" fill="#f7ecd4" stroke="#7a5a2a" stroke-width="3"/><path d="M28 46l-8 34M40 50l-6 36M60 50l6 36M72 46l8 34" stroke="#a80e2e" stroke-width="4"/><line x1="30" y1="8" x2="44" y2="34" stroke="#7a4d1a" stroke-width="4" stroke-linecap="round"/><line x1="70" y1="8" x2="56" y2="34" stroke="#7a4d1a" stroke-width="4" stroke-linecap="round"/>`,
  bugle: `<g transform="rotate(-30 50 50)"><path d="M20 70q30 10 60-14" fill="none" stroke="url(#cw-iron)" stroke-width="10" stroke-linecap="round"/><ellipse cx="84" cy="52" rx="10" ry="14" fill="url(#cw-iron)"/><rect x="12" y="64" width="14" height="10" rx="4" fill="#8a6a1a"/></g>`,
  kepi: `<path d="M24 58q-4-26 26-30q30-4 26 30l-8 6H32z" fill="url(#cw-blue)" stroke="#1d2a4a" stroke-width="3"/><rect x="24" y="56" width="52" height="10" fill="#14141f"/><circle cx="50" cy="42" r="6" fill="url(#cw-iron)"/>`,
  rifle: `<g transform="rotate(30 50 50)"><rect x="20" y="46" width="52" height="9" rx="4" fill="url(#cw-iron)"/><polygon points="72,42 92,46 92,54 72,50" fill="#5a4a32"/><rect x="28" y="55" width="14" height="16" rx="4" fill="#7a4d1a" transform="rotate(-20 35 63)"/></g>`,
  canteen: `<circle cx="50" cy="54" r="24" fill="url(#cw-iron)" stroke="#23262f" stroke-width="3"/><circle cx="50" cy="54" r="14" fill="none" stroke="#8a93a8" stroke-width="2.5"/><rect x="44" y="18" width="12" height="12" fill="#5a4a32"/><path d="M30 30q20-14 40 0" stroke="#7a4d1a" stroke-width="4" fill="none"/>`,
  cannon: `<g transform="rotate(-12 50 55)"><rect x="14" y="48" width="58" height="16" rx="8" fill="url(#cw-iron)" stroke="#23262f" stroke-width="2.5"/><circle cx="72" cy="56" r="10" fill="#23262f"/><circle cx="20" cy="56" r="7" fill="#23262f"/></g><circle cx="26" cy="76" r="11" fill="none" stroke="#7a4d1a" stroke-width="5"/><circle cx="74" cy="76" r="11" fill="none" stroke="#7a4d1a" stroke-width="5"/><circle cx="50" cy="40" r="16" fill="url(#cw-flame)"/><rect x="30" y="82" width="40" height="14" rx="7" fill="#14141f"/><text x="50" y="92.5" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="9" fill="#ffe98a">WILD</text>`,
  standard: `<rect x="46" y="14" width="7" height="72" fill="#7a4d1a"/><path d="M53 16h34l-8 12 8 12H53z" fill="#b31b34" stroke="#7d1226" stroke-width="2.5"/><path d="M53 44h30l-7 10 7 10H53z" fill="url(#cw-blue)" stroke="#1d2a4a" stroke-width="2.5"/><rect x="30" y="86" width="40" height="11" rx="5.5" fill="#14141f" opacity=".9"/><text x="50" y="94.5" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="8" fill="#ff9ad7">LINE</text>`,
  A: `<rect x="22" y="22" width="56" height="56" rx="6" fill="url(#cw-parch)" stroke="#7a5a2a" stroke-width="3"/><text x="50" y="67" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="38" fill="#4a3418">A</text>`,
  K: `<rect x="22" y="22" width="56" height="56" rx="6" fill="url(#cw-parch)" stroke="#7a5a2a" stroke-width="3"/><text x="50" y="67" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="38" fill="#4a3418">K</text>`,
  Q: `<rect x="22" y="22" width="56" height="56" rx="6" fill="url(#cw-parch)" stroke="#7a5a2a" stroke-width="3"/><text x="50" y="67" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="38" fill="#4a3418">Q</text>`,
  J: `<rect x="22" y="22" width="56" height="56" rx="6" fill="url(#cw-parch)" stroke="#7a5a2a" stroke-width="3"/><text x="50" y="67" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="38" fill="#4a3418">J</text>`,
};
