// ============================================================
// injector-financial-deals.js  v2.0
//
// MÓDULO: Préstamos bancarios + Patrocinios + Derechos TV
//
// CORREGIDO v2:
// - Inyecta en página 'commercial' (Gestión Comercial / Decisiones)
// - Patrocinio y TV se aceptan por separado, modal no se cierra
//   hasta que ambos estén resueltos (o el usuario lo cierre)
// - Contratos solo expiran pasadas las temporadas contratadas
// - No se generan nuevas ofertas mientras el contrato esté vigente
// - Las noticias de expiración solo salen cuando realmente expira
// ============================================================

(function () {
    'use strict';

    const gl  = () => window.gameLogic;
    const gs  = () => gl()?.getGameState();
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const save = u => gl()?.updateGameState(u);

    // ── Intereses por plazo ───────────────────────────────────────
    const LOAN_INTEREST = { 6: 0.04, 12: 0.07, 24: 0.12, 36: 0.18 };

    // ── Importes base anuales por categoría ───────────────────────
    const DEAL_BASE = {
        primera:     { sponsor: 8_000_000,  tv: 25_000_000 },
        segunda:     { sponsor: 2_000_000,  tv:  6_000_000 },
        rfef_grupo1: { sponsor:   400_000,  tv:    800_000 },
        rfef_grupo2: { sponsor:   400_000,  tv:    800_000 },
    };

    // ── Acceso al estado de deals ─────────────────────────────────
    function getD() {
        const s = gs() || {};
        return {
            loans:         s.fd_loans   || [],
            sponsorDeal:   s.fd_sponsor || null,
            tvDeal:        s.fd_tv      || null,
            pendingOffers: s.fd_pending || null,
        };
    }
    function saveD(d) {
        save({
            fd_loans:   d.loans,
            fd_sponsor: d.sponsorDeal,
            fd_tv:      d.tvDeal,
            fd_pending: d.pendingOffers,
        });
    }

    // ── Rating medio del equipo ───────────────────────────────────
    function avgRating() {
        const s = gs();
        if (!s?.squad?.length) return 70;
        const vals = s.squad.map(p => p.overall || p.rating || 70);
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }

    // ── Recalcular weeklyExpenses y weeklyIncomeBase ──────────────
    function recalcWeekly() {
        const s = gs();
        if (!s) return;
        const d = getD();

        const loanPayment = d.loans.filter(l => l.weeksLeft > 0)
            .reduce((sum, l) => sum + l.weeklyPayment, 0);

        const sponsorW = d.sponsorDeal?.active ? Math.round(d.sponsorDeal.annualAmount / 38) : 0;
        const tvW      = d.tvDeal?.active      ? Math.round(d.tvDeal.annualAmount      / 38) : 0;

        if (s.fd_baseOrig === undefined) {
            save({ fd_baseOrig: s.weeklyIncomeBase ?? 5000 });
        }
        const baseOrig = s.fd_baseOrig ?? s.weeklyIncomeBase ?? 5000;

        const salaries = (s.squad || []).reduce((sum, p) => sum + (p.salary || 0), 0);
        const staffSal = Object.values(s.staff || {}).filter(Boolean)
                             .reduce((sum, x) => sum + (x.salary || 0), 0);

        save({
            weeklyExpenses:   salaries + staffSal + loanPayment,
            weeklyIncomeBase: baseOrig + sponsorW + tvW,
            fd_loanPayment:   loanPayment,
            fd_sponsorW:      sponsorW,
            fd_tvW:           tvW,
        });
    }

    // ── Noticias ──────────────────────────────────────────────────
    function news(msg, type) {
        try { gl()?.addNews?.(msg, type); } catch(e) {}
    }

    // ── PRÉSTAMOS ─────────────────────────────────────────────────
    function requestLoan(amount, weeks) {
        const s = gs();
        if (!s) return;
        const d = getD();
        const interest  = LOAN_INTEREST[weeks] || 0.1;
        const total     = Math.round(amount * (1 + interest));
        const weeklyPay = Math.round(total / weeks);

        d.loans.push({
            id: Date.now(), amount, totalWithInt: total,
            weeklyPayment: weeklyPay, weeksTotal: weeks, weeksLeft: weeks,
        });
        saveD(d);
        save({ balance: (s.balance || 0) + amount });
        recalcWeekly();
        news(`🏦 Préstamo concedido: ${fmt(amount)}€ a ${weeks} sem. · Cuota: ${fmt(weeklyPay)}€/sem`, 'info');
        if (window._financeRefresh) window._financeRefresh();
        refreshUI();
    }

    function processLoanPayments() {
        const d = getD();
        let changed = false;
        d.loans = d.loans.map(l => {
            if (l.weeksLeft <= 0) return l;
            changed = true;
            const left = l.weeksLeft - 1;
            if (left === 0) news(`✅ Préstamo de ${fmt(l.amount)}€ completamente devuelto.`, 'success');
            return { ...l, weeksLeft: left };
        });
        if (changed) { saveD(d); recalcWeekly(); }
    }

    // ── GENERADOR DE OFERTAS ──────────────────────────────────────
    function generateOffers() {
        const s    = gs();
        const div  = s?.division || 'rfef_grupo1';
        const base = DEAL_BASE[div] || DEAL_BASE.rfef_grupo1;
        const rat  = avgRating();
        const pop  = s?.popularity || 50;
        const mult = Math.max(0.4, Math.min(2.2,
            0.6 + (rat - 60) / 40 * 0.9 + (pop - 50) / 100 * 0.5));
        const rnd  = () => 0.82 + Math.random() * 0.36;
        const rnd100k = v => Math.round(v / 100_000) * 100_000;
        const rnd50k  = v => Math.round(v / 50_000)  * 50_000;

        return {
            sponsorOffers: [1, 2, 3].map(y => ({
                type: 'sponsor', years: y,
                annualAmount: rnd50k(base.sponsor * mult * rnd())
            })),
            tvOffers: [1, 2, 3].map(y => ({
                type: 'tv', years: y,
                annualAmount: rnd100k(base.tv * mult * rnd())
            })),
        };
    }

    function maybeGenerateOffers() {
        const s = gs();
        if (!s?.team) return;
        const d = getD();

        const needSponsor = !d.sponsorDeal?.active;
        const needTv      = !d.tvDeal?.active;
        if (!needSponsor && !needTv) return;

        // Si ya hay pendientes para ese tipo, solo mostrar modal
        const alreadyHasSponsor = !!d.pendingOffers?.sponsorOffers;
        const alreadyHasTv      = !!d.pendingOffers?.tvOffers;
        if ((!needSponsor || alreadyHasSponsor) && (!needTv || alreadyHasTv)) {
            setTimeout(showOffersModal, 800);
            return;
        }

        const fresh = generateOffers();
        d.pendingOffers = {
            sponsorOffers: needSponsor ? fresh.sponsorOffers : (d.pendingOffers?.sponsorOffers || null),
            tvOffers:      needTv      ? fresh.tvOffers      : (d.pendingOffers?.tvOffers      || null),
        };
        saveD(d);

        const msgs = [
            needSponsor && !alreadyHasSponsor ? '📣 Nueva oferta de patrocinio' : '',
            needTv      && !alreadyHasTv      ? '📺 Nueva oferta de derechos TV' : '',
        ].filter(Boolean).join(' · ');
        if (msgs) news(msgs + ' — revisa Gestión Comercial', 'info');
        setTimeout(showOffersModal, 800);
        refreshUI();
    }

    // Procesar cambio de temporada
    function processNewSeason() {
        const d = getD();
        let changed = false;

        if (d.sponsorDeal?.active) {
            const left = d.sponsorDeal.yearsLeft - 1;
            d.sponsorDeal = { ...d.sponsorDeal, yearsLeft: left };
            if (left <= 0) {
                d.sponsorDeal.active = false;
                news('📣 Contrato de patrocinio expirado — recibirás nuevas ofertas esta temporada', 'warning');
            }
            changed = true;
        }
        if (d.tvDeal?.active) {
            const left = d.tvDeal.yearsLeft - 1;
            d.tvDeal = { ...d.tvDeal, yearsLeft: left };
            if (left <= 0) {
                d.tvDeal.active = false;
                news('📺 Contrato de derechos TV expirado — recibirás nuevas ofertas esta temporada', 'warning');
            }
            changed = true;
        }
        if (changed) { saveD(d); recalcWeekly(); }
    }

    // ── ACEPTAR / RECHAZAR ────────────────────────────────────────
    function acceptOffer(type, idx) {
        const s = gs();
        const d = getD();
        if (!d.pendingOffers) return;

        const arr   = type === 'sponsor' ? d.pendingOffers.sponsorOffers : d.pendingOffers.tvOffers;
        const offer = arr?.[idx];
        if (!offer) return;

        const deal = {
            active: true,
            annualAmount: offer.annualAmount,
            years: offer.years, yearsLeft: offer.years,
            season: s.currentSeason,
        };

        if (type === 'sponsor') {
            d.sponsorDeal = deal;
            d.pendingOffers = { ...d.pendingOffers, sponsorOffers: null };
            news(`📣 Patrocinio firmado: ${fmt(offer.annualAmount)}€/año · ${offer.years} temp.`, 'success');
        } else {
            d.tvDeal = deal;
            d.pendingOffers = { ...d.pendingOffers, tvOffers: null };
            news(`📺 Derechos TV firmados: ${fmt(offer.annualAmount)}€/año · ${offer.years} temp.`, 'success');
        }

        if (!d.pendingOffers.sponsorOffers && !d.pendingOffers.tvOffers) {
            d.pendingOffers = null;
        }

        saveD(d);
        recalcWeekly();
        if (window._financeRefresh) window._financeRefresh();
        updateOffersModal();
        refreshUI();
    }

    function rejectOffer(type) {
        const d = getD();
        if (!d.pendingOffers) return;
        const fresh = generateOffers();
        if (type === 'sponsor') d.pendingOffers = { ...d.pendingOffers, sponsorOffers: fresh.sponsorOffers };
        else                    d.pendingOffers = { ...d.pendingOffers, tvOffers:      fresh.tvOffers };
        saveD(d);
        news('⚠️ Oferta rechazada — llegarán nuevas propuestas la próxima semana', 'warning');
        updateOffersModal();
        refreshUI();
    }

    // ── MODAL ─────────────────────────────────────────────────────
    function buildOffersBody() {
        const d = getD();
        if (!d.pendingOffers && !d.sponsorDeal?.active && !d.tvDeal?.active) {
            return '<p style="color:#888;text-align:center;padding:20px 0;">Sin ofertas ni contratos activos.</p>';
        }

        let html = '';

        // ── Patrocinio ────────────────────────────────────────────
        if (d.pendingOffers?.sponsorOffers && !d.sponsorDeal?.active) {
            html += `
            <div style="margin-bottom:24px;">
              <h3 style="color:#4CAF50;font-size:.95em;margin:0 0 10px;
                         border-bottom:1px solid #2a3a2a;padding-bottom:6px;">📣 Ofertas de patrocinio</h3>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${d.pendingOffers.sponsorOffers.map((o, i) => `
                  <div style="background:rgba(76,175,80,.06);border:1px solid rgba(76,175,80,.2);
                              border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                      <div style="color:#4CAF50;font-weight:bold;">${fmt(o.annualAmount)}€/año</div>
                      <div style="color:#888;font-size:.8em;">
                        ${o.years} temp. · Total: ${fmt(o.annualAmount * o.years)}€
                      </div>
                    </div>
                    <button onclick="window._fdAccept('sponsor',${i})"
                      style="background:#4CAF50;color:#fff;border:none;border-radius:8px;
                             padding:8px 18px;cursor:pointer;font-weight:bold;">Firmar</button>
                  </div>`).join('')}
              </div>
              <button onclick="window._fdReject('sponsor')"
                style="margin-top:8px;background:transparent;color:#666;border:1px solid #333;
                       border-radius:8px;padding:6px 14px;cursor:pointer;font-size:.8em;width:100%;">
                Rechazar y pedir nuevas ofertas
              </button>
            </div>`;
        } else if (d.sponsorDeal?.active) {
            html += `
            <div style="background:rgba(76,175,80,.06);border:1px solid rgba(76,175,80,.2);
                        border-radius:10px;padding:12px;margin-bottom:18px;">
              <div style="display:flex;justify-content:space-between;">
                <span style="color:#4CAF50;font-weight:bold;">📣 Patrocinio activo</span>
                <span style="color:#4CAF50;">${fmt(d.sponsorDeal.annualAmount)}€/año</span>
              </div>
              <div style="color:#777;font-size:.8em;margin-top:4px;">
                ${d.sponsorDeal.yearsLeft} temp. restante${d.sponsorDeal.yearsLeft!==1?'s':''}
              </div>
            </div>`;
        }

        // ── Derechos TV ───────────────────────────────────────────
        if (d.pendingOffers?.tvOffers && !d.tvDeal?.active) {
            html += `
            <div style="margin-bottom:24px;">
              <h3 style="color:#2196F3;font-size:.95em;margin:0 0 10px;
                         border-bottom:1px solid #1a2a3a;padding-bottom:6px;">📺 Ofertas de derechos TV</h3>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${d.pendingOffers.tvOffers.map((o, i) => `
                  <div style="background:rgba(33,150,243,.06);border:1px solid rgba(33,150,243,.2);
                              border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                      <div style="color:#2196F3;font-weight:bold;">${fmt(o.annualAmount)}€/año</div>
                      <div style="color:#888;font-size:.8em;">
                        ${o.years} temp. · Total: ${fmt(o.annualAmount * o.years)}€
                      </div>
                    </div>
                    <button onclick="window._fdAccept('tv',${i})"
                      style="background:#2196F3;color:#fff;border:none;border-radius:8px;
                             padding:8px 18px;cursor:pointer;font-weight:bold;">Firmar</button>
                  </div>`).join('')}
              </div>
              <button onclick="window._fdReject('tv')"
                style="margin-top:8px;background:transparent;color:#666;border:1px solid #333;
                       border-radius:8px;padding:6px 14px;cursor:pointer;font-size:.8em;width:100%;">
                Rechazar y pedir nuevas ofertas
              </button>
            </div>`;
        } else if (d.tvDeal?.active) {
            html += `
            <div style="background:rgba(33,150,243,.06);border:1px solid rgba(33,150,243,.2);
                        border-radius:10px;padding:12px;margin-bottom:18px;">
              <div style="display:flex;justify-content:space-between;">
                <span style="color:#2196F3;font-weight:bold;">📺 Derechos TV activos</span>
                <span style="color:#2196F3;">${fmt(d.tvDeal.annualAmount)}€/año</span>
              </div>
              <div style="color:#777;font-size:.8em;margin-top:4px;">
                ${d.tvDeal.yearsLeft} temp. restante${d.tvDeal.yearsLeft!==1?'s':''}
              </div>
            </div>`;
        }

        return html || '<p style="color:#555;text-align:center;padding:10px 0;">Sin decisiones pendientes.</p>';
    }

    function showOffersModal() {
        if (document.getElementById('fd-modal')) { updateOffersModal(); return; }
        const d = getD();
        if (!d.pendingOffers && !d.sponsorDeal?.active && !d.tvDeal?.active) return;

        const wrap = document.createElement('div');
        wrap.id = 'fd-modal';
        wrap.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;
            background:rgba(0,0,0,.78);z-index:9999;
            display:flex;align-items:center;justify-content:center;padding:16px;`;
        wrap.innerHTML = `
          <div style="background:#1a1a2e;border-radius:16px;padding:24px;max-width:520px;width:100%;
                      border:1px solid #333;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
              <h2 style="color:#FFD700;margin:0;font-size:1.15em;">📬 Contratos Comerciales</h2>
              <button onclick="document.getElementById('fd-modal').remove()"
                style="background:#333;color:#aaa;border:none;border-radius:6px;
                       padding:4px 12px;cursor:pointer;font-size:1.1em;">✕</button>
            </div>
            <div id="fd-modal-body">${buildOffersBody()}</div>
          </div>`;
        document.body.appendChild(wrap);
    }

    function updateOffersModal() {
        const body = document.getElementById('fd-modal-body');
        if (body) body.innerHTML = buildOffersBody();
        const d = getD();
        if (!d.pendingOffers) {
            const m = document.getElementById('fd-modal');
            if (m) setTimeout(() => m.remove(), 500);
        }
    }

    window._fdAccept     = (type, idx) => acceptOffer(type, idx);
    window._fdReject     = (type)      => rejectOffer(type);
    window._fdShowOffers = ()          => showOffersModal();

    // ── SECCIÓN EN GESTIÓN COMERCIAL ──────────────────────────────
    function buildSection() {
        const page = document.getElementById('commercial');
        if (!page || document.getElementById('fd-section')) return;

        const sec = document.createElement('div');
        sec.id = 'fd-section';
        sec.style.cssText = 'margin-top:30px;';
        sec.innerHTML = `

        <h2 style="font-size:1.05em;color:#ccc;text-transform:uppercase;letter-spacing:1px;
                   border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:14px;">
            💼 Contratos comerciales
        </h2>
        <div id="fd-contracts" style="margin-bottom:12px;"></div>
        <button onclick="window._fdShowOffers()" id="fd-btn-offers"
          style="background:#1565C0;color:#fff;border:none;border-radius:8px;
                 padding:10px 20px;cursor:pointer;font-size:.9em;margin-bottom:30px;width:100%;">
          📬 Gestionar contratos y ofertas
        </button>

        <h2 style="font-size:1.05em;color:#ccc;text-transform:uppercase;letter-spacing:1px;
                   border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:14px;">
            🏦 Préstamos bancarios
        </h2>
        <div id="fd-loans" style="margin-bottom:14px;"></div>
        <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:16px;margin-bottom:8px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
            <div>
              <label style="color:#aaa;font-size:.82em;display:block;margin-bottom:4px;">Importe</label>
              <select id="fd-amt" style="width:100%;background:#111;color:#fff;border:1px solid #333;
                      border-radius:6px;padding:7px;font-size:.9em;">
                <option value="500000">500.000€</option>
                <option value="1000000">1.000.000€</option>
                <option value="2000000">2.000.000€</option>
                <option value="5000000">5.000.000€</option>
                <option value="10000000">10.000.000€</option>
                <option value="20000000">20.000.000€</option>
                <option value="50000000">50.000.000€</option>
              </select>
            </div>
            <div>
              <label style="color:#aaa;font-size:.82em;display:block;margin-bottom:4px;">Plazo</label>
              <select id="fd-wks" style="width:100%;background:#111;color:#fff;border:1px solid #333;
                      border-radius:6px;padding:7px;font-size:.9em;">
                <option value="6">6 semanas — 4% interés</option>
                <option value="12" selected>12 semanas — 7% interés</option>
                <option value="24">24 semanas — 12% interés</option>
                <option value="36">36 semanas — 18% interés</option>
              </select>
            </div>
          </div>
          <div id="fd-prev" style="color:#888;font-size:.82em;margin-bottom:10px;min-height:18px;"></div>
          <button onclick="window._fdAskLoan()"
            style="width:100%;background:#b71c1c;color:#fff;border:none;border-radius:8px;
                   padding:10px;cursor:pointer;font-weight:bold;font-size:.92em;">
            Solicitar préstamo
          </button>
        </div>`;

        page.appendChild(sec);

        const updatePrev = () => {
            const amt  = parseInt(document.getElementById('fd-amt')?.value || 0);
            const wks  = parseInt(document.getElementById('fd-wks')?.value  || 12);
            const tot  = Math.round(amt * (1 + (LOAN_INTEREST[wks] || 0.1)));
            const wpay = Math.round(tot / wks);
            const el   = document.getElementById('fd-prev');
            if (el) el.innerHTML = `Total: <strong style="color:#fff;">${fmt(tot)}€</strong>
                &nbsp;·&nbsp; Cuota: <strong style="color:#f5a623;">${fmt(wpay)}€/sem</strong>`;
        };
        document.getElementById('fd-amt')?.addEventListener('change', updatePrev);
        document.getElementById('fd-wks')?.addEventListener('change', updatePrev);
        updatePrev();
        refreshUI();
    }

    window._fdAskLoan = () => {
        const amt = parseInt(document.getElementById('fd-amt')?.value || 0);
        const wks = parseInt(document.getElementById('fd-wks')?.value || 12);
        if (!amt || !wks) return;
        if (confirm(`¿Solicitar préstamo de ${fmt(amt)}€ a ${wks} semanas?`)) requestLoan(amt, wks);
    };

    // ── REFRESCO ──────────────────────────────────────────────────
    function refreshUI() {
        const d = getD();

        // Contratos
        const cEl = document.getElementById('fd-contracts');
        if (cEl) {
            let html = '';
            if (d.sponsorDeal?.active) {
                const ds = d.sponsorDeal;
                html += `<div style="background:rgba(76,175,80,.08);border:1px solid rgba(76,175,80,.25);
                            border-radius:10px;padding:12px;margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;">
                    <span style="color:#4CAF50;font-weight:bold;">📣 Patrocinio activo</span>
                    <span style="color:#4CAF50;font-weight:bold;">${fmt(ds.annualAmount)}€/año</span>
                  </div>
                  <div style="color:#777;font-size:.8em;margin-top:4px;">
                    ${ds.yearsLeft} temp. restante${ds.yearsLeft!==1?'s':''} ·
                    ~${fmt(Math.round(ds.annualAmount/38))}€/sem
                  </div>
                </div>`;
            } else {
                html += `<div style="color:#555;font-size:.85em;font-style:italic;padding:4px 0 8px;">
                    📣 Sin contrato de patrocinio activo</div>`;
            }
            if (d.tvDeal?.active) {
                const dt = d.tvDeal;
                html += `<div style="background:rgba(33,150,243,.08);border:1px solid rgba(33,150,243,.25);
                            border-radius:10px;padding:12px;margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;">
                    <span style="color:#2196F3;font-weight:bold;">📺 Derechos TV activos</span>
                    <span style="color:#2196F3;font-weight:bold;">${fmt(dt.annualAmount)}€/año</span>
                  </div>
                  <div style="color:#777;font-size:.8em;margin-top:4px;">
                    ${dt.yearsLeft} temp. restante${dt.yearsLeft!==1?'s':''} ·
                    ~${fmt(Math.round(dt.annualAmount/38))}€/sem
                  </div>
                </div>`;
            } else {
                html += `<div style="color:#555;font-size:.85em;font-style:italic;padding:4px 0 8px;">
                    📺 Sin contrato de derechos TV activo</div>`;
            }
            cEl.innerHTML = html;
        }

        // Botón ofertas
        const btn = document.getElementById('fd-btn-offers');
        if (btn) {
            const has = !!d.pendingOffers;
            btn.style.background = has ? '#e65100' : '#1565C0';
            btn.textContent = has ? '🔔 ¡Hay ofertas pendientes! — Revisar' : '📬 Gestionar contratos y ofertas';
        }

        // Préstamos
        const lEl = document.getElementById('fd-loans');
        if (lEl) {
            const active = d.loans.filter(l => l.weeksLeft > 0);
            if (!active.length) {
                lEl.innerHTML = `<div style="color:#555;font-size:.85em;font-style:italic;padding:4px 0 8px;">
                    Sin préstamos activos.</div>`;
            } else {
                lEl.innerHTML = active.map(l => {
                    const pct = Math.round((1 - l.weeksLeft / l.weeksTotal) * 100);
                    return `<div style="background:rgba(255,255,255,.04);border-radius:8px;
                                padding:11px;margin-bottom:8px;">
                      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span style="color:#f5a623;font-weight:bold;">Préstamo ${fmt(l.amount)}€</span>
                        <span style="color:#aaa;font-size:.82em;">${l.weeksLeft} sem. restantes</span>
                      </div>
                      <div style="color:#888;font-size:.8em;margin-bottom:6px;">
                        Cuota: ${fmt(l.weeklyPayment)}€/sem ·
                        Pendiente: ${fmt(l.weeklyPayment * l.weeksLeft)}€
                      </div>
                      <div style="width:100%;height:5px;background:#333;border-radius:3px;">
                        <div style="width:${pct}%;height:100%;background:#f5a623;border-radius:3px;"></div>
                      </div>
                    </div>`;
                }).join('');
            }
        }
    }

    // ── HOOK simulateWeek ─────────────────────────────────────────
    function hookSimWeek() {
        if (typeof window.simulateWeek !== 'function') { setTimeout(hookSimWeek, 300); return; }
        if (window._fdHooked) return;
        window._fdHooked = true;

        let _lastSeason = null;

        const orig = window.simulateWeek;
        window.simulateWeek = async function (...args) {
            const result = await orig.apply(this, args);
            const s = gs();
            if (!s) return result;

            // Cambio de temporada
            if (_lastSeason && s.currentSeason && _lastSeason !== s.currentSeason) {
                processNewSeason();
                save({ fd_baseOrig: undefined });
                setTimeout(() => { recalcWeekly(); maybeGenerateOffers(); }, 600);
            }
            _lastSeason = s.currentSeason;

            processLoanPayments();
            recalcWeekly();
            if (window._financeRefresh) window._financeRefresh();
            refreshUI();
            return result;
        };
        console.log('[FinDeals] hook simulateWeek ✓');
    }

    // ── HOOK openPage ─────────────────────────────────────────────
    function hookOpenPage() {
        if (!window.openPage) { setTimeout(hookOpenPage, 300); return; }
        const orig = window.openPage;
        window.openPage = function (page, ...args) {
            orig.call(this, page, ...args);
            if (page === 'commercial') {
                setTimeout(() => { buildSection(); refreshUI(); }, 80);
            }
        };
    }

    // ── INIT ──────────────────────────────────────────────────────
    function init() {
        if (!window.gameLogic) { setTimeout(init, 400); return; }
        hookSimWeek();
        hookOpenPage();

        setTimeout(() => {
            recalcWeekly();
            maybeGenerateOffers();
            buildSection();
            refreshUI();
        }, 2200);

        window.FinDeals = { requestLoan, acceptOffer, rejectOffer, showOffersModal, refreshUI };
        console.log('[FinDeals] ✅ v2.0 listo — Préstamos + Patrocinios + Derechos TV');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();
})();
