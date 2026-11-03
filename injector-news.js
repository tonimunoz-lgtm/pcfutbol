// ============================================================
// injector-news.js — Noticias leídas y no leídas
// - Cada noticia guarda si se ha leído (campo read).
// - Al abrir Noticias, las nuevas aparecen arriba en "Nuevas" con la
//   etiqueta NUEVA; el resto, en "Anteriores", más tenues. Al salir y volver
//   a entrar ya cuentan como leídas.
// - Filtro "Solo nuevas" y botón "Marcar todo como leído".
// - Contador de noticias sin leer en el botón Noticias del menú
//   (aparte del contador naranja/rojo de acciones urgentes).
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getGameState?.();
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const keyOf = n => n.id || `${n.timestamp}|${n.message}`;

    let highlight = new Set();   // noticias que eran nuevas al abrir la página
    let onlyNew = false;
    let rendering = false;

    function injectStyles() {
        if (document.getElementById('pcfNewsStyles')) return;
        const st = document.createElement('style');
        st.id = 'pcfNewsStyles';
        st.textContent = `
        .pcf-news-bar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:0 0 10px; }
        .pcf-news-group { color: var(--pcf-gold,#ffd24a); font-family:'Saira Condensed',sans-serif; font-weight:700;
            letter-spacing:.08em; text-transform:uppercase; font-size:.85rem; margin:10px 0 6px; }
        .pcf-news-item { position:relative; font-size:.9em; margin-bottom:5px; }
        .pcf-news-item.is-new { border-left:4px solid var(--pcf-gold,#ffd24a) !important; box-shadow:0 0 0 1px rgba(255,210,74,.35); }
        .pcf-news-item.is-old { opacity:.72; }
        .pcf-news-new { display:inline-block; background:var(--pcf-gold,#ffd24a); color:#06142e; font-weight:800; font-size:.7em;
            letter-spacing:.06em; border-radius:3px; padding:1px 6px; margin-right:6px; vertical-align:middle; }
        #pcfNewsGrid { display:grid; grid-template-columns:minmax(280px,1fr) minmax(320px,1.35fr); gap:16px; align-items:start; }
        @media (max-width: 900px) { #pcfNewsGrid { grid-template-columns:1fr; } }
        .pcf-news-col { background:linear-gradient(180deg,rgba(36,80,142,.45) 0%,rgba(7,22,48,.75) 100%); border:1px solid #06142e;
            border-radius:3px; padding:12px; box-shadow:inset 0 1px 0 rgba(255,255,255,.2), inset 0 -3px 10px rgba(0,0,0,.45); }
        .pcf-news-col > h2, .pcf-news-head { font-family:'Saira Condensed',sans-serif; font-size:1rem !important; letter-spacing:.1em; text-transform:uppercase;
            margin:0 0 8px !important; display:flex; align-items:center; gap:8px; }
        .pcf-news-col.urgent { border-top:3px solid #e94560; }
        .pcf-news-col.fresh { border-top:3px solid var(--pcf-gold,#ffd24a); margin-bottom:16px; }
        .pcf-news-col.older { border-top:3px solid #7aa0d4; }
        .pcf-news-hint { font-size:.76rem; color:#cfe0ff; opacity:.85; margin:-2px 0 8px; }
        #newsFeed { background:none !important; border:0 !important; box-shadow:none !important; padding:0 !important; }
        .news-badge { background:#1e88e5; color:#fff; border-radius:10px; padding:1px 7px; font-size:.72em; font-weight:800; margin-left:6px; vertical-align:middle; }`;
        document.head.appendChild(st);
    }

    function unreadCount(st) {
        return (st?.newsFeed || []).filter(n => !n.read && n.type !== 'system').length;
    }

    function updateBadge() {
        const btn = document.querySelector('[onclick*="dashboard"]');
        if (!btn) return;
        const ub = btn.querySelector('.urgent-badge');
        if (ub) ub.title = `${ub.textContent} acción(es) urgente(s) pendiente(s): renovaciones, alineación, plantilla... Desaparece al resolverlas.`;
        btn.querySelector('.news-badge')?.remove();
        const n = unreadCount(gs());
        if (n > 0) {
            const b = document.createElement('span');
            b.className = 'news-badge';
            b.title = `${n} noticia(s) sin leer`;
            b.textContent = n;
            btn.appendChild(b);
        }
    }

    function itemHtml(n, isNew) {
        const cls = n.type === 'error' ? 'alert-error' : n.type === 'warning' ? 'alert-warning' : n.type === 'success' ? 'alert-success' : 'alert-info';
        return `<div class="alert ${cls} pcf-news-item ${isNew ? 'is-new' : 'is-old'}">
            ${isNew ? '<span class="pcf-news-new">NUEVA</span>' : ''}<strong>Sem. ${esc(n.week)}:</strong> ${esc(n.message)}
        </div>`;
    }

    function layoutDashboard() {
        const page = document.getElementById('dashboard');
        const feed = document.getElementById('newsFeed');
        if (!page || !feed) return;
        const h1 = page.querySelector('.page-header h1');
        if (h1 && !h1.dataset.pcf) {
    h1.dataset.pcf = '1';
    h1.innerHTML = '<img src="assets/iconos/noticias.webp" style="width:32px; height:32px; object-fit:contain; vertical-align:middle; margin-right:10px;"> Centro de noticias';}
        [...page.querySelectorAll(':scope > h2')].forEach(h => { if (/Últimas Noticias/i.test(h.textContent)) h.style.display = 'none'; });
        let grid = document.getElementById('pcfNewsGrid');
        if (!grid) {
            grid = document.createElement('div');
            grid.id = 'pcfNewsGrid';
            grid.innerHTML = `<div class="pcf-news-col urgent" id="pcfNewsUrgentCol"></div><div id="pcfNewsRightCol"></div>`;
            feed.parentNode.insertBefore(grid, feed);
        }
        const urgentWrap = document.getElementById('urgent-panel')?.parentElement;
        const left = document.getElementById('pcfNewsUrgentCol');
        if (urgentWrap && urgentWrap.parentElement !== left) {
            urgentWrap.style.marginBottom = '0';
            left.appendChild(urgentWrap);
            const h = urgentWrap.querySelector('h2');
            if (h && !h.dataset.pcf) {
                h.dataset.pcf = '1';
                h.insertAdjacentHTML('afterend', '<div class="pcf-news-hint">Cosas que requieren una decisión tuya. El número naranja del botón Noticias las cuenta y desaparece cuando las resuelves (leer las noticias no lo quita).</div>');
            }
        }
        const right = document.getElementById('pcfNewsRightCol');
        if (feed.parentElement !== right) right.appendChild(feed);
    }

    function render() {
        layoutDashboard();
        const feed = document.getElementById('newsFeed');
        const st = gs();
        if (!feed || !st) return;
        injectStyles();
        rendering = true;
        const items = st.newsFeed || [];
        const fresh = items.filter(n => highlight.has(keyOf(n)));
        const old = items.filter(n => !highlight.has(keyOf(n)));
        feed.dataset.pcfNews = '1';
        feed.innerHTML = `
            <div class="pcf-news-bar">
                <label style="display:flex;gap:6px;align-items:center;cursor:pointer;">
                    <input type="checkbox" id="pcfNewsOnlyNew" ${onlyNew ? 'checked' : ''}> Solo nuevas
                </label>
                <button class="btn btn-sm" id="pcfNewsMarkAll" ${fresh.length ? '' : 'disabled'}>✓ Marcar todo como leído</button>
            </div>
            <div class="pcf-news-col fresh">
                <div class="pcf-news-head" style="color:var(--pcf-gold,#ffd24a)">🆕 Nuevas <span class="news-badge" style="background:#c98a00">${fresh.length}</span></div>
                <div class="pcf-news-hint">Lo que ha pasado desde tu última visita.</div>
                ${fresh.length ? fresh.map(n => itemHtml(n, true)).join('') : '<div class="alert alert-info" style="opacity:.8">No hay noticias nuevas desde tu última visita.</div>'}
            </div>
            ${onlyNew ? '' : `<div class="pcf-news-col older">
                <div class="pcf-news-head" style="color:#9fc4f2">🗂️ Anteriores <span class="news-badge" style="background:#455a64">${old.length}</span></div>
                <div style="max-height:46vh;overflow-y:auto;padding-right:4px">${old.map(n => itemHtml(n, false)).join('')}</div>
            </div>`}`;
        feed.querySelector('#pcfNewsOnlyNew').onchange = e => { onlyNew = e.target.checked; render(); };
        feed.querySelector('#pcfNewsMarkAll').onclick = () => { highlight = new Set(); markAllRead(); render(); };
        rendering = false;
        updateBadge();
    }

    function markAllRead() {
        const st = gs();
        if (!st) return;
        if ((st.newsFeed || []).some(n => !n.read)) {
            gl().updateGameState({ newsFeed: st.newsFeed.map(n => ({ ...n, read: true })), unreadNewsCount: 0 });
        }
        updateBadge();
    }

    function install() {
        injectStyles();
        // Al abrir Noticias: guardar cuáles eran nuevas y marcarlas como leídas
        const origOpen = window.openPage;
        if (typeof origOpen === 'function' && !origOpen._pcfNews) {
            window.openPage = function (pageId, ...args) {
                if (pageId === 'dashboard') {
                    const st = gs();
                    highlight = new Set((st?.newsFeed || []).filter(n => !n.read && n.type !== 'system').map(keyOf));
                }
                const r = origOpen.call(this, pageId, ...args);
                if (pageId === 'dashboard') { markAllRead(); setTimeout(render, 30); }
                return r;
            };
            window.openPage._pcfNews = true;
        }
        // markNewsAsRead del motor: marca también cada noticia
        const lg = gl();
        if (lg && typeof lg.markNewsAsRead === 'function' && !lg.markNewsAsRead._pcfNews) {
            const orig = lg.markNewsAsRead;
            lg.markNewsAsRead = function (...a) { const r = orig.apply(this, a); markAllRead(); return r; };
            lg.markNewsAsRead._pcfNews = true;
        }
        // Tras cada jornada, actualizar contador (y la lista si está abierta)
        const origSim = window.simulateWeek;
        if (typeof origSim === 'function' && !origSim._pcfNews) {
            window.simulateWeek = async function (...a) {
                const r = await origSim.apply(this, a);
                updateBadge();
                if (document.getElementById('dashboard')?.classList.contains('active')) {
                    const st = gs();
                    (st?.newsFeed || []).filter(n => !n.read && n.type !== 'system').forEach(n => highlight.add(keyOf(n)));
                    markAllRead();
                    render();
                }
                return r;
            };
            window.simulateWeek._pcfNews = true;
        }
        // Otros módulos reescriben la lista: volver a pintar la nuestra
        const feed = document.getElementById('newsFeed');
        if (feed && !feed._pcfObs) {
            feed._pcfObs = new MutationObserver(() => {
                if (rendering) return;
                if (!feed.querySelector('.pcf-news-bar')) render();
            });
            feed._pcfObs.observe(feed, { childList: true });
        }
        updateBadge();
    }
    [1500, 3500, 6500].forEach(ms => setTimeout(install, ms));
    setInterval(updateBadge, 4000);
})();
