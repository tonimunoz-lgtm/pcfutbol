// ============================================================
// injector-injury-treatment.js — Ante una lesión grave (≥ 6 semanas) decides el tratamiento, con coste y efecto
//   Conservador: gratis, ritmo normal (10 % de recaída: +3 semanas; −2 % por nivel del médico)
//   Rehabilitación intensiva: −15 % de semanas
//   Operar: −35 % de semanas, pero 20 % de complicaciones (+40 %; −3 % por nivel del médico)
//   Especialista de élite: −50 % y sin riesgo
// Costes en Primera (se escalan por división). El resultado usa semilla fija (jugador+lesión) → reproducible.
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();   // sin el mundo completo: se consulta cada pocos segundos
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const SCALE = { primera: 1, segunda: .35, rfef_grupo1: .08, rfef_grupo2: .08, promesas: .01 };
    const COST = { intensive: 20000, surgery: 90000, elite: 250000 };
    const hash = str => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
    const roll = seed => (hash(seed) % 10000) / 10000;
    const cost = (s, k) => Math.round(COST[k] * (SCALE[s.division] ?? .1) / 100) * 100;
    const lvl = s => s.staff?.medico?.level || 0;
    let FORCE = false, SHOWING = false;
    const BLOCK = '#pcfGala,#matchSummaryModal,#cupResModal,#cupAnnModal,#fd-modal,.pcf-dlg-back,#offersModal.active,#loginModal.active,#gameSelectionModal.active,#pcfDiffModal,#pcfInstall,#pcfPress';
    const blocked = () => { const i = document.getElementById('pcfIntro'); if (i && !i.classList.contains('pcfi--backdrop')) return true; return [...document.querySelectorAll(BLOCK)].some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; }); };
    const upd = (s, name, fn) => (s.squad || []).map(p => p.name === name ? fn(p) : p);

    function apply(s, e, kind) {
        const p = (s.squad || []).find(q => q.name === e.name); if (!p || !p.isInjured) return { patch: {}, result: 'Ya no es necesario: el jugador ha evolucionado.' };
        let w = p.weeksOut, c = 0, msg = '';
        const r = roll(`${p.name}|${s.currentSeason}|${e.weeks}|${kind}`), m = lvl(s);
        if (kind !== 'conservative') { c = cost(s, kind); if ((s.balance || 0) < c) { kind = 'conservative'; c = 0; msg = 'No hay presupuesto para ese tratamiento: se opta por el conservador. '; } }
        if (kind === 'conservative') {
            if (r < Math.max(0, .10 - .02 * m)) { w += 3; msg += `${p.name} sufre una recaída y tardará 3 semanas más.`; } else msg += `${p.name} sigue el tratamiento conservador sin sobresaltos.`;
        } else if (kind === 'intensive') { w = Math.max(1, Math.ceil(w * .85)); msg += `La rehabilitación intensiva acorta su baja: ${w} semanas.`; }
        else if (kind === 'surgery') {
            if (r < Math.max(.02, .20 - .03 * m)) { w = Math.ceil(w * 1.4); msg += `¡Complicaciones tras la operación! Tardará ${w} semanas en volver.`; }
            else { w = Math.max(1, Math.ceil(w * .65)); msg += `Operación con éxito: volverá en ${w} semanas.`; }
        } else { w = Math.max(1, Math.ceil(w * .5)); msg += `El especialista logra un plazo récord: ${w} semanas.`; }
        return { patch: { balance: (s.balance || 0) - c, squad: upd(s, p.name, q => ({ ...q, weeksOut: w, treated: true })) }, result: `${msg}${c ? ` Coste: ${fmt(c)} €.` : ''}` };
    }
    const EV = {
        id: 'injury_treatment', w: 1, cd: 0, icon: '🩺', title: 'Lesión grave: ¿qué tratamiento?',
        eligible(s) {
            if (!FORCE) return null;
            const p = (s.squad || []).find(q => q.isInjured && q.weeksOut >= 6 && !q.treated && !q.treatAsked && q.contractType !== 'loaned_out'); if (!p) return null;
            return { name: p.name, weeks: p.weeksOut, inj: p.injuryType || 'lesión', c: { i: cost(s, 'intensive'), o: cost(s, 'surgery'), e: cost(s, 'elite') } };
        },
        text: e => `${e.name} sufre una lesión grave (${e.inj}) y estaría de baja ${e.weeks} semanas. El cuerpo médico propone: conservador (gratis, ritmo normal, riesgo de recaída), rehabilitación intensiva (${fmt(e.c.i)} €, −15 %), operar (${fmt(e.c.o)} €, −35 % con riesgo de complicaciones) o especialista de élite (${fmt(e.c.e)} €, −50 % sin riesgo). Un buen médico reduce los riesgos.`,
        choices: [
            { label: 'Tratamiento conservador', tags: '🩺', run: (s, e) => apply(s, e, 'conservative') },
            { label: 'Rehabilitación intensiva', tags: '💶 🩺', run: (s, e) => apply(s, e, 'intensive') },
            { label: 'Operar', tags: '💶 🏥', run: (s, e) => apply(s, e, 'surgery') },
            { label: 'Especialista de élite', tags: '💶 ⭐', run: (s, e) => apply(s, e, 'elite') }
        ]
    };
    async function maybeShow() {
        if (SHOWING || !window.pcfEvents?.force) return;
        const s = gs(); if (!s || !s.squad) return;
        // limpiar marcas de jugadores ya recuperados
        if (s.squad.some(p => !p.isInjured && (p.treated || p.treatAsked))) gl().updateGameState({ squad: s.squad.map(p => !p.isInjured && (p.treated || p.treatAsked) ? { ...p, treated: false, treatAsked: false } : p) });
        const p = s.squad.find(q => q.isInjured && q.weeksOut >= 6 && !q.treated && !q.treatAsked && q.contractType !== 'loaned_out'); if (!p || blocked()) return;
        SHOWING = true; const nm = p.name;
        let pr; try { FORCE = true; pr = window.pcfEvents.force('injury_treatment'); } finally { FORCE = false; }
        try { await pr; } catch (e) { /* */ } finally { SHOWING = false; const t = gs(); if (t?.squad) gl().updateGameState({ squad: upd(t, nm, q => ({ ...q, treatAsked: true })) }); }
    }
    function init() {
        const api = window.pcfEvents; if (!api?.EVENTS) { setTimeout(init, 600); return; }
        if (!api.EVENTS.some(e => e.id === EV.id)) api.EVENTS.push(EV);
        pcfEvery(() => { try { maybeShow(); } catch (e) { console.warn('treatment:', e.message); } }, 2500);
    }
    init();
    window.pcfInjuryTreatment = { maybeShow, cost };
})();
