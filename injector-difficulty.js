// ============================================================
// injector-difficulty.js — Dificultad + ayudas al club con problemas
// · Al empezar una partida nueva se elige Fácil / Normal / Difícil (se puede cambiar desde Noticias).
// · Si el club entra en apuros aparecen ayudas del entorno, siempre con condiciones, topes y enfriamiento:
//     💶 ampliación de capital (accionistas) · 🏪 empresas locales · 🎟️ campaña de abonados ·
//     🩺 convenio sanitario · 📣 apoyo de la afición.
//   Cuánto más grave el problema, más ayuda (hasta un tope); en Difícil se reduce a la mitad y se espacia.
// Estado guardado en la partida: gameState.difficulty, difficultyChosen y gameState.aid = { last:{tipo:semanaAbs}, log:[] }.
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getGameState?.();
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const P = s => window.pcfDifficulty?.params?.(s) || { aid: 1, cooldown: 1 };
    const level = s => s?.difficulty || 'normal';

    // ── Utilidades ───────────────────────────────────────────
    const BLOCKERS = '#pcfGala,#matchSummaryModal,#cupResModal,#cupAnnModal,#fd-modal,.pcf-dlg-back,#offersModal.active,#pcfIntro,#pcfPress,#gameSelectionModal.active';
    function busy() {
        return [...document.querySelectorAll(BLOCKERS)].some(e => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
        });
    }
    function absWeek(s) {
        const y = parseInt(String(s.currentSeason).split('/')[0], 10) || 2026;
        return (y - 2000) * 50 + (s.seasonType === 'preseason' ? 0 : (s.week || 0));
    }
    function patch(p) { gl().updateGameState(p); }
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ── 1) Elegir dificultad ─────────────────────────────────
    const DESC = {
        easy:   'Más ayudas cuando las necesitas (+50 %), gastos de estructura −15 %, objetivos de la directiva con más margen y una directiva más paciente.',
        normal: 'Equilibrado. Si el club entra en apuros recibirás ayudas del entorno, con condiciones.',
        hard:   'Ayudas a la mitad y más espaciadas, gastos de estructura +12 %, rivales con más ingresos, objetivos más ajustados y una directiva más exigente.'
    };
    function chooseDifficulty(current) {
        return new Promise(resolve => {
            document.getElementById('pcfDiffModal')?.remove();
            const back = document.createElement('div');
            back.id = 'pcfDiffModal'; back.className = 'pcf-dlg-back';
            back.innerHTML = `<div class="pcf-dlg" role="dialog" aria-modal="true"><h3>⚙️ Dificultad</h3>
                <div class="pcf-dlg-body" style="white-space:normal">
                    <p style="margin:0 0 10px">Elige cómo quieres jugar. Puedes cambiarla después desde Noticias.</p>
                    ${['easy', 'normal', 'hard'].map(k => `<button type="button" class="btn" data-lv="${k}" style="display:block;width:100%;text-align:left;margin:0 0 8px;padding:10px 12px;${current === k ? 'box-shadow:0 0 0 2px #ffd24a inset;' : ''}">
                        <strong>${window.pcfDifficulty.LEVELS[k].label}${current === k ? ' (actual)' : ''}</strong><br><span style="font-size:.85em;opacity:.85">${DESC[k]}</span></button>`).join('')}
                </div></div>`;
            const done = k => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(k); };
            const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); done(current || 'normal'); } };
            document.addEventListener('keydown', onKey, true);
            back.querySelectorAll('[data-lv]').forEach(b => { b.onclick = () => done(b.dataset.lv); });
            document.body.appendChild(back);
        });
    }
    async function applyChoice(current) {
        const lv = await chooseDifficulty(current);
        if (lv !== current || gs()?.difficultyChosen === undefined) {
            gl().updateGameState({ difficulty: lv, difficultyChosen: true });
            gl().addNews?.(`⚙️ Dificultad: ${window.pcfDifficulty.LEVELS[lv].label}.`, 'info');
            window.pcfToast?.(`Dificultad: ${window.pcfDifficulty.LEVELS[lv].label}`, { type: 'info' });
        }
        refreshButton();
        return lv;
    }

    // Botón en Noticias, junto a «Sala de trofeos»
    function refreshButton() {
        const box = document.getElementById('trophiesLinkBox');
        if (!box) return;
        let b = document.getElementById('difficultyBtn');
        if (!b) {
            b = document.createElement('button');
            b.id = 'difficultyBtn'; b.type = 'button'; b.className = 'btn';
            b.style.cssText = 'width:100%;max-width:420px;min-height:44px;font-weight:700;margin-top:8px';
            b.onclick = () => applyChoice(level(gs()));
            box.appendChild(b);
        }
        b.textContent = `⚙️ Dificultad: ${window.pcfDifficulty?.LEVELS?.[level(gs())]?.label || 'Normal'}`;
    }

    // ── 2) Ayudas ────────────────────────────────────────────
    const COOLDOWN = { capital: 30, locales: 26, abonados: 20, sanitario: 16, aficion: 14 };
    const CAPS = { primera: [2e6, 40e6], segunda: [5e5, 10e6], rfef_grupo1: [1e5, 2e6], rfef_grupo2: [1e5, 2e6], promesas: [2e4, 2e5] };

    function metrics(s) {
        const E = window.pcfEconomy;
        const cap = Number(s.stadiumCapacity) || 1;
        const att = E?.attendance ? E.attendance(s) : 0;
        const merch = E?.merch ? (E.merch(s).revenue || 0) : 0;
        const income = 0.5 * ((Number(s.ticketPrice) || 0) * att + merch) + (Number(s.weeklyIncomeBase) || 0);
        const expenses = Number(s.weeklyExpenses) || 0;
        const net = income - expenses;
        const balance = Number(s.balance) || 0;
        const runway = net < 0 ? balance / -net : Infinity;
        const mine = (s.matchHistory || []).filter(m => !m.playoff && !m.administrative && (m.home === s.team || m.away === s.team)).slice(-8);
        const res = mine.map(m => { const [h, a] = String(m.score || '0-0').split('-').map(Number); const my = m.home === s.team ? h : a, op = m.home === s.team ? a : h; return my > op ? 'W' : my === op ? 'D' : 'L'; });
        let lossStreak = 0; for (let i = res.length - 1; i >= 0 && res[i] === 'L'; i--) lossStreak++;
        const winless = res.length >= 7 && !res.slice(-7).includes('W');
        return { balance, expenses, net, runway, lossStreak, winless, fill: att / cap, injured: (s.squad || []).filter(p => p.isInjured).length,
                 wages: (s.squad || []).reduce((n, p) => n + (Number(p.salary) || 0), 0) };
    }

    // Cada ayuda: ¿procede? (según dificultad) y qué ofrece. Cuanto más grave, más cuantía (con tope por división).
    const OFFERS = {
        capital: {
            eligible: (s, m, lv) => m.balance < 0 || m.runway < ({ easy: 10, normal: 6, hard: 2 }[lv]),
            build: (s, m) => {
                const [lo, hi] = CAPS[s.division] || CAPS.rfef_grupo1;
                const need = m.expenses * 10 + Math.max(0, -m.balance);
                const amount = Math.round(clamp(need * P(s).aid, lo * P(s).aid, hi * P(s).aid) / 1000) * 1000;
                return { amount, title: '💶 Ampliación de capital',
                    text: `Los accionistas, preocupados por la situación económica (caja: ${fmt(m.balance)} €), proponen una ampliación de capital de ${fmt(amount)} €.\n\nCondiciones: la confianza de la directiva baja 4 puntos y el límite salarial de esta temporada queda congelado en los sueldos actuales.` };
            },
            apply: (s, o, m) => {
                const bo = s.boardObjectives ? { ...s.boardObjectives, wageLimit: Math.min(s.boardObjectives.wageLimit || Infinity, Math.round(m.wages * 1.02)) } : s.boardObjectives;
                return { balance: s.balance + o.amount, boardConfidence: Math.max(0, (s.boardConfidence ?? 65) - 4), boardObjectives: bo, _desc: 'Ayuda: ampliación de capital de los accionistas' };
            }
        },
        locales: {
            eligible: (s, m, lv) => (s.popularity < 50 || ['rfef_grupo1', 'rfef_grupo2', 'promesas'].includes(s.division)) && m.runway < ({ easy: 20, normal: 14, hard: 8 }[lv]),
            build: (s, m) => {
                const [lo, hi] = CAPS[s.division] || CAPS.rfef_grupo1;
                const amount = Math.round(clamp(m.expenses * 4 * P(s).aid, lo * 0.5 * P(s).aid, hi * 0.5 * P(s).aid) / 1000) * 1000;
                return { amount, title: '🏪 Empresas locales',
                    text: `Las empresas de la zona quieren que el club siga adelante y ofrecen un patrocinio solidario de ${fmt(amount)} € a cambio de publicidad en el estadio. La popularidad del club sube un poco.` };
            },
            apply: (s, o) => ({ balance: s.balance + o.amount, popularity: Math.min(100, (s.popularity || 0) + 2), _desc: 'Ayuda: patrocinio solidario de empresas locales' })
        },
        abonados: {
            eligible: (s, m, lv) => m.fill < ({ easy: 0.65, normal: 0.6, hard: 0.45 }[lv]) && (s.popularity || 0) < 55,
            build: (s) => {
                const amount = Math.round(Math.min((Number(s.fanbase) || 0) * 25 * P(s).aid, 3e6 * P(s).aid) / 1000) * 1000;
                return { amount, title: '🎟️ Campaña de abonados',
                    text: `El estadio luce vacío. La directiva propone una campaña de abonados: la afición crece un 6 %, la popularidad sube y entran ${fmt(amount)} € en cuotas.` };
            },
            apply: (s, o) => ({ balance: s.balance + o.amount, fanbase: Math.round((s.fanbase || 0) * 1.06), popularity: Math.min(100, (s.popularity || 0) + 3), _desc: 'Ayuda: campaña de abonados' })
        },
        sanitario: {
            eligible: (s, m, lv) => m.injured >= ({ easy: 3, normal: 4, hard: 6 }[lv]),
            build: (s, m) => ({ amount: 0, title: '🩺 Convenio sanitario',
                text: `Hay ${m.injured} jugadores lesionados. Un hospital de la ciudad ofrece un convenio gratuito de rehabilitación: todas las lesiones se acortan 2 semanas.` }),
            apply: (s) => ({ squad: s.squad.map(p => { if (!p.isInjured) return p; const w = Math.max(0, (p.weeksOut || 0) - 2); return { ...p, weeksOut: w, isInjured: w > 0 }; }), _desc: null })
        },
        aficion: {
            eligible: (s, m, lv) => m.lossStreak >= ({ easy: 3, normal: 4, hard: 6 }[lv]) || (lv !== 'hard' && m.winless),
            build: (s, m) => ({ amount: 0, title: '📣 Apoyo de la afición',
                text: `Llevamos una mala racha (${m.lossStreak >= 3 ? m.lossStreak + ' derrotas seguidas' : '7 partidos sin ganar'}). La afición organiza un acto de apoyo al equipo: la forma de todos los jugadores sube 6 puntos.` }),
            apply: (s) => ({ squad: s.squad.map(p => ({ ...p, form: Math.min(100, (p.form ?? 65) + 6) })), _desc: null })
        }
    };
    const ORDER = ['capital', 'locales', 'sanitario', 'aficion', 'abonados'];
    let running = false;

    async function evaluateAid() {
        const s = gs();
        if (!s || !s.team || s.seasonType !== 'regular' || (s.week || 0) < 3 || s.difficultyChosen === undefined) return;
        const key = `${s.currentSeason}|${s.week}`;
        const aid = s.aid || { last: {}, log: [] };
        if (aid.lastEval === key) return;
        patch({ aid: { ...aid, lastEval: key } });
        const lv = level(s), m = metrics(s), now = absWeek(s);
        for (const type of ORDER) {
            const last = aid.last?.[type];
            if (last !== undefined && now - last < COOLDOWN[type] * P(s).cooldown) continue;
            const def = OFFERS[type];
            if (!def.eligible(s, m, lv)) continue;
            const o = def.build(s, m);
            if (type === 'capital' || type === 'locales' || type === 'abonados') { if (!(o.amount > 0)) continue; }
            const ok = await window.pcfConfirm(o.title, o.text, { okLabel: 'Aceptar', cancelLabel: 'Rechazar' });
            const cur = gs(), a2 = cur.aid || { last: {}, log: [] };
            const entry = { season: cur.currentSeason, week: cur.week, type, amount: o.amount, accepted: !!ok };
            if (ok) {
                const r = def.apply(cur, o, m);
                const desc = r._desc; delete r._desc;
                const movs = o.amount > 0 && desc ? [...(cur.seasonMovements || []), { week: cur.week, type: 'income', description: desc, amount: o.amount }] : cur.seasonMovements;
                patch({ ...r, seasonMovements: movs, aid: { ...a2, lastEval: key, last: { ...a2.last, [type]: absWeek(cur) }, log: [...(a2.log || []), entry].slice(-50) } });
                gl().addNews?.(`🤝 ${o.title}: aceptada${o.amount ? ` (+${fmt(o.amount)} €)` : ''}.`, 'success');
                window.pcfToast?.(`${o.title}: aceptada${o.amount ? ` (+${fmt(o.amount)} €)` : ''}`, { type: 'success' });
                window.ui?.refreshUI?.(gl().getViewState());
            } else {
                // Rechazada: se vuelve a ofrecer antes que si se hubiera aceptado
                patch({ aid: { ...a2, lastEval: key, last: { ...a2.last, [type]: absWeek(cur) - Math.round(COOLDOWN[type] * P(cur).cooldown * 0.5) }, log: [...(a2.log || []), entry].slice(-50) } });
            }
            return;                                   // como mucho una oferta por semana
        }
    }

    // ── Bucle ────────────────────────────────────────────────
    async function tick() {
        if (running || busy()) return;
        const s = gs();
        if (!s || !s.team) return;
        running = true;
        try {
            if (s.difficultyChosen === undefined) {
                const fresh = (s.matchHistory || []).length === 0 && s.seasonType === 'preseason';
                if (fresh) await applyChoice('normal');
                else patch({ difficulty: 'normal', difficultyChosen: true });       // partidas anteriores: Normal, sin preguntar
            } else {
                await evaluateAid();
            }
            refreshButton();
        } catch (e) { console.warn('Dificultad/ayudas:', e.message); }
        finally { running = false; }
    }
    window.pcfAid = { evaluate: evaluateAid, metrics, choose: applyChoice, OFFERS };
    setInterval(tick, 2000);
})();
