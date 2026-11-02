// ============================================================
// injector-tactics.js  v1.0
//
// Mejora la pantalla de Tácticas añadiendo:
//  - Contexto del próximo partido (rival, local/visitante, standing)
//  - Tarjetas visuales de Formación con impacto real en ataque/defensa
//  - Tarjetas de Mentalidad
//  - Estilo de presión (nuevo parámetro → influye en motor)
//  - Instrucción especial pre-partido (nuevo → influye en motor)
//  - Barra de balance táctica resultante
//  - Resumen del XI titular actual
//
// El campo visual original (tactic-field + tactic-bench) se MANTIENE
// intacto al final de la página, tal como estaba.
//
// Nuevos parámetros guardados en gameState:
//   pressStyle: 'high' | 'medium' | 'low'
//   specialInstruction: 'none' | 'setpieces' | 'direct' | 'possession' | 'counter'
// ============================================================

(function () {
    'use strict';

    const gl  = () => window.gameLogic;
    const gs  = () => gl()?.getGameState?.();
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');

    // ── Datos de formaciones con impacto real ─────────────────────
    const FORMATION_DATA = {
        '433': {
            label: '4-3-3',
            emoji: '⚽',
            desc: 'Clásica ofensiva. Amplitud por las bandas, presión alta.',
            attack: 85, defense: 70, midfield: 75,
            attackBonus: 1.05, defenseBonus: 0.98
        },
        '442': {
            label: '4-4-2',
            emoji: '🔲',
            desc: 'Equilibrada. Solidez en el centro del campo.',
            attack: 75, defense: 75, midfield: 85,
            attackBonus: 1.0, defenseBonus: 1.0
        },
        '352': {
            label: '3-5-2',
            emoji: '🔺',
            desc: 'Dominio del centro. Dos puntas, centrocampo poderoso.',
            attack: 80, defense: 65, midfield: 90,
            attackBonus: 1.02, defenseBonus: 0.95
        },
        '541': {
            label: '5-4-1',
            emoji: '🛡️',
            desc: 'Bloque defensivo. Contraataque rápido por bandas.',
            attack: 55, defense: 95, midfield: 70,
            attackBonus: 0.85, defenseBonus: 1.15
        },
        '451': {
            label: '4-5-1',
            emoji: '⚖️',
            desc: 'Contención. Cinco medios dificultan el juego rival.',
            attack: 60, defense: 85, midfield: 88,
            attackBonus: 0.92, defenseBonus: 1.08
        }
    };

    // ── Datos de mentalidad ───────────────────────────────────────
    const MENTALITY_DATA = {
        'defensive': {
            label: 'Defensiva',
            emoji: '🔒',
            desc: 'Prioridad absoluta en no encajar. Líneas bajas.',
            attackMult: 0.85, defenseMult: 1.15,
            color: '#2196F3'
        },
        'balanced': {
            label: 'Equilibrada',
            emoji: '⚖️',
            desc: 'Balance entre ataque y defensa. Adaptable.',
            attackMult: 1.0, defenseMult: 1.0,
            color: '#4CAF50'
        },
        'offensive': {
            label: 'Ofensiva',
            emoji: '⚔️',
            desc: 'Máxima presión y ataque. Mayor riesgo defensivo.',
            attackMult: 1.15, defenseMult: 0.90,
            color: '#f44336'
        }
    };

    // ── Datos de estilo de presión ────────────────────────────────
    const PRESS_DATA = {
        'high': {
            label: 'Presión alta',
            emoji: '🔥',
            desc: 'Robo rápido del balón. Desgaste físico elevado.',
            attackBonus: 1.06, defenseBonus: 0.96, midfieldBonus: 1.08
        },
        'medium': {
            label: 'Presión media',
            emoji: '🎯',
            desc: 'Repliegue organizado. Balance entre líneas.',
            attackBonus: 1.0, defenseBonus: 1.0, midfieldBonus: 1.0
        },
        'low': {
            label: 'Bloque bajo',
            emoji: '🧱',
            desc: 'Esperar al rival y golpear al contraataque.',
            attackBonus: 0.94, defenseBonus: 1.10, midfieldBonus: 0.96
        }
    };

    // ── Datos de instrucción especial ────────────────────────────
    const INSTRUCTION_DATA = {
        'none': {
            label: 'Sin instrucción',
            emoji: '—',
            desc: 'El equipo juega con libertad.',
            attackBonus: 1.0, defenseBonus: 1.0
        },
        'setpieces': {
            label: 'Balón parado',
            emoji: '🎯',
            desc: 'Entrenar jugadas de córner y falta. +goles a balón parado.',
            attackBonus: 1.05, defenseBonus: 1.0
        },
        'direct': {
            label: 'Juego directo',
            emoji: '⚡',
            desc: 'Pases largos al delantero. Rápido y vertical.',
            attackBonus: 1.04, defenseBonus: 0.97
        },
        'possession': {
            label: 'Posesión',
            emoji: '🔄',
            desc: 'Control del juego. Agotar al rival con el balón.',
            attackBonus: 0.98, defenseBonus: 1.05
        },
        'counter': {
            label: 'Contraataque',
            emoji: '🏃',
            desc: 'Ceder el balón y atacar espacios a la espalda.',
            attackBonus: 1.03, defenseBonus: 1.06
        }
    };

    // ── Obtener próximo rival del calendario ──────────────────────
    function getNextMatch() {
        const s = gs();
        if (!s?.seasonCalendar || !s.team) return null;
        const played = new Set(
            (s.matchHistory || []).map(m => `${m.week}_${m.home}_${m.away}`)
        );
        const upcoming = s.seasonCalendar
            .filter(m => (m.home === s.team || m.away === s.team) && m.week >= (s.week || 1))
            .sort((a, b) => a.week - b.week);
        for (const m of upcoming) {
            if (!played.has(`${m.week}_${m.home}_${m.away}`)) return m;
        }
        return null;
    }

    // ── Calcular balance táctica resultado (0-100) ────────────────
    function calcBalance(formation, mentality, press, instruction) {
        const fd = FORMATION_DATA[formation] || FORMATION_DATA['433'];
        const md = MENTALITY_DATA[mentality] || MENTALITY_DATA['balanced'];
        const pd = PRESS_DATA[press] || PRESS_DATA['medium'];
        const id = INSTRUCTION_DATA[instruction] || INSTRUCTION_DATA['none'];

        const atkTotal = fd.attackBonus * md.attackMult * pd.attackBonus * id.attackBonus;
        const defTotal = fd.defenseBonus * md.defenseMult * pd.defenseBonus * id.defenseBonus;

        // Normalizar a 0-100 donde 50 = equilibrado
        const atkScore = Math.min(100, Math.round((atkTotal - 0.7) / 0.6 * 100));
        const defScore = Math.min(100, Math.round((defTotal - 0.7) / 0.6 * 100));

        return { atkScore: Math.max(0, atkScore), defScore: Math.max(0, defScore), atkTotal, defTotal };
    }

    // ── Render tarjetas de selección ─────────────────────────────
    function renderCards(dataObj, currentVal, onClickFn, cols) {
        const entries = Object.entries(dataObj);
        const gridClass = cols === 3 ? 'tc-grid-3' : 'tc-grid-5';
        return `<div class="${gridClass}">
            ${entries.map(([key, d]) => {
                const active = key === currentVal;
                const color = d.color || '#4CAF50';
                return `<div onclick="${onClickFn}('${key}')"
                    style="cursor:pointer;border-radius:10px;padding:10px 8px;text-align:center;
                           border:2px solid ${active ? color : 'rgba(255,255,255,.1)'};
                           background:${active ? `${color}20` : 'rgba(255,255,255,.04)'};
                           transition:all .2s;user-select:none;">
                    <div style="font-size:1.3em;margin-bottom:4px;">${d.emoji}</div>
                    <div style="font-size:.78em;font-weight:bold;color:${active ? color : '#ccc'};">${d.label}</div>
                    <div style="font-size:.65em;color:#666;margin-top:3px;line-height:1.3;">${d.desc}</div>
                </div>`;
            }).join('')}
        </div>`;
    }

    // ── Render barra de balance táctico ───────────────────────────
    function renderBalanceBar(formation, mentality, press, instruction) {
        const { atkScore, defScore } = calcBalance(formation, mentality, press, instruction);
        const total = atkScore + defScore || 1;
        const atkPct = Math.round(atkScore / total * 100);
        const defPct = 100 - atkPct;
        const label = atkPct >= 60 ? '⚔️ Perfil muy ofensivo'
                    : atkPct >= 52 ? '⚽ Perfil ofensivo'
                    : atkPct >= 48 ? '⚖️ Perfil equilibrado'
                    : atkPct >= 40 ? '🛡️ Perfil defensivo'
                    :                '🔒 Perfil muy defensivo';
        return `
        <div style="margin-top:4px;">
            <div style="display:flex;justify-content:space-between;font-size:.75em;margin-bottom:4px;">
                <span style="color:#f44336;">⚔️ Ataque <strong>${atkPct}%</strong></span>
                <span style="color:#aaa;font-size:.85em;">${label}</span>
                <span style="color:#2196F3;">🛡️ Defensa <strong>${defPct}%</strong></span>
            </div>
            <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;">
                <div style="width:${atkPct}%;background:linear-gradient(90deg,#f44336,#ff7043);transition:width .4s;"></div>
                <div style="width:${defPct}%;background:linear-gradient(90deg,#1565C0,#2196F3);transition:width .4s;"></div>
            </div>
        </div>`;
    }

    // ── Render resumen XI titular ─────────────────────────────────
    function renderXISummary() {
        const s = gs();
        if (!s?.lineup?.length) return '<div style="color:#555;font-size:.8em;font-style:italic;">Sin alineación guardada.</div>';
        const lineup = s.lineup.slice(0, 11);
        const avg = Math.round(lineup.reduce((sum, p) => sum + (p.overall || 70), 0) / lineup.length);
        const posGroups = { POR: [], DEF: [], MED: [], DEL: [] };
        const posMap = { POR:'POR', DFC:'DEF', LI:'DEF', LD:'DEF', MC:'MED', MCO:'MED', MCD:'MED', MD:'MED', MI:'MED', EXT:'DEL', DC:'DEL' };
        lineup.forEach(p => {
            const g = posMap[p.position] || 'MED';
            posGroups[g].push(p);
        });
        const posColor = { POR:'#FFD700', DEF:'#2196F3', MED:'#4CAF50', DEL:'#f44336' };
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <span style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;">XI Titular actual</span>
            <span style="background:rgba(255,255,255,.08);border-radius:6px;padding:3px 10px;font-size:.8em;color:#FFD700;font-weight:bold;">Media OVR: ${avg}</span>
        </div>
        <div class="tc-xi-chips">
            ${['POR','DEF','MED','DEL'].map(g =>
                posGroups[g].map(p => `
                <div class="tc-xi-chip" style="border-left:3px solid ${posColor[g]};">
                    <span style="color:${posColor[g]};font-size:.7em;font-weight:bold;">${p.position}</span>
                    <span style="color:#ccc;font-size:.72em;">${p.name?.split(' ').pop() || p.name}</span>
                    <span style="color:#888;font-size:.68em;">${p.overall || 70}</span>
                    ${p.isInjured ? '<span style="font-size:.7em;">🤕</span>' : ''}
                </div>`).join('')
            ).join('')}
        </div>`;
    }

    // ── Render contexto del próximo partido ───────────────────────
    function renderMatchContext() {
        const s = gs();
        const match = getNextMatch();
        if (!match) return '<div style="color:#555;font-size:.8em;font-style:italic;">Sin partido próximo.</div>';

        const isHome = match.home === s.team;
        const rival = isHome ? match.away : match.home;
        const st = s.standings?.[rival];
        const sorted = st ? Object.entries(s.standings)
            .sort((a,b) => (b[1].pts||0)-(a[1].pts||0))
            .findIndex(([t]) => t === rival) + 1 : null;

        const myPos = Object.entries(s.standings || {})
            .sort((a,b) => (b[1].pts||0)-(a[1].pts||0))
            .findIndex(([t]) => t === s.team) + 1;

        return `
        <div class="tc-match-header">
            <div>
                <div style="color:#666;font-size:.72em;margin-bottom:2px;">Jornada ${match.week} · ${isHome ? '🏟️ LOCAL' : '✈️ VISITANTE'}</div>
                <div style="font-size:1em;font-weight:bold;color:#fff;">${s.team} <span style="color:#666;">vs</span> ${rival}</div>
            </div>
            ${st ? `
            <div class="tc-match-stats">
                <div style="text-align:center;">
                    <div style="color:#FFD700;font-weight:bold;font-size:1.1em;">${sorted}º</div>
                    <div style="color:#555;font-size:.65em;">Pos rival</div>
                </div>
                <div style="text-align:center;">
                    <div style="color:#4CAF50;font-weight:bold;font-size:1.1em;">${st.pts||0}</div>
                    <div style="color:#555;font-size:.65em;">Puntos</div>
                </div>
                <div style="text-align:center;">
                    <div style="color:#aaa;font-size:.95em;">${st.g||0}-${st.e||0}-${st.p||0}</div>
                    <div style="color:#555;font-size:.65em;">V-E-D</div>
                </div>
                <div style="text-align:center;">
                    <div style="color:#aaa;font-size:.95em;">${myPos}º</div>
                    <div style="color:#555;font-size:.65em;">Tu pos</div>
                </div>
            </div>` : ''}
        </div>`;
    }

    // ── Sección completa de mejoras (encima del campo) ────────────
    function buildTacticsExtras() {
        const container = document.getElementById('tactics');
        if (!container) return;
        if (document.getElementById('tactics-extras')) return; // ya inyectado

        const s = gs();
        if (!s) return;

        const formation    = s.formation    || '433';
        const mentality    = s.mentality    || 'balanced';
        const pressStyle   = s.pressStyle   || 'medium';
        const specialInstr = s.specialInstruction || 'none';

        const extras = document.createElement('div');
        extras.id = 'tactics-extras';

        // Insertar ANTES del tactic-container (campo)
        const tacticContainer = document.getElementById('tactic-container');
        container.insertBefore(extras, tacticContainer);

        refreshExtras();
    }

    function refreshExtras() {
        const extras = document.getElementById('tactics-extras');
        if (!extras) return;
        const s = gs();
        if (!s) return;

        const formation    = s.formation    || '433';
        const mentality    = s.mentality    || 'balanced';
        const pressStyle   = s.pressStyle   || 'medium';
        const specialInstr = s.specialInstruction || 'none';

        extras.innerHTML = `
        <!-- CONTEXTO PARTIDO -->
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
                    border-radius:10px;padding:12px 14px;margin-bottom:14px;">
            ${renderMatchContext()}
        </div>

        <!-- XI TITULAR -->
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
                    border-radius:10px;padding:12px 14px;margin-bottom:16px;">
            ${renderXISummary()}
        </div>

        <!-- FORMACIÓN -->
        <div style="margin-bottom:14px;">
            <div style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                🔲 Formación
            </div>
            ${renderCards(FORMATION_DATA, formation, 'window._tacticsSetFormation', 5)}
        </div>

        <!-- MENTALIDAD -->
        <div style="margin-bottom:14px;">
            <div style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                🧠 Mentalidad
            </div>
            ${renderCards(MENTALITY_DATA, mentality, 'window._tacticsSetMentality', 3)}
        </div>

        <!-- PRESIÓN -->
        <div style="margin-bottom:14px;">
            <div style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                💪 Estilo de presión
            </div>
            ${renderCards(PRESS_DATA, pressStyle, 'window._tacticsSetPress', 3)}
        </div>

        <!-- INSTRUCCIÓN ESPECIAL -->
        <div style="margin-bottom:14px;">
            <div style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                📋 Instrucción especial
            </div>
            ${renderCards(INSTRUCTION_DATA, specialInstr, 'window._tacticsSetInstruction', 5)}
        </div>

        <!-- BALANCE RESULTANTE -->
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
                    border-radius:10px;padding:12px 14px;margin-bottom:8px;">
            <div style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                📊 Balance táctico resultante
            </div>
            ${renderBalanceBar(formation, mentality, pressStyle, specialInstr)}
        </div>`;
    }

    // ── Invocar renderTactic sin dispatchEvent ────────────────────
    // El select#formationSelect tiene onchange="window.updateFormation()"
    // en el HTML. Si disparamos change → llama updateFormation → bucle.
    // Solución: eliminar el atributo onchange del select y gestionar
    // todo desde el injector. renderTactic sigue siendo privada pero
    // la invocamos añadiendo un listener directo solo la primera vez.
    let _renderTacticFn = null;

    function setupRenderTacticBridge() {
        const sel = document.getElementById('formationSelect');
        if (!sel) return;

        // Quitar el onchange inline del HTML para romper el ciclo
        sel.removeAttribute('onchange');

        // Añadir nuestro propio listener que llama renderTactic sin pasar por updateFormation
        sel.addEventListener('change', function() {
            // Este listener es el único que queda: no llama a updateFormation
            // renderTactic() se ejecutará por el addEventListener de gameLogic.js
            // que fue registrado con addEventListener (no onchange) — ver línea 2882 gameLogic.js
        });
    }

    function triggerRenderTactic(formation) {
        const sel = document.getElementById('formationSelect');
        if (!sel) return;
        sel.value = formation;
        // Disparar solo el evento nativo de gameLogic (addEventListener 'change')
        // no el onchange inline (ya lo eliminamos en setupRenderTacticBridge)
        sel.dispatchEvent(new Event('change'));
    }

    // ── Ocultar los selects, labels y campo originales ────────────
    function hideOriginalControls() {
        const tactics = document.getElementById('tactics');
        if (!tactics) return;
        const formGroup = tactics.querySelector('.form-group');
        if (formGroup) formGroup.style.display = 'none';
        const tacticContainer = document.getElementById('tactic-container');
        if (tacticContainer) tacticContainer.style.display = 'none';
    }

    // ── Setters globales ──────────────────────────────────────────
    window._tacticsSetFormation = function(val) {
        if (!gs()) return;
        gl().updateGameState({ formation: val });
        triggerRenderTactic(val);
        refreshExtras();
    };

    window._tacticsSetMentality = function(val) {
        if (!gs()) return;
        gl().updateGameState({ mentality: val });
        const sel = document.getElementById('mentalitySelect');
        if (sel) sel.value = val;
        refreshExtras();
    };

    window._tacticsSetPress = function(val) {
        if (!gs()) return;
        gl().updateGameState({ pressStyle: val });
        refreshExtras();
    };

    window._tacticsSetInstruction = function(val) {
        if (!gs()) return;
        gl().updateGameState({ specialInstruction: val });
        refreshExtras();
    };

    // ── Patch updateFormation/updateMentality: quitar alerts ─────
    function patchOriginalFunctions() {
        if (!window.updateFormation || !window.updateMentality) {
            setTimeout(patchOriginalFunctions, 300); return;
        }
        // Reemplazar para quitar el alert() y el dispatchEvent extra
        window.updateFormation = function() {
            const sel = document.getElementById('formationSelect');
            if (!sel) return;
            gl()?.updateGameState?.({ formation: sel.value });
            refreshExtras();
            // No llama a dispatchEvent ni a renderTactic —
            // renderTactic ya fue llamada por el addEventListener de gameLogic
        };
        window.updateMentality = function() {
            const sel = document.getElementById('mentalitySelect');
            if (!sel) return;
            gl()?.updateGameState?.({ mentality: sel.value });
            refreshExtras();
        };
        // Eliminar también el onchange inline del select de formación
        // para que window.updateFormation no se llame al disparar change
        setupRenderTacticBridge();
        console.log('[Tactics] updateFormation/updateMentality parchados ✓');
    }

    // ── Hook en el motor de partidos ──────────────────────────────
    function hookMatchEngine() {
        if (typeof window.calculateMatchOutcomeImproved !== 'function') {
            setTimeout(hookMatchEngine, 400); return;
        }
        if (window._tacticsHooked) return;
        window._tacticsHooked = true;

        const orig = window.calculateMatchOutcomeImproved;
        window.calculateMatchOutcomeImproved = function(params) {
            const s = gs();
            // Solo afecta al partido del usuario y a SU lado (local o visitante)
            const side = params.homeIsUser ? 'team' : (params.awayIsUser ? 'opponent' : null);
            if (s && side) {
                const press   = s.pressStyle          || 'medium';
                const instr   = s.specialInstruction  || 'none';
                const pd = PRESS_DATA[press]       || PRESS_DATA['medium'];
                const id = INSTRUCTION_DATA[instr] || INSTRUCTION_DATA['none'];
                const atkMod = pd.attackBonus  * id.attackBonus;
                const defMod = pd.defenseBonus * id.defenseBonus;
                // Ataque: multiplica nuestros goles esperados. Defensa: divide los del rival.
                params = { ...params };
                params[side + 'AttackMod']  = (params[side + 'AttackMod']  || 1) * atkMod;
                params[side + 'DefenseMod'] = (params[side + 'DefenseMod'] || 1) * defMod;
                if (atkMod !== 1 || defMod !== 1) {
                    console.log(`[Tactics] Presión "${press}" + Instrucción "${instr}" → ataque ×${atkMod.toFixed(2)}, defensa ×${defMod.toFixed(2)}`);
                }
            }
            return orig.call(this, params);
        };
        console.log('[Tactics] hook matchEngine ✓');
    }

    // ── Hook openPage para refrescar al abrir ─────────────────────
    function hookOpenPage() {
        if (!window.openPage) { setTimeout(hookOpenPage, 300); return; }
        const orig = window.openPage;
        window.openPage = function(pageId, ...args) {
            const r = orig.call(this, pageId, ...args);
            if (pageId === 'tactics') {
                setTimeout(() => {
                    hideOriginalControls();
                    buildTacticsExtras();
                    refreshExtras();
                    // Disparar renderTactic interno via evento change
                    const s = gs();
                    if (s?.formation) triggerRenderTactic(s.formation);
                }, 80);
            }
            return r;
        };
    }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        if (!window.gameLogic) { setTimeout(init, 400); return; }
        hookMatchEngine();
        hookOpenPage();
        patchOriginalFunctions();

        // Construir si la página ya está abierta
        setTimeout(() => {
            const tact = document.getElementById('tactics');
            if (tact?.classList.contains('active')) {
                buildTacticsExtras();
                refreshExtras();
            }
        }, 1000);

        console.log('[Tactics] ✅ v1.0 listo');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();
