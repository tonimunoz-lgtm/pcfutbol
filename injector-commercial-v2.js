// ============================================================
// injector-commercial-v2.js — Publicidad y gestión de contratos
//  • Vallas publicitarias del estadio: se contratan por SEMANAS (4 / 12 / 26)
//  • «Mis contratos»: patrocinio (camiseta), TV y vallas; renegociar al alza
//    (según resultados y popularidad) o rescindir pagando penalización, tras
//    lo cual llegan ofertas nuevas.
// Los datos viven en la partida: fd_sponsor, fd_tv (contratos), fd_boards (vallas).
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();
    const save = o => gl().updateGameState(o);
    const news = (m, t = 'info') => gl().addNews(m, t);
    const fmt = n => Math.round(n).toLocaleString('es-ES');
    const dk = d => (d === 'rfef_grupo1' || d === 'rfef_grupo2') ? 'rfef' : d;
    const move = (type, desc, amount) => { try { window._financeRegisterMovement?.(type, desc, amount); } catch (e) { /* */ } };

    // ── Vallas ──────────────────────────────────────────────────
    const BOARD_BASE = { primera: 60000, segunda: 9000, rfef: 1500, promesas: 120 };   // €/semana por valla, club medio
    const BOARD_COS = {
        primera: [['Banco Santander', 'Banca'], ['Iberdrola', 'Energía'], ['Emirates', 'Aviación'], ['Coca-Cola', 'Bebidas'], ['Heineken', 'Cervezas'], ['Adidas', 'Deportes'],
            ['Rakuten', 'E-commerce'], ['Visa', 'Finanzas'], ['Samsung', 'Tecnología'], ['Toyota', 'Automoción'], ['EA Sports', 'Videojuegos'], ['Binance Sports', 'Finanzas'], ['Orange', 'Telecos'], ['Cabify', 'Movilidad']],
        segunda: [['Mahou', 'Cervezas'], ['Renfe', 'Transporte'], ['DIGI', 'Telecos'], ['Endesa', 'Energía'], ['Mercadona', 'Retail'], ['Decathlon', 'Deportes'], ['Carrefour', 'Retail'],
            ['Cajamar', 'Banca'], ['Telepizza', 'Restauración'], ['Vueling', 'Aviación'], ['Opel', 'Automoción'], ['Leroy Merlin', 'Bricolaje']],
        rfef: [['Caja Rural', 'Banca'], ['Consum', 'Retail'], ['ElPozo', 'Alimentación'], ['Hijos de Rivera', 'Cervezas'], ['Joma', 'Deportes'], ['Diputación Local', 'Institucional'],
            ['Gadis', 'Retail'], ['Pascual', 'Lácteos'], ['Ametller Origen', 'Alimentación'], ['Cuétara', 'Alimentación'], ['Petronor', 'Energía'], ['Halcón Viajes', 'Turismo']],
        promesas: [['Forn de Pa Can Mas', 'Alimentació'], ['Farmàcia Central', 'Salut'], ['Òptica Sabadell', 'Salut'], ['Lampisteria Sala', 'Industrial'], ['Gestoria Mir', 'Serveis'],
            ['Pastisseria Rovira', 'Alimentació'], ['Autoescola Vallès', 'Formació'], ['Floristeria Sant Cugat', 'Comerç'], ['Perruqueria Mon', 'Serveis'], ['Pintures Vila', 'Industrial']]
    };
    const slotsFor = cap => cap < 5000 ? 2 : cap < 15000 ? 3 : cap < 30000 ? 4 : cap < 60000 ? 6 : 8;
    const DURATIONS = [{ weeks: 4, mult: 1.10, label: 'Corta' }, { weeks: 12, mult: 1.0, label: 'Estándar' }, { weeks: 26, mult: 0.92, label: 'Larga' }];

    function marketFactor(s) {
        const size = Math.max(0.5, Math.min(3.2, (s.stadiumCapacity || 15000) / 20000));
        const pop = Math.max(0.5, Math.min(1.8, (s.popularity ?? 50) / 50));
        return size * pop;
    }
    function genBoardOffers() {
        const s = gs(), k = dk(s.division);
        const pool = (BOARD_COS[k] || BOARD_COS.rfef).slice().sort(() => Math.random() - 0.5);
        const used = new Set((s.fd_boards || []).map(b => b.company));
        const free = pool.filter(c => !used.has(c[0]));
        const base = (BOARD_BASE[k] || 1500) * marketFactor(s);
        const step = k === 'primera' ? 5000 : k === 'segunda' ? 1000 : k === 'rfef' ? 100 : 10;
        return DURATIONS.map((d, i) => {
            const co = (free[i] || pool[i % pool.length]);
            const weekly = Math.max(step, Math.round(base * d.mult * (0.85 + Math.random() * 0.3) / step) * step);
            return { company: co[0], sector: co[1], weeks: d.weeks, label: d.label, weekly };
        });
    }

    // ── Estado de los contratos ─────────────────────────────────
    const deal = t => { const s = gs(); const d = t === 'sponsor' ? s.fd_sponsor : s.fd_tv; return d && d.active ? d : null; };
    const recalc = () => { try { window._fdRecalc?.(); } catch (e) { /* */ } try { window._financeRefresh?.(); } catch (e) { /* */ } };

    function renegChance() {
        const s = gs();
        const conf = s.boardConfidence ?? 65;
        const sorted = window.sortStandings ? window.sortStandings(s.standings || {}) : [];
        const pos = sorted.findIndex(e => e[0] === s.team) + 1, target = s.boardTarget || Math.ceil((sorted.length || 20) / 2);
        let p = 0.30 + (conf - 60) / 100 * 0.5 + ((s.popularity ?? 50) - 50) / 100 * 0.3;
        if (pos && pos <= target) p += 0.15; else if (pos > target + 3) p -= 0.2;
        return Math.max(0.05, Math.min(0.85, p));
    }
    const penalty = (d, years) => Math.round(d.annualAmount * Math.max(0.25, years * 0.35));

    async function renegotiate(t) {
        const d = deal(t), s = gs();
        if (!d) return;
        if (d.renegSeason === s.currentSeason) return window.pcfNotify('Renegociar', 'Ya has pedido mejorar este contrato esta temporada. Podrás volver a intentarlo la próxima.');
        const p = renegChance();
        if (!(await window.pcfConfirm('Renegociar al alza', `Pides mejorar las condiciones de ${d.company || 'este contrato'}.\n\nProbabilidad estimada de éxito: ${Math.round(p * 100)}%\n(depende de los resultados, la posición frente al objetivo y la popularidad del club)\n\nSi no lo consigues, no podrás volver a intentarlo hasta la próxima temporada.`, { okLabel: 'Pedir mejora' }))) return;
        const ok = Math.random() < p;
        const upd = { ...d, renegSeason: s.currentSeason };
        if (ok) {
            const up = 0.08 + Math.random() * 0.14;
            upd.annualAmount = Math.round(d.annualAmount * (1 + up) / 10000) * 10000 || Math.round(d.annualAmount * (1 + up));
            news(`🤝 ${d.company || 'El patrocinador'} acepta mejorar el contrato: ${fmt(upd.annualAmount)}€/año (+${Math.round(up * 100)}%).`, 'success');
            await window.pcfNotify('¡Mejora conseguida!', `${d.company || 'La empresa'} acepta ${fmt(upd.annualAmount)}€ al año (+${Math.round(up * 100)}%).`);
        } else {
            news(`🤝 ${d.company || 'La empresa'} rechaza mejorar el contrato por ahora.`, 'warning');
            await window.pcfNotify('Sin mejora', `${d.company || 'La empresa'} considera que el contrato actual ya es justo. Inténtalo la próxima temporada.`);
        }
        save(t === 'sponsor' ? { fd_sponsor: upd } : { fd_tv: upd });
        recalc(); render();
    }

    async function cancelDeal(t) {
        const d = deal(t), s = gs();
        if (!d) return;
        const pen = penalty(d, d.yearsLeft);
        if (!(await window.pcfConfirm('Rescindir contrato', `Vas a rescindir el contrato con ${d.company || 'la empresa'}.\n\nPenalización: ${fmt(pen)}€\nPerderás ${fmt(Math.round(d.annualAmount / 38))}€ semanales de ingresos.\n\nDespués recibirás ofertas nuevas.`, { okLabel: 'Rescindir', danger: true }))) return;
        save({ balance: (s.balance || 0) - pen, ...(t === 'sponsor' ? { fd_sponsor: { ...d, active: false } } : { fd_tv: { ...d, active: false } }) });
        move('expense', `Penalización por rescindir ${t === 'sponsor' ? 'patrocinio' : 'TV'}: ${d.company}`, -pen);
        news(`📄 Contrato con ${d.company} rescindido (penalización ${fmt(pen)}€). Recibirás nuevas ofertas.`, 'warning');
        recalc();
        try { window._fdMaybeGenerate?.(); } catch (e) { /* */ }
        render();
    }

    function boardSlots() { const s = gs(); return slotsFor(s.stadiumCapacity || 10000); }
    function hireBoard(offer) {
        const s = gs(), list = [...(s.fd_boards || [])];
        if (list.filter(b => b.weeksLeft > 0).length >= boardSlots()) return;
        list.push({ company: offer.company, sector: offer.sector, weeksLeft: offer.weeks, weeksTotal: offer.weeks, weekly: offer.weekly, since: s.currentSeason });
        save({ fd_boards: list });
        news(`🧱 Nueva valla publicitaria: ${offer.company} paga ${fmt(offer.weekly)}€/sem durante ${offer.weeks} semanas.`, 'success');
        recalc(); render();
    }
    async function cancelBoard(i) {
        const s = gs(), list = [...(s.fd_boards || [])], b = list[i];
        if (!b) return;
        const pen = Math.round(b.weekly * b.weeksLeft * 0.5);
        if (!(await window.pcfConfirm('Rescindir valla', `Rescindir la valla de ${b.company}.\n\nPenalización: ${fmt(pen)}€ (50% de lo que quedaba por cobrar).`, { okLabel: 'Rescindir', danger: true }))) return;
        list.splice(i, 1);
        save({ fd_boards: list, balance: (s.balance || 0) - pen });
        move('expense', `Penalización por rescindir valla: ${b.company}`, -pen);
        recalc(); render();
    }

    // ── Paso del tiempo: las vallas consumen semanas ────────────
    function tick() {
        const s = gs();
        if (!s || !Array.isArray(s.fd_boards) || !s.fd_boards.length) return;
        const key = `${s.currentSeason}|${s.seasonType}|${s.week}`;
        if (s.fd_boardsTick === key) return;
        let changed = false;
        const left = s.fd_boards.map(b => {
            if (b.weeksLeft > 0) { changed = true; return { ...b, weeksLeft: b.weeksLeft - 1 }; }
            return b;
        });
        left.filter((b, i) => b.weeksLeft === 0 && s.fd_boards[i].weeksLeft === 1)
            .forEach(b => news(`🧱 La valla de ${b.company} ha terminado su contrato. Hay hueco para contratar otra.`, 'info'));
        save({ fd_boards: left.filter(b => b.weeksLeft > 0), fd_boardsTick: key });
        if (changed) recalc();
    }

    // ── Interfaz ────────────────────────────────────────────────
    function css() {
        if (document.getElementById('pcfCommCss')) return;
        const st = document.createElement('style'); st.id = 'pcfCommCss';
        st.textContent = `
        #pcfCommModal{position:fixed;inset:0;background:rgba(2,8,20,.78);z-index:250000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 12px}
        #pcfCommModal .box{background:linear-gradient(180deg,#14305c,#0b1f40);border:1px solid #7aa0d4;box-shadow:0 18px 44px rgba(0,0,0,.6);border-radius:4px;width:100%;max-width:760px;color:#e6eefb}
        #pcfCommModal h2{margin:0;padding:12px 16px;background:linear-gradient(180deg,#1c3e74,#102a52);border-bottom:1px solid #7aa0d4;color:var(--pcf-gold,#ffd24a);letter-spacing:.08em;text-transform:uppercase;font-size:1rem;display:flex;justify-content:space-between;align-items:center}
        #pcfCommModal .body{padding:14px 16px 18px}
        .pcf-cm-sec{margin-bottom:16px}.pcf-cm-sec h4{margin:0 0 8px;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:#9fc0ee;border-bottom:1px solid rgba(122,160,212,.3);padding-bottom:4px}
        .pcf-cm-card{display:grid;grid-template-columns:1fr auto;gap:6px 14px;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(122,160,212,.3);border-left:4px solid var(--c,#7aa0d4);border-radius:3px;padding:10px 12px;margin-bottom:8px}
        .pcf-cm-card small{display:block;opacity:.72;font-size:.78rem;margin-top:2px}.pcf-cm-card .acts{display:flex;gap:6px;flex-wrap:wrap}
        .pcf-cm-empty{border-left-style:dashed;opacity:.85}
        .pcf-cm-offers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        .pcf-cm-off{background:rgba(255,255,255,.06);border:1px solid rgba(122,160,212,.4);border-radius:4px;padding:10px;text-align:center}
        .pcf-cm-off b{display:block;font-size:.95rem}.pcf-cm-off .amt{color:var(--pcf-gold,#ffd24a);font-weight:800;margin:4px 0}
        @media (max-width:640px){.pcf-cm-offers{grid-template-columns:1fr}.pcf-cm-card{grid-template-columns:1fr}}`;
        document.head.appendChild(st);
    }
    let offersShown = null;
    function render() {
        css();
        const s = gs(); if (!s) return;
        let m = document.getElementById('pcfCommModal');
        if (!m) { m = document.createElement('div'); m.id = 'pcfCommModal'; document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m) m.remove(); }); }
        const sp = deal('sponsor'), tv = deal('tv');
        const boards = (s.fd_boards || []).filter(b => b.weeksLeft > 0);
        const slots = boardSlots();
        const card = (t, d, color, title, desc) => d ? `<div class="pcf-cm-card" style="--c:${color}">
            <div><strong>${title}</strong> · ${d.company || '—'}<small>${desc} · ${fmt(d.annualAmount)}€/año (~${fmt(d.annualAmount / 38)}€/sem) · ${d.yearsLeft} temp. restante${d.yearsLeft !== 1 ? 's' : ''}${d.sector ? ' · ' + d.sector : ''}</small></div>
            <div class="acts"><button class="btn btn-sm" data-act="reneg-${t}">Renegociar</button><button class="btn btn-sm page-close-btn" data-act="cancel-${t}">Rescindir</button></div></div>`
            : `<div class="pcf-cm-card pcf-cm-empty" style="--c:${color}"><div><strong>${title}</strong><small>Sin contrato activo. ${s.fd_pending ? 'Tienes ofertas pendientes: cierra esta ventana y pulsa «¡Hay ofertas pendientes!».' : 'Recibirás ofertas en las próximas jornadas.'}</small></div></div>`;
        const boardRows = boards.map((b, i) => `<div class="pcf-cm-card" style="--c:#ff9800"><div><strong>${b.company}</strong> <span style="opacity:.7">· ${b.sector}</span><small>${fmt(b.weekly)}€/sem · quedan ${b.weeksLeft} de ${b.weeksTotal} semanas</small></div>
            <div class="acts"><button class="btn btn-sm page-close-btn" data-act="cancel-board-${(s.fd_boards || []).indexOf(b)}">Rescindir</button></div></div>`).join('');
        const free = slots - boards.length;
        let offersHtml = '';
        if (offersShown && free > 0) offersHtml = `<div class="pcf-cm-sec"><h4>Ofertas de vallas (elige una)</h4><div class="pcf-cm-offers">${offersShown.map((o, i) => `<div class="pcf-cm-off"><b>${o.company}</b><small style="opacity:.7">${o.sector}</small><div class="amt">${fmt(o.weekly)}€/sem</div><div style="font-size:.8rem;opacity:.85">${o.weeks} semanas · ${o.label}<br>Total ≈ ${fmt(o.weekly * o.weeks)}€</div><button class="btn btn-sm" style="margin-top:8px" data-act="hire-${i}">Contratar</button></div>`).join('')}</div></div>`;
        m.innerHTML = `<div class="box"><h2><span>Contratos comerciales</span><button class="btn btn-sm page-close-btn" data-act="close">Cerrar</button></h2><div class="body">
            <div class="pcf-cm-sec"><h4>👕 Patrocinador principal · publicidad en la camiseta</h4>${card('sponsor', sp, '#4caf50', 'Camiseta', 'Logo en la camiseta')}</div>
            <div class="pcf-cm-sec"><h4>📺 Derechos de televisión</h4>${card('tv', tv, '#2196f3', 'Televisión', 'Retransmisión de partidos')}</div>
            <div class="pcf-cm-sec"><h4>🧱 Vallas publicitarias del estadio · ${boards.length}/${slots} ocupadas</h4>${boardRows || '<div class="pcf-cm-card pcf-cm-empty" style="--c:#ff9800"><div><small>Ninguna valla contratada. Las vallas se contratan por semanas (4, 12 o 26) y pagan cada jornada.</small></div></div>'}
                ${free > 0 ? `<button class="btn" data-act="more-boards">+ Contratar valla (${free} hueco${free !== 1 ? 's' : ''} libre${free !== 1 ? 's' : ''})</button>` : '<small style="opacity:.7">No quedan huecos: amplía el estadio o espera a que termine algún contrato.</small>'}</div>
            ${offersHtml}</div></div>`;
        m.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
            const a = b.dataset.act;
            if (a === 'close') { m.remove(); offersShown = null; try { window._fdRefresh?.(); } catch (e) { /* */ } renderCard(); }
            else if (a === 'reneg-sponsor') renegotiate('sponsor');
            else if (a === 'reneg-tv') renegotiate('tv');
            else if (a === 'cancel-sponsor') cancelDeal('sponsor');
            else if (a === 'cancel-tv') cancelDeal('tv');
            else if (a === 'more-boards') { offersShown = genBoardOffers(); render(); }
            else if (a.startsWith('hire-')) { const o = offersShown[+a.slice(5)]; offersShown = null; hireBoard(o); }
            else if (a.startsWith('cancel-board-')) cancelBoard(+a.slice(13));
        });
    }

    // Tarjeta en Gestión comercial (leyenda + acceso directo)
    function renderCard() {
        const host = document.getElementById('fd-contracts');
        const s = gs();
        if (!host || !s) return;
        let card = document.getElementById('pcfBoardsCard');
        if (!card) { card = document.createElement('div'); card.id = 'pcfBoardsCard'; host.parentNode.insertBefore(card, host.nextSibling); }
        const boards = (s.fd_boards || []).filter(b => b.weeksLeft > 0);
        const weekly = boards.reduce((t, b) => t + b.weekly, 0);
        card.innerHTML = `<div style="margin:6px 0 10px;padding:10px 12px;border:1px solid rgba(122,160,212,.35);border-left:4px solid #ff9800;border-radius:3px;background:rgba(255,255,255,.04)">
            <div style="font-size:.82rem;line-height:1.5"><strong>👕 Camiseta</strong> = tu patrocinador principal · <strong>📺 TV</strong> = derechos de retransmisión · <strong>🧱 Vallas</strong> = publicidad en el estadio (por semanas)</div>
            <div style="margin-top:6px;font-size:.84rem">Vallas: <strong>${boards.length}/${boardSlots()}</strong> ocupadas · <strong>${fmt(weekly)}€/sem</strong></div>
            <button class="btn btn-sm" id="pcfOpenContracts" style="margin-top:8px">Mis contratos y vallas</button></div>`;
        card.querySelector('#pcfOpenContracts').onclick = render;
        renderPrizeHelp();
    }

    // Guía de premios: qué se paga y cuánto, según la categoría del club
    function renderPrizeHelp() {
        const s = gs(), T = window.PCFPrizes?.tables;
        if (!s || !T) return;
        const panel = [...document.querySelectorAll('#commercial *')].find(e => e.children.length === 0 && /Ningún premio económico|Ning.n premio/i.test(e.textContent));
        const host = panel ? panel.parentElement : null;
        if (!host || host.querySelector('#pcfPrizeHelp')) return;
        const k = dk(s.division);
        const L = T.LEAGUE[k];
        const M = n => n >= 1e6 ? (Math.round(n / 1e5) / 10).toLocaleString('es-ES') + ' M€' : Math.round(n / 1e3).toLocaleString('es-ES') + ' mil €';
        const rows = [];
        if (L) rows.push(['Liga: 1.º puesto', M(L(1))], ['Liga: puesto intermedio', M(L(10))], ['Liga: último puesto', M(L(20))]);
        if (T.CHAMPION[k]) rows.push(['Ser campeón de liga (extra)', M(T.CHAMPION[k])]);
        if (T.PROMOTION_TO) rows.push(['Ascender de categoría', k === 'segunda' ? M(T.PROMOTION_TO.primera) : k === 'rfef' ? M(T.PROMOTION_TO.segunda) : k === 'promesas' ? M(T.PROMOTION_TO.rfef) : '—']);
        if (T.PARACHUTE_FROM[k]) rows.push(['Ayuda por descender', M(T.PARACHUTE_FROM[k])]);
        rows.push(['Copa del Rey: ronda superada', M(T.COPA_ROUND.copa_r32) + ' – ' + M(T.COPA_ROUND.copa_sf)], ['Copa del Rey: campeón', '2,5 M€']);
        const eu = T.EU; rows.push(['Champions: participar', M(eu.champions.start)], ['Champions: victoria / empate', M(eu.champions.win) + ' / ' + M(eu.champions.draw)],
            ['Champions: campeón', M(eu.champions.champion)], ['Europa League: participar', M(eu.europaLeague.start)], ['Conference: participar', M(eu.conferenceLague.start)]);
        const d = document.createElement('details'); d.id = 'pcfPrizeHelp'; d.style.cssText = 'margin-top:10px;font-size:.84rem';
        d.innerHTML = `<summary style="cursor:pointer;color:#9fc0ee;font-weight:700">¿Qué premios hay y cuánto pagan?</summary>
            <div style="margin-top:6px;line-height:1.5;opacity:.9">Se cobran solos al cumplir cada logro y quedan anotados aquí y en Caja. Además, los partidos de copa y de Europa jugados en casa cobran su taquilla.</div>
            <table style="width:100%;margin-top:6px;border-collapse:collapse">${rows.map(r => `<tr><td style="padding:4px 8px;color:#0a1a35;font-weight:600">${r[0]}</td><td style="padding:4px 8px;text-align:right;font-weight:800;color:#7a4b00;white-space:nowrap">${r[1]}</td></tr>`).join('')}</table>`;
        host.appendChild(d);
    }

    // El botón «Gestionar contratos y ofertas» abre mi ventana cuando no hay ofertas pendientes
    document.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('#fd-btn-offers');
        if (!b) return;
        const s = gs();
        if (s && !s.fd_pending) { e.stopImmediatePropagation(); e.preventDefault(); render(); }
    }, true);

    function hookWeek() {
        const orig = window.simulateWeek;
        if (typeof orig !== 'function') return setTimeout(hookWeek, 500);
        if (orig._pcfComm) return;
        const w = async function (...a) { const r = await orig.apply(this, a); try { tick(); } catch (e) { console.error('Vallas:', e); } return r; };
        w._pcfComm = true; window.simulateWeek = w;
    }
    function hookPage() {
        const orig = window.openPage;
        if (typeof orig !== 'function') return setTimeout(hookPage, 500);
        if (orig._pcfComm) return;
        const o = function (id, ...a) { const r = orig.call(this, id, ...a); if (id === 'commercial') setTimeout(renderCard, 250); return r; };
        o._pcfComm = true; window.openPage = o;
    }
    [1500, 4000, 7000, 11000].forEach(ms => setTimeout(() => { hookWeek(); hookPage(); }, ms));
    window.pcfCommercial = { open: render, genBoardOffers, slotsFor };
})();
