// ============================================================
// injector-financial-deals.js  v1.0
//
// MÓDULO: Préstamos bancarios + Patrocinios + Derechos TV
//
// PRÉSTAMOS:
//  - El manager puede solicitar préstamos al banco
//  - Elige importe y plazo (6, 12, 24, 36 semanas)
//  - Cuota semanal = (capital + intereses) / semanas
//  - Descuento automático en weeklyExpenses cada semana
//  - Aparece en Decisiones con capital pendiente y semanas restantes
//
// PATROCINIOS + DERECHOS TV:
//  - Al inicio de temporada llegan ofertas automáticas
//  - Importe anual (por temporada), plazo 1-3 temporadas
//  - Importes ajustados a categoría, popularidad y rating del equipo
//  - Si se rechaza, vuelven nuevas ofertas la semana siguiente
//  - Ingresos suman a weeklyIncomeBase cada semana
//  - Aparecen en finanzas como línea separada
// ============================================================

(function () {
    'use strict';

    const gl  = () => window.gameLogic;
    const gs  = () => gl()?.getGameState();
    const fmt = n => Math.round(n || 0).toLocaleString('es-ES');
    const save = (u) => gl()?.updateGameState(u);

    // ── Constantes ────────────────────────────────────────────────
    const LOAN_INTEREST = {
        6:  0.04,   // 4% total para préstamos cortos
        12: 0.07,
        24: 0.12,
        36: 0.18
    };

    // Valores base anuales por categoría (patrocinio + TV separados)
    const DEAL_BASE = {
        primera:      { sponsor: 8_000_000,  tv: 25_000_000 },
        segunda:      { sponsor: 2_000_000,  tv:  6_000_000 },
        rfef_grupo1:  { sponsor:   400_000,  tv:    800_000 },
        rfef_grupo2:  { sponsor:   400_000,  tv:    800_000 },
    };

    // ── Helpers de estado ─────────────────────────────────────────
    function getDeals() {
        const state = gs();
        if (!state) return { loans: [], sponsorDeal: null, tvDeal: null, pendingOffers: null };
        return {
            loans:         state.finDeals_loans        || [],
            sponsorDeal:   state.finDeals_sponsor      || null,
            tvDeal:        state.finDeals_tv            || null,
            pendingOffers: state.finDeals_pending       || null
        };
    }

    function saveDeals(d) {
        save({
            finDeals_loans:   d.loans,
            finDeals_sponsor: d.sponsorDeal,
            finDeals_tv:      d.tvDeal,
            finDeals_pending: d.pendingOffers
        });
    }

    // Recalcular weeklyExpenses y weeklyIncomeBase desde cero
    function recalcWeekly() {
        const state = gs();
        if (!state) return;
        const deals = getDeals();

        // Cuotas activas de préstamos
        const loanPayment = deals.loans
            .filter(l => l.weeksLeft > 0)
            .reduce((s, l) => s + l.weeklyPayment, 0);

        // Ingresos semanales de contratos activos
        // Los contratos son por temporada → dividir entre 38 semanas
        const sponsorWeekly = deals.sponsorDeal?.active
            ? Math.round(deals.sponsorDeal.annualAmount / 38) : 0;
        const tvWeekly = deals.tvDeal?.active
            ? Math.round(deals.tvDeal.annualAmount / 38) : 0;

        // Base original del juego (sin nuestros añadidos)
        const baseOrig = state.finDeals_baseOrig ?? state.weeklyIncomeBase ?? 5000;
        if (state.finDeals_baseOrig === undefined) {
            save({ finDeals_baseOrig: state.weeklyIncomeBase ?? 5000 });
        }

        const salaries = state.squad?.reduce((s, p) => s + (p.salary || 0), 0) || 0;
        const staffSal = Object.values(state.staff || {}).filter(Boolean)
                             .reduce((s, x) => s + (x.salary || 0), 0);

        save({
            weeklyExpenses:   salaries + staffSal + loanPayment,
            weeklyIncomeBase: baseOrig + sponsorWeekly + tvWeekly,
            finDeals_loanPayment:   loanPayment,
            finDeals_sponsorWeekly: sponsorWeekly,
            finDeals_tvWeekly:      tvWeekly
        });
    }

    // ── PRÉSTAMOS ─────────────────────────────────────────────────
    function requestLoan(amount, weeks) {
        const state = gs();
        if (!state) return;
        const deals = getDeals();

        const interest    = LOAN_INTEREST[weeks] || 0.1;
        const total       = Math.round(amount * (1 + interest));
        const weeklyPay   = Math.round(total / weeks);
        const loan = {
            id:            Date.now(),
            amount,
            totalWithInt:  total,
            weeklyPayment: weeklyPay,
            weeksTotal:    weeks,
            weeksLeft:     weeks,
            weekRequested: state.week
        };

        deals.loans.push(loan);
        saveDeals(deals);
        save({ balance: (state.balance || 0) + amount });
        recalcWeekly();

        addNews(`🏦 Préstamo concedido: ${fmt(amount)}€ a ${weeks} semanas (cuota: ${fmt(weeklyPay)}€/sem)`, 'info');
        if (window._financeRefresh) window._financeRefresh();
        refreshDealsUI();
    }

    function processLoanPayments() {
        const deals = getDeals();
        let changed = false;
        deals.loans = deals.loans.map(l => {
            if (l.weeksLeft <= 0) return l;
            const newLeft = l.weeksLeft - 1;
            if (newLeft === 0) {
                addNews(`✅ Préstamo de ${fmt(l.amount)}€ completamente devuelto.`, 'success');
            }
            changed = true;
            return { ...l, weeksLeft: newLeft };
        });
        if (changed) {
            saveDeals(deals);
            recalcWeekly();
        }
    }

    // ── GENERADOR DE OFERTAS ──────────────────────────────────────
    function generateOffers() {
        const state = gs();
        if (!state) return null;

        const division = state.division || 'rfef_grupo1';
        const base     = DEAL_BASE[division] || DEAL_BASE.rfef_grupo1;
        const rating   = avgRating();
        const pop      = state.popularity || 50;

        // Multiplicador según calidad del equipo (0.6 – 1.8)
        const mult = 0.6 + (rating - 60) / 40 * 0.8 + (pop - 50) / 100 * 0.4;
        const m    = Math.max(0.4, Math.min(2.0, mult));

        // Variación aleatoria ±20%
        const rnd = () => 0.8 + Math.random() * 0.4;

        const sponsorOffers = [1, 2, 3].map(years => ({
            type:         'sponsor',
            years,
            annualAmount: Math.round(base.sponsor * m * rnd() / 100_000) * 100_000
        }));
        const tvOffers = [1, 2, 3].map(years => ({
            type:         'tv',
            years,
            annualAmount: Math.round(base.tv * m * rnd() / 100_000) * 100_000
        }));

        return { sponsorOffers, tvOffers, week: state.week };
    }

    function avgRating() {
        const state = gs();
        if (!state?.squad?.length) return 70;
        const vals = state.squad.map(p => p.overall || p.rating || 70);
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }

    function checkAndGenerateOffers() {
        const state = gs();
        if (!state?.team) return;
        const deals = getDeals();

        // Generar al inicio de temporada (semana 1) o si no hay oferta pendiente
        // y el contrato activo ha expirado
        const sponsorExpired = !deals.sponsorDeal?.active;
        const tvExpired      = !deals.tvDeal?.active;

        if ((sponsorExpired || tvExpired) && !deals.pendingOffers) {
            const offers = generateOffers();
            deals.pendingOffers = offers;
            saveDeals(deals);

            const hasS = sponsorExpired;
            const hasT = tvExpired;
            const msg  = [
                hasS ? '📣 Nueva oferta de patrocinio disponible' : '',
                hasT ? '📺 Nueva oferta de derechos TV disponible' : ''
            ].filter(Boolean).join(' · ');
            addNews(msg + ' — revisa Decisiones', 'info');
            showOffersModal();
        }
    }

    function acceptOffer(type, idx) {
        const state = gs();
        const deals = getDeals();
        if (!deals.pendingOffers) return;

        const offers  = type === 'sponsor' ? deals.pendingOffers.sponsorOffers : deals.pendingOffers.tvOffers;
        const offer   = offers[idx];
        if (!offer) return;

        const deal = {
            active:       true,
            annualAmount: offer.annualAmount,
            years:        offer.years,
            yearsLeft:    offer.years,
            season:       state.currentSeason,
            acceptedWeek: state.week
        };

        if (type === 'sponsor') {
            deals.sponsorDeal = deal;
            addNews(`📣 Contrato de patrocinio firmado: ${fmt(offer.annualAmount)}€/año por ${offer.years} temporada${offer.years > 1 ? 's' : ''}`, 'success');
        } else {
            deals.tvDeal = deal;
            addNews(`📺 Derechos TV firmados: ${fmt(offer.annualAmount)}€/año por ${offer.years} temporada${offer.years > 1 ? 's' : ''}`, 'success');
        }

        // Si ya hay deal para ambos, limpiar pendingOffers
        const newDeals = { ...deals };
        if (type === 'sponsor') newDeals.sponsorDeal = deal;
        else                    newDeals.tvDeal      = deal;

        const sOk = type === 'sponsor' ? true : !!newDeals.sponsorDeal?.active;
        const tOk = type === 'tv'      ? true : !!newDeals.tvDeal?.active;
        if (sOk && tOk) newDeals.pendingOffers = null;

        saveDeals(newDeals);
        recalcWeekly();
        if (window._financeRefresh) window._financeRefresh();

        const modal = document.getElementById('fd-offers-modal');
        if (modal) modal.remove();
        refreshDealsUI();
    }

    function rejectOffer(type) {
        const deals = getDeals();
        if (!deals.pendingOffers) return;
        // Regenerar solo las ofertas del tipo rechazado con valores ligeramente diferentes
        const fresh = generateOffers();
        if (type === 'sponsor') deals.pendingOffers.sponsorOffers = fresh.sponsorOffers;
        else                    deals.pendingOffers.tvOffers      = fresh.tvOffers;
        saveDeals(deals);
        addNews(`⚠️ Oferta rechazada — recibirás nuevas propuestas próximamente`, 'warning');

        const modal = document.getElementById('fd-offers-modal');
        if (modal) modal.remove();
        refreshDealsUI();
    }

    // Procesar renovación de contratos al inicio de temporada
    function processSeasonRenewal(newSeason) {
        const deals = getDeals();
        let changed = false;

        if (deals.sponsorDeal?.active) {
            deals.sponsorDeal.yearsLeft--;
            if (deals.sponsorDeal.yearsLeft <= 0) {
                deals.sponsorDeal.active = false;
                addNews('📣 Contrato de patrocinio EXPIRADO — pronto recibirás nuevas ofertas', 'warning');
                changed = true;
            }
        }
        if (deals.tvDeal?.active) {
            deals.tvDeal.yearsLeft--;
            if (deals.tvDeal.yearsLeft <= 0) {
                deals.tvDeal.active = false;
                addNews('📺 Contrato de derechos TV EXPIRADO — pronto recibirás nuevas ofertas', 'warning');
                changed = true;
            }
        }
        if (changed) {
            saveDeals(deals);
            recalcWeekly();
        }
    }

    // ── NOTICIAS ──────────────────────────────────────────────────
    function addNews(msg, type) {
        try {
            const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
            gl()?.addNews?.(msg, type);
        } catch(e) {}
    }

    // ── HOOK simulateWeek ─────────────────────────────────────────
    function hookSimulateWeek() {
        if (typeof window.simulateWeek !== 'function') { setTimeout(hookSimulateWeek, 300); return; }
        if (window._fdHooked) return;
        window._fdHooked = true;

        const orig = window.simulateWeek;
        window.simulateWeek = async function (...args) {
            const result = await orig.apply(this, args);
            const state  = gs();
            if (!state) return result;

            // Descontar cuotas de préstamos
            processLoanPayments();

            // Inicio de temporada: nueva temporada detectada
            if (state.week === 1) {
                const deals = getDeals();
                // Renovar contratos si temporada cambió
                processSeasonRenewal(state.currentSeason);
                // Reset baseOrig para la nueva temporada
                save({ finDeals_baseOrig: undefined });
                setTimeout(() => { recalcWeekly(); checkAndGenerateOffers(); }, 500);
            }

            // Semana 2: también mostrar ofertas si no se han aceptado
            if (state.week === 2) {
                const deals = getDeals();
                if (deals.pendingOffers) setTimeout(() => showOffersModal(), 1000);
            }

            recalcWeekly();
            if (window._financeRefresh) window._financeRefresh();
            refreshDealsUI();
            return result;
        };
        console.log('[FinDeals] simulateWeek hooked ✓');
    }

    // ── MODAL OFERTAS ─────────────────────────────────────────────
    function showOffersModal() {
        const deals = getDeals();
        if (!deals.pendingOffers) return;
        if (document.getElementById('fd-offers-modal')) return;

        const { sponsorOffers, tvOffers } = deals.pendingOffers;
        const sponsorActive = deals.sponsorDeal?.active;
        const tvActive      = deals.tvDeal?.active;

        let html = `
        <div id="fd-offers-modal" style="
            position:fixed;top:0;left:0;right:0;bottom:0;
            background:rgba(0,0,0,.75);z-index:9999;
            display:flex;align-items:center;justify-content:center;padding:16px;">
          <div style="background:#1a1a2e;border-radius:16px;padding:24px;max-width:520px;width:100%;
                      border:1px solid #333;max-height:90vh;overflow-y:auto;">
            <h2 style="color:#FFD700;margin:0 0 6px;font-size:1.2em;">📬 Nuevas Ofertas Comerciales</h2>
            <p style="color:#888;font-size:.85em;margin:0 0 20px;">Selecciona el contrato que más te convenga</p>`;

        if (!sponsorActive && sponsorOffers) {
            html += `
            <div style="margin-bottom:20px;">
              <h3 style="color:#ccc;font-size:.95em;margin:0 0 10px;border-bottom:1px solid #333;padding-bottom:6px;">
                📣 Patrocinio principal
              </h3>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${sponsorOffers.map((o, i) => `
                  <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:12px;
                              display:flex;justify-content:space-between;align-items:center;">
                    <div>
                      <div style="color:#fff;font-weight:bold;">${fmt(o.annualAmount)}€/año</div>
                      <div style="color:#888;font-size:.82em;">${o.years} temporada${o.years>1?'s':''} · Total: ${fmt(o.annualAmount * o.years)}€</div>
                    </div>
                    <button onclick="window._fdAccept('sponsor',${i})"
                      style="background:#4CAF50;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:bold;">
                      Firmar
                    </button>
                  </div>`).join('')}
              </div>
              <button onclick="window._fdReject('sponsor')"
                style="margin-top:8px;background:transparent;color:#888;border:1px solid #444;
                       border-radius:8px;padding:6px 14px;cursor:pointer;font-size:.82em;">
                Rechazar todas
              </button>
            </div>`;
        }

        if (!tvActive && tvOffers) {
            html += `
            <div style="margin-bottom:20px;">
              <h3 style="color:#ccc;font-size:.95em;margin:0 0 10px;border-bottom:1px solid #333;padding-bottom:6px;">
                📺 Derechos de televisión
              </h3>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${tvOffers.map((o, i) => `
                  <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:12px;
                              display:flex;justify-content:space-between;align-items:center;">
                    <div>
                      <div style="color:#fff;font-weight:bold;">${fmt(o.annualAmount)}€/año</div>
                      <div style="color:#888;font-size:.82em;">${o.years} temporada${o.years>1?'s':''} · Total: ${fmt(o.annualAmount * o.years)}€</div>
                    </div>
                    <button onclick="window._fdAccept('tv',${i})"
                      style="background:#2196F3;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:bold;">
                      Firmar
                    </button>
                  </div>`).join('')}
              </div>
              <button onclick="window._fdReject('tv')"
                style="margin-top:8px;background:transparent;color:#888;border:1px solid #444;
                       border-radius:8px;padding:6px 14px;cursor:pointer;font-size:.82em;">
                Rechazar todas
              </button>
            </div>`;
        }

        html += `
            <button onclick="document.getElementById('fd-offers-modal').remove()"
              style="width:100%;background:#333;color:#aaa;border:none;border-radius:8px;
                     padding:10px;cursor:pointer;margin-top:4px;">
              Decidir más tarde
            </button>
          </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    window._fdAccept = (type, idx) => acceptOffer(type, idx);
    window._fdReject = (type)      => rejectOffer(type);
    window._fdShowOffers = showOffersModal;

    // ── PANEL DE DECISIONES (inyectado en el panel de finanzas) ───
    function buildDealsSection() {
        const panel = document.getElementById('finance-panel');
        if (!panel || document.getElementById('fd-deals-section')) return;

        const sec = document.createElement('div');
        sec.id = 'fd-deals-section';
        sec.style.cssText = 'margin-top:8px;';
        sec.innerHTML = `
        <!-- PRÉSTAMOS BANCARIOS -->
        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;
                   font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">
            🏦 Préstamos bancarios
        </h2>
        <div id="fd-loans-list" style="margin-bottom:12px;font-size:.88em;"></div>
        <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:14px;margin-bottom:22px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <label style="color:#aaa;font-size:.82em;">Importe</label>
              <select id="fd-loan-amount" style="width:100%;background:#111;color:#fff;border:1px solid #333;
                      border-radius:6px;padding:6px;margin-top:4px;font-size:.9em;">
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
              <label style="color:#aaa;font-size:.82em;">Plazo</label>
              <select id="fd-loan-weeks" style="width:100%;background:#111;color:#fff;border:1px solid #333;
                      border-radius:6px;padding:6px;margin-top:4px;font-size:.9em;">
                <option value="6">6 semanas (4% int.)</option>
                <option value="12" selected>12 semanas (7% int.)</option>
                <option value="24">24 semanas (12% int.)</option>
                <option value="36">36 semanas (18% int.)</option>
              </select>
            </div>
          </div>
          <div id="fd-loan-preview" style="color:#888;font-size:.82em;margin-bottom:10px;"></div>
          <button onclick="window._fdRequestLoan()"
            style="width:100%;background:#e65100;color:#fff;border:none;border-radius:8px;
                   padding:10px;cursor:pointer;font-weight:bold;">
            Solicitar préstamo
          </button>
        </div>

        <!-- PATROCINIOS Y DERECHOS TV -->
        <h2 style="border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:10px;
                   font-size:1em;color:#ccc;text-transform:uppercase;letter-spacing:1px;">
            💼 Contratos comerciales
        </h2>
        <div id="fd-contracts-list" style="margin-bottom:10px;font-size:.88em;"></div>
        <div style="display:flex;gap:8px;margin-bottom:22px;">
          <button onclick="window._fdShowOffers()"
            style="flex:1;background:#1565C0;color:#fff;border:none;border-radius:8px;
                   padding:10px;cursor:pointer;font-size:.88em;">
            📬 Ver ofertas pendientes
          </button>
        </div>`;

        // Insertar antes del historial
        const histEl = panel.querySelector('#fin_mList');
        if (histEl) {
            const h2s = panel.querySelectorAll('h2');
            let histH2 = null;
            h2s.forEach(h => { if (h.textContent.includes('Historial')) histH2 = h; });
            if (histH2) panel.insertBefore(sec, histH2);
            else panel.appendChild(sec);
        } else {
            panel.appendChild(sec);
        }

        // Preview dinámica del préstamo
        const updatePreview = () => {
            const amt   = parseInt(document.getElementById('fd-loan-amount')?.value || 0);
            const wks   = parseInt(document.getElementById('fd-loan-weeks')?.value  || 12);
            const int   = LOAN_INTEREST[wks] || 0.1;
            const total = Math.round(amt * (1 + int));
            const weekly= Math.round(total / wks);
            const prev  = document.getElementById('fd-loan-preview');
            if (prev) prev.innerHTML =
                `Total a devolver: <strong style="color:#fff">${fmt(total)}€</strong> · Cuota: <strong style="color:#f5a623">${fmt(weekly)}€/semana</strong>`;
        };
        document.getElementById('fd-loan-amount')?.addEventListener('change', updatePreview);
        document.getElementById('fd-loan-weeks')?.addEventListener('change', updatePreview);
        updatePreview();

        refreshDealsUI();
    }

    function refreshDealsUI() {
        const deals    = getDeals();
        const state    = gs();
        if (!state) return;

        // ── Préstamos activos ─────────────────────────────────────
        const loansList = document.getElementById('fd-loans-list');
        if (loansList) {
            const active = deals.loans.filter(l => l.weeksLeft > 0);
            if (active.length === 0) {
                loansList.innerHTML = '<span style="color:#555;font-style:italic;">Sin préstamos activos.</span>';
            } else {
                loansList.innerHTML = active.map(l => `
                  <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:10px;
                              margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                      <div style="color:#f5a623;font-weight:bold;">Préstamo de ${fmt(l.amount)}€</div>
                      <div style="color:#888;font-size:.8em;">
                        Cuota: ${fmt(l.weeklyPayment)}€/sem ·
                        Pendiente: ${fmt(l.weeklyPayment * l.weeksLeft)}€ ·
                        ${l.weeksLeft} sem. restantes
                      </div>
                    </div>
                    <div style="text-align:right;">
                      <div style="font-size:.75em;color:#666;">${Math.round((1 - l.weeksLeft/l.weeksTotal)*100)}% pagado</div>
                      <div style="width:80px;height:6px;background:#333;border-radius:3px;margin-top:4px;">
                        <div style="width:${Math.round((1-l.weeksLeft/l.weeksTotal)*100)}%;height:100%;
                                    background:#f5a623;border-radius:3px;"></div>
                      </div>
                    </div>
                  </div>`).join('');
            }
        }

        // ── Contratos activos ─────────────────────────────────────
        const contractsList = document.getElementById('fd-contracts-list');
        if (contractsList) {
            const rows = [];

            if (deals.sponsorDeal?.active) {
                const d = deals.sponsorDeal;
                rows.push(`
                  <div style="background:rgba(76,175,80,.08);border:1px solid rgba(76,175,80,.2);
                              border-radius:8px;padding:10px;margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <div>
                        <span style="color:#4CAF50;font-weight:bold;">📣 Patrocinio</span>
                        <span style="color:#888;font-size:.8em;margin-left:8px;">${fmt(d.annualAmount)}€/año</span>
                      </div>
                      <span style="color:#aaa;font-size:.8em;">${d.yearsLeft} temp. restante${d.yearsLeft!==1?'s':''}</span>
                    </div>
                    <div style="color:#555;font-size:.78em;margin-top:4px;">
                      ~${fmt(Math.round(d.annualAmount/38))}€/semana · firmado ${d.season}
                    </div>
                  </div>`);
            } else {
                rows.push(`<div style="color:#555;font-size:.85em;font-style:italic;margin-bottom:8px;">
                    📣 Sin contrato de patrocinio activo</div>`);
            }

            if (deals.tvDeal?.active) {
                const d = deals.tvDeal;
                rows.push(`
                  <div style="background:rgba(33,150,243,.08);border:1px solid rgba(33,150,243,.2);
                              border-radius:8px;padding:10px;margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <div>
                        <span style="color:#2196F3;font-weight:bold;">📺 Derechos TV</span>
                        <span style="color:#888;font-size:.8em;margin-left:8px;">${fmt(d.annualAmount)}€/año</span>
                      </div>
                      <span style="color:#aaa;font-size:.8em;">${d.yearsLeft} temp. restante${d.yearsLeft!==1?'s':''}</span>
                    </div>
                    <div style="color:#555;font-size:.78em;margin-top:4px;">
                      ~${fmt(Math.round(d.annualAmount/38))}€/semana · firmado ${d.season}
                    </div>
                  </div>`);
            } else {
                rows.push(`<div style="color:#555;font-size:.85em;font-style:italic;margin-bottom:8px;">
                    📺 Sin contrato de derechos TV activo</div>`);
            }

            contractsList.innerHTML = rows.join('');
        }

        // Actualizar label "derechos TV / patrocinios" en el panel de finanzas
        const sponsorWeekly = state.finDeals_sponsorWeekly || 0;
        const tvWeekly      = state.finDeals_tvWeekly      || 0;
        const totalDeals    = sponsorWeekly + tvWeekly;
        ['fin_lBase','fin_pBase'].forEach(id => {
            const el = document.getElementById(id);
            if (el && totalDeals > 0) {
                const breakdown = [
                    sponsorWeekly > 0 ? `Patrocinio ${fmt(sponsorWeekly)}€` : '',
                    tvWeekly > 0      ? `TV ${fmt(tvWeekly)}€` : ''
                ].filter(Boolean).join(' + ');
                el.title = breakdown;
            }
        });

        // Mostrar botón de "Ver ofertas pendientes" en color si hay pendientes
        const pendingBtn = document.querySelector('#fd-deals-section button[onclick*="ShowOffers"]');
        if (pendingBtn) {
            const hasPending = !!deals.pendingOffers;
            pendingBtn.style.background = hasPending ? '#e65100' : '#1565C0';
            pendingBtn.textContent      = hasPending ? '🔔 Ofertas pendientes — ¡Revisar!' : '📬 Ver ofertas pendientes';
        }
    }

    window._fdRequestLoan = function () {
        const amt = parseInt(document.getElementById('fd-loan-amount')?.value || 0);
        const wks = parseInt(document.getElementById('fd-loan-weeks')?.value  || 12);
        if (!amt || !wks) return;
        const state = gs();
        if (!state) return;
        if (confirm(`¿Solicitar préstamo de ${fmt(amt)}€ a ${wks} semanas?`)) {
            requestLoan(amt, wks);
        }
    };

    // ── HOOK openPage / finanzas ──────────────────────────────────
    function hookOpenPage() {
        const orig = window.openPage || window.showPage;
        if (!orig) { setTimeout(hookOpenPage, 300); return; }
        const key  = window.openPage ? 'openPage' : 'showPage';
        const fn   = window[key];
        window[key] = function (page, ...args) {
            fn.call(this, page, ...args);
            if (page === 'finances' || page === 'decisions') {
                setTimeout(() => { buildDealsSection(); refreshDealsUI(); }, 100);
            }
        };
    }

    // ── INIT ──────────────────────────────────────────────────────
    function init() {
        if (!window.gameLogic) { setTimeout(init, 400); return; }

        hookSimulateWeek();
        hookOpenPage();

        // Intentar construir panel si ya está abierto
        setTimeout(() => {
            buildDealsSection();
            recalcWeekly();
            checkAndGenerateOffers();
            refreshDealsUI();
        }, 2000);

        // Exponer para acceso global
        window.FinDeals = { requestLoan, acceptOffer, rejectOffer, showOffersModal, refreshDealsUI };

        console.log('[FinDeals] ✅ v1.0 listo — Préstamos + Patrocinios + Derechos TV');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();

})();
