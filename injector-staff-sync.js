// injector-staff-sync.js — Panel «Reunión del cuerpo técnico» en Personal del Club.
// Muestra, por cada hueco de plantilla, cómo se pasan la información los empleados (segundo entrenador → juveniles → ojeador → secretario → médico)
// y deja actuar con un botón (subir al canterano, negociar con el objetivo del ojeador, ofertar por su cláusula).
// La lógica vive en staff-sync.js / gameLogic.js (runStaffMeeting); aquí solo se pinta.
(function () {
    'use strict';
    if (window.__pcfStaffSyncUI) return;
    window.__pcfStaffSyncUI = true;
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ROLE = { segundoEntrenador: ['Segundo Entrenador', 'segundo-entrenador'], entrenadorJuveniles: ['Entrenador de Juveniles', 'entrenador-juveniles'], scout: ['Ojeador', 'ojeador'],
        secretario: ['Secretario Técnico', 'secretario-tecnico'], medico: ['Médico', 'medico'], fisio: ['Fisioterapeuta', 'fisioterapeuta'], entrenador: ['Entrenador Físico', 'entrenador-fisico'],
        entrenadorPorteros: ['Entrenador de Porteros', 'entrenador-porteros'], analista: ['Analista de Vídeo', 'analista'] };
    const LEVEL = { crit: ['Urgente', 'crit'], warn: ['Falta profundidad', 'warn'] };

    function css() {
        if (document.getElementById('pcfStaffSyncCss')) return;
        const st = document.createElement('style'); st.id = 'pcfStaffSyncCss';
        st.textContent = `#pcfStaffSync{margin:12px 30px 4px;padding:12px 18px;border:2px solid #3f7fe0;border-radius:14px;background:linear-gradient(180deg,rgba(10,34,78,.90),rgba(4,16,40,.94));color:#e6f0ff;box-shadow:0 0 16px rgba(70,150,255,.40)}
        #pcfStaffSync h3{margin:0 0 4px;color:#ffd24a;font-family:'Saira Condensed',sans-serif;font-style:italic;font-weight:800;font-size:1.15rem;letter-spacing:.05em;text-transform:uppercase}
        #pcfStaffSync .ss-sub{font-size:.8rem;opacity:.75;margin:0 0 8px}
        #pcfStaffSync .ss-card{border-top:1px solid rgba(122,160,212,.3);padding:10px 0}#pcfStaffSync .ss-card:first-of-type{border-top:0}
        #pcfStaffSync .ss-tag{display:inline-block;padding:1px 9px;border-radius:10px;font-size:.72rem;font-weight:700;margin-right:6px}
        #pcfStaffSync .ss-tag.crit{background:rgba(255,87,34,.2);color:#ffab91;border:1px solid #ff5722}
        #pcfStaffSync .ss-tag.warn{background:rgba(255,193,7,.2);color:#ffd54f;border:1px solid #ffc107}
        #pcfStaffSync .ss-tag.ok{background:rgba(76,175,80,.2);color:#a5d6a7;border:1px solid #4caf50}
        #pcfStaffSync .ss-line{display:flex;gap:8px;align-items:flex-start;margin:6px 0 0;font-size:.88rem;line-height:1.4}
        #pcfStaffSync .ss-ic{flex:0 0 24px;width:24px;height:24px;border-radius:50%;object-fit:cover;background:#10264d;margin-top:1px}
        #pcfStaffSync .ss-who{color:#9fc4ff;font-weight:700}
        #pcfStaffSync .ss-act{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 0 32px}
        #pcfStaffSync .ss-empty{font-size:.86rem;opacity:.85;line-height:1.45}
        @media (max-width:767px){#pcfStaffSync{margin:8px 8px 4px;padding:10px 12px}#pcfStaffSync .ss-act{margin-left:0}#pcfStaffSync .ss-act .btn{flex:1 1 100%}}`;
        document.head.appendChild(st);
    }
    const line = l => { const [name, icon] = ROLE[l.role] || [l.role, '']; return `<div class="ss-line"><img class="ss-ic" src="assets/iconos/personal/${icon}.webp" alt="" onerror="this.style.visibility='hidden'"><div><span class="ss-who">${esc(name)}:</span> ${esc(l.text)}</div></div>`; };

    function render() {
        const page = document.getElementById('staff'); const s = gs(); if (!page || !s) return;
        css();
        let box = document.getElementById('pcfStaffSync');
        if (!box) { box = document.createElement('div'); box.id = 'pcfStaffSync'; const t = page.querySelector('table'); (t ? t.parentNode : page).insertBefore(box, t || null); }
        const b = s.staffBrief, hired = Object.values(s.staff || {}).filter(Boolean).length;
        let body;
        if (!hired) body = '<div class="ss-empty">Aún no tienes empleados. Contrata un segundo entrenador, un ojeador, un secretario técnico o un médico: se coordinarán entre ellos para detectar y cubrir los huecos de tu plantilla.</div>';
        else if (!b) body = '<div class="ss-empty">El cuerpo técnico se reunirá tras la próxima jornada.</div>';
        else {
            const cards = [];
            if (!s.staff?.segundoEntrenador) cards.push('<div class="ss-card"><span class="ss-tag warn">Sin segundo entrenador</span><div class="ss-line">Sin un segundo entrenador nadie analiza los huecos de la plantilla: el resto del cuerpo técnico no sabe qué hace falta.</div></div>');
            for (const n of b.needs || []) {
                const acts = (n.actions || []).map(a => `<button class="btn btn-sm" data-ss="${esc(a.type)}" data-name="${esc(a.name)}" data-club="${esc(a.club || '')}" data-id="${esc(a.id || '')}">${esc(a.label)}</button>`).join('');
                const cover = n.cover?.kind === 'academy' ? '<span class="ss-tag ok">Cubierto por la cantera</span>' : n.cover?.kind === 'market' ? '<span class="ss-tag ok">Objetivos localizados</span>' : n.cover?.kind === 'clause' ? '<span class="ss-tag ok">Objetivo por cláusula</span>' : '';
                cards.push(`<div class="ss-card"><span class="ss-tag ${LEVEL[n.level][1]}">${LEVEL[n.level][0]} · ${esc(n.pos)}</span>${cover}${(n.chain || []).map(line).join('')}${acts ? `<div class="ss-act">${acts}</div>` : ''}</div>`);
            }
            if ((b.medical || []).length) cards.push(`<div class="ss-card"><span class="ss-tag warn">Servicio médico</span>${b.medical.map(line).join('')}</div>`);
            if ((b.contracts || []).length) cards.push(`<div class="ss-card"><span class="ss-tag warn">Contratos</span>${b.contracts.map(line).join('')}</div>`);
            body = cards.length ? cards.join('') : '<div class="ss-empty"><span class="ss-tag ok">Todo en orden</span> El cuerpo técnico no ve huecos en la plantilla: hay profundidad en todos los puestos y nadie está al límite.</div>';
        }
        box.innerHTML = `<h3>Reunión del cuerpo técnico</h3><p class="ss-sub">Los empleados se pasan la información entre ellos cada jornada.${b ? '' : ''}</p>${body}`;
        box.querySelectorAll('[data-ss]').forEach(btn => btn.onclick = () => act(btn.dataset));
    }

    async function act(d) {
        const G = gl(); if (!G) return;
        const done = () => { window.ui?.refreshUI?.(gs()); window.pcfStaffMeeting?.(); G.updateGameState?.({}); render(); };
        if (d.ss === 'promote') {
            const r = G.promoteYoungster(d.name);
            (window.pcfNotify || (async (t, m) => alert(t + '\n\n' + m)))(r.success ? 'Cantera' : 'No se puede subir', r.message || (r.success ? `${d.name} sube al primer equipo.` : ''));
            done();
        } else if (d.ss === 'negotiate') {
            const p = gs()?.staffBriefPlayers?.[d.name];
            if (p && window.startNegotiationUI) { window.openPage?.('transfers'); window.startNegotiationUI(encodeURIComponent(JSON.stringify(p))); }
            else (window.pcfNotify || alert)('Fichaje', 'No encuentro ya a ese jugador en el mercado. Busca en Fichajes.');
        } else if (d.ss === 'clause') {
            window.openPage?.('transfers');
            if (window.payReleaseClause) window.payReleaseClause(encodeURIComponent(JSON.stringify({ id: d.id, club: d.club, name: d.name })));
        }
    }

    function hook() {
        const op = window.openPage;
        if (typeof op === 'function' && !op._pcfStaffSync) {
            window.openPage = function (id, ...a) { const r = op.call(this, id, ...a); if (id === 'staff') setTimeout(render, 150); return r; };
            window.openPage._pcfStaffSync = true;
        }
        const us = window.updateStaffDisplay;
        if (typeof us === 'function' && !us._pcfStaffSync) { const w = function () { const r = us.apply(this, arguments); try { render(); } catch (_) { /* */ } return r; }; w._pcfStaffSync = true; window.updateStaffDisplay = w; }
    }
    function init() { hook(); [1500, 4000, 8000, 12000].forEach(ms => setTimeout(hook, ms)); if (document.getElementById('staff')?.classList.contains('active')) render(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
