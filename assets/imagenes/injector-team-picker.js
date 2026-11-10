// ============================================================
// injector-team-picker.js — «Selecciona tu equipo»: escudos en las insignias de los botones
// La plantilla de index.html pone en cada botón una insignia con iniciales (.tp-crest). Aquí se sustituye por el escudo del equipo
// cuando el catálogo (memoria o localStorage) lo trae, y se pide el catálogo en segundo plano al abrir la ventana para que
// los escudos aparezcan en unos segundos aunque aún no se haya empezado ninguna partida.
// ============================================================
(function () {
    'use strict';
    const SAFE = /^(https?:\/\/|data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);base64,|\.?\/?assets\/)/i;   // mismas reglas que safeImageURL
    function logoOf(name) {
        let logo = window.getCachedTeamData && window.getCachedTeamData(name) && window.getCachedTeamData(name).logo;
        if (!logo) { try { const raw = localStorage.getItem('team_data_' + name); if (raw) logo = JSON.parse(raw).logo; } catch (e) { /* */ } }
        return typeof logo === 'string' && SAFE.test(logo.trim()) ? logo.trim() : '';
    }
    function fill() {
        const modal = document.getElementById('selectTeamModal');
        if (!modal) return 0;
        let pending = 0;
        modal.querySelectorAll('.tp-crest[data-team]:not([data-done])').forEach(el => {
            const logo = logoOf(decodeURIComponent(el.dataset.team));
            if (!logo) { pending++; return; }
            const img = new Image();
            img.alt = ''; img.decoding = 'async'; img.loading = 'lazy'; img.src = logo;
            img.onerror = () => { img.remove(); el.dataset.done = ''; el.removeAttribute('data-done'); el.dataset.failed = '1'; };
            el.textContent = ''; el.appendChild(img); el.dataset.done = '1'; el.classList.add('has-logo');
        });
        return pending;
    }
    let timer = null, asked = false;
    function onOpen() {
        fill();
        if (!asked && typeof window.preloadTeamCatalog === 'function') {                 // trae el catálogo en segundo plano (una vez por sesión)
            asked = true;
            Promise.resolve(window.preloadTeamCatalog({ quiet: true })).then(fill).catch(() => {});
        }
        clearInterval(timer);
        let n = 0;
        timer = setInterval(() => { n++; if (fill() === 0 || n > 20 || !document.getElementById('selectTeamModal')?.classList.contains('active')) clearInterval(timer); }, 1500);
    }
    function watch() {
        const modal = document.getElementById('selectTeamModal');
        if (!modal) { setTimeout(watch, 600); return; }
        let t = 0;
        new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; if (modal.classList.contains('active')) onOpen(); }, 120); })
            .observe(modal, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    window.pcfTeamPickerFill = fill;
    watch();
})();
