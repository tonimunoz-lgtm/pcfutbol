// ============================================================
// injector-derbies.js — Derbis: aviso previo, consecuencias del resultado, historial y logros
// Los efectos en el partido (faltas, favorito) y en la taquilla están en match-engine.js y weekly-ledger.js.
// Aquí: etiqueta «🔥 DERBI» en el próximo partido · noticia previa · declaración antes del derbi (evento prioritario) ·
// tras el partido (liga): peso extra del resultado en afición, directiva y vestuario · historial por rival · 3 logros.
// Estado: gameState.derbies = { seen, announced:{clave:true}, records:{rival:{name,w,d,l,gf,gc}}, results:[] }
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getGameState?.();
    const R = () => window.pcfRivalries;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const key = p => p.id ?? p.name;

    // Próximo partido de liga del usuario (la semana en curso, aún sin jugar)
    function nextMatch(s) {
        if (!s || s.seasonType !== 'regular') return null;
        const m = (s.seasonCalendar || []).find(x => x.week === s.week && (x.home === s.team || x.away === s.team) && x.homeGoals == null);
        if (!m) return null;
        const rival = m.home === s.team ? m.away : m.home;
        const rv = R()?.of(s.team, rival);
        return rv ? { rival, name: rv.name, level: rv.level, home: m.home === s.team, week: s.week, key: `${s.currentSeason}|${s.week}|${rival}` } : null;
    }
    const moodAll = (s, d) => (s.squad || []).map(p => p.contractType === 'loaned_out' ? p : { ...p, moodMod: clamp((Number(p.moodMod) || 0) + d, -40, 40), satisfaction: p.satisfaction === undefined ? p.satisfaction : clamp(p.satisfaction + d, 0, 100) });

    // ── Etiqueta en el panel del próximo partido ────────────
    function renderTag() {
        const box = document.getElementById('nextMatchInfo');
        if (!box) return;
        const nm = nextMatch(gs());
        let tag = document.getElementById('pcfDerbyTag');
        if (!nm) { tag?.remove(); return; }
        if (!tag) {
            tag = document.createElement('div'); tag.id = 'pcfDerbyTag';
            tag.style.cssText = 'margin-top:4px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffb300;font-size:.82rem;text-shadow:0 1px 2px rgba(0,0,0,.6)';
            box.appendChild(tag);
        }
        tag.textContent = `🔥 ${nm.name}${nm.level >= 2 ? ' · ¡gran derbi!' : ''}`;
    }

    // ── Anuncio previo (una vez por partido) ────────────────
    function announce(s) {
        const nm = nextMatch(s); if (!nm) return;
        const D = s.derbies || { seen: 0, announced: {}, records: {}, results: [] };
        if (D.announced?.[nm.key]) return;
        gl().updateGameState({ derbies: { ...D, announced: { ...(D.announced || {}), [nm.key]: true } } });
        gl().addNews?.(`🔥 ${nm.name}: esta jornada ${nm.home ? 'recibes' : 'visitas'} a ${nm.rival}. ${nm.level >= 2 ? 'Se espera un estadio lleno y un partido muy tenso.' : 'Rivalidad de siempre: la afición lo espera con ganas.'}`, 'info');
        window.pcfToast?.(`🔥 ${nm.name}: ${nm.rival}`, { type: 'info', duration: 5000 });
    }

    // ── Consecuencias tras el partido ───────────────────────
    function processResults(s) {
        const mine = (s.matchHistory || []).filter(m => !m.playoff && !m.administrative && (m.home === s.team || m.away === s.team));
        let D = s.derbies || { seen: 0, announced: {}, records: {}, results: [] };
        if (mine.length < D.seen) D = { ...D, seen: 0 };          // el historial se reinició (nueva temporada)
        if (mine.length === D.seen) { if (D !== s.derbies && !s.derbies) { /* nada */ } return; }
        let patch = {}, balance = s.boardConfidence ?? 65, pop = s.popularity || 0, squad = s.squad;
        const records = { ...(D.records || {}) }, results = [...(D.results || [])], newsOut = [];
        for (const m of mine.slice(D.seen)) {
            const rival = m.home === s.team ? m.away : m.home, rv = R()?.of(s.team, rival);
            if (!rv) continue;
            const [h, a] = String(m.score || '0-0').split('-').map(Number);
            const gf = m.home === s.team ? h : a, ga = m.home === s.team ? a : h;
            const r = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
            const rec = { ...(records[rival] || { name: rv.name, w: 0, d: 0, l: 0, gf: 0, gc: 0 }) };
            rec.name = rv.name; rec.gf += gf; rec.gc += ga; r === 'W' ? rec.w++ : r === 'D' ? rec.d++ : rec.l++;
            records[rival] = rec; results.push(r);
            const lv = rv.level, sign = r === 'W' ? 1 : r === 'L' ? -1 : 0;
            if (sign) {
                balance = clamp(balance + 1.5 * lv * sign, 0, 100); pop = clamp(pop + 1 * lv * sign, 0, 100);
                squad = moodAll({ ...s, squad }, 3 * lv * sign);
            }
            // Portada de prensa: gran derbi (nivel 2) en cualquier resultado; derbi menor (nivel 1) solo si se gana
            if (window.pcfQueuePress && (lv >= 2 || r === 'W')) window.pcfQueuePress({ kind: 'derbi', result: r, derbyName: rv.name, opponent: rival, myGoals: gf, oppGoals: ga, level: lv });
            newsOut.push(r === 'W' ? `🔥 ${rv.name}: ¡victoria ante ${rival} (${gf}-${ga})! La afición está en éxtasis.`
                : r === 'L' ? `🔥 ${rv.name}: derrota ante ${rival} (${gf}-${ga}). La afición pide explicaciones y el vestuario lo acusa.`
                : `🔥 ${rv.name}: empate ante ${rival} (${gf}-${ga}). Sabe a poco.`);
        }
        gl().updateGameState({ boardConfidence: balance, popularity: pop, squad, derbies: { ...D, seen: mine.length, records, results: results.slice(-40) } });
        newsOut.forEach(n => gl().addNews?.(n, n.includes('victoria') ? 'success' : n.includes('derrota') ? 'warning' : 'info'));
        if (newsOut.length) window.pcfToast?.(newsOut[newsOut.length - 1], { type: newsOut[newsOut.length - 1].includes('derrota') ? 'warn' : 'success', duration: 6000 });
        window.ui?.refreshUI?.(gl().getViewState());
    }

    // ── Declaración antes del derbi (evento prioritario) ────
    function installEvent() {
        const ev = window.pcfEvents;
        if (!ev?.EVENTS) { setTimeout(installEvent, 800); return; }
        if (ev.EVENTS.some(e => e.id === 'derby_press')) return;
        ev.EVENTS.push({
            id: 'derby_press', w: 10, cd: 3, priority: true, icon: '🔥', title: 'Declaración antes del derbi',
            eligible: s => { const nm = nextMatch(s); return nm ? { name: nm.name, rival: nm.rival, level: nm.level } : null; },
            text: e => `Se acerca el ${e.name} ante ${e.rival} y la prensa espera tus palabras.`,
            choices: [
                { label: 'Motivar al grupo: «Es el partido del año»', tags: '🎭', run: s => ({ patch: { squad: moodAll(s, 8) }, result: 'El vestuario se crece: hay hambre de derbi.' }) },
                { label: 'Calma: «Es un partido más»', tags: '🏛️', run: s => ({ patch: { boardConfidence: clamp((s.boardConfidence ?? 65) + 2, 0, 100), squad: moodAll(s, 2) }, result: 'Mensaje de madurez. La directiva lo agradece.' }) },
                { label: 'Provocar al rival', tags: '📣 🎭 🏛️', run: s => ({ patch: { popularity: clamp((s.popularity || 0) + 3, 0, 100), boardConfidence: clamp((s.boardConfidence ?? 65) - 1, 0, 100), squad: moodAll(s, 5) }, result: 'Titulares incendiarios: la afición lo adora, aunque en el rival no han hecho gracia.' }) }
            ]
        });
    }

    // ── Historial (HTML para la Sala de trofeos) ────────────
    function html(s) {
        const rec = Object.entries(s.derbies?.records || {});
        let out = '<h2>🔥 Derbis</h2>';
        if (!rec.length) {
            const rivals = R()?.rivalsOf(s.team) || [];
            return out + `<p class="tr-empty">Aún no has jugado ningún derbi.${rivals.length ? ' Tus rivales: ' + esc(rivals.map(x => x.rival).join(', ')) + '.' : ''}</p>`;
        }
        out += '<div class="tr-hist">' + rec.sort((a, b) => (b[1].w + b[1].d + b[1].l) - (a[1].w + a[1].d + a[1].l)).map(([rival, x]) =>
            `<div class="tr-year ${x.w > x.l ? 'champ' : x.l > x.w ? 'down' : ''}"><div class="tr-year-h"><span>${esc(rival)}</span><small>${esc(x.name)}</small></div>
              <div class="tr-year-b"><span>✅ ${x.w} V</span><span>🤝 ${x.d} E</span><span>❌ ${x.l} D</span><span>Goles ${x.gf}-${x.gc}</span></div></div>`).join('') + '</div>';
        return out;
    }

    // ── Logros de derbis ────────────────────────────────────
    function installAchievements() {
        const A = window.pcfAchievements;
        if (!A?.ACH) { setTimeout(installAchievements, 800); return; }
        if (A.ACH.some(a => a.id === 'derby1')) return;
        const wins = c => Object.values(c.s.derbies?.records || {}).reduce((n, x) => n + x.w, 0);
        const unbeaten = c => { let best = 0, cur = 0; for (const r of (c.s.derbies?.results || [])) { cur = r === 'L' ? 0 : cur + 1; best = Math.max(best, cur); } return best; };
        A.ACH.push(
            { id: 'derby1', g: 'Derbis', i: '🔥', n: 'Rey del derbi', d: 'Gana un derbi.', ok: c => wins(c) >= 1 },
            { id: 'derby5', g: 'Derbis', i: '🏙️', n: 'Dueño de la ciudad', d: 'Gana 5 derbis.', ok: c => wins(c) >= 5, p: c => [wins(c), 5] },
            { id: 'derby_unbeaten', g: 'Derbis', i: '🛡️', n: 'Intocable en derbis', d: '5 derbis seguidos sin perder.', ok: c => unbeaten(c) >= 5, p: c => [unbeaten(c), 5] }
        );
    }

    // ── Bucle ───────────────────────────────────────────────
    let lastKey = '';
    function tick() {
        const s = gs(); if (!s || !s.team) return;
        renderTag();
        const k = [s.currentSeason, s.week, (s.matchHistory || []).length].join('|');
        if (k === lastKey) return;
        lastKey = k;
        try { processResults(s); announce(gs()); } catch (e) { console.warn('Derbis:', e.message); }
    }
    window.pcfDerbies = { nextMatch, html, tick: () => { lastKey = ''; tick(); } };
    installEvent(); installAchievements();
    setInterval(tick, 1500);
})();
