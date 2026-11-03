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
    const gs = () => gl()?.getGameState?.();
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

    window.pcfNotify = (title, message) => dialog({ title, message, buttons: [{ label: 'Aceptar', value: true }] });
    window.pcfConfirm = (title, message, { okLabel = 'Confirmar', danger = false } = {}) =>
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

        const result = gl().offerToPlayer(offeredSalary, !!val('offeredBonus')?.checked, !!val('offeredCar')?.checked,
            !!val('offeredHouse')?.checked, !!val('offeredMerchPercent')?.checked, !!val('offeredTicketPercent')?.checked);

        if (result.success) {
            const after = gs();
            // Condiciones pactadas: sirven para volver a negociar con el club sin repetir esta fase
            if (after?.playerOffer && after.negotiationStep === 2) {
                setTerms({ ...getTerms(), [player.name]: { playerOffer: after.playerOffer, season: after.currentSeason } });
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
            amount = parseInt(document.getElementById('loanWageContribution')?.value);
        } else {
            amount = parseInt(document.getElementById('offerAmount')?.value);
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
        gl().addNews(`📨 Oferta enviada al ${player.club} por ${player.name}: ${isLoan ? `cesión asumiendo ${fmt(amount)}€/sem` : `${fmt(amount)}€`}${exchange.length ? ` + ${exchange.join(', ')}` : ''}. Responderán tras la próxima jornada.`, 'info');
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
                gl().addNews(`✅ ¡El ${bid.club} acepta! ${bid.playerName} es nuevo jugador del ${st.team}.`, 'success');
                gl().addNews(`🗞️ PRENSA: El ${st.team} cierra el fichaje de ${bid.playerName} procedente del ${bid.club}.`, 'info');
                await window.pcfNotify('¡Fichaje cerrado!', result.message || `${bid.playerName} ficha por tu club.`);
            } else {
                const canRetry = /Podrías mejorarla/i.test(result.message || '');
                gl().addNews(`❌ El ${bid.club} rechaza tu oferta por ${bid.playerName}.${canRetry ? ' Puedes mejorarla desde Fichar.' : ''}`, 'warning');
                if (!canRetry) { const terms = getTerms(); delete terms[bid.playerName]; setTerms(terms); }
                await window.pcfNotify('Oferta rechazada', `${result.message}${canRetry ? '\n\nLas condiciones con el jugador siguen en pie: vuelve a negociar con él para mejorar la oferta al club.' : ''}`);
            }
        }
        window.ui?.refreshUI?.(gs());
    }

    // ── Instalación (después de los demás módulos que redefinen estas funciones) ──
    function install() {
        if (window.submitPlayerOffer && window.submitPlayerOffer._pcfNeg) return;
        window.submitPlayerOffer = submitPlayerOffer; submitPlayerOffer._pcfNeg = true;
        window.submitTransferOffer = () => queueClubBid(false);
        window.submitLoanOffer = () => queueClubBid(true);

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
    // Varios módulos redefinen estas funciones con retraso: reinstalar unas veces
    [1500, 3000, 6000].forEach(ms => setTimeout(install, ms));
    window.pcfNegotiations = { pending: getBids, resolveBids };
})();
