// ============================================================
// injector-negotiations.js
// - Ventanas propias del juego (pcfNotify / pcfConfirm) en lugar de los
//   avisos del navegador.
// - El JUGADOR contesta a tu oferta tras unos segundos "estudiándola", con
//   un máximo de 3 intentos por negociación (antes se podía repetir sin fin).
// - El CLUB contesta a la oferta de traspaso o cesión tras la siguiente
//   jornada (como las renovaciones). Las condiciones pactadas con el jugador
//   se guardan: si el club rechaza, puedes mejorar la oferta sin repetir la
//   negociación con el jugador.
// ============================================================
(function () {
    'use strict';

    const MAX_PLAYER_ATTEMPTS = 3;
    const gl = () => window.gameLogic;
    const gs = () => gl()?.getViewState?.();
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');

    // ── Ventanas del juego ───────────────────────────────────────
    function ensureDialogStyles() {
        if (document.getElementById('pcfDialogStyles')) return;
        const st = document.createElement('style');
        st.id = 'pcfDialogStyles';
        st.textContent = `
        .pcf-dlg-back{position:fixed;inset:0;background:rgba(2,8,20,.72);display:flex;align-items:center;justify-content:center;z-index:20000}
        .pcf-dlg{background:linear-gradient(180deg,#14305c 0%,#0b1f40 100%);border:1px solid #7aa0d4;box-shadow:0 0 0 1px #06142e,0 18px 40px rgba(0,0,0,.6);
            border-radius:4px;max-width:460px;width:calc(100% - 32px);color:#e6eefb;font-family:'Saira Condensed',sans-serif}
        .pcf-dlg h3{margin:0;padding:12px 16px;background:linear-gradient(180deg,#1c3e74,#102a52);border-bottom:1px solid #7aa0d4;
            color:var(--pcf-gold,#ffd24a);letter-spacing:.08em;text-transform:uppercase;font-size:1rem}
        .pcf-dlg .pcf-dlg-body{padding:16px;line-height:1.45;white-space:pre-line;font-size:.95rem}
        .pcf-dlg .pcf-dlg-actions{display:flex;gap:8px;justify-content:flex-end;padding:0 16px 16px}
        .pcf-dlg .pcf-spin{display:inline-block;width:14px;height:14px;border:2px solid #7aa0d4;border-top-color:transparent;border-radius:50%;animation:pcfspin .8s linear infinite;vertical-align:-2px;margin-right:8px}
        @keyframes pcfspin{to{transform:rotate(360deg)}}`;
        document.head.appendChild(st);
    }

    function dialog({ title, message, buttons }) {
        ensureDialogStyles();
        return new Promise(resolve => {
            const back = document.createElement('div');
            back.className = 'pcf-dlg-back';
            back.innerHTML = `<div class="pcf-dlg" role="dialog" aria-modal="true">
                <h3>${title}</h3><div class="pcf-dlg-body"></div><div class="pcf-dlg-actions"></div></div>`;
            back.querySelector('.pcf-dlg-body').textContent = message;
            const actions = back.querySelector('.pcf-dlg-actions');
            buttons.forEach(b => {
                const el = document.createElement('button');
                el.className = 'btn' + (b.danger ? ' admin-btn-red' : '');
                el.textContent = b.label;
                el.onclick = () => { back.remove(); resolve(b.value); };
                actions.appendChild(el);
            });
            document.body.appendChild(back);
            actions.querySelector('button:last-child')?.focus();
        });
    }

    // Ventanas del juego: las define injector-dialogs.js (en cola, una tras otra)
    if (!window.pcfNotify) window.pcfNotify = (title, message) => dialog({ title, message, buttons: [{ label: 'Aceptar', value: true }] });
    if (!window.pcfConfirm) window.pcfConfirm = (title, message, { okLabel = 'Confirmar', danger = false } = {}) =>
        dialog({ title, message, buttons: [{ label: 'Cancelar', value: false }, { label: okLabel, value: true, danger }] });

    function thinking(title, message, ms) {
        ensureDialogStyles();
        const back = document.createElement('div');
        back.className = 'pcf-dlg-back';
        back.innerHTML = `<div class="pcf-dlg"><h3>${title}</h3><div class="pcf-dlg-body"><span class="pcf-spin"></span>${message}</div></div>`;
        document.body.appendChild(back);
        return new Promise(r => setTimeout(() => { back.remove(); r(); }, ms));
    }

    // ── Estado auxiliar en la partida ────────────────────────────
    function getBids() { return gs()?.pendingBids || []; }
    function setBids(bids) { gl()?.updateGameState({ pendingBids: bids }); }
    function getTerms() { return gs()?.agreedTerms || {}; }
    function setTerms(t) { gl()?.updateGameState({ agreedTerms: t }); }

    // ── Oferta al jugador ────────────────────────────────────────
    async function submitPlayerOffer() {
        const st = gs();
        const player = st?.negotiatingPlayer;
        if (!player) return;
        const val = id => document.getElementById(id);
        const offeredSalary = parseInt(val('offeredSalary')?.value);
        if (!offeredSalary || offeredSalary <= 0) {
            return window.pcfNotify('Oferta al jugador', 'Indica un salario semanal válido.');
        }
        const attempts = (st.negotiationAttempts || 0) + 1;
        gl().updateGameState({ negotiationAttempts: attempts });

        await thinking('Oferta al jugador', `El representante de ${player.name} está estudiando la oferta…`, 1600 + Math.random() * 1200);

        // Antes se leía .checked de un <select>/<input number> (siempre false): coche, casa y % se ignoraban.
        const num = id => Math.max(0, Number(val(id)?.value) || 0);
        const result = gl().offerToPlayer(offeredSalary, num('offeredBonus'), num('offeredCar'), num('offeredHouse'),
            num('offeredMerchPercent'), num('offeredTicketPercent'));

        if (result.success) {
            const after = gs();
            // Condiciones pactadas: sirven para volver a negociar con el club sin repetir esta fase
            if (after?.playerOffer && after.negotiationStep === 2) {
                setTerms({ ...getTerms(), [player.name]: { playerOffer: after.playerOffer, season: after.currentSeason,
                    club: player.club, player: { ...player }, agreedWeek: after.week, agreedPhase: after.seasonType } });
            }
            gl().updateGameState({ negotiationAttempts: 0 });
            await window.pcfNotify('Acuerdo con el jugador', result.message);
            window.updateNegotiationModal?.();
            return;
        }
        if (attempts >= MAX_PLAYER_ATTEMPTS || /No está interesado/i.test(result.message || '')) {
            gl().updateGameState({ negotiationAttempts: 0 });
            await window.pcfNotify('Negociación rota', `${result.message}\n\n${player.name} no quiere seguir negociando.`);
            window.endNegotiationUI?.(false);
            return;
        }
        await window.pcfNotify('Oferta rechazada', `${result.message}\n\nTe quedan ${MAX_PLAYER_ATTEMPTS - attempts} intento(s).`);
    }

    // ── Oferta al club: respuesta tras la siguiente jornada ──────
    async function queueClubBid(isLoan) {
        const st = gs();
        const player = st?.negotiatingPlayer;
        if (!player) return;
        if (st.negotiationStep !== 2 || !st.playerOffer) {
            return window.pcfNotify('Oferta al club', `Primero tienes que llegar a un acuerdo personal con ${player.name}.`);
        }
        if (getBids().some(b => b.playerName === player.name)) {
            return window.pcfNotify('Oferta pendiente', `Ya has enviado una oferta por ${player.name}. El ${player.club} responderá tras la próxima jornada.`);
        }
        let amount, exchange = [];
        if (isLoan) {
            // El motor espera el PORCENTAJE del salario que pagas (0-100)
            const pct = parseInt(document.getElementById('loanWageContribution')?.value);
            amount = isNaN(pct) ? 50 : Math.max(0, Math.min(100, pct));
        } else {
            amount = parseInt((document.querySelector('input#offerAmount') || document.getElementById('offerAmount'))?.value);
            const sel = document.getElementById('playerExchangeSelect');
            exchange = sel ? Array.from(sel.selectedOptions).map(o => o.value) : [];
        }
        if (isNaN(amount) || amount < 0) return window.pcfNotify('Oferta al club', 'Indica una cantidad válida.');
        if (!isLoan && amount > (st.balance || 0)) {
            return window.pcfNotify('Oferta al club', `No tienes ${fmt(amount)}€ en caja (saldo: ${fmt(st.balance)}€).`);
        }
        const bid = {
            playerName: player.name, club: player.club, player: { ...player },
            playerOffer: st.playerOffer, amount, exchange, isLoan,
            season: st.currentSeason, seasonType: st.seasonType, week: st.week
        };
        setBids([...getBids(), bid]);
        gl().addNews(`📨 Oferta enviada al ${player.club} por ${player.name}: ${isLoan ? `cesión pagando el ${amount}% de su salario (${fmt((player.salary || 0) * amount / 100)}€/sem)` : `${fmt(amount)}€`}${exchange.length ? ` + ${exchange.join(', ')}` : ''}. Responderán tras la próxima jornada.`, 'info');
        gl().endNegotiation(true);
        window.closeModal?.('negotiation');
        window.ui?.refreshUI?.(gs());
        await window.pcfNotify('Oferta enviada', `Tu oferta por ${player.name} ha llegado al ${player.club}.\nTe responderán tras la próxima jornada.`);
    }

    async function resolveBids() {
        const st = gs();
        const bids = getBids();
        if (!st || !bids.length) return;
        const due = bids.filter(b => !(b.season === st.currentSeason && b.seasonType === st.seasonType && b.week === st.week));
        if (!due.length) return;
        setBids(bids.filter(b => !due.includes(b)));

        for (const bid of due) {
            if (!bid.playerOffer) continue;
            // Reabrir la negociación con las condiciones ya pactadas con el jugador
            const start = gl().startNegotiation(bid.player);
            if (!start?.success) continue;
            gl().updateGameState({ negotiationStep: 2, playerOffer: bid.playerOffer });
            const before = gs();
            const result = gl().offerToClub(bid.amount, bid.exchange, bid.isLoan);
            const after = gs();
            gl().endNegotiation(true);

            if (result.success) {
                const spent = (after.playerPurchases || 0) - (before.playerPurchases || 0);
                if (spent > 0 && window._financeRegisterMovement) {
                    window._financeRegisterMovement('purchase', `Fichaje: ${bid.playerName} (oferta: ${fmt(bid.amount)}€)`, -spent);
                }
                const terms = getTerms(); delete terms[bid.playerName]; setTerms(terms);
                if ((bid.exchange || []).length) {
                    gl().addNews(`🔁 A cambio del fichaje de ${bid.playerName} salen del club: ${bid.exchange.join(', ')}.`, 'info');
                }
                gl().addNews(`✅ ¡El ${bid.club} acepta! ${bid.playerName} es nuevo jugador del ${st.team}.`, 'success');
                gl().addNews(`🗞️ PRENSA: El ${st.team} cierra el fichaje de ${bid.playerName} procedente del ${bid.club}.`, 'info');
                await window.pcfNotify('¡Fichaje cerrado!', `${result.message || bid.playerName + ' ficha por tu club.'}${(bid.exchange || []).length ? '\n\nSalen a cambio: ' + bid.exchange.join(', ') + '.' : ''}`);
            } else {
                // El acuerdo con el jugador SIEMPRE se conserva: se puede mejorar la oferta al club sin repetirlo
                const reason = bid.isLoan
                    ? `El ${bid.club} quiere que asumas más parte del salario de ${bid.playerName} (ofreciste el ${bid.amount}%).`
                    : (result.message || 'Han rechazado la oferta.');
                gl().addNews(`❌ El ${bid.club} rechaza tu oferta por ${bid.playerName}. Puedes mejorarla desde Negociaciones (el acuerdo con el jugador sigue en pie).`, 'warning');
                await window.pcfNotify('Oferta rechazada', `${reason}\n\nEl acuerdo personal con ${bid.playerName} sigue en pie. Entra en Negociaciones y pulsa «Retomar» para mejorar la oferta al club.`);
            }
        }
        window.ui?.refreshUI?.(gs());
    }

    // ── Instalación (después de los demás módulos que redefinen estas funciones) ──
    const transferFn = () => queueClubBid(false); transferFn._pcfNeg = true;
    const loanFn = () => queueClubBid(true); loanFn._pcfNeg = true;
    submitPlayerOffer._pcfNeg = true;
    function install() {
        if (!window.submitPlayerOffer?._pcfNeg) window.submitPlayerOffer = submitPlayerOffer;
        if (!window.submitTransferOffer?._pcfNeg) window.submitTransferOffer = transferFn;
        if (!window.submitLoanOffer?._pcfNeg) window.submitLoanOffer = loanFn;
        renderAttrsHook(); hookNegPage();

        // Si ya hay condiciones pactadas con este jugador, saltar a la fase del club
        const origStart = window.startNegotiationUI;
        if (origStart && !origStart._pcfNeg) {
            window.startNegotiationUI = function (...args) {
                const r = origStart.apply(this, args);
                const st = gs();
                const p = st?.negotiatingPlayer;
                const t = p && getTerms()[p.name];
                if (t && t.season === st.currentSeason && st.negotiationStep === 1) {
                    gl().updateGameState({ negotiationStep: 2, playerOffer: t.playerOffer, negotiationAttempts: 0 });
                    window.updateNegotiationModal?.();
                } else {
                    gl().updateGameState({ negotiationAttempts: 0 });
                }
                return r;
            };
            window.startNegotiationUI._pcfNeg = true;
        }

        const origSim = window.simulateWeek;
        if (origSim && !origSim._pcfNeg) {
            window.simulateWeek = async function (...args) {
                const res = await origSim.apply(this, args);
                await resolveBids();
                return res;
            };
            window.simulateWeek._pcfNeg = true;
        }
    }
    // Atributos del jugador en la ventana de negociación (como en Entrenamiento)
    const ATTR_FULL = { EN: 'Energía', VE: 'Velocidad', RE: 'Resistencia', AG: 'Agilidad', CA: 'Cabezazo', EF: 'Eficacia', MO: 'Moral', AT: 'Ataque', DF: 'Defensa' };
    function renderAttrs() {
        const p = gs()?.negotiatingPlayer;
        const info = document.getElementById('negotiationPlayerName')?.closest('div');
        if (!p || !info) return;
        let box = document.getElementById('pcfNegAttrs');
        if (!box) {
            box = document.createElement('div');
            box.id = 'pcfNegAttrs';
            box.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 10px;margin:10px 0 4px;';
            info.appendChild(box);
        }
        const color = v => v >= 85 ? '#4caf50' : v >= 75 ? '#8bc34a' : v >= 65 ? '#fbc02d' : v >= 55 ? '#ff9800' : '#e53935';
        box.innerHTML = Object.entries(ATTR_FULL).map(([k, label]) => {
            const v = p[k] || 0;
            return `<div title="${label} (${k})" style="background:rgba(255,255,255,.06);border:1px solid rgba(122,160,212,.35);border-radius:3px;padding:5px 8px;">
                <div style="display:flex;justify-content:space-between;font-size:.82rem;font-weight:700;"><span>${label} <small style="opacity:.6">${k}</small></span><span>${v}</span></div>
                <div style="height:5px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:3px;"><div style="height:100%;width:${Math.min(99, v)}%;background:${color(v)}"></div></div></div>`;
        }).join('');
    }
    // ── Jugador comprable y cedible: el usuario elige qué pedir ──
    let _mode = 'transfer';
    function enhanceModeSwitch() {
        const st = gs(), p = st && st.negotiatingPlayer;
        const loanBox = document.getElementById('negotiationLoanOffer'), trBox = document.getElementById('negotiationTransferOffer');
        let sw = document.getElementById('pcfModeSwitch');
        if (!p || st.negotiationStep !== 2 || !p.loanListed || !p.transferListed || !loanBox || !trBox) { if (sw) sw.remove(); return; }
        // el motor original solo prepara el bloque de cesión: preparamos también el de traspaso
        const input = document.querySelector('input#offerAmount');
        if (input && (!input.value || input.value === '0')) input.value = p.askingPrice || 0;
        try { window.populatePlayerExchangeSelect && window.populatePlayerExchangeSelect(); } catch (e) { /* */ }
        if (!sw) {
            sw = document.createElement('div'); sw.id = 'pcfModeSwitch';
            sw.style.cssText = 'display:flex;gap:8px;margin:10px 0 14px;flex-wrap:wrap';
            loanBox.parentNode.insertBefore(sw, loanBox);
        }
        sw.innerHTML = `<button type="button" data-m="transfer" class="pcf-mode-btn"><b>💶 Comprar al jugador</b><small>Precio pedido: ${fmt(p.askingPrice || 0)}€</small></button>
            <button type="button" data-m="loan" class="pcf-mode-btn"><b>🔄 Pedir cesión</b><small>Pagas una parte de su sueldo</small></button>`;
        const apply = () => {
            loanBox.style.display = _mode === 'loan' ? 'block' : 'none';
            trBox.style.display = _mode === 'transfer' ? 'block' : 'none';
            sw.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === _mode));
            if (_mode === 'transfer') { try { enhanceExchange(); } catch (e) { /* */ } } else { try { refreshLoanInfo(); } catch (e) { /* */ } }
        };
        sw.querySelectorAll('button').forEach(b => { b.onclick = () => { _mode = b.dataset.m; apply(); }; });
        apply();
    }
    (function () {
        const css = document.createElement('style');
        css.textContent = `.pcf-mode-btn{flex:1 1 200px;text-align:left;cursor:pointer;padding:9px 14px;border-radius:5px;background:rgba(255,255,255,.06);border:1px solid rgba(122,160,212,.45);color:#cfe0ff;font-family:inherit;transition:all .15s}
        .pcf-mode-btn b{display:block;font-size:.95rem;letter-spacing:.03em}.pcf-mode-btn small{display:block;opacity:.75;font-size:.76rem;margin-top:2px}
        .pcf-mode-btn:hover{border-color:var(--pcf-gold,#ffd24a)}
        .pcf-mode-btn.on{background:rgba(255,210,74,.18);border-color:var(--pcf-gold,#ffd24a);color:#fff;box-shadow:0 0 0 1px var(--pcf-gold,#ffd24a)}`;
        document.head.appendChild(css);
    })();
    function renderAttrsHook() {
        const orig = window.updateNegotiationModal;
        if (typeof orig !== 'function' || orig._pcfAttrs) return;
        window.updateNegotiationModal = function (...a) { const r = orig.apply(this, a); try { renderAttrs(); refreshLoanInfo(); enhanceModeSwitch(); if (!(gs()?.negotiatingPlayer?.loanListed && gs()?.negotiatingPlayer?.transferListed)) enhanceExchange(); } catch (e) { /* */ } return r; };
        window.updateNegotiationModal._pcfAttrs = true;
    }

    // ── Cesión: texto dinámico (tú pagas / paga el club de origen) ──
    function refreshLoanInfo() {
        const pl = gs()?.negotiatingPlayer;
        const sl = document.getElementById('loanWageContribution');
        const box = document.getElementById('loanWageSummary');
        if (!pl || !sl || !box) return;
        const pct = parseInt(sl.value) || 0, wage = pl.salary || 0;
        const mine = Math.round(wage * pct / 100), club = wage - mine;
        // el span oculto lo actualiza otro módulo: se conserva siempre
        box.innerHTML = `<span id="loanClubContributionInfo" style="display:none"></span><strong>Tú pagas:</strong> ${fmt(mine)}€/sem (${pct}%) &nbsp;·&nbsp; <strong>El club de origen paga:</strong> ${fmt(club)}€/sem (${100 - pct}%)`;
    }
    document.addEventListener('input', e => { if (e.target && e.target.id === 'loanWageContribution') refreshLoanInfo(); });

    // ── Panel "Negociaciones en curso" (página Negociaciones) ──
    function renderOngoing() {
        const page = document.getElementById('negotiations');
        const st = gs();
        if (!page || !st) return;
        let box = document.getElementById('pcfOngoing');
        if (!box) {
            box = document.createElement('div');
            box.id = 'pcfOngoing';
            const list = document.getElementById('negotiationsSquadList');
            (list ? list.parentNode : page).insertBefore(box, list || null);
        }
        const bids = getBids();
        const terms = getTerms();
        const waiting = new Set(bids.map(b => b.playerName));
        const rows = [];
        bids.forEach(b => rows.push(`<div class="pcf-neg-row"><span class="pcf-neg-ic">📨</span><div class="pcf-neg-body">
            <strong>${b.playerName}</strong> <small>(${b.club})</small><br>
            ${b.isLoan ? `Cesión: pagas el ${b.amount}% de su salario` : `Traspaso: ${fmt(b.amount)}€${(b.exchange || []).length ? ' + ' + b.exchange.join(', ') : ''}`}
            <span class="pcf-neg-tag wait">Esperando respuesta del club · tras la próxima jornada</span></div>
            <button class="btn btn-sm" data-pcf-withdraw="${encodeURIComponent(b.playerName)}">Retirar oferta</button></div>`));
        Object.entries(terms).forEach(([name, t]) => {
            if (waiting.has(name) || !t.player || t.season !== st.currentSeason) return;
            rows.push(`<div class="pcf-neg-row"><span class="pcf-neg-ic">🤝</span><div class="pcf-neg-body">
                <strong>${name}</strong> <small>(${t.club || t.player.club})</small><br>
                Acuerdo con el jugador: ${fmt(t.playerOffer?.salary)}€/sem
                <span class="pcf-neg-tag ok">Falta cerrar con su club</span></div>
                <span style="display:flex;gap:6px"><button class="btn btn-sm" data-pcf-resume="${encodeURIComponent(name)}">Retomar con el club</button>
                <button class="btn btn-sm page-close-btn" data-pcf-drop="${encodeURIComponent(name)}">Descartar</button></span></div>`);
        });
        box.innerHTML = `<h3 style="margin:0 0 8px;font-size:.95rem;letter-spacing:.08em;text-transform:uppercase;color:var(--pcf-gold,#ffd24a)">Negociaciones en curso</h3>` +
            (rows.length ? rows.join('') : `<div class="pcf-neg-empty">No tienes ninguna negociación abierta. Las ofertas que hagas en Fichar, y los acuerdos con jugadores pendientes de cerrar con su club, aparecerán aquí para retomarlas cuando quieras.</div>`);
        box.querySelectorAll('[data-pcf-withdraw]').forEach(b => b.onclick = () => {
            const n = decodeURIComponent(b.dataset.pcfWithdraw);
            setBids(getBids().filter(x => x.playerName !== n)); renderOngoing();
        });
        box.querySelectorAll('[data-pcf-drop]').forEach(b => b.onclick = async () => {
            const n = decodeURIComponent(b.dataset.pcfDrop);
            if (await window.pcfConfirm('Descartar negociación', `¿Descartar el acuerdo con ${n}? Tendrás que volver a negociar con el jugador.`, { okLabel: 'Descartar' })) {
                const t = getTerms(); delete t[n]; setTerms(t); renderOngoing();
            }
        });
        box.querySelectorAll('[data-pcf-resume]').forEach(b => b.onclick = () => {
            const n = decodeURIComponent(b.dataset.pcfResume); const t = getTerms()[n];
            if (t?.player) window.startNegotiationUI(encodeURIComponent(JSON.stringify(t.player)));
        });
    }
    function hookNegPage() {
        const orig = window.openPage;
        if (typeof orig !== 'function' || orig._pcfOngoing) return;
        window.openPage = function (id, ...a) { const r = orig.call(this, id, ...a); if (id === 'negotiations') setTimeout(renderOngoing, 120); return r; };
        window.openPage._pcfOngoing = true;
    }
    (function () {
        const css = document.createElement('style');
        css.textContent = `#pcfOngoing{background:linear-gradient(180deg,rgba(36,80,142,.45),rgba(7,22,48,.75));border:1px solid #06142e;border-left:4px solid var(--pcf-gold,#ffd24a);border-radius:3px;padding:12px 14px;margin:0 0 14px}
        .pcf-neg-row{display:flex;gap:12px;align-items:center;padding:8px 0;border-top:1px solid rgba(122,160,212,.25)}.pcf-neg-row:first-of-type{border-top:0}
        .pcf-neg-ic{font-size:1.4rem}.pcf-neg-body{flex:1;font-size:.88rem;line-height:1.45}.pcf-neg-body small{opacity:.7}
        .pcf-neg-tag{display:inline-block;margin-left:6px;padding:1px 9px;border-radius:10px;font-size:.72rem;font-weight:700}
        .pcf-neg-tag.wait{background:rgba(255,193,7,.2);color:#ffd54f;border:1px solid #ffc107}.pcf-neg-tag.ok{background:rgba(76,175,80,.2);color:#a5d6a7;border:1px solid #4caf50}
        .pcf-neg-empty{font-size:.86rem;opacity:.8;line-height:1.45}`;
        document.head.appendChild(css);
    })();
    window.pcfRenderOngoing = renderOngoing;

    // ── Diseño de las ventanas: incentivos y jugadores de intercambio como etiquetas ──
    (function () {
        const css = document.createElement('style');
        css.textContent = `
        #negotiationModal .negotiation-incentives{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 16px}
        #negotiationModal .negotiation-incentives > div{margin:0;padding:0;position:relative}
        #negotiationModal .negotiation-incentives input[type=checkbox]{position:absolute;opacity:0;pointer-events:none;width:0;height:0}
        #negotiationModal .negotiation-incentives label{display:inline-flex;align-items:center;gap:7px;margin:0;padding:6px 13px;border-radius:16px;cursor:pointer;
            background:rgba(255,255,255,.06);border:1px solid rgba(122,160,212,.45);color:#cfe0ff;font-size:.84rem;font-weight:700;user-select:none;transition:all .15s}
        #negotiationModal .negotiation-incentives label::before{content:'+';display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;
            background:rgba(255,255,255,.15);font-size:.8rem;line-height:1}
        #negotiationModal .negotiation-incentives label:hover{border-color:var(--pcf-gold,#ffd24a)}
        #negotiationModal .negotiation-incentives input:checked + label{background:rgba(255,210,74,.18);border-color:var(--pcf-gold,#ffd24a);color:#fff}
        #negotiationModal .negotiation-incentives input:checked + label::before{content:'✓';background:var(--pcf-gold,#ffd24a);color:#06142e}
        #negotiationModal .negotiation-incentives input:focus-visible + label{outline:2px solid #fff}
        #pcfExchange{margin:6px 0 12px}
        #pcfExchange .pcf-ex-grid{display:flex;flex-wrap:wrap;gap:7px;max-height:200px;overflow-y:auto;padding:2px}
        .pcf-chip-btn{display:inline-flex;flex-direction:column;align-items:flex-start;gap:1px;padding:6px 12px;border-radius:6px;cursor:pointer;text-align:left;
            background:rgba(255,255,255,.06);border:1px solid rgba(122,160,212,.45);color:#e6eefb;font-size:.82rem;font-weight:700;font-family:inherit;transition:all .15s}
        .pcf-chip-btn small{font-weight:500;opacity:.75;font-size:.72rem}
        .pcf-chip-btn:hover{border-color:var(--pcf-gold,#ffd24a)}
        .pcf-chip-btn.sel{background:rgba(255,210,74,.18);border-color:var(--pcf-gold,#ffd24a);box-shadow:0 0 0 1px var(--pcf-gold,#ffd24a)}
        .pcf-chip-btn.sel::after{content:'✓ Incluido en la oferta';font-size:.68rem;color:var(--pcf-gold,#ffd24a);font-weight:800}
        #pcfExchangeSummary{margin-top:8px;font-size:.84rem;color:#cfe0ff}
        #playerExchangeSelect{display:none !important}`;
        document.head.appendChild(css);
    })();
    function enhanceExchange() {
        const sel = document.getElementById('playerExchangeSelect');
        if (!sel) return;
        let box = document.getElementById('pcfExchange');
        if (!box) {
            box = document.createElement('div'); box.id = 'pcfExchange';
            sel.parentNode.insertBefore(box, sel.nextSibling);
        }
        const squad = gs()?.squad || [];
        const val = n => { const p = squad.find(x => x.name === n); return p && window.pcfEconomy ? window.pcfEconomy.marketValue(p) * 0.8 : 0; };
        const draw = () => {
            const chosen = [...sel.options].filter(o => o.selected);
            const total = chosen.reduce((t, o) => t + val(o.value), 0);
            box.querySelector('#pcfExchangeSummary').innerHTML = chosen.length
                ? `<strong>${chosen.length}</strong> jugador(es) en la oferta · valor aproximado <strong>${fmt(total)}€</strong> <span style="opacity:.7">(cuentan al 80 % de su valor)</span>`
                : 'Sin jugadores en la oferta: solo dinero.';
        };
        box.innerHTML = `<div class="pcf-ex-grid"></div><div id="pcfExchangeSummary"></div>`;
        const grid = box.querySelector('.pcf-ex-grid');
        [...sel.options].forEach(o => {
            const p = squad.find(x => x.name === o.value);
            const b = document.createElement('button'); b.type = 'button';
            b.className = 'pcf-chip-btn' + (o.selected ? ' sel' : '');
            b.innerHTML = `${(p ? p.name : o.value)}<small>${p ? `${p.position} · media ${p.overall} · ${fmt(window.pcfEconomy ? window.pcfEconomy.marketValue(p) : p.value)}€` : o.textContent}</small>`;
            b.onclick = () => { o.selected = !o.selected; b.classList.toggle('sel', o.selected); draw(); };
            grid.appendChild(b);
        });
        draw();
    }

    // Varios módulos redefinen estas funciones con retraso: reinstalar unas veces
    [1500, 3000, 6000, 10000].forEach(ms => setTimeout(install, ms));
    window.pcfNegotiations = { pending: getBids, resolveBids };
})();
