// cards-system.injector.js
(function () {
    'use strict';

    // ============================
    // 1️⃣ Helpers globales
    // ============================
    if (!window.renderPlayerStatusBadges) {
        window.renderPlayerStatusBadges = function (p) {
            let b = '';
            if (p.isInjured) b += `<span class="injured-badge">❌ Lesión (${p.weeksOut}sem)</span>`;
            if (p.isSuspended) b += `<span class="suspended-badge">⛔ SANCIÓN (${p.suspensionWeeks})</span>`;
            if (p.redCards > 0) b += `<span class="red-card-badge">🟥 x${p.redCards}</span>`;
            if (p.yellowCards > 0) {
                const warn = p.yellowCards >= 4;
                b += `<span class="${warn ? 'warning-badge' : 'yellow-card-badge'}">
                        🟨 x${p.yellowCards}${warn ? ' ⚠️' : ''}
                      </span>`;
            }
            return b ? `<span class="player-status-indicator">${b}</span>` : '';
        };
    }

    if (!window.applyPlayerStatusClasses) {
        window.applyPlayerStatusClasses = function (el, p) {
            if (p.isInjured) el.classList.add('injured');
            if (p.isSuspended) el.classList.add('suspended');
        };
    }

    // ============================
    // 2️⃣ Parchear window.drag
    // ============================
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

    // ============================
    // 3️⃣ Actualizar badges en DOM
    // ============================
    function refreshBadges() {
        // Todos los elementos con atributo data-player (alineación, suplentes, plantilla, mercado)
        document.querySelectorAll('[data-player]').forEach(el => {
            try {
                const p = JSON.parse(el.dataset.player);

                window.applyPlayerStatusClasses(el, p);

                if (!el.querySelector('.player-status-indicator')) {
                    el.innerHTML += window.renderPlayerStatusBadges(p);
                }

                // Bloquear arrastre si sancionado o lesionado
                el.draggable = !p.isInjured && !p.isSuspended;
                el.ondragstart = (ev) => {
                    if (p.isInjured || p.isSuspended) ev.preventDefault();
                    else window.drag(ev, encodeURIComponent(JSON.stringify(p)));
                };
            } catch (_) {}
        });
    }

    // ============================
    // 4️⃣ Auto‑detectar cambios
    // ============================
    function boot() {
        patchDrag();
        refreshBadges();
    }

    const observer = new MutationObserver(boot);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // primer arranque
    window.addEventListener('DOMContentLoaded', boot);

})();
