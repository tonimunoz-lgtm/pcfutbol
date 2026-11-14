// ============================================================
// injector-rebels.js — Jugadores que fuerzan su salida (caso raro, como en la vida real)
// Calibrado con la realidad: los plantones y rebeldías de verdad son pocos al año (en una gran liga, unos
// cuantos casos) y casi todos ocurren en VERANO (vuelta de vacaciones, pretemporada y ventana de fichajes);
// en invierno hay alguno más en el cierre de enero, y el resto del año es muy raro.
//   · Probabilidad anual en tu club ≈ 3,5 % (normal; 2 % fácil; 5,5 % difícil) y algo más si el jugador está muy quemado
//     (hasta ×2,5). Repartida: 70 % verano, 20 % enero, 10 % resto del año.
//   · Solo puede protagonizarlo un jugador descontento (satisfacción < 45), importante (media ≥ la del once)
//     y como mucho uno cada dos temporadas.
// Fases: 1) pide salir · 2) no se presenta (en rebeldía: no puede jugar) · 3) pactada su salida (en el mercado)
// · o venta forzada con rebaja si el club se enroca más de 6 semanas.
// Estado: gameState.rebel = { case, lastEnd, log }
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getGameState?.();
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const rnd = () => Math.random();
    const key = p => p.id ?? p.name;
    const seasonYear = s => parseInt(String(s.currentSeason).split('/')[0], 10) || 2026;
    const absWeek = s => (seasonYear(s) - 2000) * 50 + (s.seasonType === 'preseason' ? 0 : (s.week || 0));
    const RATE = { easy: .02, normal: .035, hard: .055 };
    const PCT = { summer: .70, winter: .20, other: .10 };

    // ¿En qué ventana estamos y cuántas semanas tiene?
    function windowOf(s) {
        if (s.seasonType === 'preseason') return { k: 'summer', weeks: 6 };
        if (s.seasonType !== 'regular') return null;
        const w = s.week || 0;
        if (w <= 2) return { k: 'summer', weeks: 6 };
        if (w >= 18 && w <= 21) return { k: 'winter', weeks: 4 };
        if (w >= 3 && w <= 34) return { k: 'other', weeks: 29 };
        return null;
    }
    const lineupOf = s => (s.lineup || []).map(l => (s.squad || []).find(p => key(p) === key(l)) || l).filter(Boolean);
    function candidates(s) {
        const xi = lineupOf(s); if (xi.length < 8) return [];
        const sorted = xi.map(p => p.overall || 0).sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
        return (s.squad || []).filter(p => p.contractType === 'owned' && p.satisfaction !== undefined && p.satisfaction < 45 &&
            (p.overall || 0) >= med && p.age >= 20 && !p.rebel && !p.transferListed && p.salary > 0);
    }
    function reasonOf(s, p) {
        const xi = new Set(lineupOf(s).map(key));
        if (!xi.has(key(p))) return 'minutos';
        if ((s.popularity || 50) < 40 || ['segunda', 'rfef_grupo1', 'rfef_grupo2', 'promesas'].includes(s.division)) return 'ambicion';
        return 'salario';
    }
    const REASON_TXT = { minutos: 'no tiene los minutos que cree merecer', ambicion: 'quiere competir en un club con más ambición', salario: 'considera que su contrato no refleja su valor' };

    // ── Estado ───────────────────────────────────────────────
    const R = s => s.rebel || { case: null, lastEnd: -9, log: [] };
    const save = (s, patch) => ({ ...R(s), ...patch });
    function updSquad(s, name, fn) { return (s.squad || []).map(p => p.name === name ? fn(p) : p); }
    const news = (t, k) => gl().addNews?.(t, k || 'info');

    function startCase(s, p) {
        const c = { name: p.name, key: key(p), stage: 1, start: absWeek(s), reason: reasonOf(s, p), asked: false, stage2At: null, listedAt: null, nw: Math.round(p.salary * 1.25 / 10) * 10 };
        // Si arranca en pretemporada, directamente «no se presenta tras las vacaciones»
        gl().updateGameState({ rebel: save(s, { case: c }), squad: updSquad(s, p.name, q => ({ ...q, moodMod: clamp((q.moodMod || 0) - 10, -40, 40) })) });
        news(`📰 ${p.name} quiere marcharse: ${REASON_TXT[c.reason]}. Su entorno asegura que "ha perdido la ilusión" por seguir en el club.`, 'warning');
    }
    function endCase(s, why, extra = {}) {
        const r = R(s);
        gl().updateGameState({ rebel: { ...r, case: null, lastEnd: seasonYear(s), log: [...(r.log || []).slice(-9), { season: s.currentSeason, name: r.case?.name, why }] }, ...extra });
    }
    function goRebel(s, msg) {
        const c = R(s).case; if (!c) return;
        const squad = updSquad(s, c.name, q => ({ ...q, rebel: true, moodMod: clamp((q.moodMod || 0) - 15, -40, 40) }))
            .map(q => (q.name !== c.name && q.contractType === 'owned') ? { ...q, moodMod: clamp((q.moodMod || 0) - 2, -40, 40) } : q);
        gl().updateGameState({ rebel: save(s, { case: { ...c, stage: 2, stage2At: absWeek(s), asked: false } }), squad });
        window.pcfQueuePress?.({ kind: 'rebeldia', playerName: c.name, reason: c.reason });
        news(msg || `✊ ${c.name} se declara en rebeldía: no se ha presentado a entrenar y exige su salida. El vestuario está tenso.`, 'error');
        window.ui?.refreshUI?.(gl().getViewState());
    }
    function listForSale(s, mult, msg) {
        const c = R(s).case; if (!c) return;
        const p = (s.squad || []).find(q => q.name === c.name); if (!p) return;
        const val = window.pcfEconomy?.marketValue ? window.pcfEconomy.marketValue(p) : (p.value || 1e6);
        const squad = updSquad(s, c.name, q => ({ ...q, rebel: false, transferListed: true, loanListed: false, askingPrice: Math.round(val * mult), weeksOnMarket: 0 }));
        gl().updateGameState({ rebel: save(s, { case: { ...c, stage: 3, listedAt: absWeek(s) } }), squad });
        news(msg || `📝 ${c.name} vuelve a entrenar mientras se cierra su traspaso. Sale al mercado por ${fmt(val * mult)} €.`, 'info');
        window.ui?.refreshUI?.(gl().getViewState());
    }

    // ── Eventos (decisiones) ─────────────────────────────────
    // El planificador de eventos del vestuario no muestra nada en pretemporada ni en las 2 primeras semanas, que es
    // justo cuando más ocurre esto: por eso las lanzamos nosotros (FORCE solo es true durante la comprobación).
    let FORCE = false, SHOWING = false;
    const BLOCK = '#pcfGala,#matchSummaryModal,#cupResModal,#cupAnnModal,#fd-modal,.pcf-dlg-back,#offersModal.active,#loginModal.active,#gameSelectionModal.active,#pcfDiffModal,#pcfInstall,#pcfPress';
    const blocked = () => { const i = document.getElementById('pcfIntro'); if (i && !i.classList.contains('pcfi--backdrop')) return true; return [...document.querySelectorAll(BLOCK)].some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; }); };
    async function maybeShow() {
        if (SHOWING || !window.pcfEvents?.force) return;
        const s = gs(); const c = s && R(s).case; if (!c || c.asked) return;
        const id = c.stage === 1 ? 'rebel_request' : c.stage === 2 ? 'rebel_standoff' : null; if (!id || blocked()) return;
        SHOWING = true; let pr;
        try { FORCE = true; pr = window.pcfEvents.force(id); } finally { FORCE = false; }
        try { await pr; } catch (e) {} finally { SHOWING = false; }
    }
    const EVENTS = [
        { id: 'rebel_request', w: 1, cd: 0, icon: '🚪', title: 'Un jugador pide marcharse',
          eligible(s) { if (!FORCE) return null; const c = R(s).case; if (!c || c.stage !== 1 || c.asked) return null; const p = (s.squad || []).find(q => q.name === c.name); if (!p) return null; return { name: c.name, reason: c.reason, nw: c.nw, salary: p.salary }; },
          text: e => `${e.name} se ha presentado en tu despacho: ${REASON_TXT[e.reason]} y quiere salir. Su agente ya está llamando a otros clubes. Es una situación delicada: si se enquista, puede no presentarse a entrenar.`,
          choices: [
              { label: 'Negociar: mejorarle el contrato (+25 %)', tags: '💶 🤝', run: (s, e) => {
                  const ok = rnd() < (e.reason === 'salario' ? .78 : e.reason === 'minutos' ? .5 : .35);
                  const mk = (a, res) => ({ patch: a, result: res });
                  const c = R(s).case;
                  if (ok) return mk({ squad: updSquad(s, e.name, q => ({ ...q, salary: e.nw, moodMod: clamp((q.moodMod || 0) + 35, -40, 40) })), rebel: { ...R(s), case: null, lastEnd: seasonYear(s), log: [...(R(s).log || []), { season: s.currentSeason, name: e.name, why: 'renovado' }] } }, `${e.name} acepta la mejora (${fmt(e.nw)} €/sem) y se queda. Todo queda en un susto.`);
                  return mk({ squad: updSquad(s, e.name, q => ({ ...q, salary: e.nw })), rebel: save(s, { case: { ...c, asked: true, stage: 1, forceRebel: true } }) }, `${e.name} rechaza la oferta: «Ya he tomado la decisión». Cobrará más, pero no cambia de idea.`); } },
              { label: 'Aceptar su salida y ponerlo en el mercado', tags: '🚪 💶', run: (s, e) => { const c = R(s).case; return { patch: { rebel: save(s, { case: { ...c, asked: true, listNow: true } }) }, result: `${e.name} sale al mercado y vuelve a entrenar con normalidad mientras se estudian ofertas.` }; } },
              { label: 'Mantenerlo: tiene contrato y no se vende', tags: '😠 ✊', run: (s, e) => { const c = R(s).case; const comply = rnd() < .45; if (comply) return { patch: { squad: updSquad(s, e.name, q => ({ ...q, moodMod: clamp((q.moodMod || 0) - 10, -40, 40) })), rebel: { ...R(s), case: null, lastEnd: seasonYear(s), log: [...(R(s).log || []), { season: s.currentSeason, name: e.name, why: 'acata' }] } }, result: `${e.name} baja la cabeza y seguirá, aunque con cara de pocos amigos.` }; return { patch: { rebel: save(s, { case: { ...c, asked: true, forceRebel: true } }) }, result: `${e.name} no acepta el no por respuesta. Habrá consecuencias.` }; } }
          ] },
        { id: 'rebel_standoff', w: 1, cd: 0, icon: '✊', title: 'Un jugador sigue en rebeldía',
          eligible(s) { if (!FORCE) return null; const c = R(s).case; if (!c || c.stage !== 2 || c.asked) return null; const p = (s.squad || []).find(q => q.name === c.name); if (!p) return null; return { name: c.name, weeks: Math.max(1, absWeek(s) - c.stage2At), salary: p.salary, left: Math.max(0, 6 - (absWeek(s) - c.stage2At)) }; },
          text: e => `${e.name} lleva ${e.weeks} semana${e.weeks > 1 ? 's' : ''} sin presentarse a los entrenamientos y su ausencia pesa en el vestuario. ${e.left > 0 ? `Si no se resuelve en ${e.left} semana${e.left > 1 ? 's' : ''}, el club tendrá que traspasarlo en las peores condiciones.` : 'El plazo se ha agotado.'}`,
          choices: [
              { label: 'Multarlo (2 semanas de sueldo) y exigir que vuelva', tags: '💶 ✊', run: (s, e) => { const back = rnd() < .3; const c = R(s).case;
                  const base = { balance: (s.balance || 0) + e.salary * 2 };
                  if (back) return { patch: { ...base, squad: updSquad(s, e.name, q => ({ ...q, rebel: false, moodMod: clamp((q.moodMod || 0) - 5, -40, 40) })), rebel: { ...R(s), case: null, lastEnd: seasonYear(s), log: [...(R(s).log || []), { season: s.currentSeason, name: e.name, why: 'multa y vuelve' }] } }, result: `${e.name} asume la multa y regresa al grupo. El club ingresa ${fmt(e.salary * 2)} €.` };
                  return { patch: { ...base, rebel: save(s, { case: { ...c, asked: true } }) }, result: `Multa de ${fmt(e.salary * 2)} € (${fmt(e.salary * 2)} € ingresados), pero ${e.name} sigue sin aparecer.` }; } },
              { label: 'Pactar su salida con una rebaja del 15 %', tags: '🚪 💶', run: (s, e) => { const c = R(s).case; return { patch: { rebel: save(s, { case: { ...c, asked: true, listNow: true, mult: .85 } }) }, result: `Acuerdo: ${e.name} vuelve a entrenar y el club lo traspasa por un 15 % menos de su valor.` }; } },
              { label: 'Resistir: no ceder al chantaje', tags: '😠 ⏳', run: (s, e) => { const c = R(s).case; return { patch: { rebel: save(s, { case: { ...c, asked: true } }) }, result: `El club mantiene el pulso. ${e.name} sigue fuera del grupo.` }; } }
          ] }
    ];

    // Efectos diferidos de las decisiones (el sistema de eventos solo aplica el patch)
    function applyPending() {
        const s = gs(); if (!s) return; const c = R(s).case; if (!c) return;
        if (c.stage === 1 && c.forceRebel) { goRebel(s); return; }
        if (c.listNow) { const s2 = gs(); const c2 = R(s2).case; gl().updateGameState({ rebel: save(s2, { case: { ...c2, listNow: false } }) }); listForSale(gs(), c.mult || .9); }
    }

    // ── Bucle semanal ────────────────────────────────────────
    let lastKey = '';
    function tick() {
        const s = gs(); if (!s || !s.team || !s.squad) return;
        const k = `${s.currentSeason}|${s.seasonType}|${s.week}`;
        applyPending();
        maybeShow();
        if (k === lastKey) return; lastKey = k;
        const r = R(s), c = r.case, now = absWeek(s);
        if (c) {
            const p = (s.squad || []).find(q => q.name === c.name);
            if (!p) { endCase(s, c.stage === 3 ? 'vendido' : 'fuera'); if (c.stage === 3) news(`✅ Se cierra el caso de ${c.name}: ya no es jugador del club.`, 'info'); return; }
            if (c.stage === 1 && !c.asked && now - c.start >= 1) {
                // Si el usuario no ha respondido (modal aún no mostrado) no se hace nada: el evento es prioritario
            }
            if (c.stage === 2) {
                // Cada semana, una nueva ronda de decisión; a las 6 semanas, venta forzada
                if (now - c.stage2At >= 6) {
                    const res = gl().sellPlayer?.(c.name);
                    if (res?.success) { endCase(gs(), 'venta forzada'); news(`💥 Harto del pulso, el club traspasa a ${c.name} en las peores condiciones posibles (se pierde dinero).`, 'warning'); }
                    else { gl().updateGameState({ squad: updSquad(s, c.name, q => ({ ...q, rebel: false })) }); endCase(gs(), 'sin comprador'); news(`🤝 ${c.name} vuelve a entrenar al no encontrar comprador, aunque la relación está rota.`, 'warning'); }
                    window.ui?.refreshUI?.(gl().getViewState()); return;
                }
                gl().updateGameState({ rebel: save(s, { case: { ...c, asked: false } }) });
            }
            if (c.stage === 3 && now - (c.listedAt ?? now) >= 8) { endCase(s, 'sin oferta'); news(`🙂 ${c.name} no ha recibido ofertas y se queda, aunque con la relación tocada.`, 'info'); }
            return;
        }
        // ¿Surge un caso nuevo?
        if (s.difficultyChosen === undefined) return;
        const w = windowOf(s); if (!w) return;
        if (seasonYear(s) - (r.lastEnd ?? -9) < 2) return;
        const pool = candidates(s); if (!pool.length) return;
        const base = RATE[s.difficulty || 'normal'] ?? .06;
        const p = pool.sort((a, b) => a.satisfaction - b.satisfaction)[0];
        const motive = 1 + (45 - p.satisfaction) / 30;                      // más descontento = algo más probable
        const prob = base * PCT[w.k] / w.weeks * motive;
        if (rnd() < prob) startCase(s, p);
    }

    function register() {
        const api = window.pcfEvents; if (!api || !api.EVENTS) return false;
        if (api.EVENTS.some(e => e.id === 'rebel_request')) return true;
        EVENTS.forEach(e => api.EVENTS.push(e));
        return true;
    }
    function init() {
        if (!register()) { setTimeout(init, 500); return; }
        setInterval(() => { try { tick(); } catch (e) { console.warn('Rebeldes:', e.message); } }, 2500);
        window.pcfRebels = { EVENTS, tick, startCase: name => { const s = gs(); const p = (s.squad || []).find(q => q.name === name); if (p) startCase(s, p); }, state: () => R(gs()) };
    }
    init();
})();
