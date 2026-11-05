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
    let autosaveTimer;

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
            const before = window.gameLogic?.getViewState();
            const result = await window.simulateWeek();
            const after = window.gameLogic?.getViewState();
            const changed = before && after && (result?.cupMatch || before.week !== after.week ||
                before.currentSeason !== after.currentSeason || before.seasonType !== after.seasonType ||
                (before.matchHistory || []).length !== (after.matchHistory || []).length);
            if (changed && !result?.ignored) {
                clearTimeout(autosaveTimer);
                autosaveTimer = setTimeout(() => { window.pcfSaveCurrentGame(); }, 700);
            }
        } catch (err) {
            console.error('[SimGuard] Error simulando la jornada:', err);
        } finally {
            busy = false;
            setButtonsBusy(false);
        }
    }, true);

    window.pcfSaveCurrentGame = async function() {
        const state = window.gameLogic?.getGameState();
        if (!state?.team || !window.saveGameToCloud || !window.currentUserId) return { success: false, skipped: true };
        const gameId = state.gameId || `autosave_${state.team}`;
        window.gameLogic.updateGameState({ gameId });
        try {
            const result = await window.saveGameToCloud(window.currentUserId, gameId,
                `[Auto] ${state.team} - Jornada ${state.week}`, window.gameLogic.getGameState());
            if (!result?.success) {
                window.gameLogic.addNews(result?.localSaved ? 'Copia local guardada. La sincronización con la nube sigue pendiente; vuelve a guardar cuando haya conexión.' : 'No se ha podido guardar la partida. Vuelve a intentarlo antes de cerrar.', 'warning');
                return result;
            }
            return result;
        } catch (error) {
            window.gameLogic.addNews('No se ha podido completar el autoguardado en la nube. Vuelve a guardar la partida.', 'warning');
            console.warn('[SimGuard] No se pudo guardar:', error);
            return { success: false, error: error.message };
        }
    };
    window.isSimulatingWeek = () => busy;
})();
