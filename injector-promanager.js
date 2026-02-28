// injector-promanager.js
// Sistema Promanager: recibe ofertas de equipos, reputación en Firebase, despidos.
// NO toca ningún archivo existente. Se añade como <script> en index.html.

console.log('🎯 Injector Promanager cargando...');

(function () {
    'use strict';

    // ─────────────────────────────────────────────
    // CONSTANTES
    // ─────────────────────────────────────────────

    // Jerarquía de divisiones (0 = más baja, 3 = más alta)
    const DIVISION_RANK = {
        rfef_grupo2: 0,
        rfef_grupo1: 1,
        segunda: 2,
        primera: 3
    };

    const DIVISION_LABELS = {
        rfef_grupo2: 'Primera RFEF Grupo 2',
        rfef_grupo1: 'Primera RFEF Grupo 1',
        segunda: 'Segunda División',
        primera: 'Primera División'
    };

    // Umbrales de reputación para poder recibir ofertas de cada división
    // Reputación empieza en 0. Máxima ~100.
    const DIVISION_REP_THRESHOLD = {
        rfef_grupo2: 0,
        rfef_grupo1: 15,
        segunda: 35,
        primera: 60
    };

    // Nodo de Firebase donde guardamos el perfil del manager (por partida / por usuario)
    // Clave: users/{uid}/promanager_career/{sessionId}
    // sessionId se genera al iniciar nueva partida Promanager

    // ─────────────────────────────────────────────
    // ESTADO LOCAL DEL MÓDULO
    // ─────────────────────────────────────────────
    let pmState = {
        active: false,           // ¿Estamos en modo Promanager?
        sessionId: null,         // ID de esta carrera
        reputation: 0,           // Reputación acumulada en esta carrera
        gamesManaged: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        seasonsCompleted: 0,
        currentTeam: null,
        currentDivision: null,
        firebaseSaved: false,
        lastOfferWeek: -99,      // Jornada en que se mostró la última oferta
        pendingOffer: null,      // Oferta pendiente de aceptar/rechazar
        firedThisSeason: false,
        consecutiveLosses: 0,
        weeklyPoints: [],        // Historial de puntos por jornada
    };

    // ─────────────────────────────────────────────
    // FIREBASE: guardar / cargar estado del manager
    // ─────────────────────────────────────────────

    async function waitForAuth() {
        if (window.authReadyPromise) {
            await window.authReadyPromise;
        }
        return window.currentUserId || null;
    }

    async function saveCareerToFirebase() {
        const uid = await waitForAuth();
        if (!uid || !window.firebaseDB) return;
        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const ref = doc(window.firebaseDB, 'users', uid, 'promanager_career', pmState.sessionId);
            await setDoc(ref, {
                ...pmState,
                updatedAt: Date.now()
            });
        } catch (e) {
            console.warn('⚠️ Promanager: error guardando carrera', e);
        }
    }

    async function loadCareerFromFirebase(sessionId) {
        const uid = await waitForAuth();
        if (!uid || !window.firebaseDB) return null;
        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const ref = doc(window.firebaseDB, 'users', uid, 'promanager_career', sessionId);
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() : null;
        } catch (e) {
            console.warn('⚠️ Promanager: error cargando carrera', e);
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // LÓGICA DE REPUTACIÓN
    // ─────────────────────────────────────────────

    function calcRepGain(result, division) {
        const divBonus = { primera: 3, segunda: 2, rfef_grupo1: 1.5, rfef_grupo2: 1 };
        const mult = divBonus[division] || 1;
        if (result === 'win') return Math.round(3 * mult);
        if (result === 'draw') return Math.round(1 * mult);
        return Math.round(-1 * mult); // derrota
    }

    function getRepLabel(rep) {
        if (rep < 10) return '⭐ Desconocido';
        if (rep < 25) return '⭐⭐ Prometedor';
        if (rep < 45) return '⭐⭐⭐ Competente';
        if (rep < 65) return '⭐⭐⭐⭐ Reconocido';
        return '⭐⭐⭐⭐⭐ Élite';
    }

    // ─────────────────────────────────────────────
    // SELECCIÓN DE EQUIPO OFERTANTE
    // ─────────────────────────────────────────────

    function pickOfferTeam(allowedDivisions, excludeTeam) {
        const allTeams = window.TEAMS_DATA || {};
        let candidates = [];
        for (const div of allowedDivisions) {
            const teams = allTeams[div] || [];
            teams.forEach(t => {
                if (t && t !== excludeTeam) {
                    candidates.push({ team: t, division: div });
                }
            });
        }
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    function getAllowedDivisions(rep) {
        return Object.entries(DIVISION_REP_THRESHOLD)
            .filter(([, threshold]) => rep >= threshold)
            .map(([div]) => div);
    }

    // ─────────────────────────────────────────────
    // MODAL: Oferta de entrenador
    // ─────────────────────────────────────────────

    function showOfferModal(offer, onAccept, onReject) {
        removeModal('pmOfferModal');
        const div = offer.division;
        const modal = document.createElement('div');
        modal.id = 'pmOfferModal';
        modal.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.85);
            display:flex;align-items:center;justify-content:center;
            z-index:99999;font-family:inherit;
        `;
        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);
                border:2px solid #e94560;border-radius:16px;
                padding:36px 32px;max-width:480px;width:92%;
                box-shadow:0 0 60px rgba(233,69,96,0.4);
                text-align:center;color:#fff;
            ">
                <div style="font-size:52px;margin-bottom:10px;">📋</div>
                <h2 style="color:#e94560;margin:0 0 6px;font-size:1.5em;">¡Nueva Oferta de Trabajo!</h2>
                <p style="color:#aaa;margin:0 0 24px;font-size:0.9em;">Ha llegado un contrato a tu mesa</p>

                <div style="background:rgba(255,255,255,0.07);border-radius:10px;padding:18px;margin-bottom:20px;text-align:left;">
                    <div style="margin-bottom:8px;">
                        <span style="color:#aaa;font-size:0.85em;">EQUIPO</span><br>
                        <strong style="font-size:1.2em;color:#fff;">🏟️ ${offer.team}</strong>
                    </div>
                    <div style="margin-bottom:8px;">
                        <span style="color:#aaa;font-size:0.85em;">DIVISIÓN</span><br>
                        <strong style="color:#f4c430;">📊 ${DIVISION_LABELS[div] || div}</strong>
                    </div>
                    <div>
                        <span style="color:#aaa;font-size:0.85em;">TU REPUTACIÓN ACTUAL</span><br>
                        <strong style="color:#4caf50;">${getRepLabel(pmState.reputation)} (${pmState.reputation} pts)</strong>
                    </div>
                </div>

                <p style="color:#ccc;font-size:0.9em;margin-bottom:24px;">
                    ¿Aceptas el cargo de entrenador del <strong>${offer.team}</strong>?<br>
                    <small style="color:#888;">Puedes rechazar y seguir con tu equipo actual.</small>
                </p>

                <div style="display:flex;gap:12px;justify-content:center;">
                    <button id="pmOfferAccept" style="
                        background:linear-gradient(135deg,#4caf50,#2e7d32);
                        color:#fff;border:none;border-radius:8px;
                        padding:12px 28px;font-size:1em;font-weight:bold;cursor:pointer;
                        box-shadow:0 4px 15px rgba(76,175,80,0.4);
                    ">✅ Aceptar</button>
                    <button id="pmOfferReject" style="
                        background:rgba(233,69,96,0.2);
                        color:#e94560;border:1px solid #e94560;border-radius:8px;
                        padding:12px 28px;font-size:1em;font-weight:bold;cursor:pointer;
                    ">❌ Rechazar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('pmOfferAccept').onclick = () => { removeModal('pmOfferModal'); onAccept(offer); };
        document.getElementById('pmOfferReject').onclick = () => { removeModal('pmOfferModal'); onReject(offer); };
    }

    // ─────────────────────────────────────────────
    // MODAL: Despido
    // ─────────────────────────────────────────────

    function showFiredModal(onContinue) {
        removeModal('pmFiredModal');
        const modal = document.createElement('div');
        modal.id = 'pmFiredModal';
        modal.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.9);
            display:flex;align-items:center;justify-content:center;
            z-index:99999;font-family:inherit;
        `;
        modal.innerHTML = `
            <div style="
                background:linear-gradient(135deg,#1a0a0a 0%,#2d0f0f 100%);
                border:2px solid #e94560;border-radius:16px;
                padding:36px 32px;max-width:440px;width:92%;
                box-shadow:0 0 80px rgba(233,69,96,0.6);
                text-align:center;color:#fff;
            ">
                <div style="font-size:60px;margin-bottom:10px;">🚪</div>
                <h2 style="color:#e94560;margin:0 0 8px;font-size:1.6em;">HAS SIDO DESPEDIDO</h2>
                <p style="color:#aaa;margin:0 0 20px;font-size:0.95em;">
                    La directiva ha decidido prescindir de tus servicios.
                </p>
                <div style="background:rgba(233,69,96,0.1);border-radius:10px;padding:14px;margin-bottom:20px;">
                    <div style="color:#ccc;font-size:0.9em;">Reputación conservada:</div>
                    <div style="color:#f4c430;font-size:1.2em;font-weight:bold;">${getRepLabel(pmState.reputation)} (${pmState.reputation} pts)</div>
                    <div style="color:#888;font-size:0.8em;margin-top:6px;">Tu historial se mantiene para futuras ofertas</div>
                </div>
                <p style="color:#ccc;font-size:0.9em;margin-bottom:24px;">
                    Espera una nueva oferta de trabajo basada en tu reputación actual...
                </p>
                <button id="pmFiredContinue" style="
                    background:linear-gradient(135deg,#e94560,#c0392b);
                    color:#fff;border:none;border-radius:8px;
                    padding:14px 32px;font-size:1em;font-weight:bold;cursor:pointer;
                    box-shadow:0 4px 15px rgba(233,69,96,0.4);
                ">🔍 Esperar nueva oferta</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('pmFiredContinue').onclick = () => {
            removeModal('pmFiredModal');
            onContinue();
        };
    }

    // ─────────────────────────────────────────────
    // MODAL: Primera oferta (inicio de Promanager)
    // ─────────────────────────────────────────────

    function showInitialOfferModal(offer, onAccept) {
        removeModal('pmInitialModal');
        const modal = document.createElement('div');
        modal.id = 'pmInitialModal';
        modal.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.9);
            display:flex;align-items:center;justify-content:center;
            z-index:99999;font-family:inherit;
        `;
        modal.innerHTML = `
            <div style="
                background:linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%);
                border:2px solid #667eea;border-radius:16px;
                padding:36px 32px;max-width:500px;width:92%;
                box-shadow:0 0 80px rgba(102,126,234,0.5);
                text-align:center;color:#fff;
            ">
                <div style="font-size:56px;margin-bottom:10px;">🚀</div>
                <h2 style="color:#667eea;margin:0 0 4px;font-size:1.6em;">Liga Promanager</h2>
                <p style="color:#aaa;margin:0 0 24px;font-size:0.9em;">
                    No tienes historial. Empieza desde abajo y demuestra tu valía.
                </p>

                <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:18px;margin-bottom:20px;text-align:left;">
                    <div style="color:#aaa;font-size:0.82em;margin-bottom:12px;">📋 PRIMERA OFERTA DE TRABAJO</div>
                    <div style="margin-bottom:8px;">
                        <span style="color:#888;font-size:0.85em;">EQUIPO</span><br>
                        <strong style="font-size:1.2em;">🏟️ ${offer.team}</strong>
                    </div>
                    <div>
                        <span style="color:#888;font-size:0.85em;">DIVISIÓN</span><br>
                        <strong style="color:#f4c430;">📊 ${DIVISION_LABELS[offer.division]}</strong>
                    </div>
                </div>

                <div style="background:rgba(102,126,234,0.1);border-radius:8px;padding:12px;margin-bottom:22px;font-size:0.85em;color:#ccc;">
                    💡 <strong>Cómo funciona:</strong> Gana partidos para subir tu reputación y recibir ofertas de equipos mejores.
                    Si los resultados son malos, podrías ser despedido. Tu carrera se guarda en la nube.
                </div>

                <button id="pmInitialAccept" style="
                    background:linear-gradient(135deg,#667eea,#764ba2);
                    color:#fff;border:none;border-radius:10px;
                    padding:14px 36px;font-size:1.1em;font-weight:bold;cursor:pointer;
                    box-shadow:0 4px 20px rgba(102,126,234,0.5);
                    width:100%;
                ">🎯 ¡Acepto el reto!</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('pmInitialAccept').onclick = () => {
            removeModal('pmInitialModal');
            onAccept(offer);
        };
    }

    // ─────────────────────────────────────────────
    // MODAL: Pantalla de espera (despedido, buscando oferta)
    // ─────────────────────────────────────────────

    function showWaitingForOfferScreen() {
        removeModal('pmWaitingModal');
        const modal = document.createElement('div');
        modal.id = 'pmWaitingModal';
        modal.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.95);
            display:flex;align-items:center;justify-content:center;
            z-index:99998;font-family:inherit;
        `;
        modal.innerHTML = `
            <div style="text-align:center;color:#fff;max-width:400px;padding:40px;">
                <div style="font-size:60px;margin-bottom:16px;">📞</div>
                <h2 style="color:#f4c430;margin:0 0 10px;">Esperando oferta...</h2>
                <p style="color:#aaa;font-size:0.95em;">
                    Estás en el mercado de entrenadores.<br>
                    Tu reputación: <strong style="color:#4caf50;">${getRepLabel(pmState.reputation)} (${pmState.reputation} pts)</strong>
                </p>
                <div style="margin-top:24px;color:#666;font-size:0.85em;">
                    Simula jornadas para que lleguen nuevas ofertas...
                </div>
                <button id="pmWaitSimulate" style="
                    margin-top:24px;
                    background:linear-gradient(135deg,#e94560,#c0392b);
                    color:#fff;border:none;border-radius:8px;
                    padding:12px 28px;font-size:1em;font-weight:bold;cursor:pointer;
                ">⏩ Pasar tiempo</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('pmWaitSimulate').onclick = () => {
            // Intentar generar una nueva oferta al "pasar tiempo"
            tryGenerateNewOffer(true);
        };
    }

    function removeModal(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // ─────────────────────────────────────────────
    // INICIO DE PROMANAGER
    // ─────────────────────────────────────────────

    async function startPromanagerMode() {
        // Crear nueva sesión (historial fresco)
        pmState = {
            active: true,
            sessionId: 'pm_' + Date.now(),
            reputation: 0,
            gamesManaged: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            seasonsCompleted: 0,
            currentTeam: null,
            currentDivision: null,
            firebaseSaved: false,
            lastOfferWeek: -99,
            pendingOffer: null,
            firedThisSeason: false,
            consecutiveLosses: 0,
            weeklyPoints: [],
            unemployed: true   // empieza en paro
        };

        // Esperar a que TEAMS_DATA esté disponible
        await waitForTeamsData();

        // Generar primera oferta (solo RFEF)
        const offer = pickOfferTeam(['rfef_grupo2', 'rfef_grupo1'], null);
        if (!offer) {
            alert('Error: no hay equipos disponibles para el modo Promanager.');
            return;
        }

        showInitialOfferModal(offer, (acceptedOffer) => {
            assignTeam(acceptedOffer);
        });
    }

    async function waitForTeamsData() {
        let tries = 0;
        while (!window.TEAMS_DATA && tries < 30) {
            await new Promise(r => setTimeout(r, 200));
            tries++;
        }
    }

    function assignTeam(offer) {
        pmState.currentTeam = offer.team;
        pmState.currentDivision = offer.division;
        pmState.unemployed = false;
        pmState.consecutiveLosses = 0;
        pmState.firedThisSeason = false;
        pmState.lastOfferWeek = -99;

        // Usar la función estándar del juego para cargar el equipo
        const gameMode = 'promanager';
        window.gameMode = gameMode;

        if (window.gameLogic && window.gameLogic.selectTeamWithInitialSquad) {
            window.gameLogic.selectTeamWithInitialSquad(offer.team, offer.division, gameMode);
            if (window.ui && window.ui.refreshUI) {
                window.ui.refreshUI(window.gameLogic.getGameState());
            }
            // Cerrar modales de selección de equipo si estuvieran abiertos
            ['selectTeam', 'gameMode'].forEach(m => {
                try { window.closeModal(m); } catch (e) {}
            });
            // Ir al dashboard
            setTimeout(() => {
                const btn = document.querySelector('.menu-item[onclick*="dashboard"]');
                if (btn && window.switchPage) window.switchPage('dashboard', btn);
                else if (window.openPage) window.openPage('dashboard');
            }, 300);
        }

        saveCareerToFirebase();

        // Noticia de bienvenida
        setTimeout(() => {
            if (window.gameLogic && window.gameLogic.addNews) {
                window.gameLogic.addNews(`🎯 [Promanager] Has sido contratado por ${offer.team} (${DIVISION_LABELS[offer.division]}). ¡Demuestra tu valía!`, 'info');
                if (window.ui) window.ui.refreshUI(window.gameLogic.getGameState());
            }
        }, 600);
    }

    // ─────────────────────────────────────────────
    // HOOK: interceptar simulateWeek
    // ─────────────────────────────────────────────

    function hookSimulateWeek() {
        const original = window.simulateWeek;
        if (!original || original._pmHooked) return;

        window.simulateWeek = async function () {
            // Si no está en modo promanager, comportamiento normal
            if (!pmState.active || pmState.unemployed) {
                if (pmState.unemployed && pmState.active) {
                    // Está desempleado: no puede simular, mostrar pantalla de espera
                    tryGenerateNewOffer(true);
                    return;
                }
                return original.apply(this, arguments);
            }

            // Simular normalmente
            await original.apply(this, arguments);

            // Analizar resultado después de la simulación
            await afterWeekPromanager();
        };
        window.simulateWeek._pmHooked = true;
    }

    async function afterWeekPromanager() {
        if (!window.gameLogic) return;
        const state = window.gameLogic.getGameState();
        const history = state.matchHistory;
        if (!history || history.length === 0) return;

        const lastMatch = history[history.length - 1];
        if (!lastMatch) return;

        // Detectar resultado del último partido del equipo del jugador
        const myTeam = state.team;
        let result = null;

        if (lastMatch.home === myTeam) {
            const [gh, ga] = lastMatch.score.split('-').map(Number);
            result = gh > ga ? 'win' : gh === ga ? 'draw' : 'loss';
        } else if (lastMatch.away === myTeam) {
            const [gh, ga] = lastMatch.score.split('-').map(Number);
            result = ga > gh ? 'win' : gh === ga ? 'draw' : 'loss';
        }

        if (!result) return;

        // Actualizar stats
        const repGain = calcRepGain(result, state.division);
        pmState.reputation = Math.max(0, Math.min(100, pmState.reputation + repGain));
        pmState.gamesManaged++;
        pmState.weeklyPoints.push(result === 'win' ? 3 : result === 'draw' ? 1 : 0);
        if (result === 'win') { pmState.wins++; pmState.consecutiveLosses = 0; }
        else if (result === 'draw') { pmState.draws++; pmState.consecutiveLosses = 0; }
        else { pmState.losses++; pmState.consecutiveLosses++; }

        pmState.currentTeam = myTeam;
        pmState.currentDivision = state.division;

        await saveCareerToFirebase();

        // ── ¿DESPIDO? ──
        // Se dispara si: 5+ derrotas consecutivas, O últimas 10 jornadas < 20% de puntos posibles
        const shouldFire = checkFiringCondition();
        if (shouldFire && !pmState.firedThisSeason) {
            pmState.firedThisSeason = true;
            pmState.unemployed = true;
            // Penalización de reputación por despido
            pmState.reputation = Math.max(0, pmState.reputation - 5);
            await saveCareerToFirebase();

            setTimeout(() => {
                showFiredModal(() => {
                    // Mostrar pantalla de espera de oferta
                    tryGenerateNewOffer(true);
                });
            }, 500);
            return;
        }

        // ── ¿OFERTA? ──
        // Solo si: no está en paro, han pasado al menos 8 jornadas desde la última oferta,
        // tiene rep suficiente para una división mejor, y la probabilidad lo permite.
        const currentWeek = state.week || 1;
        const weeksSinceOffer = currentWeek - pmState.lastOfferWeek;
        if (weeksSinceOffer >= 8) {
            const shouldOffer = checkOfferCondition(state);
            if (shouldOffer) {
                pmState.lastOfferWeek = currentWeek;
                const allowedDivs = getAllowedDivisions(pmState.reputation);
                // Priorizar divisiones mejores que la actual
                const currentRank = DIVISION_RANK[state.division] || 0;
                const betterDivs = allowedDivs.filter(d => (DIVISION_RANK[d] || 0) > currentRank);
                const offerPool = betterDivs.length > 0 ? betterDivs : allowedDivs;
                const offer = pickOfferTeam(offerPool, myTeam);
                if (offer) {
                    pmState.pendingOffer = offer;
                    setTimeout(() => {
                        showOfferModal(
                            offer,
                            (accepted) => {
                                // Aceptar: cambia de equipo
                                assignTeam(accepted);
                            },
                            (rejected) => {
                                // Rechazar: noticia
                                if (window.gameLogic && window.gameLogic.addNews) {
                                    window.gameLogic.addNews(`📋 [Promanager] Has rechazado la oferta de ${rejected.team}. Sigues al frente de ${myTeam}.`, 'info');
                                    if (window.ui) window.ui.refreshUI(window.gameLogic.getGameState());
                                }
                                pmState.pendingOffer = null;
                            }
                        );
                    }, 800);
                }
            }
        }
    }

    function checkFiringCondition() {
        // 5 derrotas consecutivas
        if (pmState.consecutiveLosses >= 5) return true;
        // Últimas 10 jornadas: menos de 8 puntos sobre 30 posibles (~27%)
        const last10 = pmState.weeklyPoints.slice(-10);
        if (last10.length >= 10) {
            const pts = last10.reduce((a, b) => a + b, 0);
            if (pts < 8) return true;
        }
        return false;
    }

    function checkOfferCondition(state) {
        // Probabilidad base
        let prob = 0;
        const currentRank = DIVISION_RANK[state.division] || 0;

        // Si hay divisiones mejores disponibles y la rep es buena → mayor probabilidad
        const allowedDivs = getAllowedDivisions(pmState.reputation);
        const hasBetterDiv = allowedDivs.some(d => (DIVISION_RANK[d] || 0) > currentRank);

        if (hasBetterDiv) {
            // Probabilidad según reputación y rendimiento reciente
            const last5 = pmState.weeklyPoints.slice(-5);
            const recentPts = last5.reduce((a, b) => a + b, 0);
            prob = 0.08 + (pmState.reputation / 100) * 0.15 + (recentPts / 15) * 0.1;
        } else {
            // Puede recibir oferta lateral (mismo nivel) con poca frecuencia
            prob = 0.03;
        }

        return Math.random() < prob;
    }

    // ─────────────────────────────────────────────
    // GENERAR NUEVA OFERTA (tras despido o pasar tiempo)
    // ─────────────────────────────────────────────

    function tryGenerateNewOffer(showWaiting) {
        const allowedDivs = getAllowedDivisions(pmState.reputation);
        // Con rep baja hay menos probabilidad de oferta inmediata
        const prob = 0.4 + (pmState.reputation / 100) * 0.4;
        const currentTeam = pmState.currentTeam;

        if (Math.random() < prob) {
            const offer = pickOfferTeam(allowedDivs, currentTeam);
            if (offer) {
                removeModal('pmWaitingModal');
                showOfferModal(
                    offer,
                    (accepted) => assignTeam(accepted),
                    () => {
                        // Rechaza → sigue esperando
                        showWaitingForOfferScreen();
                    }
                );
                return;
            }
        }

        // No hay oferta aún
        if (showWaiting) {
            removeModal('pmWaitingModal');
            showWaitingForOfferScreen();
        }
    }

    // ─────────────────────────────────────────────
    // INTERCEPTAR EL BOTÓN DE PROMANAGER
    // ─────────────────────────────────────────────

    function interceptPromanagerButton() {
        // El botón original llama a window.startGameMode('promanager')
        // Lo reemplazamos para nuestro flujo
        const originalStartGameMode = window.startGameMode;

        window.startGameMode = function (mode) {
            if (mode === 'promanager') {
                // Cerrar el modal de selección de modo
                try { window.closeModal('gameMode'); } catch (e) {}
                // Iniciar nuestro flujo
                startPromanagerMode();
            } else {
                // Liga Manager: comportamiento original intacto
                if (originalStartGameMode) {
                    originalStartGameMode.call(this, mode);
                }
                // Desactivar promanager si estaba activo
                pmState.active = false;
            }
        };
        window.startGameMode._pmPatched = true;
    }

    // ─────────────────────────────────────────────
    // INDICADOR DE REPUTACIÓN EN EL HEADER
    // ─────────────────────────────────────────────

    function injectRepBadge() {
        if (document.getElementById('pmRepBadge')) return;
        const header = document.querySelector('.header-info');
        if (!header) return;
        const badge = document.createElement('div');
        badge.id = 'pmRepBadge';
        badge.className = 'info-box';
        badge.style.cssText = 'display:none;cursor:pointer;';
        badge.title = 'Tu reputación como manager';
        badge.innerHTML = `<span>Rep:</span><span id="pmRepValue" style="color:#f4c430;">0</span>`;
        badge.onclick = () => showRepSummary();
        header.appendChild(badge);
    }

    function updateRepBadge() {
        const badge = document.getElementById('pmRepBadge');
        const val = document.getElementById('pmRepValue');
        if (!badge || !val) return;
        if (pmState.active) {
            badge.style.display = '';
            val.textContent = `${pmState.reputation} (${getRepLabel(pmState.reputation).split(' ')[0]})`;
        } else {
            badge.style.display = 'none';
        }
    }

    function showRepSummary() {
        removeModal('pmRepModal');
        const modal = document.createElement('div');
        modal.id = 'pmRepModal';
        modal.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.8);
            display:flex;align-items:center;justify-content:center;
            z-index:99990;font-family:inherit;
        `;
        const wr = pmState.gamesManaged > 0
            ? Math.round((pmState.wins / pmState.gamesManaged) * 100)
            : 0;
        modal.innerHTML = `
            <div style="
                background:linear-gradient(135deg,#1a1a2e,#0f3460);
                border:2px solid #f4c430;border-radius:14px;
                padding:30px;max-width:380px;width:90%;
                text-align:center;color:#fff;
            ">
                <div style="font-size:48px;margin-bottom:8px;">📊</div>
                <h3 style="color:#f4c430;margin:0 0 4px;">Tu Carrera Promanager</h3>
                <div style="font-size:1.4em;margin-bottom:16px;">${getRepLabel(pmState.reputation)}</div>
                <div style="background:rgba(255,255,255,0.07);border-radius:8px;padding:14px;text-align:left;font-size:0.9em;line-height:1.8;">
                    <div>🏟️ Equipo actual: <strong>${pmState.currentTeam || '-'}</strong></div>
                    <div>📊 División: <strong>${DIVISION_LABELS[pmState.currentDivision] || '-'}</strong></div>
                    <div>🔢 Reputación: <strong style="color:#f4c430;">${pmState.reputation} pts</strong></div>
                    <div>🎮 Partidos gestionados: <strong>${pmState.gamesManaged}</strong></div>
                    <div>✅ Victorias: <strong>${pmState.wins}</strong> | 🤝 Empates: <strong>${pmState.draws}</strong> | ❌ Derrotas: <strong>${pmState.losses}</strong></div>
                    <div>📈 % victorias: <strong>${wr}%</strong></div>
                </div>
                <button onclick="document.getElementById('pmRepModal').remove()" style="
                    margin-top:18px;background:rgba(244,196,48,0.2);
                    color:#f4c430;border:1px solid #f4c430;border-radius:8px;
                    padding:10px 24px;font-size:0.9em;cursor:pointer;
                ">Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ─────────────────────────────────────────────
    // ACTUALIZAR BADGE CADA VEZ QUE SE REFRESCA LA UI
    // ─────────────────────────────────────────────

    function hookUIRefresh() {
        const originalRefresh = window.ui && window.ui.refreshUI;
        if (!originalRefresh || (originalRefresh && originalRefresh._pmHooked)) return;
        window.ui.refreshUI = function (...args) {
            originalRefresh.apply(window.ui, args);
            updateRepBadge();
        };
        window.ui.refreshUI._pmHooked = true;
    }

    // ─────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────

    function init() {
        interceptPromanagerButton();
        hookSimulateWeek();
        injectRepBadge();

        // Intentar hookear UI refresh (puede que aún no esté cargado)
        const tryHookUI = setInterval(() => {
            if (window.ui && window.ui.refreshUI && !window.ui.refreshUI._pmHooked) {
                hookUIRefresh();
                clearInterval(tryHookUI);
            }
        }, 300);

        // También re-hookear simulateWeek si se reemplaza tarde
        const tryHookSim = setInterval(() => {
            if (window.simulateWeek && !window.simulateWeek._pmHooked) {
                hookSimulateWeek();
            }
            if (window.simulateWeek && window.simulateWeek._pmHooked) {
                clearInterval(tryHookSim);
            }
        }, 500);

        console.log('✅ Injector Promanager listo');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Si el DOM ya está listo, esperar un tick para que los otros scripts carguen
        setTimeout(init, 100);
    }

})();
