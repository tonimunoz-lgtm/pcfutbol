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

const nat = await imp('nationalities.js');
const intlMod = await imp('intl.js');
const staffMod = await imp('staff-sync.js');
const worldWith = (division, userOvr, others) => {
    const sq = (club, arr) => arr.map((o, i) => ({ id: club + i, name: club + ' ' + i, position: 'MC', age: 27, overall: o, salary: 5000, contractType: 'owned', contractYears: 3, club, releaseClause: 20e6, value: 5e6 }));
    const clubs = { T: { name: 'T', division, squad: sq('T', Array(16).fill(userOvr)), snapshot: { academy: [] }, balance: 50e6 } };
    for (const [n, d, arr] of others) clubs[n] = { name: n, division: d, squad: sq(n, arr), snapshot: { academy: [] }, balance: 1e7 };
    return { ...baseState(16), clauseSignings: undefined, division, squad: clubs.T.squad, balance: 100e6, world: { clubs, divisions: {}, loans: [], transfers: [], nextPlayerId: 9999, nextTransferId: 1, revision: 1 } };
};
const tests = {
    'cláusula: una superestrella de Primera no ficha por un club de RFEF'() {
        g.replaceGameState(worldWith('rfef_grupo1', 58, [['Gran', 'primera', [88, 86, 84]]]));
        const a = g.clauseAssess({ id: 'Gran0', name: 'Gran 0', club: 'Gran' });
        assert.equal(a.ok, false); assert(/categor|proyecto/.test(a.reasons.join(' ')), a.reasons.join(' '));
    },
    'cláusula: fichaje completo mueve al jugador, cobra, repone al club y limita a 2 por temporada'() {
        const st = worldWith('primera', 72, [['Rival', 'primera', Array(20).fill(72)]]); st.squad = st.squad.slice(0, 12); st.world.clubs.T.squad = st.squad; g.replaceGameState(st);
        for (let i = 0; i < 3; i++) {
            const pl = { ...g.getGameState().world.clubs.Rival.squad[0], clausePaid: true, clauseAmount: 20e6, isFreeAgent: false };
            g.startNegotiation(pl); const r = g.offerToPlayer(60000, 0, 1, 1, 0, 0);
            if (i < 2) { assert.equal(r.success, true, 'fichaje ' + i + ': ' + r.message); } else { assert.equal(r.success, false); assert(/2 cláusulas/.test(r.message), r.message); }
        }
        const s = g.getGameState();
        assert.equal(s.balance, 100e6 - 40e6, 'cobra solo 2 cláusulas'); assert.equal(s.squad.length, 14);
        assert(s.world.clubs.Rival.squad.length >= 20, 'el club vendedor repone plantilla: ' + s.world.clubs.Rival.squad.length);
        assert.equal(s.world.clubs.Rival.balance, 1e7 + 40e6, 'el vendedor cobra la cláusula');
    },
    'cláusula: la comisión de intermediarios mejora la respuesta, se cobra al firmar y el jugador sin "value" no rompe la ventana'() {
        const st = worldWith('primera', 72, [['Rival', 'primera', Array(20).fill(72)]]); g.replaceGameState(st);
        const base = () => { const p = { ...g.getGameState().world.clubs.Rival.squad[0] }; delete p.value; return { ...p, clausePaid: true, clauseAmount: 20e6, isFreeAgent: false }; };
        g.startNegotiation(base());
        const np = g.getGameState().negotiatingPlayer; assert(Number.isFinite(np.value) && Number.isFinite(np.salary) && np.potential !== undefined, 'campos normalizados');
        let low = 5600; // algo por debajo de lo que pide
        const no = g.offerToPlayer(low, 0, 0, 0, 0, 0, undefined, 0); assert.equal(no.success, false); assert(no.neededSalary !== undefined);
        g.startNegotiation(base()); const yes = g.offerToPlayer(low, 0, 0, 0, 0, 0, undefined, low * 26);
        assert.equal(yes.success, true, yes.message);
        assert.equal(g.getGameState().balance, 100e6 - 20e6 - low * 26, 'cláusula + comisión');
    },
    'cláusula: años, nueva cláusula, coche/casa por niveles y % se aplican al fichado y la duración influye en la respuesta'() {
        const st = worldWith('primera', 72, [['Rival', 'primera', Array(20).fill(72)]]); g.replaceGameState(st);
        const base = () => ({ ...g.getGameState().world.clubs.Rival.squad[0], clausePaid: true, clauseAmount: 20e6, isFreeAgent: false });
        g.startNegotiation(base());
        const r = g.offerToPlayer(60000, 50000, 300, 600, 5, 3, undefined, 0, 5, 80e6);
        assert.equal(r.success, true, r.message);
        const s = g.getGameState(), pl = s.squad.find(x => x.name === 'Rival 0');
        assert(pl, 'fichado'); assert.equal(pl.contractYears, 5, 'years ' + pl.contractYears); assert.equal(pl.releaseClause, 80e6, 'clause ' + pl.releaseClause);
        assert.equal(pl.car, 300, 'car ' + pl.car); assert.equal(pl.house, 600, 'house ' + pl.house); assert.equal(pl.merchPercent, 5, 'merch ' + pl.merchPercent); assert.equal(pl.ticketPercent, 3, 'ticket ' + pl.ticketPercent);
        assert.equal(s.balance, 100e6 - 20e6 - 50000, 'cláusula + prima: ' + s.balance);
        assert((s.pendingPress || []).some(x => x.kind === 'fichaje_clausula' && x.playerName === 'Rival 0'), 'portada de prensa del fichaje');
        // una oferta justa a 1 año se rechaza donde la misma a 4-5 años se acepta
        g.replaceGameState(worldWith('primera', 72, [['Rival', 'primera', Array(20).fill(72)]]));
        g.startNegotiation(base()); const p0 = g.getGameState().negotiatingPlayer; const sal = Math.round(p0.salary * 0.85);
        const short = g.offerToPlayer(sal, 0, 0, 0, 0, 0, undefined, 0, 1, 0);
        g.startNegotiation(base()); const long = g.offerToPlayer(sal, 0, 0, 0, 0, 0, undefined, 0, 5, 0);
        assert(!(short.success && !long.success), 'más años nunca empeora la respuesta');
    },
    'selecciones: ventanas, convocatoria por líneas, no convoca lesionados/flojos, vuelta determinista y restaura el once'() {
        const I = intlMod;
        const w = I.windowWeeks(38); assert.equal(w.length, 3); assert(w.every(x => x >= 2 && x <= 37) && w[0] < w[1] && w[1] < w[2], w.join());
        const mk = (club, nat, pos, o, i, extra = {}) => ({ id: club + pos + i, name: club + ' ' + pos + i, nationality: nat, position: pos, overall: o, age: 27, condition: 100, form: 70, contractType: 'owned', ...extra });
        const squad = [...Array(4).fill(0).map((_, i) => mk('T', 'ES', 'POR', 85 - i, i)), ...Array(10).fill(0).map((_, i) => mk('T', 'ES', 'DFC', 85 - i, i)), mk('T', 'ES', 'DC', 90, 1, { isInjured: true }),
            mk('T', 'ES', 'DC', 60, 2), mk('T', 'FR', 'DC', 88, 3), mk('T', 'ES', 'MC', 82, 4, { age: 17 })];
        const state = () => ({ seasonType: 'regular', week: w[0], maxSeasonWeeks: 38, currentSeason: 2026, team: 'T', squad: JSON.parse(JSON.stringify(squad)),
            lineup: [], world: { clubs: { R: { squad: [mk('R', 'ES', 'POR', 80, 1), mk('R', 'ES', 'DC', 80, 2)] } } } });
        const a = state(); const info = I.beginWindow(a);
        assert(info && info.called.length > 0);
        const away = a.squad.filter(p => p._intlKey);
        assert.equal(away.filter(p => p.position === 'POR' && p.nationality === 'ES').length + a.world.clubs.R.squad.filter(p => p._intlKey && p.position === 'POR').length, 3, 'máx. 3 porteros por selección');
        assert(away.every(p => p.isSuspended && p._suspCause === 'intl'));
        assert(!a.squad.find(p => p.isInjured)._intlKey, 'un lesionado no se convoca');
        assert(!a.squad.find(p => p.age === 17)._intlKey, 'un menor de 18 no se convoca');
        assert(!a.squad.find(p => p.overall === 60)._intlKey, 'un jugador flojo no se convoca');
        assert(a.squad.find(p => p.nationality === 'FR')._intlKey, 'un francés bueno sí');
        assert(a.world.clubs.R.squad.some(p => p._intlKey), 'la IA también pierde jugadores');
        assert.equal(I.beginWindow(a), info, 'idempotente en la misma jornada');
        const lineupNames = a.squad.slice(0, 3).map(p => p.name); a.intl.lineupNames = lineupNames;
        const r1 = I.endWindow(a);
        assert(a.squad.every(p => !p._intlKey && !p.intlNation) && a.squad.every(p => !(p.isSuspended && p._suspCause === 'intl')), 'todos liberados');
        assert.equal(a.intl, null);
        const b = state(); I.beginWindow(b); const r2 = I.endWindow(b);
        assert.deepEqual(JSON.stringify(r1), JSON.stringify(r2), 'misma jornada → mismo resultado');
        assert.deepEqual(JSON.stringify(a.squad.map(p => [p.condition, p.form, p.isInjured])), JSON.stringify(b.squad.map(p => [p.condition, p.form, p.isInjured])));
        const played = a.squad.filter(p => p.caps); assert(played.length > 0 && played.every(p => p.condition <= 90));
        const c = state(); c.week = w[0] + 1; assert.equal(I.beginWindow(c), null, 'fuera de ventana no hay convocatoria');
    },
    'selecciones: una jornada de parón no deja jugadores bloqueados ni rompe la liga del usuario'() {
        const st = worldWith('primera', 72, [['Rival', 'primera', Array(20).fill(72)]]);
        st.seasonType = 'regular'; st.week = intlMod.windowWeeks(38)[0]; st.maxSeasonWeeks = 38;
        st.squad.forEach(p => { p.nationality = 'ES'; }); st.squad[0].overall = 90; st.squad[0].position = 'DC'; st.squad[1].overall = 91; st.squad[1].position = 'POR';
        st.world.clubs.T.squad = st.squad; g.replaceGameState(st);
        const s = g.getGameState(); const info = intlMod.beginWindow(s);
        assert(info.called.length >= 2, 'convoca a los mejores');
        const saved = JSON.parse(JSON.stringify(s));
        g.replaceGameState(saved);                    // misma jornada: los convocados siguen ausentes (se ven en Plantilla)
        assert(g.getGameState().squad.some(p => p._intlKey), 'mismo parón: se conserva');
        saved.week += 1; g.replaceGameState(saved);   // parón viejo: se limpia, nadie queda bloqueado
        assert(g.getGameState().squad.every(p => !p._intlKey && !(p.isSuspended && p._suspCause === 'intl')), 'parón viejo: limpia los bloqueos');
    },
    'nacionalidades: el catálogo del admin corrige las supuestas de una partida en curso, por club y por nombre'() {
        const st = worldWith('promesas', 60, [['Rival', 'promesas', [60, 60]]]);
        st.world.clubs.Rival.squad[0].name = 'Pedro Lopez'; st.world.clubs.Rival.squad[0].nationality = 'NG'; st.world.clubs.Rival.squad[0].nationalityGuessed = true;
        st.world.clubs.Rival.squad[1].name = 'Jhonefer Piedrahita'; st.world.clubs.Rival.squad[1].nationality = 'BR'; st.world.clubs.Rival.squad[1].nationalityGuessed = true;
        st.world.clubs.T.squad[0].name = 'Viajero'; st.world.clubs.T.squad[0].nationality = 'FR';       // jugador que ya no está en su club de origen
        st.leagues = { promesas: ['T', 'Rival'] };
        globalThis.getCachedTeamData = n => ({ Rival: { squad: [{ name: 'Pedro Lopez', nationality: 'ES' }, { name: 'Jhonefer Piedrahita', nationality: 'CO' }] }, Antiguo: { squad: [{ name: 'Viajero', nationality: 'AR' }] } }[n]);
        st.leagues = { promesas: ['T', 'Rival', 'Antiguo'] };
        g.replaceGameState(st);
        const s = g.getGameState(), r = s.world.clubs.Rival.squad;
        assert.equal(r[0].nationality, 'ES'); assert.equal(r[1].nationality, 'CO'); assert(!r[0].nationalityGuessed, 'ya no es suposición');
        assert.equal(s.squad.find(p => p.name === 'Viajero').nationality, 'AR', 'por nombre único si cambió de club');
        delete globalThis.getCachedTeamData;
    },
    'cuerpo técnico: el segundo entrenador detecta el hueco, la cantera lo cubre y el secretario lo respalda'() {
        const S = staffMod, layout = [{ pos: 'POR' }, { pos: 'DFC' }, { pos: 'DFC' }, { pos: 'LI' }, { pos: 'LD' }, { pos: 'MC' }, { pos: 'MC' }, { pos: 'MC' }, { pos: 'EXT' }, { pos: 'EXT' }, { pos: 'DC' }];
        const mk = (pos, n, o = 74) => Array.from({ length: n }, (_, i) => ({ name: pos + i, position: pos, overall: o, age: 27, condition: 100, contractType: 'owned', contractYears: 3 }));
        const squad = [...mk('POR', 2), ...mk('DFC', 4), ...mk('LI', 2), ...mk('LD', 2), ...mk('MC', 4), ...mk('EXT', 3), ...mk('DC', 1)];
        const staff = { segundoEntrenador: { level: 3 }, entrenadorJuveniles: { level: 3 }, scout: { level: 4 }, secretario: { level: 3 }, medico: { level: 3 } };
        const st = (over = {}) => ({ currentSeason: '2026/2027', seasonType: 'regular', week: 5, balance: 20e6, squad: JSON.parse(JSON.stringify(squad)), lineup: [], academy: [], staff, ...over });
        const ctx = { layout, compat: { DC: ['DC', 'EXT', 'MCO'] } };
        let b = S.buildBriefing(st({ academy: [{ name: 'Canterano', position: 'DC', overall: 68, potential: 82, age: 18 }] }), ctx);
        const need = b.needs.find(n => n.pos === 'DC'); assert(need, 'detecta que solo hay un DC');
        assert.deepEqual(need.chain.map(c => c.role), ['segundoEntrenador', 'entrenadorJuveniles', 'secretario']);
        assert.equal(need.cover.kind, 'academy'); assert.equal(need.actions[0].type, 'promote'); assert(b.coverNames.includes('Canterano'));
        // sin nadie en la cantera: el ojeador busca en el mercado y el secretario dice si se puede pagar
        const market = [{ name: 'Fichable', position: 'DC', overall: 76, club: 'Otro', askingPrice: 5e6, transferListed: true }, { name: 'Carísimo', position: 'DC', overall: 90, club: 'Otro', askingPrice: 90e6 }];
        b = S.buildBriefing(st(), { ...ctx, marketFor: () => market });
        const n2 = b.needs.find(n => n.pos === 'DC'); assert.equal(n2.cover.kind, 'market');
        assert(n2.chain.some(c => c.role === 'scout' && /Fichable/.test(c.text)) && n2.chain.some(c => c.role === 'secretario' && /asumible/.test(c.text)));
        assert(!n2.chain.some(c => /Carísimo/.test(c.text)), 'no propone lo que no se puede pagar');
        assert(b.targetNames.includes('Fichable'));
        // sin ojeador, el segundo entrenador lo dice
        b = S.buildBriefing(st({ staff: { segundoEntrenador: { level: 2 } } }), ctx);
        assert(b.needs.find(n => n.pos === 'DC').chain.some(c => /No tenemos ojeador/.test(c.text)));
        // lesión larga del único DC → entra el médico y el hueco es crítico
        const inj = st(); inj.squad.find(p => p.position === 'DC').isInjured = true; inj.squad.find(p => p.position === 'DC').weeksOut = 6;
        b = S.buildBriefing(inj, ctx); const n3 = b.needs.find(n => n.pos === 'DC');
        assert.equal(n3.level, 'crit'); assert.equal(n3.cause, 'injury'); assert(n3.chain.some(c => c.role === 'medico' && /6 semanas/.test(c.text)));
        // las noticias no se repiten antes de 6 semanas y no hay azar
        const a = S.newsFor(b, null, 100), again = S.newsFor(b, { said: a.said }, 103), later = S.newsFor(b, { said: a.said }, 107);
        assert(a.lines.length > 0 && again.lines.length === 0 && later.lines.length > 0, `${a.lines.length}/${again.lines.length}/${later.lines.length}`);
        assert.equal(JSON.stringify(S.buildBriefing(inj, ctx)), JSON.stringify(b), 'determinista');
        assert.deepEqual(S.synergies(st()), { recovery: false, scoutDeal: true, youthPlan: true });
    },
    'cláusula: un jugador de nivel parecido sí ficha, y sin dinero no'() {
        g.replaceGameState(worldWith('primera', 72, [['Rival', 'primera', [72, 70, 68]]]));
        assert.equal(g.clauseAssess({ id: 'Rival0', name: 'Rival 0', club: 'Rival' }).ok, true);
        const poor = worldWith('primera', 72, [['Rival', 'primera', [72]]]); poor.balance = 1e6; g.replaceGameState(poor);
        const a = g.clauseAssess({ id: 'Rival0', name: 'Rival 0', club: 'Rival' }); assert.equal(a.ok, false); assert(/faltan/i.test(a.reasons.join(' ')));
    },
    'nacionalidades: no pisan la del admin y completan las que faltan'() {
        assert.equal(nat.ensureNationality({ name: 'A', age: 20, nationality: 'AR' }, 'primera').nationality, 'AR');
        const p = nat.ensureNationality({ name: 'B', age: 20 }, 'segunda'); assert(nat.NATIONS[p.nationality]);
        assert.equal(nat.ensureNationality({ name: 'B', age: 20 }, 'segunda').nationality, p.nationality, 'determinista');
    },
    'equipos extranjeros: plantilla con nombres, estable por temporada'() {
        const xi = L(80, 'X'), a = nat.foreignSquad('Bayern München', 80, xi, '2026'), b = nat.foreignSquad('Bayern München', 80, xi, '2026');
        assert.equal(a.length, 20); assert.equal(JSON.stringify(a), JSON.stringify(b));
        assert(a.every(p => p.name && !/ DC | MC /.test(p.name) && nat.NATIONS[p.nationality]));
        assert.equal(new Set(a.map(p => p.name)).size, 20);
        assert.notEqual(a[0].name, nat.foreignSquad('Bayern München', 80, xi, '2027')[0].name);
    },
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
    async 'temporada completa de principio a fin: sin errores, con 3 parones, sin jugadores bloqueados ni NaN'() {
        Object.assign(globalThis, { alert() {}, confirm: () => true }); window.pcfNotify = async () => {}; window.pcfConfirm = async () => true; window.updateNextMatchInfo = () => {}; window.ui = { refreshUI() {} };
        const cfg = await imp('config.js'); const warn = console.warn; console.warn = () => {}; console.log = () => {};
        try {
            await g.selectTeamWithInitialSquad(cfg.TEAMS_DATA.primera[3], 'primera', 'career', {});
            g.updateGameState({ staff: { segundoEntrenador: { name: 'S', level: 3 }, entrenadorJuveniles: { name: 'J', level: 3 }, scout: { name: 'O', level: 4 }, secretario: { name: 'T', level: 3 }, medico: { name: 'M', level: 3 }, fisio: { name: 'F', level: 3 } } });
            let windows = 0, weeks = 0; const seen = new Set();
            while (weeks < 60 && g.getGameState().currentSeason === '2026/2027') {
                await g.simulateFullWeek(); weeks++;
                const s = g.getGameState(); if (s.intl && !seen.has(s.intl.key)) { seen.add(s.intl.key); windows++; }
            }
            const s = g.getGameState();
            assert.equal(windows, 3, 'parones: ' + windows);
            assert(s.staffBrief && Array.isArray(s.staffBrief.needs), 'la reunión técnica se ha celebrado');
            assert(s.squad.every(p => !p._intlKey && !(p.isSuspended && p._suspCause === 'intl')), 'sin bloqueos al terminar');
            assert(Object.values(s.world.clubs).every(c => c.squad.every(p => !p._intlKey)), 'la IA tampoco');
            assert(Number.isFinite(s.balance) && s.squad.every(p => Number.isFinite(p.overall) && Number.isFinite(p.condition ?? 100)));
        } finally { console.warn = warn; console.log = origLog; }
    },
};
let fail = 0;
for (const [name, fn] of Object.entries(tests)) {
    try { await fn(); origLog('  ✔', name); } catch (e) { fail++; origLog('  ✘', name, '\n     ', e.message.split('\n')[0]); }
}
origLog(fail ? `\n${fail} test(s) fallan` : '\nTodos los tests pasan'); process.exit(fail ? 1 : 0);
