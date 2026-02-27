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

    // ── Ocultar secciones del dashboard que ya no necesitamos ─────
    const style = document.createElement('style');
    style.textContent = `
        #dashboard .data-grid { display: none !important; }
        #dashboard table      { display: none !important; }
    `;
    document.head.appendChild(style);

    // Ocultar el h2 "Estado Financiero" y dejamos "Últimas Noticias"
    // Lo hacemos por DOM una vez cargado para ser precisos
    function hideDashboardExtras() {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;
        dashboard.querySelectorAll('h2').forEach(h2 => {
            if (h2.textContent.trim() === 'Estado Financiero') h2.style.display = 'none';
        });
    }
    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', hideDashboardExtras)
        : hideDashboardExtras();

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
        //const dashBtn = topLeft.querySelector('button[onclick*="dashboard"]');
        //if (dashBtn) dashBtn.textContent = '📰 Noticias';

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

        // Inyectar los mismos estilos del modal pero con selector #last-result
        const style = document.createElement('style');
        style.innerHTML = `
            #last-result-content .match-container {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 20px;
                padding: 30px;
                max-width: 700px;
                width: 90%;
                margin: 0 auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
                position: relative;
            }
            #last-result-content .match-close { display: none; }
            #last-result-content .match-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 30px;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            }
            #last-result-content .match-team { text-align: center; }
            #last-result-content .team-name {
                font-size: 1.3em;
                font-weight: bold;
                color: #fff;
                margin-bottom: 10px;
            }
            #last-result-content .team-score {
                font-size: 3.5em;
                font-weight: bold;
                color: #4CAF50;
                text-shadow: 0 2px 10px rgba(76, 175, 80, 0.5);
            }
            #last-result-content .match-separator {
                font-size: 2.5em;
                color: rgba(255, 255, 255, 0.3);
            }
            #last-result-content h3 {
                color: #FFD700;
                margin: 25px 0 15px 0;
                font-size: 1.1em;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            #last-result-content .goals-list,
            #last-result-content .cards-list,
            #last-result-content .injuries-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 20px;
            }
            #last-result-content .goal-item,
            #last-result-content .card-item,
            #last-result-content .injury-item {
                background: rgba(255, 255, 255, 0.05);
                padding: 10px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 10px;
                border-left: 3px solid;
            }
            #last-result-content .goal-item.home,
            #last-result-content .card-item.home { border-color: #4CAF50; }
            #last-result-content .goal-item.away,
            #last-result-content .card-item.away { border-color: #FF5722; }
            #last-result-content .injury-item { border-color: #FF9800; }
            #last-result-content .goal-minute,
            #last-result-content .card-minute,
            #last-result-content .injury-minute {
                color: #FFD700;
                font-weight: bold;
                min-width: 35px;
            }
            #last-result-content .goal-scorer,
            #last-result-content .card-player,
            #last-result-content .injury-player {
                color: white;
                font-weight: 600;
                flex: 1;
            }
            #last-result-content .goal-team,
            #last-result-content .card-team,
            #last-result-content .injury-team {
                color: rgba(255, 255, 255, 0.5);
                font-size: 0.9em;
            }
            #last-result-content .card-icon { font-size: 1.2em; }
            #last-result-content .poss-row {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }
            #last-result-content .poss-label {
                color: white;
                min-width: 120px;
                font-size: 0.95em;
            }
            #last-result-content .poss-bar {
                flex: 1;
                height: 24px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                overflow: hidden;
            }
            #last-result-content .poss-fill { height: 100%; transition: width 1s ease-out; }
            #last-result-content .poss-fill.home { background: linear-gradient(90deg, #4CAF50, #66BB6A); }
            #last-result-content .poss-fill.away { background: linear-gradient(90deg, #FF5722, #FF7043); }
            #last-result-content .poss-value {
                color: #FFD700;
                font-weight: bold;
                min-width: 45px;
                text-align: right;
            }
            #last-result-content .stats-table { width: 100%; border-collapse: collapse; }
            #last-result-content .stats-table tr { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
            #last-result-content .stats-table td { padding: 12px 8px; color: white; }
            #last-result-content .stat-name {
                text-align: center;
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.9em;
            }
            #last-result-content .stat-home,
            #last-result-content .stat-away { font-weight: bold; font-size: 1.1em; }
            #last-result-content .stat-home { text-align: right; color: #4CAF50; }
            #last-result-content .stat-away { text-align: left; color: #FF5722; }
            #last-result-content .match-footer { display: none; }
        `;
        document.head.appendChild(style);

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
        const content = document.getElementById('last-result-content');

        if (!window._lastMatchResultHTML) {
            if (content) content.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#555;">
                    <div style="font-size:3em;margin-bottom:16px;">📭</div>
                    <div style="font-size:1.1em;">Todavía no has jugado ningún partido esta temporada.</div>
                </div>`;
            if (window.openPage) window.openPage('last-result');
            return;
        }

        if (content) {
            content.innerHTML = `<div class="match-container">${window._lastMatchResultHTML}</div>`;
        }
        if (window.openPage) window.openPage('last-result');
    };

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
