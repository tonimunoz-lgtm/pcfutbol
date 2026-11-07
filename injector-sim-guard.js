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
    let pendingSaves=0;

    function setButtonsBusy(on) {
        document.querySelectorAll('[onclick*="simulateWeek"]').forEach(b => {
            b.style.opacity = on ? '0.55' : '';
            b.style.cursor = on ? 'wait' : '';
            if (on) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy');
        });
    }

    // ¿Hay algún aviso/modal grande esperando al jugador? (si lo hay, la jornada no está «atascada», está esperando)
    function blockingOverlayVisible() {
        const ids = '#cupAnnModal,#cupResModal,#matchSummaryModal,#pcfGala,#fd-modal,.pcf-dlg-back,#pcfPress,#offersModal.active,.modal.active';
        const named = [...document.querySelectorAll(ids)].filter(e => e.id !== 'gameSelectionModal');
        const big = [...document.body.children].filter(e => e.id !== 'pcfToasts' && e.id !== 'pcfIntro' && e.id !== 'gameSelectionModal');
        return named.concat(big).some(e => {
            const st = getComputedStyle(e), r = e.getBoundingClientRect();
            return st.position === 'fixed' && st.display !== 'none' && st.visibility !== 'hidden' &&
                r.width >= innerWidth * 0.5 && r.height >= innerHeight * 0.3 && (Number(st.zIndex) || 0) >= 1000;
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
        clearTimeout(autosaveTimer);
        autosaveTimer=null;
        let checkpoint;
        try {
            checkpoint=window.gameLogic?.getGameState();
            const before = window.gameLogic?.getViewState();
            // Perro guardián: si pasa mucho tiempo sin ningún modal a la vista, la jornada se ha quedado esperando algo que
            // no llegará; se libera el botón para no dejar al jugador bloqueado hasta recargar.
            let stopWatch = () => {};
            const stuck = new Promise(resolve => {
                let lastBlocked = Date.now();
                const iv = setInterval(() => {
                    if (blockingOverlayVisible()) lastBlocked = Date.now();
                    else if (Date.now() - lastBlocked > (window.__pcfGuardMs || 45000)) { clearInterval(iv); resolve('stuck'); }
                }, 1000);
                stopWatch = () => clearInterval(iv);
            });
            let result;
            try { result = await Promise.race([window.simulateWeek(), stuck]); } finally { stopWatch(); }
            if (result === 'stuck') {
                console.warn('[SimGuard] La jornada no responde: se libera el bloqueo');
                window.pcfToast?.('La jornada se quedó esperando y se ha desbloqueado. Vuelve a pulsar «Seguir»; si se repite, guarda y recarga.', { type: 'warn', duration: 9000 });
                window.ui?.refreshUI?.(window.gameLogic?.getViewState());
                return;
            }
            const after = window.gameLogic?.getViewState();
            const changed = before && after && (result?.cupMatch || before.week !== after.week ||
                before.currentSeason !== after.currentSeason || before.seasonType !== after.seasonType ||
                (before.matchHistory || []).length !== (after.matchHistory || []).length);
            if (changed && !result?.ignored) {
                clearTimeout(autosaveTimer);
                autosaveTimer = setTimeout(() => { autosaveTimer=null; window.pcfSaveCurrentGame(); }, 700);
            }
        } catch (err) {
            if(checkpoint){
                window.gameLogic.replaceGameState(checkpoint);
                window.gameLogic.addNews('No se ha completado el avance. Se ha restaurado el estado anterior para evitar duplicar partidos o cargos.','warning');
                window.ui?.refreshUI?.(window.gameLogic.getViewState());
            }
            console.error('[SimGuard] Error simulando la jornada:', err);
        } finally {
            busy = false;
            setButtonsBusy(false);
        }
    }, true);

    window.pcfSaveCurrentGame = async function() {
        const state = window.gameLogic?.getViewState();
        if (!state?.team || !window.saveGameToCloud || !window.currentUserId) return { success: false, skipped: true };
        const gameId = state.gameId || `autosave_${state.team}`;
        window.gameLogic.updateGameState({ gameId });
        pendingSaves++;
        try {
            const result = await window.saveGameToCloud(window.currentUserId, gameId,
                `[Auto] ${state.team} - Jornada ${state.week}`, window.gameLogic.getGameState());
            if (!result?.success) {
                window.gameLogic.addNews(result?.code === 'save/conflict' ? result.error : result?.localSaved ? 'Copia local guardada. La sincronización con la nube sigue pendiente; vuelve a guardar cuando haya conexión.' : 'No se ha podido guardar la partida. Vuelve a intentarlo antes de cerrar.', 'warning');
                return result;
            }
            return result;
        } catch (error) {
            window.gameLogic.addNews('No se ha podido completar el autoguardado en la nube. Vuelve a guardar la partida.', 'warning');
            console.warn('[SimGuard] No se pudo guardar:', error);
            return { success: false, error: error.message };
        } finally { pendingSaves--; }
    };
    document.addEventListener('visibilitychange',()=>{
        if(document.visibilityState==='hidden' && autosaveTimer && !busy){clearTimeout(autosaveTimer);autosaveTimer=null;window.pcfSaveCurrentGame();}
    });
    window.addEventListener('beforeunload',event=>{
        if(busy || autosaveTimer || pendingSaves){event.preventDefault();event.returnValue='';}
    });
    window.isSimulatingWeek = () => busy;
})();
