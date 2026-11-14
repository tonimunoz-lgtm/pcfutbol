// ============================================================
// injector-staff-life.js — El personal del club tiene vida propia
// · Cada empleado tiene un ÁNIMO (0-100) que sube con los resultados y baja si lleva mucho tiempo sin subida
//   de sueldo o si ignoras sus peticiones.
// · Se quejan y piden subida de sueldo; otros clubes les hacen ofertas (si los dejas ir cobras su cláusula);
//   y si los desatiendes, acaban marchándose.
// · Hacen peticiones para mejorar el club: servicio médico, descarga del equipo, refuerzos y promesas de cantera.
// Los eventos usan el mismo sistema de decisiones que el vestuario (window.pcfEvents).
// Estado: staff[rol].mood, .raisedAt, .ignored
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();   // sin el mundo completo: se consulta cada pocos segundos
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const rnd = () => Math.random();
    const pick = a => a[Math.floor(rnd() * a.length)];
    const ROLES = ['medico', 'entrenador', 'entrenadorPorteros', 'fisio', 'analista', 'scout', 'secretario', 'segundoEntrenador', 'entrenadorJuveniles'];
    const SUFFIX = r => r.charAt(0).toUpperCase() + r.slice(1);
    function absWeek(s) { const y = parseInt(String(s.currentSeason).split('/')[0], 10) || 2026; return (y - 2000) * 50 + (s.seasonType === 'preseason' ? 0 : (s.week || 0)); }
    const money = (s, k, lo, hi) => Math.round(clamp((Number(s.weeklyExpenses) || 0) * k, lo, hi) / 1000) * 1000 || 1000;
    const moodOf = m => m === undefined ? 75 : m;
    const label = m => m >= 75 ? ['😀', 'Contento', 'good'] : m >= 50 ? ['🙂', 'Normal', 'ok'] : m >= 30 ? ['😠', 'Descontento', 'bad'] : ['🚪', 'Quiere marcharse', 'bad'];

    function setStaff(s, role, patch) {
        const st = { ...(s.staff || {}) };
        st[role] = patch === null ? null : { ...st[role], ...patch };
        return st;
    }
    // Atajo para las consecuencias de una decisión sobre un empleado
    function react(s, role, dMood, extra = {}, ignored = 0) {
        const c = s.staff[role];
        return setStaff(s, role, { mood: clamp(moodOf(c.mood) + dMood, 0, 100), ignored: (c.ignored || 0) + ignored, ...extra });
    }
    function recalc() { try { window.recalcWeekly?.(); } catch (e) {} try { window.ui?.refreshUI?.(gl().getViewState()); } catch (e) {} }
    const staffList = s => ROLES.filter(r => s.staff && s.staff[r]).map(r => ({ role: r, c: s.staff[r] }));
    const who = (c) => `${c.name} (${c.displayName})`;

    // ── Resultados recientes ─────────────────────────────────
    function winRate(s) {
        const mine = (s.matchHistory || []).filter(m => !m.playoff && !m.administrative && (m.home === s.team || m.away === s.team)).slice(-5);
        if (!mine.length) return .45;
        let pts = 0;
        for (const m of mine) { const [h, a] = String(m.score || '0-0').split('-').map(Number); const my = m.home === s.team ? h : a, op = m.home === s.team ? a : h; pts += my > op ? 1 : my === op ? .4 : 0; }
        return pts / mine.length;
    }

    // ── Actualización semanal del ánimo ─────────────────────
    let lastKey = '';
    function weeklyTick() {
        const s = gs(); if (!s || !s.team || !s.staff || s.seasonType === 'preseason') return;
        const key = `${s.currentSeason}|${s.week}`; if (key === lastKey) return;
        lastKey = key;
        const now = absWeek(s), wr = winRate(s);
        let staff = { ...s.staff }, changed = false; const news = [];
        for (const { role, c } of staffList(s)) {
            let m = moodOf(c.mood);
            const raisedAt = c.raisedAt ?? now;
            const stale = now - raisedAt > 26 ? .5 : 0;
            m = clamp(m + (wr - .45) * 3 - stale - (c.level >= 4 ? .2 : 0) + (65 - m) * .03, 0, 100);
            let nc = { ...c, mood: Math.round(m * 10) / 10, raisedAt };
            // Se marcha si está muy quemado tras haber sido ignorado
            if (m < 20 && (c.ignored || 0) >= 2) {
                staff[role] = null; changed = true;
                news.push([`💼 ${who(c)} se marcha del club: se sentía desatendido. Tienes el puesto vacante.`, 'warning']);
                continue;
            }
            staff[role] = nc; changed = true;
        }
        if (changed) { gl().updateGameState({ staff }); news.forEach(([t, k]) => gl().addNews?.(t, k)); if (news.length) { recalc(); } }
        paintMood();
    }

    // ── Catálogo de eventos de personal ─────────────────────
    const asked = (s, id, role, cd) => { const l = s.staffLife?.last?.[id + '|' + role]; return l !== undefined && absWeek(s) - l < cd; };
    function markAsked(s, id, role) { const sl = s.staffLife || { last: {} }; return { ...sl, last: { ...(sl.last || {}), [id + '|' + role]: absWeek(s) } }; }

    const EVENTS = [
        { id: 'staff_raise', w: 4, cd: 6, icon: '💶', title: 'Un empleado pide una subida de sueldo',
          priority: false,
          eligible(s) {
              const c = staffList(s).filter(x => moodOf(x.c.mood) < 50 && !asked(s, 'staff_raise', x.role, 24));
              if (!c.length) return null; const x = c.sort((a, b) => moodOf(a.c.mood) - moodOf(b.c.mood))[0];
              return { role: x.role, name: x.c.name, disp: x.c.displayName, salary: x.c.salary, nw: Math.max(x.c.salary + 100, Math.round(x.c.salary * 1.2 / 10) * 10) };
          },
          text: e => `${e.name}, tu ${e.disp.toLowerCase()}, pide hablar contigo: lleva tiempo sin una mejora (cobra ${fmt(e.salary)} €/sem) y no se siente valorado. Pide ${fmt(e.nw)} €/sem o empezará a escuchar ofertas.`,
          choices: [
              { label: `Subirle el sueldo a ${'+20 %'}`, tags: '💶 😀', run: (s, e) => ({ patch: { staff: react(s, e.role, 28, { salary: e.nw, raisedAt: absWeek(s), ignored: 0 }), staffLife: markAsked(s, 'staff_raise', e.role) }, result: `${e.name} acepta la subida: ahora cobra ${fmt(e.nw)} €/sem y recupera la motivación.`, after: recalc }) },
              { label: 'Pedirle paciencia', tags: '😐', run: (s, e) => { const ok = rnd() < .5; return { patch: { staff: react(s, e.role, ok ? 10 : -12, {}, ok ? 0 : 1), staffLife: markAsked(s, 'staff_raise', e.role) }, result: ok ? `${e.name} lo entiende y espera unas semanas más.` : `${e.name} se marcha con mala cara: «Siempre es lo mismo».` }; } },
              { label: 'Rechazar', tags: '😠 🚪', run: (s, e) => ({ patch: { staff: react(s, e.role, -20, {}, 1), staffLife: markAsked(s, 'staff_raise', e.role) }, result: `${e.name} no esconde su enfado. Si se repite, buscará otro club.` }) }
          ] },
        { id: 'staff_offer', w: 3, cd: 20, icon: '📨', title: 'Otro club quiere a uno de tus empleados',
          eligible(s) {
              const c = staffList(s).filter(x => x.c.level >= 3 && (moodOf(x.c.mood) < 70 || x.c.level === 5) && !asked(s, 'staff_offer', x.role, 40));
              if (!c.length || rnd() > .5) return null; const x = pick(c);
              const clubs = (s.leagueTeams || []).filter(t => t !== s.team); if (!clubs.length) return null;
              return { role: x.role, name: x.c.name, disp: x.c.displayName, club: pick(clubs), salary: x.c.salary, nw: Math.round(x.c.salary * 1.25 / 10) * 10, pay: Math.round(Math.max(x.c.clausula || 0, 5000) * 1.4 / 100) * 100 };
          },
          text: e => `El ${e.club} ha contactado con ${e.name}, tu ${e.disp.toLowerCase()}, y le ofrece mejores condiciones. Pagarían ${fmt(e.pay)} € por su cláusula. Espera tu respuesta.`,
          choices: [
              { label: `Igualar la oferta (${'+25 %'} de sueldo)`, tags: '💶 😀', run: (s, e) => ({ patch: { staff: react(s, e.role, 30, { salary: e.nw, raisedAt: absWeek(s), ignored: 0 }), staffLife: markAsked(s, 'staff_offer', e.role) }, result: `${e.name} se queda y renueva su compromiso: ${fmt(e.nw)} €/sem.`, after: recalc }) },
              { label: 'Dejarle marchar y cobrar', tags: '💶 🚪', run: (s, e) => ({ patch: { staff: setStaff(s, e.role, null), balance: (s.balance || 0) + e.pay, staffLife: markAsked(s, 'staff_offer', e.role) }, result: `${e.name} se marcha al ${e.club}. El club ingresa ${fmt(e.pay)} € y el puesto queda vacante.`, after: recalc }) },
              { label: 'Rechazar la oferta', tags: '😠', run: (s, e) => { const leaves = rnd() < .3; return leaves ? { patch: { staff: setStaff(s, e.role, null), staffLife: markAsked(s, 'staff_offer', e.role) }, result: `${e.name} no acepta el no: rompe el contrato y se va al ${e.club} sin que cobres nada. El puesto queda vacante.`, after: recalc } : { patch: { staff: react(s, e.role, -15, {}, 1), staffLife: markAsked(s, 'staff_offer', e.role) }, result: `${e.name} se queda, aunque la relación se resiente.` }; } }
          ] },
        { id: 'staff_req_medical', w: 3, cd: 20, icon: '🩺', title: 'El servicio médico pide más medios',
          eligible(s) {
              const inj = (s.squad || []).filter(p => p.isInjured && (p.weeksOut || 0) >= 2);
              const x = staffList(s).find(x => x.role === 'medico') || staffList(s).find(x => x.role === 'fisio');
              if (inj.length < 2 || !x || asked(s, 'staff_req_medical', x.role, 20)) return null;
              return { role: x.role, name: x.c.name, disp: x.c.displayName, n: inj.length, cost: money(s, .5, 30000, 2e6) };
          },
          text: e => `${e.name}, tu ${e.disp.toLowerCase()}, avisa: hay ${e.n} lesionados y pide ampliar el equipo y el material de recuperación. Calcula una inversión de ${fmt(e.cost)} €.`,
          choices: [
              { label: `Aprobar la inversión (${'−'}coste)`, tags: '💶 🏥 😀', run: (s, e) => ({ patch: { balance: (s.balance || 0) - e.cost, squad: (s.squad || []).map(p => p.isInjured && (p.weeksOut || 0) >= 2 ? { ...p, weeksOut: p.weeksOut - 1 } : p), staff: react(s, e.role, 15), staffLife: markAsked(s, 'staff_req_medical', e.role) }, result: `Se invierten ${fmt(e.cost)} € en medios de recuperación: los lesionados se recuperan una semana antes.` }) },
              { label: 'Dejarlo para más adelante', tags: '😐', run: (s, e) => ({ patch: { staff: react(s, e.role, -6), staffLife: markAsked(s, 'staff_req_medical', e.role) }, result: `${e.name} asiente, aunque esperaba otra respuesta.` }) },
              { label: 'Rechazar', tags: '😠', run: (s, e) => ({ patch: { staff: react(s, e.role, -15, {}, 1), staffLife: markAsked(s, 'staff_req_medical', e.role) }, result: `${e.name} se queja en el vestuario de que no se escucha al servicio médico.` }) }
          ] },
        { id: 'staff_req_rest', w: 3, cd: 18, icon: '🛌', title: 'El preparador pide una semana de descarga',
          eligible(s) {
              const x = staffList(s).find(x => x.role === 'fisio') || staffList(s).find(x => x.role === 'entrenador');
              const sq = (s.squad || []).filter(p => p.contractType !== 'loaned_out'); if (!x || !sq.length) return null;
              const avg = sq.reduce((n, p) => n + (p.condition ?? 100), 0) / sq.length;
              if (avg >= 78 || asked(s, 'staff_req_rest', x.role, 18)) return null;
              return { role: x.role, name: x.c.name, disp: x.c.displayName, avg: Math.round(avg), cost: money(s, .15, 10000, 6e5) };
          },
          text: e => `${e.name}, tu ${e.disp.toLowerCase()}, advierte de que la plantilla está agotada (condición media ${e.avg} %) y propone una semana de descarga con sesiones de recuperación (${fmt(e.cost)} €).`,
          choices: [
              { label: 'Aprobar la semana de descarga', tags: '💶 🔋 😀', run: (s, e) => ({ patch: { balance: (s.balance || 0) - e.cost, squad: (s.squad || []).map(p => p.contractType === 'loaned_out' ? p : { ...p, condition: clamp((p.condition ?? 100) + 12, 1, 100) }), staff: react(s, e.role, 12), staffLife: markAsked(s, 'staff_req_rest', e.role) }, result: `El equipo descansa y se recupera: +12 de condición en toda la plantilla.` }) },
              { label: 'Seguir con el plan', tags: '😠', run: (s, e) => ({ patch: { staff: react(s, e.role, -10, {}, 1), staffLife: markAsked(s, 'staff_req_rest', e.role) }, result: `${e.name} se resigna, pero avisa: «Luego no digan que no se advirtió».` }) }
          ] },
        { id: 'staff_req_reinforce', w: 3, cd: 20, icon: '🧩', title: 'Falta efectivos en una posición',
          eligible(s) {
              const x = staffList(s).find(x => x.role === 'segundoEntrenador') || staffList(s).find(x => x.role === 'secretario');
              if (!x || asked(s, 'staff_req_reinforce', x.role, 20)) return null;
              const need = { POR: 2, DFC: 3, MC: 3, DC: 2 }; const ok = p => !p.isInjured && !p.isSuspended;
              for (const pos of Object.keys(need)) { const n = (s.squad || []).filter(p => p.position === pos && ok(p) && p.contractType !== 'loaned_out').length; if (n < need[pos]) return { role: x.role, name: x.c.name, disp: x.c.displayName, pos, n, cost: money(s, 1.2, 80000, 5e6) }; }
              return null;
          },
          text: e => `${e.name}, tu ${e.disp.toLowerCase()}, alerta: solo tenemos ${e.n} ${e.pos} aptos y pide un refuerzo para la posición. Un fichaje de emergencia costaría unos ${fmt(e.cost)} €.`,
          choices: [
              { label: 'Autorizar el fichaje de urgencia', tags: '💶 🧩 😀', run: (s, e) => { const pl = window.pcfEmergencyCallUp?.(e.pos); const s2 = gs(); return { patch: { balance: (s2.balance || 0) - e.cost, staff: react(s2, e.role, 14), staffLife: markAsked(s2, 'staff_req_reinforce', e.role) }, result: pl ? `Llega ${pl.name} (${pl.position}, ${pl.overall}) para cubrir la baja. Coste: ${fmt(e.cost)} €.` : `No se encuentra a nadie adecuado ahora mismo; ${e.name} lo seguirá intentando.` }; } },
              { label: 'Arreglarlo con lo que hay', tags: '😐', run: (s, e) => ({ patch: { staff: react(s, e.role, -8), staffLife: markAsked(s, 'staff_req_reinforce', e.role) }, result: `${e.name} hará lo que pueda con la plantilla actual.` }) },
              { label: 'Rechazar', tags: '😠', run: (s, e) => ({ patch: { staff: react(s, e.role, -14, {}, 1), staffLife: markAsked(s, 'staff_req_reinforce', e.role) }, result: `${e.name} no entiende que se ignore un problema evidente.` }) }
          ] },
        { id: 'staff_req_scout', w: 2, cd: 25, icon: '🔭', title: 'El ojeador ha encontrado una promesa',
          eligible(s) {
              const x = staffList(s).find(x => x.role === 'scout'); if (!x || (s.academy || []).length >= 12 || asked(s, 'staff_req_scout', x.role, 25)) return null;
              const youngs = (window.pcfGenerateYoungsters?.() || []).sort((a, b) => b.potential - a.potential); if (!youngs.length) return null;
              const y = youngs[0]; y.age = 16; y.overall = Math.min(y.overall + x.c.level * 2, 62); y.potential = clamp(y.potential + x.c.level * 2, 65, 88);
              return { role: x.role, name: x.c.name, disp: x.c.displayName, y, cost: money(s, .8, 40000, 3e6) };
          },
          text: e => `${e.name}, tu ${e.disp.toLowerCase()}, ha descubierto a un joven talento: ${e.y.name}, ${e.y.age} años, ${e.y.position}, media ${e.y.overall} y potencial ${e.y.potential}. Su club pide ${fmt(e.cost)} € por dejarlo ir a tu cantera.`,
          choices: [
              { label: 'Ficharlo para la cantera', tags: '💶 🌱 😀', run: (s, e) => ({ patch: { balance: (s.balance || 0) - e.cost, academy: [...(s.academy || []), { ...e.y, club: 'Tu Equipo' }], staff: react(s, e.role, 14), staffLife: markAsked(s, 'staff_req_scout', e.role) }, result: `${e.y.name} se incorpora a la cantera por ${fmt(e.cost)} €. ${e.name} celebra el fichaje.` }) },
              { label: 'Dejarlo pasar', tags: '😐', run: (s, e) => ({ patch: { staff: react(s, e.role, -8), staffLife: markAsked(s, 'staff_req_scout', e.role) }, result: `${e.y.name} acabará fichando por otro club.` }) }
          ] }
    ];

    // ── Registro en el sistema de eventos ───────────────────
    function register() {
        const api = window.pcfEvents; if (!api || !api.EVENTS) return false;
        if (api.EVENTS.some(e => e.id === 'staff_raise')) return true;
        // Quejas de ánimo muy bajo: no esperan al azar ni al mínimo de 3 semanas
        for (const e of EVENTS) {
            const base = e.eligible;
            if (e.id === 'staff_raise') e.eligible = s => { const p = base(s); if (p) { const c = s.staff?.[p.role]; e.priority = moodOf(c?.mood) < 35; } return p; };
            api.EVENTS.push(e);
        }
        return true;
    }
    // El motor de eventos llama a run() y aplica el patch; «after» (recalcular finanzas) lo hacemos al refrescar
    const origRun = new WeakSet();
    function wrapAfter() {
        const api = window.pcfEvents; if (!api) return;
        for (const e of EVENTS) for (const c of e.choices) {
            if (origRun.has(c)) continue; origRun.add(c);
            const r = c.run; c.run = (s, p) => { const out = r(s, p); if (out && out.after) setTimeout(out.after, 60); return out; };
        }
    }

    // ── Ánimo visible en Empleados ──────────────────────────
    function paintMood() {
        const s = gs(); if (!s || !s.staff) return;
        for (const role of ROLES) {
            const td = document.getElementById('staff' + SUFFIX(role) + 'Name'); if (!td) continue;
            let b = td.querySelector('.pcf-mood'); const c = s.staff[role];
            if (!c) { if (b) b.remove(); continue; }
            const [ico, txt, cls] = label(moodOf(c.mood));
            if (!b) { b = document.createElement('small'); b.className = 'pcf-mood'; td.appendChild(b); }
            b.className = 'pcf-mood pcf-mood-' + cls; b.textContent = `${ico} ${txt}`; b.title = `Ánimo: ${Math.round(moodOf(c.mood))}/100. Sube con los resultados y las subidas de sueldo; baja si se ignoran sus peticiones.`;
        }
    }
    function css() {
        if (document.getElementById('pcfStaffLifeCss')) return;
        const st = document.createElement('style'); st.id = 'pcfStaffLifeCss';
        st.textContent = '#staff .pcf-mood{display:block;margin-top:2px;font-size:.72rem;font-weight:700;letter-spacing:.02em;white-space:nowrap}' +
            '#staff .pcf-mood-good{color:#5dff8c !important}#staff .pcf-mood-ok{color:#9db8e8 !important}#staff .pcf-mood-bad{color:#ff8a80 !important}';
        document.head.appendChild(st);
    }

    function lazyWrap() {
        const orig = window.updateStaffDisplay;
        if (typeof orig === 'function' && !orig.__pcfMood) {
            const w = function () { const r = orig.apply(this, arguments); try { paintMood(); } catch (e) {} return r; };
            w.__pcfMood = true; window.updateStaffDisplay = w;
        }
        if (document.getElementById('staff')?.classList.contains('active')) paintMood();
    }
    function init() {
        css();
        if (!register()) { setTimeout(init, 500); return; }
        wrapAfter();
        pcfEvery(() => { try { lazyWrap(); weeklyTick(); } catch (e) { console.warn('Personal:', e.message); } }, 2500);
        window.pcfStaffLife = { EVENTS, weeklyTick, paintMood, moodOf };
    }
    init();
})();
