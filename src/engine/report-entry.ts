/* Bundle entry for tools/curve-report.mjs: everything needed to build levels 1..N the way the game does
   (authored files first, generator beyond them) and measure them against the curve. */
export { clearLevelCache, evalLevel, makeLevel, registerAuthored } from './levels';
export { levelFromJson } from './authored';
export { curve, curveFor, setCurve, validateCurve } from '../data/curve';
