// ============================================================
// injector-achievements.js — Logros y retos de partida
// Logros: se desbloquean solos al cumplirse (aviso + noticia) y se ven, con su progreso, en la Sala de trofeos.
// Retos: uno activo a la vez, con meta, plazo (en temporadas) y recompensa en dinero; se aceptan desde la Sala de trofeos.
// Estado en la partida: gameState.achievements = { unlocked:{id:{season,week}}, stats:{}, challenge:{...}|null, done:[...] }
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();   // sin el mundo completo: se consulta cada pocos segundos
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const DIV_ORDER = ['promesas', 'rfef_grupo2', 'rfef_grupo1', 'segunda', 'primera'];

    // ── Datos derivados de la partida ───────────────────────
    function context(s) {
        const A = s.achievements || {};
        const mine = (s.matchHistory || []).filter(m => !m.playoff && !m.administrative && (m.home === s.team || m.away === s.team));
        const res = mine.map(m => { const [h, a] = String(m.score || '0-0').split('-').map(Number); const gf = m.home === s.team ? h : a, ga = m.home === s.team ? a : h; return { gf, ga, r: gf > ga ? 'W' : gf === ga ? 'D' : 'L' }; });
        const maxRun = pred => { let best = 0, cur = 0; for (const x of res) { cur = pred(x) ? cur + 1 : 0; best = Math.max(best, cur); } return best; };
        const trophies = s.trophies || [], hist = s.seasonHistory || [];
        const count = k => trophies.filter(t => t.kind === k).length;
        const bySeason = {};
        trophies.forEach(t => { (bySeason[t.season] ||= new Set()).add(t.kind); });
        const seasonsWith = (...ks) => Object.values(bySeason).some(set => ks.every(k => set.has(k)));
        const bestPts = hist.reduce((n, h) => Math.max(n, h.points || 0), 0);
        const ups = hist.map(h => /^ascenso/.test(h.move || ''));
        let consecUps = 0, run = 0; ups.forEach(u => { run = u ? run + 1 : 0; consecUps = Math.max(consecUps, run); });
        const young = (s.squad || []).filter(p => p.age <= 21);
        const stats = A.stats || {};
        const euro = count('champions') + count('europaLeague') + count('conferenceLague');
        return { s, A, res, hist, trophies, stats, young, euro, count, seasonsWith, bestPts, consecUps,
            wins: res.filter(x => x.r === 'W').length, maxWins: maxRun(x => x.r === 'W'), maxUnbeaten: maxRun(x => x.r !== 'L'),
            maxClean: maxRun(x => x.ga === 0), maxMargin: res.reduce((n, x) => Math.max(n, x.gf - x.ga), 0),
            rep: Number(s.promanager?.reputation) || 0, balance: Number(s.balance) || 0,
            cupSf: hist.some(h => h.copa && (h.copa.result === 'champion' || /sf|final/.test(h.copa.round || ''))),
            aidAccepted: (s.aid?.log || []).some(x => x.accepted) };
    }

    // ── Catálogo de logros ──────────────────────────────────
    const ACH = [
        // Liga
        { id: 'first_win', g: 'Liga', i: '🥳', n: 'Primera victoria', d: 'Gana tu primer partido de liga.', ok: c => c.wins >= 1 },
        { id: 'win5', g: 'Liga', i: '🔥', n: 'Imparable', d: 'Encadena 5 victorias seguidas.', ok: c => c.maxWins >= 5, p: c => [c.maxWins, 5] },
        { id: 'unbeaten10', g: 'Liga', i: '🛡️', n: 'Invicto', d: '10 partidos de liga seguidos sin perder.', ok: c => c.maxUnbeaten >= 10, p: c => [c.maxUnbeaten, 10] },
        { id: 'clean5', g: 'Liga', i: '🧤', n: 'Muro', d: '5 partidos seguidos sin encajar gol.', ok: c => c.maxClean >= 5, p: c => [c.maxClean, 5] },
        { id: 'big_win', g: 'Liga', i: '💥', n: 'Goleada', d: 'Gana por 5 o más goles de diferencia.', ok: c => c.maxMargin >= 5, p: c => [Math.max(0, c.maxMargin), 5] },
        { id: 'liga1', g: 'Liga', i: '🥇', n: 'Campeón', d: 'Gana una liga.', ok: c => c.count('liga') >= 1 },
        { id: 'liga3', g: 'Liga', i: '👑', n: 'Dinastía', d: 'Gana 3 ligas.', ok: c => c.count('liga') >= 3, p: c => [c.count('liga'), 3] },
        { id: 'promo', g: 'Liga', i: '🔼', n: 'Ascenso', d: 'Consigue un ascenso.', ok: c => c.count('ascenso') >= 1 },
        { id: 'promo2', g: 'Liga', i: '⏫', n: 'Cohete', d: 'Asciende dos temporadas seguidas.', ok: c => c.consecUps >= 2 },
        { id: 'pts100', g: 'Liga', i: '💯', n: 'Centenario', d: 'Suma 100 puntos o más en una temporada.', ok: c => c.bestPts >= 100, p: c => [c.bestPts, 100] },
        // Copas y Europa
        { id: 'copa_sf', g: 'Copas', i: '🎯', n: 'A las puertas', d: 'Llega a semifinales de Copa.', ok: c => c.cupSf },
        { id: 'copa1', g: 'Copas', i: '🏆', n: 'Rey de Copas', d: 'Gana la Copa del Rey.', ok: c => c.count('copa') >= 1 },
        { id: 'euro1', g: 'Copas', i: '🌍', n: 'Campeón de Europa', d: 'Gana la Champions, la Europa League o la Conference.', ok: c => c.euro >= 1 },
        { id: 'doblete', g: 'Copas', i: '🥈', n: 'Doblete', d: 'Liga y Copa en la misma temporada.', ok: c => c.seasonsWith('liga', 'copa') },
        { id: 'triplete', g: 'Copas', i: '⭐', n: 'Triplete', d: 'Liga, Copa y Champions en la misma temporada.', ok: c => c.seasonsWith('liga', 'copa', 'champions') },
        // Economía
        { id: 'saldo50', g: 'Economía', i: '💰', n: 'Millonario', d: 'Alcanza 50 M€ en caja.', ok: c => c.balance >= 5e7, p: c => [Math.max(0, c.balance) / 1e6, 50, 'M€'] },
        { id: 'saldo250', g: 'Economía', i: '🏦', n: 'Magnate', d: 'Alcanza 250 M€ en caja.', ok: c => c.balance >= 2.5e8, p: c => [Math.max(0, c.balance) / 1e6, 250, 'M€'] },
        { id: 'fichaje20', g: 'Economía', i: '✍️', n: 'Fichaje estrella', d: 'Ficha a un jugador por 20 M€ o más.', ok: c => (c.stats.maxPurchase || 0) >= 2e7 },
        { id: 'venta20', g: 'Economía', i: '🤝', n: 'Gran venta', d: 'Vende a un jugador por 20 M€ o más.', ok: c => (c.stats.maxSale || 0) >= 2e7 },
        { id: 'ayuda', g: 'Economía', i: '🆘', n: 'Mano amiga', d: 'Acepta una ayuda del entorno.', ok: c => c.aidAccepted },
        // Plantilla
        { id: 'joya', g: 'Plantilla', i: '💎', n: 'Joya', d: 'Ten un jugador de 21 años o menos con 80 de media.', ok: c => c.young.some(p => p.overall >= 80) },
        { id: 'xi_joven', g: 'Plantilla', i: '🌱', n: 'Equipo joven', d: 'Alinea a 6 o más jugadores de 21 años o menos.', ok: c => (c.s.lineup || []).filter(p => p.age <= 21).length >= 6, p: c => [(c.s.lineup || []).filter(p => p.age <= 21).length, 6] },
        { id: 'galacticos', g: 'Plantilla', i: '✨', n: 'Galácticos', d: 'Ten 5 jugadores con 85 de media o más.', ok: c => (c.s.squad || []).filter(p => p.overall >= 85).length >= 5, p: c => [(c.s.squad || []).filter(p => p.overall >= 85).length, 5] },
        // Carrera
        { id: 'rep70', g: 'Carrera', i: '⭐', n: 'Reconocido', d: 'Reputación de manager de 70 (modo carrera).', ok: c => c.rep >= 70, p: c => [Math.round(c.rep), 70] },
        { id: 'rep90', g: 'Carrera', i: '🌟', n: 'Leyenda', d: 'Reputación de manager de 90 (modo carrera).', ok: c => c.rep >= 90, p: c => [Math.round(c.rep), 90] },
        { id: 'premio', g: 'Carrera', i: '🎖️', n: 'Entrenador del año', d: 'Cumple todos los objetivos de la directiva en una temporada.', ok: c => (c.s.managerAwards || []).length >= 1 },
        { id: 'temp5', g: 'Carrera', i: '📅', n: 'Veterano', d: 'Completa 5 temporadas.', ok: c => c.hist.length >= 5, p: c => [c.hist.length, 5] },
        { id: 'temp10', g: 'Carrera', i: '🏛️', n: 'Institución', d: 'Completa 10 temporadas.', ok: c => c.hist.length >= 10, p: c => [c.hist.length, 10] },
        { id: 'sin_red', g: 'Carrera', i: '🔥', n: 'Sin red', d: 'Gana una liga en dificultad Difícil.', ok: c => !!c.stats.ligaHard },
        { id: 'reto1', g: 'Carrera', i: '🎯', n: 'Reto superado', d: 'Cumple un reto de partida.', ok: c => (c.A.done || []).some(x => x.status === 'done') }
    ];

    // ── Retos ───────────────────────────────────────────────
    const REWARD = { primera: 5e6, segunda: 1.5e6, rfef_grupo1: 4e5, rfef_grupo2: 4e5, promesas: 6e4 };
    const CH = [
        { id: 'ascenso_expres', i: '🚀', n: 'Ascenso exprés', d: 'Asciende de categoría en un máximo de 2 temporadas.', seasons: 2, avail: s => s.division !== 'primera',
          eval: (ch, c, e) => e.some(h => /^ascenso/.test(h.move || '')) ? 'done' : (e.length >= 2 ? 'failed' : null), prog: (ch, c, e) => `${e.length}/2 temporadas` },
        { id: 'sin_deuda', i: '💶', n: 'Cuentas claras', d: 'Termina 3 temporadas seguidas con la caja en positivo.', seasons: 3,
          eval: (ch, c, e) => e.some(h => (h.balance || 0) < 0) ? 'failed' : (e.length >= 3 ? 'done' : null), prog: (ch, c, e) => `${e.length}/3 temporadas` },
        { id: 'austeridad', i: '🧾', n: 'Austeridad', d: 'Dos temporadas gastando como máximo 2 M€ en fichajes cada una y acabando entre los 10 primeros.', seasons: 2,
          eval: (ch, c, e) => e.some(h => (h.purchases || 0) > 2e6 || (h.position || 99) > 10) ? 'failed' : (e.length >= 2 ? 'done' : null), prog: (ch, c, e) => `${e.length}/2 temporadas` },
        { id: 'salvacion', i: '🛟', n: 'Salvación', d: 'Evita el descenso 2 temporadas seguidas.', seasons: 2, avail: s => ['primera', 'segunda'].includes(s.division),
          eval: (ch, c, e) => e.some(h => /^descenso/.test(h.move || '')) ? 'failed' : (e.length >= 2 ? 'done' : null), prog: (ch, c, e) => `${e.length}/2 temporadas` },
        { id: 'cantera_oro', i: '🌱', n: 'Cantera de oro', d: 'Gana la liga o la Copa con 5 o más jugadores de 21 años o menos en la plantilla (plazo: 5 temporadas).', seasons: 5,
          eval: (ch, c, e) => (ch.youthTitle ? 'done' : (e.length >= 5 ? 'failed' : null)), prog: (ch, c, e) => `${e.length}/5 temporadas` },
        { id: 'doblete_sonado', i: '🏆', n: 'Doblete soñado', d: 'Gana la liga y la Copa en la misma temporada (plazo: 6 temporadas).', seasons: 6,
          eval: (ch, c, e) => (c.trophies.slice(ch.startTrophies || 0).some(t => t.kind === 'liga' && c.trophies.slice(ch.startTrophies || 0).some(u => u.kind === 'copa' && u.season === t.season)) ? 'done' : (e.length >= 6 ? 'failed' : null)),
          prog: (ch, c, e) => `${e.length}/6 temporadas` }
    ];

    // ── Evaluación ──────────────────────────────────────────
    function patch(p) { gl().updateGameState(p); }
    let lastKey = '';
    function trackStats(s) {
        const A = s.achievements || {}, st = { ...(A.stats || {}) };
        let changed = false;
        for (const m of s.seasonMovements || []) {
            if (m.type === 'purchase' && -m.amount > (st.maxPurchase || 0)) { st.maxPurchase = -m.amount; changed = true; }
            if (m.type === 'sale' && m.amount > (st.maxSale || 0)) { st.maxSale = m.amount; changed = true; }
        }
        const nt = (s.trophies || []).length;
        if (nt > (st.seenTrophies || 0)) {
            const fresh = (s.trophies || []).slice(st.seenTrophies || 0);
            if (fresh.some(t => t.kind === 'liga') && s.difficulty === 'hard') st.ligaHard = true;
            st.seenTrophies = nt; changed = true; st._freshTitle = fresh.some(t => t.kind === 'liga' || t.kind === 'copa');
        }
        return { st, changed };
    }
    function evaluate() {
        const s = gs(); if (!s || !s.team) return;
        const key = [s.currentSeason, s.week, (s.matchHistory || []).length, (s.trophies || []).length, (s.seasonHistory || []).length, Math.round((s.balance || 0) / 1e6), (s.seasonMovements || []).length, s.difficultyChosen, (s.achievements?.done || []).length, s.achievements?.challenge?.id || ''].join('|');
        if (key === lastKey) return;
        lastKey = key;
        const A = s.achievements || { unlocked: {}, stats: {}, challenge: null, done: [] };
        const { st, changed } = trackStats(s);
        const base = { ...A, unlocked: { ...(A.unlocked || {}) }, stats: st, done: [...(A.done || [])] };
        let dirty = changed;
        const c = context({ ...s, achievements: base });
        const fresh = [];
        for (const a of ACH) { if (!base.unlocked[a.id] && a.ok(c)) { base.unlocked[a.id] = { season: s.currentSeason, week: s.week }; fresh.push(a); dirty = true; } }
        // Reto activo
        let reward = null;
        if (base.challenge && base.challenge.status === 'active') {
            const ch = { ...base.challenge }, def = CH.find(x => x.id === ch.id);
            if (def) {
                if (st._freshTitle && (s.squad || []).filter(p => p.age <= 21).length >= 5 && def.id === 'cantera_oro') ch.youthTitle = true;
                const e = (s.seasonHistory || []).slice(ch.startHist || 0);
                const r = def.eval(ch, c, e);
                if (r === 'done' || r === 'failed') {
                    base.done.push({ id: ch.id, status: r, season: s.currentSeason });
                    base.challenge = null; dirty = true; reward = { r, def };
                } else if (ch.youthTitle !== base.challenge.youthTitle) { base.challenge = ch; dirty = true; }
            }
        }
        delete base.stats._freshTitle;
        if (!dirty) return;
        const upd = { achievements: base };
        if (reward && reward.r === 'done') {
            const amount = REWARD[s.division] || 6e4;
            upd.balance = (s.balance || 0) + amount;
            upd.fd_prizes = [...(s.fd_prizes || []), { key: `reto-${reward.def.id}-${s.currentSeason}`, label: `Reto superado: ${reward.def.n}`, amount, season: s.currentSeason, week: s.week }];
            upd.seasonMovements = [...(s.seasonMovements || []), { week: s.week, type: 'income', description: `Premio: reto superado «${reward.def.n}»`, amount }];
            reward.amount = amount;
        }
        patch(upd);
        for (const a of fresh) {
            gl().addNews?.(`🎖️ Logro desbloqueado: ${a.n} — ${a.d}`, 'success');
            window.pcfToast?.(`🎖️ Logro: ${a.n}`, { type: 'success', duration: 5000 });
        }
        if (reward) {
            if (reward.r === 'done') { gl().addNews?.(`🎯 ¡Reto superado: ${reward.def.n}! Premio: ${fmt(reward.amount)} €.`, 'success'); window.pcfToast?.(`🎯 Reto superado: ${reward.def.n} (+${fmt(reward.amount)} €)`, { type: 'success', duration: 7000 }); }
            else { gl().addNews?.(`🎯 Reto fallido: ${reward.def.n}. Puedes aceptar otro desde la Sala de trofeos.`, 'warning'); window.pcfToast?.(`🎯 Reto fallido: ${reward.def.n}`, { type: 'warn', duration: 7000 }); }
        }
        if (document.getElementById('trophies')?.classList.contains('active')) window.pcfTrophies?.render?.();
    }

    // ── Pantalla (HTML para la Sala de trofeos) ─────────────
    function injectStyles() {
        if (document.getElementById('pcfAchStyles')) return;
        const st = document.createElement('style'); st.id = 'pcfAchStyles';
        st.textContent = `
        #trophies .ac-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
        #trophies .ac{background:#0e2549;border:1px solid #2a4a7c;border-radius:4px;padding:9px 10px;font-size:.8rem;line-height:1.25;color:#cfe0fb}
        #trophies .ac b{display:block;color:#fff;font-size:.9rem;margin:2px 0}
        #trophies .ac .ic{font-size:1.5rem}
        #trophies .ac.on{border-color:#ffd24a;background:linear-gradient(180deg,rgba(255,210,74,.15),#0e2549)}
        #trophies .ac.off{opacity:.55}#trophies .ac.off .ic{filter:grayscale(1)}
        #trophies .ac small{display:block;color:#8fb0e6;margin-top:3px}
        #trophies .ac-bar{height:5px;background:#1a3763;border-radius:3px;margin-top:5px;overflow:hidden}#trophies .ac-bar i{display:block;height:100%;background:#4aa3ff}
        #trophies .ac-cat{margin:10px 0 6px;font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;color:#a9c0e6}
        #trophies .ch{background:#0e2549;border:1px solid #3d6aa8;border-radius:4px;padding:10px 12px;margin-bottom:8px;font-size:.85rem;color:#cfe0fb;line-height:1.35}
        #trophies .ch.act{border-color:#4aa3ff;background:linear-gradient(90deg,rgba(74,163,255,.15),#0e2549)}
        #trophies .ch b{color:#fff}#trophies .ch .btn{margin-top:6px;min-height:36px}
        #trophies .ch-h{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center}`;
        document.head.appendChild(st);
    }
    function htmlChallenges(s) {
        injectStyles();
        const A = s.achievements || {}, cur = A.challenge, c = context(s);
        let out = '<h2>🎯 Retos de partida</h2>';
        const reward = REWARD[s.division] || 6e4;
        if (cur) {
            const def = CH.find(x => x.id === cur.id);
            if (def) {
                const e = (s.seasonHistory || []).slice(cur.startHist || 0);
                out += `<div class="ch act"><div class="ch-h"><span>${def.i} <b>${esc(def.n)}</b> · en curso</span><span>🎁 ${fmt(reward)} €</span></div>${esc(def.d)}<br><small>Progreso: ${esc(def.prog(cur, c, e))} · empezado en ${esc(cur.startSeason)}</small><br>
                    <button type="button" class="btn" data-ch-abandon="1">Abandonar reto</button></div>`;
            }
        } else {
            out += `<p class="tr-empty" style="margin:0 0 8px">Acepta un reto: si lo cumples en el plazo, ganas un premio de ${fmt(reward)} € y el logro «Reto superado». Solo uno a la vez.</p>`;
            for (const d of CH) {
                if (d.avail && !d.avail(s)) continue;
                out += `<div class="ch"><div class="ch-h"><span>${d.i} <b>${esc(d.n)}</b></span><span>⏳ ${d.seasons} temp. · 🎁 ${fmt(reward)} €</span></div>${esc(d.d)}<br><button type="button" class="btn" data-ch-start="${d.id}">Aceptar reto</button></div>`;
            }
        }
        const done = A.done || [];
        if (done.length) out += `<div class="ac-cat">Historial de retos</div><div class="tr-career">${done.slice(-8).reverse().map(x => `${x.status === 'done' ? '✅' : '❌'} ${esc(CH.find(d => d.id === x.id)?.n || x.id)} · ${esc(x.season)}`).join('<br>')}</div>`;
        return out;
    }
    function htmlAchievements(s) {
        injectStyles();
        const A = s.achievements || {}, un = A.unlocked || {}, c = context(s);
        const total = ACH.length, got = ACH.filter(a => un[a.id]).length;
        let out = `<h2>🎖️ Logros <span style="font-size:.8em;color:#a9c0e6">${got}/${total}</span></h2>`;
        let lastG = '';
        for (const a of ACH) {
            if (a.g !== lastG) { if (lastG) out += '</div>'; out += `<div class="ac-cat">${esc(a.g)}</div><div class="ac-grid">`; lastG = a.g; }
            const on = !!un[a.id], pr = !on && a.p ? a.p(c) : null;
            out += `<div class="ac ${on ? 'on' : 'off'}"><span class="ic">${a.i}</span><b>${esc(a.n)}</b>${esc(a.d)}
                ${on ? `<small>✔ ${esc(un[a.id].season)}</small>` : (pr ? `<div class="ac-bar"><i style="width:${Math.min(100, Math.round(pr[0] / pr[1] * 100))}%"></i></div><small>${pr[2] ? Math.round(pr[0]) + ' / ' + pr[1] + ' ' + pr[2] : Math.round(pr[0]) + ' / ' + pr[1]}</small>` : '')}</div>`;
        }
        return out + '</div>';
    }

    // ── Acciones (aceptar / abandonar reto) ─────────────────
    document.addEventListener('click', async e => {
        const st = e.target.closest?.('[data-ch-start]'), ab = e.target.closest?.('[data-ch-abandon]');
        if (!st && !ab) return;
        const s = gs(); if (!s) return;
        const A = s.achievements || { unlocked: {}, stats: {}, challenge: null, done: [] };
        if (st) {
            const def = CH.find(x => x.id === st.dataset.chStart); if (!def) return;
            const ok = await window.pcfConfirm(`${def.i} ${def.n}`, `${def.d}\n\nPlazo: ${def.seasons} temporada(s). Premio: ${fmt(REWARD[s.division] || 6e4)} €.\nSolo puedes tener un reto activo.`, { okLabel: 'Aceptar reto', cancelLabel: 'Ahora no' });
            if (!ok) return;
            patch({ achievements: { ...A, challenge: { id: def.id, status: 'active', startSeason: s.currentSeason, startHist: (s.seasonHistory || []).length, startTrophies: (s.trophies || []).length } } });
            gl().addNews?.(`🎯 Reto aceptado: ${def.n}.`, 'info');
            window.pcfToast?.(`Reto aceptado: ${def.n}`, { type: 'info' });
        } else {
            const ok = await window.pcfConfirm('Abandonar reto', 'Si abandonas el reto no recibirás premio y contará como fallido.', { okLabel: 'Abandonar', cancelLabel: 'Seguir', danger: true });
            if (!ok) return;
            patch({ achievements: { ...A, challenge: null, done: [...(A.done || []), { id: A.challenge?.id, status: 'failed', season: s.currentSeason }] } });
        }
        lastKey = '';
        window.pcfTrophies?.render?.();
    });

    window.pcfAchievements = { ACH, CH, evaluate: () => { lastKey = ''; evaluate(); }, htmlChallenges, htmlAchievements, context };
    pcfEvery(() => { try { evaluate(); } catch (err) { console.warn('Logros:', err.message); } }, 2500);
})();
