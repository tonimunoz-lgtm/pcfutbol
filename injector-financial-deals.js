// ============================================================
// injector-financial-deals.js  v3.0
//
// MÓDULO: Préstamos + Patrocinios + Derechos TV + Primas + Premios
//
// v3 FIXES:
// - Ofertas se generan al seleccionar equipo (login) y en cada semana
//   si no hay contrato activo, no solo al cambiar temporada
// - Cuotas de préstamo aparecen como línea propia en Caja (Gastos rec.)
// - Patrocinio y TV aceptables por separado sin cerrar el modal
// - Primas a jugadores: influyen en el resultado del partido esa semana
// - Premios económicos por ganar liga/copa/europa → aparecen en Caja
// ============================================================

(function () {
    'use strict';

    const gl   = () => window.gameLogic;
    const gs   = () => gl()?.getGameState();
    const fmt  = n => Math.round(n || 0).toLocaleString('es-ES');
    const save = u => gl()?.updateGameState(u);

    // ── Configuración ─────────────────────────────────────────────
    const LOAN_INTEREST = { 6: 0.04, 12: 0.07, 24: 0.12, 36: 0.18 };

    const DEAL_BASE = {
        primera:     { sponsor: 8_000_000,  tv: 25_000_000 },
        segunda:     { sponsor: 2_000_000,  tv:  6_000_000 },
        rfef_grupo1: { sponsor:   400_000,  tv:    800_000 },
        rfef_grupo2: { sponsor:   400_000,  tv:    800_000 },
    };

    // Premios económicos por competición
    const PRIZES = {
        liga_primera:    { label: '🏆 Liga (1ª División)',      amount: 15_000_000 },
        liga_segunda:    { label: '🏆 Liga (2ª División)',       amount:  3_000_000 },
        liga_rfef:       { label: '🏆 Liga (1ª RFEF)',           amount:    500_000 },
        copa_champion:   { label: '🥇 Copa del Rey',             amount:  3_000_000 },
        champions_win:   { label: '⭐ Champions League',         amount: 20_000_000 },
        europa_win:      { label: '🟠 Europa League',            amount:  8_000_000 },
        conference_win:  { label: '🟢 Conference League',        amount:  4_000_000 },
        // Premios por ronda Europa
        champions_groups:     { label: '⭐ Fase de grupos UCL',        amount: 4_000_000 },
        champions_round16:    { label: '⭐ Octavos UCL',               amount: 6_500_000 },
        champions_quarters:   { label: '⭐ Cuartos UCL',               amount: 9_000_000 },
        champions_semis:      { label: '⭐ Semifinales UCL',           amount: 12_000_000 },
        europa_groups:        { label: '🟠 Fase de grupos UEL',        amount: 1_200_000 },
        europa_round16:       { label: '🟠 Octavos UEL',               amount: 2_000_000 },
        conference_groups:    { label: '🟢 Fase grupos UECL',          amount:   500_000 },
    };

    // ── Estado de deals ───────────────────────────────────────────
    function getD() {
        const s = gs() || {};
        return {
            loans:         s.fd_loans        || [],
            sponsorDeal:   s.fd_sponsor      || null,
            tvDeal:        s.fd_tv           || null,
            pendingOffers: s.fd_pending      || null,
            bonus:         s.fd_bonus        || 0,      // prima semanal activa
            prizes:        s.fd_prizes       || [],     // premios históricos
        };
    }
    function saveD(d) {
        save({
            fd_loans:   d.loans,
            fd_sponsor: d.sponsorDeal,
            fd_tv:      d.tvDeal,
            fd_pending: d.pendingOffers,
            fd_bonus:   d.bonus,
            fd_prizes:  d.prizes,
        });
    }

    // ── Rating medio ──────────────────────────────────────────────
    function avgRating() {
        const s = gs();
        if (!s?.squad?.length) return 70;
        const v = s.squad.map(p => p.overall || p.rating || 70);
        return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
    }

    // ── Noticias ──────────────────────────────────────────────────
    function news(msg, type) { try { gl()?.addNews?.(msg, type); } catch(e) {} }

    // ── Recalcular valores semanales ──────────────────────────────
    // weeklyExpenses = salarios + cuotas préstamo
    // weeklyIncomeBase = base juego + patrocinio/sem + tv/sem
    // fd_loanPayment se expone para que injector-finances lo muestre
    function recalcWeekly() {
        const s = gs();
        if (!s) return;
        const d = getD();

        const loanPay  = d.loans.filter(l => l.weeksLeft > 0)
                                .reduce((sum, l) => sum + l.weeklyPayment, 0);
        const sponsorW = d.sponsorDeal?.active ? Math.round(d.sponsorDeal.annualAmount / 38) : 0;
        const tvW      = d.tvDeal?.active      ? Math.round(d.tvDeal.annualAmount / 38)      : 0;

        // Guardar base original una sola vez por partida
        if (s.fd_baseOrig === undefined || s.fd_baseOrig === null) {
            const orig = s.weeklyIncomeBase ?? 5000;
            save({ fd_baseOrig: orig });
        }
        const baseOrig = s.fd_baseOrig ?? 5000;

        const salaries = (s.squad || []).reduce((sum, p) => sum + (p.salary || 0), 0);
        const staffSal = Object.values(s.staff || {}).filter(Boolean)
                                .reduce((sum, x) => sum + (x.salary || 0), 0);

        save({
            weeklyExpenses:   salaries + staffSal + loanPay,
            weeklyIncomeBase: baseOrig + sponsorW + tvW,
            fd_loanPayment:   loanPay,
            fd_sponsorW:      sponsorW,
            fd_tvW:           tvW,
        });
    }

    // ─────────────────────────────────────────────────────────────
    // PRÉSTAMOS
    // ─────────────────────────────────────────────────────────────
    function requestLoan(amount, weeks) {
        const s = gs();
        if (!s) return;
        const d = getD();
        const interest  = LOAN_INTEREST[weeks] || 0.1;
        const total     = Math.round(amount * (1 + interest));
        const weeklyPay = Math.round(total / weeks);
        d.loans.push({ id: Date.now(), amount, totalWithInt: total,
                        weeklyPayment: weeklyPay, weeksTotal: weeks, weeksLeft: weeks });
        saveD(d);
        save({ balance: (s.balance || 0) + amount });
        recalcWeekly();
        news(`🏦 Préstamo concedido: ${fmt(amount)}€ · ${weeks} sem. · Cuota: ${fmt(weeklyPay)}€/sem`, 'info');
        if (window._financeRefresh) window._financeRefresh();
        refreshUI();
        addLoanRowToFinances();
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

    // Añadir / actualizar filas de cuotas y prima en Gastos Recurrentes (Caja)
    // addLoanRowToFinances: ELIMINADO — ahora gestionado por injector-finances.js
    // que ya incluye cuotas de préstamo y primas en sus propias filas nativas.
    function addLoanRowToFinances() { /* no-op */ }

    // ─────────────────────────────────────────────────────────────
    // PRIMAS A JUGADORES
    // ─────────────────────────────────────────────────────────────
    // La prima se guarda en fd_bonus y se aplica como multiplicador
    // de rendimiento en el partido de esa semana, luego se resetea a 0.
    // Efecto: boost temporal en la probabilidad de gol propia.
    // Se descuenta del balance al establecerse (gasto inmediato).

    function setBonus(amount) {
        const s = gs();
        if (!s) return;
        if ((s.balance || 0) < amount) {
            alert('No tienes saldo suficiente para esta prima.');
            return;
        }
        const d = getD();
        d.bonus = amount;
        saveD(d);
        save({ balance: (s.balance || 0) - amount });
        news(`💰 Prima de ${fmt(amount)}€ prometida a los jugadores para el próximo partido`, 'info');
        refreshUI();
        if (window._financeRefresh) window._financeRefresh();
    }

    // Aplicar boost en el partido y resetear prima
    function consumeBonus() {
        const d = getD();
        if (!d.bonus || d.bonus <= 0) return 0;
        const bonus = d.bonus;
        d.bonus = 0;
        saveD(d);
        return bonus;
    }

    // El bonus se expone globalmente para que el motor de partidos lo lea
    window._fdGetMatchBonus = function () {
        const d = getD();
        return d.bonus || 0;
    };
    window._fdConsumeBonus = consumeBonus;

    // Hook en calculateMatchOutcomeImproved para aplicar bonus como mejora de teamForm
    function hookMatchEngine() {
        if (typeof window.calculateMatchOutcomeImproved !== 'function') {
            setTimeout(hookMatchEngine, 400); return;
        }
        if (window._fdMatchHooked) return;
        window._fdMatchHooked = true;
        const origCalc = window.calculateMatchOutcomeImproved;
        window.calculateMatchOutcomeImproved = function(params) {
            const bonus = window._fdGetMatchBonus() || 0;
            if (bonus > 0) {
                // Escalar bonus: 50k€ → +2 form, 250k€ → +8 form, 1M€ → +18 form (máx +25)
                const boost = Math.min(25, Math.round(Math.sqrt(bonus / 50000) * 2));
                params = { ...params, teamForm: Math.min(100, (params.teamForm || 75) + boost) };
                console.log(`[FinDeals] Prima ${Math.round(bonus/1000)}k€ → boost form +${boost}`);
            }
            return origCalc.call(this, params);
        };
        console.log('[FinDeals] hook matchEngine ✓');
    }

    // ─────────────────────────────────────────────────────────────
    // PREMIOS ECONÓMICOS
    // ─────────────────────────────────────────────────────────────
    function awardPrize(key) {
        const prize = PRIZES[key];
        if (!prize) return;
        const s = gs();
        if (!s) return;
        const d = getD();
        // Evitar doble premio en la misma temporada
        const alreadyThisSeason = d.prizes.some(p => p.key === key && p.season === s.currentSeason);
        if (alreadyThisSeason) return;

        d.prizes.push({ key, label: prize.label, amount: prize.amount, season: s.currentSeason, week: s.week });
        saveD(d);
        save({ balance: (s.balance || 0) + prize.amount });
        news(`🏆 Premio económico: ${prize.label} → +${fmt(prize.amount)}€`, 'success');
        if (window._financeRefresh) window._financeRefresh();
        addPrizeRowToFinances(prize);
        refreshUI();
    }
    window._fdAwardPrize = awardPrize;

    function addPrizeRowToFinances(prize) {
        // Añadir al historial de movimientos de finanzas si está abierto
        const mList = document.getElementById('fin_mList');
        if (!mList) return;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #1a1a1a;';
        div.innerHTML = `<span>🏆 <span style="color:#888;">Sem ${gs()?.week}</span> — ${prize.label}</span>
            <span style="font-weight:bold;color:#4CAF50;margin-left:12px;">+${fmt(prize.amount)}€</span>`;
        mList.prepend(div);
    }

    // Hook en competitions para detectar victorias
    function hookCompetitionsForPrizes() {
        // Observar addNews de gameLogic para detectar victorias
        if (!gl()) { setTimeout(hookCompetitionsForPrizes, 500); return; }
        const origAddNews = gl().addNews?.bind(gl());
        if (!origAddNews || window._fdNewsHooked) return;
        window._fdNewsHooked = true;

        gl().addNews = function(msg, type, ...rest) {
            origAddNews(msg, type, ...rest);
            if (type !== 'success') return;
            // Liga
            const s = gs();
            if (!s) return;
            if (msg.includes('¡Ascendemos') && s.division === 'primera') awardPrize('liga_primera');
            if (msg.includes('campeones') && s.division === 'primera') awardPrize('liga_primera');
            if (msg.includes('campeones') && s.division === 'segunda') awardPrize('liga_segunda');
            if (msg.includes('campeones') && (s.division === 'rfef_grupo1' || s.division === 'rfef_grupo2')) awardPrize('liga_rfef');
            // Copa
            if (msg.includes('CAMPEONES DE LA COPA')) awardPrize('copa_champion');
            // Europa
            if (msg.includes('CAMPEONES DE LA CHAMPIONS') || msg.includes('Champions League') && msg.includes('¡¡CAMPEONES')) awardPrize('champions_win');
            if (msg.includes('CAMPEONES DE LA EUROPA') || msg.includes('Europa League') && msg.includes('¡¡CAMPEONES')) awardPrize('europa_win');
            if (msg.includes('Conference League') && msg.includes('¡¡CAMPEONES')) awardPrize('conference_win');
            // Premios por fase Europa (solo una vez por fase)
            if (msg.includes('Champions League') && msg.includes('Fase de grupos')) awardPrize('champions_groups');
            if (msg.includes('Champions League') && msg.includes('Octavos')) awardPrize('champions_round16');
            if (msg.includes('Champions League') && msg.includes('Cuartos')) awardPrize('champions_quarters');
            if (msg.includes('Champions League') && msg.includes('Semifinales')) awardPrize('champions_semis');
            if (msg.includes('Europa League') && msg.includes('grupos')) awardPrize('europa_groups');
            if (msg.includes('Europa League') && msg.includes('Octavos')) awardPrize('europa_round16');
            if (msg.includes('Conference League') && msg.includes('grupos')) awardPrize('conference_groups');
        };
    }

    // ─────────────────────────────────────────────────────────────
    // EMPRESAS REALES — DERECHOS TV Y PATROCINADORES
    // ─────────────────────────────────────────────────────────────
    const TV_COMPANIES = {
        primera: [
            { name: 'Movistar+', logo: '📡' }, { name: 'DAZN', logo: '🎬' },
            { name: 'Amazon Prime Video', logo: '📦' }, { name: 'Orange TV', logo: '🟠' },
            { name: 'Vodafone TV', logo: '🔴' }, { name: 'Mediapro / GOL', logo: '⚽' },
            { name: 'beIN Sports', logo: '📺' }, { name: 'Rakuten TV', logo: '🛒' },
            { name: 'Mediaset España', logo: '📺' }, { name: 'Telefónica', logo: '📡' },
        ],
        segunda: [
            { name: 'Movistar+', logo: '📡' }, { name: 'DAZN', logo: '🎬' },
            { name: 'Orange TV', logo: '🟠' }, { name: 'Vodafone TV', logo: '🔴' },
            { name: 'GOL Internacional', logo: '⚽' }, { name: 'Mediapro', logo: '🎥' },
            { name: 'TEN (Eleven Sports)', logo: '📺' }, { name: 'YouTube Sports ES', logo: '▶️' },
            { name: 'Eurosport', logo: '🏆' }, { name: 'Telefoot', logo: '🇫🇷' },
        ],
        rfef: [
            { name: 'GOL Internacional', logo: '⚽' }, { name: 'YouTube Sports ES', logo: '▶️' },
            { name: 'Canal Sur', logo: '🌞' }, { name: 'Aragón TV', logo: '🦁' },
            { name: 'TVG Galicia', logo: '🟢' }, { name: 'TV3 Catalunya', logo: '🔴' },
            { name: 'Telemadrid', logo: '🏙️' }, { name: 'ETB Euskadi', logo: '🏔️' },
            { name: 'IB3 Baleares', logo: '🏝️' }, { name: 'RTVC Canarias', logo: '🌋' },
            { name: 'À Punt (CV)', logo: '🌊' }, { name: 'TPA Asturias', logo: '⛏️' },
            { name: 'Canal Extremadura', logo: '🌿' }, { name: '7 TV Murcia', logo: '☀️' },
            { name: 'Sportium TV', logo: '📊' },
        ],
    };
    const SPONSOR_COMPANIES = {
        primera: [
            { name: 'Banco Santander', sector: 'Banca' }, { name: 'CaixaBank', sector: 'Banca' },
            { name: 'BBVA', sector: 'Banca' }, { name: 'Iberdrola', sector: 'Energía' },
            { name: 'Repsol', sector: 'Energía' }, { name: 'Moeve (Cepsa)', sector: 'Energía' },
            { name: 'Emirates', sector: 'Aviación' }, { name: 'Iberia', sector: 'Aviación' },
            { name: 'Coca-Cola', sector: 'Bebidas' }, { name: 'Heineken', sector: 'Cervezas' },
            { name: 'Estrella Damm', sector: 'Cervezas' }, { name: 'Red Bull', sector: 'Bebidas' },
            { name: 'Adidas', sector: 'Deportes' }, { name: 'Nike', sector: 'Deportes' },
            { name: 'Puma', sector: 'Deportes' }, { name: 'Rakuten', sector: 'E-commerce' },
            { name: 'Amazon', sector: 'Tecnología' }, { name: 'Visa', sector: 'Finanzas' },
            { name: 'Mastercard', sector: 'Finanzas' }, { name: 'Mapfre', sector: 'Seguros' },
        ],
        segunda: [
            { name: 'Mahou', sector: 'Cervezas' }, { name: 'Estrella Galicia', sector: 'Cervezas' },
            { name: 'Halcón Viajes', sector: 'Turismo' }, { name: 'Renfe', sector: 'Transporte' },
            { name: 'DIGI', sector: 'Telecos' }, { name: 'Finetwork', sector: 'Telecos' },
            { name: 'Luckia', sector: 'Apuestas' }, { name: 'Codere', sector: 'Apuestas' },
            { name: 'Endesa', sector: 'Energía' }, { name: 'Naturgy', sector: 'Energía' },
            { name: 'El Corte Inglés', sector: 'Retail' }, { name: 'Mercadona', sector: 'Retail' },
            { name: 'La Roche-Posay', sector: 'Cosmética' }, { name: 'ASISA', sector: 'Salud' },
            { name: 'Sanitas', sector: 'Salud' },
        ],
        rfef: [
            { name: 'Mahou', sector: 'Cervezas' }, { name: 'Estrella Galicia', sector: 'Cervezas' },
            { name: 'DIGI', sector: 'Telecos' }, { name: 'Petronor', sector: 'Energía' },
            { name: 'Codere', sector: 'Apuestas' }, { name: 'Luckia', sector: 'Apuestas' },
            { name: 'Joma', sector: 'Deportes' }, { name: 'Hummel', sector: 'Deportes' },
            { name: 'Panini', sector: 'Coleccionismo' }, { name: 'Halcón Viajes', sector: 'Turismo' },
            { name: 'Vitruvian Sport', sector: 'Nutrición' }, { name: 'Caja Rural', sector: 'Banca' },
            { name: 'Globo Energía', sector: 'Energía' }, { name: 'Sportradar', sector: 'Datos' },
            { name: 'Diputación Local', sector: 'Institucional' },
        ],
    };
    function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function getTvCos(div)  { return TV_COMPANIES[div === 'primera' ? 'primera' : div === 'segunda' ? 'segunda' : 'rfef']; }
    function getSpCos(div)  { return SPONSOR_COMPANIES[div === 'primera' ? 'primera' : div === 'segunda' ? 'segunda' : 'rfef']; }

    // ─────────────────────────────────────────────────────────────
    // GENERADOR DE OFERTAS COMERCIALES
    // ─────────────────────────────────────────────────────────────
    function generateOffers() {
        const s    = gs();
        const div  = s?.division || 'rfef_grupo1';
        const base = DEAL_BASE[div] || DEAL_BASE.rfef_grupo1;
        const rat  = avgRating();
        const pop  = s?.popularity || 50;
        const mult = Math.max(0.4, Math.min(2.2,
            0.6 + (rat - 60) / 40 * 0.9 + (pop - 50) / 100 * 0.5));
        const rnd   = () => 0.82 + Math.random() * 0.36;
        const r100k = v => Math.round(v / 100_000) * 100_000;
        const r50k  = v => Math.round(v / 50_000)  * 50_000;

        const tvCos = getTvCos(div), spCos = getSpCos(div);
        const usedTv = new Set(), usedSp = new Set();
        const pickTv = () => { let c; do { c = pickRandom(tvCos); } while (usedTv.has(c.name) && usedTv.size < tvCos.length); usedTv.add(c.name); return c; };
        const pickSp = () => { let c; do { c = pickRandom(spCos); } while (usedSp.has(c.name) && usedSp.size < spCos.length); usedSp.add(c.name); return c; };

        return {
            sponsorOffers: [1, 2, 3].map(y => { const co = pickSp(); return { type: 'sponsor', years: y, company: co.name, sector: co.sector, annualAmount: r50k(base.sponsor * mult * rnd()) }; }),
            tvOffers:      [1, 2, 3].map(y => { const co = pickTv(); return { type: 'tv',      years: y, company: co.name, logo: co.logo,     annualAmount: r100k(base.tv    * mult * rnd()) }; }),
        };
    }

    function maybeGenerateOffers() {
        const s = gs();
        if (!s?.team) return;
        const d = getD();

        const needSponsor = !d.sponsorDeal?.active;
        const needTv      = !d.tvDeal?.active;
        if (!needSponsor && !needTv) return; // ambos activos, nada que hacer

        const hasPendingSponsor = !!d.pendingOffers?.sponsorOffers;
        const hasPendingTv      = !!d.pendingOffers?.tvOffers;

        // Si ya hay pendientes para los tipos que necesitan, solo mostrar modal
        if ((!needSponsor || hasPendingSponsor) && (!needTv || hasPendingTv)) {
            setTimeout(showOffersModal, 800);
            return;
        }

        // Generar las que faltan
        const fresh = generateOffers();
        d.pendingOffers = {
            sponsorOffers: needSponsor ? fresh.sponsorOffers : (d.pendingOffers?.sponsorOffers || null),
            tvOffers:      needTv      ? fresh.tvOffers      : (d.pendingOffers?.tvOffers      || null),
        };
        saveD(d);

        const msgs = [
            needSponsor && !hasPendingSponsor ? '📣 Nueva oferta de patrocinio' : '',
            needTv      && !hasPendingTv      ? '📺 Nueva oferta de derechos TV' : '',
        ].filter(Boolean);
        if (msgs.length) news(msgs.join(' · ') + ' — revisa Gestión Comercial', 'info');

        setTimeout(showOffersModal, 800);
        refreshUI();
    }

    function processNewSeason() {
        const d = getD();
        let changed = false;
        if (d.sponsorDeal?.active) {
            const left = d.sponsorDeal.yearsLeft - 1;
            d.sponsorDeal = { ...d.sponsorDeal, yearsLeft: left, active: left > 0 };
            if (left <= 0) news('📣 Contrato de patrocinio expirado — recibirás nuevas ofertas', 'warning');
            changed = true;
        }
        if (d.tvDeal?.active) {
            const left = d.tvDeal.yearsLeft - 1;
            d.tvDeal = { ...d.tvDeal, yearsLeft: left, active: left > 0 };
            if (left <= 0) news('📺 Contrato de derechos TV expirado — recibirás nuevas ofertas', 'warning');
            changed = true;
        }
        if (changed) { saveD(d); recalcWeekly(); }
    }

    // ─────────────────────────────────────────────────────────────
    // ACEPTAR / RECHAZAR OFERTAS
    // ─────────────────────────────────────────────────────────────
    function acceptOffer(type, idx) {
        const s = gs(); const d = getD();
        if (!d.pendingOffers) return;
        const arr   = type === 'sponsor' ? d.pendingOffers.sponsorOffers : d.pendingOffers.tvOffers;
        const offer = arr?.[idx];
        if (!offer) return;
        const deal = { active:true, annualAmount:offer.annualAmount,
                        years:offer.years, yearsLeft:offer.years, season:s.currentSeason,
                        company: offer.company || '', sector: offer.sector || '', logo: offer.logo || '' };
        if (type === 'sponsor') { d.sponsorDeal = deal; d.pendingOffers = {...d.pendingOffers, sponsorOffers:null};
            news(`📣 Patrocinio firmado con ${offer.company || 'patrocinador'}: ${fmt(offer.annualAmount)}€/año · ${offer.years} temp.`, 'success'); }
        else { d.tvDeal = deal; d.pendingOffers = {...d.pendingOffers, tvOffers:null};
            news(`📺 Derechos TV firmados con ${offer.company || 'cadena'}: ${fmt(offer.annualAmount)}€/año · ${offer.years} temp.`, 'success'); }
        if (!d.pendingOffers.sponsorOffers && !d.pendingOffers.tvOffers) d.pendingOffers = null;
        saveD(d); recalcWeekly();
        if (window._financeRefresh) window._financeRefresh();
        updateOffersModal(); refreshUI();
    }

    function rejectOffer(type) {
        const d = getD();
        if (!d.pendingOffers) return;
        const fresh = generateOffers();
        if (type === 'sponsor') d.pendingOffers = {...d.pendingOffers, sponsorOffers: fresh.sponsorOffers};
        else                    d.pendingOffers = {...d.pendingOffers, tvOffers:      fresh.tvOffers};
        saveD(d);
        news('⚠️ Oferta rechazada — nuevas propuestas la próxima semana', 'warning');
        updateOffersModal(); refreshUI();
    }

    window._fdAccept     = (type, idx) => acceptOffer(type, idx);
    window._fdReject     = (type)      => rejectOffer(type);
    window._fdShowOffers = ()          => showOffersModal();

    // ─────────────────────────────────────────────────────────────
    // MODAL DE OFERTAS
    // ─────────────────────────────────────────────────────────────
    function buildOffersBody() {
        const d = getD();
        let html = '';

        // Patrocinio
        if (d.pendingOffers?.sponsorOffers && !d.sponsorDeal?.active) {
            html += `<div style="margin-bottom:22px;">
              <h3 style="color:#4CAF50;font-size:.95em;margin:0 0 10px;border-bottom:1px solid #2a3a2a;padding-bottom:6px;">
                📣 Ofertas de patrocinio
              </h3>
              ${d.pendingOffers.sponsorOffers.map((o,i) => `
                <div style="background:rgba(76,175,80,.06);border:1px solid rgba(76,175,80,.2);
                            border-radius:10px;padding:11px;display:flex;justify-content:space-between;
                            align-items:center;margin-bottom:7px;">
                  <div>
                    <div style="color:#4CAF50;font-weight:bold;">🏢 ${o.company || 'Patrocinador'}</div>
                    <div style="color:#888;font-size:.78em;margin:2px 0 3px;">${o.sector ? '('+o.sector+')' : ''}</div>
                    <div style="color:#4CAF50;">${fmt(o.annualAmount)}€/año · ${o.years} temp.</div>
                    <div style="color:#666;font-size:.78em;">Total: ${fmt(o.annualAmount*o.years)}€</div>
                  </div>
                  <button onclick="window._fdAccept('sponsor',${i})"
                    style="background:#4CAF50;color:#fff;border:none;border-radius:8px;
                           padding:8px 18px;cursor:pointer;font-weight:bold;">Firmar</button>
                </div>`).join('')}
              <button onclick="window._fdReject('sponsor')"
                style="margin-top:4px;background:transparent;color:#666;border:1px solid #333;
                       border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.8em;width:100%;">
                Rechazar y pedir nuevas
              </button>
            </div>`;
        } else if (d.sponsorDeal?.active) {
            html += `<div style="background:rgba(76,175,80,.06);border:1px solid rgba(76,175,80,.2);
                        border-radius:10px;padding:12px;margin-bottom:18px;">
              <div style="display:flex;justify-content:space-between;">
                <span style="color:#4CAF50;font-weight:bold;">📣 ${d.sponsorDeal.company || 'Patrocinio activo'}</span>
                <span style="color:#4CAF50;">${fmt(d.sponsorDeal.annualAmount)}€/año</span>
              </div>
              <div style="color:#777;font-size:.8em;margin-top:3px;">
                ${d.sponsorDeal.yearsLeft} temp. restante${d.sponsorDeal.yearsLeft!==1?'s':''}${d.sponsorDeal.sector?' · '+d.sponsorDeal.sector:''}
              </div>
            </div>`;
        } else {
            html += `<div style="color:#555;font-size:.85em;font-style:italic;margin-bottom:14px;">
                📣 Sin contrato de patrocinio — llegará nueva oferta pronto</div>`;
        }

        // Derechos TV
        if (d.pendingOffers?.tvOffers && !d.tvDeal?.active) {
            html += `<div style="margin-bottom:22px;">
              <h3 style="color:#2196F3;font-size:.95em;margin:0 0 10px;border-bottom:1px solid #1a2a3a;padding-bottom:6px;">
                📺 Ofertas de derechos TV
              </h3>
              ${d.pendingOffers.tvOffers.map((o,i) => `
                <div style="background:rgba(33,150,243,.06);border:1px solid rgba(33,150,243,.2);
                            border-radius:10px;padding:11px;display:flex;justify-content:space-between;
                            align-items:center;margin-bottom:7px;">
                  <div>
                    <div style="color:#2196F3;font-weight:bold;">${o.logo || '📺'} ${o.company || 'Cadena TV'}</div>
                    <div style="color:#2196F3;margin-top:4px;">${fmt(o.annualAmount)}€/año · ${o.years} temp.</div>
                    <div style="color:#666;font-size:.78em;">Total: ${fmt(o.annualAmount*o.years)}€</div>
                  </div>
                  <button onclick="window._fdAccept('tv',${i})"
                    style="background:#2196F3;color:#fff;border:none;border-radius:8px;
                           padding:8px 18px;cursor:pointer;font-weight:bold;">Firmar</button>
                </div>`).join('')}
              <button onclick="window._fdReject('tv')"
                style="margin-top:4px;background:transparent;color:#666;border:1px solid #333;
                       border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.8em;width:100%;">
                Rechazar y pedir nuevas
              </button>
            </div>`;
        } else if (d.tvDeal?.active) {
            html += `<div style="background:rgba(33,150,243,.06);border:1px solid rgba(33,150,243,.2);
                        border-radius:10px;padding:12px;margin-bottom:18px;">
              <div style="display:flex;justify-content:space-between;">
                <span style="color:#2196F3;font-weight:bold;">📺 ${d.tvDeal.company || 'Derechos TV activos'}</span>
                <span style="color:#2196F3;">${fmt(d.tvDeal.annualAmount)}€/año</span>
              </div>
              <div style="color:#777;font-size:.8em;margin-top:3px;">
                ${d.tvDeal.yearsLeft} temp. restante${d.tvDeal.yearsLeft!==1?'s':''}
              </div>
            </div>`;
        } else {
            html += `<div style="color:#555;font-size:.85em;font-style:italic;margin-bottom:14px;">
                📺 Sin contrato TV — llegará nueva oferta pronto</div>`;
        }

        return html || '<p style="color:#555;text-align:center;padding:16px 0;">Sin novedades comerciales.</p>';
    }

    function showOffersModal() {
        if (document.getElementById('fd-modal')) { updateOffersModal(); return; }
        const d = getD();
        if (!d.pendingOffers) return;
        const wrap = document.createElement('div');
        wrap.id = 'fd-modal';
        wrap.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.78);
            z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;`;
        wrap.innerHTML = `
          <div style="background:#1a1a2e;border-radius:16px;padding:24px;max-width:520px;width:100%;
                      border:1px solid #333;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
              <h2 style="color:#FFD700;margin:0;font-size:1.1em;">📬 Contratos Comerciales</h2>
              <button onclick="document.getElementById('fd-modal').remove()"
                style="background:#333;color:#aaa;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;">✕</button>
            </div>
            <div id="fd-modal-body">${buildOffersBody()}</div>
          </div>`;
        document.body.appendChild(wrap);
    }

    function updateOffersModal() {
        const b = document.getElementById('fd-modal-body');
        if (b) b.innerHTML = buildOffersBody();
        const d = getD();
        if (!d.pendingOffers) {
            const m = document.getElementById('fd-modal');
            if (m) setTimeout(() => m.remove(), 400);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // SECCIÓN EN GESTIÓN COMERCIAL
    // ─────────────────────────────────────────────────────────────
    function buildSection() {
        const page = document.getElementById('commercial');
        if (!page || document.getElementById('fd-section')) return;

        const sec = document.createElement('div');
        sec.id = 'fd-section';
        sec.style.marginTop = '28px';
        sec.innerHTML = `

        <!-- CONTRATOS ACTIVOS -->
        <h2 style="font-size:1.05em;color:#ccc;text-transform:uppercase;letter-spacing:1px;
                   border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:14px;">
            💼 Contratos comerciales
        </h2>
        <div id="fd-contracts" style="margin-bottom:12px;"></div>
        <button onclick="window._fdShowOffers()" id="fd-btn-offers"
          style="background:#1565C0;color:#fff;border:none;border-radius:8px;
                 padding:10px 20px;cursor:pointer;font-size:.9em;margin-bottom:28px;width:100%;">
          📬 Gestionar contratos y ofertas
        </button>

        <!-- PRIMAS A JUGADORES -->
        <h2 style="font-size:1.05em;color:#ccc;text-transform:uppercase;letter-spacing:1px;
                   border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin-bottom:12px;">
            💰 Prima motivacional al equipo
        </h2>
        <p style="color:#888;font-size:.85em;margin-bottom:12px;">
            Promete una prima económica extra a los jugadores para el próximo partido.
            Mejora la motivación del equipo y aumenta las probabilidades de victoria esa semana.
            El importe se descuenta inmediatamente del presupuesto.
        </p>
        <div id="fd-bonus-active" style="margin-bottom:10px;"></div>
        <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:14px;margin-bottom:28px;">
          <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end;">
            <div>
              <label style="color:#aaa;font-size:.82em;display:block;margin-bottom:4px;">Importe de la prima</label>
              <select id="fd-bonus-amt" style="width:100%;background:#111;color:#fff;border:1px solid #333;
                      border-radius:6px;padding:7px;font-size:.9em;">
                <option value="50000">50.000€ — Pequeña motivación</option>
                <option value="100000">100.000€ — Motivación media</option>
                <option value="250000" selected>250.000€ — Gran prima</option>
                <option value="500000">500.000€ — Prima extraordinaria</option>
                <option value="1000000">1.000.000€ — Prima histórica</option>
              </select>
            </div>
            <button onclick="window._fdSetBonus()"
              style="background:#FF8F00;color:#fff;border:none;border-radius:8px;
                     padding:10px 16px;cursor:pointer;font-weight:bold;white-space:nowrap;">
              Prometer prima
            </button>
          </div>
        </div>

        <!-- PRÉSTAMOS BANCARIOS -->
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
        </div>

        <!-- PREMIOS TEMPORADA -->
        <h2 style="font-size:1.05em;color:#ccc;text-transform:uppercase;letter-spacing:1px;
                   border-bottom:1px solid #2a2a2a;padding-bottom:6px;margin:28px 0 14px;">
            🏆 Premios económicos recibidos
        </h2>
        <div id="fd-prizes" style="margin-bottom:20px;font-size:.88em;"></div>`;

        page.appendChild(sec);

        // Preview dinámica préstamo
        const updPrev = () => {
            const amt  = parseInt(document.getElementById('fd-amt')?.value || 0);
            const wks  = parseInt(document.getElementById('fd-wks')?.value  || 12);
            const tot  = Math.round(amt * (1 + (LOAN_INTEREST[wks] || 0.1)));
            const wpay = Math.round(tot / wks);
            const el   = document.getElementById('fd-prev');
            if (el) el.innerHTML = `Total: <strong style="color:#fff;">${fmt(tot)}€</strong>
                &nbsp;·&nbsp; Cuota: <strong style="color:#f5a623;">${fmt(wpay)}€/sem</strong>`;
        };
        document.getElementById('fd-amt')?.addEventListener('change', updPrev);
        document.getElementById('fd-wks')?.addEventListener('change', updPrev);
        updPrev();

        refreshUI();
    }

    window._fdAskLoan = () => {
        const amt = parseInt(document.getElementById('fd-amt')?.value || 0);
        const wks = parseInt(document.getElementById('fd-wks')?.value || 12);
        if (!amt || !wks) return;
        if (confirm(`¿Solicitar préstamo de ${fmt(amt)}€ a ${wks} semanas?`)) requestLoan(amt, wks);
    };

    window._fdSetBonus = () => {
        const amt = parseInt(document.getElementById('fd-bonus-amt')?.value || 0);
        if (!amt) return;
        const d = getD();
        if (d.bonus > 0) { alert(`Ya hay una prima de ${fmt(d.bonus)}€ prometida para este partido.`); return; }
        if (confirm(`¿Prometer prima de ${fmt(amt)}€ a los jugadores para el próximo partido?`)) setBonus(amt);
    };

    // ─────────────────────────────────────────────────────────────
    // REFRESCO DE UI
    // ─────────────────────────────────────────────────────────────
    function refreshUI() {
        const d = getD();

        // Contratos
        const cEl = document.getElementById('fd-contracts');
        if (cEl) {
            let h = '';
            if (d.sponsorDeal?.active) {
                const ds = d.sponsorDeal;
                h += `<div style="background:rgba(76,175,80,.08);border:1px solid rgba(76,175,80,.25);
                          border-radius:10px;padding:12px;margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;">
                    <span style="color:#4CAF50;font-weight:bold;">📣 ${ds.company || 'Patrocinio activo'}</span>
                    <span style="color:#4CAF50;font-weight:bold;">${fmt(ds.annualAmount)}€/año</span>
                  </div>
                  <div style="color:#777;font-size:.8em;margin-top:4px;">
                    ${ds.sector?ds.sector+' · ':''}${ds.yearsLeft} temp. restante${ds.yearsLeft!==1?'s':''} · ~${fmt(Math.round(ds.annualAmount/38))}€/sem
                  </div>
                </div>`;
            } else {
                h += `<div style="color:#555;font-size:.85em;font-style:italic;padding:4px 0 8px;">📣 Sin contrato de patrocinio activo</div>`;
            }
            if (d.tvDeal?.active) {
                const dt = d.tvDeal;
                h += `<div style="background:rgba(33,150,243,.08);border:1px solid rgba(33,150,243,.25);
                          border-radius:10px;padding:12px;margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;">
                    <span style="color:#2196F3;font-weight:bold;">📺 ${dt.company || 'Derechos TV activos'}</span>
                    <span style="color:#2196F3;font-weight:bold;">${fmt(dt.annualAmount)}€/año</span>
                  </div>
                  <div style="color:#777;font-size:.8em;margin-top:4px;">
                    ${dt.yearsLeft} temp. restante${dt.yearsLeft!==1?'s':''} · ~${fmt(Math.round(dt.annualAmount/38))}€/sem
                  </div>
                </div>`;
            } else {
                h += `<div style="color:#555;font-size:.85em;font-style:italic;padding:4px 0 8px;">📺 Sin contrato de derechos TV activo</div>`;
            }
            cEl.innerHTML = h;
        }

        // Botón ofertas
        const btn = document.getElementById('fd-btn-offers');
        if (btn) {
            const has = !!d.pendingOffers;
            btn.style.background = has ? '#e65100' : '#1565C0';
            btn.textContent = has ? '🔔 ¡Hay ofertas pendientes! — Revisar ahora' : '📬 Gestionar contratos y ofertas';
        }

        // Prima activa
        const bEl = document.getElementById('fd-bonus-active');
        if (bEl) {
            bEl.innerHTML = d.bonus > 0
                ? `<div style="background:rgba(255,143,0,.12);border:1px solid rgba(255,143,0,.3);
                               border-radius:8px;padding:10px;margin-bottom:10px;">
                     <span style="color:#FF8F00;font-weight:bold;">💰 Prima prometida: ${fmt(d.bonus)}€</span>
                     <span style="color:#888;font-size:.82em;margin-left:8px;">— se aplica en el próximo partido</span>
                   </div>`
                : '';
        }

        // Préstamos
        const lEl = document.getElementById('fd-loans');
        if (lEl) {
            const active = d.loans.filter(l => l.weeksLeft > 0);
            if (!active.length) {
                lEl.innerHTML = `<div style="color:#555;font-size:.85em;font-style:italic;padding:4px 0 8px;">Sin préstamos activos.</div>`;
            } else {
                lEl.innerHTML = active.map(l => {
                    const pct = Math.round((1 - l.weeksLeft / l.weeksTotal) * 100);
                    return `<div style="background:rgba(255,255,255,.04);border-radius:8px;padding:11px;margin-bottom:8px;">
                      <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                        <span style="color:#f5a623;font-weight:bold;">Préstamo ${fmt(l.amount)}€</span>
                        <span style="color:#aaa;font-size:.82em;">${l.weeksLeft} sem. restantes</span>
                      </div>
                      <div style="color:#888;font-size:.8em;margin-bottom:6px;">
                        Cuota: ${fmt(l.weeklyPayment)}€/sem · Pendiente: ${fmt(l.weeklyPayment * l.weeksLeft)}€
                      </div>
                      <div style="width:100%;height:5px;background:#333;border-radius:3px;">
                        <div style="width:${pct}%;height:100%;background:#f5a623;border-radius:3px;"></div>
                      </div>
                    </div>`;
                }).join('');
            }
        }

        // Premios
        const pEl = document.getElementById('fd-prizes');
        if (pEl) {
            const all = d.prizes;
            pEl.innerHTML = !all.length
                ? `<div style="color:#555;font-size:.85em;font-style:italic;">Ningún premio económico recibido aún.</div>`
                : [...all].reverse().map(p =>
                    `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #1e1e1e;">
                       <span style="color:#aaa;">${p.label} <span style="color:#555;font-size:.8em;">(${p.season})</span></span>
                       <span style="color:#4CAF50;font-weight:bold;">+${fmt(p.amount)}€</span>
                     </div>`).join('');
        }

        // Fila de cuotas en panel de caja
        addLoanRowToFinances();
    }

    // ─────────────────────────────────────────────────────────────
    // HOOKS
    // ─────────────────────────────────────────────────────────────
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
                save({ fd_baseOrig: null }); // forzar reset de base
                setTimeout(() => { recalcWeekly(); maybeGenerateOffers(); }, 700);
            } else {
                // En temporada normal: generar ofertas si no hay contratos (cada semana es barato)
                maybeGenerateOffers();
            }
            _lastSeason = s.currentSeason;

            // Consumir prima (ya gastada del balance en setBonus)
            consumeBonus();

            processLoanPayments();
            recalcWeekly();
            if (window._financeRefresh) window._financeRefresh();
            refreshUI();
            return result;
        };
        console.log('[FinDeals] hook simulateWeek ✓');
    }

    function hookOpenPage() {
        if (!window.openPage) { setTimeout(hookOpenPage, 300); return; }
        const orig = window.openPage;
        window.openPage = function (page, ...args) {
            orig.call(this, page, ...args);
            if (page === 'commercial') setTimeout(() => { buildSection(); refreshUI(); addLoanRowToFinances(); }, 80);
            if (page === 'finances')   setTimeout(() => { addLoanRowToFinances(); }, 200);
        };
    }

    function hookSelectTeam() {
        if (!gl()?.selectTeamWithInitialSquad) { setTimeout(hookSelectTeam, 400); return; }
        if (window._fdSelectHooked) return;
        window._fdSelectHooked = true;
        const orig = gl().selectTeamWithInitialSquad;
        gl().selectTeamWithInitialSquad = async function (...args) {
            const result = await orig.apply(this, args);
            // Limpiar deals anteriores al empezar nueva partida
            save({ fd_loans:null, fd_sponsor:null, fd_tv:null, fd_pending:null,
                   fd_bonus:0, fd_prizes:[], fd_baseOrig:null });
            setTimeout(() => { recalcWeekly(); maybeGenerateOffers(); }, 1500);
            return result;
        };
    }

    // ─────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────
    function init() {
        if (!window.gameLogic) { setTimeout(init, 400); return; }
        hookSimWeek();
        hookOpenPage();
        hookSelectTeam();
        hookCompetitionsForPrizes();
        hookMatchEngine();

        setTimeout(() => {
            recalcWeekly();
            maybeGenerateOffers();
            buildSection();
            refreshUI();
            addLoanRowToFinances();
        }, 2500);

        // patchTotExpElement: ELIMINADO — injector-finances.js ya incluye
        // cuotas de préstamo directamente en fin_totExp y en fin_loanRow.

    window.FinDeals = { requestLoan, acceptOffer, rejectOffer, showOffersModal, awardPrize, refreshUI };
        console.log('[FinDeals] ✅ v3.0 listo');
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();
})();
