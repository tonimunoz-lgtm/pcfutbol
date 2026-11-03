// ============================================================
// injector-dialogs.js — Ventanas del juego (se carga el primero)
// - pcfNotify(título, mensaje)        → aviso con botón Aceptar
// - pcfConfirm(título, mensaje, opts) → Promise<boolean>
// - pcfConfirmText(mensaje)            → igual, con título genérico
// - pcfPrompt(mensaje, valorInicial)  → Promise<string|null>
// - window.alert queda redirigido a la ventana del juego (en cola).
//   confirm()/prompt() del navegador no se pueden sustituir sin cambiar
//   a quien los llama (esperan la respuesta); por eso se usan las
//   versiones de arriba con await.
// ============================================================
(function () {
    'use strict';
    if (window.__pcfDialogs) return;
    window.__pcfDialogs = true;
    const nativeAlert = window.alert.bind(window);

    function ensureStyles() {
        if (document.getElementById('pcfDialogStyles')) return;
        const st = document.createElement('style');
        st.id = 'pcfDialogStyles';
        st.textContent = `
        .pcf-dlg-back{position:fixed;inset:0;background:rgba(2,8,20,.72);display:flex;align-items:center;justify-content:center;z-index:300000}
        .pcf-dlg{background:linear-gradient(180deg,#14305c 0%,#0b1f40 100%);border:1px solid #7aa0d4;box-shadow:0 0 0 1px #06142e,0 18px 40px rgba(0,0,0,.6);
            border-radius:4px;max-width:480px;width:calc(100% - 32px);color:#e6eefb;font-family:'Saira Condensed',sans-serif;max-height:88vh;display:flex;flex-direction:column}
        .pcf-dlg h3{margin:0;padding:12px 16px;background:linear-gradient(180deg,#1c3e74,#102a52);border-bottom:1px solid #7aa0d4;
            color:var(--pcf-gold,#ffd24a);letter-spacing:.08em;text-transform:uppercase;font-size:1rem}
        .pcf-dlg .pcf-dlg-body{padding:16px;line-height:1.45;white-space:pre-line;font-size:.95rem;overflow-y:auto}
        .pcf-dlg .pcf-dlg-body input{width:100%;margin-top:10px;padding:8px;border-radius:3px;border:1px solid #06142e;background:#e8eef8;color:#0a1a35;font-size:1rem}
        .pcf-dlg .pcf-dlg-actions{display:flex;gap:8px;justify-content:flex-end;padding:0 16px 16px}
        .pcf-dlg .pcf-spin{display:inline-block;width:14px;height:14px;border:2px solid #7aa0d4;border-top-color:transparent;border-radius:50%;animation:pcfspin .8s linear infinite;vertical-align:-2px;margin-right:8px}
        @keyframes pcfspin{to{transform:rotate(360deg)}}`;
        (document.head || document.documentElement).appendChild(st);
    }

    // Una ventana detrás de otra
    let chain = Promise.resolve();
    function dialog({ title, message, buttons, input }) {
        const run = () => new Promise(resolve => {
            ensureStyles();
            const back = document.createElement('div');
            back.className = 'pcf-dlg-back';
            back.innerHTML = `<div class="pcf-dlg" role="dialog" aria-modal="true"><h3></h3><div class="pcf-dlg-body"></div><div class="pcf-dlg-actions"></div></div>`;
            back.querySelector('h3').textContent = title || 'PC Fútbol Manager';
            const body = back.querySelector('.pcf-dlg-body');
            body.textContent = message == null ? '' : String(message);
            let field = null;
            if (input) {
                field = document.createElement('input');
                field.type = 'text';
                field.value = input.value || '';
                body.appendChild(field);
            }
            const actions = back.querySelector('.pcf-dlg-actions');
            const close = v => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
            buttons.forEach(b => {
                const el = document.createElement('button');
                el.className = 'btn' + (b.danger ? ' admin-btn-red' : '');
                el.textContent = b.label;
                el.onclick = () => close(b.value === '__input__' ? (field ? field.value : '') : b.value);
                actions.appendChild(el);
            });
            const onKey = e => {
                if (e.key === 'Escape') { e.stopPropagation(); close(buttons.find(b => b.cancel)?.value ?? buttons[buttons.length - 1].value); }
                if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); actions.querySelector('button:last-child').click(); }
            };
            document.addEventListener('keydown', onKey, true);
            (document.body || document.documentElement).appendChild(back);
            (field || actions.querySelector('button:last-child'))?.focus();
        });
        const p = chain.then(run);
        chain = p.catch(() => {});
        return p;
    }

    window.pcfNotify = (title, message) =>
        dialog({ title, message, buttons: [{ label: 'Aceptar', value: true }] });
    window.pcfConfirm = (title, message, { okLabel = 'Aceptar', cancelLabel = 'Cancelar', danger = false } = {}) =>
        dialog({ title, message, buttons: [{ label: cancelLabel, value: false, cancel: true }, { label: okLabel, value: true, danger }] });
    window.pcfConfirmText = (message) => window.pcfConfirm('Confirmar', message);
    window.pcfPrompt = (message, value = '') =>
        dialog({ title: 'PC Fútbol Manager', message, input: { value },
                 buttons: [{ label: 'Cancelar', value: null, cancel: true }, { label: 'Aceptar', value: '__input__' }] });
    window.pcfThinking = (title, message, ms) => {
        ensureStyles();
        const back = document.createElement('div');
        back.className = 'pcf-dlg-back';
        back.innerHTML = `<div class="pcf-dlg"><h3></h3><div class="pcf-dlg-body"><span class="pcf-spin"></span><span></span></div></div>`;
        back.querySelector('h3').textContent = title;
        back.querySelector('.pcf-dlg-body span:last-child').textContent = message;
        document.body.appendChild(back);
        return new Promise(r => setTimeout(() => { back.remove(); r(); }, ms));
    };

    // Todos los alert() del juego → ventana del juego
    window.alert = function (message) {
        if (!document.body) return nativeAlert(message);
        window.pcfNotify('PC Fútbol Manager', message);
    };
    window.__nativeAlert = nativeAlert;
})();
