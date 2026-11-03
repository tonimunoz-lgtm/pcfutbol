// ============================================================
// injector-skin.js
// 1) Aplica el estilo común del juego a las ventanas que se construyeron
//    con colores propios (Centro de entrenamiento, Búsqueda de promesas,
//    Gestión comercial): fondos, títulos, botones y textos del tema.
// 2) Abreviaturas con su nombre completo al pasar el ratón, y "OVR"
//    pasa a llamarse "MEDIA".
// ============================================================
(function () {
    'use strict';

    // ── Abreviaturas ────────────────────────────────────────────
    const ABBR = {
        OVR: 'Media: valoración global del jugador según su posición', MEDIA: 'Media: valoración global del jugador según su posición',
        POT: 'Potencial: la media máxima que puede alcanzar', POS: 'Posición', PIE: 'Pie dominante', EDAD: 'Edad',
        EN: 'Energía', VE: 'Velocidad', RE: 'Resistencia', AG: 'Agilidad', CA: 'Cabezazo', EF: 'Eficacia', MO: 'Moral', AT: 'Ataque', DF: 'Defensa',
        PJ: 'Partidos jugados', G: 'Ganados', E: 'Empatados', P: 'Perdidos', GF: 'Goles a favor', GC: 'Goles en contra',
        DG: 'Diferencia de goles', GD: 'Diferencia de goles', PTS: 'Puntos', PT: 'Puntos',
        POR: 'Portero', DFC: 'Defensa central', LI: 'Lateral izquierdo', LD: 'Lateral derecho', MC: 'Centrocampista',
        MCO: 'Mediapunta', MD: 'Interior derecho', MI: 'Interior izquierdo', EXT: 'Extremo', DC: 'Delantero centro',
        'PRECIO P.': 'Precio que pide su club por el traspaso', 'CLÁUSULA': 'Cláusula de rescisión: pagándola, el club no puede negarse'
    };
    // Columna MEDIA resaltada en todas las tablas de jugadores
    function highlightMediaColumns(root) {
        (root || document).querySelectorAll('table').forEach(table => {
            const ths = [...table.querySelectorAll('thead th, tr:first-child th')];
            const idx = ths.findIndex(th => /^(MEDIA|OVR)$/i.test(th.textContent.trim()));
            if (idx < 0) return;
            ths[idx].classList.add('pcf-col-media');
            table.querySelectorAll('tbody tr').forEach(tr => {
                const td = tr.children[idx];
                if (td && !td.classList.contains('pcf-col-media')) td.classList.add('pcf-col-media');
            });
        });
    }
    function labelHeaders(root) {
        highlightMediaColumns(root);
        (root || document).querySelectorAll('th, .tc-xi-chip > span:first-child').forEach(el => {
            const raw = el.textContent.trim();
            const key = raw.toUpperCase();
            if (key === 'OVR' && el.tagName === 'TH') { el.textContent = 'MEDIA'; }
            const tip = ABBR[key];
            if (tip && !el.title) { el.title = tip; el.style.cursor = 'help'; }
        });
    }

    // ── Piel común ──────────────────────────────────────────────
    const MUTED = /#(?:888|999|aaa|666|555|777|bbb|ccc)\b|rgba\(255,\s*255,\s*255,\s*0?\.[2-5]\d*\)/i;
    function skin(root, sheet) {
        if (!root) return;
        if (sheet) sheet.classList.add('pcf-skin-sheet');
        root.querySelectorAll('div').forEach(d => {
            const st = d.getAttribute('style') || '';
            if (/background:\s*(#0a1628|#0d0d1a|#1a1a2e|#16213e|#0d1117|rgba\(255,255,255,\.0[3-8]\))/i.test(st) && d !== sheet) {
                d.classList.add('pcf-skin-box');
            }
            if (MUTED.test(st) && /color:/.test(st)) d.classList.add('pcf-skin-muted');
        });
        root.querySelectorAll('p, span, small, label').forEach(e => {
            const st = e.getAttribute('style') || '';
            if (MUTED.test(st)) e.classList.add('pcf-skin-muted');
        });
        root.querySelectorAll('h1, h2, h3').forEach(h => { h.style.color = ''; h.style.fontFamily = ''; });
        root.querySelectorAll('button:not([data-pcf-skin])').forEach(b => {
            b.dataset.pcfSkin = '1';
            const txt = b.textContent.trim();
            const close = /^✖|CERRAR|Cerrar|Cancelar/.test(txt);
            b.classList.add(close ? 'page-close-btn' : 'btn');
            if (close) b.classList.add('btn');
            ['background', 'border', 'borderRadius', 'color', 'boxShadow', 'fontFamily'].forEach(k => { b.style[k] = ''; });
        });
        root.querySelectorAll('select, input').forEach(i => { ['background', 'color', 'border', 'borderRadius'].forEach(k => { i.style[k] = ''; }); });
    }

    function skinTraining() {
        const panel = document.getElementById('trainingPanel');
        if (!panel || panel.style.display === 'none') return;
        const sheet = panel.firstElementChild;
        if (sheet) { sheet.style.background = ''; sheet.style.maxWidth = '1100px'; }
        skin(sheet, sheet);
        // Texto que explica cómo conviven automático y manual
        const p = panel.querySelector('#autoTrainingToggle')?.closest('div[style*="justify-content"]')?.querySelector('p');
        if (p && !p.dataset.pcfText) {
            p.dataset.pcfText = '1';
            p.textContent = 'Cada semana se entrena a un jugador en un atributo. En automático lo elige tu cuerpo técnico (el entrenador de porteros y el segundo entrenador se alternan). Si eliges tú en Plantilla, el entrenamiento pasa a manual.';
        }
    }
    function skinScout() {
        const m = document.getElementById('scoutSearchModal');
        if (!m || m.style.display === 'none') return;
        const sheet = m.firstElementChild;
        if (sheet) { sheet.style.background = ''; }
        skin(sheet, sheet);
    }
    // Gestión comercial en tarjetas por sección (como Caja), sin desplazamiento largo
    const COM_COLORS = ['#4fc3f7', '#ffd24a', '#aed581', '#ff8a65', '#ba68c8'];
    function layoutCommercial(page) {
        let grid = page.querySelector('.pcf-com-grid');
        // Contenido suelto a repartir: lo que va después del resumen y lo de fd-section
        const fd = page.querySelector('#fd-section');
        const loose = [];
        let afterGrid = false;
        [...page.children].forEach(el => {
            if (el.classList.contains('page-header') || el.classList.contains('data-grid') || el === grid || el === fd) { if (el.classList.contains('data-grid')) afterGrid = true; return; }
            if (afterGrid) loose.push(el);
        });
        if (fd) loose.push(...fd.children);
        if (!loose.length) return;
        if (!grid) {
            grid = document.createElement('div');
            grid.className = 'pcf-com-grid';
            const dg = page.querySelector('.data-grid');
            (dg || page.querySelector('.page-header')).insertAdjacentElement('afterend', grid);
        }
        let card = grid.lastElementChild;
        loose.slice().forEach(el => {
            if (el.tagName === 'H2') {
                card = document.createElement('div');
                card.className = 'pcf-com-card';
                card.style.setProperty('--sec', COM_COLORS[grid.children.length % COM_COLORS.length]);
                const label = document.createElement('div');
                label.className = 'pcf-com-label';
                label.textContent = el.textContent.trim();
                card.appendChild(label);
                grid.appendChild(card);
                el.remove();
                return;
            }
            if (!card) {
                card = document.createElement('div'); card.className = 'pcf-com-card'; card.style.setProperty('--sec', COM_COLORS[0]);
                grid.appendChild(card);
            }
            card.appendChild(el);
        });
        if (fd) fd.style.display = 'none';   // se queda vacío (evita que se vuelva a crear)
    }
    function skinCommercial() {
        const page = document.getElementById('commercial');
        if (!page || !page.classList.contains('active')) return;
        layoutCommercial(page);
        page.querySelectorAll('.pcf-com-card').forEach(sec => skin(sec, null));
    }

    let pending = false;
    const obs = new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
            pending = false;
            obs.disconnect();              // nuestros cambios no vuelven a disparar el observador
            try { skinTraining(); skinScout(); skinCommercial(); labelHeaders(); } finally { observe(); }
        });
    });
    const observe = () => obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    function start() {
        observe();
        labelHeaders();
    }
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
