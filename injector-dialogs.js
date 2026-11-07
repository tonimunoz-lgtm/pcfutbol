// ============================================================
// injector-dialogs.js — Ventanas del juego (se carga el primero)
// - pcfNotify(título, mensaje)        → aviso con botón Aceptar
// - pcfConfirm(título, mensaje, opts) → Promise<boolean>
// - pcfConfirmText(mensaje)            → igual, con título genérico
// - pcfPrompt(mensaje, valorInicial)  → Promise<string|null>
// - pcfToast(mensaje, {type, duration}) → aviso breve NO bloqueante (success | error | warn | info)
// - window.alert queda redirigido: mensajes cortos → toast; mensajes largos → ventana del juego (en cola).
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
        .pcf-dlg-back{position:fixed;inset:0;background:rgba(2,8,20,.72);display:flex;align-items:center;justify-content:center;z-index:2147483000}
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

    // ── Clasificación del mensaje (por su texto completo, en el momento de la llamada) ──
    const EMOJI_START = /^\p{Extended_Pictographic}/u;
    function classify(message) {
        const t = String(message ?? '').trim();
        const lines = (t.match(/\n/g) || []).length;
        const long = t.length > 170 || lines >= 2;
        const lead = t.replace(/^[\s"'`]+/, '');
        let type = 'info';
        if (/^(✅|✔|🎉|🏆|💾|☁️|💰|🎖️)/u.test(lead) || /\b(correctamente|guardad[oa]s?|con éxito|completad[oa]s?|actualizad[oa]s?|enviad[oa]s?|aceptad[oa]s?|contratad[oa]s?|fichad[oa]s?|renovad[oa]s?)\b/i.test(t)) type = 'success';
        if (/^(⚠️?|⚡)/u.test(lead) || /^(introduce|selecciona|elige|escribe|por favor|indica|rellena|debes|debe ser|el (salario|precio|importe) debe)/i.test(lead)) type = 'warn';
        if (/^(❌|⛔|🚫|🔴)/u.test(lead) || /(^error\b|\berror\b[:\s]|no se pudo|no se ha podido|no puedes|no puede|no hay |no tienes|inválid|imposible|insuficiente|rechaz|sancionad|lesionad|fallo|falló|no encontrad|ya no es |no est[aá] disponible|solo puedes|no se ha importado|no est[aá] implementad)/i.test(t)) type = 'error';
        return { type, long };
    }
    const ICON = { success: '✅', error: '⛔', warn: '⚠️', info: 'ℹ️' };
    const TITLE = { success: 'Hecho', error: 'Aviso', warn: 'Atención', info: 'Información' };

    // ── Avisos breves (toast): no bloquean, se cierran solos y se pueden tocar para descartar ──
    function ensureToastStyles() {
        if (document.getElementById('pcfToastStyles')) return;
        const st = document.createElement('style');
        st.id = 'pcfToastStyles';
        st.textContent = `
        #pcfToasts{position:fixed;left:50%;transform:translateX(-50%);top:10px;z-index:2147483100;display:flex;flex-direction:column;gap:8px;width:min(92vw,460px);pointer-events:none}
        .pcf-toast{pointer-events:auto;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:4px;color:#e6eefb;font-family:'Saira Condensed',sans-serif;
            font-size:.98rem;line-height:1.3;background:linear-gradient(180deg,#14305c,#0b1f40);border:1px solid #7aa0d4;border-left-width:5px;box-shadow:0 10px 28px rgba(0,0,0,.55);
            cursor:pointer;animation:pcfToastIn .22s ease-out}
        .pcf-toast.success{border-left-color:#4caf50}.pcf-toast.warn{border-left-color:#ffb300}.pcf-toast.info{border-left-color:#4aa3ff}
        .pcf-toast.error{border-left-color:#f44336;background:linear-gradient(180deg,#3a1620,#240d14)}
        .pcf-toast .pcf-ti{flex:0 0 auto;font-size:1.1rem;line-height:1.15}.pcf-toast .pcf-tm{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;white-space:pre-line}
        @keyframes pcfToastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion:reduce){.pcf-toast{animation:none}}`;
        (document.head || document.documentElement).appendChild(st);
    }
    let lastToast = { msg: '', at: 0 };
    window.pcfToast = function (message, { type = 'info', duration } = {}) {
        if (!document.body) return;
        const text = String(message ?? '').trim();
        if (!text) return;
        const now = Date.now();
        if (text === lastToast.msg && now - lastToast.at < 1500) return;      // mismo aviso repetido: se ignora
        lastToast = { msg: text, at: now };
        ensureToastStyles();
        let box = document.getElementById('pcfToasts');
        if (!box) { box = document.createElement('div'); box.id = 'pcfToasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
        const header = document.querySelector('.header');
        const top = header ? Math.min(140, Math.round(header.getBoundingClientRect().bottom) + 8) : 10;
        box.style.top = Math.max(10, top) + 'px';
        const el = document.createElement('div');
        el.className = 'pcf-toast ' + type;
        el.setAttribute('role', type === 'error' ? 'alert' : 'status');
        const icon = EMOJI_START.test(text) ? '' : `<span class="pcf-ti">${ICON[type] || ''}</span>`;
        el.innerHTML = `${icon}<span class="pcf-tm"></span>`;
        el.querySelector('.pcf-tm').textContent = text;
        const remove = () => { clearTimeout(timer); el.remove(); };
        el.addEventListener('click', remove);
        const base = { success: 3500, info: 4500, warn: 5500, error: 6500 }[type] || 4500;
        const timer = setTimeout(remove, duration || Math.min(12000, base + text.length * 35));
        box.appendChild(el);
        while (box.children.length > 3) box.firstElementChild.remove();           // como mucho 3 a la vez
    };

    // Todos los alert() del juego: cortos → aviso breve; largos → ventana del juego (en cola)
    window.alert = function (message) {
        if (!document.body) return nativeAlert(message);
        const { type, long } = classify(message);
        if (long) { window.pcfNotify(`${ICON[type]} ${TITLE[type]}`, message); return; }
        window.pcfToast(message, { type });
    };
    // Precio de venta: nunca por encima de la cláusula de rescisión (cualquiera puede pagarla, así que como máximo
    // se cobraría la cláusula). Devuelve el precio ya ajustado y avisa si se ha cambiado.
    window.pcfClampToClause = function (player, price) {
        const clause = Number(player?.releaseClause) || 0;
        const p = Number(price) || 0;
        if (clause > 0 && p > clause) {
            window.pcfToast(`El precio no puede superar la cláusula de rescisión (${clause.toLocaleString('es-ES')}€): se ha ajustado a ese importe.`, { type: 'warn' });
            return clause;
        }
        return p;
    };
    window.pcfClassifyMessage = classify;
    window.__nativeAlert = nativeAlert;
})();
