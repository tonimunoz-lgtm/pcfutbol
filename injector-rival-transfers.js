// ============================================================
// injector-rival-transfers.js  (ya existe uno, este lo complementa)
//
// MEJORA: Los equipos rivales ahora tienen actividad en el
// mercado de fichajes:
//
// 1. Cada temporada, equipos rivales fichan/venden jugadores.
// 2. Ocasionalmente hacen ofertas por tus jugadores en venta.
// 3. Noticias de movimientos del mercado rival dan vida al juego.
// 4. El nivel de los rivales varía según la división.
//
// NOTA: Este injector es independiente de injector-rival.js
// (que gestiona la IA deportiva). Este solo gestiona fichajes.
// ============================================================

(function () {
    'use strict';
    console.log('🤖 injector-rival-transfers cargando...');

    // ─────────────────────────────────────────────────────────────
    // CONFIG
    // ─────────────────────────────────────────────────────────────

    const CONFIG = {
        // Probabilidad de que un rival haga un movimiento por jornada
        transferNewsChance: 0.18,   // 18% por jornada
        offerToPlayerChance: 0.08,  // 8% de que hagan oferta por tu jugador en venta
        maxNewsPerWeek: 2,          // Máximo de noticias de mercado rival por jornada
    };

    // Tipos de noticias de mercado rival (plantillas)
    const TRANSFER_TEMPLATES = [
        (p, club, fee) => `🔄 ${club} ficha a ${p} por ${fee.toLocaleString('es-ES')}€`,
        (p, club)      => `📋 ${club} renueva el contrato de ${p} hasta ${2026 + Math.floor(Math.random()*3)}`,
        (p, club, fee) => `💰 ${club} vende a ${p} por ${fee.toLocaleString('es-ES')}€`,
        (p, club)      => `🔒 ${club} blinda a ${p} con una cláusula millonaria`,
        (p, club)      => `🏟️ ${club} presenta a su nuevo fichaje ${p}`,
        (p, club)      => `🤝 ${club} acuerda la cesión de ${p} hasta final de temporada`,
    ];

    // Pool de nombres de jugadores para noticias de mercado
    const PLAYER_NAMES_POOL = [
        'Rodríguez','Martín','García','López','Hernández','Jiménez','Moreno',
        'Álvarez','Romero','Torres','Navarro','Domínguez','Serrano','Ruiz',
        'Medina','Castillo','Ortega','Delgado','Vega','Moya','Pizarro',
        'Iniesta','Pedri','Gavi','Bellingham','Valverde','Modric','Kimmich',
    ];

    const FIRST_NAMES = [
        'Alejandro','Carlos','Miguel','Pablo','Juan','Sergio','Adrián',
        'Mario','Álvaro','Diego','Marcos','Daniel','Roberto','Iván','Rubén',
    ];

    function randomPlayerName() {
        const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const ln = PLAYER_NAMES_POOL[Math.floor(Math.random() * PLAYER_NAMES_POOL.length)];
        return `${fn} ${ln}`;
    }

    // ─────────────────────────────────────────────────────────────
    // UTILIDADES
    // ─────────────────────────────────────────────────────────────

    function gs() {
        return window.gameLogic?.getGameState?.();
    }

    function news(msg, type) {
        window.gameLogic?.addNews?.(msg, type || 'info');
    }

    function getTeamsInDivision() {
        const state = gs();
        if (!state) return [];
        return (state.leagueTeams || []).filter(t => t !== state.team);
    }

    function randomTeam() {
        const teams = getTeamsInDivision();
        if (teams.length === 0) return 'Equipo rival';
        return teams[Math.floor(Math.random() * teams.length)];
    }

    function randomFee(overall) {
        // Fee basado en overall del jugador ficticio (40-85)
        const base = overall * 800 + Math.random() * 500000;
        return Math.round(base / 10000) * 10000; // redondear a 10k
    }

    // ─────────────────────────────────────────────────────────────
    // GENERAR NOTICIAS DE MERCADO RIVAL
    // ─────────────────────────────────────────────────────────────

    function generateRivalTransferNews() {
        const state = gs();
        if (!state || state.seasonType === 'preseason') return;

        // Limitar noticias por jornada
        let newsCount = 0;

        // Solo durante ventanas de mercado (jornadas 1-5 y tras la mitad de temporada)
        const maxWeek = state.maxSeasonWeeks || 38;
        const isMarketWindow = state.week <= 5 || (state.week >= Math.floor(maxWeek / 2) - 2 && state.week <= Math.floor(maxWeek / 2) + 2);

        // Fuera de ventanas hay menos movimiento (pero alguna renovación siempre)
        const activeChance = isMarketWindow ? CONFIG.transferNewsChance * 2 : CONFIG.transferNewsChance;

        if (Math.random() > activeChance) return;

        const teams = getTeamsInDivision();
        if (teams.length === 0) return;

        // Generar 1-2 noticias
        const count = Math.random() < 0.3 ? 2 : 1;

        for (let i = 0; i < count && newsCount < CONFIG.maxNewsPerWeek; i++) {
            const club = randomTeam();
            const playerName = randomPlayerName();
            const overall = 55 + Math.floor(Math.random() * 30); // 55-84
            const fee = randomFee(overall);

            // Elegir template
            const templateIdx = Math.floor(Math.random() * TRANSFER_TEMPLATES.length);
            const template = TRANSFER_TEMPLATES[templateIdx];
            const message = template(playerName, club, fee);

            news(`[Mercado] ${message}`, 'info');
            newsCount++;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // OFERTAS DE RIVALES POR TUS JUGADORES EN VENTA
    // Complementa el sistema existente de generateAIOffers
    // ─────────────────────────────────────────────────────────────

    function generateRivalOffersForListedPlayers() {
        const state = gs();
        if (!state) return;

        const forSale = (state.squad || []).filter(p =>
            p.transferListed && p.contractType === 'owned'
        );

        if (forSale.length === 0) return;
        if (Math.random() > CONFIG.offerToPlayerChance) return;

        // Elegir jugador aleatorio en venta
        const player = forSale[Math.floor(Math.random() * forSale.length)];
        const club = randomTeam();

        // Oferta entre 60% y 120% del precio pedido
        const pct = 0.6 + Math.random() * 0.6;
        const offerAmount = Math.round((player.askingPrice || player.value || 50000) * pct);

        news(
            `📨 [Mercado] ${club} ha preguntado por ${player.name}. Ofrecen ${offerAmount.toLocaleString('es-ES')}€ (pedías ${(player.askingPrice || player.value || 0).toLocaleString('es-ES')}€)`,
            offerAmount >= (player.askingPrice || 0) ? 'success' : 'info'
        );

        // Si el gameLogic tiene sistema de ofertas pendientes, añadir ahí también
        if (window.gameLogic && state.pendingOffers !== undefined) {
            const offer = {
                type: 'transfer',
                player: player,
                club,
                amount: offerAmount,
                originalAskingPrice: player.askingPrice || player.value || 50000,
                timestamp: Date.now(),
                fromRivalAI: true,
            };

            state.pendingOffers = state.pendingOffers || [];
            state.pendingOffers.push(offer);
            window.gameLogic.updateGameState?.(state);

            // Mostrar modal de ofertas si existe
            setTimeout(() => {
                if (typeof window.showOffersModal === 'function') {
                    window.showOffersModal();
                }
            }, 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // MOVIMIENTOS AL INICIO DE TEMPORADA
    // Noticias de fichajes de verano / invierno de los rivales
    // ─────────────────────────────────────────────────────────────

    function processSeasonStartTransfers() {
        const state = gs();
        if (!state) return;

        // Solo en la primera semana de temporada
        if (state.week !== 1 || state.seasonType === 'preseason') return;

        const teams = getTeamsInDivision();
        const numMovements = 3 + Math.floor(Math.random() * 4); // 3-6 movimientos de mercado

        for (let i = 0; i < numMovements; i++) {
            setTimeout(() => {
                const club = teams[Math.floor(Math.random() * teams.length)];
                const playerName = randomPlayerName();
                const overall = 60 + Math.floor(Math.random() * 25);
                const fee = randomFee(overall);
                const templateIdx = [0, 1, 4][Math.floor(Math.random() * 3)]; // fichajes y presentaciones
                const template = TRANSFER_TEMPLATES[templateIdx];
                news(`[Mercado de verano] ${template(playerName, club, fee)}`, 'info');
            }, i * 100);
        }

        news(`🗞️ Se cierra el mercado de fichajes. Los rivales han reforzado sus plantillas.`, 'info');
    }

    // ─────────────────────────────────────────────────────────────
    // RESUMEN DE MERCADO AL FINAL DE SEMANA
    // (Solo si hubo actividad notable)
    // ─────────────────────────────────────────────────────────────

    let _weekTransferCount = 0;

    // ─────────────────────────────────────────────────────────────
    // HOOK simulateWeek
    // ─────────────────────────────────────────────────────────────

    function hookSimulateWeek() {
        const orig = window.simulateWeek;
        if (!orig || window._rivalTransfersHooked) {
            if (!orig) { setTimeout(hookSimulateWeek, 400); return; }
            return;
        }
        window._rivalTransfersHooked = true;

        window.simulateWeek = async function (...args) {
            const result = await orig.apply(this, args);

            const state = gs();
            if (state && state.seasonType === 'regular') {
                // Noticias de mercado rival
                generateRivalTransferNews();

                // Ofertas por tus jugadores
                generateRivalOffersForListedPlayers();

                // Inicio de temporada
                processSeasonStartTransfers();
            }

            return result;
        };

        console.log('✅ Hook simulateWeek para transferencias rival activo');
    }

    // ─────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────

    function waitAndInit() {
        let tries = 0;
        const interval = setInterval(() => {
            tries++;
            if (window.gameLogic && window.simulateWeek) {
                clearInterval(interval);
                hookSimulateWeek();
                console.log('✅ injector-rival-transfers listo');
            }
            if (tries > 100) {
                clearInterval(interval);
                console.warn('⚠️ injector-rival-transfers: timeout');
            }
        }, 200);
    }

    if (document.readyState !== 'loading') {
        waitAndInit();
    } else {
        document.addEventListener('DOMContentLoaded', waitAndInit);
    }

})();
