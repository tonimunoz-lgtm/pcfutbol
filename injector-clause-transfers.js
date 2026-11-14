// injector-clause-transfers.js — Ojear clubes y fichar pagando la cláusula de rescisión.
// Añade a «Mercado de Fichajes» un desplegable División → Equipo con su plantilla. Cada jugador muestra su cláusula y si el fichaje es
// viable; las reglas (dinero, ambición del jugador, límite anual…) viven en gameLogic.clauseAssess para que el motor las aplique siempre.
(function () {
    'use strict';
    if (window.__pcfClauseTransfers) return;
    window.__pcfClauseTransfers = true;
    const DIV_LABEL = { primera: 'Primera División', segunda: 'Segunda División', rfef_grupo1: 'Primera RFEF · Grupo 1', rfef_grupo2: 'Primera RFEF · Grupo 2', promesas: 'Liga Promesas' };
    const DIV_ORDER = ['primera', 'segunda', 'rfef_grupo1', 'rfef_grupo2', 'promesas'];
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const money = n => (Number(n) || 0).toLocaleString('es-ES') + '€';
    const gs = () => window.gameLogic?.getViewState?.();
    const flag = p => window.PCF_NATIONS?.flagOf?.(p) || '';

    function build() {
        const page = document.getElementById('transfers');
        if (!page || document.getElementById('pcfClauseBox')) return !!page;
        const anchor = [...page.querySelectorAll('h2')].find(h => /Contratar Jóvenes/i.test(h.textContent));
        const box = document.createElement('div');
        box.id = 'pcfClauseBox';
        box.innerHTML = `
            <h2>🏟️ Ojear clubes · Pagar cláusula</h2>
            <div class="alert alert-info" style="margin-bottom:10px">Puedes fichar a cualquier jugador pagando su cláusula, aunque no esté en venta: su club no puede negarse. Pero el jugador decide si le conviene tu proyecto
                (nivel de tu plantilla y categoría), y solo puedes pagar un máximo de 2 cláusulas por temporada.</div>
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px">
                <select id="pcfClauseDiv" style="min-width:190px"></select>
                <select id="pcfClauseTeam" style="min-width:210px"></select>
            </div>
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
        const teams = (clubsByDivision()[div] || []);
        sel.innerHTML = '<option value="">Equipo…</option>' + teams.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
        renderPlayers();
    }
    function renderPlayers() {
        const out = document.getElementById('pcfClauseList'), team = document.getElementById('pcfClauseTeam')?.value; if (!out) return;
        if (!team) { out.innerHTML = ''; return; }
        const club = window.pcfWorld.getClub(team);
        if (!club) { out.innerHTML = '<div class="alert alert-warning">No hay datos de ese club.</div>'; return; }
        const rows = [...club.squad].sort((a, b) => (b.overall || 0) - (a.overall || 0)).map(p => {
            const a = window.pcfEconomy.clauseAssess({ id: p.id, name: p.name, club: team });
            const why = a.ok ? '' : a.reasons.join(' ');
            const btn = a.ok ? `<button class="btn btn-sm" data-pay="${esc(p.id)}">Pagar cláusula</button>`
                : `<button class="btn btn-sm" disabled style="opacity:.45" title="${esc(why)}">No viable</button>`;
            return `<tr><td>${flag(p)} ${esc(p.name)}</td><td>${esc(p.position)}</td><td>${p.age}</td><td><strong>${p.overall}</strong></td>
                <td>${money(a.clause)}</td><td>${p.contractType === 'loaned' ? 'Cedido' : (p.contractYears ?? '-') + ' a.'}</td>
                <td>${btn}${a.ok ? '' : `<div style="font-size:.78em;color:#ffb3b3;max-width:260px">${esc(why)}</div>`}</td></tr>`;
        }).join('');
        out.innerHTML = `<div class="table-container"><table><thead><tr><th>Jugador</th><th>Pos</th><th>Edad</th><th>Media</th><th>Cláusula</th><th>Contrato</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
        out.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => pay(team, b.dataset.pay));
    }
    async function pay(team, id) {
        const club = window.pcfWorld.getClub(team), p = club?.squad.find(x => x.id === id);
        if (!p) return;
        const a = window.pcfEconomy.clauseAssess({ id, name: p.name, club: team });
        if (!a.ok) { window.pcfToast?.(a.reasons[0], { type: 'warn' }); renderPlayers(); return; }
        const player = { ...p, club: team, releaseClause: a.clause };
        if (typeof window.payReleaseClause === 'function') await window.payReleaseClause(encodeURIComponent(JSON.stringify(player)));
        renderPlayers();
    }

    // La página puede estar oculta o el mundo aún sin cargar: se rellena al abrirla y cuando cambia el estado
    function init() {
        if (!build()) { setTimeout(init, 800); return; }
        const page = document.getElementById('transfers');
        new MutationObserver(() => { if (page.classList.contains('active')) fillDivisions(); }).observe(page, { attributes: true, attributeFilter: ['class'] });
        window.pcfEvery ? window.pcfEvery(() => { if (page.classList.contains('active') && document.getElementById('pcfClauseDiv')?.options.length < 2) fillDivisions(); }, 2500) : 0;
    }
    window.pcfClauseRefresh = () => { fillDivisions(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
