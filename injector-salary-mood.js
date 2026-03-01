// ============================================================
// injector-salary-mood.js
//
// MEJORA: La satisfacción salarial de los jugadores afecta
// a su rendimiento en los partidos.
//
// Cómo funciona:
// 1. Cada jugador tiene un índice de satisfacción (0-100)
//    basado en su salario vs. lo que "merecería" por su overall.
// 2. La satisfacción afecta al form del jugador (+/- hasta 15 pts).
// 3. Jugadores muy insatisfechos piden la venta o bajan rendimiento.
// 4. El panel de plantilla muestra el estado de ánimo.
// 5. El Secretario Técnico da consejos sobre salarios si existe.
//
// FÓRMULA:
//   salario_justo = overall * 35 (estimación de mercado)
//   ratio = salario_real / salario_justo
//   satisfacción = 50 + (ratio - 1) * 60  → clamp 0-100
// ============================================================

(function () {
    'use strict';
    console.log('😊 injector-salary-mood cargando...');

    // ─────────────────────────────────────────────────────────────
    // CONFIG
    // ─────────────────────────────────────────────────────────────

    const CONFIG = {
        salaryPerOverallPoint: 35,    // Salario "justo" por punto de overall
        moodFormBonus: 15,            // Bonus máximo de form por satisfacción alta
        moodFormPenalty: -15,         // Penalización máxima de form por insatisfacción
        unhappyThreshold: 35,         // Por debajo → jugador infeliz
        unhappyTransferRequest: 20,   // Por debajo → puede pedir la venta
        transferRequestChance: 0.08,  // 8% por jornada si muy insatisfecho
        moodUpdateInterval: 1,        // Actualizar cada N jornadas
    };

    // Emojis de estado de ánimo
    const MOOD_EMOJI = {
        happy:    { icon: '😄', label: 'Feliz',         color: '#4CAF50' },
        content:  { icon: '🙂', label: 'Contento',      color: '#8BC34A' },
        neutral:  { icon: '😐', label: 'Neutral',       color: '#FFC107' },
        unhappy:  { icon: '😟', label: 'Descontento',   color: '#FF9800' },
        angry:    { icon: '😠', label: 'Muy insatisfecho', color: '#f44336' },
    };

    // ─────────────────────────────────────────────────────────────
    // UTILIDADES
    // ─────────────────────────────────────────────────────────────

    function gs() {
        return window.gameLogic?.getGameState?.();
    }

    function news(msg, type) {
        window.gameLogic?.addNews?.(msg, type || 'info');
    }

    function updateState(fn) {
        const state = gs();
        if (!state) return;
        fn(state);
        window.gameLogic?.updateGameState?.(state);
    }

    function showToast(msg, type) {
        window.showToast?.(msg, type);
    }

    // ─────────────────────────────────────────────────────────────
    // CÁLCULO DE SATISFACCIÓN
    // ─────────────────────────────────────────────────────────────

    function calcSatisfaction(player, state) {
        if (!player || player.contractType !== 'owned') return 75; // cedidos/libres siempre OK

        const fairSalary = player.overall * CONFIG.salaryPerOverallPoint;
        const ratio = (player.salary || 0) / (fairSalary || 1);

        // Base: 50 + ajuste por ratio salarial
        let satisfaction = 50 + (ratio - 1) * 60;

        // Bonificaciones extra
        if (player.contractYears >= 3) satisfaction += 5;   // contrato largo = seguridad
        if (state?.popularity >= 70)   satisfaction += 5;   // club popular
        if (player.matches > 20)       satisfaction += 5;   // titular habitual

        // Penalizaciones
        if (player.contractYears === 0) satisfaction -= 15; // nervioso por el contrato
        if (player.isInjured)           satisfaction -= 5;

        return Math.round(Math.max(0, Math.min(100, satisfaction)));
    }

    function getMoodInfo(satisfaction) {
        if (satisfaction >= 75) return MOOD_EMOJI.happy;
        if (satisfaction >= 55) return MOOD_EMOJI.content;
        if (satisfaction >= 40) return MOOD_EMOJI.neutral;
        if (satisfaction >= CONFIG.unhappyThreshold) return MOOD_EMOJI.unhappy;
        return MOOD_EMOJI.angry;
    }

    // ─────────────────────────────────────────────────────────────
    // ACTUALIZAR FORM BASADO EN SATISFACCIÓN
    // ─────────────────────────────────────────────────────────────

    function updatePlayerMood(player, state) {
        const satisfaction = calcSatisfaction(player, state);
        player.satisfaction = satisfaction;

        const mood = getMoodInfo(satisfaction);
        player.moodIcon  = mood.icon;
        player.moodLabel = mood.label;

        // Ajuste de form
        const normalized = (satisfaction - 50) / 50; // -1 a +1
        const formBonus = normalized >= 0
            ? normalized * CONFIG.moodFormBonus
            : normalized * Math.abs(CONFIG.moodFormPenalty);

        // Aplicar al form (respetando el form base del juego)
        if (player.form !== undefined) {
            const currentFormBase = player._baseForm ?? player.form;
            player._baseForm = currentFormBase;
            // Blend: 80% form original, 20% ajuste por mood
            player.form = Math.round(Math.max(1, Math.min(99,
                currentFormBase + formBonus * 0.4
            )));
        }

        return satisfaction;
    }

    // ─────────────────────────────────────────────────────────────
    // PROCESAR PETICIONES DE TRASPASO POR INSATISFACCIÓN
    // ─────────────────────────────────────────────────────────────

    function processUnhappyPlayers() {
        const state = gs();
        if (!state) return;

        (state.squad || []).forEach(player => {
            if (player.contractType !== 'owned') return;
            if (player.satisfaction === undefined) return;
            if (player.satisfaction >= CONFIG.unhappyThreshold) return;
            if (player.transferListed) return; // ya está en el mercado

            // Muy insatisfecho → puede pedir la venta
            if (player.satisfaction < CONFIG.unhappyTransferRequest) {
                if (Math.random() < CONFIG.transferRequestChance) {
                    player.transferListed = true;
                    player.askingPrice = Math.round((player.value || 50000) * 0.85);
                    player.weeksOnMarket = 0;

                    news(
                        `😠 ${player.name} ha solicitado su traspaso por insatisfacción salarial. Su representante afirma que el club no valora al jugador.`,
                        'error'
                    );
                    showToast(`😠 ${player.name} pide el traspaso`, 'error');
                }
            } else if (player.satisfaction < CONFIG.unhappyThreshold) {
                // Solo descontento → advertencia ocasional
                if (Math.random() < 0.05) {
                    news(
                        `😟 ${player.name} se muestra descontento con su salario. Considera renovar en mejores condiciones.`,
                        'warning'
                    );
                }
            }
        });

        window.gameLogic?.updateGameState?.(state);
    }

    // ─────────────────────────────────────────────────────────────
    // CONSEJO DEL SECRETARIO TÉCNICO
    // ─────────────────────────────────────────────────────────────

    function secretaryMoodAdvice() {
        const state = gs();
        if (!state?.staff?.secretario) return;
        if (Math.random() > 0.12) return; // 12% por jornada

        const unhappy = (state.squad || []).filter(p =>
            p.contractType === 'owned' &&
            p.satisfaction !== undefined &&
            p.satisfaction < CONFIG.unhappyThreshold
        );

        if (unhappy.length === 0) return;

        const worst = unhappy.sort((a, b) => a.satisfaction - b.satisfaction)[0];
        const fairSalary = Math.round(worst.overall * CONFIG.salaryPerOverallPoint);
        const increase = Math.round(fairSalary * 1.1);

        news(
            `[Secretario] ${worst.name} está muy insatisfecho con su salario actual (${(worst.salary || 0).toLocaleString('es-ES')}€/sem). Recomiendo subirlo a unos ${increase.toLocaleString('es-ES')}€/sem para evitar problemas.`,
            'warning'
        );
    }

    // ─────────────────────────────────────────────────────────────
    // HOOK simulateWeek — actualizar mood cada jornada
    // ─────────────────────────────────────────────────────────────

    function hookSimulateWeek() {
        const orig = window.simulateWeek;
        if (!orig || window._salaryMoodHooked) {
            if (!orig) { setTimeout(hookSimulateWeek, 400); return; }
            return;
        }
        window._salaryMoodHooked = true;

        window.simulateWeek = async function (...args) {
            // Actualizar mood ANTES de simular (afecta al partido)
            const stateBefore = gs();
            if (stateBefore?.squad) {
                stateBefore.squad.forEach(p => updatePlayerMood(p, stateBefore));
                window.gameLogic?.updateGameState?.(stateBefore);
            }

            const result = await orig.apply(this, args);

            // Procesar insatisfacción DESPUÉS de simular
            processUnhappyPlayers();
            secretaryMoodAdvice();

            return result;
        };

        console.log('✅ Hook simulateWeek para salary-mood activo');
    }

    // ─────────────────────────────────────────────────────────────
    // INYECTAR ESTADO DE ÁNIMO EN LA TABLA DE PLANTILLA
    // ─────────────────────────────────────────────────────────────

    function injectMoodInSquadTable() {
        const state = gs();
        if (!state?.squad) return;

        // Buscar filas de la tabla de plantilla
        const squadTable = document.querySelector('#squad table tbody') ||
                           document.querySelector('#squadList tbody');
        if (!squadTable) return;

        const rows = squadTable.querySelectorAll('tr');
        rows.forEach((row, idx) => {
            if (!state.squad[idx]) return;
            const player = state.squad[idx];

            if (player.satisfaction === undefined) {
                updatePlayerMood(player, state);
            }

            // Buscar o crear celda de mood
            let moodCell = row.querySelector('.mood-cell');
            if (!moodCell) {
                moodCell = document.createElement('td');
                moodCell.className = 'mood-cell';
                moodCell.style.textAlign = 'center';
                row.appendChild(moodCell);
            }

            const mood = getMoodInfo(player.satisfaction || 50);
            moodCell.innerHTML = `
                <span title="${mood.label} (${player.satisfaction || '?'}%)"
                      style="font-size: 1.2em; cursor: help;">
                    ${mood.icon}
                </span>
            `;
        });
    }

    // ─────────────────────────────────────────────────────────────
    // RESUMEN DE MORAL DEL VESTUARIO
    // Panel pequeño en la página de plantilla
    // ─────────────────────────────────────────────────────────────

    function renderMoralPanel() {
        const state = gs();
        if (!state?.squad) return;

        const squadPage = document.getElementById('squad');
        if (!squadPage) return;

        let panel = document.getElementById('moral-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'moral-panel';
            panel.style.cssText = 'margin-bottom: 16px;';
            const firstChild = squadPage.querySelector('.page-header + *') || squadPage.firstChild;
            if (firstChild) {
                squadPage.insertBefore(panel, firstChild.nextSibling || firstChild);
            }
        }

        const owned = (state.squad || []).filter(p => p.contractType === 'owned');
        if (owned.length === 0) return;

        // Actualizar satisfacción
        owned.forEach(p => updatePlayerMood(p, state));

        const avgSatisfaction = Math.round(
            owned.reduce((sum, p) => sum + (p.satisfaction || 50), 0) / owned.length
        );

        const happy    = owned.filter(p => (p.satisfaction || 0) >= 75).length;
        const neutral  = owned.filter(p => (p.satisfaction || 0) >= 40 && (p.satisfaction || 0) < 75).length;
        const unhappy  = owned.filter(p => (p.satisfaction || 0) < 40).length;

        const overallMood = getMoodInfo(avgSatisfaction);

        panel.innerHTML = `
            <div style="
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 20px;
                flex-wrap: wrap;
            ">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.8em;">${overallMood.icon}</span>
                    <div>
                        <div style="font-size: 0.75em; color: #aaa;">Moral del vestuario</div>
                        <div style="font-weight: bold; color: ${overallMood.color};">${overallMood.label} (${avgSatisfaction}%)</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; font-size: 0.85em;">
                    <span style="color: #4CAF50;">😄 ${happy} felices</span>
                    <span style="color: #FFC107;">😐 ${neutral} normales</span>
                    <span style="color: #f44336;">😠 ${unhappy} descontentos</span>
                </div>
                ${unhappy > 0 ? `
                    <div style="
                        background: rgba(244,67,54,0.1);
                        border: 1px solid #f44336;
                        border-radius: 4px;
                        padding: 4px 10px;
                        font-size: 0.8em;
                        color: #f44336;
                    ">
                        ⚠️ ${unhappy} jugador${unhappy > 1 ? 'es descontentos' : ' descontento'} — revisa salarios
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ─────────────────────────────────────────────────────────────
    // HOOK openPage
    // ─────────────────────────────────────────────────────────────

    function hookOpenPage() {
        const origOpen = window.openPage;
        if (!origOpen || window._salaryMoodOpenHooked) {
            if (!origOpen) { setTimeout(hookOpenPage, 400); return; }
            return;
        }
        window._salaryMoodOpenHooked = true;

        window.openPage = function (pageId, ...args) {
            origOpen.call(this, pageId, ...args);
            if (pageId === 'squad') {
                setTimeout(renderMoralPanel, 200);
                setTimeout(injectMoodInSquadTable, 350);
            }
        };
    }

    // ─────────────────────────────────────────────────────────────
    // INIT — inicializar satisfacción al arrancar
    // ─────────────────────────────────────────────────────────────

    function initMood() {
        const state = gs();
        if (!state?.squad) return;
        state.squad.forEach(p => updatePlayerMood(p, state));
        window.gameLogic?.updateGameState?.(state);
        console.log('✅ Mood inicializado para', state.squad.length, 'jugadores');
    }

    function waitAndInit() {
        let tries = 0;
        const interval = setInterval(() => {
            tries++;
            if (window.gameLogic && window.simulateWeek) {
                clearInterval(interval);
                hookSimulateWeek();
                hookOpenPage();
                setTimeout(initMood, 500);
                console.log('✅ injector-salary-mood listo');
            }
            if (tries > 100) {
                clearInterval(interval);
                console.warn('⚠️ injector-salary-mood: timeout');
            }
        }, 200);
    }

    if (document.readyState !== 'loading') {
        waitAndInit();
    } else {
        document.addEventListener('DOMContentLoaded', waitAndInit);
    }

})();
