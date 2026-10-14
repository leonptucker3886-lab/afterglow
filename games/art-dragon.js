/* Dragon's Hoard art — ember & gem hoard slot.
 * Bespoke SVG symbols, viewBox 0 0 100 100.
 */
export const DEFS = `
<radialGradient id="dg-ember" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".45" stop-color="#ff9a3d"/><stop offset="1" stop-color="#a82a00"/></radialGradient>
<radialGradient id="dg-scale" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="#ffb08a"/><stop offset=".5" stop-color="#c22a2a"/><stop offset="1" stop-color="#5e0e0e"/></radialGradient>
<linearGradient id="dg-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe98a"/><stop offset="1" stop-color="#b97f00"/></linearGradient>
<radialGradient id="dg-gemr" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffd0d8"/><stop offset=".5" stop-color="#e0244e"/><stop offset="1" stop-color="#6e0e26"/></radialGradient>
<radialGradient id="dg-gemb" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#d0f4ff"/><stop offset=".5" stop-color="#1e9fe0"/><stop offset="1" stop-color="#0e3a6e"/></radialGradient>
<radialGradient id="dg-gemg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#d8ffd0"/><stop offset=".5" stop-color="#2ac25a"/><stop offset="1" stop-color="#0e5e2a"/></radialGradient>`;

export const ART = {
  dragon: `<path d="M14 78Q30 40 52 34Q74 28 86 12Q90 30 78 44Q92 52 88 70Q70 92 40 90Q20 88 14 78Z" fill="url(#dg-scale)" stroke="#3d0808" stroke-width="3" stroke-linejoin="round"/><circle cx="62" cy="52" r="9" fill="#ffe98a"/><circle cx="62" cy="52" r="4.5" fill="#0b0b18"/><circle cx="64" cy="50" r="1.8" fill="#fff"/><path d="M30 66l14 4M34 74l12 2" stroke="#3d0808" stroke-width="2.5" stroke-linecap="round"/><path d="M74 30l8-10M68 38l10-6" stroke="#3d0808" stroke-width="3" stroke-linecap="round"/>`,
  egg: `<ellipse cx="50" cy="54" rx="26" ry="34" fill="url(#dg-gemb)" stroke="#dff4ff" stroke-width="3"/><path d="M34 40l10-6 8 10-12 6z" fill="#fff" opacity=".4"/><path d="M30 54q20-8 40 0" stroke="#0e3a6e" stroke-width="3" fill="none" opacity=".7"/>`,
  chest: `<rect x="18" y="42" width="64" height="40" rx="8" fill="#6e3a10" stroke="#3d2008" stroke-width="3"/><path d="M18 42a32 20 0 0 1 64 0v10H18z" fill="#8a4d16" stroke="#3d2008" stroke-width="3"/><rect x="44" y="52" width="12" height="18" rx="4" fill="url(#dg-gold)"/><circle cx="50" cy="58" r="3" fill="#3d2008"/>`,
  sword: `<g transform="rotate(35 50 50)"><rect x="46" y="8" width="8" height="56" fill="#dfe8ff" stroke="#5a6a8a" stroke-width="2"/><polygon points="50,2 56,10 44,10" fill="#dfe8ff" stroke="#5a6a8a" stroke-width="2"/><rect x="34" y="64" width="32" height="8" rx="4" fill="url(#dg-gold)"/><rect x="46" y="72" width="8" height="18" rx="4" fill="#3d2008"/></g>`,
  gemR: `<polygon points="50,10 80,40 50,90 20,40" fill="url(#dg-gemr)" stroke="#ffd0d8" stroke-width="3" stroke-linejoin="round"/><polygon points="50,16 66,40 34,40" fill="#fff" opacity=".4"/><line x1="50" y1="40" x2="50" y2="90" stroke="#fff" stroke-width="2" opacity=".5"/>`,
  gemB: `<polygon points="50,10 80,40 50,90 20,40" fill="url(#dg-gemb)" stroke="#d0f4ff" stroke-width="3" stroke-linejoin="round"/><polygon points="50,16 66,40 34,40" fill="#fff" opacity=".4"/><line x1="50" y1="40" x2="50" y2="90" stroke="#fff" stroke-width="2" opacity=".5"/>`,
  gemG: `<polygon points="50,10 80,40 50,90 20,40" fill="url(#dg-gemg)" stroke="#d8ffd0" stroke-width="3" stroke-linejoin="round"/><polygon points="50,16 66,40 34,40" fill="#fff" opacity=".4"/><line x1="50" y1="40" x2="50" y2="90" stroke="#fff" stroke-width="2" opacity=".5"/>`,
  coin: `<circle cx="50" cy="50" r="30" fill="url(#dg-gold)" stroke="#8a5f00" stroke-width="3.5"/><circle cx="50" cy="50" r="21" fill="none" stroke="#8a5f00" stroke-width="2.5"/><text x="50" y="63" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="30" fill="#8a5f00">G</text><ellipse cx="40" cy="36" rx="8" ry="5" fill="#fff" opacity=".5"/>`,
  mini: `<circle cx="50" cy="50" r="30" fill="url(#dg-gold)" stroke="#c22a2a" stroke-width="4"/><text x="50" y="60" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="17" fill="#7d0e0e">MINI</text>`,
  minor: `<circle cx="50" cy="50" r="30" fill="url(#dg-gemg)" stroke="#e8ffe8" stroke-width="4"/><text x="50" y="60" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="15" fill="#e8ffe8">MINOR</text>`,
  major: `<circle cx="50" cy="50" r="30" fill="url(#dg-gemr)" stroke="#ffe0e8" stroke-width="4"/><text x="50" y="60" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="15" fill="#ffe0e8">MAJOR</text>`,
};
