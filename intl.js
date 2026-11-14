// intl.js — convocatorias de selecciones nacionales (Fase 3).
//  · Hay 3 parones por temporada (≈ 22 %, 46 % y 78 % de la liga). Durante esa jornada los convocados no están disponibles.
//  · Cada selección convoca a sus mejores jugadores del mundo (hasta 23, por líneas) según la nacionalidad que tenga cada jugador.
//  · Los convocados quedan «no disponibles» con la misma marca que una sanción (así todo el juego — alineación, IA, copa — los trata igual),
//    y a la vuelta llegan con cansancio, algo de forma y un pequeño riesgo de lesión (todo determinista: misma jornada → mismo resultado).
import { NATIONS, hash, seededRandom } from './nationalities.js';

const WINDOW_FRACTIONS = [0.22, 0.46, 0.78];
const TOP = new Set(['ES', 'FR', 'BR', 'AR', 'EN', 'DE', 'PT', 'IT', 'NL', 'BE']);
const MID = new Set(['UY', 'CO', 'HR', 'DK', 'CH', 'MA', 'SN', 'JP', 'US', 'TR', 'NO', 'PL', 'AT', 'RS', 'UA', 'SC', 'KR', 'MX', 'SE', 'CZ', 'GH', 'NG', 'CI', 'DZ', 'CM', 'EC', 'CL']);
const MIN_OVERALL = n => TOP.has(n) ? 78 : MID.has(n) ? 72 : 66;
const QUOTA = { POR: 3, DEF: 8, MED: 7, DEL: 5 };
const GROUP = { POR: 'POR', DFC: 'DEF', LI: 'DEF', LD: 'DEF', MC: 'MED', MCO: 'MED', MI: 'MED', MD: 'MED', EXT: 'DEL', DC: 'DEL' };

export function windowWeeks(seasonLength) {
    const L = Math.max(10, Number(seasonLength) || 38);
    return [...new Set(WINDOW_FRACTIONS.map(f => Math.max(2, Math.min(L - 1, Math.round(L * f)))))];
}
export function nextWindow(state) {
    if (!state || state.seasonType !== 'regular') return null;
    return windowWeeks(state.maxSeasonWeeks).find(w => w >= (state.week || 1)) ?? null;
}
const isRealUnavailable = p => p.isInjured || (p.isSuspended && p._suspCause !== 'intl') || p.contractType === 'loaned_out';
const squadsOf = state => {
    const out = [{ club: state.team, squad: state.squad || [], user: true }];
    for (const [name, c] of Object.entries(state.world?.clubs || {})) if (name !== state.team && Array.isArray(c.squad)) out.push({ club: name, squad: c.squad, user: false });
    return out;
};
export const nationName = c => NATIONS[c]?.n || c;

// Convocatoria de cada nación: mejores por línea, mínimo de media según el nivel del país
function pickNation(code, cands) {
    const min = MIN_OVERALL(code), by = { POR: [], DEF: [], MED: [], DEL: [] };
    cands.filter(x => (x.p.overall || 0) >= min && (x.p.age || 25) >= 18 && (x.p.age || 25) <= 38)
        .sort((a, b) => (b.p.overall || 0) - (a.p.overall || 0) || String(a.p.name).localeCompare(String(b.p.name)))
        .forEach(x => { const g = GROUP[x.p.position]; if (g && by[g].length < QUOTA[g]) by[g].push(x); });
    return [...by.POR, ...by.DEF, ...by.MED, ...by.DEL];
}
// Fuerza de la selección = media de sus convocados (sirve para los resultados de los partidos)
export function nationStrength(squadList) {
    if (!squadList.length) return 55;
    return squadList.reduce((a, x) => a + (x.p.overall || 0), 0) / squadList.length;
}

export function clearFlags(state, onlyOther) {
    for (const { squad } of squadsOf(state)) for (const p of squad) {
        if (p._intlKey && (!onlyOther || p._intlKey !== onlyOther)) { delete p._intlKey; delete p.intlNation; if (p._suspCause === 'intl') { p.isSuspended = false; p._suspCause = null; } }
    }
}

// Empieza el parón: marca a los convocados (usuario e IA) y devuelve el resumen del usuario
export function beginWindow(state) {
    if (!state || state.seasonType !== 'regular' || !windowWeeks(state.maxSeasonWeeks).includes(state.week)) { if (state?.intl) endWindow(state); return null; }
    const key = `${state.currentSeason}|${state.week}`;
    if (state.intl && state.intl.key === key) return state.intl;       // ya iniciado esta jornada
    clearFlags(state);                                                  // restos de un parón anterior sin cerrar
    const byNation = {};
    for (const { club, squad, user } of squadsOf(state)) for (const p of squad) {
        if (!p.nationality || !NATIONS[p.nationality] || isRealUnavailable(p)) continue;
        (byNation[p.nationality] = byNation[p.nationality] || []).push({ p, club, user });
    }
    const called = [], teams = {};
    for (const [code, cands] of Object.entries(byNation)) {
        const list = pickNation(code, cands);
        if (!list.length) continue;
        teams[code] = nationStrength(list);
        for (const x of list) { x.p.isSuspended = true; x.p._suspCause = 'intl'; x.p.suspensionWeeks = 0; x.p._intlKey = key; x.p.intlNation = code; if (x.user) called.push({ name: x.p.name, nation: code, position: x.p.position, overall: x.p.overall }); }
    }
    const lineupNames = (state.lineup || []).filter(Boolean).map(p => p.name);
    state.intl = { key, week: state.week, called, teams, lineupNames };
    return state.intl;
}

// Termina el parón: libera a los jugadores y aplica el efecto de la vuelta
export function endWindow(state) {
    const info = state?.intl; if (!info) return null;
    const key = info.key, injured = [], returned = [], scorers = [];
    for (const { squad, user } of squadsOf(state)) for (const p of squad) {
        if (p._intlKey !== key) continue;
        const rng = seededRandom(`intl|${key}|${p.name}`);
        delete p._intlKey; if (p._suspCause === 'intl') { p.isSuspended = false; p._suspCause = null; }
        const nation = p.intlNation; delete p.intlNation;
        const cond0 = p.condition ?? 100;
        p.caps = (p.caps || 0) + 1;
        p.condition = Math.max(40, cond0 - 10);                       // viaje y partido con la selección
        const risk = 0.03 + ((p.age || 25) > 31 ? 0.01 : 0) + (cond0 < 70 ? 0.02 : 0);
        if (rng() < risk && !p.isInjured) {
            p.isInjured = true; p.weeksOut = 1 + Math.floor(rng() * 5); p.injuryType = 'Lesión con la selección';
            if (user) injured.push({ name: p.name, weeks: p.weeksOut, nation });
        } else {
            p.form = Math.min(99, (p.form ?? 70) + 3);                // confianza tras jugar con su país
            if (user) returned.push({ name: p.name, nation });
            if (user && ['DC', 'EXT', 'MCO', 'MI', 'MD'].includes(p.position) && rng() < 0.22) { p.form = Math.min(99, p.form + 2); scorers.push({ name: p.name, nation }); }
        }
    }
    // resultados de las selecciones con jugadores del usuario (informativos, deterministas)
    const results = [], nations = [...new Set(info.called.map(c => c.nation))].slice(0, 4), codes = Object.keys(info.teams);
    for (const n of nations) {
        const rivals = codes.filter(c => c !== n && (TOP.has(c) || MID.has(c)));
        if (!rivals.length) continue;
        const rng = seededRandom(`intlres|${key}|${n}`), r = rivals[Math.floor(rng() * rivals.length)];
        const diff = (info.teams[n] - info.teams[r]) / 22, goals = lam => { let g = 0, L = Math.exp(-lam), p = 1; do { g++; p *= rng(); } while (p > L); return g - 1; };
        results.push({ home: n, away: r, hg: goals(1.3 * Math.exp(diff)), ag: goals(1.1 * Math.exp(-diff)) });
    }
    // restaura el once que tenía el usuario antes del parón, si todos siguen aptos
    if (info.lineupNames?.length) {
        const byName = new Map((state.squad || []).map(p => [p.name, p]));
        const back = info.lineupNames.map(n => byName.get(n));
        const ok = x => x && !x.isInjured && !x.isSuspended && x.contractType !== 'loaned_out';
        if (back.every(ok) && new Set(info.lineupNames).size === info.lineupNames.length) state.lineup = back;
    }
    state.intl = null;
    return { injured, returned, scorers, results, called: info.called };
}
