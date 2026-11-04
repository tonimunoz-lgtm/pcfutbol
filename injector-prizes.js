// ============================================================
// injector-prizes.js — Premios económicos por competición
// Se pagan a partir de eventos reales (resultado de un partido de copa o de
// Europa, y fin de temporada), no leyendo el texto de las noticias.
// Importes aproximados, inspirados en los repartos reales (UEFA, Copa, LaLiga).
// Cada premio se anota en gameState.fd_prizes (panel «Premios económicos
// recibidos» de Gestión comercial) y en el historial de movimientos de Caja.
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getGameState?.();
    const fmt = n => Math.round(n).toLocaleString('es-ES');
    const M = 1e6, K = 1e3;

    // ── Liga: reparto por puesto final ───────────────────────────
    const LEAGUE = {
        primera: pos => [25, 21, 18, 15, 12, 10, 8, 7, 6, 5, 5, 5, 4, 4, 3.5, 3.5, 3, 3, 2.5, 2.5][pos - 1] * M,
        segunda: pos => (pos === 1 ? 3.0 : pos === 2 ? 2.6 : pos === 3 ? 2.2 : pos === 4 ? 1.9 : pos === 5 ? 1.6 : pos === 6 ? 1.4 : pos <= 10 ? 1.0 : pos <= 16 ? 0.7 : 0.5) * M,
        rfef: pos => (pos === 1 ? 600 : pos === 2 ? 450 : pos <= 6 ? 300 : pos <= 12 ? 180 : 100) * K,
        promesas: pos => (pos === 1 ? 60 : pos <= 5 ? 35 : pos <= 10 ? 20 : 10) * K
    };
    const leagueKey = d => (d === 'rfef_grupo1' || d === 'rfef_grupo2') ? 'rfef' : d;
    const CHAMPION = { primera: 5 * M, segunda: 1 * M, rfef: 300 * K, promesas: 30 * K };
    const PROMOTION_TO = { primera: 8 * M, segunda: 1.5 * M, rfef: 200 * K };       // por ascender a esa categoría
    const PARACHUTE_FROM = { primera: 12 * M, segunda: 1.2 * M, rfef: 150 * K };    // ayuda por descender desde ella
    const DIV_NAME = { primera: 'Primera División', segunda: 'Segunda División', rfef: 'Primera RFEF', promesas: 'Liga Promesas' };

    // ── Copa del Rey: premio al pasar cada ronda ─────────────────
    const COPA_ROUND = { copa_r1: 15 * K, copa_r32: 40 * K, copa_r16: 120 * K, copa_qf: 300 * K, copa_sf: 650 * K };
    const COPA_FINALIST = 1.2 * M, COPA_CHAMPION = 2.5 * M;

    // ── Europa ───────────────────────────────────────────────────
    const EU = {
        champions:       { label: 'Champions League', start: 18.62 * M, win: 2.1 * M, draw: 0.7 * M,
                           reach: { round16: 11 * M, quarterfinals: 12.5 * M, semifinals: 15 * M, final: 18.5 * M }, champion: 6.5 * M },
        europaLeague:    { label: 'Europa League', start: 4.31 * M, win: 0.45 * M, draw: 0.15 * M,
                           reach: { round16: 1.0 * M, quarterfinals: 1.5 * M, semifinals: 2.4 * M, final: 4.0 * M }, champion: 5.0 * M },
        conferenceLague: { label: 'Conference League', start: 3.17 * M, win: 0.4 * M, draw: 0.133 * M,
                           reach: { round16: 0.8 * M, quarterfinals: 1.1 * M, semifinals: 1.8 * M, final: 3.0 * M }, champion: 4.0 * M }
    };
    const NEXT_PHASE = { playoff_leg2: 'round16', round16: 'quarterfinals', quarterfinals: 'semifinals', semifinals: 'final' };
    const PHASE_TXT = { round16: 'octavos', quarterfinals: 'cuartos', semifinals: 'semifinales', final: 'la final' };

    function pay(key, label, amount, season) {
        const s = gs();
        if (!s || !(amount > 0)) return false;
        const season2 = season || s.currentSeason;
        const list = Array.isArray(s.fd_prizes) ? s.fd_prizes : [];
        if (list.some(p => p.key === key && p.season === season2)) return false;     // nunca dos veces
        const entry = { key, label, amount: Math.round(amount), season: season2, week: s.week };
        gl().updateGameState({ balance: (s.balance || 0) + entry.amount, fd_prizes: [...list, entry] });
        gl().addNews(`🏆 Premio: ${label} → +${fmt(amount)}€`, 'success');
        if (window._financeRegisterMovement) window._financeRegisterMovement('income', `Premio: ${label}`, entry.amount);
        return true;
    }

    // ── Taquilla de los partidos en casa de copa, Europa y playoff ──
    // Antes solo cobraban entradas los partidos de liga. Europa paga más por entrada.
    const GATE_MULT = { copa: 1.0, champions: 3.0, europaLeague: 1.8, conferenceLague: 1.3, playoff: 1.4 };
    const GATE_TXT = { copa: 'Copa del Rey', champions: 'Champions League', europaLeague: 'Europa League', conferenceLague: 'Conference League', playoff: 'Playoff de ascenso' };
    function onGate(m) {
        const s = gs();
        if (!s || !m || !m.isHome || m.neutral || !window.pcfEconomy?.attendance) return;
        const mult = GATE_MULT[m.type]; if (!mult) return;
        const att = window.pcfEconomy.attendance(s);
        const amount = Math.round(att * (s.ticketPrice || 20) * mult);
        if (!(amount > 0)) return;
        gl().updateGameState({ balance: (gs().balance || 0) + amount });
        if (window._financeRegisterMovement) window._financeRegisterMovement('income', `Taquilla ${GATE_TXT[m.type]}: ${fmt(att)} espectadores`, amount);
        gl().addNews(`🎟️ Taquilla de ${GATE_TXT[m.type]}: ${fmt(att)} espectadores · +${fmt(amount)}€`, 'info');
    }

    // ── Partidos de copa y de Europa ─────────────────────────────
    function onCupResult(m, r, p) {
        const s = gs();
        if (!s || !m) return;
        try { onGate(m); } catch (e) { console.warn('Taquilla:', e); }
        const phase = m.phase, type = m.type;
        const won = r && r.myGoals > r.oppGoals, drew = r && r.myGoals === r.oppGoals;
        const advances = p && p.advances === true;

        if (type === 'copa') {
            if (phase === 'copa_final') {
                pay('copa_finalista', 'Copa del Rey: llegar a la final', COPA_FINALIST);
                if (advances) pay('copa_campeon', '¡Campeón de la Copa del Rey!', COPA_CHAMPION);
            } else if (advances && COPA_ROUND[phase]) {
                const names = { copa_r1: 'la primera ronda', copa_r32: 'dieciseisavos', copa_r16: 'octavos', copa_qf: 'cuartos', copa_sf: 'semifinales' };
                pay('copa_' + phase, `Copa del Rey: superar ${names[phase]}`, COPA_ROUND[phase]);
            }
            return;
        }
        const cfg = EU[type];
        if (!cfg) return;
        if (/^groups_md/.test(phase)) {
            pay(`${type}_inicio`, `${cfg.label}: participación en la fase de liga`, cfg.start);
            if (won) pay(`${type}_${phase}_win`, `${cfg.label}: victoria (${phase.replace('groups_md', 'jornada ')})`, cfg.win);
            else if (drew) pay(`${type}_${phase}_draw`, `${cfg.label}: empate (${phase.replace('groups_md', 'jornada ')})`, cfg.draw);
            return;
        }
        // Jugar octavos ya implica haber llegado (clasificación directa)
        if (phase === 'round16') pay(`${type}_llegar_round16`, `${cfg.label}: clasificación para octavos`, cfg.reach.round16);
        if (advances && NEXT_PHASE[phase]) {
            const nxt = NEXT_PHASE[phase];
            pay(`${type}_llegar_${nxt}`, `${cfg.label}: llegar a ${PHASE_TXT[nxt]}`, cfg.reach[nxt]);
        }
        if (phase === 'final' && advances) pay(`${type}_campeon`, `¡Campeón de la ${cfg.label}!`, cfg.champion);
    }

    // ── Fin de temporada: puesto en la liga, título, ascenso y descenso ──
    function checkSeasonEnd() {
        const s = gs();
        const sum = s && s.lastSeasonSummary;
        if (!sum || !sum.season || s.prizesPaidFor === sum.season) return;
        gl().updateGameState({ prizesPaidFor: sum.season });
        const key = leagueKey(sum.userDivision), pos = sum.userPosition;
        if (!LEAGUE[key] || !pos) return;
        const season = sum.season;
        pay(`liga_puesto`, `${DIV_NAME[key]}: ${pos}º puesto final`, LEAGUE[key](pos), season);
        if (pos === 1) pay('liga_campeon', `¡Campeón de ${DIV_NAME[key]}!`, CHAMPION[key], season);
        const mv = sum.userMove;
        if (mv) {
            const toKey = leagueKey(mv.to), fromKey = leagueKey(mv.from);
            if (/^ascenso/.test(mv.reason) && PROMOTION_TO[toKey]) pay('ascenso', `Ascenso a ${DIV_NAME[toKey]}`, PROMOTION_TO[toKey], season);
            if (mv.reason === 'descenso' && PARACHUTE_FROM[fromKey]) pay('descenso', `Ayuda por el descenso desde ${DIV_NAME[fromKey]}`, PARACHUTE_FROM[fromKey], season);
        }
    }

    function hookSimulateWeek() {
        const orig = window.simulateWeek;
        if (typeof orig !== 'function') return setTimeout(hookSimulateWeek, 400);
        if (orig._pcfPrizes) return;
        const wrapped = async function (...a) {
            const r = await orig.apply(this, a);
            try { checkSeasonEnd(); } catch (e) { console.error('Premios:', e); }
            return r;
        };
        wrapped._pcfPrizes = true;
        window.simulateWeek = wrapped;
    }
    [1500, 3500, 6500, 10000].forEach(ms => setTimeout(hookSimulateWeek, ms));

    window.PCFPrizes = { onGate, onCupResult, checkSeasonEnd, tables: { LEAGUE, CHAMPION, PROMOTION_TO, PARACHUTE_FROM, COPA_ROUND, EU } };
})();
