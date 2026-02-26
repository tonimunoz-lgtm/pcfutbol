// ============================================================
// injector-rival.js  v1.0
// 
// Análisis completo del equipo rival antes de cada partido:
//  - Plantilla real (si existe en Firebase) o generada
//  - Estadísticas de la temporada (clasificación, forma)
//  - Últimos resultados con el rival
//  - Alineación probable con visualización en campo
//  - Comparativa de medias con nuestro equipo
//  - Panel de notas del míster
// ============================================================
(function () {
    'use strict';

    const gl  = () => window.gameLogic;
    const gs  = () => gl()?.getGameState?.();

    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');

    // ── Atributos con nombre corto legible ────────────────────────
    const ATTR_LABELS = { EN: 'Energía', VE: 'Velocidad', RE: 'Resistencia',
        AG: 'Agilidad', CA: 'Cabezazo', EF: 'Eficacia', MO: 'Moral', AT: 'Ataque', DF: 'Defensa' };

    const POS_GROUP = {
        POR: 'POR', DFC: 'DEF', LI: 'DEF', LD: 'DEF',
        MC: 'MED', MCO: 'MED', MD: 'MED', MI: 'MED',
        EXT: 'DEL', DC: 'DEL'
    };
    const POS_COLOR = { POR: '#FFD700', DEF: '#2196F3', MED: '#4CAF50', DEL: '#f44336' };

    // Overall rápido si no hay calculado
    function quickOverall(p) {
        if (p.overall) return p.overall;
        const attrs = ['EN','VE','RE','AG','CA','EF','MO','AT','DF'];
        const vals = attrs.map(a => p[a] || 70);
        return Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);
    }

    // ── Obtener el rival del próximo partido ──────────────────────
    // Busca directamente en el calendario el próximo partido sin jugar.
    // s.nextOpponent NO es fiable (gameLogic no lo guarda en gameState),
    // así que siempre se usa el calendario como fuente de verdad.
    function getNextRivalName() {
        const s = gs();
        if (!s) return null;

        // Buscar en el calendario el próximo partido sin jugar a partir de la semana actual
        if (s.seasonCalendar && s.team) {
            const played = new Set(
                (s.matchHistory || []).map(m => m.week + '_' + m.home + '_' + m.away)
            );
            const upcoming = s.seasonCalendar
                .filter(m => (m.home === s.team || m.away === s.team) && m.week >= (s.week || 1))
                .sort((a, b) => a.week - b.week);
            for (const m of upcoming) {
                const key = m.week + '_' + m.home + '_' + m.away;
                if (!played.has(key)) {
                    return m.home === s.team ? m.away : m.home;
                }
            }
        }

        // Último recurso: nextOpponent del estado
        if (s.nextOpponent && s.nextOpponent !== '—' && s.nextOpponent !== 'Rival amistoso') {
            return s.nextOpponent;
        }
        return null;
    }

    // ── Obtener división del equipo ───────────────────────────────
    function getDivision() { return gs()?.division || 'rfef_grupo1'; }

    // ── Obtener plantilla rival (real si existe, sino generada) ───
    async function getRivalSquad(rivalName) {
        // Intentar Firebase/localStorage igual que generateAISquad
        if (window.getTeamData) {
            try {
                const teamData = await window.getTeamData(rivalName);
                if (teamData?.squad?.length > 0) {
                    return { squad: teamData.squad.map(p => ({
                        ...p, overall: quickOverall(p),
                        form: p.form || 75, isInjured: p.isInjured || false
                    })), isReal: true };
                }
            } catch(e) { /* fallback */ }
        }
        // Generar realista según división
        if (window.generateAISquad) {
            const sq = await window.generateAISquad(rivalName, getDivision());
            return { squad: sq, isReal: false };
        }
        // Mínimo: 11 jugadores básicos
        const pos11 = ['POR','DFC','DFC','LI','LD','MC','MC','MCO','EXT','EXT','DC'];
        const div = getDivision();
        const ranges = { primera:{min:72,max:88}, segunda:{min:62,max:76}, rfef_grupo1:{min:52,max:66}, rfef_grupo2:{min:50,max:64} };
        const r = ranges[div] || ranges.rfef_grupo1;
        return { squad: pos11.map((pos,i) => ({
            name: `Jugador ${i+1}`, position: pos,
            overall: r.min + Math.floor(Math.random()*(r.max-r.min)),
            form: 65 + Math.floor(Math.random()*20), isInjured: false
        })), isReal: false };
    }

    // ── Clasificación del rival ───────────────────────────────────
    function getRivalStandings(rivalName) {
        const s = gs();
        if (!s?.standings?.[rivalName]) return null;
        const st = s.standings[rivalName];
        // Posición en la tabla
        const sorted = Object.entries(s.standings)
            .filter(([,v]) => v.pts !== undefined)
            .sort((a,b) => {
                if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;
                return (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc);
            });
        const pos = sorted.findIndex(([t]) => t === rivalName) + 1;
        return { ...st, pos, total: sorted.length };
    }

    // ── Últimos N resultados del rival ────────────────────────────
    function getRivalLastResults(rivalName, n = 5) {
        const s = gs();
        if (!s?.matchHistory) return [];
        return s.matchHistory
            .filter(m => m.home === rivalName || m.away === rivalName)
            .slice(-n)
            .map(m => {
                const isHome = m.home === rivalName;
                const [hg, ag] = (m.score || '0-0').split('-').map(Number);
                const gf = isHome ? hg : ag;
                const gc = isHome ? ag : hg;
                const result = gf > gc ? 'V' : gf === gc ? 'E' : 'D';
                const opp = isHome ? m.away : m.home;
                return { week: m.week, home: m.home, away: m.away, score: m.score, result, gf, gc, opp, isHome };
            });
    }

    // ── Historial enfrentamientos directo ─────────────────────────
    function getH2H(rivalName) {
        const s = gs();
        if (!s?.matchHistory || !s.team) return [];
        return s.matchHistory
            .filter(m => (m.home === s.team && m.away === rivalName) ||
                          (m.home === rivalName && m.away === s.team))
            .map(m => {
                const myHome = m.home === s.team;
                const [hg, ag] = (m.score || '0-0').split('-').map(Number);
                const gf = myHome ? hg : ag;
                const gc = myHome ? ag : hg;
                const result = gf > gc ? 'V' : gf === gc ? 'E' : 'D';
                return { week: m.week, score: m.score, result, gf, gc, myHome };
            });
    }

    // ── Forma reciente (string tipo "VVDEV") ──────────────────────
    function formString(results) {
        return results.slice(-5).map(r => r.result).join('');
    }

    // ── Alineación probable (11 titulares por posición) ───────────
    function getStartingXI(squad) {
        const byPos = {};
        squad.forEach(p => {
            if (!byPos[p.position]) byPos[p.position] = [];
            byPos[p.position].push(p);
        });
        // Ordenar cada posición por overall desc, no lesionados primero
        Object.values(byPos).forEach(arr => arr.sort((a,b) => {
            if (a.isInjured !== b.isInjured) return a.isInjured ? 1 : -1;
            return quickOverall(b) - quickOverall(a);
        }));
        // Seleccionar formación probable: llenar 4-3-3 por defecto
        const needs = { POR:1, DFC:2, LI:1, LD:1, MC:2, MCO:1, EXT:2, DC:1 };
        const xi = [];
        for (const [pos, count] of Object.entries(needs)) {
            const pool = byPos[pos] || [];
            for (let i = 0; i < count && i < pool.length; i++) xi.push(pool[i]);
        }
        // Si faltan, rellenar con los mejores disponibles
        const used = new Set(xi.map(p => p.name));
        const bench = squad.filter(p => !used.has(p.name) && !p.isInjured)
                           .sort((a,b) => quickOverall(b)-quickOverall(a));
        while (xi.length < 11 && bench.length) xi.push(bench.shift());
        return xi.slice(0, 11);
    }

    // ── Comparativa de equipos ────────────────────────────────────
    function getTeamComparison(mySquad, rivalSquad) {
        const attrs = ['EN','VE','RE','AG','CA','EF','MO','AT','DF'];
        const avg = (squad, attr) => {
            const xi = getStartingXI(squad);
            return Math.round(xi.reduce((s,p) => s + (p[attr] || quickOverall(p)), 0) / xi.length);
        };
        return attrs.map(a => ({
            attr: a, label: ATTR_LABELS[a],
            mine: avg(mySquad, a), rival: avg(rivalSquad, a)
        }));
    }

    // ── Render color badge resultado ──────────────────────────────
    function resultBadge(r) {
        const c = {V:'#4CAF50',E:'#f5a623',D:'#f44336'}[r] || '#666';
        return `<span style="display:inline-block;width:20px;height:20px;border-radius:50%;
                             background:${c};color:#fff;font-size:.7em;font-weight:bold;
                             line-height:20px;text-align:center;">${r}</span>`;
    }

    // ── Overall badge color ───────────────────────────────────────
    function ovrColor(v) {
        if (v >= 80) return '#FFD700';
        if (v >= 70) return '#4CAF50';
        if (v >= 60) return '#f5a623';
        return '#f44336';
    }

    // ── Render plantilla ──────────────────────────────────────────
    function renderSquadList(squad, xi) {
        const xiNames = new Set(xi.map(p => p.name));
        const starters = squad.filter(p => xiNames.has(p.name));
        const subs     = squad.filter(p => !xiNames.has(p.name));

        const row = (p, starter) => {
            const ovr = quickOverall(p);
            const grp = POS_GROUP[p.position] || 'MED';
            const posC = POS_COLOR[grp] || '#888';
            const injBadge = p.isInjured ? '<span style="color:#f44336;font-size:.75em;margin-left:4px;">🤕</span>' : '';
            const starBadge = starter ? '<span style="color:#FFD700;font-size:.75em;margin-left:3px;">★</span>' : '';
            const formBar = p.form
                ? `<div style="width:${Math.round(p.form)}px;max-width:60px;height:3px;background:linear-gradient(90deg,${p.form>75?'#4CAF50':'#f5a623'},#333);border-radius:2px;margin-top:2px;"></div>`
                : '';
            return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);">
                <span style="background:${posC}22;color:${posC};border-radius:4px;padding:2px 5px;font-size:.7em;font-weight:bold;min-width:32px;text-align:center;">${p.position}</span>
                <div style="flex:1;min-width:0;">
                    <div style="color:#ddd;font-size:.83em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}${injBadge}${starBadge}</div>
                    ${p.age ? `<div style="color:#555;font-size:.7em;">${p.age} años${p.nationality ? ' · '+p.nationality : ''}</div>` : ''}
                    ${formBar}
                </div>
                <div style="text-align:right;">
                    <div style="color:${ovrColor(ovr)};font-weight:bold;font-size:.85em;">${ovr}</div>
                    ${p.form ? `<div style="color:#555;font-size:.7em;">${Math.round(p.form)}fm</div>` : ''}
                </div>
            </div>`;
        };

        return `
        <div style="margin-bottom:10px;">
            <div style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
                ★ Titular probable (11)
            </div>
            ${starters.map(p => row(p, true)).join('')}
        </div>
        <div>
            <div style="color:#555;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
                Banquillo / Plantilla (${subs.length})
            </div>
            ${subs.slice(0, 10).map(p => row(p, false)).join('')}
            ${subs.length > 10 ? `<div style="color:#444;font-size:.75em;text-align:center;padding:4px;">+${subs.length-10} más...</div>` : ''}
        </div>`;
    }

    // ── Render campo con alineación probable ─────────────────────
    function renderField(xi) {
        // Agrupar por línea y ordenar
        const lines = { 0:[],1:[],2:[],3:[] }; // GK, DEF, MID, FWD
        xi.forEach(p => {
            const g = POS_GROUP[p.position] || 'MED';
            const line = {POR:0,DEF:1,MED:2,DEL:3}[g] ?? 2;
            lines[line].push(p);
        });

        const renderLine = (players, label) => {
            if (!players.length) return '';
            return `<div style="display:flex;justify-content:center;gap:8px;margin:6px 0;">
                ${players.map(p => {
                    const ovr = quickOverall(p);
                    const grp = POS_GROUP[p.position] || 'MED';
                    const c = POS_COLOR[grp] || '#888';
                    const shortName = p.name?.split(' ').pop() || p.name || '?';
                    return `<div style="text-align:center;width:52px;">
                        <div style="width:40px;height:40px;border-radius:50%;background:${c}22;border:2px solid ${c};
                                    display:flex;align-items:center;justify-content:center;margin:0 auto 2px;
                                    color:${ovrColor(ovr)};font-weight:bold;font-size:.8em;">${ovr}</div>
                        <div style="color:#bbb;font-size:.62em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${shortName}</div>
                        <div style="color:#666;font-size:.6em;">${p.position}</div>
                    </div>`;
                }).join('')}
            </div>`;
        };

        return `
        <div style="background:linear-gradient(180deg,#1a3a1a,#0d2b0d);border-radius:10px;padding:12px;border:1px solid #2a4a2a;position:relative;">
            <!-- Campo de fútbol visual -->
            <div style="border:1px solid #2a5a2a;border-radius:6px;padding:8px;">
                ${renderLine(lines[3],'Delanteros')}
                ${renderLine(lines[2],'Medios')}
                ${renderLine(lines[1],'Defensas')}
                ${renderLine(lines[0],'Portero')}
            </div>
        </div>`;
    }

    // ── Render comparativa de atributos ──────────────────────────
    function renderComparison(comparison, rivalName, myTeamName) {
        return comparison.map(({attr, label, mine, rival}) => {
            const total = mine + rival || 1;
            const myPct = Math.round(mine / total * 100);
            const rvPct = 100 - myPct;
            const winner = mine > rival ? 'mine' : rival > mine ? 'rival' : 'draw';
            return `
            <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;font-size:.75em;margin-bottom:2px;">
                    <span style="color:${winner==='mine'?'#4CAF50':'#aaa'};font-weight:${winner==='mine'?'bold':'normal'};">${mine}</span>
                    <span style="color:#666;">${label}</span>
                    <span style="color:${winner==='rival'?'#f44336':'#aaa'};font-weight:${winner==='rival'?'bold':'normal'};">${rival}</span>
                </div>
                <div style="display:flex;height:5px;border-radius:3px;overflow:hidden;">
                    <div style="width:${myPct}%;background:#4CAF50;"></div>
                    <div style="width:${rvPct}%;background:#f44336;"></div>
                </div>
            </div>`;
        }).join('');
    }

    // ── Render últimos resultados del rival ───────────────────────
    function renderLastResults(results, rivalName) {
        if (!results.length) return '<div style="color:#555;font-size:.8em;">Sin partidos registrados</div>';
        return results.slice().reverse().map(r => {
            const homeStyle = r.isHome ? 'font-weight:bold;color:#fff;' : 'color:#888;';
            const awayStyle = !r.isHome ? 'font-weight:bold;color:#fff;' : 'color:#888;';
            return `
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.78em;">
                <span style="color:#555;min-width:30px;">J${r.week}</span>
                ${resultBadge(r.result)}
                <span style="${homeStyle}">${r.home}</span>
                <span style="color:#888;font-weight:bold;">${r.score}</span>
                <span style="${awayStyle}">${r.away}</span>
            </div>`;
        }).join('');
    }

    // ── Render H2H ────────────────────────────────────────────────
    function renderH2H(h2h, myTeam, rivalName) {
        if (!h2h.length) return '<div style="color:#555;font-size:.8em;padding:6px 0;">Sin enfrentamientos previos esta temporada</div>';
        const w = h2h.filter(r=>r.result==='V').length;
        const d = h2h.filter(r=>r.result==='E').length;
        const l = h2h.filter(r=>r.result==='D').length;
        return `
        <div style="display:flex;gap:16px;margin-bottom:8px;">
            <div style="text-align:center;"><div style="color:#4CAF50;font-size:1.2em;font-weight:bold;">${w}</div><div style="color:#666;font-size:.7em;">Victorias</div></div>
            <div style="text-align:center;"><div style="color:#f5a623;font-size:1.2em;font-weight:bold;">${d}</div><div style="color:#666;font-size:.7em;">Empates</div></div>
            <div style="text-align:center;"><div style="color:#f44336;font-size:1.2em;font-weight:bold;">${l}</div><div style="color:#666;font-size:.7em;">Derrotas</div></div>
        </div>
        ${h2h.slice().reverse().map(r => {
            const loc = r.myHome ? `${myTeam} (L)` : `${rivalName} (L)`;
            return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.78em;">
                <span style="color:#555;min-width:30px;">J${r.week}</span>
                ${resultBadge(r.result)}
                <span style="color:#888;">${r.myHome ? myTeam : rivalName} ${r.score} ${r.myHome ? rivalName : myTeam}</span>
            </div>`;
        }).join('')}`;
    }

    // ── Notas del míster (persistidas en state) ───────────────────
    function getNotes(rivalName) {
        const s = gs();
        return (s?.rivalNotes || {})[rivalName] || '';
    }
    function saveNotes(rivalName, text) {
        const s = gs();
        const notes = { ...(s?.rivalNotes || {}), [rivalName]: text };
        gl()?.updateGameState?.({ rivalNotes: notes });
    }
    window._rivalSaveNotes = function(rivalName) {
        const el = document.getElementById('rival-notes-textarea');
        if (el) saveNotes(rivalName, el.value);
    };

    // ── Construir la página de análisis del rival ─────────────────
    async function buildRivalPage(rivalName) {
        const container = document.getElementById('rival-analysis');
        if (!container) return;

        container.innerHTML = `
        <div class="page-header">
            <h1>🔍 Análisis Rival</h1>
            <button class="page-close-btn" onclick="document.getElementById('rival-analysis').classList.remove('active')">✖ CERRAR</button>
        </div>
        <div style="text-align:center;padding:40px;color:#666;">
            <div style="font-size:2em;margin-bottom:12px;">⏳</div>
            Cargando datos de <strong style="color:#4CAF50;">${rivalName}</strong>...
        </div>`;

        const s = gs();
        if (!s) return;

        const { squad: rivalSquad, isReal } = await getRivalSquad(rivalName);
        const xi   = getStartingXI(rivalSquad);
        const st   = getRivalStandings(rivalName);
        const last = getRivalLastResults(rivalName);
        const h2h  = getH2H(rivalName);
        const form = formString(last);
        const mySquad = s.squad || [];
        const comparison = mySquad.length > 0 ? getTeamComparison(mySquad, rivalSquad) : [];
        const notes = getNotes(rivalName);

        // Medias de los XI
        const rivalAvg = xi.length ? Math.round(xi.reduce((sum,p)=>sum+quickOverall(p),0)/xi.length) : 70;
        const myXI     = getStartingXI(mySquad);
        const myAvg    = myXI.length ? Math.round(myXI.reduce((sum,p)=>sum+quickOverall(p),0)/myXI.length) : 70;
        const diff     = myAvg - rivalAvg;
        const diffStr  = diff > 0 ? `+${diff}` : `${diff}`;
        const diffColor = diff > 0 ? '#4CAF50' : diff < 0 ? '#f44336' : '#f5a623';

        const isHome = (() => {
            const cal = s.seasonCalendar || [];
            const nw  = s.nextWeek || (s.week + 1);
            const m   = cal.find(x => x.week === nw && (x.home === s.team || x.away === s.team));
            if (!m) return null;
            return m.home === s.team;
        })();
        const locLabel = isHome === true ? '🏟️ LOCAL' : isHome === false ? '✈️ VISITANTE' : '';

        // ── Tabs internos ─────────────────────────────────────────
        container.innerHTML = `
        <div class="page-header">
            <h1>🔍 Análisis: <span style="color:#4CAF50;">${rivalName}</span></h1>
            <button class="page-close-btn" onclick="document.getElementById('rival-analysis').classList.remove('active')">✖ CERRAR</button>
        </div>

        <!-- Header rival -->
        <div style="background:rgba(255,255,255,.04);border-radius:12px;padding:14px;margin-bottom:16px;
                    display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;">
            <div>
                <div style="font-size:1.1em;font-weight:bold;color:#fff;">${rivalName}</div>
                <div style="color:#666;font-size:.8em;margin-top:2px;">
                    ${isReal ? '📋 Plantilla real' : '⚙️ Plantilla generada'}
                    ${locLabel ? ' · ' + locLabel : ''}
                </div>
            </div>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
                ${st ? `
                <div style="text-align:center;">
                    <div style="color:#FFD700;font-size:1.3em;font-weight:bold;">${st.pos}º</div>
                    <div style="color:#666;font-size:.7em;">Posición</div>
                </div>
                <div style="text-align:center;">
                    <div style="color:#4CAF50;font-size:1.3em;font-weight:bold;">${st.pts}</div>
                    <div style="color:#666;font-size:.7em;">Puntos</div>
                </div>
                <div style="text-align:center;">
                    <div style="color:#aaa;font-size:1.1em;">${st.g}-${st.e}-${st.p}</div>
                    <div style="color:#666;font-size:.7em;">V-E-D</div>
                </div>
                <div style="text-align:center;">
                    <div style="color:#aaa;font-size:1.1em;">${st.gf}:${st.gc}</div>
                    <div style="color:#666;font-size:.7em;">Goles</div>
                </div>` : '<div style="color:#555;font-size:.8em;">Sin datos de clasificación</div>'}
                <div style="text-align:center;">
                    <div style="display:flex;gap:3px;">${form.split('').map(r=>resultBadge(r)).join('')}</div>
                    <div style="color:#666;font-size:.7em;margin-top:3px;">Últimos resultados</div>
                </div>
            </div>
            <!-- Comparativa overall -->
            <div style="background:rgba(0,0,0,.3);border-radius:10px;padding:10px 16px;text-align:center;min-width:140px;">
                <div style="display:flex;gap:16px;align-items:center;justify-content:center;">
                    <div>
                        <div style="color:#4CAF50;font-size:1.4em;font-weight:bold;">${myAvg}</div>
                        <div style="color:#555;font-size:.7em;">${s.team?.split(' ')[0] || 'Nosotros'}</div>
                    </div>
                    <div style="color:${diffColor};font-size:1.1em;font-weight:bold;">${diffStr}</div>
                    <div>
                        <div style="color:${ovrColor(rivalAvg)};font-size:1.4em;font-weight:bold;">${rivalAvg}</div>
                        <div style="color:#555;font-size:.7em;">${rivalName.split(' ')[0]}</div>
                    </div>
                </div>
                <div style="color:#555;font-size:.7em;margin-top:3px;">Media OVR XI</div>
            </div>
        </div>

        <!-- TABS internos -->
        <div id="rival-tabs" style="display:flex;gap:4px;margin-bottom:0;">
            <button id="rtab-squad"   onclick="window._rivalTab('squad')"   style="${tabBtn(true,'#4CAF50')}">👥 Plantilla</button>
            <button id="rtab-field"   onclick="window._rivalTab('field')"   style="${tabBtn(false,'#4CAF50')}">🏟️ XI Probable</button>
            <button id="rtab-stats"   onclick="window._rivalTab('stats')"   style="${tabBtn(false,'#4CAF50')}">📊 Estadísticas</button>
            <button id="rtab-notes"   onclick="window._rivalTab('notes')"   style="${tabBtn(false,'#4CAF50')}">📝 Notas</button>
        </div>
        <div id="rival-tab-content" style="background:rgba(255,255,255,.03);border-radius:0 8px 8px 8px;
              padding:14px;border:1px solid rgba(255,255,255,.07);min-height:300px;">
        </div>`;

        // Guardar datos para cambio de tab
        window._rivalData = { rivalName, rivalSquad, xi, last, h2h, comparison, notes, mySquad, s };
        window._rivalActiveTab = 'squad';

        renderRivalTab('squad');
    }

    function tabBtn(active, color) {
        const base = 'border:none;border-radius:8px 8px 0 0;padding:9px 14px;cursor:pointer;font-weight:bold;font-size:.8em;white-space:nowrap;transition:all .2s;';
        return active
            ? base + `background:${color};color:#000;`
            : base + 'background:rgba(255,255,255,.06);color:#666;';
    }

    function renderRivalTab(tab) {
        const d = window._rivalData;
        if (!d) return;
        const el = document.getElementById('rival-tab-content');
        if (!el) return;

        window._rivalActiveTab = tab;

        // Update tab button styles
        ['squad','field','stats','notes'].forEach(t => {
            const btn = document.getElementById(`rtab-${t}`);
            if (btn) btn.style.cssText = tabBtn(t === tab, '#4CAF50');
        });

        if (tab === 'squad') {
            el.innerHTML = renderSquadList(d.rivalSquad, d.xi);
        } else if (tab === 'field') {
            el.innerHTML = `
            <div style="margin-bottom:12px;">
                <div style="color:#888;font-size:.8em;margin-bottom:8px;">Alineación probable (4-3-3 estimada)</div>
                ${renderField(d.xi)}
            </div>
            <!-- Jugadores clave -->
            <div style="margin-top:14px;">
                <div style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">⭐ Jugadores a vigilar</div>
                ${d.xi.sort((a,b)=>quickOverall(b)-quickOverall(a)).slice(0,3).map(p => {
                    const ovr = quickOverall(p);
                    const grp = POS_GROUP[p.position]||'MED';
                    return `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:rgba(255,215,0,.04);
                                        border:1px solid rgba(255,215,0,.1);border-radius:8px;margin-bottom:6px;">
                        <div style="width:36px;height:36px;border-radius:50%;background:${POS_COLOR[grp]}22;border:2px solid ${POS_COLOR[grp]};
                                    display:flex;align-items:center;justify-content:center;color:${ovrColor(ovr)};font-weight:bold;font-size:.85em;">${ovr}</div>
                        <div>
                            <div style="color:#FFD700;font-size:.85em;font-weight:bold;">${p.name}</div>
                            <div style="color:#666;font-size:.75em;">${p.position}${p.age ? ' · '+p.age+' años' : ''}</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
        } else if (tab === 'stats') {
            el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <!-- Últimos resultados -->
                <div>
                    <div style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                        📅 Últimos resultados de ${d.rivalName.split(' ')[0]}
                    </div>
                    ${renderLastResults(d.last, d.rivalName)}
                </div>
                <!-- Historial H2H -->
                <div>
                    <div style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                        ⚔️ Historial directo
                    </div>
                    ${renderH2H(d.h2h, d.s.team, d.rivalName)}
                </div>
            </div>
            <!-- Comparativa atributos -->
            ${d.comparison.length ? `
            <div style="margin-top:16px;">
                <div style="color:#888;font-size:.75em;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                    📊 Comparativa media XI — <span style="color:#4CAF50;">${d.s.team}</span> vs <span style="color:#f44336;">${d.rivalName}</span>
                </div>
                ${renderComparison(d.comparison, d.rivalName, d.s.team)}
            </div>` : ''}`;
        } else if (tab === 'notes') {
            el.innerHTML = `
            <div style="color:#888;font-size:.8em;margin-bottom:8px;">📝 Notas del míster — se guardan automáticamente</div>
            <textarea id="rival-notes-textarea"
                style="width:100%;min-height:160px;background:rgba(255,255,255,.05);
                       border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px;
                       color:#ddd;font-size:.85em;resize:vertical;font-family:inherit;box-sizing:border-box;"
                placeholder="Escribe aquí tus notas sobre el rival: debilidades, amenazas, plan de partido..."
                oninput="window._rivalSaveNotes('${d.rivalName}')"
            >${d.notes}</textarea>
            <div style="color:#444;font-size:.72em;margin-top:6px;">Las notas se guardan por equipo rival durante la temporada.</div>`;
        }
    }
    window._rivalTab = renderRivalTab;

    // ── Crear la página #rival-analysis en el DOM ─────────────────
    function injectPage() {
        if (document.getElementById('rival-analysis')) return;
        const div = document.createElement('div');
        div.id    = 'rival-analysis';
        div.className = 'page';
        // NO poner display:none inline — el CSS .page ya lo hace
        // y .page.active lo muestra. Inline style sobreescribiría el CSS.
        document.body.appendChild(div);
        console.log('[Rival] página inyectada en DOM ✓');
    }

    // ── Activar el botón "Ver Rival" ──────────────────────────────
    function activateButton() {
        // Buscar el botón por texto
        const btns = document.querySelectorAll('button');
        btns.forEach(btn => {
            if (btn.textContent.trim() === 'Ver Rival') {
                btn.style.opacity   = '1';
                btn.style.cursor    = 'pointer';
                btn.onclick = openRivalPage;
                console.log('[Rival] Botón "Ver Rival" activado ✓');
            }
        });
    }

    // ── Abrir/cerrar página rival — usa classList igual que las páginas nativas ──
    // NO hookear openPage/closePage para no romper la cadena de hooks de otros injectors.
    function openRivalPage() {
        console.log('[Rival] openRivalPage called');
        const s = gs();
        console.log('[Rival] state:', s ? `team=${s.team} week=${s.week} nextOpponent=${s.nextOpponent}` : 'NULL');
        
        let rival = getNextRivalName();
        console.log('[Rival] rival detectado:', rival);
        
        // Durante pretemporada no hay rival real — buscar el primero del calendario
        if (!rival || rival === '—' || rival === 'Rival amistoso') {
            if (s?.seasonCalendar?.length && s.team) {
                const firstMatch = s.seasonCalendar
                    .filter(m => m.home === s.team || m.away === s.team)
                    .sort((a,b) => a.week - b.week)[0];
                if (firstMatch) {
                    rival = firstMatch.home === s.team ? firstMatch.away : firstMatch.home;
                    console.log('[Rival] usando primer rival del calendario:', rival);
                }
            }
        }
        
        if (!rival || rival === '—') {
            alert('No hay rival definido. Simula al menos una semana primero.');
            return;
        }
        
        injectPage();
        console.log('[Rival] abriendo página para:', rival);
        
        // Cerrar todas las páginas activas y activar la nuestra
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const el = document.getElementById('rival-analysis');
        console.log('[Rival] elemento rival-analysis:', el);
        if (!el) {
            console.error('[Rival] ERROR: elemento rival-analysis no encontrado tras injectPage');
            return;
        }
        el.classList.add('active');
        buildRivalPage(rival);
    }
    window.openRivalPage = openRivalPage;

    // hookOpenPage: no-op — no tocamos window.openPage/closePage para no romper otros injectors
    function hookOpenPage() { /* no-op */ }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        if (!window.gameLogic) { setTimeout(init, 400); return; }
        injectPage();
        // hookOpenPage is a no-op — no need to call it
        setTimeout(activateButton, 1500);
        // Re-activar si se recarga la UI
        setTimeout(activateButton, 3000);
        console.log('[Rival] ✅ v1.0 listo');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();
