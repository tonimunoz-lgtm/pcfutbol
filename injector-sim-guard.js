// ============================================================
// injector-sim-guard.js
// Una sola jornada a la vez.
// Pulsar "Seguir" dos veces seguidas (o mientras se cierra una
// ventana de copa) lanzaba dos simulaciones en paralelo y el partido
// del usuario se contaba dos veces. Este módulo intercepta el clic en
// los botones de jornada, lanza window.simulateWeek una sola vez y
// descarta los clics que llegan mientras la jornada está en marcha.
// (gameLogic tiene además su propio bloqueo interno.)
// ============================================================
(function () {
    'use strict';
    let busy = false;

    function setButtonsBusy(on) {
        document.querySelectorAll('[onclick*="simulateWeek"]').forEach(b => {
            b.style.opacity = on ? '0.55' : '';
            b.style.cursor = on ? 'wait' : '';
            if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy');
        });
    }

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest && e.target.closest('[onclick*="simulateWeek"]');
        if (!btn) return;
        // El onclick del botón no llega a ejecutarse: lo lanzamos nosotros
        e.stopImmediatePropagation();
        e.preventDefault();
        if (busy) {
            console.warn('[SimGuard] Jornada en curso: clic ignorado');
            return;
        }
        busy = true;
        setButtonsBusy(true);
        try {
            await window.simulateWeek();
        } catch (err) {
            console.error('[SimGuard] Error simulando la jornada:', err);
        } finally {
            busy = false;
            setButtonsBusy(false);
        }
    }, true);

    window.isSimulatingWeek = () => busy;
})();
