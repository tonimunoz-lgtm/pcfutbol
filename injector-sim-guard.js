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

    // Panel con el diagnóstico del último fallo de avance, con botón para copiarlo
    function showSimDiagnostic() {
        if (document.getElementById('pcfSimDiag')) return;
        const d = (window.__pcfSimErrors || []).slice(-1)[0]; if (!d) return;
        const txt = JSON.stringify(d, null, 2);
        const box = document.createElement('div'); box.id = 'pcfSimDiag';
        box.style.cssText = 'position:fixed;inset:0;z-index:300000;background:rgba(2,8,22,.82);display:flex;align-items:center;justify-content:center;padding:16px;';
        box.innerHTML = '<div style="width:min(640px,100%);max-height:92vh;overflow:auto;padding:18px 20px;border:2px solid #ffc107;border-radius:14px;background:linear-gradient(180deg,#10285c,#061a40);color:#e6f0ff;font-family:sans-serif;box-shadow:0 0 24px rgba(255,193,7,.45);">'
            + '<h3 style="margin:0 0 8px;color:#ffd24a;">⚠️ El avance de jornada falla de forma repetida</h3>'
            + '<p style="margin:0 0 10px;line-height:1.4;font-size:.95rem;">Se ha restaurado el estado anterior para no duplicar partidos ni cargos, pero la jornada no consigue completarse. Copia este diagnóstico y envíalo: indica exactamente qué la bloquea.</p>'
            + '<textarea id="pcfSimDiagTxt" readonly style="width:100%;height:190px;box-sizing:border-box;padding:8px;border:1px solid #4c8fff;border-radius:8px;background:#04102a;color:#cfe0ff;font:12px/1.35 monospace;"></textarea>'
            + '<div style="display:flex;gap:10px;margin-top:12px;justify-content:flex-end;">'
            + '<button type="button" id="pcfSimDiagCopy" style="padding:10px 18px;border:1px solid #072a66;border-radius:8px;background:linear-gradient(180deg,#6fe0ff,#1f8cf0 46%,#1450c0 54%,#0a2a78);color:#fff;font-weight:800;cursor:pointer;">Copiar diagnóstico</button>'
            + '<button type="button" id="pcfSimDiagClose" style="padding:10px 18px;border:1px solid #2a050b;border-radius:8px;background:linear-gradient(180deg,#ff9494,#d6323d 46%,#a31524 54%,#560914);color:#fff;font-weight:800;cursor:pointer;">Cerrar</button></div></div>';
        document.body.appendChild(box);
        const ta = box.querySelector('#pcfSimDiagTxt'); ta.value = txt;
        box.querySelector('#pcfSimDiagClose').onclick = () => box.remove();
        box.querySelector('#pcfSimDiagCopy').onclick = async () => {
            let ok = false;
            try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { /* sin permiso: se usa el método antiguo */ }
            if (!ok) { ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch (e) { /* */ } }
            box.querySelector('#pcfSimDiagCopy').textContent = ok ? '✓ Copiado' : 'Selecciona el texto y cópialo';
        };
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
            const msg = String((err && err.message) || err).slice(0, 220);
            // Datos para localizar el fallo: qué ha lanzado el error y en qué punto de la partida estaba
            const diag = {
                hora: new Date().toISOString(), error: msg,
                pila: String((err && err.stack) || '').split('\n').slice(0, 8).join('\n'),
                equipo: checkpoint?.team, division: checkpoint?.division, modo: checkpoint?.gameMode,
                temporada: checkpoint?.currentSeason, fase: checkpoint?.seasonType, jornada: checkpoint?.week,
                version: (document.querySelector('script[src*="injector-sim-guard"]')?.src || '').split('?')[1] || '', navegador: navigator.userAgent.slice(0, 120)
            };
            window.__pcfSimErrors = [...(window.__pcfSimErrors || []), diag].slice(-6);
            if(checkpoint){
                window.gameLogic.replaceGameState(checkpoint);
                window.gameLogic.addNews('No se ha completado el avance (' + msg.slice(0, 120) + '). Se ha restaurado el estado anterior para evitar duplicar partidos o cargos.','warning');
                window.ui?.refreshUI?.(window.gameLogic.getViewState());
            }
            console.error('[SimGuard] Error simulando la jornada:', err);
            // Aviso visible (antes solo quedaba una noticia): si la jornada se repite con otro resultado es porque el avance falló y se deshizo
            try { window.pcfToast?.('La jornada no se ha podido completar y se ha deshecho (' + msg.slice(0, 140) + '). Si se repite, anota este mensaje.', { type: 'error', duration: 14000 }); } catch (e) { /* */ }
            // Si el mismo avance falla dos veces seguidas, panel con el diagnóstico listo para copiar
            const reps = window.__pcfSimErrors.filter(d => d.error === diag.error && d.jornada === diag.jornada && d.temporada === diag.temporada && d.fase === diag.fase).length;
            if (reps >= 2) showSimDiagnostic();
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
                window.gameLogic.addNews(result?.code === 'save/conflict' ? result.error : result?.localSaved ? 'Copia local guardada, pero la nube no la ha aceptado' + (result?.code ? ' (' + result.code + ')' : '') + '. Abre Cargar partida y pulsa «Sincronizar con la nube» para ver el motivo y subirla.' : 'No se ha podido guardar la partida. Vuelve a intentarlo antes de cerrar.', 'warning');
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
