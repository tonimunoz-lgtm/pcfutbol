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
    const gs  = () => gl()?.getViewState?.();
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
            attackBonus: 1.0, defenseBonus: 0.95
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
            emoji: '🛡️',
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
            desc: 'Robo arriba según resistencia; mayor desgaste y espacios a la espalda.',
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
            emoji: '⚽',
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
            desc: 'Depende de la velocidad y de los espacios que deje el rival; reduce el control.',
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
    const pctTxt = v => v === undefined ? '' : Math.abs(v - 1) < 0.005 ? '=' : `${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`;
    function effectLine(d) { return ''; }
    // Escudo junto al nombre del equipo (memoria → catálogo con tope de 1,5 s; solo URL seguras). Sin escudo: iniciales.
    const okImg = u => (typeof u === 'string' && /^(https?:\/\/|data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);base64,|\.?\/?assets\/)/i.test(u.trim())) ? u.trim() : null;
    const initialsOf = t => String(t || '').replace(/^(FC|CF|CA|RCD|UD|SD|CD|RC|Real|Club)\s+/i, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    function crestHTML(team) {
        let logo = null;
        try { const m = window.getCachedTeamData && window.getCachedTeamData(team); if (m && okImg(m.logo)) logo = okImg(m.logo); } catch (e) { /* */ }
        return logo ? `<img class="tc-crest" src="${logo.replace(/"/g, '&quot;')}" alt="">`
            : `<span class="tc-crest tc-crest-i" data-crest-team="${encodeURIComponent(team)}">${initialsOf(team)}</span>`;
    }
    function fillCrests() {
        document.querySelectorAll('#tactics-extras [data-crest-team]').forEach(async el => {
            try {
                const t = decodeURIComponent(el.dataset.crestTeam);
                const d = window.getTeamData && await Promise.race([window.getTeamData(t), new Promise(r => setTimeout(() => r(null), 1500))]);
                const l = d && okImg(d.logo);
                if (l && el.isConnected) { const img = new Image(); img.className = 'tc-crest'; img.alt = ''; img.src = l; el.replaceWith(img); }
            } catch (e) { /* sin escudo */ }
        });
    }
    // Icono de cada formación: un punto por jugador de campo, por líneas (delanteros arriba, defensas abajo)
    function formationDots(key) {
        const lines = String(FORMATION_DATA[key]?.label || '').split('-').map(Number).filter(Boolean).reverse();   // delanteros → defensas
        if (!lines.length) return FORMATION_DATA[key]?.emoji || '';
        const col = ['#ff7a6b', '#b58cff', '#5aa9ff'], H = 8 + (lines.length - 1) * 13 + 8;
        const dots = lines.map((n, r) => Array.from({ length: n }, (_, i) => {
            const x = 32 + (i - (n - 1) / 2) * (n > 4 ? 10.5 : 12.5), y = 8 + r * 13;
            return `<circle cx="${x.toFixed(1)}" cy="${y}" r="3.7" fill="${col[Math.min(r, 2)]}" stroke="#06142e" stroke-width="1"/>`;
        }).join('')).join('');
        return `<svg class="tc-dots" viewBox="0 0 64 ${H}" width="48" height="${Math.round(H * .75)}" aria-hidden="true">${dots}</svg>`;
    }
    const FORMATION_ORDER = ['352', '433', '442', '451', '541'];   // del centro del campo a lo más defensivo, como en el mockup

    function ensureSectionStyles() {
        if (document.getElementById('tcSecStyles')) return;
        const st = document.createElement('style');
        st.id = 'tcSecStyles';
        st.textContent = `
        .tc-sec { margin-bottom:14px; border-radius:6px; padding:10px 12px 12px; border:1px solid rgba(255,255,255,.1);
            border-left:5px solid var(--sec); background:linear-gradient(90deg, color-mix(in srgb, var(--sec) 16%, transparent), rgba(255,255,255,.02) 60%); }
        .tc-sec-label { display:inline-block; color:#06142e; background:var(--sec); font-size:.74em; text-transform:uppercase; letter-spacing:.1em;
            font-weight:800; padding:3px 10px; border-radius:3px; margin-bottom:9px; }
        .tc-sec-formation { --sec:#4fc3f7; } .tc-sec-mentality { --sec:#ba68c8; }
        .tc-sec-press { --sec:#ff8a65; } .tc-sec-instr { --sec:#aed581; }`;
        document.head.appendChild(st);
    }
    function renderCards(dataObj, currentVal, onClickFn, cols, extraFn, iconFn) {
        const entries = Object.entries(dataObj);
        const gridClass = cols === 3 ? 'tc-grid-3' : 'tc-grid-5';
        return `<div class="${gridClass}">
            ${entries.map(([key, d]) => {
                const active = key === currentVal;
                const color = d.color || '#4CAF50';
                return `<div class="tc-card${active ? ' active' : ''}" onclick="${onClickFn}('${key}')"
                    style="cursor:pointer;border-radius:10px;padding:10px 8px;text-align:center;
                           border:2px solid ${active ? color : 'rgba(255,255,255,.1)'};
                           background:${active ? `${color}20` : 'rgba(255,255,255,.04)'};
                           transition:all .2s;user-select:none;">
                    ${active ? '<span class="tc-check" aria-hidden="true"></span>' : ''}
                    <div class="tc-ico" style="font-size:1.3em;margin-bottom:4px;">${iconFn ? iconFn(key, d) : d.emoji}</div>
                    <div class="tc-name" style="font-size:.78em;font-weight:bold;color:${active ? color : '#ccc'};">${d.label}</div>
                    <div class="tc-desc" style="font-size:.68em;color:rgba(230,238,251,.78);margin-top:3px;line-height:1.3;">${d.desc}</div>
                    ${effectLine(d)}
                    ${extraFn ? extraFn(key, d) : ''}
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
        const byName = new Map((s.squad || []).map(p => [p.name, p]));
        const lineup = s.lineup.slice(0, 11).map(p => byName.get(p.name) || p);
        const effective = window.calculateTeamEffectiveOverallImproved
            ? window.calculateTeamEffectiveOverallImproved(lineup.map(p => (p.isInjured || p.isSuspended) ? null : p), s.formation || '433') : null;
        const avg = effective != null ? effective.toFixed(1) : Math.round(lineup.reduce((sum, p) => sum + (p.overall || 70), 0) / lineup.length);
        const bajas = lineup.filter(p => p.isInjured || p.isSuspended);
        const posGroups = { POR: [], DEF: [], MED: [], DEL: [] };
        const posMap = { POR:'POR', DFC:'DEF', LI:'DEF', LD:'DEF', MC:'MED', MCO:'MED', MCD:'MED', MD:'MED', MI:'MED', EXT:'DEL', DC:'DEL' };
        lineup.forEach(p => {
            const g = posMap[p.position] || 'MED';
            posGroups[g].push(p);
        });
        const posColor = { POR:'#FFD700', DEF:'#2196F3', MED:'#4CAF50', DEL:'#f44336' };
        const chips = ['POR','DEF','MED','DEL'].map(g =>
            posGroups[g].map(p => `
                <div class="tc-xi-chip tc-g-${g}" style="border-left:3px solid ${posColor[g]};">
                    <span class="tc-xi-pos" style="color:${posColor[g]};font-size:.7em;font-weight:bold;">${p.position}</span>
                    <span class="tc-xi-name" style="color:#ccc;font-size:.72em;">${p.name?.split(' ').pop() || p.name}</span>
                    <span class="tc-xi-ovr" style="color:#888;font-size:.68em;">${p.overall || 70}</span>
                    ${p.isInjured ? `<img class="pcf-st-icon pcf-st-sm" src="assets/iconos/estados/lesionado.webp" alt="" title="Lesionado" aria-hidden="true">` : ''}
                    ${p.isSuspended ? `<img class="pcf-st-icon pcf-st-sm" src="assets/iconos/estados/sancionado.webp" alt="" title="Sancionado" aria-hidden="true">` : ''}
                </div>`).join('')
        ).join('');
        return `
        <div class="tc-xi" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <span class="tc-xi-title" style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;">XI Titular actual</span>
            <span class="tc-xi-avg" title="Media del once teniendo en cuenta la posición de cada jugador; los no disponibles cuentan como hueco" style="background:rgba(255,255,255,.08);border-radius:6px;padding:3px 10px;font-size:.8em;color:#FFD700;font-weight:bold;cursor:help;">Media efectiva: ${avg}</span>
        </div>
        ${bajas.length ? `<div class="tc-xi-warn" style="color:#ffb3b3;font-size:.78em;margin-bottom:6px;">⚠️ No pueden jugar: ${bajas.map(p => p.name).join(', ')}. Cámbialos en Alineación o pulsa el botón de arriba.</div>` : ''}
        <div class="tc-xi-chips">${chips}</div>`;
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
            <div class="tc-mid">
                <div class="tc-jor" style="color:#666;font-size:.72em;margin-bottom:2px;">Jornada ${match.week} · <span class="tc-loc">${isHome ? '🏟️ LOCAL' : '✈️ VISITANTE'}</span></div>
                <div class="tc-teams" style="font-size:1em;font-weight:bold;color:#fff;"><span class="tc-team">${crestHTML(s.team)}<b>${s.team}</b></span> <span class="tc-vs" style="color:#666;">vs</span> <span class="tc-team">${crestHTML(rival)}<b>${rival}</b></span></div>
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
        ensureSectionStyles();
        const extras = document.getElementById('tactics-extras');
        if (!extras) return;
        const s = gs();
        if (!s) return;

        const formation    = s.formation    || '433';
        const mentality    = s.mentality    || 'balanced';
        const pressStyle   = s.pressStyle   || 'medium';
        const specialInstr = s.specialInstruction || 'none';

        extras.innerHTML = `
        <div class="tc-top">
        <!-- CONTEXTO PARTIDO -->
        <div class="tc-matchbox" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
                    border-radius:10px;padding:12px 14px;margin-bottom:14px;">
            ${renderMatchContext()}
        </div>

        <!-- PLAN DEL PARTIDO -->
        <div id="tc-plan" class="tc-plan" style="background:rgba(255,210,74,.08);border:1px solid rgba(255,210,74,.35);border-radius:10px;padding:12px 14px;margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between;">
            <div style="font-size:.85em;line-height:1.45;color:#e6eefb;" id="tc-plan-text" title="${s.staff?.segundoEntrenador ? '' : 'Contrata un segundo entrenador para que también adapte la mentalidad (y desde nivel 3, la formación) al rival.'}"><i class="tc-info" aria-hidden="true"></i>${s.staff?.segundoEntrenador
                ? `🧠 <strong>Segundo entrenador (nivel ${s.staff.segundoEntrenador.level})</strong>: puede preparar el once${s.staff.segundoEntrenador.level >= 3 ? ', la formación' : ''} y la mentalidad para el próximo partido según el rival.`
                : '<span class="tc-emo">🧠 </span>Sin segundo entrenador: elige el mejor once en tu formación actual.'}</div>
            <button class="btn tc-auto" onclick="window.pcfAutoLineup && window.pcfAutoLineup().then(()=>window._tacticsRefresh && window._tacticsRefresh())">⚡ ${s.staff?.segundoEntrenador ? 'Aplicar plan del segundo entrenador' : 'Alineación automática'}</button>
        </div>
        </div>

        <!-- XI TITULAR -->
        <div class="tc-xibox" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
                    border-radius:10px;padding:12px 14px;margin-bottom:16px;">
            ${renderXISummary()}
        </div>

        <!-- FORMACIÓN -->
        <div class="tc-sec tc-sec-formation">
            <div class="tc-sec-label">
                🔲 Formación
            </div>
            ${(() => {
                const squad = s.squad || [];
                const media = {};
                Object.keys(FORMATION_DATA).forEach(f => {
                    media[f] = window.pickBestXI && window.calculateTeamEffectiveOverallImproved
                        ? window.calculateTeamEffectiveOverallImproved(window.pickBestXI(squad, f), f) : null;
                });
                const best = Object.entries(media).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1])[0]?.[0];
                const ordered = Object.fromEntries(FORMATION_ORDER.filter(k => FORMATION_DATA[k]).map(k => [k, FORMATION_DATA[k]]));
                return renderCards(ordered, formation, 'window._tacticsSetFormation', 5,
                    key => media[key] == null ? '' : `<div class="tc-stat${key === best ? ' best' : ''}" style="font-size:.68em;margin-top:4px;color:${key === best ? '#FFD700' : '#bcd'};font-weight:${key === best ? 'bold' : 'normal'}" title="Media del mejor once posible con tu plantilla en esta formación">Tu plantilla: ${media[key].toFixed(1)}</div>`, key => formationDots(key));
            })()}
        </div>

        <!-- MENTALIDAD -->
        <div class="tc-sec tc-sec-mentality">
            <div class="tc-sec-label">
                🧠 Mentalidad
            </div>
            ${renderCards(MENTALITY_DATA, mentality, 'window._tacticsSetMentality', 3)}
        </div>

        <!-- PRESIÓN -->
        <div class="tc-sec tc-sec-press">
            <div class="tc-sec-label">
                💪 Estilo de presión
            </div>
            ${renderCards(PRESS_DATA, pressStyle, 'window._tacticsSetPress', 3)}
        </div>

        <!-- INSTRUCCIÓN ESPECIAL -->
        <div class="tc-sec tc-sec-instr">
            <div class="tc-sec-label">
                📋 Instrucción especial
            </div>
            ${renderCards(INSTRUCTION_DATA, specialInstr, 'window._tacticsSetInstruction', 5)}
        </div>

        <div class="tc-sec tc-sec-plan"><div class="tc-sec-label">Plan durante el partido</div>
            <label>Reacción automática <select onchange="window._setFootballPlan(this.value)">
                <option value="hold" ${s.matchPlan==='hold'||!s.matchPlan?'selected':''}>Mantener el planteamiento</option>
                <option value="react" ${s.matchPlan==='react'?'selected':''}>Atacar desde el 60 si vamos perdiendo</option>
                <option value="attack" ${s.matchPlan==='attack'?'selected':''}>Atacar desde el minuto 60</option>
                <option value="protect" ${s.matchPlan==='protect'?'selected':''}>Reaccionar si perdemos y proteger ventaja desde el 75</option>
            </select></label>
            <label><input type="checkbox" ${s.autoSubstitutions!==false?'checked':''} onchange="window._setFootballAutoSubs(this.checked)"> Sustituciones automáticas (hasta cinco): por lesión siempre; por fatiga solo con segundo entrenador, según su nivel</label>
            <p>La presión alta desgasta más. El plan y los cambios se aplican durante el encuentro.</p>
        </div>
        <!-- BALANCE RESULTANTE -->
        <div class="tc-profile" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
                    border-radius:10px;padding:12px 14px;margin-bottom:8px;">
            <div class="tc-profile-t" style="color:#cfe0ff;font-size:.78em;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:bold;">
                <span class="tc-emo">📊 </span>Perfil táctico orientativo
            </div>
            <p>${PRESS_DATA[pressStyle]?.desc || ''}</p><p>${INSTRUCTION_DATA[specialInstr]?.desc || ''}</p>
            <small>El efecto depende de los atributos, la condición física y el planteamiento rival.</small>
        </div>`;
        fillCrests();
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
    window._tacticsRefresh = () => refreshExtras();
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
                params = { ...params, [side + 'Press']: press, [side + 'Instruction']: instr };

            }
            return orig.call(this, params);
        };
        console.log('[Tactics] hook matchEngine ✓');
    }

    window._setFootballPlan = value => gl().updateGameState({ matchPlan: value });
    window._setFootballAutoSubs = value => gl().updateGameState({ autoSubstitutions: value });

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
