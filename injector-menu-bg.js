// ============================================================
// injector-menu-bg.js — Fondo del menú principal (prueba)
// Imagen de cuatro cuadrantes con círculo central (assets/imagenes/fondo-menu.webp, 1818×865). Se coloca detrás de .main-layout
// de modo que el círculo de la imagen quede centrado sobre el círculo real de «Próximo partido». En móvil, donde ese círculo se
// aplana en una barra, la imagen solo hace de fondo. Para desactivarlo: window.PCF_MENU_BG = false antes de cargar este fichero.
// ============================================================
(function () {
    'use strict';
    if (window.PCF_MENU_BG === false) return;
    // Imagen de fondo y posición de su «lente» central EN PROPORCIÓN (cx, cy: centro; lens: diámetro del cristal, respecto al ancho).
    // Para usar otra imagen, define antes de cargar este fichero:  window.PCF_MENU_BG_IMAGE = { src: 'assets/imagenes/otra.webp', cx: .5006, cy: .507, lens: .1495 }
    const CFG = Object.assign({ src: 'assets/imagenes/fondo-menu.webp', cx: 0.4989, cy: 0.4740, lens: 0.1353, w: 1818, h: 865 }, window.PCF_MENU_BG_IMAGE || {});
    const IMG = { src: CFG.src, w: CFG.w, h: CFG.h, cx: CFG.cx * CFG.w, cy: CFG.cy * CFG.h, lens: CFG.lens * CFG.w };
    const css = document.createElement('style');
    css.id = 'pcfMenuBgStyles';
    css.textContent = `
    body.pcf-menu-bg .main-layout { background-color:#030a1a; background-repeat:no-repeat;
        background-image:linear-gradient(rgba(3,10,26,0), rgba(3,10,26,.06)), url(${IMG.src}); background-size:cover; background-position:50% 50%; }
    body.pcf-menu-bg .quadrant { background-color:transparent; border:1px solid rgba(85,136,255,.22);
        box-shadow:inset 0 0 40px rgba(0,0,0,.22); }
    @media (max-width: 760px) {
        body.pcf-menu-bg .main-layout { background-image:linear-gradient(rgba(3,10,26,.35), rgba(3,10,26,.50)), url(${IMG.src}); background-size:cover; background-position:50% 30%; }
        body.pcf-menu-bg .quadrant { background-color:rgba(3,12,30,.22); }
    }`;
    document.head.appendChild(css);
    // Si se sustituye la imagen por otra de distinto tamaño, se toma su tamaño real (la posición de la lente se da en proporción: cx/w, cy/h)
    const probe = new Image();
    probe.onload = () => { if (probe.naturalWidth > 0) { const kx = probe.naturalWidth / IMG.w, ky = probe.naturalHeight / IMG.h; IMG.cx *= kx; IMG.lens *= kx; IMG.cy *= ky; IMG.w = probe.naturalWidth; IMG.h = probe.naturalHeight; } };
    probe.src = IMG.src;

    function align() {
        const layout = document.querySelector('.main-layout');
        const circle = layout && layout.querySelector('.main-center-circle');
        if (!layout || !circle) return;
        document.body.classList.add('pcf-menu-bg');
        const L = layout.getBoundingClientRect(), C = circle.getBoundingClientRect();
        if (!L.width || !L.height) return;                                   // menú oculto (hay una página abierta)
        if (window.innerWidth <= 760 || C.width > 400 || C.width < 100) { layout.style.backgroundSize = ''; layout.style.backgroundPosition = ''; layout.style.removeProperty('--pcf-circle-d'); return; }
        const S = Math.max(L.width / IMG.w, L.height / IMG.h) * 1.04;          // escala «cover» con un poco de margen
        const dw = IMG.w * S, dh = IMG.h * S;
        const ccx = C.left + C.width / 2 - L.left, ccy = C.top + C.height / 2 - L.top;
        // el punto (cx, cy) de la imagen debe caer en el centro del círculo real; sin dejar huecos en los bordes
        const x = Math.min(0, Math.max(L.width - dw, ccx - IMG.cx * S));
        const y = Math.min(0, Math.max(L.height - dh, ccy - IMG.cy * S));
        // el círculo real tapa justo el cristal de la lente de la imagen: se ve su aro metálico alrededor
        layout.style.setProperty('--pcf-circle-d', Math.round(Math.min(Math.max(IMG.lens * S, 190), L.height * 0.46)) + 'px');
        layout.style.backgroundSize = `${dw}px ${dh}px`;
        layout.style.backgroundPosition = `${x}px ${y}px`;
    }
    // Identidad por secciones: cada pantalla toma el color de su cuadrante del menú (ver pcf-menu-theme.css)
    const SECTION = { info: ['dashboard', 'standings', 'calendar', 'last-result', 'trophies', 'museum'], team: ['lineup', 'tactics', 'rival-analysis'],
        market: ['transfers', 'negotiations', 'squad', 'academy'], mgmt: ['staff', 'finance', 'commercial', 'facilities'] };
    function tagPages() {
        for (const [sec, ids] of Object.entries(SECTION)) for (const id of ids) { const el = document.getElementById(id); if (el && el.dataset.section !== sec) el.dataset.section = sec; }
    }
    const kick = () => { tagPages(); requestAnimationFrame(align); };
    window.addEventListener('resize', kick);
    window.addEventListener('load', kick);
    document.fonts?.ready?.then(kick);
    if (window.ResizeObserver) { const t = setInterval(() => { const l = document.querySelector('.main-layout'); if (l) { new ResizeObserver(kick).observe(l); clearInterval(t); kick(); } }, 300); }
    setInterval(() => { tagPages(); align(); }, 2000);                                               // por si el menú vuelve a mostrarse tras cerrar una página
})();
