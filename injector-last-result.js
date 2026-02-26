// ============================================================
// injector-last-result.js  v1.0
//
// - Renombra el botón "Resultados" del cuadrante top-left a
//   "📰 Noticias" (sigue abriendo el dashboard)
// - Añade un nuevo botón "Resultados" debajo de Calendario
//   con el mismo icono results-icon
// - Hookea injectMatchSummary para guardar siempre el último
//   resultado en window._lastMatchResult (con sus estadísticas
//   ya generadas, no se regeneran al reabrir)
// - Al pulsar "Resultados" abre una página .page con el mismo
//   contenido del modal pero sin auto-cerrado ni overlay
// ============================================================

(function () {
    'use strict';

    // ── Guardar último resultado al interceptar injectMatchSummary ─
    function hookMatchSummary() {
        if (typeof window.injectMatchSummary !== 'function') {
            setTimeout(hookMatchSummary, 300); return;
        }
        if (window._lastResultHooked) return;
        window._lastResultHooked = true;

        const orig = window.injectMatchSummary;
        window.injectMatchSummary = function(matchResult) {
            // Guardar el resultado para mostrarlo después
            window._lastMatchResult = matchResult;
            // Llamar al original (muestra el modal normal)
            return orig.call(this, matchResult);
        };
        console.log('[LastResult] hook injectMatchSummary ✓');
    }

    // ── Modificar botones del cuadrante top-left ──────────────────
    function patchTopLeftButtons() {
        const topLeft = document.querySelector('.quadrant.top-left');
        if (!topLeft) { setTimeout(patchTopLeftButtons, 300); return; }

        // 1. Renombrar "Resultados" → "📰 Noticias"
        const dashBtn = topLeft.querySelector('button[onclick*="dashboard"]');
        if (dashBtn) dashBtn.textContent = '📰 Noticias';

        // 2. Añadir nuevo botón "Resultados" después del botón Calendario
        if (topLeft.querySelector('#btn-last-result')) return; // ya añadido

        const calBtn = topLeft.querySelector('button[onclick*="calendar"]');
        const newBtn = document.createElement('button');
        newBtn.id = 'btn-last-result';
        newBtn.className = 'menu-button blue-button results-icon';
        newBtn.textContent = 'Resultados';
        newBtn.onclick = () => openLastResultPage();

        if (calBtn) {
            calBtn.insertAdjacentElement('afterend', newBtn);
        } else {
            topLeft.appendChild(newBtn);
        }

        console.log('[LastResult] botones cuadrante actualizados ✓');
    }

    // ── Crear la página #last-result en el DOM ────────────────────
    function createLastResultPage() {
        if (document.getElementById('last-result')) return;

        const page = document.createElement('div');
        page.id = 'last-result';
        page.className = 'page';
        page.innerHTML = `
            <div class="page-header">
                <h1>⚽ Último Resultado</h1>
                <button class="page-close-btn" onclick="closePage('last-result')">✖ CERRAR</button>
            </div>
            <div id="last-result-content" style="padding:10px 0;"></div>
        `;
        document.body.appendChild(page);
        console.log('[LastResult] página #last-result creada ✓');
    }

    // ── Abrir la página y rellenar el contenido ───────────────────
    window.openLastResultPage = function() {
        if (!window._lastMatchResult) {
            // Sin resultado guardado aún
            const content = document.getElementById('last-result-content');
            if (content) content.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#555;">
                    <div style="font-size:3em;margin-bottom:16px;">📭</div>
                    <div style="font-size:1.1em;">Todavía no has jugado ningún partido esta temporada.</div>
                </div>`;
            if (window.openPage) window.openPage('last-result');
            return;
        }

        renderLastResult(window._lastMatchResult);
        if (window.openPage) window.openPage('last-result');
    };

    // ── Renderizar el contenido del resultado ─────────────────────
    function renderLastResult(matchResult) {
        const content = document.getElementById('last-result-content');
        if (!content) return;

        const gs = window.gameLogic?.getGameState?.();
        const myTeam = gs?.team || '';

        const homeTeam  = matchResult.home;
        const awayTeam  = matchResult.away;
        const homeGoals = matchResult.homeGoals;
        const awayGoals = matchResult.awayGoals;
        const week      = matchResult.week || gs?.week || '';

        // Resultado desde nuestra perspectiva
        const isHome   = homeTeam === myTeam;
        const myGoals  = isHome ? homeGoals : awayGoals;
        const rivGoals = isHome ? awayGoals : homeGoals;
        const rival    = isHome ? awayTeam  : homeTeam;
        const resultLabel = myGoals > rivGoals ? '✅ VICTORIA' : myGoals < rivGoals ? '❌ DERROTA' : '🤝 EMPATE';
        const resultColor = myGoals > rivGoals ? '#4CAF50'    : myGoals < rivGoals ? '#f44336'    : '#FFD700';

        // Estadísticas — reusar las guardadas si existen, sino generar nuevas
        const stats = matchResult._cachedStats || generateStats(homeGoals, awayGoals);
        if (!matchResult._cachedStats) matchResult._cachedStats = stats;

        // Goles
        const homeScorers = matchResult._cachedHomeScorers || generateScorers(homeTeam, homeGoals, gs);
        const awayScorers = matchResult._cachedAwayScorers || generateScorers(awayTeam, awayGoals, gs);
        if (!matchResult._cachedHomeScorers) matchResult._cachedHomeScorers = homeScorers;
        if (!matchResult._cachedAwayScorers) matchResult._cachedAwayScorers = awayScorers;
        const allGoals = [...homeScorers, ...awayScorers].sort((a, b) => a.minute - b.minute);

        content.innerHTML = `
        <!-- CABECERA RESULTADO -->
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:14px;
                    padding:24px 20px 20px;margin-bottom:14px;text-align:center;">
            ${week ? `<div style="color:#888;font-size:.8em;margin-bottom:8px;">Jornada ${week}</div>` : ''}
            <div style="font-size:1.8em;font-weight:bold;color:${resultColor};margin-bottom:14px;">${resultLabel}</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;">
                <div style="text-align:center;flex:1;min-width:80px;">
                    <div style="font-size:.95em;color:#ccc;margin-bottom:6px;word-break:break-word;">${homeTeam}</div>
                    <div style="font-size:3.5em;font-weight:bold;color:#4CAF50;">${homeGoals}</div>
                </div>
                <div style="font-size:2em;color:rgba(255,255,255,.2);">-</div>
                <div style="text-align:center;flex:1;min-width:80px;">
                    <div style="font-size:.95em;color:#ccc;margin-bottom:6px;word-break:break-word;">${awayTeam}</div>
                    <div style="font-size:3.5em;font-weight:bold;color:#4CAF50;">${awayGoals}</div>
                </div>
            </div>
        </div>

        <!-- GOLES -->
        ${allGoals.length > 0 ? `
        <div style="background:rgba(255,255,255,.04);border-radius:12px;padding:16px;margin-bottom:14px;">
            <div style="color:#FFD700;font-weight:bold;margin-bottom:10px;text-transform:uppercase;font-size:.85em;letter-spacing:1px;">⚽ Goles</div>
            ${allGoals.map(g => `
            <div style="display:flex;align-items:center;gap:8px;padding:5px 0;
                        border-bottom:1px solid rgba(255,255,255,.05);
                        ${g.team === homeTeam ? 'justify-content:flex-start;' : 'justify-content:flex-end;'}">
                <span style="color:#888;font-size:.8em;min-width:28px;text-align:center;">${g.minute}'</span>
                <span style="color:#fff;font-size:.9em;">⚽ ${g.name}</span>
                <span style="color:#555;font-size:.75em;">(${g.team})</span>
            </div>`).join('')}
        </div>` : ''}

        <!-- POSESIÓN -->
        <div style="background:rgba(255,255,255,.04);border-radius:12px;padding:16px;margin-bottom:14px;">
            <div style="color:#FFD700;font-weight:bold;margin-bottom:12px;text-transform:uppercase;font-size:.85em;letter-spacing:1px;">📊 Posesión</div>
            ${[0,1].map(i => {
                const team = i === 0 ? homeTeam : awayTeam;
                const pct  = stats.possession[i];
                return `
                <div style="margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;font-size:.8em;margin-bottom:3px;">
                        <span style="color:#ccc;">${team}</span>
                        <span style="color:#aaa;">${pct}%</span>
                    </div>
                    <div style="height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${i===0?'#4CAF50':'#2196F3'};border-radius:3px;"></div>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <!-- ESTADÍSTICAS -->
        <div style="background:rgba(255,255,255,.04);border-radius:12px;padding:16px;margin-bottom:14px;">
            <div style="color:#FFD700;font-weight:bold;margin-bottom:12px;text-transform:uppercase;font-size:.85em;letter-spacing:1px;">📈 Estadísticas</div>
            <table style="width:100%;border-collapse:collapse;">
                ${[
                    ['Remates',          stats.shots[0],         stats.shots[1]],
                    ['A puerta',         stats.shotsOnTarget[0], stats.shotsOnTarget[1]],
                    ['Pases',            stats.passes[0],        stats.passes[1]],
                    ['Precisión pases',  stats.passAccuracy[0]+'%', stats.passAccuracy[1]+'%'],
                    ['Corners',          stats.corners[0],       stats.corners[1]],
                    ['Fueras de juego',  stats.offsides[0],      stats.offsides[1]],
                    ['Faltas',           stats.fouls[0],         stats.fouls[1]],
                    ['Paradas portero',  stats.saves[0],         stats.saves[1]],
                    ['Tarjetas amarillas', stats.yellowCards[0], stats.yellowCards[1]],
                    ['Tarjetas rojas',   stats.redCards[0],      stats.redCards[1]],
                ].map(([label, h, a]) => `
                <tr style="border-bottom:1px solid rgba(255,255,255,.05);">
                    <td style="text-align:right;padding:6px 8px;color:#4CAF50;font-weight:bold;font-size:.9em;">${h}</td>
                    <td style="text-align:center;padding:6px 4px;color:#888;font-size:.78em;">${label}</td>
                    <td style="text-align:left;padding:6px 8px;color:#FF5722;font-weight:bold;font-size:.9em;">${a}</td>
                </tr>`).join('')}
            </table>
        </div>`;
    }

    // ── Generar estadísticas (igual que el modal original) ────────
    function generateStats(homeGoals, awayGoals) {
        const gd = Math.abs(homeGoals - awayGoals);
        let homePoss = 50;
        if (homeGoals > awayGoals)      homePoss = Math.min(70, 52 + Math.floor(Math.random()*15) + gd*3);
        else if (awayGoals > homeGoals) homePoss = Math.max(30, 35 + Math.floor(Math.random()*10) - gd*3);
        else                             homePoss = 45 + Math.floor(Math.random()*10);
        const awayPoss = 100 - homePoss;
        return {
            possession:    [homePoss, awayPoss],
            shots:         [Math.max(homeGoals*2, Math.floor(Math.random()*8)+8), Math.max(awayGoals*2, Math.floor(Math.random()*8)+8)],
            shotsOnTarget: [homeGoals + Math.floor(Math.random()*4)+2, awayGoals + Math.floor(Math.random()*4)+2],
            corners:       [Math.floor(Math.random()*8)+2, Math.floor(Math.random()*8)+2],
            fouls:         [Math.floor(Math.random()*12)+8, Math.floor(Math.random()*12)+8],
            yellowCards:   [Math.floor(Math.random()*4), Math.floor(Math.random()*4)],
            redCards:      [Math.random()<0.1?1:0, Math.random()<0.1?1:0],
            offsides:      [Math.floor(Math.random()*4), Math.floor(Math.random()*4)],
            passes:        [Math.floor(homePoss*5+Math.random()*100), Math.floor(awayPoss*5+Math.random()*100)],
            passAccuracy:  [Math.floor(70+Math.random()*20), Math.floor(70+Math.random()*20)],
            saves:         [awayGoals>0?Math.floor(Math.random()*5)+2:0, homeGoals>0?Math.floor(Math.random()*5)+2:0]
        };
    }

    // ── Generar goleadores ────────────────────────────────────────
    function generateScorers(team, numGoals, gs) {
        if (numGoals === 0) return [];
        const myTeam = gs?.team;
        let pool = ['García','Martínez','López','Sánchez','González','Pérez','Rodríguez','Fernández','Jiménez','Romero'];

        if (team === myTeam && gs?.lineup?.length) {
            const outfield = gs.lineup.filter(p => p.position !== 'POR').map(p => p.name);
            if (outfield.length) pool = outfield;
        } else {
            try {
                const stored = localStorage.getItem('team_data_' + team);
                if (stored) {
                    const data = JSON.parse(stored);
                    const names = (data.squad||[]).filter(p=>p.position!=='POR').map(p=>p.name);
                    if (names.length) pool = names;
                }
            } catch(e) {}
        }

        const used = new Set();
        return Array.from({length: numGoals}, () => {
            let min;
            do { min = Math.floor(Math.random()*90)+1; } while (used.has(min));
            used.add(min);
            return { name: pool[Math.floor(Math.random()*pool.length)], minute: min, team };
        }).sort((a,b) => a.minute - b.minute);
    }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        if (!window.gameLogic || !document.querySelector('.quadrant.top-left')) {
            setTimeout(init, 400); return;
        }
        hookMatchSummary();
        createLastResultPage();
        patchTopLeftButtons();
        console.log('[LastResult] ✅ v1.0 listo');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : setTimeout(init, 200);

})();
