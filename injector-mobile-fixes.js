// Ajustes solo para móvil: textos cortos en la pantalla de Personal del club.
// En escritorio se restauran los textos originales.
(function () {
    'use strict';
    const media = window.matchMedia('(max-width:767px), (max-height:500px) and (max-width:1100px)');
    const SHORT = {
        'Médico': 'Médico', 'Entrenador Físico': 'Ent. Físico', 'Entrenador Porteros': 'Ent. Porteros',
        'Fisioterapeuta': 'Fisio', 'Analista Vídeo': 'Analista', 'Ojeador': 'Ojeador',
        'Secretario Técnico': 'Sec. Técnico', 'Segundo Entrenador': 'Seg. Entrenador', 'Entrenador Juveniles': 'Ent. Juveniles'
    };
    function textNode(td) { return [...td.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()); }
    function apply() {
        const mobile = media.matches;
        document.querySelectorAll('#staff td.pcf-staff-role').forEach(td => {
            const node = textNode(td); if (!node) return;
            const full = td.dataset.full || node.textContent.trim();
            td.dataset.full = full;
            node.textContent = mobile ? (SHORT[full] || full) : full;
            td.title = full;
        });
        document.querySelectorAll('#staff button[id^="btnHire"]').forEach(b => {
            const t = b.textContent.trim();
            if (mobile && t === 'Contratar') b.textContent = 'Contr.';
            else if (!mobile && t === 'Contr.') b.textContent = 'Contratar';
            b.title = 'Contratar / cambiar';
        });
        const HEAD = { 'Nivel': 'Niv.', 'Cláusula': 'Cláus.', 'Acciones': 'Acción' };
        document.querySelectorAll('#staff thead th').forEach(th => {
            const full = th.dataset.full || th.textContent.trim();
            th.dataset.full = full;
            th.textContent = mobile ? (HEAD[full] || full) : full;
        });
        document.querySelectorAll('#staff td[id$="Name"]').forEach(td => {
            if (mobile && td.textContent.trim() === 'No Contratado') td.textContent = 'Vacante';
            else if (!mobile && td.textContent.trim() === 'Vacante') td.textContent = 'No Contratado';
        });
    }
    function install() {
        if (typeof window.updateStaffDisplay !== 'function') { setTimeout(install, 400); return; }
        if (!window.updateStaffDisplay._pcfShort) {
            const orig = window.updateStaffDisplay;
            window.updateStaffDisplay = function (...args) { const r = orig.apply(this, args); apply(); return r; };
            window.updateStaffDisplay._pcfShort = true;
        }
        apply();
    }
    media.addEventListener?.('change', apply);
    // Otros módulos añaden filas a la tabla (p. ej. Entrenador de Juveniles) después de pintarla.
    let pending = 0;
    const watch = () => {
        const page = document.getElementById('staff');
        if (!page) { setTimeout(watch, 500); return; }
        new MutationObserver(() => { if (pending) return; pending = setTimeout(() => { pending = 0; apply(); }, 50); })
            .observe(page, { childList: true, subtree: true });
    };
    watch();
    install();
})();

// Difumina el borde derecho de las tablas que se pueden desplazar en horizontal (señal de "hay más columnas").
(function () {
    'use strict';
    const SEL = '.pcf-player-scroll, .pcf-table-scroll';
    function update(box) {
        const more = box.scrollWidth - box.clientWidth - box.scrollLeft > 4;
        box.classList.toggle('pcf-more-right', more);
    }
    function bind(box) {
        if (box._pcfFade) { update(box); return; }
        box._pcfFade = true;
        box.addEventListener('scroll', () => update(box), { passive: true });
        update(box);
    }
    function scan() { document.querySelectorAll(SEL).forEach(bind); }
    let t = 0;
    new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = 0; scan(); }, 120); })
        .observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', () => document.querySelectorAll(SEL).forEach(update));
    scan();
})();
