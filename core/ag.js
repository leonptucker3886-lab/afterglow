// AFTERGLOW core barrel. Every page: import { boot, ... } from '/core/ag.js'
export * from './store.js';
export * from './ui.js';
export { sfx, buzz } from './audio.js';
export { startRound, Round } from './round.js';
export { shuffle, weighted, int, floatsFor, sha256 } from './fair.js';
export { GAMES, CATS, art, gameById } from './games.js';
import { mountShell, mountFooter } from './ui.js';

export function boot({ nav = '', footer = true } = {}) {
  mountShell(nav);
  if (footer) mountFooter();
}
