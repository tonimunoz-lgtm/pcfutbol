// ============================================================
// injector-positions.js — Posiciones con color y mini campo
//  • Las filas de las tablas de jugadores se tiñen según la línea del jugador:
//    portero (ámbar) · defensa (verde) · medio (azul) · delantero (rojo)
//  • La celda POS lleva un mini campo con un punto en la posición exacta
//  • Los suplentes de la Alineación usan el mismo código
// Funciona sobre cualquier tabla con una columna «POS»: Plantilla, Cantera,
// Renovaciones y Mercado.
// ============================================================
(function () {
    'use strict';
    const GROUP = { POR: 'por', DFC: 'def', LI: 'def', LD: 'def', MC: 'med', MCO: 'med', MD: 'med', MI: 'med', EXT: 'del', DC: 'del' };
    const COLOR = { por: '#ffd54f', def: '#7be07f', med: '#5aa9ff', del: '#ff7a6b' };
    const NAME = { por: 'Portero', def: 'Defensa', med: 'Medio', del: 'Delantero' };
    // Posición en el campo (x, y) con el ataque arriba; EXT se pinta en las dos bandas
    const SPOT = {
        POR: [[20, 51]], DFC: [[20, 41]], LI: [[6, 38]], LD: [[34, 38]], MC: [[20, 29]], MCO: [[20, 19]],
        MI: [[6, 27]], MD: [[34, 27]], EXT: [[6, 12], [34, 12]], DC: [[20, 7]]
    };

    function pitchSvg(pos) {
        const g = GROUP[pos]; if (!g) return '';
        const dots = (SPOT[pos] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.6" fill="${COLOR[g]}" stroke="#06142e" stroke-width="1.5"/>`).join('');
        return `<svg class="pcf-mini" viewBox="0 0 40 58" width="26" height="38" aria-hidden="true">
            <rect x=".7" y=".7" width="38.6" height="56.6" rx="2" fill="#1f6b2e" stroke="#e8f5e9" stroke-width="1.2"/>
            <line x1=".7" y1="29" x2="39.3" y2="29" stroke="#e8f5e9" stroke-width="1"/><circle cx="20" cy="29" r="5.5" fill="none" stroke="#e8f5e9" stroke-width="1"/>
            <rect x="9" y=".7" width="22" height="9" fill="none" stroke="#e8f5e9" stroke-width="1"/><rect x="9" y="48.3" width="22" height="9" fill="none" stroke="#e8f5e9" stroke-width="1"/>
            ${dots}</svg>`;
    }
    window.pcfPosGroup = p => GROUP[p] || null;
    window.pcfPosIcon = pitchSvg;

    // Decoración de un elemento suelto (suplentes de la alineación)
    window.pcfPosDecorate = function (el, pos) {
        const g = GROUP[pos]; if (!el || !g) return;
        el.classList.remove('pcf-pos-por', 'pcf-pos-def', 'pcf-pos-med', 'pcf-pos-del');
        el.classList.add('pcf-pos-' + g, 'pcf-pos-item');
        if (!el.querySelector('.pcf-mini')) el.insertAdjacentHTML('afterbegin', `<span class="pcf-mini-wrap" title="${NAME[g]} · ${pos}">${pitchSvg(pos)}</span>`);
    };

    function css() {
        if (document.getElementById('pcfPosCss')) return;
        const st = document.createElement('style'); st.id = 'pcfPosCss';
        st.textContent = `
        tr.pcf-pos-por > td:not(.pcf-col-media){background:#fff2bf !important}
        tr.pcf-pos-def > td:not(.pcf-col-media){background:#dcf3d8 !important}
        tr.pcf-pos-med > td:not(.pcf-col-media){background:#d6e8fc !important}
        tr.pcf-pos-del > td:not(.pcf-col-media){background:#fddcd6 !important}
        tr.pcf-pos-por:nth-child(even) > td:not(.pcf-col-media){background:#ffeaa0 !important}
        tr.pcf-pos-def:nth-child(even) > td:not(.pcf-col-media){background:#cbebc6 !important}
        tr.pcf-pos-med:nth-child(even) > td:not(.pcf-col-media){background:#c4dbf6 !important}
        tr.pcf-pos-del:nth-child(even) > td:not(.pcf-col-media){background:#fbcbc2 !important}
        tr.pcf-pos-por > td:first-child{box-shadow:inset 5px 0 0 #e0a800}
        tr.pcf-pos-def > td:first-child{box-shadow:inset 5px 0 0 #2e9e3a}
        tr.pcf-pos-med > td:first-child{box-shadow:inset 5px 0 0 #1f78d1}
        tr.pcf-pos-del > td:first-child{box-shadow:inset 5px 0 0 #d9432f}
        td.pcf-pos-cell{white-space:nowrap}
        /* atributos coloreados por valor; los clave de cada posición, en negrita y con fondo */
        td.pcf-attr{text-align:center;font-weight:600}
        td.pcf-attr.t5{color:#0a7d2c;font-weight:800}td.pcf-attr.t4{color:#1f5fb5}td.pcf-attr.t3{color:#2b3548}td.pcf-attr.t2{color:#9a6a00}td.pcf-attr.t1{color:#c62828;font-weight:800}
        td.pcf-attr.key{font-weight:900;font-size:1.06em;box-shadow:inset 0 -3px 0 rgba(10,26,53,.55)}
        th.pcf-key-col{box-shadow:inset 0 -3px 0 #ffd24a}
        /* separadores: titulares / convocados / no convocados */
        tr.pcf-sep > td{background:linear-gradient(180deg,#14305c,#0b1f40) !important;color:#ffd24a !important;text-align:center;letter-spacing:.22em;text-transform:uppercase;font-weight:800;font-size:.86em;padding:7px 4px !important;border-top:2px solid #06142e;border-bottom:2px solid #06142e}
        tr.pcf-sep > td small{display:block;letter-spacing:.06em;font-weight:500;opacity:.75;text-transform:none;font-size:.82em;margin-top:2px}
        tr.pcf-noconv > td:not(.pcf-col-media){opacity:.78}
        td.pcf-pos-cell .pcf-pos{display:inline-flex;align-items:center;gap:6px;font-weight:800}
        .pcf-mini{display:block;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))}
        .pcf-mini-wrap{display:inline-flex;align-items:center;margin-right:7px;flex:0 0 auto}
        #pcfPosLegend{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin:0 0 8px;font-size:.8rem;color:#cfe0ff}
        #pcfPosLegend span{display:inline-flex;align-items:center;gap:6px}#pcfPosLegend i{width:14px;height:14px;border-radius:3px;border:1px solid rgba(0,0,0,.4)}
        /* suplentes de la alineación */
        #reservesList .draggable-player.pcf-pos-item{display:flex !important;align-items:center;justify-content:flex-start !important;text-align:left !important;border-left:5px solid transparent}
        #reservesList .draggable-player.pcf-pos-por{border-left-color:#ffd54f;background:linear-gradient(90deg,rgba(255,213,79,.28),rgba(255,213,79,.08)) !important}
        #reservesList .draggable-player.pcf-pos-def{border-left-color:#7be07f;background:linear-gradient(90deg,rgba(123,224,127,.26),rgba(123,224,127,.07)) !important}
        #reservesList .draggable-player.pcf-pos-med{border-left-color:#5aa9ff;background:linear-gradient(90deg,rgba(90,169,255,.28),rgba(90,169,255,.08)) !important}
        #reservesList .draggable-player.pcf-pos-del{border-left-color:#ff7a6b;background:linear-gradient(90deg,rgba(255,122,107,.28),rgba(255,122,107,.08)) !important}`;
        document.head.appendChild(st);
    }

    // Atributos que más pesan según la posición
    const KEY = { POR: ['DF', 'AG'], DFC: ['DF', 'CA', 'EN'], LI: ['VE', 'DF', 'RE'], LD: ['VE', 'DF', 'RE'], MC: ['RE', 'AT', 'DF'], MCO: ['AT', 'AG', 'EF'], MI: ['VE', 'AT'], MD: ['VE', 'AT'], EXT: ['VE', 'AG', 'AT'], DC: ['EF', 'CA', 'AT'] };
    const ATTRS = ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];
    const tier = v => v >= 85 ? 't5' : v >= 75 ? 't4' : v >= 65 ? 't3' : v >= 50 ? 't2' : 't1';
    const BENCH_SIZE = 7;

    function colorAttributes(table, ths, tr, code) {
        ATTRS.forEach(a => {
            const idx = ths.findIndex(th => th.textContent.trim().toUpperCase() === a);
            if (idx < 0) return;
            const td = tr.children[idx]; if (!td) return;
            const v = parseInt(td.textContent, 10); if (isNaN(v)) return;
            td.classList.remove('t1', 't2', 't3', 't4', 't5', 'key');
            td.classList.add('pcf-attr', tier(v));
            if ((KEY[code] || []).includes(a)) td.classList.add('key');
        });
    }

    // Titulares / convocados / no convocados, como en el PC Fútbol clásico
    function groupSquad(table, ths) {
        const G = window.gameLogic, st = G && G.getGameState && G.getGameState();
        if (!st || !Array.isArray(st.lineup)) return;
        const nameIdx = ths.findIndex(th => /^JUGADOR$/i.test(th.textContent.trim()));
        if (nameIdx < 0) return;
        const tbody = table.querySelector('tbody'); if (!tbody) return;
        const rows = [...tbody.querySelectorAll('tr:not(.pcf-sep)')];
        const sig = st.lineup.map(p => p && p.name).join('|') + '#' + rows.length + '#' + rows.map(r => r.children[nameIdx]?.textContent.trim()).join(',').length;
        if (tbody.dataset.pcfGroup === sig) return;
        const byName = new Map((st.squad || []).map(p => [p.name, p]));
        const inXI = new Set(st.lineup.filter(Boolean).map(p => p.name));
        const startersRows = [], benchCand = [], restRows = [];
        rows.forEach(r => {
            const n = r.children[nameIdx]?.textContent.trim(), p = byName.get(n);
            if (inXI.has(n)) startersRows.push(r);
            else if (p && !p.isInjured && !p.isSuspended && p.contractType !== 'loaned_out') benchCand.push({ r, o: p.overall || 0 });
            else restRows.push(r);
        });
        benchCand.sort((a, b) => b.o - a.o);
        const benchRows = benchCand.slice(0, BENCH_SIZE).map(x => x.r);
        benchCand.slice(BENCH_SIZE).forEach(x => restRows.push(x.r));
        // los titulares, por línea (portero, defensas, medios, delanteros) como en el clásico
        const ORDER = { por: 0, def: 1, med: 2, del: 3 };
        const gi = r => ORDER[(r.className.match(/pcf-pos-(por|def|med|del)/) || [])[1]] ?? 9;
        const ovrIdx = ths.findIndex(th => /^(MEDIA|OVR)$/i.test(th.textContent.trim()));
        const ov = r => parseInt(r.children[ovrIdx]?.textContent, 10) || 0;
        startersRows.sort((a, b) => gi(a) - gi(b) || ov(b) - ov(a));
        benchRows.sort((a, b) => gi(a) - gi(b) || ov(b) - ov(a));
        const sep = (txt, sub) => { const tr = document.createElement('tr'); tr.className = 'pcf-sep'; tr.innerHTML = `<td colspan="${ths.length}">${txt}${sub ? `<small>${sub}</small>` : ''}</td>`; return tr; };
        tbody.innerHTML = '';
        let n = 1; const put = (r, noconv) => { if (r.children[0]) r.children[0].textContent = n++; r.classList.toggle('pcf-noconv', !!noconv); tbody.appendChild(r); };
        tbody.appendChild(sep('Once titular', `${st.formation || ''} · ${startersRows.length} jugadores`));
        startersRows.forEach(r => put(r, false));
        if (benchRows.length) { tbody.appendChild(sep('Jugadores convocados', 'Suplentes en el banquillo')); benchRows.forEach(r => put(r, false)); }
        if (restRows.length) { tbody.appendChild(sep('Jugadores no convocados', 'Lesionados, sancionados, cedidos y resto de la plantilla')); restRows.forEach(r => put(r, true)); }
        tbody.dataset.pcfGroup = sig;
    }

    const CONTAINERS = '#squadList, #academyList, #negotiationsSquadList, #availablePlayersSearchResult';
    function enhanceTables() {
        css();
        document.querySelectorAll(CONTAINERS).forEach(box => {
            box.querySelectorAll('table').forEach(table => {
                const ths = [...table.querySelectorAll('thead th')];
                const idx = ths.findIndex(th => /^POS$/i.test(th.textContent.trim()));
                if (idx < 0) return;
                table.querySelectorAll('tbody tr').forEach(tr => {
                    const td = tr.children[idx];
                    if (!td || td.dataset.pcfPos === td.textContent.trim()) return;
                    const code = (td.querySelector('b')?.textContent || td.textContent).trim();
                    const g = GROUP[code];
                    if (!g) return;
                    tr.classList.remove('pcf-pos-por', 'pcf-pos-def', 'pcf-pos-med', 'pcf-pos-del');
                    tr.classList.add('pcf-pos-' + g);
                    td.classList.add('pcf-pos-cell');
                    td.innerHTML = `<span class="pcf-pos" title="${NAME[g]}">${pitchSvg(code)}<b>${code}</b></span>`;
                    td.dataset.pcfPos = td.textContent.trim();
                });
                // atributos con color por valor y columnas clave de la posición
                table.querySelectorAll('tbody tr').forEach(tr => { const c = tr.children[idx]?.dataset.pcfPos; if (c) colorAttributes(table, ths, tr, c); });
                if (box.id === 'squadList') groupSquad(table, ths);
            });
        });
        // leyenda sobre la tabla de Plantilla
        const sq = document.getElementById('squadList');
        if (sq && sq.querySelector('table') && !document.getElementById('pcfPosLegend')) {
            const lg = document.createElement('div'); lg.id = 'pcfPosLegend';
            lg.innerHTML = Object.keys(NAME).map(g => `<span><i style="background:${COLOR[g]}"></i>${NAME[g]}s</span>`).join('') +
                '<span style="opacity:.75">El punto del mini campo marca la posición exacta (los extremos juegan por las dos bandas).</span>';
            sq.parentNode.insertBefore(lg, sq);
        }
    }

    // El texto del próximo partido se ajusta al círculo: los nombres largos nunca se salen
    function fitCircle() {
        const c = document.querySelector('.main-center-circle');
        if (!c || !c.offsetParent) return;
        const els = [...c.querySelectorAll('.next-match-title, #nextMatchTeams, #nextMatchDate')];
        if (!els.length) return;
        els.forEach(e => { e.style.fontSize = ''; });
        const r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
        const far = () => {
            let w = 0;
            els.forEach(e => { const rg = document.createRange(); rg.selectNodeContents(e);
                [...rg.getClientRects()].forEach(q => [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]].forEach(([x, y]) => { w = Math.max(w, Math.hypot(x - cx, y - cy)); })); });
            return w;
        };
        const base = els.map(e => parseFloat(getComputedStyle(e).fontSize));
        let f = 1;
        while (far() > R * 0.88 && f > 0.5) { f -= 0.04; els.forEach((e, i) => { e.style.fontSize = (base[i] * f).toFixed(1) + 'px'; }); }
    }
    window.addEventListener('resize', () => setTimeout(fitCircle, 100));

    let queued = false;
    const schedule = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; try { enhanceTables(); } catch (e) { /* */ } try { fitCircle(); } catch (e) { /* */ } }, 120); };
    function start() {
        schedule();
        new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
