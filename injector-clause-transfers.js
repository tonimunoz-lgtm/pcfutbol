// injector-clause-transfers.js — Ojear clubes y fichar pagando la cláusula de rescisión.
//  · Mercado de Fichajes: desplegable División → Equipo con su plantilla (mismo estilo que la lista de mercado).
//  · Pagar cláusula abre una OFERTA al jugador (sueldo, prima de fichaje, comisión de intermediarios, coche, casa, % merchandising/entradas).
//    Responde tras la siguiente jornada, como una renovación. La cláusula solo se cobra si acepta.
//  · Negociaciones: filas dentro de «Negociaciones en curso» con el estado, contraofertas (máx. 3 intentos) y opción de retirar.
// Las reglas (dinero, ambición, límite anual…) y la decisión del jugador viven en gameLogic (clauseAssess / offerToPlayer).
(function () {
    'use strict';
    if (window.__pcfClauseTransfers) return;
    window.__pcfClauseTransfers = true;
    const MAX_ATTEMPTS = 3;
    const DIV_LABEL = { primera: 'Primera División', segunda: 'Segunda División', rfef_grupo1: 'Primera RFEF · Grupo 1', rfef_grupo2: 'Primera RFEF · Grupo 2', promesas: 'Liga Promesas' };
    const DIV_ORDER = ['primera', 'segunda', 'rfef_grupo1', 'rfef_grupo2', 'promesas'];
    const ATTRS = ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('es-ES');
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();
    const flag = p => window.PCF_NATIONS?.flagOf?.(p) || '';
    const deals = () => (gs()?.clauseDeals || []).slice();
    const setDeals = list => gl().updateGameState({ clauseDeals: list });
    const notify = (t, m) => (window.pcfNotify ? window.pcfNotify(t, m) : Promise.resolve(window.alert(t + '\n\n' + m)));

    // ───────────────────────── estilos ─────────────────────────
    (function () {
        const css = document.createElement('style');
        css.textContent = `
        #pcfClauseBox .pcf-cl-sel{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px}
        #pcfClauseBox .pcf-cl-sel select{flex:1 1 260px;min-width:0;max-width:100%;text-overflow:ellipsis}
        #pcfClauseList table{width:100%;border-collapse:collapse}
        #pcfClauseList th,#pcfClauseList td{text-align:center;vertical-align:middle;white-space:nowrap;padding:8px 6px}
        #pcfClauseList th:first-child,#pcfClauseList td:first-child{text-align:left;padding-left:12px;font-weight:700}
        #pcfClauseList td.pcf-cl-no{white-space:normal;min-width:190px;max-width:260px;text-align:left;font-size:.78rem;line-height:1.3}
        #pcfClauseList td.pcf-pos-cell{text-align:left}
        #pcfClauseList .pcf-player-scroll table{font-size:.8em;min-width:1250px}
        #pcfClauseList td.pcf-cl-no{color:#ffb3b3;font-size:.72rem;white-space:normal;min-width:170px;line-height:1.25}
        #pcfClauseList .pcf-cl-ok{color:#a5d6a7;font-weight:700}
        .pcf-cd-back{position:fixed;inset:0;background:rgba(2,8,20,.75);display:flex;align-items:center;justify-content:center;z-index:21000;padding:12px}
        .pcf-cd{background:linear-gradient(180deg,#14305c 0%,#0b1f40 100%);border:1px solid #7aa0d4;box-shadow:0 0 0 1px #06142e,0 18px 40px rgba(0,0,0,.6);border-radius:4px;
            width:min(560px,100%);max-height:94vh;display:flex;flex-direction:column;color:#e6eefb;font-family:'Saira Condensed',sans-serif}
        .pcf-cd h3{margin:0;padding:12px 16px;background:linear-gradient(180deg,#1c3e74,#102a52);border-bottom:1px solid #7aa0d4;color:var(--pcf-gold,#ffd24a);letter-spacing:.08em;text-transform:uppercase;font-size:1rem}
        .pcf-cd-body{padding:14px 16px;overflow-y:auto;font-size:.92rem;line-height:1.4}
        .pcf-cd-head{display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(122,160,212,.3)}
        .pcf-cd-head b{color:#fff}.pcf-cd-head span{opacity:.85}
        #clauseOfferModal .modal-content{max-height:92vh;overflow-y:auto}
        .pcf-cd-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;margin:12px 0 14px;align-items:start}
        .pcf-cd-grid .form-group{margin:0;min-width:0}
        .pcf-cd-grid .form-group input,.pcf-cd-grid .form-group select{width:100% !important;max-width:100% !important;box-sizing:border-box !important;min-width:0}
        .pcf-cd-grid label{display:block;font-size:.74rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a9c0e6;margin-bottom:3px}
        .pcf-cd-grid label small{text-transform:none;letter-spacing:0;font-weight:500;opacity:.8}
        .pcf-cd-grid input[type=number]{width:100%;box-sizing:border-box;min-width:0}
        .pcf-cd-grid .chk{display:flex;align-items:center;gap:8px;padding:6px 0}
        .pcf-cd-grid .chk input{width:20px;height:20px}
        .pcf-cd-note{background:rgba(255,255,255,.06);border:1px solid rgba(122,160,212,.35);border-radius:3px;padding:8px 10px;margin-top:8px;font-size:.84rem}
        .pcf-cd-warn{color:#ffd24a}
        .pcf-cd-actions{display:flex;gap:8px;justify-content:flex-end;padding:10px 16px 14px;flex-wrap:wrap}
        .pcf-cd-actions .btn{flex:0 1 auto}
        .pcf-cdl-row{display:flex;gap:12px;align-items:center;padding:8px 0;border-top:1px solid rgba(122,160,212,.25)}
        .pcf-cdl-row:first-of-type{border-top:0}.pcf-cdl-ic{font-size:1.4rem}.pcf-cdl-body{flex:1;font-size:.88rem;line-height:1.45}
        .pcf-cdl-tag{display:inline-block;margin:2px 0 0;padding:1px 9px;border-radius:10px;font-size:.72rem;font-weight:700}
        .pcf-cdl-tag.wait{background:rgba(255,193,7,.2);color:#ffd54f;border:1px solid #ffc107}
        .pcf-cdl-tag.counter{background:rgba(255,87,34,.2);color:#ffab91;border:1px solid #ff5722}
        .pcf-cdl-act{display:flex;gap:6px;flex-wrap:wrap}
        @media (max-width:767px){
            .pcf-cd-grid{grid-template-columns:1fr 1fr}
            .pcf-cd h3{font-size:.9rem}
            .pcf-cdl-row{flex-direction:column;align-items:stretch;gap:6px}
            .pcf-cdl-act .btn{flex:1 1 45%}
            #pcfClauseList .pcf-player-scroll table th:nth-child(1), #pcfClauseList .pcf-player-scroll table td:nth-child(1){position:sticky;left:0;z-index:4;width:104px;min-width:104px;max-width:104px;
                white-space:normal;line-height:1.15;box-shadow:2px 0 0 rgba(0,0,0,.28);background:inherit}
            #pcfClauseList .pcf-player-scroll table thead th:nth-child(1){z-index:9}
        }`;
        document.head.appendChild(css);
    })();

    // ───────────────────────── Fichajes: ojear clubes ─────────────────────────
    function build() {
        const page = document.getElementById('transfers');
        if (!page || document.getElementById('pcfClauseBox')) return !!page;
        const anchor = [...page.querySelectorAll('h2')].find(h => /Contratar Jóvenes/i.test(h.textContent));
        const box = document.createElement('div');
        box.id = 'pcfClauseBox';
        box.innerHTML = `
            <h2>Ojear clubes · Pagar cláusula</h2>
            <div class="alert alert-info" style="margin-bottom:10px">Puedes fichar a cualquier jugador pagando su cláusula, aunque no esté en venta: su club no puede negarse. Pero el jugador decide si le conviene
                tu proyecto (nivel de tu plantilla y categoría) y negocia su contrato. Máximo 2 cláusulas por temporada.</div>
            <div class="pcf-cl-sel"><select id="pcfClauseDiv"></select><select id="pcfClauseTeam"></select></div>
            <div id="pcfClauseList"></div>`;
        if (anchor) anchor.parentNode.insertBefore(box, anchor); else page.appendChild(box);
        box.querySelector('#pcfClauseDiv').onchange = fillTeams;
        box.querySelector('#pcfClauseTeam').onchange = renderPlayers;
        fillDivisions();
        return true;
    }
    function clubsByDivision() {
        const me = gs()?.team, by = {};
        for (const c of window.pcfWorld?.listClubs?.() || []) if (c.name !== me) (by[c.division] = by[c.division] || []).push(c.name);
        for (const d in by) by[d].sort((a, b) => a.localeCompare(b, 'es'));
        return by;
    }
    function fillDivisions() {
        const sel = document.getElementById('pcfClauseDiv'); if (!sel) return;
        if (!window.pcfWorld?.hasWorld?.()) { sel.innerHTML = '<option>Carga o empieza una partida…</option>'; return; }
        const by = clubsByDivision(), keep = sel.value;
        sel.innerHTML = '<option value="">División…</option>' + DIV_ORDER.filter(d => by[d]).map(d => `<option value="${d}">${DIV_LABEL[d] || d}</option>`).join('');
        if (keep && by[keep]) sel.value = keep;
        fillTeams();
    }
    function fillTeams() {
        const div = document.getElementById('pcfClauseDiv')?.value, sel = document.getElementById('pcfClauseTeam'); if (!sel) return;
        const keep = sel.value, teams = clubsByDivision()[div] || [];
        sel.innerHTML = '<option value="">Equipo…</option>' + teams.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
        if (keep && teams.includes(keep)) sel.value = keep;
        renderPlayers();
    }
    function renderPlayers() {
        const out = document.getElementById('pcfClauseList'), team = document.getElementById('pcfClauseTeam')?.value; if (!out) return;
        if (!team) { out.innerHTML = ''; return; }
        const club = window.pcfWorld.getClub(team);
        if (!club) { out.innerHTML = '<div class="alert alert-warning">No hay datos de ese club.</div>'; return; }
        const open = new Set(deals().map(d => d.playerId));
        const rows = [...club.squad].sort((a, b) => (b.overall || 0) - (a.overall || 0)).map(p => {
            const a = window.pcfEconomy.clauseAssess({ id: p.id, name: p.name, club: team });
            const mine = open.has(p.id);
            const action = mine ? '<span class="pcf-cl-ok">Negociando</span>'
                : a.ok ? `<button class="btn btn-sm" style="background:#FF5722" data-pay="${esc(p.id)}">Pagar cláusula</button>`
                : `<button class="btn btn-sm" disabled style="opacity:.45" title="${esc(a.reasons.join(' '))}">No viable</button>`;
            const why = (!mine && !a.ok) ? `<td class="pcf-cl-no">${esc(a.reasons.join(' '))}</td>` : '<td class="pcf-cl-ok">' + (mine ? 'En negociación' : 'Fichable') + '</td>';
            return `<tr><td>${flag(p)} ${esc(p.name)}</td><td><strong>${p.overall}</strong></td><td>${p.potential ?? '-'}</td><td>${p.age}</td><td>${esc(p.position)}</td><td>${esc(p.foot || '-')}</td>
                ${ATTRS.map(k => `<td>${Math.round(p[k] || 0)}</td>`).join('')}
                <td>${fmt(p.salary)}€</td><td>${fmt(window.pcfEconomy.marketValue(p))}€</td><td style="color:#b45f06;font-weight:bold">${fmt(a.clause)}€</td>
                <td>${p.contractType === 'loaned' ? 'Cedido' : (p.contractYears ?? '-') + ' a.'}</td>${why}<td>${action}</td></tr>`;
        }).join('');
        out.innerHTML = `<div class="pcf-player-scroll" tabindex="0" aria-label="Plantilla del club" style="overflow:auto;max-height:65vh"><table><thead><tr>
            <th>JUGADOR</th><th>MEDIA</th><th>POT</th><th>EDAD</th><th>POS</th><th>PIE</th>${ATTRS.map(k => `<th>${k}</th>`).join('')}
            <th>SALARIO</th><th>VALOR</th><th>CLÁUSULA</th><th>CONTRATO</th><th>FICHAJE</th><th>ACCIONES</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        out.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => openOffer(team, b.dataset.pay));
    }

    // ───────────────────────── Formulario de oferta ─────────────────────────
    const CARS = [[0, 'Sin coche'], [100, 'Básico · 100 €/sem'], [300, 'Superior · 300 €/sem'], [700, 'Lujo · 700 €/sem']];
    const HOUSES = [[0, 'Sin casa'], [250, 'Piso · 250 €/sem'], [600, 'Casa · 600 €/sem'], [1500, 'Mansión · 1.500 €/sem']];
    const tierOpts = (list, cur) => list.map(([v, t]) => `<option value="${v}"${Number(cur) === v ? ' selected' : ''}>${t}</option>`).join('');
    // los tratos guardados con casillas (versión anterior) pasan a un nivel básico
    const tierOf = (v, list) => v === true ? list[1][0] : (Number(v) || 0);

    function openOffer(team, id, existing) {
        const st = gs(), club = window.pcfWorld.getClub(team), p = club?.squad.find(x => x.id === id);
        if (!st || !p) return notify('Fichaje', 'No se encuentra al jugador.');
        const a = window.pcfEconomy.clauseAssess({ id, name: p.name, club: team });
        if (!a.ok && !existing) return notify('Fichaje no viable', a.reasons.join('\n'));
        const expected = Math.round(window.pcfEconomy.expectedSalary(p, st.division) / 100) * 100;
        const eo = existing?.offer;
        const o = eo ? { ...eo, car: tierOf(eo.car, CARS), house: tierOf(eo.house, HOUSES) }
            : { salary: Math.round(Math.max(p.salary || 0, expected) * 1.1 / 100) * 100, bonus: 0, agentFee: 0, car: 0, house: 0, merch: 0, ticket: 0, years: 3, newClause: Math.round((p.value || 0) * 2 / 10000) * 10000 };
        const left = existing ? MAX_ATTEMPTS - existing.attempts : MAX_ATTEMPTS;
        document.getElementById('clauseOfferModal')?.remove();
        const back = document.createElement('div'); back.className = 'modal active'; back.id = 'clauseOfferModal';
        back.innerHTML = `<div class="modal-content"><span class="modal-close" id="cdClose">&times;</span>
            <h1>💰 Fichaje por cláusula</h1>
            <div class="renewal-player-info"><h3>${flag(p)} ${esc(p.name)}</h3>
                <p>Posición: ${esc(p.position)} | Edad: ${p.age} | Overall: ${p.overall} | Club: ${esc(team)}</p></div>
            <h3>Condiciones actuales:</h3>
            <table style="width:100%;margin-bottom:20px"><tr><td>Salario actual:</td><td style="font-weight:bold">${fmt(p.salary)}€/sem</td></tr>
                <tr><td>Salario de mercado (tu categoría):</td><td style="font-weight:bold">~${fmt(expected)}€/sem</td></tr>
                <tr><td>Cláusula a pagar:</td><td style="font-weight:bold">${fmt(a.clause)}€ <small>(solo se cobra si acepta)</small></td></tr>
                <tr><td>Tu caja:</td><td style="font-weight:bold">${fmt(st.balance)}€</td></tr></table>
            ${existing && existing.lastMessage ? `<p class="pcf-cd-warn">Última respuesta: ${esc(existing.lastMessage)}</p>` : ''}
            <h3>Oferta al jugador:</h3>
            <div class="pcf-cd-grid">
                <div class="form-group"><label>Duración del contrato:</label><select id="cdYears">${[1, 2, 3, 4, 5].map(y => `<option value="${y}"${(o.years || 3) === y ? ' selected' : ''}>${y} año${y > 1 ? 's' : ''}</option>`).join('')}</select></div>
                <div class="form-group"><label>Nuevo salario semanal (€)</label><input type="number" id="cdSalary" min="100" step="100" value="${o.salary}"></div>
                <div class="form-group"><label>Nueva cláusula de rescisión (€)</label><input type="number" id="cdNewClause" min="0" step="10000" value="${o.newClause || 0}"></div>
                <div class="form-group"><label>Prima de firma (€, pago único):</label><input type="number" id="cdBonus" min="0" step="1000" value="${o.bonus || 0}"></div>
                <div class="form-group"><label>Comisión intermediarios (€, pago único):</label><input type="number" id="cdAgent" min="0" step="1000" value="${o.agentFee || 0}"></div>
                <div class="form-group"><label>Coche (coste semanal):</label><select id="cdCar">${tierOpts(CARS, o.car)}</select></div>
                <div class="form-group"><label>Casa (coste semanal):</label><select id="cdHouse">${tierOpts(HOUSES, o.house)}</select></div>
                <div class="form-group"><label>% Merchandising de la semana:</label><input type="number" id="cdMerch" min="0" max="100" step="0.1" value="${o.merch || 0}"></div>
                <div class="form-group"><label>% Entradas de la semana:</label><input type="number" id="cdTicket" min="0" max="100" step="0.1" value="${o.ticket || 0}"></div>
            </div>
            <div class="pcf-cd-note" id="cdTotal"></div>
            <p style="font-size:.82em;opacity:.75;margin:8px 0 6px">Cláusula, prima y comisión se pagan al firmar, solo si acepta. El sueldo, el coche, la casa y los porcentajes se pagan cada semana y aparecen en la Caja (incentivos semanales).
                Responderá tras la próxima jornada. Te quedan <b>${left}</b> intento${left === 1 ? '' : 's'}.</p>
            <div style="display:flex;gap:10px;margin-top:16px"><button class="btn" id="cdSend">✅ Enviar oferta</button><button class="btn" style="background:#666" id="cdCancel">❌ Cancelar</button></div></div>`;
        document.body.appendChild(back);
        const val = i => Math.max(0, Number(back.querySelector(i).value) || 0);
        const total = () => {
            const now = a.clause + val('#cdBonus') + val('#cdAgent'), ok = now <= st.balance;
            const week = val('#cdSalary') + val('#cdCar') + val('#cdHouse');
            back.querySelector('#cdTotal').innerHTML = `Al firmar: <b>${fmt(now)}€</b> (cláusula + prima + comisión) ${ok ? '' : '<span class="pcf-cd-warn">· te faltan ' + fmt(now - st.balance) + '€</span>'}<br>
                Cada semana: <b>${fmt(week)}€</b> (sueldo + coche + casa)${val('#cdMerch') || val('#cdTicket') ? ` + ${val('#cdMerch')}% merchandising y ${val('#cdTicket')}% entradas` : ''}`;
            return ok;
        };
        back.addEventListener('input', total); back.addEventListener('change', total); total();
        const close = () => back.remove();
        back.querySelector('#cdCancel').onclick = close; back.querySelector('#cdClose').onclick = close;
        back.querySelector('#cdSend').onclick = async () => {
            if (!total()) return notify('Sin fondos', 'No tienes dinero para cláusula, prima y comisión juntas.');
            const offer = { salary: val('#cdSalary'), years: Math.max(1, Math.min(5, val('#cdYears') || 3)), newClause: val('#cdNewClause'), bonus: val('#cdBonus'), agentFee: val('#cdAgent'),
                merch: Math.min(100, val('#cdMerch')), ticket: Math.min(100, val('#cdTicket')), car: val('#cdCar'), house: val('#cdHouse') };
            if (offer.salary < 100) return notify('Oferta', 'Indica un sueldo semanal válido.');
            close();
            const cur = gs(), list = deals().filter(d => d.playerId !== id);
            list.push({ id: existing?.id || 'cd_' + Date.now(), playerId: id, playerName: p.name, club: team, clause: a.clause, offer, attempts: existing?.attempts || 0, status: 'pending',
                lastMessage: existing?.lastMessage || '', season: cur.currentSeason, seasonType: cur.seasonType, week: cur.week });
            setDeals(list);
            gl().addNews(`📨 Oferta enviada a ${p.name} (${team}) para ficharlo por su cláusula (${fmt(a.clause)}€): ${fmt(offer.salary)}€/sem, ${offer.years} año${offer.years > 1 ? 's' : ''}${offer.bonus ? ' + prima ' + fmt(offer.bonus) + '€' : ''}.`, 'info');
            window.ui?.refreshUI?.(gs()); renderPlayers(); renderDeals();
            await notify('Oferta enviada', `${p.name} y su agente estudiarán tu oferta. Responderán tras la próxima jornada.\nPuedes seguirla en Negociaciones.`);
        };
    }

    // ───────────────────────── Respuesta del jugador (tras la jornada) ─────────────────────────
    async function resolveDeals() {
        const st = gs(); if (!st) return;
        const list = deals(); if (!list.length) return;
        const due = list.filter(d => d.status === 'pending' && !(d.season === st.currentSeason && d.seasonType === st.seasonType && d.week === st.week));
        if (!due.length) return;
        let rest = list.slice();
        for (const d of due) {
            const club = window.pcfWorld.getClub(d.club), p = club?.squad.find(x => x.id === d.playerId);
            const drop = () => { rest = rest.filter(x => x.id !== d.id); };
            if (!p) { drop(); gl().addNews(`ℹ️ ${d.playerName} ya no está en el ${d.club}: se cierra la negociación.`, 'info'); continue; }
            const o = d.offer;
            let r;
            try {
                gl().startNegotiation({ ...p, club: d.club, releaseClause: d.clause, clausePaid: true, clauseAmount: d.clause, askingPrice: 0 });
                r = gl().offerToPlayer(o.salary, o.bonus, tierOf(o.car, CARS), tierOf(o.house, HOUSES), o.merch, o.ticket, undefined, o.agentFee, o.years || 3, o.newClause || 0);
            } catch (e) { r = { success: false, message: 'Error: ' + e.message }; }
            finally { if (gs()?.negotiatingPlayer) gl().endNegotiation(true); }
            if (r.success) {
                drop();
                gl().addNews(`🗞️ PRENSA: ${d.playerName} deja el ${d.club} y ficha por el ${gs().team} tras pagarse su cláusula.`, 'info');
                await notify('¡Fichaje cerrado!', `${d.playerName} ha aceptado tu oferta. Se ha pagado su cláusula (${fmt(d.clause)}€).`);
            } else if (r.neededSalary !== undefined && d.attempts + 1 < MAX_ATTEMPTS) {
                const k = rest.findIndex(x => x.id === d.id);
                rest[k] = { ...d, status: 'counter', attempts: d.attempts + 1, lastMessage: r.message };
                gl().addNews(`↩️ ${d.playerName} rechaza tu oferta: ${r.message} Puedes mejorarla en Negociaciones.`, 'warning');
                await notify('Oferta rechazada', `${r.message}\n\nPuedes mejorarla desde Negociaciones (te quedan ${MAX_ATTEMPTS - d.attempts - 1} intento/s).`);
            } else {
                drop();
                gl().addNews(`❌ Se rompe la negociación con ${d.playerName}: ${r.message}`, 'warning');
                await notify('Negociación rota', `${r.message}\n\nNo se ha cobrado nada.`);
            }
        }
        setDeals(rest);
        window.ui?.refreshUI?.(gs()); renderPlayers(); renderDeals();
    }

    // ───────────────────────── Negociaciones: estado ─────────────────────────
    // Las filas se pintan dentro de «Negociaciones en curso» (#pcfOngoing, injector-negotiations.js).
    function rowsHtml() {
        return deals().map(d => {
            const o = d.offer, car = tierOf(o.car, CARS), house = tierOf(o.house, HOUSES);
            const tag = d.status === 'pending' ? '<span class="pcf-neg-tag wait">Esperando respuesta del jugador · tras la próxima jornada</span>'
                : `<span class="pcf-neg-tag" style="background:rgba(255,87,34,.2);color:#ffab91;border:1px solid #ff5722">Rechazada · intento ${d.attempts} de ${MAX_ATTEMPTS}</span>`;
            return `<div class="pcf-neg-row"><span class="pcf-neg-ic">${d.status === 'pending' ? '💰' : '🔁'}</span><div class="pcf-neg-body">
                <strong>${esc(d.playerName)}</strong> <small>(${esc(d.club)})</small><br>
                Fichaje por cláusula: ${fmt(d.clause)}€ · ${fmt(o.salary)}€/sem · ${o.years || 3} año${(o.years || 3) > 1 ? 's' : ''}${o.bonus ? ' · prima ' + fmt(o.bonus) + '€' : ''}${o.agentFee ? ' · comisión ' + fmt(o.agentFee) + '€' : ''}${car ? ' · coche ' + fmt(car) + '€/sem' : ''}${house ? ' · casa ' + fmt(house) + '€/sem' : ''}${o.merch ? ' · ' + o.merch + '% merch.' : ''}${o.ticket ? ' · ' + o.ticket + '% entradas' : ''}<br>
                ${tag}${d.status === 'counter' && d.lastMessage ? `<br><small>${esc(d.lastMessage)}</small>` : ''}</div>
                <span style="display:flex;gap:6px;flex-wrap:wrap">${d.status === 'counter' ? `<button class="btn btn-sm" data-cd-improve="${esc(d.id)}">Mejorar oferta</button>` : ''}
                <button class="btn btn-sm page-close-btn" data-cd-drop="${esc(d.id)}">Retirar</button></span></div>`;
        }).join('');
    }
    function bindRows(box) {
        box.querySelectorAll('[data-cd-improve]').forEach(b => b.onclick = () => { const d = deals().find(x => x.id === b.dataset.cdImprove); if (d) openOffer(d.club, d.playerId, d); });
        box.querySelectorAll('[data-cd-drop]').forEach(b => b.onclick = async () => {
            const d = deals().find(x => x.id === b.dataset.cdDrop); if (!d) return;
            const ok = window.pcfConfirm ? await window.pcfConfirm('Retirar oferta', `¿Retirar la oferta por ${d.playerName}? No se ha cobrado nada.`, { okLabel: 'Retirar' }) : true;
            if (ok) { setDeals(deals().filter(x => x.id !== d.id)); renderDeals(); renderPlayers(); }
        });
    }
    function renderDeals() { document.getElementById('pcfClauseDeals')?.remove(); if (typeof window.pcfRenderOngoing === 'function') window.pcfRenderOngoing(); }

    // ───────────────────────── Enganches ─────────────────────────
    function hookPayClause() {
        const orig = window.payReleaseClause;
        if (typeof orig !== 'function' || orig._pcfClause) return false;
        window.payReleaseClause = async function (encoded) {
            let p; try { p = JSON.parse(decodeURIComponent(encoded)); } catch (_) { p = null; }
            const club = p?.id && window.pcfWorld?.hasWorld?.() ? window.pcfWorld.getClub(p.club) : null;
            if (club && club.squad.some(x => x.id === p.id)) return openOffer(p.club, p.id);
            return orig.apply(this, arguments);              // jugador del mercado antiguo (sin mundo): flujo original
        };
        window.payReleaseClause._pcfClause = true;
        return true;
    }
    function hookSim() {
        const orig = window.simulateWeek;
        if (typeof orig !== 'function' || orig._pcfClause) return false;
        window.simulateWeek = async function (...a) { const r = await orig.apply(this, a); try { await resolveDeals(); } catch (e) { console.error('[Cláusulas]', e); } return r; };
        window.simulateWeek._pcfClause = true;
        return true;
    }
    function hookPage() {
        const orig = window.openPage;
        if (typeof orig !== 'function' || orig._pcfClause) return false;
        window.openPage = function (id, ...a) {
            const r = orig.call(this, id, ...a);
            if (id === 'negotiations') setTimeout(renderDeals, 250);
            if (id === 'transfers') setTimeout(() => { build(); fillDivisions(); }, 150);
            return r;
        };
        window.openPage._pcfClause = true;
        return true;
    }
    function init() {
        build(); hookPayClause(); hookSim(); hookPage();
        // otros módulos reenvuelven estas funciones con retraso: se reinstala en varias pasadas
        [1500, 4000, 8000, 12000].forEach(ms => setTimeout(() => { build(); hookPayClause(); hookSim(); hookPage(); }, ms));
    }
    window.pcfClauseRefresh = () => { fillDivisions(); renderDeals(); };
    window.pcfClauseDeals = { list: deals, resolve: resolveDeals, rowsHtml, bindRows };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
