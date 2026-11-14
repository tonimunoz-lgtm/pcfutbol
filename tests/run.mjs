// Tests de invariantes sin dependencias:  node tests/run.mjs   (desde la raíz del proyecto)
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = f => import(pathToFileURL(path.join(root, f)).href);
globalThis.window = globalThis;
globalThis.document = { getElementById: () => null, querySelectorAll: () => [], addEventListener() {} };
globalThis.CustomEvent = class { constructor(t) { this.type = t; } };
globalThis.dispatchEvent = () => {}; globalThis.addEventListener = () => {};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const origLog = console.log; console.log = () => {};          // el juego es muy verboso al cargar
const gl = await imp('gameLogic.js'); const g = gl.default || gl;
const { simulateFootballMatch: sim, syntheticLineup: L } = await imp('match-engine.js');
const { generateLeagueCalendar } = await imp('league-calendar.js');
console.log = origLog;

const seeded = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const mkPlayer = i => ({ name: 'J' + i, position: 'MC', overall: 70, age: 25, salary: 1000, id: 'p_' + i, contractType: 'owned' });
const baseState = n => ({ ...g.getGameState(), week: 3, team: 'T', squad: Array.from({ length: n }, (_, i) => mkPlayer(i)), academy: [],
    balance: 50e6, playerPurchases: 0, seasonMovements: [], world: undefined, popularity: 70, sanctions: undefined });
const star = { name: 'Estrella', position: 'DC', overall: 85, age: 24, club: 'Otro', salary: 50000, isFreeAgent: true, askingPrice: 5e6 };
const params = rng => ({ teamName: 'A', opponentName: 'B', teamLineup: L(75, 'A'), opponentLineup: L(70, 'B'), teamBench: L(75, 'Ab').slice(0, 9),
    opponentBench: L(70, 'Bb').slice(0, 9), teamFormation: '433', opponentFormation: '433', rng });

const tests = {
    'calendario: todos los cruces, sin doble partido en una semana, rachas ≤2'() {
        for (const n of [4, 6, 18, 19, 20, 21, 22]) {
            const teams = Array.from({ length: n }, (_, i) => 'T' + i), cal = generateLeagueCalendar(teams);
            assert.equal(new Set(cal.map(m => m.home + '>' + m.away)).size, n * (n - 1), `cruces ${n}`);
            const byWeek = new Map();
            for (const m of cal) { const w = byWeek.get(m.week) || new Set(); assert(!w.has(m.home) && !w.has(m.away), `doble partido n=${n}`); w.add(m.home); w.add(m.away); byWeek.set(m.week, w); }
        }
    },
    'motor: misma semilla → mismo partido'() {
        assert.equal(JSON.stringify(sim(params(seeded(7)))), JSON.stringify(sim(params(seeded(7)))));
    },
    'motor: equipos iguales ≈ 1,2–1,8 pts/partido y fuerte > débil'() {
        const r = seeded(99); let eq = 0, win = 0, N = 600;
        for (let i = 0; i < N; i++) {
            const a = sim({ ...params(r), teamLineup: L(70, 'A'), opponentLineup: L(70, 'B') });
            eq += a.teamGoals > a.opponentGoals ? 3 : a.teamGoals === a.opponentGoals ? 1 : 0;
            const b = sim(params(r)); if (b.teamGoals > b.opponentGoals) win++;
        }
        assert(eq / N > 1.2 && eq / N < 1.8, 'ppg ' + eq / N);
        assert(win / N > 0.4, 'el favorito (75 vs 70) debe ganar >40 %: ' + win / N);
    },
    'guardado→carga: el estado se conserva idéntico'() {
        g.replaceGameState(baseState(22)); const a = JSON.stringify(g.getGameState());
        g.replaceGameState(JSON.parse(a)); assert.equal(JSON.stringify(g.getGameState()), a);
    },
    'fichaje con plantilla llena no cobra nada'() {
        g.replaceGameState(baseState(25)); g.startNegotiation({ ...star, clausePaid: true, clauseAmount: 10e6, isFreeAgent: false });
        const r = g.offerToPlayer(500000, 0, 1, 1, 0, 0);
        assert.equal(r.success, false); assert.equal(g.getGameState().balance, 50e6);
    },
    'bloqueo FIFA: no se cobra ni se pierde plantilla'() {
        g.replaceGameState({ ...baseState(20), sanctions: { banLeft: 2 } });
        g.startNegotiation({ ...star, clausePaid: true, clauseAmount: 10e6, isFreeAgent: false }); g.offerToPlayer(500000, 0, 1, 1, 0, 0);
        const s = g.getGameState(); assert.equal(s.balance, 50e6); assert.equal(s.squad.length, 20);
    },
    'negociación: misma oferta → misma respuesta y dice cuánto falta'() {
        g.replaceGameState(baseState(20)); const out = [];
        for (let i = 0; i < 3; i++) { g.startNegotiation({ ...star }); const r = g.offerToPlayer(40000, 0, 0, 0, 0, 0); out.push(r.success + r.message); }
        assert.equal(new Set(out).size, 1); assert(/más de sueldo/.test(out[0]), out[0]);
        g.startNegotiation({ ...star }); assert.equal(g.offerToPlayer(90000, 0, 0, 0, 0, 0).success, true);
    },
    'dinero nunca NaN tras ofertas inválidas'() {
        g.replaceGameState(baseState(20)); g.startNegotiation({ ...star });
        for (const v of [NaN, -5, 0, 'abc', Infinity]) g.offerToPlayer(v, 0, 0, 0, 0, 0);
        assert(Number.isFinite(g.getGameState().balance));
    },
};
let fail = 0;
for (const [name, fn] of Object.entries(tests)) {
    try { fn(); origLog('  ✔', name); } catch (e) { fail++; origLog('  ✘', name, '\n     ', e.message.split('\n')[0]); }
}
origLog(fail ? `\n${fail} test(s) fallan` : '\nTodos los tests pasan'); process.exit(fail ? 1 : 0);
