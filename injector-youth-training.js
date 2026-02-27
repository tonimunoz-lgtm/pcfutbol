
// injector-youth-training.js  v1.0
// ============================================================
// DOS FUNCIONALIDADES:
//
// 1. ENTRENADOR DE JUVENILES
//    - Nuevo miembro del staff: entrenadorJuveniles (nivel 1-5)
//    - Cada semana entrena a todos los jugadores de la cantera
//    - Progresión basada en potencial × nivel del entrenador
//    - La mayor progresión ocurre al cambio de temporada
//    - Si un jugador está listo, envía noticia proponiendo ascenso
//    - Se añade a la tabla de Empleados
//
// 2. PANEL DE ENTRENAMIENTO AUTOMÁTICO
//    - Nuevo botón "Entrenamiento" en cuadrante superior derecho
//    - Muestra todos los entrenadores contratados
//    - Modo automático: cada entrenador decide qué entrenar
//      · entrenadorPorteros → entrena porteros
//      · segundoEntrenador  → entrena el resto de jugadores
//    - Compatible con el entrenamiento manual existente
// ============================================================

console.log('🏫 Youth Training Injector cargando...');

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // CONFIGURACIÓN
    // ─────────────────────────────────────────────────────────────
    const YOUTH_ROLE = 'entrenadorJuveniles';
    const YOUTH_ROLE_CONFIG = {
        displayName: 'Entrenador de Juveniles',
        minSalary: 500,
        maxSalary: 2000,
        baseClausula: 3000,
        levelCostMultiplier: 1.5
    };

    // Progresión semanal base por nivel de entrenador
    const YOUTH_WEEKLY_PROG = { 1: 0.06, 2: 0.10, 3: 0.15, 4: 0.22, 5: 0.30 };
    // Bonus extra al cambio de temporada (simula verano de 5-8 semanas reales)
    const YOUTH_SEASON_BONUS = { 1: 0.8, 2: 1.5, 3: 2.5, 4: 3.5, 5: 5.0 };

    // Umbral para proponer ascenso
    const PROMOTE_THRESHOLD_OVERALL = 65;
    const PROMOTE_THRESHOLD_AGE_MAX = 21;

    // Atributos del juego
    const ATTRS = ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];

    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────
    function gs() { return window.gameLogic?.getGameState(); }
    function gl() { return window.gameLogic; }

    function calculateOverall(player) {
        const weights = {
            POR:  { EN:0.1, VE:0.1, RE:0.1, AG:0.1, CA:0.2, EF:0.1, MO:0.1, AT:0.05, DF:0.15 },
            DFC:  { EN:0.2, VE:0.1, RE:0.15, AG:0.1, CA:0.15, EF:0.1, MO:0.1, AT:0.05, DF:0.15 },
            default: { EN:0.1, VE:0.15, RE:0.15, AG:0.1, CA:0.1, EF:0.15, MO:0.1, AT:0.1, DF:0.05 }
        };
        const w = weights[player.position] || weights.default;
        return Math.round(ATTRS.reduce((sum, a) => sum + (player[a] || 0) * (w[a] || 0.1), 0));
    }

    // ─────────────────────────────────────────────────────────────
    // CORE: Entrenamiento semanal de cantera
    // ─────────────────────────────────────────────────────────────
    function trainAcademy(isSeasonChange = false) {
        const state = gs();
        if (!state) return;

        const coach = state.staff?.[YOUTH_ROLE];
        if (!coach) return; // Sin entrenador → sin progresión

        const level = coach.level || 1;
        const weeklyRate = isSeasonChange ? YOUTH_SEASON_BONUS[level] : YOUTH_WEEKLY_PROG[level];
        const promotionCandidates = [];

        state.academy.forEach(player => {
            if (!player || player.isInjured) return;

            const potential = player.potential || 70;
            const currentOverall = calculateOverall(player);
            const gap = potential - currentOverall; // Cuánto le queda por crecer
            if (gap <= 0) return; // Ya llegó a su techo

            // Cuanto más potencial y más margen de mejora, más rápido progresa
            const potentialFactor = (potential / 100); // 0.5 - 0.99
            const gapFactor = Math.min(1, gap / 40);   // Progresa más rápido cuando está lejos del techo

            const effectiveRate = weeklyRate * potentialFactor * (0.5 + gapFactor * 0.5);

            // Distribuir mejoras entre atributos: primero los más bajos respecto a la posición
            let improved = false;
            ATTRS.forEach(attr => {
                if ((player[attr] || 0) < potential - 2) {
                    const roll = Math.random();
                    if (roll < effectiveRate) {
                        player[attr] = Math.min(potential, (player[attr] || 30) + 1);
                        improved = true;
                    }
                }
            });

            if (improved) {
                player.overall = calculateOverall(player);
                player.value = Math.floor(player.overall * 1000 + potential * 500 + (player.salary || 100) * 5);
            }

            // ¿Listo para el primer equipo?
            const newOverall = calculateOverall(player);
            const age = player.age || 18;
            if (newOverall >= PROMOTE_THRESHOLD_OVERALL && age <= PROMOTE_THRESHOLD_AGE_MAX && !player._promoteSuggested) {
                player._promoteSuggested = true;
                promotionCandidates.push({ name: player.name, overall: newOverall, age, potential });
            }
        });

        // Noticias de progresión y sugerencias de ascenso
        if (promotionCandidates.length > 0) {
            promotionCandidates.forEach(p => {
                const msg = `👁️ [Cantera] ${coach.name} informa: ${p.name} (${p.age} años, OVR ${p.overall}, POT ${p.potential}) está listo para dar el salto al primer equipo.`;
                gl().addNews(msg, 'success');
            });
        }

        if (isSeasonChange) {
            const progressed = state.academy.filter(p => p && calculateOverall(p) > (p._prevOverall || 0));
            if (progressed.length > 0) {
                gl().addNews(`🏫 [Cantera] ${coach.name} ha dirigido la pretemporada de la cantera. ${progressed.length} jugadores han mejorado notablemente.`, 'info');
            }
            // Guardar referencia de overall para el próximo cambio de temporada
            state.academy.forEach(p => { if (p) p._prevOverall = calculateOverall(p); });
        }

        gl().updateGameState(state);
    }

    // ─────────────────────────────────────────────────────────────
    // CORE: Entrenamiento automático del primer equipo
    // ─────────────────────────────────────────────────────────────
    function autoTrainFirstTeam() {
        const state = gs();
        if (!state) return;

        const porteroCoach = state.staff?.entrenadorPorteros;
        const segundoCoach = state.staff?.segundoEntrenador;

        // Obtener jugadores disponibles (no lesionados, no sancionados)
        const availableSquad = state.squad.filter(p => p && !p.isInjured && !p.isSuspended);
        if (availableSquad.length === 0) return;

        // El entrenador de porteros entrena al mejor portero disponible
        if (porteroCoach) {
            const goalkeepers = availableSquad.filter(p => p.position === 'POR');
            if (goalkeepers.length > 0) {
                const gk = goalkeepers.reduce((best, p) => {
                    const bOvr = calculateOverall(best);
                    const pOvr = calculateOverall(p);
                    // Priorizar porteros con más margen de mejora
                    const bGap = (best.potential || bOvr) - bOvr;
                    const pGap = (p.potential || pOvr) - pOvr;
                    return pGap > bGap ? p : best;
                }, goalkeepers[0]);
                
                const gkIdx = state.squad.findIndex(p => p?.name === gk.name);
                if (gkIdx !== -1) {
                    // Elegir el atributo más bajo de portero
                    const gkAttrs = ['EN', 'CA', 'RE', 'DF', 'AG'];
                    const weakest = gkAttrs.reduce((w, a) => (gk[a] || 0) < (gk[w] || 0) ? a : w, gkAttrs[0]);
                    gl().setTrainingFocus(gkIdx, weakest);
                }
            }
        }

        // El segundo entrenador entrena al jugador de campo con más potencial sin explotar
        if (segundoCoach) {
            const fieldPlayers = availableSquad.filter(p => p.position !== 'POR');
            if (fieldPlayers.length > 0) {
                const best = fieldPlayers.reduce((best, p) => {
                    const bOvr = calculateOverall(best);
                    const pOvr = calculateOverall(p);
                    const bGap = (best.potential || bOvr) - bOvr;
                    const pGap = (p.potential || pOvr) - pOvr;
                    return pGap > bGap ? p : best;
                }, fieldPlayers[0]);

                const idx = state.squad.findIndex(p => p?.name === best.name);
                if (idx !== -1) {
                    const posAttrs = {
                        DFC: ['DF','EN','CA'], LI: ['VE','RE','DF'], LD: ['VE','RE','DF'],
                        MC: ['RE','MO','CA'], MCO: ['CA','AG','AT'], MCD: ['DF','MO','EN'],
                        MD: ['VE','AT','RE'], MI: ['VE','AT','RE'], EXT: ['VE','AG','AT'],
                        DC: ['EF','AT','CA']
                    };
                    const attrs = posAttrs[best.position] || ['RE','AT','DF'];
                    const weakest = attrs.reduce((w, a) => (best[a] || 0) < (best[w] || 0) ? a : w, attrs[0]);
                    gl().setTrainingFocus(idx, weakest);
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // HOOK simulateWeek
    // ─────────────────────────────────────────────────────────────
    let _prevSeason = null;
    let _hooked = false;

    function hookSimulateWeek() {
        if (!window.simulateWeek || _hooked) { if (!window.simulateWeek) setTimeout(hookSimulateWeek, 400); return; }
        _hooked = true;

        const orig = window.simulateWeek;
        window.simulateWeek = async function (...args) {
            const before = gs();
            const wasPreseason = before?.seasonType === 'preseason';

            // Si auto-training está activo, aplicar antes de simular
            const autoOn = localStorage.getItem('autoTraining_enabled') === 'true';
            if (autoOn && !wasPreseason) {
                autoTrainFirstTeam();
            }

            const result = await orig.apply(this, args);

            const after = gs();
            const isSeasonChange = before?.currentSeason && after?.currentSeason && before.currentSeason !== after.currentSeason;

            // Entrenar cantera cada semana (si no es pretemporada, o en cambio de temporada)
            if (after?.seasonType !== 'preseason' || isSeasonChange) {
                trainAcademy(isSeasonChange);
            }

            _prevSeason = after?.currentSeason;
            return result;
        };

        console.log('[YouthTraining] hook simulateWeek ✓');
    }

    // ─────────────────────────────────────────────────────────────
    // UI: Añadir fila del Entrenador de Juveniles en tabla de Staff
    // ─────────────────────────────────────────────────────────────
    function injectStaffRow() {
        const tbody = document.querySelector('#staff table tbody');
        if (!tbody || document.getElementById('staffRowJuveniles')) return;

        const tr = document.createElement('tr');
        tr.id = 'staffRowJuveniles';
        tr.innerHTML = `
            <td>🏫 Entrenador Juveniles</td>
            <td id="staffEntrenadorJuvenilesName">No Contratado</td>
            <td id="staffEntrenadorJuvenilesLevel">-</td>
            <td id="staffEntrenadorJuvenilesalary">-</td>
            <td id="staffEntrenadorJuvenilesClausula">-</td>
            <td><button class="btn btn-sm" id="btnHireEntrenadorJuveniles" onclick="window.openYouthCoachModal()">Contratar</button></td>
        `;
        tbody.appendChild(tr);
        updateStaffRowUI();
        console.log('[YouthTraining] Fila staff cantera añadida ✓');
    }

    function updateStaffRowUI() {
        const state = gs();
        const coach = state?.staff?.[YOUTH_ROLE];

        const nameEl = document.getElementById('staffEntrenadorJuvenilesName');
        const lvlEl  = document.getElementById('staffEntrenadorJuvenilesLevel');
        const salEl  = document.getElementById('staffEntrenadorJuvenilesalary');  // note: typo en id para evitar colisión
        const clausEl= document.getElementById('staffEntrenadorJuvenilesClausula');
        const btnEl  = document.getElementById('btnHireEntrenadorJuveniles');

        if (nameEl)  nameEl.textContent  = coach ? coach.name  : 'No Contratado';
        if (lvlEl)   lvlEl.textContent   = coach ? coach.level : '-';
        if (salEl)   salEl.textContent   = coach ? (coach.salary ? fmt(coach.salary) + '€' : '-') : '-';
        if (clausEl) clausEl.textContent = coach ? 'N/A' : '-';
        if (btnEl) {
            btnEl.disabled    = !!coach;
            btnEl.textContent = coach ? 'Contratado' : 'Contratar';
        }
    }

    // ─────────────────────────────────────────────────────────────
    // MODAL: Contratar Entrenador de Juveniles
    // ─────────────────────────────────────────────────────────────
    function injectYouthModal() {
        if (document.getElementById('youthCoachModal')) return;

        const modal = document.createElement('div');
        modal.id = 'youthCoachModal';
        modal.style.cssText = `
            display:none; position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.8); z-index:9999; align-items:center; justify-content:center;
        `;
        modal.innerHTML = `
            <div style="background:#1a1a2e; border:2px solid #4CAF50; border-radius:12px; padding:24px; width:90%; max-width:500px; color:#e0e0e0;">
                <h2 style="margin:0 0 16px; color:#4CAF50;">🏫 Contratar Entrenador de Juveniles</h2>
                <p style="color:#aaa; font-size:0.85em; margin:0 0 16px;">El entrenador de juveniles se encargará de la progresión de todos los jugadores de la cantera semana a semana. Cuanto mayor sea su nivel, más rápido progresarán las futuras estrellas.</p>
                <div id="youthCandidatesList" style="margin-bottom:16px;"></div>
                <button onclick="document.getElementById('youthCoachModal').style.display='none'" 
                    style="background:#555; border:none; color:#fff; padding:8px 20px; border-radius:6px; cursor:pointer;">
                    Cancelar
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.openYouthCoachModal = function () {
        const modal = document.getElementById('youthCoachModal');
        if (!modal) return;

        const state = gs();
        const existing = state?.staff?.[YOUTH_ROLE];
        const staffNames = ["Juan", "Pedro", "María", "Carlos", "Ana", "Luis", "Sofía", "Pablo", "Laura", "Diego", "Miguel", "Sergio", "Elena"];
        
        // Generar 3 candidatos
        const candidates = Array.from({ length: 3 }, () => {
            const level = 1 + Math.floor(Math.random() * 5);
            const salary = Math.floor(YOUTH_ROLE_CONFIG.minSalary + (YOUTH_ROLE_CONFIG.maxSalary - YOUTH_ROLE_CONFIG.minSalary) * (level / 5));
            const name = staffNames[Math.floor(Math.random() * staffNames.length)] + ' ' + staffNames[Math.floor(Math.random() * staffNames.length)];
            const clausula = level <= 1 && Math.random() < 0.5 ? 0 : Math.max(1000, Math.floor(YOUTH_ROLE_CONFIG.baseClausula * level * YOUTH_ROLE_CONFIG.levelCostMultiplier * (0.8 + Math.random() * 0.4)));
            return { name, level, salary: Math.round(salary), clausula: Math.round(clausula), role: YOUTH_ROLE, displayName: YOUTH_ROLE_CONFIG.displayName };
        });

        const progLabels = { 1:'Básico', 2:'Normal', 3:'Bueno', 4:'Muy bueno', 5:'Élite' };
        const weeklyLabels = { 1:'Lenta', 2:'Moderada', 3:'Normal', 4:'Rápida', 5:'Muy rápida' };

        let indemnMsg = '';
        if (existing) {
            const indem = existing.salary * 52;
            indemnMsg = `<p style="background:#333; border-left:3px solid #FF9800; padding:8px; font-size:0.85em; color:#FF9800;">
                ⚠️ Al contratar nuevo entrenador, se despedirá a ${existing.name} con ${fmt(indem)}€ de indemnización.
            </p>`;
        }

        document.getElementById('youthCandidatesList').innerHTML = indemnMsg + candidates.map((c, i) => `
            <div style="background:#0d0d1a; border:1px solid #333; border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:#fff;">${c.name}</strong> 
                    <span style="background:#4CAF50; color:#000; font-size:0.75em; padding:2px 6px; border-radius:10px; margin-left:6px;">Nivel ${c.level} · ${progLabels[c.level]}</span><br>
                    <span style="color:#aaa; font-size:0.82em;">
                        💰 ${fmt(c.salary)}€/sem · 📋 Cláusula: ${c.clausula === 0 ? 'Libre' : fmt(c.clausula)+'€'}
                    </span><br>
                    <span style="color:#666; font-size:0.78em;">⚡ Progresión cantera: ${weeklyLabels[c.level]}</span>
                </div>
                <button onclick="window.hireYouthCoach(${i})" data-idx="${i}"
                    style="background:#4CAF50; border:none; color:#000; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold;">
                    Contratar
                </button>
            </div>
        `).join('');

        // Guardar candidatos temporalmente
        window._youthCandidates = candidates;
        modal.style.display = 'flex';
    };

    window.hireYouthCoach = function (idx) {
        const candidate = window._youthCandidates?.[idx];
        if (!candidate) return;

        const state = gs();
        const existing = state?.staff?.[YOUTH_ROLE];
        let cost = candidate.clausula;
        let msg = `¿Contratar a ${candidate.name} (Nivel ${candidate.level}) por ${fmt(candidate.salary)}€/sem`;
        msg += candidate.clausula > 0 ? ` y cláusula ${fmt(candidate.clausula)}€?` : `? (Sin cláusula)`;

        if (existing) {
            const indem = existing.salary * 52;
            cost += indem;
            msg += `\n\nSe despedirá a ${existing.name} con ${fmt(indem)}€ de indemnización.`;
        }

        if (!confirm(msg)) return;

        if ((state.balance || 0) < cost) {
            alert(`Saldo insuficiente. Necesitas ${fmt(cost)}€.`);
            return;
        }

        // Contratar
        state.balance -= cost;
        state.staff[YOUTH_ROLE] = candidate;
        // Incluir el salario del entrenador en los gastos semanales
        gl().updateGameState(state);
        gl().addNews(`🏫 ¡${candidate.name} (Entrenador de Juveniles, Nivel ${candidate.level}) se incorpora al club!`, 'success');

        document.getElementById('youthCoachModal').style.display = 'none';
        updateStaffRowUI();

        // Actualizar display general si existe
        if (window.updateStaffDisplay) window.updateStaffDisplay(state);
    };

    // ─────────────────────────────────────────────────────────────
    // UI: Botón Entrenamiento en cuadrante superior derecho
    // ─────────────────────────────────────────────────────────────
    function injectTrainingButton() {
        const topRight = document.querySelector('.quadrant.top-right');
        if (!topRight || document.getElementById('btnOpenTrainingPanel')) return;

        const btn = document.createElement('button');
        btn.id = 'btnOpenTrainingPanel';
        btn.className = 'menu-button green-button';
        btn.style.cssText = 'background: linear-gradient(135deg, #1565C0, #0D47A1);';
        btn.textContent = '🎯 Entrenamiento';
        btn.onclick = openTrainingPanel;
        topRight.appendChild(btn);
        console.log('[YouthTraining] Botón Entrenamiento añadido ✓');
    }

    // ─────────────────────────────────────────────────────────────
    // PANEL DE ENTRENAMIENTO
    // ─────────────────────────────────────────────────────────────
    function injectTrainingPanel() {
        if (document.getElementById('trainingPanel')) return;

        const panel = document.createElement('div');
        panel.id = 'trainingPanel';
        panel.style.cssText = `
            display:none; position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.85); z-index:9998; overflow-y:auto;
        `;
        panel.innerHTML = `
            <div style="background:#0d0d1a; min-height:100vh; padding:20px; color:#e0e0e0; max-width:800px; margin:0 auto;">
                
                <!-- HEADER -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:2px solid #1565C0; padding-bottom:12px;">
                    <h1 style="margin:0; color:#42A5F5;">🎯 Centro de Entrenamiento</h1>
                    <button onclick="document.getElementById('trainingPanel').style.display='none'"
                        style="background:#c62828; border:none; color:#fff; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">
                        ✖ CERRAR
                    </button>
                </div>

                <!-- TOGGLE AUTOMÁTICO -->
                <div style="background:#0a1628; border:1px solid #1565C0; border-radius:10px; padding:16px; margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0 0 4px; color:#42A5F5;">⚙️ Modo Automático</h3>
                            <p style="margin:0; color:#aaa; font-size:0.85em;">Los entrenadores gestionan el entrenamiento cada semana automáticamente. Compatible con el modo manual de Plantilla.</p>
                        </div>
                        <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                            <input type="checkbox" id="autoTrainingToggle" onchange="window.toggleAutoTraining(this.checked)"
                                style="width:20px; height:20px; cursor:pointer; accent-color:#42A5F5;">
                            <span id="autoTrainingLabel" style="color:#aaa; font-size:0.9em;">Desactivado</span>
                        </label>
                    </div>
                </div>

                <!-- STAFF ENTRENADORES -->
                <div id="trainingStaffCards" style="margin-bottom:20px;"></div>

                <!-- CANTERA - PROGRESIÓN -->
                <div style="background:#0a1628; border:1px solid #388E3C; border-radius:10px; padding:16px;">
                    <h3 style="margin:0 0 12px; color:#66BB6A;">🏫 Cantera - Estado actual</h3>
                    <div id="trainingAcademyList"></div>
                </div>

            </div>
        `;
        document.body.appendChild(panel);
    }

    window.toggleAutoTraining = function (enabled) {
        localStorage.setItem('autoTraining_enabled', enabled ? 'true' : 'false');
        document.getElementById('autoTrainingLabel').textContent = enabled ? 'Activado ✓' : 'Desactivado';
    };

    function openTrainingPanel() {
        const panel = document.getElementById('trainingPanel');
        if (!panel) return;

        const state = gs();
        if (!state) return;

        // Toggle state
        const autoOn = localStorage.getItem('autoTraining_enabled') === 'true';
        const toggle = document.getElementById('autoTrainingToggle');
        if (toggle) toggle.checked = autoOn;
        const label = document.getElementById('autoTrainingLabel');
        if (label) label.textContent = autoOn ? 'Activado ✓' : 'Desactivado';

        // Render staff entrenadores
        renderStaffCards(state);

        // Render cantera
        renderAcademyProgress(state);

        panel.style.display = 'block';
    }

    function renderStaffCards(state) {
        const container = document.getElementById('trainingStaffCards');
        if (!container) return;

        const coaches = [
            { role: 'entrenadorJuveniles', icon: '🏫', label: 'Entrenador de Juveniles', color: '#66BB6A', desc: 'Gestiona la progresión de toda la cantera automáticamente.' },
            { role: 'entrenadorPorteros', icon: '🥅', label: 'Entrenador de Porteros', color: '#42A5F5', desc: 'Selecciona y entrena al portero con mayor potencial sin explotar.' },
            { role: 'segundoEntrenador', icon: '📋', label: 'Segundo Entrenador', color: '#FFA726', desc: 'Selecciona y entrena al jugador de campo con más margen de mejora.' }
        ];

        container.innerHTML = `<h3 style="margin:0 0 12px; color:#e0e0e0;">👔 Cuerpo Técnico</h3>` +
        coaches.map(c => {
            const staff = state.staff?.[c.role];
            return `
            <div style="background:#0a1628; border:1px solid ${c.color}33; border-radius:10px; padding:14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="font-size:1.2em;">${c.icon}</span>
                    <strong style="color:${c.color}; margin-left:6px;">${c.label}</strong>
                    ${staff ? `<span style="background:${c.color}22; color:${c.color}; font-size:0.75em; padding:2px 8px; border-radius:10px; margin-left:8px;">Nivel ${staff.level}</span>` : ''}
                    <br>
                    <span style="color:#aaa; font-size:0.82em;">${staff ? staff.name + ' · ' + fmt(staff.salary) + '€/sem' : 'No contratado'}</span><br>
                    <span style="color:#666; font-size:0.78em;">${c.desc}</span>
                </div>
                ${!staff ? `<button onclick="window.${c.role === YOUTH_ROLE ? 'openYouthCoachModal' : 'openHireStaffModal("' + c.role + '")'}()"
                    style="background:#333; border:1px solid ${c.color}; color:${c.color}; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.82em;">
                    Contratar
                </button>` : `<span style="color:#4CAF50; font-size:1.2em;">✓</span>`}
            </div>`;
        }).join('');
    }

    function renderAcademyProgress(state) {
        const container = document.getElementById('trainingAcademyList');
        if (!container) return;

        const academy = state.academy || [];
        const coach = state.staff?.[YOUTH_ROLE];

        if (!coach) {
            container.innerHTML = `<p style="color:#666; text-align:center; padding:20px;">⚠️ Sin entrenador de juveniles contratado. Los jugadores de cantera no progresan.</p>`;
            return;
        }

        if (academy.length === 0) {
            container.innerHTML = `<p style="color:#666; text-align:center; padding:20px;">La cantera está vacía.</p>`;
            return;
        }

        const rows = academy.map(p => {
            if (!p) return '';
            const ovr = calculateOverall(p);
            const pot = p.potential || ovr;
            const gap = pot - ovr;
            const pct = Math.round((ovr / pot) * 100);
            const barColor = pct > 85 ? '#4CAF50' : pct > 65 ? '#FFA726' : '#42A5F5';
            const status = p.isInjured ? '🏥 Lesionado' : p._promoteSuggested ? '⬆️ Listo para subir' : '✓ Entrenando';
            const statusColor = p.isInjured ? '#f44336' : p._promoteSuggested ? '#4CAF50' : '#aaa';
            return `
            <div style="background:#111827; border:1px solid #1e293b; border-radius:8px; padding:10px 14px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div style="flex:1; min-width:150px;">
                    <strong style="color:#e0e0e0;">${p.name}</strong>
                    <span style="color:#666; font-size:0.8em; margin-left:6px;">${p.position} · ${p.age || '?'} años</span><br>
                    <span style="color:${statusColor}; font-size:0.78em;">${status}</span>
                </div>
                <div style="flex:1; min-width:160px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.8em; margin-bottom:3px;">
                        <span style="color:#aaa;">OVR <strong style="color:#fff;">${ovr}</strong></span>
                        <span style="color:#aaa;">POT <strong style="color:#FFA726;">${pot}</strong></span>
                        <span style="color:#aaa;">Margen +<strong style="color:#42A5F5;">${gap}</strong></span>
                    </div>
                    <div style="background:#1e293b; border-radius:4px; height:6px; overflow:hidden;">
                        <div style="width:${pct}%; height:100%; background:${barColor}; transition:width 0.3s;"></div>
                    </div>
                </div>
                ${p._promoteSuggested ? `
                <button onclick="window.promoteFromTrainingPanel('${p.name}')"
                    style="background:#4CAF50; border:none; color:#000; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:0.78em; font-weight:bold;">
                    ⬆️ Subir
                </button>` : ''}
            </div>`;
        }).join('');

        container.innerHTML = rows || `<p style="color:#666; text-align:center;">Sin jugadores en cantera.</p>`;
    }

    window.openTrainingPanel = openTrainingPanel;

    window.promoteFromTrainingPanel = function (name) {
        if (!confirm(`¿Ascender a ${name} al primer equipo?`)) return;
        const result = gl()?.promoteYoungster?.(name);
        if (result?.success) {
            alert(`✅ ${name} ha sido ascendido al primer equipo.`);
            openTrainingPanel(); // Refrescar panel
        } else {
            alert(result?.message || 'No se pudo ascender al jugador.');
        }
    };

    // ─────────────────────────────────────────────────────────────
    // HOOK openPage para refrescar staff row al abrir Staff
    // ─────────────────────────────────────────────────────────────
    function hookOpenPage() {
        if (!window.openPage) { setTimeout(hookOpenPage, 300); return; }
        const orig = window.openPage;
        window.openPage = function (page, ...args) {
            orig.call(this, page, ...args);
            if (page === 'staff') {
                setTimeout(() => {
                    injectStaffRow();
                    updateStaffRowUI();
                }, 80);
            }
        };
    }

    // ─────────────────────────────────────────────────────────────
    // ARRANQUE
    // ─────────────────────────────────────────────────────────────
    function boot() {
        if (!window.gameLogic) { setTimeout(boot, 600); return; }

        // Asegurar que el rol de entrenador de juveniles existe en el staff del gameState
        const state = gs();
        if (state && state.staff && !(YOUTH_ROLE in state.staff)) {
            state.staff[YOUTH_ROLE] = null;
            gl().updateGameState(state);
        }

        injectYouthModal();
        injectTrainingPanel();
        hookSimulateWeek();
        hookOpenPage();

        console.log('[YouthTraining] ✅ v1.0 listo');
    }

    boot();

})();
