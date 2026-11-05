// ============================================================
// injector-lineup-save.js — Guardado y banquillo de la alineación
//  • La alineación se guarda sola al soltar a cada jugador (el motor llama a
//    setLineup en cada «drop»). El botón antiguo «Guardar alineación» solo
//    repetía el guardado y abría una ventana + una noticia cada vez.
//    Ahora es «Comprobar alineación»: valida y confirma con un aviso discreto.
//  • Corrección: al arrastrar un titular al banquillo, el motor rellenaba el hueco con
//    «el de mejor media que haya», sin mirar la posición (un central podía ser sustituido
//    por un mediocentro). Ahora entra un suplente de la MISMA posición, o de su línea.
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    
    // ── Aviso discreto (no bloquea) ─────────────────────────────
    function toast(msg, type = 'ok') {
        let box = document.getElementById('pcfToastBox');
        if (!box) {
            box = document.createElement('div'); box.id = 'pcfToastBox';
            box.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:280000;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
            document.body.appendChild(box);
        }
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = `background:${type === 'ok' ? 'linear-gradient(180deg,#1f6b2e,#134d1f)' : 'linear-gradient(180deg,#a8381f,#7a2412)'};color:#fff;border:1px solid ${type === 'ok' ? '#7be07f' : '#ff9d8a'};
            padding:9px 18px;border-radius:4px;font:700 .92rem 'Saira Condensed',sans-serif;letter-spacing:.04em;box-shadow:0 8px 22px rgba(0,0,0,.55);opacity:0;transition:opacity .25s`;
        box.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = '1'; });
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2600);
    }
    window.pcfToast = toast;

    const LINE = { POR: 0, DFC: 1, LI: 1, LD: 1, MC: 2, MCO: 2, MD: 2, MI: 2, EXT: 3, DC: 3 };

    // ── Titular → banquillo: entra un suplente de la misma posición ──
    function wrapDrop() {
        const orig = window.drop;
        if (typeof orig !== 'function') return setTimeout(wrapDrop, 500);
        if (orig._pcfSave) return;
        const w = function (ev, target) {
            if (target !== 'reservesList') return orig.call(this, ev, target);
            try {
                ev.preventDefault(); ev.currentTarget && ev.currentTarget.classList.remove('highlight');
                const dropped = JSON.parse(decodeURIComponent(ev.dataTransfer.getData('text/plain')));
                const G = gl(), lineup = G.getLineup();
                const idx = lineup.findIndex(p => p && p.name === dropped.name);
                if (idx < 0) return;                                  // ya estaba en el banquillo
                const out = lineup[idx], ovr = (a, b) => (b.overall || 0) - (a.overall || 0);
                const bench = G.getReservePlayers().filter(p => p && !p.isInjured && !p.isSuspended && p.contractType !== 'loaned_out');
                const sub = bench.filter(p => p.position === out.position).sort(ovr)[0]
                    || bench.filter(p => LINE[p.position] === LINE[out.position]).sort(ovr)[0]
                    || bench.sort(ovr)[0];
                if (!sub) return toast('No quedan suplentes disponibles para sustituirle', 'err');
                const next = [...lineup]; next[idx] = sub;           // mismo hueco: el resto no se mueve
                G.setLineup(next);
                window.renderLineupPageUI && window.renderLineupPageUI();
                toast(`${out.name} al banquillo · entra ${sub.name} (${sub.position})`);
            } catch (e) { console.warn('Banquillo:', e); return orig.call(this, ev, target); }
        };
        w._pcfSave = true; window.drop = w;
    }

    // ── Botón: de «Guardar» a «Comprobar» ───────────────────────
    window.pcfCheckLineup = function () {
        const G = gl(), s = G.getGameState();
        const lineup = G.getLineup();
        const v = G.validateLineup(lineup);
        if (!v.success) return toast(v.message || 'La alineación no es válida', 'err');
        const avg = Math.round(lineup.reduce((t, p) => t + (p.overall || 0), 0) / Math.max(1, lineup.length));
        toast(`✅ Alineación guardada · ${s.formation || ''} · media del once ${avg}`);
    };
    function fixButton() {
        document.querySelectorAll('button[onclick*="saveLineup"]').forEach(b => {
            if (b.dataset.pcfSave) return;
            b.dataset.pcfSave = '1';
            b.setAttribute('onclick', 'window.pcfCheckLineup()');
            b.textContent = '✓ Comprobar alineación';
            b.title = 'Los cambios se guardan solos al soltar a cada jugador. Este botón solo comprueba que el once es válido.';
            const note = document.createElement('div');
            note.style.cssText = 'margin-top:6px;font-size:.78rem;color:#9fc0ee;opacity:.9';
            note.textContent = '💾 La alineación se guarda sola cada vez que mueves a un jugador.';
            b.insertAdjacentElement('afterend', note);
        });
    }
    let q = false;
    const schedule = () => { if (q) return; q = true; setTimeout(() => { q = false; try { fixButton(); } catch (e) { /* */ } }, 150); };
    function start() { wrapDrop(); [1500, 4000, 8000].forEach(ms => setTimeout(wrapDrop, ms)); schedule(); new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true }); }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
