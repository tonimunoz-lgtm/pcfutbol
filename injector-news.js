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
        .news-badge { background:#1e88e5; color:#fff; border-radius:10px; padding:1px 7px; font-size:.72em; font-weight:800; margin-left:6px; vertical-align:middle; }`;
        document.head.appendChild(st);
    }

    function unreadCount(st) {
        return (st?.newsFeed || []).filter(n => !n.read && n.type !== 'system').length;
    }

    function updateBadge() {
        const btn = document.querySelector('[onclick*="dashboard"]');
        if (!btn) return;
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

    function render() {
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
            <div class="pcf-news-group">🆕 Nuevas (${fresh.length})</div>
            ${fresh.length ? fresh.map(n => itemHtml(n, true)).join('') : '<div class="alert alert-info" style="opacity:.8">No hay noticias nuevas desde tu última visita.</div>'}
            ${onlyNew ? '' : `<div class="pcf-news-group">Anteriores (${old.length})</div>${old.map(n => itemHtml(n, false)).join('')}`}`;
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
