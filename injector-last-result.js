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
            // Guardar el objeto básico de resultado
            window._lastMatchResult = matchResult;

            // Llamar al original (construye y añade el modal al DOM)
            const ret = orig.call(this, matchResult);

            // Capturar el HTML interno del modal ya renderizado
            // (goleadores, stats, tarjetas y lesiones tal como los generó match-summary)
            setTimeout(() => {
                const modal = document.getElementById('matchSummaryModal');
                if (modal) {
                    const container = modal.querySelector('.match-container');
                    if (container) {
                        // Guardamos el innerHTML completo del contenedor, sin el botón cerrar
                        // y sin el botón continuar (los reemplazamos por los de la página)
                        let html = container.innerHTML;
                        // Quitar el botón ✖ cerrar del modal
                        html = html.replace(/<button[^>]*class="match-close"[^>]*>.*?<\/button>/s, '');
                        // Quitar el botón "Continuar" del footer
                        html = html.replace(/<div[^>]*class="match-footer"[^>]*>[\s\S]*?<\/div>/s, '');
                        window._lastMatchResultHTML = html;
                    }
                }
            }, 100);

            return ret;
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
            // Volcar el HTML exacto del modal dentro de un contenedor con el mismo estilo
            content.innerHTML = `
                <div class="match-container" style="max-width:700px;margin:0 auto;
                     background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:20px;
                     padding:30px;box-shadow:0 20px 60px rgba(0,0,0,.8);">
                    ${window._lastMatchResultHTML}
                </div>`;
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
