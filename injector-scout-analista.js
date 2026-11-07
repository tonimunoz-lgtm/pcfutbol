// ============================================================
// injector-scout-analista.js  v1.0
//
// 1. OJEADOR - Búsqueda de promesas
//    - Intercepta el botón "+ Contratar Joven de Mercado"
//    - Abre modal propio con selector de posición
//    - Búsqueda asíncrona: 1-5 semanas hasta resultado
//    - Sin ojeador → solo 1 candidato malo
//    - Nivel 1-2 → 1-2 candidatos OVR bajo
//    - Nivel 3-4 → 2-3 candidatos con buen potencial
//    - Nivel 5   → 3-4 candidatos, alguno con potencial 90+
//    - Noticias en el feed: inicio, semanas restantes, resultado
//
// 2. ANALISTA DE VÍDEO - Informes tácticos
//    - Cada semana (si tienes analista) genera un informe
//      del próximo rival: fortalezas, debilidades, consejo
//    - Nivel 1-2 → informe genérico
//    - Nivel 3-4 → datos más precisos
//    - Nivel 5   → consejo táctico concreto (formación/mentalidad)
// ============================================================

(function () {
    'use strict';

    // ── Helpers ───────────────────────────────────────────────────
    const gl  = () => window.gameLogic;
    const gs  = () => gl()?.getViewState?.();
    const addN = (msg, type = 'info') => gl()?.addNews?.(msg, type);

    const POSITIONS_ALL = ['POR','DFC','LI','LD','MC','MCO','MCD','MI','MD','EXT','DC'];
    const ATTRS = ['EN','VE','RE','AG','CA','EF','MO','AT','DF'];

    // ─────────────────────────────────────────────────────────────
    // 1.  GENERADOR DE PROMESAS
    // ─────────────────────────────────────────────────────────────
    function generateProspect(position, scoutLevel) {
        // Calidad según nivel ojeador
        // Nivel 0 (sin ojeador): OVR 35-50, pot bajo
        // Nivel 1: OVR 40-55
        // Nivel 2: OVR 45-60
        // Nivel 3: OVR 50-65, pot hasta 85
        // Nivel 4: OVR 55-70, pot hasta 90
        // Nivel 5: OVR 60-75, pot hasta 95
        const minOvr = 35 + scoutLevel * 4;
        const maxOvr = 48 + scoutLevel * 4;

        const age = 15 + Math.floor(Math.random() * 5); // 15-19

        // Atributos aleatorios dentro del rango
        const attrs = {};
        const base = Math.floor((minOvr + maxOvr) / 2);
        ATTRS.forEach(a => {
            attrs[a] = Math.max(20, Math.min(85, base - 10 + Math.floor(Math.random() * 20)));
        });

        // Overall simplificado
        const overall = Math.round(ATTRS.reduce((s, a) => s + attrs[a], 0) / ATTRS.length);
        // Potencial: casi todas las promesas son del montón; un ojeador mejor encuentra más "buenas" y alguna "joya" (rara).
        //   normal: media + 3..13 · buena: media + 12..22 · joya: media + 22..32 (tope 95)
        const gemChance  = [0.002, 0.004, 0.008, 0.02, 0.035, 0.05][scoutLevel] ?? 0.002;
        const goodChance = [0.10, 0.14, 0.18, 0.24, 0.30, 0.35][scoutLevel] ?? 0.10;
        const roll = Math.random();
        const growth = roll < gemChance ? 22 + Math.random() * 10
                     : roll < gemChance + goodChance ? 12 + Math.random() * 10
                     : 3 + Math.random() * 10;
        const potential = Math.max(overall + 2, Math.min(95, Math.round(overall + growth)));

        // Nombre aleatorio
        const firstNames = ['Alejandro','Carlos','Diego','Marcos','Adrián','Iker','Pablo','Sergio','Álvaro','Raúl',
                            'Mateo','Lucas','Nicolás','Martín','Hugo','Samuel','Javier','David','Daniel','Andres',
                            'Mohamed','Luca','Kai','Noah','Finn','Emil','Rayan','Théo','Yanis','Soren'];
        const lastNames  = ['García','Martínez','López','Sánchez','González','Pérez','Rodríguez','Fernández',
                            'Jiménez','Romero','Torres','Moreno','Ruiz','Herrera','Díaz','Vega','Castro',
                            'Silva','Costa','Ferreira','Müller','Weber','Becker','Dupont','Martin','Bernard',
                            'Okafor','Diallo','Traoré','Mbeki'];
        const name = `${firstNames[Math.floor(Math.random()*firstNames.length)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`;

        const foot = Math.random() < 0.7 ? 'Diestro' : 'Zurdo';
        const salary = Math.floor(overall * 20 + Math.random() * 100);
        // Valor exponencial en media y potencial (antes lineal: una joya de potencial 97 costaba ~40.000€)
        const value  = Math.floor(25000 * Math.pow(1.13, overall - 40) * Math.pow(1.09, Math.max(0, potential - overall - 8)));
        const cost   = Math.max(5000, Math.floor(value * (0.55 + Math.random() * 0.2)));

        return {
            name, position: position || POSITIONS_ALL[Math.floor(Math.random()*POSITIONS_ALL.length)],
            age, foot, overall, potential, salary, value, cost,
            matches: 0, form: 65 + Math.floor(Math.random()*15),
            isInjured: false, weeksOut: 0, club: 'Libre',
            contractType: 'free_agent', contractYears: 0, releaseClause: 0,
            ...attrs
        };
    }

    function numCandidates(scoutLevel) {
        if (scoutLevel === 0) return 1;
        if (scoutLevel <= 2) return 1 + Math.floor(Math.random() * 2); // 1-2
        if (scoutLevel <= 4) return 2 + Math.floor(Math.random() * 2); // 2-3
        return 3 + Math.floor(Math.random() * 2);                       // 3-4
    }

    // ─────────────────────────────────────────────────────────────
    // 2.  ESTADO DE BÚSQUEDA (guardado en gameState)
    // ─────────────────────────────────────────────────────────────
    // gameState.scoutSearch = { active, position, weeksLeft, scoutLevel }
    // gameState.scoutResults = [ ...prospects ]  (cuando llegan)

    function getSearch() {
        const s = gs();
        return s?.scoutSearch || null;
    }

    function saveSearch(data) {
        gl()?.updateGameState?.({ scoutSearch: data });
    }

    function saveResults(data) {
        gl()?.updateGameState?.({ scoutResults: data });
    }

    // ─────────────────────────────────────────────────────────────
    // 3.  MODAL DE BÚSQUEDA
    // ─────────────────────────────────────────────────────────────
    function buildScoutModal() {
        if (document.getElementById('scoutSearchModal')) return;

        const modal = document.createElement('div');
        modal.id = 'scoutSearchModal';
        modal.style.cssText = `
            display:none;position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,.85);z-index:99999;
            align-items:center;justify-content:center;`;
        modal.innerHTML = `
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;
                    padding:28px 24px;max-width:480px;width:92%;color:#fff;
                    box-shadow:0 20px 60px rgba(0,0,0,.8);position:relative;">
            <button onclick="window.closeScoutModal()"
                style="position:absolute;top:12px;right:14px;background:rgba(255,255,255,.1);
                       border:none;color:#fff;width:32px;height:32px;border-radius:50%;
                       cursor:pointer;font-size:16px;">✖</button>

            <h2 style="margin:0 0 6px;color:#FFD700;">🔍 Búsqueda de Promesas</h2>
            <p id="scoutModalDesc" style="color:#888;font-size:.85em;margin:0 0 20px;"></p>

            <div id="scoutSearchActive" style="display:none;">
                <div style="background:rgba(255,165,0,.1);border:1px solid rgba(255,165,0,.3);
                            border-radius:10px;padding:16px;text-align:center;">
                    <div style="font-size:2em;margin-bottom:8px;">⏳</div>
                    <div id="scoutActiveText" style="color:#FFD700;font-size:.95em;"></div>
                </div>
            </div>

            <div id="scoutSearchForm">
                <label style="color:#aaa;font-size:.82em;display:block;margin-bottom:6px;">
                    Posición buscada
                </label>
                <select id="scoutPositionSelect"
                    style="width:100%;background:#0d1117;color:#fff;border:1px solid #333;
                           border-radius:8px;padding:10px;font-size:.95em;margin-bottom:18px;">
                    <option value="">Cualquier posición</option>
                    ${POSITIONS_ALL.map(p => `<option value="${p}">${p}</option>`).join('')}
                </select>

                <div id="scoutLevelInfo" style="background:rgba(255,255,255,.05);border-radius:10px;
                     padding:12px 14px;margin-bottom:18px;font-size:.82em;color:#888;"></div>

                <button id="scoutStartBtn" onclick="window.startScoutSearch()"
                    style="width:100%;padding:13px;background:linear-gradient(135deg,#4CAF50,#66BB6A);
                           border:none;border-radius:10px;color:#fff;font-size:1em;font-weight:bold;
                           cursor:pointer;">🔍 Iniciar búsqueda</button>
            </div>

            <div id="scoutResultsSection" style="display:none;">
                <div style="color:#4CAF50;font-weight:bold;margin-bottom:14px;">✅ Resultados encontrados</div>
                <div id="scoutResultsList"></div>
                <div style="display:flex;gap:10px;margin-top:14px;">
                    <button onclick="window.newScoutSearch()"
                        style="flex:1;padding:11px;background:rgba(255,165,0,.15);
                               border:1px solid rgba(255,165,0,.5);border-radius:8px;color:#FFA726;
                               cursor:pointer;font-size:.9em;font-weight:bold;">🔄 Nueva Búsqueda</button>
                    <button onclick="window.closeScoutModal()"
                        style="flex:1;padding:11px;background:rgba(255,255,255,.07);
                               border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;
                               cursor:pointer;font-size:.9em;">Cerrar</button>
                </div>
            </div>
        </div>`;
        // Salir siempre es posible: tocando fuera del panel o con Escape (el panel puede ser más alto que la ventana)
        modal.addEventListener('click', e => { if (e.target === modal) window.closeScoutModal(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display !== 'none') window.closeScoutModal(); });
        document.body.appendChild(modal);
    }

    window.closeScoutModal = function() {
        const m = document.getElementById('scoutSearchModal');
        if (m) m.style.display = 'none';
    };

    window.newScoutSearch = function() {
        // Limpiar resultados del estado para poder iniciar nueva búsqueda
        gl()?.updateGameState?.({ scoutResults: null, scoutSearch: null });
        refreshAcademyBadge();

        // Volver al formulario dentro del modal (sin cerrarlo)
        const form   = document.getElementById('scoutSearchForm');
        const active = document.getElementById('scoutSearchActive');
        const resSec = document.getElementById('scoutResultsSection');
        if (form)   form.style.display   = 'block';
        if (active) active.style.display = 'none';
        if (resSec) resSec.style.display = 'none';
    };

    window.openScoutModal = function() {
        buildScoutModal();
        const s = gs();
        const scoutLevel = s?.staff?.scout?.level || 0;
        const search     = s?.scoutSearch;
        const results    = s?.scoutResults;

        const modal   = document.getElementById('scoutSearchModal');
        const form    = document.getElementById('scoutSearchForm');
        const active  = document.getElementById('scoutSearchActive');
        const resSec  = document.getElementById('scoutResultsSection');
        const desc    = document.getElementById('scoutModalDesc');
        const lvlInfo = document.getElementById('scoutLevelInfo');

        // Reset visibilidad
        form.style.display   = 'block';
        active.style.display = 'none';
        resSec.style.display = 'none';

        if (!scoutLevel) {
            desc.textContent = '⚠️ Sin ojeador contratado. Los resultados serán muy limitados.';
            lvlInfo.innerHTML = '🔍 Sin ojeador: 1 candidato de baja calidad.';
        } else {
            desc.textContent = `Ojeador nivel ${scoutLevel} disponible.`;
            const candMin = scoutLevel <= 2 ? 1 : scoutLevel <= 4 ? 2 : 3;
            const candMax = scoutLevel <= 2 ? 2 : scoutLevel <= 4 ? 3 : 4;
            const potMax  = 70 + scoutLevel * 5;
            lvlInfo.innerHTML = `
                <b style="color:#FFD700;">Nivel ${scoutLevel}:</b>
                ${candMin}-${candMax} candidatos · Potencial máximo ~${potMax}
                ${scoutLevel >= 4 ? ' · Posibilidad de talentos excepcionales' : ''}`;
        }

        // Búsqueda activa
        if (search?.active) {
            form.style.display   = 'none';
            active.style.display = 'block';
            document.getElementById('scoutActiveText').textContent =
                `Búsqueda en curso (posición: ${search.position || 'cualquiera'}) — quedan ~${search.weeksLeft} semana${search.weeksLeft !== 1 ? 's' : ''}`;
        }

        // Resultados pendientes de ver
        if (results?.length && !search?.active) {
            form.style.display   = 'none';
            resSec.style.display = 'block';
            renderScoutResults(results, scoutLevel);
        }

        modal.style.display = 'flex';
    };

    function renderScoutResults(results, scoutLevel) {
        const list = document.getElementById('scoutResultsList');
        if (!list) return;
        list.innerHTML = results.map(p => {
            const encoded = encodeURIComponent(JSON.stringify(p));
            const potColor = p.potential >= 90 ? '#FFD700' : p.potential >= 80 ? '#4CAF50' : '#aaa';
            return `
            <div style="background:rgba(255,255,255,.05);border-radius:10px;padding:14px;margin-bottom:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <div>
                        <div style="font-weight:bold;color:#fff;">${p.name}</div>
                        <div style="font-size:.8em;color:#888;margin-top:2px;">
                            ${p.position} · ${p.age} años · ${p.foot}
                        </div>
                    </div>
                    <div style="display:flex;gap:12px;text-align:center;">
                        <div>
                            <div style="color:#aaa;font-size:.7em;">OVR</div>
                            <div style="font-weight:bold;font-size:1.1em;">${p.overall}</div>
                        </div>
                        <div>
                            <div style="color:#aaa;font-size:.7em;">POT</div>
                            <div style="font-weight:bold;font-size:1.1em;color:${potColor};">${p.potential}</div>
                        </div>
                        <div>
                            <div style="color:#aaa;font-size:.7em;">Coste</div>
                            <div style="font-size:.85em;">${p.cost.toLocaleString('es-ES')}€</div>
                        </div>
                    </div>
                </div>
                <button onclick="window.fichProspect('${encoded}')"
                    style="width:100%;margin-top:10px;padding:9px;
                           background:linear-gradient(135deg,#2196F3,#42A5F5);
                           border:none;border-radius:8px;color:#fff;font-weight:bold;
                           cursor:pointer;font-size:.88em;">
                    ✍️ Contratar (${p.cost.toLocaleString('es-ES')}€)
                </button>
            </div>`;
        }).join('');
    }

    window.startScoutSearch = function() {
        const s = gs();
        if (!s) return;

        const position   = document.getElementById('scoutPositionSelect')?.value || '';
        const scoutLevel = s.staff?.scout?.level || 0;
        const weeks      = 1 + Math.floor(Math.random() * 5); // 1-5 semanas

        saveSearch({ active: true, position, weeksLeft: weeks, scoutLevel });
        saveResults(null); // limpiar resultados anteriores

        const posLabel = position || 'cualquier posición';
        addN(`[Ojeador] 🔍 Búsqueda de promesas iniciada (${posLabel}). Resultados en ~${weeks} semana${weeks>1?'s':''}.`, 'info');

        window.closeScoutModal();

        // Refrescar UI
        if (window.openPage && document.getElementById('academy')?.classList.contains('active')) {
            window.openPage('academy');
        }
    };

    window.fichProspect = async function(encoded) {
        const prospect = JSON.parse(decodeURIComponent(encoded));
        const s = gs();
        if (!s) return;

        if (s.balance < prospect.cost) {
            showToast(`❌ No tienes suficiente dinero (necesitas ${prospect.cost.toLocaleString('es-ES')}€)`, 'error');
            return;
        }

        if (await window.pcfConfirmText(`¿Contratar a ${prospect.name} (OVR ${prospect.overall} / POT ${prospect.potential}) por ${prospect.cost.toLocaleString('es-ES')}€?`)) {
            gl().updateGameState({ balance: s.balance - prospect.cost });
            const state = gs();
            const newAcademy = [...(state.academy || []), { ...prospect, club: state.team }];
            gl().updateGameState({ academy: newAcademy });

            // Limpiar resultados contratados
            const remaining = (gs().scoutResults || []).filter(p => p.name !== prospect.name);
            saveResults(remaining.length ? remaining : null);

            addN(`[Cantera] ✅ ${prospect.name} (${prospect.position}, OVR ${prospect.overall} / POT ${prospect.potential}) se une a la cantera por ${prospect.cost.toLocaleString('es-ES')}€.`, 'success');
            window.closeScoutModal();

            if (window.gameLogic?.refreshUI) window.gameLogic.refreshUI(gs());
            else if (typeof ui !== 'undefined') ui.refreshUI(gs());
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 4.  HOOK SIMULATE WEEK → procesar búsqueda
    // ─────────────────────────────────────────────────────────────
    function hookSimulateWeek() {
        if (typeof window.simulateWeek !== 'function') {
            setTimeout(hookSimulateWeek, 400); return;
        }
        if (window._scoutWeekHooked) return;
        window._scoutWeekHooked = true;

        const orig = window.simulateWeek;
        window.simulateWeek = async function(...args) {
            const result = await orig.apply(this, args);
            processScoutWeek();
            processAnalistaWeek();
            return result;
        };
        console.log('[ScoutAnalista] hook simulateWeek ✓');
    }

    function processScoutWeek() {
        const s = gs();
        if (!s?.scoutSearch?.active) return;

        const search = s.scoutSearch;
        search.weeksLeft--;

        if (search.weeksLeft <= 1 && search.weeksLeft > 0) {
            addN(`[Ojeador] ⏳ Búsqueda en progreso... Noticias en ${search.weeksLeft} semana.`, 'info');
        }

        if (search.weeksLeft <= 0) {
            // ¡Resultados!
            const num       = numCandidates(search.scoutLevel);
            const prospects = Array.from({ length: num }, () =>
                generateProspect(search.position || null, search.scoutLevel)
            );

            saveResults(prospects);
            saveSearch({ ...search, active: false });

            const names = prospects.map(p => `${p.name} (${p.position}, OVR ${p.overall}/POT ${p.potential})`).join(' · ');
            addN(`[Ojeador] ✅ ¡Búsqueda completada! ${num} candidato${num>1?'s':''} encontrado${num>1?'s':''}: ${names}. Consulta Cantera para ver los perfiles.`, 'success');
        } else {
            // Actualizar weeksLeft
            saveSearch(search);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 5.  ANALISTA DE VÍDEO — informe semanal del rival
    // ─────────────────────────────────────────────────────────────
    function processAnalistaWeek() {
        const s = gs();
        if (!s?.staff?.analista) return;

        const level = s.staff.analista.level;

        // Obtener próximo rival del calendario
        const calendar = s.seasonCalendar || [];
        const nextMatch = calendar.find(m =>
            (m.home === s.team || m.away === s.team) &&
            m.homeGoals === null && m.week >= s.week
        );
        if (!nextMatch) return;

        const rival     = nextMatch.home === s.team ? nextMatch.away : nextMatch.home;
        const isHome    = nextMatch.home === s.team;
        const standings = s.standings?.[rival];

        // Datos del rival
        const rivalPts = standings?.pts || 0;
        const rivalPos = standings ? (window.sortStandings ? window.sortStandings(s.standings) : Object.entries(s.standings)
            .sort((a,b) => (b[1].pts||0)-(a[1].pts||0)))
            .findIndex(([t]) => t === rival) + 1 : '?';
        const rivalGF  = standings?.gf || 0;
        const rivalGC  = standings?.gc || 0;
        const rivalPJ  = standings?.pj || 1;
        const rivalGPP = rivalPJ > 0 ? (rivalGF / rivalPJ).toFixed(1) : '?';
        const rivalGCP = rivalPJ > 0 ? (rivalGC / rivalPJ).toFixed(1) : '?';

        let report = '';

        if (level === 1) {
            // Nivel básico: solo datos públicos
            const msgs = [
                `${rival} ocupa la posición ${rivalPos}ª con ${rivalPts} puntos. ${isHome ? 'Jugamos en casa.' : 'Jugamos fuera.'}`,
                `Próximo rival: ${rival} (${rivalPos}º, ${rivalPts} pts). Su historial muestra ${standings?.g||0}V-${standings?.e||0}E-${standings?.p||0}D.`,
                `El ${rival} lleva ${standings?.pj||0} partidos jugados. Habrá que estar atentos.`
            ];
            report = msgs[Math.floor(Math.random()*msgs.length)];

        } else if (level === 2) {
            // Nivel 2: datos ofensivos/defensivos básicos
            const isAttacking = rivalGF / Math.max(1, rivalPJ) > 1.5;
            const isSolid     = rivalGC / Math.max(1, rivalPJ) < 1;
            report = `${rival} (${rivalPos}º, ${rivalPts} pts) promedia ${rivalGPP} goles a favor y ${rivalGCP} en contra por partido.`;
            if (isAttacking) report += ` Son un equipo muy ofensivo — ojo a su ataque.`;
            if (isSolid)     report += ` Tienen una defensa sólida, costará marcarles.`;

        } else if (level === 3) {
            // Nivel 3: análisis más concreto
            const isAttacking = parseFloat(rivalGPP) > 1.5;
            const isSolid     = parseFloat(rivalGCP) < 1.0;
            const isWeak      = parseFloat(rivalGCP) > 1.8;
            const strength    = isAttacking ? 'ataque peligroso' : isSolid ? 'defensa compacta' : 'juego equilibrado';
            const weakness    = isWeak ? 'defensa permeable' : isAttacking && !isSolid ? 'posibles espacios defensivos' : 'dificultad para concretar';
            report = `Informe sobre ${rival} (${rivalPos}º): Fortaleza principal → ${strength}. Punto débil → ${weakness}. ${isHome ? 'El factor local puede ser clave.' : 'Fuera de casa necesitamos ser sólidos atrás.'}`;

        } else if (level === 4) {
            // Nivel 4: consejo táctico general
            const isAttacking = parseFloat(rivalGPP) > 1.5;
            const isSolid     = parseFloat(rivalGCP) < 1.0;
            const isWeak      = parseFloat(rivalGCP) > 1.8;
            let advice = '';
            if (isWeak)           advice = 'Recomiendo mentalidad ofensiva para explotar su defensa.';
            else if (isSolid)     advice = 'Sugiero ser pacientes con la pelota. Mentalidad equilibrada o defensiva.';
            else if (isAttacking) advice = 'Cuidado con su ataque. Considerar reforzar el centro del campo.';
            else                  advice = 'Partido equilibrado. Nuestra calidad debe ser suficiente.';
            report = `📋 Informe táctico sobre ${rival} (${rivalPos}º, ${rivalPts}pts) — Marca ${rivalGPP} goles y encaja ${rivalGCP} por partido. ${advice}`;

        } else {
            // Nivel 5: consejo muy específico
            const isAttacking = parseFloat(rivalGPP) > 1.5;
            const isSolid     = parseFloat(rivalGCP) < 1.0;
            const isWeak      = parseFloat(rivalGCP) > 1.8;
            const isHome2     = isHome;
            let formation = '4-4-2', mentality = 'balanced';

            if (isWeak && isHome2)       { formation = '4-3-3'; mentality = 'ofensiva'; }
            else if (isSolid && !isHome2){ formation = '5-4-1'; mentality = 'defensiva'; }
            else if (isAttacking)        { formation = '4-5-1'; mentality = 'equilibrada'; }
            else if (isHome2)            { formation = '4-3-3'; mentality = 'equilibrada'; }

            report = `🎯 Análisis completo ${rival} (${rivalPos}º): ${rivalGPP} goles/partido y ${rivalGCP} encajados. `
                   + `RECOMENDACIÓN: formación ${formation} con mentalidad ${mentality}. `
                   + (isWeak ? 'Su defensa tiene carencias estructurales que podemos explotar con amplitud.' :
                      isSolid ? 'Bloque defensivo fuerte. Buscar el gol en transiciones rápidas.' :
                      'Partido disputado. Controlar el centro del campo será decisivo.');
        }

        if (report) {
            // Un informe por partido: en semanas de copa la liga no avanza y no se repite
            const key = `${s.currentSeason}|${nextMatch.week}|${rival}`;
            if (s.analystLastReport === key) return;
            window.gameLogic?.updateGameState?.({ analystLastReport: key });
            addN(`[Analista · Niv.${level}] 📋 Próximo partido — Jornada ${nextMatch.week} ${isHome ? 'en casa' : 'fuera'} contra ${rival}. ${report}`, level >= 4 ? 'success' : 'info');
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 6.  INTERCEPTAR BOTÓN CANTERA
    // ─────────────────────────────────────────────────────────────
    function hookAcademyButton() {
        // El botón llama a window.openModal('signYoungster')
        // Lo reemplazamos globalmente
        const origOpenModal = window.openModal;
        if (!origOpenModal) { setTimeout(hookAcademyButton, 300); return; }
        if (window._scoutModalHooked) return;
        window._scoutModalHooked = true;

        window.openModal = function(modalName, ...args) {
            if (modalName === 'signYoungster') {
                window.openScoutModal();
                return;
            }
            return origOpenModal.call(this, modalName, ...args);
        };
        console.log('[ScoutAnalista] openModal hook ✓');
    }

    // ─────────────────────────────────────────────────────────────
    // 7.  BADGE DE RESULTADOS EN EL BOTÓN CANTERA
    // ─────────────────────────────────────────────────────────────
    function refreshAcademyBadge() {
        const s = gs();
        const btn = document.querySelector('button[onclick*="signYoungster"], button[onclick*="openScoutModal"]');
        if (!btn) return;

        const hasSearch  = s?.scoutSearch?.active;
        const hasResults = s?.scoutResults?.length;

        let badge = '';
        if (hasResults) badge = `<span style="margin-left:6px;background:#4CAF50;color:#000;border-radius:10px;padding:1px 7px;font-size:.75em;font-weight:bold;">✅ ${s.scoutResults.length}</span>`;
        else if (hasSearch) badge = `<span style="margin-left:6px;background:#FF9800;color:#000;border-radius:10px;padding:1px 7px;font-size:.75em;font-weight:bold;">⏳</span>`;

        // Texto base + badge
        const baseText = '🔍 Buscar Promesas';
        if (!btn.dataset.scoutPatched) {
            btn.dataset.scoutPatched = '1';
            btn.textContent = '';
        }
        btn.innerHTML = baseText + badge;
    }

    // ─────────────────────────────────────────────────────────────
    // 8. TOAST HELPER
    // ─────────────────────────────────────────────────────────────
    function showToast(msg, type = 'info') {
        const t = document.createElement('div');
        const bg = type === 'error' ? '#f44336' : '#4CAF50';
        t.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
            background:${bg};color:#fff;padding:12px 20px;border-radius:10px;
            z-index:999999;font-size:.9em;box-shadow:0 4px 20px rgba(0,0,0,.5);
            animation:fadeIn .3s ease;pointer-events:none;`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }

    // ─────────────────────────────────────────────────────────────
    // 9.  HOOK openPage('academy') para refrescar badge
    // ─────────────────────────────────────────────────────────────
    function hookOpenPage() {
        if (!window.openPage) { setTimeout(hookOpenPage, 300); return; }
        if (window._scoutPageHooked) return;
        window._scoutPageHooked = true;

        const orig = window.openPage;
        window.openPage = function(pageId, ...args) {
            const r = orig.call(this, pageId, ...args);
            if (pageId === 'academy') setTimeout(refreshAcademyBadge, 100);
            return r;
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 10. INIT
    // ─────────────────────────────────────────────────────────────
    function init() {
        if (!window.gameLogic || !window.openModal || !window.simulateWeek) {
            setTimeout(init, 400); return;
        }
        buildScoutModal();
        hookAcademyButton();
        hookSimulateWeek();
        hookOpenPage();
        setTimeout(refreshAcademyBadge, 800);
        console.log('[ScoutAnalista] ✅ v1.0 listo');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : setTimeout(init, 300);

})();
