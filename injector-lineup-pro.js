// ============================================================
// injector-lineup-pro.js
// Alineación:
//  - Iconos de no disponible: ✚ rojo = lesionado (semanas), 🟥 = sancionado
//    (partidos), 🟨 = a una amarilla de la sanción. Con motivo al pasar el ratón.
//  - Botón "Alineación automática": mejor once por posiciones. Con Segundo
//    Entrenador tiene en cuenta al próximo rival (y el informe del analista):
//    nivel 1-2 ajusta la mentalidad; nivel 3+ elige también la formación.
//  - Ficha del jugador rehecha: fondo completo, en castellano, barras de atributos.
// ============================================================
(function () {
    'use strict';
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getGameState?.();
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const ATTR_LABELS = { EN: 'Energía', VE: 'Velocidad', RE: 'Resistencia', AG: 'Agilidad', CA: 'Cabezazo',
        EF: 'Eficacia', MO: 'Moral', AT: 'Ataque', DF: 'Defensa' };
    const POS_LABELS = { POR: 'Portero', DFC: 'Defensa central', LI: 'Lateral izquierdo', LD: 'Lateral derecho',
        MC: 'Centrocampista', MCO: 'Mediapunta', MD: 'Interior derecho', MI: 'Interior izquierdo', EXT: 'Extremo', DC: 'Delantero centro' };
    const MENTALITY = { offensive: 'ofensiva', balanced: 'equilibrada', defensive: 'defensiva' };
    const YELLOW_LIMIT = () => window.CARDS_CONFIG?.YELLOW_FOR_SUSPENSION || 5;

    // ── Estilos ─────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('pcfLineupProStyles')) return;
        const st = document.createElement('style');
        st.id = 'pcfLineupProStyles';
        st.textContent = `
        .pitch-player.injured::after, .draggable-player.injured::after,
        .pitch-player.suspended::after, .draggable-player.suspended::after { content: none !important; }
        .pcf-st { display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; padding:0 4px;
            border-radius:9px; font-size:11px; font-weight:800; line-height:1; margin-left:4px; vertical-align:middle; cursor:help; }
        .pcf-st.inj { background:#fff; color:#d32f2f; border:1px solid #d32f2f; }
        .pcf-st.sus { background:#d32f2f; color:#fff; border-radius:2px; }
        .pcf-st.warn { background:#fbc02d; color:#3a2a00; border-radius:2px; }
        .pcf-st.sus, .pcf-st.warn { min-width:11px; width:11px; height:15px; padding:0; box-shadow:0 1px 2px rgba(0,0,0,.5); }
        .pcf-st.loan { background:#455a64; color:#fff; }
        .pcf-st.inj { background:#d32f2f; color:#fff; border:1px solid #fff; border-radius:50%; width:16px; min-width:16px; height:16px; padding:0; font-size:12px; }
        #pcfLineupBar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:0 0 10px; }
        #pcfLineupBar .pcf-note { font-size:.82rem; opacity:.8; }

        /* Ficha del jugador: el fondo cubre todo y se desplaza por dentro */
        .player-modal-content { overflow-y:auto !important; position:relative; max-height:86vh; }
        .pcf-card-head { display:flex; gap:14px; align-items:center; margin-bottom:14px; }
        .pcf-avatar { width:64px; height:64px; border-radius:50%; flex:0 0 64px; display:flex; align-items:center; justify-content:center;
            background:linear-gradient(180deg,#2a5aa0,#0e2a55); border:2px solid #7aa0d4; color:#fff; font-weight:800; font-size:1.4rem; letter-spacing:.04em; }
        .pcf-card-title h2 { margin:0 0 4px; }
        .pcf-chips { display:flex; gap:6px; flex-wrap:wrap; }
        .pcf-chip { background:rgba(255,255,255,.08); border:1px solid rgba(122,160,212,.4); border-radius:12px; padding:2px 9px; font-size:.8rem; }
        .pcf-chip.bad { background:rgba(211,47,47,.2); border-color:#d32f2f; color:#ffb3b3; }
        .pcf-chip.ok { background:rgba(76,175,80,.15); border-color:#4caf50; color:#b9f6ca; }
        .pcf-card-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:12px 18px; }
        .pcf-card-sec h3 { font-size:.85rem; margin:6px 0 6px; border-bottom:1px dashed rgba(122,160,212,.5); padding-bottom:3px; }
        .pcf-row { display:flex; justify-content:space-between; font-size:.88rem; padding:2px 0; }
        .pcf-row span:first-child { opacity:.75; }
        .pcf-bar { display:grid; grid-template-columns:92px 1fr 28px; gap:8px; align-items:center; font-size:.85rem; padding:2px 0; }
        .pcf-bar i { display:block; height:7px; border-radius:4px; background:rgba(255,255,255,.12); overflow:hidden; }
        .pcf-bar i b { display:block; height:100%; border-radius:4px; }`;
        document.head.appendChild(st);
    }

    // ── Estado de disponibilidad ─────────────────────────────────
    function statusOf(p) {
        if (!p) return null;
        if (p.isInjured) return { cls: 'inj', icon: '✚', text: `Lesionado: ${p.weeksOut || 1} semana(s) de baja` };
        if (p.isSuspended) return { cls: 'sus', icon: '', text: `Sancionado: ${p.suspensionWeeks || 1} partido(s)` };
        if ((p.yellowCards || 0) === YELLOW_LIMIT() - 1) return { cls: 'warn', icon: '', text: `Apercibido: una amarilla más y será sancionado` };
        if (p.contractType === 'loaned_out') return { cls: 'loan', icon: '↗', text: `Cedido al ${p.loanedTo || 'otro club'}` };
        return null;
    }

    function decorate() {
        const st = gs();
        if (!st?.squad) return;
        const byName = new Map(st.squad.map(p => [p.name, p]));
        document.querySelectorAll('#pitchContainer .pitch-player, #reservesList .draggable-player').forEach(div => {
            const name = div.dataset.playername;
            const p = byName.get(name);
            if (!p) return;
            div.querySelectorAll('.pcf-st').forEach(x => x.remove());
            const s = statusOf(p);
            if (s) {
                const b = document.createElement('span');
                b.className = `pcf-st ${s.cls}`;
                b.textContent = s.icon;
                b.title = s.text;
                // Junto al nombre (en el campo el nombre va en el primer <span>)
                const nameSpan = div.classList.contains('pitch-player') ? div.querySelector('span') : null;
                (nameSpan || div).appendChild(b);
                div.title = `${p.name} — ${s.text}`;
            } else {
                div.title = `${p.name} · ${POS_LABELS[p.position] || p.position} · media ${p.overall}`;
            }
            div.onclick = () => openPlayerCard(p);
        });
        // Motivo de los no disponibles en el aviso superior
        const msg = document.getElementById('lineupMessage');
        const bad = (st.lineup || []).map(p => p && byName.get(p.name)).filter(p => p && (p.isInjured || p.isSuspended));
        if (msg && bad.length) {
            msg.className = 'alert alert-warning';
            msg.innerHTML = `⚠️ No pueden jugar: ${bad.map(p => `<strong>${esc(p.name)}</strong> (${esc(statusOf(p).text.toLowerCase())})`).join(', ')}. Cámbialos o pulsa «Alineación automática».`;
        }
        ensureBar();
    }

    // ── Barra con el botón de alineación automática ──────────────
    function ensureBar() {
        const pitch = document.getElementById('pitchContainer');
        if (!pitch || document.getElementById('pcfLineupBar')) return;
        // Encima de la fila campo + suplentes (no dentro de ella)
        const row = pitch.closest('.lineup-main-container') || pitch;
        const bar = document.createElement('div');
        bar.id = 'pcfLineupBar';
        bar.innerHTML = `<button class="btn" id="pcfAutoLineupBtn">⚡ Alineación automática</button><span class="pcf-note" id="pcfAutoLineupNote"></span>`;
        row.parentNode.insertBefore(bar, row);
        bar.querySelector('#pcfAutoLineupBtn').onclick = autoLineup;
        updateBarNote();
    }
    function updateBarNote() {
        const note = document.getElementById('pcfAutoLineupNote');
        const st = gs();
        if (!note || !st) return;
        const sc = st.staff?.segundoEntrenador;
        note.textContent = !sc ? 'Sin segundo entrenador: elige el mejor once en tu formación actual.'
            : sc.level >= 3 ? `Segundo entrenador (nivel ${sc.level}): analiza al próximo rival y elige once, formación y mentalidad.`
            : `Segundo entrenador (nivel ${sc.level}): elige el once y ajusta la mentalidad según el rival.`;
    }

    function nextLeagueMatch(st) {
        return (st.seasonCalendar || []).filter(m => m.home === st.team || m.away === st.team)
            .find(m => m.week >= st.week);
    }

    async function autoLineup() {
        const st = gs();
        if (!st) return;
        const sc = st.staff?.segundoEntrenador;
        const level = sc?.level || 0;
        const before = new Set((st.lineup || []).map(p => p?.name));
        const eff = (xi, f) => window.calculateTeamEffectiveOverallImproved ? window.calculateTeamEffectiveOverallImproved(xi, f) : 0;

        let formation = st.formation || '433';
        let mentality = st.mentality || 'balanced';
        const reasons = [];

        // Rival y fuerza estimada
        const match = nextLeagueMatch(st);
        let rival = null, isHome = true, rivalStrength = null;
        if (match) {
            rival = match.home === st.team ? match.away : match.home;
            isHome = match.home === st.team;
            try { rivalStrength = window.pcfTeamStrength ? await window.pcfTeamStrength(rival) : null; } catch (e) { rivalStrength = null; }
        }

        if (level >= 3) {
            // Elegir formación: mejor media efectiva, con preferencia según el partido
            let best = null;
            for (const f of ['433', '442', '451', '352', '541']) {
                const xi = window.pickBestXI(st.squad, f);
                let score = eff(xi, f);
                if (rivalStrength != null) {
                    const diff = score - rivalStrength;
                    if (diff < -3 && !isHome && ['541', '451'].includes(f)) score += 1.0;
                    if (diff > 3 && ['433', '352'].includes(f)) score += 0.5;
                }
                if (!best || score > best.score) best = { f, score };
            }
            formation = best.f;
        }
        const xi = window.pickBestXI(st.squad, formation).filter(Boolean);
        const ours = eff(window.pickBestXI(st.squad, formation), formation);

        if (level >= 1 && rivalStrength != null) {
            const diff = ours - rivalStrength;
            mentality = diff >= 4 ? 'offensive' : diff <= -4 ? 'defensive' : (isHome && diff >= 1 ? 'offensive' : 'balanced');
            reasons.push(`Próximo rival: ${rival} (${isHome ? 'en casa' : 'fuera'}), nivel estimado ${Math.round(rivalStrength)} frente a nuestro ${Math.round(ours)}.`);
            if (st.staff?.analista) reasons.push('El analista confirma el informe del rival.');
        }

        gl().updateGameState({ formation, mentality });
        gl().setLineup(xi);
        window.renderLineupPageUI?.();
        const fs = document.getElementById('formationSelect'); if (fs) fs.value = formation;
        const ms = document.getElementById('mentalitySelect'); if (ms) ms.value = mentality;

        const after = gs().lineup.map(p => p.name);
        const ins = after.filter(n => !before.has(n));
        const outs = [...before].filter(n => n && !after.includes(n));
        const fName = (window.FORMATIONS?.[formation]?.name) || formation;
        const lines = [
            `${sc ? '📋 Tu segundo entrenador' : '📋 Alineación automática'}: ${fName}, mentalidad ${MENTALITY[mentality] || mentality}.`,
            ...reasons,
            ins.length ? `Entran: ${ins.join(', ')}.` : 'Sin cambios en el once.',
            outs.length ? `Salen: ${outs.join(', ')}.` : ''
        ].filter(Boolean);
        (window.pcfNotify || alert)('Alineación automática', lines.join('\n'));
    }
    window.pcfAutoLineup = autoLineup;

    // ── Ficha del jugador ────────────────────────────────────────
    function openPlayerCard(player) {
        const modal = document.getElementById('playerModal');
        const content = modal?.querySelector('.player-modal-content');
        if (!content) return;
        const p = (gs()?.squad || []).find(x => x.name === player.name) || player;
        const initials = String(p.name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
        const s = statusOf(p);
        const color = v => v >= 85 ? '#4caf50' : v >= 75 ? '#8bc34a' : v >= 65 ? '#fbc02d' : v >= 55 ? '#ff9800' : '#e53935';
        const contract = { owned: 'En propiedad', loaned: 'Cedido (llega a préstamo)', loaned_out: 'Cedido a otro club' }[p.contractType] || p.contractType || '—';
        content.innerHTML = `
            <span class="player-modal-close" onclick="closePlayerModal()">&times;</span>
            <div class="pcf-card-head">
                <div class="pcf-avatar">${esc(initials)}</div>
                <div class="pcf-card-title">
                    <h2>${esc(p.name)}</h2>
                    <div class="pcf-chips">
                        <span class="pcf-chip">${esc(POS_LABELS[p.position] || p.position)}</span>
                        <span class="pcf-chip" title="Media (valoración global según su posición)">Media ${p.overall ?? '—'}</span>
                        ${p.potential ? `<span class="pcf-chip" title="Potencial: hasta dónde puede llegar">Potencial ${p.potential}</span>` : ''}
                        <span class="pcf-chip ${s ? 'bad' : 'ok'}">${s ? esc(s.text) : 'Disponible'}</span>
                    </div>
                </div>
            </div>
            <div class="pcf-card-grid">
                <div class="pcf-card-sec">
                    <h3>Personal</h3>
                    <div class="pcf-row"><span>Edad</span><span>${p.age ?? '—'} años</span></div>
                    <div class="pcf-row"><span>Pie</span><span>${esc(p.foot || '—')}</span></div>
                    <div class="pcf-row"><span>Forma</span><span>${Math.round(p.form || 0)}</span></div>
                    <div class="pcf-row"><span>Partidos esta temporada</span><span>${p.matches || 0}</span></div>
                    <div class="pcf-row"><span>Amarillas / rojas</span><span>${p.yellowCards || 0} / ${p.redCards || 0}</span></div>
                </div>
                <div class="pcf-card-sec">
                    <h3>Contrato</h3>
                    <div class="pcf-row"><span>Tipo</span><span>${esc(contract)}</span></div>
                    <div class="pcf-row"><span>Años restantes</span><span>${p.contractYears ?? 0}</span></div>
                    <div class="pcf-row"><span>Salario</span><span>${fmt(p.salary)} €/sem</span></div>
                    <div class="pcf-row"><span>Cláusula</span><span>${p.releaseClause ? fmt(p.releaseClause) + ' €' : '—'}</span></div>
                    <div class="pcf-row"><span>Valor de mercado</span><span>${window.pcfEconomy ? fmt(window.pcfEconomy.marketValue(p)) + ' €' : '—'}</span></div>
                </div>
            </div>
            <div class="pcf-card-sec" style="margin-top:8px">
                <h3>Atributos</h3>
                ${Object.entries(ATTR_LABELS).map(([k, label]) => `
                    <div class="pcf-bar" title="${label}"><span>${label}</span><i><b style="width:${Math.max(0, Math.min(99, p[k] || 0))}%;background:${color(p[k] || 0)}"></b></i><strong>${p[k] ?? 0}</strong></div>`).join('')}
            </div>`;
        modal.style.display = 'block';
    }
    window.pcfOpenPlayerCard = openPlayerCard;

    // ── Arrastrar: avisos en la ventana del juego ────────────────
    function patchDrag() {
        const orig = window.drag;
        if (typeof orig !== 'function' || orig._pcfPro) return;
        window.drag = function (ev, playerJson) {
            let p = null;
            try { p = JSON.parse(decodeURIComponent(playerJson)); } catch (e) { /* */ }
            const live = p && (gs()?.squad || []).find(x => x.name === p.name);
            const s = live && (live.isInjured || live.isSuspended || live.contractType === 'loaned_out') ? statusOf(live) : null;
            if (s) {
                ev.preventDefault();
                (window.pcfNotify || alert)('No disponible', `${live.name} no puede jugar. ${s.text}.`);
                return;
            }
            return orig.call(this, ev, playerJson);
        };
        window.drag._pcfPro = true;
    }

    // ── Instalación ──────────────────────────────────────────────
    function install() {
        injectStyles();
        patchDrag();
        const orig = window.renderLineupPageUI;
        if (typeof orig === 'function' && !orig._pcfPro) {
            window.renderLineupPageUI = function (...args) {
                const r = orig.apply(this, args);
                setTimeout(decorate, 80); // después de los demás módulos
                return r;
            };
            window.renderLineupPageUI._pcfPro = true;
        }
    }
    [1500, 3500, 6000].forEach(ms => setTimeout(install, ms));
})();
