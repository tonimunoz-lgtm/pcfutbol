// ==UserScript==
// @name         Cards & Suspensions System Injector
// @namespace    https://your-game.local/injectors
// @version      1.1.0
// @description  Inyecta sistema visual y validaciones de tarjetas sin modificar archivos del juego
// @match        *://TU_DOMINIO_DEL_JUEGO/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    /***********************************************************
     * 1️⃣ CSS (inyectado una sola vez)
     ***********************************************************/
    const CSS = `
    .player-status-indicator { margin-left: 6px; font-size: 0.85em; }
    .injured-badge { color: #c00; font-weight: bold; margin-left: 4px; }
    .suspended-badge { color: #900; font-weight: bold; margin-left: 4px; animation: blink 1s infinite; }
    .yellow-card-badge { color: #e6b800; font-weight: bold; margin-left: 4px; }
    .warning-badge { color: orange; font-weight: bold; margin-left: 4px; }
    .red-card-badge { color: darkred; font-weight: bold; margin-left: 4px; }

    .injured { background: rgba(255, 0, 0, 0.08); }
    .suspended { background: rgba(200, 0, 0, 0.12); }

    @keyframes blink {
        0%,100% { opacity: 1 }
        50% { opacity: 0.4 }
    }
    `;

    function injectCSS() {
        if (document.getElementById('cards-system-css')) return;
        const style = document.createElement('style');
        style.id = 'cards-system-css';
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    /***********************************************************
     * 2️⃣ Helpers globales
     ***********************************************************/
    function injectHelpers() {
        if (window.renderPlayerStatusBadges) return;

        window.renderPlayerStatusBadges = function (p) {
            let b = '';

            if (p.isInjured)
                b += `<span class="injured-badge">❌ Lesión (${p.weeksOut}sem)</span>`;

            if (p.isSuspended)
                b += `<span class="suspended-badge">⛔ SANCIÓN (${p.suspensionWeeks})</span>`;

            if (p.redCards > 0)
                b += `<span class="red-card-badge">🟥 x${p.redCards}</span>`;

            if (p.yellowCards > 0) {
                const warn = p.yellowCards >= 4;
                b += `<span class="${warn ? 'warning-badge' : 'yellow-card-badge'}">
                        🟨 x${p.yellowCards}${warn ? ' ⚠️' : ''}
                      </span>`;
            }

            return b ? `<span class="player-status-indicator">${b}</span>` : '';
        };

        window.applyPlayerStatusClasses = function (el, p) {
            if (p.isInjured) el.classList.add('injured');
            if (p.isSuspended) el.classList.add('suspended');
        };
    }

    /***********************************************************
     * 3️⃣ Monkey‑patch seguro de window.drag
     ***********************************************************/
    function patchDrag() {
        if (!window.drag || window.drag.__patched) return;

        const original = window.drag;
        window.drag = function (ev, playerJson) {
            const p = JSON.parse(decodeURIComponent(playerJson));

            if (p.isInjured) {
                ev.preventDefault();
                alert(`${p.name} está lesionado y no puede jugar.`);
                return;
            }

            if (p.isSuspended) {
                ev.preventDefault();
                alert(`${p.name} está sancionado y no puede jugar.`);
                return;
            }

            return original(ev, playerJson);
        };

        window.drag.__patched = true;
    }

    /***********************************************************
     * 4️⃣ Re‑aplicar badges al DOM (post‑render)
     ***********************************************************/
    function refreshBadges() {
        document.querySelectorAll('[data-player]').forEach(el => {
            try {
                const p = JSON.parse(el.dataset.player);
                window.applyPlayerStatusClasses(el, p);

                if (!el.querySelector('.player-status-indicator')) {
                    el.innerHTML += window.renderPlayerStatusBadges(p);
                }

                el.draggable = !p.isInjured && !p.isSuspended;
            } catch (_) {}
        });
    }

    /***********************************************************
     * 5️⃣ Loop de detección (AUTO)
     ***********************************************************/
    function boot() {
        injectCSS();
        injectHelpers();
        patchDrag();
        refreshBadges();
    }

    const observer = new MutationObserver(boot);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // primer arranque
    window.addEventListener('DOMContentLoaded', boot);
})();
