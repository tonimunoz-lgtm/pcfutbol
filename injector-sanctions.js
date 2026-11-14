// ============================================================
// injector-sanctions.js — Organismos (RFEF / UEFA / FIFA): incidentes de grada, cierres de estadio, multas y avisos
// Todo es raro y reproducible: cada partido en casa tira un dado con SEMILLA (equipo+temporada+nº de partido), así
// que recargar la partida no cambia el resultado y las partidas guardadas no se rompen.
//   · Incidente por partido en casa (liga): fácil 0,6 % · normal 1,2 % · difícil 2 %; ×2,5 en gran derbi, ×1,5 derbi
//     menor, ×1,4 si pierdes. Tipos: invasión de campo 35 % · objetos al árbitro 40 % · cánticos racistas 25 %.
//   · Sanciones: invasión → multa (reincidencia: 1 partido a puerta cerrada) · objetos → 1/2/3 partidos a puerta
//     cerrada según reincidencia · cánticos → cierre parcial (60 % de aforo) 1-2 partidos + multa.
//   · Entrenador: ~1,5 % por partido, multa y pérdida de confianza.
//   · Finanzas: saldo negativo → aviso de la FIFA (3 sem), bloqueo de fichajes (10 sem, 8 de castigo);
//     en competición europea con saldo negativo → aviso de la UEFA (Fair Play Financiero).
// Estado: gameState.sanctions = { seen, closure:{left,partial}, hist:{invasion,objetos,cantos}, banLeft, debtWeeks,
//         lastWeek, flags, finesTotal }
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();   // sin el mundo completo: se consulta cada pocos segundos
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const RATE = { easy: .006, normal: .012, hard: .02 };
    const FINE = { primera: 150000, segunda: 40000, rfef_grupo1: 10000, rfef_grupo2: 10000, promesas: 1000 };
    const hash = str => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
    const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const S0 = () => ({ seen: 0, closure: { left: 0, partial: false }, hist: { invasion: 0, objetos: 0, cantos: 0 }, banLeft: 0, debtWeeks: 0, lastWeek: '', flags: {}, finesTotal: 0 });
    const SS = s => ({ ...S0(), ...(s.sanctions || {}), closure: { ...S0().closure, ...(s.sanctions?.closure || {}) }, hist: { ...S0().hist, ...(s.sanctions?.hist || {}) }, flags: { ...(s.sanctions?.flags || {}) } });
    const organ = s => s.division === 'promesas' ? 'la RFEF' : 'el Comité de Competición de la RFEF';
    const fineBase = s => FINE[s.division] ?? 10000;
    const news = (t, k) => gl().addNews?.(t, k || 'warning');

    function pay(s, fine, patch = {}) {
        const S = SS(s);
        return { balance: (s.balance || 0) - fine, ...patch, sanctions: { ...(patch.sanctions || S), finesTotal: (S.finesTotal || 0) + fine } };
    }
    const press = item => window.pcfQueuePress?.(item);

    // ── Incidentes de grada tras un partido en casa ───────────
    function incident(s, S, m, rival, derbyLv, lost, idx, forceKind) {
        const r = rng(hash(`${s.team}|${s.currentSeason}|${idx}|${m.week}`));
        const diff = s.difficulty || 'normal';
        let p = (RATE[diff] ?? RATE.normal) * (derbyLv >= 2 ? 2.5 : derbyLv === 1 ? 1.5 : 1) * (lost ? 1.4 : 1);
        if (forceKind || r() < p) {
            const t = r(), kind = forceKind || (t < .35 ? 'invasion' : t < .75 ? 'objetos' : 'cantos');
            const rep = S.hist[kind] || 0, base = fineBase(s);
            let fine = 0, left = 0, partial = false, pcfKind = kind, txt = '', sub = '';
            if (kind === 'invasion') {
                fine = base; if (rep >= 1) { left = 1; pcfKind = 'invasion'; } else pcfKind = 'multa_club';
                txt = left ? 'El Comité ordena un partido a puerta cerrada por la reincidencia.' : 'Primera infracción: multa económica y apercibimiento.';
            } else if (kind === 'objetos') {
                fine = Math.round(base * 1.5); left = clamp(rep + 1, 1, 3); if (left >= 2) pcfKind = 'estadio_cerrado';
                txt = `Cierre del estadio durante ${left} partido${left > 1 ? 's' : ''} (a puerta cerrada).`;
            } else {
                fine = base * 2; left = rep >= 1 ? 2 : 1; partial = true;
                txt = `Cierre parcial de la grada (aforo reducido al 60 %) durante ${left} partido${left > 1 ? 's' : ''}.`;
            }
            const patch = { sanctions: { ...S, hist: { ...S.hist, [kind]: rep + 1 }, closure: left ? { left, partial } : S.closure },
                boardConfidence: clamp((s.boardConfidence ?? 65) - (left ? 3 : 1.5), 0, 100), popularity: clamp((s.popularity || 0) - (kind === 'cantos' ? 2 : 1), 0, 100) };
            const NW = { invasion: `Aficionados invadieron el campo ante ${rival}`, objetos: `Se lanzaron objetos al árbitro y al césped ante ${rival}`, cantos: `Se oyeron cánticos racistas en la grada ante ${rival}` };
            gl().updateGameState(pay(s, fine, patch));
            news(`⚖️ ${organ(s)} sanciona al club: ${NW[kind]}. Multa de ${fmt(fine)} €. ${txt}`, 'danger');
            press({ kind: pcfKind, incident: kind, rival, fine, closure: left, partial, organ: organ(s), repeat: rep >= 1, sanction: txt });
            window.pcfToast?.(`⚖️ Sanción: ${NW[kind]}`, { type: 'warn', duration: 7000 });
            return true;
        }
        // Sanción al entrenador por protestar (independiente del incidente de grada)
        if (r() < .015 * (lost ? 2 : 1)) {
            const fine = Math.round(fineBase(s) * .3);
            gl().updateGameState(pay(s, fine, { boardConfidence: clamp((s.boardConfidence ?? 65) - 1, 0, 100) }));
            news(`⚖️ ${organ(s)} multa a tu entrenador con ${fmt(fine)} € por protestar al árbitro ante ${rival}.`, 'warning');
            press({ kind: 'sancion_tecnico', rival, fine, organ: organ(s) });
            return true;
        }
        return false;
    }

    function processMatches(s) {
        const mine = (s.matchHistory || []).filter(m => !m.playoff && !m.administrative && (m.home === s.team || m.away === s.team));
        let S = SS(s);
        if (mine.length < S.seen) S = { ...S, seen: 0 };
        if (mine.length === S.seen) { if (S !== s.sanctions && !s.sanctions) return; return; }
        for (let i = S.seen; i < mine.length; i++) {
            const m = mine[i]; if (m.home !== s.team) continue;
            S = SS({ ...gs(), sanctions: S });
            if (S.closure.left > 0) {                         // este partido se jugó bajo cierre
                S = { ...S, closure: { ...S.closure, left: S.closure.left - 1 } };
                gl().updateGameState({ sanctions: S });
                if (S.closure.left === 0) news('⚖️ Se cumple la sanción: el estadio vuelve a abrir al público.', 'info');
                continue;
            }
            const [h, a] = String(m.score || '0-0').split('-').map(Number);
            const lost = h < a, rival = m.away;
            const dl = window.pcfRivalries?.of?.(s.team, rival)?.level || 0;
            gl().updateGameState({ sanctions: S });
            incident(gs(), S, m, rival, dl, lost, i);
            S = SS(gs());
        }
        gl().updateGameState({ sanctions: { ...S, seen: mine.length } });
    }

    // ── Finanzas: avisos FIFA / UEFA ──────────────────────────
    function weekly(s) {
        const key = `${s.currentSeason}|${s.seasonType}|${s.week || 0}`;
        let S = SS(s); if (S.lastWeek === key) return; S = { ...S, lastWeek: key };
        const neg = (s.balance || 0) < 0;
        S.debtWeeks = neg ? S.debtWeeks + 1 : Math.max(0, S.debtWeeks - 2);
        if (!neg && S.debtWeeks === 0) S.flags = {};
        if (S.banLeft > 0 && s.seasonType === 'regular') { S.banLeft--; if (S.banLeft === 0) news('⚖️ La FIFA levanta el bloqueo de fichajes del club.', 'success'); }
        let patch = { sanctions: S };
        if (S.debtWeeks >= 3 && !S.flags.deuda) {
            S.flags = { ...S.flags, deuda: true };
            patch.boardConfidence = clamp((s.boardConfidence ?? 65) - 3, 0, 100);
            news(`⚖️ Denuncia por impagos: la FIFA recibe una reclamación contra el club por deudas. Saldo: ${fmt(s.balance)} €.`, 'danger');
            press({ kind: 'fifa_deuda', balance: s.balance });
        }
        if (S.debtWeeks >= 6 && !S.flags.fair && s.competitions?.europeanComp) {
            S.flags = { ...S.flags, fair: true };
            const fine = Math.min(500000, Math.round(Math.abs(s.balance) * .02));
            patch = pay({ ...s, sanctions: S }, fine, { ...patch, boardConfidence: clamp((s.boardConfidence ?? 65) - 3, 0, 100), sanctions: S });
            news(`⚖️ La UEFA abre expediente al club por incumplir el Fair Play Financiero. Multa: ${fmt(fine)} €.`, 'danger');
            press({ kind: 'uefa_fairplay', fine, balance: s.balance });
        }
        if (S.debtWeeks >= 10 && !S.flags.ban) {
            S.flags = { ...S.flags, ban: true }; S.banLeft = 8;
            patch.boardConfidence = clamp((s.boardConfidence ?? 65) - 4, 0, 100);
            news('⚖️ La FIFA bloquea los fichajes del club durante 8 semanas por sus deudas. Equilibra las cuentas.', 'danger');
            press({ kind: 'fifa_fichajes', balance: s.balance, weeks: 8 });
        }
        gl().updateGameState(patch);
    }

    function tick() {
        try { const s = gs(); if (!s || !s.team || s.seasonType !== 'regular' && s.seasonType !== 'preseason') return; processMatches(s); weekly(gs()); }
        catch (e) { console.warn('sanctions:', e.message); }
    }
    pcfEvery(tick, 2000);
    window.pcfSanctions = { tick, state: () => SS(gs()), test: kind => { const s = gs(); return incident(s, SS(s), { week: s.week || 1 }, 'Rival CF', 0, false, 0, kind); } };
})();
