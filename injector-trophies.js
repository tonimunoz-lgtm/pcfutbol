// ============================================================
// injector-trophies.js — Sala de trofeos
// Muestra los títulos (gameState.trophies), los premios del manager (gameState.managerAwards), el historial de
// temporadas (gameState.seasonHistory) y, en modo carrera, la reputación y el balance de partidos.
// El historial se va completando al cerrar cada temporada; los títulos se guardan desde que se ganan.
// ============================================================
(function () {
    'use strict';
    const gs = () => window.gameLogic?.getGameState?.();
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const DIV = { primera: 'Primera División', segunda: 'Segunda División', rfef_grupo1: 'Primera RFEF (G1)', rfef_grupo2: 'Primera RFEF (G2)', promesas: 'Liga Promesas', rfef: 'Primera RFEF' };
    const IMG = 'assets/iconos/competiciones/';
    const KIND = {
        liga:            { label: 'Campeón de liga',   img: IMG + 'liga.webp',          emoji: '🥇' },
        copa:            { label: 'Copa del Rey',      img: IMG + 'copa.webp',          emoji: '🏆' },
        champions:       { label: 'Champions League',  img: IMG + 'europa-maxima.webp', emoji: '⭐' },
        europaLeague:    { label: 'Europa League',     img: IMG + 'europa-segunda.webp', emoji: '🌍' },
        conferenceLague: { label: 'Conference League', img: IMG + 'europa-tercera.webp', emoji: '🌐' },
        ascenso:         { label: 'Ascenso',           img: IMG + 'ascenso.webp',       emoji: '⬆️' }
    };
    const SHELVES = ['liga', 'copa', 'champions', 'europaLeague', 'conferenceLague'];
    const PHASE = { copa_r1: 'Primera ronda', copa_r32: 'Dieciseisavos', copa_r16: 'Octavos', copa_qf: 'Cuartos', copa_sf: 'Semifinales', copa_final: 'Final',
        groups: 'Fase de liga', playoff_leg1: 'Playoff', playoff_leg2: 'Playoff', playoff: 'Playoff', round16: 'Octavos', quarterfinals: 'Cuartos',
        semifinals: 'Semifinales', final: 'Final' };
    const phaseLabel = p => PHASE[p] || (/^groups_md/.test(p || '') ? 'Fase de liga' : (p || ''));
    const ordinal = n => (n ? n + 'º' : '–');

    function injectStyles() {
        if (document.getElementById('pcfTrophiesStyles')) return;
        const st = document.createElement('style');
        st.id = 'pcfTrophiesStyles';
        st.textContent = `
        .trophy-icon::before{background-image:url('${IMG}copa.webp') !important}
        #trophies .tr-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px;margin:10px 0 16px}
        #trophies .tr-tile{background:linear-gradient(180deg,#14305c,#0b1f40);border:1px solid #3d6aa8;border-radius:4px;padding:10px 8px;text-align:center}
        #trophies .tr-tile b{display:block;font-size:1.7rem;color:#ffd24a;line-height:1.1}
        #trophies .tr-tile span{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:#a9c0e6}
        #trophies h2{margin:18px 0 8px;font-size:1rem;letter-spacing:.1em;text-transform:uppercase;color:#ffd24a;border-bottom:1px solid #2a4a7c;padding-bottom:5px}
        #trophies .tr-shelf{background:linear-gradient(180deg,rgba(255,210,74,.07),rgba(255,210,74,.02));border:1px solid #3d6aa8;border-radius:4px;padding:10px 12px;margin-bottom:10px}
        #trophies .tr-shelf-title{display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:8px;color:#e6eefb}
        #trophies .tr-shelf-title img{width:26px;height:26px;object-fit:contain}
        #trophies .tr-count{margin-left:auto;background:#ffd24a;color:#1a2a44;border-radius:12px;padding:1px 9px;font-size:.85rem}
        #trophies .tr-items{display:flex;flex-wrap:wrap;gap:10px}
        #trophies .tr-item{width:96px;text-align:center;font-size:.74rem;line-height:1.2;color:#cfe0fb}
        #trophies .tr-item img{width:58px;height:58px;object-fit:contain;filter:drop-shadow(0 3px 5px rgba(0,0,0,.6))}
        #trophies .tr-item .e{font-size:2.4rem;line-height:58px;height:58px}
        #trophies .tr-item strong{display:block;color:#fff}
        #trophies .tr-empty{color:#6f86ad;font-style:italic;font-size:.85rem}
        #trophies .tr-hist{display:flex;flex-direction:column;gap:8px}
        #trophies .tr-year{background:#0e2549;border:1px solid #2a4a7c;border-left:4px solid #3d6aa8;border-radius:3px;padding:9px 11px}
        #trophies .tr-year.champ{border-left-color:#ffd24a;background:linear-gradient(90deg,rgba(255,210,74,.12),#0e2549 55%)}
        #trophies .tr-year.up{border-left-color:#4caf50}#trophies .tr-year.down{border-left-color:#f44336}
        #trophies .tr-year-h{display:flex;justify-content:space-between;gap:8px;font-weight:700;color:#fff;flex-wrap:wrap}
        #trophies .tr-year-h small{color:#a9c0e6;font-weight:400}
        #trophies .tr-year-b{margin-top:4px;font-size:.82rem;color:#cfe0fb;display:flex;flex-wrap:wrap;gap:4px 14px}
        #trophies .tr-career{background:#0e2549;border:1px solid #2a4a7c;border-radius:4px;padding:10px 12px;font-size:.9rem;line-height:1.7;color:#e6eefb}`;
        document.head.appendChild(st);
    }

    function trophyCard(t) {
        const k = KIND[t.kind] || { label: t.label || 'Título', emoji: '🏆' };
        const sub = [t.kind === 'liga' || t.kind === 'ascenso' ? DIV[t.division] || t.division : '', t.team || ''].filter(Boolean).join(' · ');
        return `<div class="tr-item">${k.img ? `<img src="${esc(k.img)}" alt="" onerror="this.outerHTML='<div class=&quot;e&quot;>${k.emoji}</div>'">` : `<div class="e">${k.emoji}</div>`}
            <strong>${esc(t.season)}</strong>${sub ? esc(sub) : ''}</div>`;
    }
    function shelf(title, img, emoji, items, cards) {
        return `<div class="tr-shelf"><div class="tr-shelf-title">${img ? `<img src="${esc(img)}" alt="" onerror="this.replaceWith(document.createTextNode('${emoji} '))">` : emoji + ' '}${esc(title)}
            <span class="tr-count">${items}</span></div>
            <div class="tr-items">${cards || '<span class="tr-empty">Aún sin títulos. ¡A por el primero!</span>'}</div></div>`;
    }

    function historyCard(h) {
        const classes = ['tr-year'];
        if (h.position === 1) classes.push('champ');
        if (/^ascenso/.test(h.move || '')) classes.push('up'); else if (/^descenso/.test(h.move || '')) classes.push('down');
        const bits = [];
        if (h.points != null) bits.push(`${h.points} pts`);
        if (h.gf != null) bits.push(`GF ${h.gf} · GC ${h.gc}`);
        if (/^ascenso/.test(h.move || '')) bits.push('⬆️ Ascenso');
        if (/^descenso/.test(h.move || '')) bits.push('⬇️ Descenso');
        if (h.copa) bits.push(h.copa.result === 'champion' ? '🏆 Copa: campeón' : `Copa: ${phaseLabel(h.copa.round) || 'eliminado'}`);
        if (h.europa) bits.push(`${(KIND[h.europa.comp] || {}).emoji || '🌍'} ${(KIND[h.europa.comp] || {}).label || 'Europa'}: ${h.europa.result === 'champion' ? 'campeón' : (phaseLabel(h.europa.round) || 'eliminado')}`);
        return `<div class="${classes.join(' ')}"><div class="tr-year-h"><span>${esc(h.season)} · ${esc(h.team || '')}</span>
            <small>${esc(DIV[h.division] || h.division || '')} · ${ordinal(h.position)}</small></div>
            <div class="tr-year-b">${bits.map(b => `<span>${esc(b)}</span>`).join('')}</div></div>`;
    }

    function render() {
        const s = gs(); const root = document.getElementById('trophiesContent');
        if (!s || !root) return;
        injectStyles();
        const trophies = Array.isArray(s.trophies) ? s.trophies : [];
        const awards = Array.isArray(s.managerAwards) ? s.managerAwards : [];
        const hist = Array.isArray(s.seasonHistory) ? s.seasonHistory : [];
        const count = k => trophies.filter(t => t.kind === k).length;
        const titles = SHELVES.reduce((n, k) => n + count(k), 0);
        const europe = count('champions') + count('europaLeague') + count('conferenceLague');
        const best = hist.length ? Math.min(...hist.map(h => h.position || 99)) : null;
        const tiles = [[titles, 'Títulos'], [count('liga'), 'Ligas'], [count('copa'), 'Copas'], [europe, 'Europeos'], [count('ascenso'), 'Ascensos'], [awards.length, 'Entrenador del año'], [hist.length, 'Temporadas'], [best && best < 99 ? ordinal(best) : '–', 'Mejor puesto']];
        let html = `<div class="tr-tiles">${tiles.map(([n, l]) => `<div class="tr-tile"><b>${n}</b><span>${l}</span></div>`).join('')}</div>`;
        html += '<h2>🏆 Vitrina</h2>';
        for (const k of SHELVES) {
            const list = trophies.filter(t => t.kind === k);
            html += shelf(KIND[k].label, KIND[k].img, KIND[k].emoji, list.length, list.map(trophyCard).join(''));
        }
        const ups = trophies.filter(t => t.kind === 'ascenso');
        if (ups.length) html += shelf('Ascensos', KIND.ascenso.img, '⬆️', ups.length, ups.map(trophyCard).join(''));
        html += shelf('Premios del manager', '', '🎖️', awards.length, awards.map(a => `<div class="tr-item"><div class="e">🎖️</div><strong>${esc(a.season)}</strong>${esc(a.label || 'Entrenador del Año')}${a.bonus ? '<br>+' + Math.round(a.bonus).toLocaleString('es-ES') + '€' : ''}</div>`).join(''));
        const pm = s.promanager;
        if (s.gameMode === 'promanager' && pm && pm.sessionId) {
            const wr = pm.gamesManaged > 0 ? Math.round((pm.wins / pm.gamesManaged) * 100) : 0;
            const repLabel = window.pcfRepLabel ? window.pcfRepLabel(pm.reputation) : '';
            html += `<h2>📊 Carrera del manager</h2><div class="tr-career">${repLabel ? `<div style="font-size:1.15em;margin-bottom:4px">${esc(repLabel)}</div>` : ''}
                🏟️ Equipo: <strong>${esc(s.team)}</strong> · ${esc(DIV[s.division] || s.division || '')}<br>
                ⭐ Reputación: <strong>${Math.round(pm.reputation)}</strong> · 🎮 Partidos: <strong>${pm.gamesManaged}</strong><br>
                ✅ ${pm.wins} V &nbsp; 🤝 ${pm.draws} E &nbsp; ❌ ${pm.losses} D &nbsp; (${wr}% victorias)</div>`;
        }
        html += '<h2>📚 Historial de temporadas</h2>';
        html += hist.length ? `<div class="tr-hist">${[...hist].reverse().map(historyCard).join('')}</div>`
            : '<p class="tr-empty">El historial se irá completando al cerrar cada temporada.</p>';
        root.innerHTML = html;
    }

    function createPage() {
        if (document.getElementById('trophies')) return;
        injectStyles();
        const page = document.createElement('div');
        page.id = 'trophies'; page.className = 'page';
        page.innerHTML = `<div class="page-header"><h1>🏆 Sala de trofeos</h1>
            <button class="page-close-btn" onclick="closePage('trophies')">✖ CERRAR</button></div><div id="trophiesContent"></div>`;
        document.body.appendChild(page);
    }
    // El acceso a la Sala de trofeos va en Noticias, justo debajo de «Objetivos con la directiva»
    // (antes era un 5.º botón del menú «Información» que descuadraba la cuadrícula, sobre todo en móvil).
    function ensureLink() {
        const page = document.getElementById('dashboard');
        if (!page) return;
        document.getElementById('trophiesMenuBtn')?.remove();           // por si queda el botón antiguo
        let box = document.getElementById('trophiesLinkBox');
        if (!box) {
            box = document.createElement('section');
            box.id = 'trophiesLinkBox'; box.className = 'data-box';
            box.style.cssText = 'text-align:center;padding:10px';
            box.innerHTML = '<button type="button" class="btn" id="trophiesLinkBtn" style="width:100%;max-width:420px;min-height:44px;font-weight:700">🏆 Sala de trofeos</button>';
            box.querySelector('button').onclick = () => window.openPage('trophies');
        }
        const panel = document.getElementById('boardObjectivesPanel');
        if (panel) { if (box.previousElementSibling !== panel) panel.after(box); }
        else if (box.parentNode !== page) page.appendChild(box);
    }
    function watchDashboard() {
        const page = document.getElementById('dashboard');
        if (!page) { setTimeout(watchDashboard, 400); return; }
        let t = 0;
        new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; ensureLink(); }, 60); })
            .observe(page, { childList: true });
        ensureLink();
    }
    function hookOpenPage() {
        if (typeof window.openPage !== 'function') { setTimeout(hookOpenPage, 300); return; }
        if (window.openPage._pcfTrophies) return;
        const orig = window.openPage;
        window.openPage = function (id, ...rest) {
            const r = orig.call(this, id, ...rest);
            if (id === 'trophies') { try { render(); } catch (e) { console.warn('Trofeos:', e.message); } }
            return r;
        };
        window.openPage._pcfTrophies = true;
    }
    function init() { createPage(); watchDashboard(); hookOpenPage(); }
    window.pcfTrophies = { render };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 200);
})();
