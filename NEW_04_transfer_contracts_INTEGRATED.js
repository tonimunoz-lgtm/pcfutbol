// ============================================================================
// 04_transfer_contracts_INTEGRATED.js
// Sistema INTEGRADO de Fichajes, Contratos y Mercado
// ============================================================================

(function() {
    'use strict';
    
    console.log('📦 Sistema Integrado de Fichajes y Contratos: Iniciando...');
    
    // ============================================================================
    // CONFIGURACIÓN
    // ============================================================================
    
    const CONFIG = {
        MAX_SQUAD_SIZE: 25,
        MIN_SQUAD_SIZE: 16,
        MAX_LOAN_OUT: 5,
        
        TRANSFER_WINDOW: {
            summer: { startWeek: 0, endWeek: 4 },  // Pretemporada
            winter: { startWeek: 19, endWeek: 22 }  // Mitad de temporada
        },
        
        CONTRACT: {
            MIN_YEARS: 1,
            MAX_YEARS: 5,
            RENEWAL_WARNING_WEEKS: 26,  // 6 meses
            URGENT_WARNING_WEEKS: 13     // 3 meses
        },
        
        MARKET: {
            AI_OFFER_CHANCE_PER_WEEK: 0.3,
            OFFER_VARIANCE: 0.15,  // ±15% del precio pedido
            MIN_WEEKS_BEFORE_OFFER: 1
        }
    };
    
    // ============================================================================
    // ESTADO GLOBAL DEL SISTEMA
    // ============================================================================
    
    const systemState = {
        transferMarket: [],      // Jugadores en venta/cesión
        incomingOffers: [],      // Ofertas recibidas
        negotiations: [],        // Negociaciones activas
        loanedOut: [],          // Jugadores cedidos a otros clubs
        initialized: false
    };
    
    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================
    
    function initialize(gameState) {
        if (systemState.initialized) return;
        
        console.log('🔄 Inicializando sistema integrado...');
        
        // Inicializar propiedades de contrato en jugadores existentes
        if (gameState && gameState.squad) {
            gameState.squad.forEach(player => {
                if (!player.contractType) player.contractType = 'owned';
                if (!player.contractYears) player.contractYears = 2 + Math.floor(Math.random() * 3);
                if (!player.contractWeeks) player.contractWeeks = player.contractYears * 52;
            });
        }
        
        systemState.initialized = true;
        console.log('✅ Sistema integrado inicializado');
    }
    
    // ============================================================================
    // MERCADO DE FICHAJES - PONER JUGADOR A LA VENTA/CESIÓN
    // ============================================================================
    
    function listPlayerForSale(player, price, gameState) {
        if (!player || !gameState) {
            console.error('❌ Player o gameState inválido');
            return { success: false, message: 'Datos inválidos' };
        }
        
        // Verificar que el jugador existe en la plantilla
        const playerInSquad = gameState.squad.find(p => p.name === player.name);
        if (!playerInSquad) {
            return { success: false, message: 'El jugador no está en tu plantilla' };
        }
        
        // Verificar que no está ya en venta
        const alreadyListed = systemState.transferMarket.find(
            item => item.player.name === player.name
        );
        if (alreadyListed) {
            return { success: false, message: 'El jugador ya está en el mercado' };
        }
        
        // Añadir al mercado
        systemState.transferMarket.push({
            player: { ...player },
            type: 'sale',
            price: price,
            listedWeek: gameState.week,
            fromClub: gameState.team
        });
        
        if (window.addNews) {
            window.addNews(
                `📢 ${player.name} puesto en venta por ${price.toLocaleString('es-ES')}€`,
                'info'
            );
        }
        
        console.log(`✅ ${player.name} listado para venta: ${price}€`);
        
        return { 
            success: true, 
            message: `${player.name} está ahora en venta. Recibirás ofertas en las próximas semanas.` 
        };
    }
    
    function listPlayerForLoan(player, wagePercentage, gameState) {
        if (!player || !gameState) {
            return { success: false, message: 'Datos inválidos' };
        }
        
        const playerInSquad = gameState.squad.find(p => p.name === player.name);
        if (!playerInSquad) {
            return { success: false, message: 'El jugador no está en tu plantilla' };
        }
        
        // Verificar límite de cedidos
        const currentLoansOut = systemState.loanedOut.length;
        if (currentLoansOut >= CONFIG.MAX_LOAN_OUT) {
            return { 
                success: false, 
                message: `Ya tienes ${CONFIG.MAX_LOAN_OUT} jugadores cedidos (máximo permitido)` 
            };
        }
        
        systemState.transferMarket.push({
            player: { ...player },
            type: 'loan',
            wagePercentage: wagePercentage,
            listedWeek: gameState.week,
            fromClub: gameState.team
        });
        
        if (window.addNews) {
            window.addNews(
                `📢 ${player.name} disponible en cesión (pagas ${wagePercentage}% del salario)`,
                'info'
            );
        }
        
        console.log(`✅ ${player.name} listado para cesión: ${wagePercentage}%`);
        
        return { success: true, message: `${player.name} disponible en cesión` };
    }
    
    // ============================================================================
    // DESPEDIR JUGADOR
    // ============================================================================
    
    function firePlayer(player, gameState) {
        if (!player || !gameState) {
            return { success: false, message: 'Datos inválidos' };
        }
        
        const playerIndex = gameState.squad.findIndex(p => p.name === player.name);
        if (playerIndex === -1) {
            return { success: false, message: 'Jugador no encontrado en plantilla' };
        }
        
        // Calcular indemnización
        const compensation = (player.salary || 1000) * (player.contractWeeks || 52);
        
        if (gameState.balance < compensation) {
            return { 
                success: false, 
                message: `No tienes suficiente dinero. Necesitas ${compensation.toLocaleString('es-ES')}€` 
            };
        }
        
        // Pagar indemnización
        gameState.balance -= compensation;
        
        // ELIMINAR del squad
        gameState.squad.splice(playerIndex, 1);
        
        // Eliminar del mercado si estaba listado
        systemState.transferMarket = systemState.transferMarket.filter(
            item => item.player.name !== player.name
        );
        
        if (window.addNews) {
            window.addNews(
                `⚠️ ${player.name} despedido. Indemnización pagada: ${compensation.toLocaleString('es-ES')}€`,
                'warning'
            );
        }
        
        console.log(`✅ ${player.name} despedido. Compensación: ${compensation}€`);
        
        return { 
            success: true, 
            message: `${player.name} ha sido despedido. Indemnización: ${compensation.toLocaleString('es-ES')}€`,
            compensation: compensation
        };
    }
    
    // ============================================================================
    // RENOVACIONES DE CONTRATO
    // ============================================================================
    
    function renewContract(player, years, salary, gameState) {
        if (!player || !gameState) {
            return { success: false, message: 'Datos inválidos' };
        }
        
        // Buscar jugador en squad
        const playerInSquad = gameState.squad.find(p => p.name === player.name);
        if (!playerInSquad) {
            return { success: false, message: 'Jugador no encontrado' };
        }
        
        // No se puede renovar a cedidos
        if (playerInSquad.contractType === 'loan') {
            return { success: false, message: 'No puedes renovar a un jugador cedido' };
        }
        
        // Validar años
        if (years < CONFIG.CONTRACT.MIN_YEARS || years > CONFIG.CONTRACT.MAX_YEARS) {
            return { 
                success: false, 
                message: `El contrato debe ser entre ${CONFIG.CONTRACT.MIN_YEARS} y ${CONFIG.CONTRACT.MAX_YEARS} años` 
            };
        }
        
        // Calcular probabilidad de aceptación
        const currentSalary = playerInSquad.salary || 1000;
        const salaryRatio = salary / currentSalary;
        
        let acceptanceChance = 0.5;
        
        if (salaryRatio >= 1.2) acceptanceChance = 0.9;
        else if (salaryRatio >= 1.1) acceptanceChance = 0.75;
        else if (salaryRatio >= 1.0) acceptanceChance = 0.6;
        else if (salaryRatio >= 0.9) acceptanceChance = 0.4;
        else acceptanceChance = 0.2;
        
        // Bonus por duración larga
        if (years >= 4) acceptanceChance += 0.1;
        
        const accepted = Math.random() < acceptanceChance;
        
        if (accepted) {
            // ACTUALIZAR DIRECTAMENTE EN GAMESTATE.SQUAD
            playerInSquad.contractYears = years;
            playerInSquad.contractWeeks = years * 52;
            playerInSquad.salary = salary;
            
            if (window.addNews) {
                window.addNews(
                    `✅ ${playerInSquad.name} ha renovado por ${years} años y ${salary.toLocaleString('es-ES')}€/semana`,
                    'success'
                );
            }
            
            console.log(`✅ Renovación exitosa: ${playerInSquad.name} - ${years} años`);
            
            return { 
                success: true, 
                message: `¡${playerInSquad.name} ha aceptado la renovación!`,
                player: playerInSquad
            };
        } else {
            if (window.addNews) {
                window.addNews(
                    `❌ ${playerInSquad.name} ha rechazado la oferta de renovación`,
                    'warning'
                );
            }
            
            console.log(`❌ Renovación rechazada: ${playerInSquad.name}`);
            
            return { 
                success: false, 
                message: `${playerInSquad.name} rechazó la oferta. Intenta con más salario o más años.` 
            };
        }
    }
    
    // ============================================================================
    // IA DE CLUBS - GENERAR OFERTAS
    // ============================================================================
    
    function generateAIOffers(gameState) {
        if (!gameState || systemState.transferMarket.length === 0) {
            return;
        }
        
        const teams = [
            'Real Madrid', 'FC Barcelona', 'Atlético de Madrid', 'Sevilla FC',
            'Valencia CF', 'Real Betis', 'Athletic Club', 'Real Sociedad',
            'Villarreal CF', 'Getafe CF', 'Osasuna', 'Celta de Vigo'
        ];
        
        systemState.transferMarket.forEach((listing, index) => {
            // Solo jugadores de nuestro club
            if (listing.fromClub !== gameState.team) return;
            
            const weeksSinceListed = gameState.week - listing.listedWeek;
            
            // No generar ofertas en la primera semana
            if (weeksSinceListed < CONFIG.MARKET.MIN_WEEKS_BEFORE_OFFER) return;
            
            // Probabilidad aumenta con el tiempo
            const baseChance = CONFIG.MARKET.AI_OFFER_CHANCE_PER_WEEK;
            const timeBonus = weeksSinceListed * 0.1;
            const totalChance = Math.min(baseChance + timeBonus, 0.7);
            
            if (Math.random() < totalChance) {
                // Generar oferta
                const buyingClub = teams[Math.floor(Math.random() * teams.length)];
                
                let offerAmount;
                if (listing.type === 'sale') {
                    // Oferta entre 70% y 110% del precio pedido
                    const variance = CONFIG.MARKET.OFFER_VARIANCE;
                    offerAmount = Math.floor(
                        listing.price * (1 - variance + Math.random() * variance * 2)
                    );
                } else {
                    // Para cesión, siempre aceptan
                    offerAmount = 0;
                }
                
                // Crear oferta
                const offer = {
                    player: listing.player,
                    fromClub: buyingClub,
                    toClub: gameState.team,
                    type: listing.type,
                    amount: offerAmount,
                    wagePercentage: listing.wagePercentage,
                    listingIndex: index,
                    receivedWeek: gameState.week
                };
                
                systemState.incomingOffers.push(offer);
                
                if (window.addNews) {
                    if (listing.type === 'sale') {
                        window.addNews(
                            `📨 OFERTA: ${buyingClub} ofrece ${offerAmount.toLocaleString('es-ES')}€ por ${listing.player.name}`,
                            'info'
                        );
                    } else {
                        window.addNews(
                            `📨 CESIÓN: ${buyingClub} quiere llevarse a ${listing.player.name} cedido`,
                            'info'
                        );
                    }
                }
                
                console.log(`📨 Oferta generada: ${buyingClub} por ${listing.player.name}`);
                
                // Mostrar modal
                setTimeout(() => {
                    showOfferModal(offer, gameState);
                }, 500);
            }
        });
    }
    
    function showOfferModal(offer, gameState) {
        const modal = document.createElement('div');
        modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);align-items:center;justify-content:center;z-index:10000;';
        
        const listing = systemState.transferMarket[offer.listingIndex];
        
        let content = '';
        if (offer.type === 'sale') {
            content = `
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                    <h2 style="color: #00ff00; margin: 0 0 20px 0; text-align: center;">📨 Oferta Recibida</h2>
                    <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                        <p style="font-size: 1.1em; margin-bottom: 10px;"><strong>${offer.fromClub}</strong> quiere fichar a</p>
                        <p style="font-size: 1.3em; color: #00ff00; font-weight: bold; margin: 10px 0;">${offer.player.name}</p>
                        <p style="font-size: 2em; color: #00ff00; font-weight: bold; margin: 15px 0;">${offer.amount.toLocaleString('es-ES')}€</p>
                        <p style="color: #aaa; font-size: 0.9em;">Precio pedido: ${listing.price.toLocaleString('es-ES')}€</p>
                    </div>
                    <button id="accept" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px;">✅ Aceptar Oferta</button>
                    <button id="reject" style="width: 100%; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">❌ Rechazar Oferta</button>
                </div>
            `;
        } else {
            content = `
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                    <h2 style="color: #4169E1; margin: 0 0 20px 0; text-align: center;">🔄 Oferta de Cesión</h2>
                    <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                        <p style="font-size: 1.1em; margin-bottom: 10px;"><strong>${offer.fromClub}</strong> quiere ceder a</p>
                        <p style="font-size: 1.3em; color: #4169E1; font-weight: bold; margin: 10px 0;">${offer.player.name}</p>
                        <p style="color: #aaa; font-size: 0.9em;">Pagarás ${listing.wagePercentage}% del salario</p>
                    </div>
                    <button id="accept" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em; margin-bottom: 10px;">✅ Aceptar Cesión</button>
                    <button id="reject" style="width: 100%; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1em;">❌ Rechazar</button>
                </div>
            `;
        }
        
        modal.innerHTML = content;
        document.body.appendChild(modal);
        
        modal.querySelector('#accept').onclick = () => {
            acceptOffer(offer, gameState);
            modal.remove();
        };
        
        modal.querySelector('#reject').onclick = () => {
            rejectOffer(offer);
            modal.remove();
        };
    }
    
    function acceptOffer(offer, gameState) {
        if (offer.type === 'sale') {
            // AÑADIR DINERO
            gameState.balance += offer.amount;
            
            // ELIMINAR JUGADOR DE SQUAD
            const playerIndex = gameState.squad.findIndex(p => p.name === offer.player.name);
            if (playerIndex !== -1) {
                gameState.squad.splice(playerIndex, 1);
            }
            
            // ELIMINAR DEL MERCADO
            systemState.transferMarket.splice(offer.listingIndex, 1);
            
            // ELIMINAR OFERTA
            const offerIndex = systemState.incomingOffers.findIndex(
                o => o.player.name === offer.player.name
            );
            if (offerIndex !== -1) {
                systemState.incomingOffers.splice(offerIndex, 1);
            }
            
            if (window.addNews) {
                window.addNews(
                    `✅ ¡VENTA COMPLETADA! ${offer.player.name} vendido a ${offer.fromClub} por ${offer.amount.toLocaleString('es-ES')}€`,
                    'success'
                );
            }
            
            alert(`✅ ¡Venta completada!\n\n${offer.player.name} vendido por ${offer.amount.toLocaleString('es-ES')}€\n\nNuevo saldo: ${gameState.balance.toLocaleString('es-ES')}€`);
            
        } else {
            // CESIÓN - Marcar jugador como cedido
            const playerInSquad = gameState.squad.find(p => p.name === offer.player.name);
            if (playerInSquad) {
                playerInSquad.contractType = 'loaned_out';
                playerInSquad.loanedTo = offer.fromClub;
                playerInSquad.loanEndWeek = gameState.week + 52;  // 1 año
                
                systemState.loanedOut.push({
                    player: { ...playerInSquad },
                    toClub: offer.fromClub,
                    wagePercentage: offer.wagePercentage,
                    returnWeek: playerInSquad.loanEndWeek
                });
            }
            
            // ELIMINAR DEL MERCADO
            systemState.transferMarket.splice(offer.listingIndex, 1);
            
            if (window.addNews) {
                window.addNews(
                    `✅ ${offer.player.name} cedido a ${offer.fromClub} por 1 año`,
                    'success'
                );
            }
            
            alert(`✅ Cesión completada!\n\n${offer.player.name} cedido a ${offer.fromClub} por 1 año`);
        }
        
        // Refrescar UI
        if (window.ui && window.ui.refreshUI) {
            window.ui.refreshUI(gameState);
        }
        
        // Reabrir página de plantilla para ver cambios
        if (window.openPage) {
            setTimeout(() => window.openPage('squad'), 100);
        }
    }
    
    function rejectOffer(offer) {
        // Eliminar oferta
        const offerIndex = systemState.incomingOffers.findIndex(
            o => o.player.name === offer.player.name && o.fromClub === offer.fromClub
        );
        if (offerIndex !== -1) {
            systemState.incomingOffers.splice(offerIndex, 1);
        }
        
        if (window.addNews) {
            window.addNews(
                `❌ Has rechazado la oferta de ${offer.fromClub} por ${offer.player.name}`,
                'info'
            );
        }
    }
    
    // ============================================================================
    // PROCESAMIENTO SEMANAL
    // ============================================================================
    
    function processWeekly(gameState) {
        if (!gameState) return;
        
        // 1. Generar ofertas de IA
        generateAIOffers(gameState);
        
        // 2. Procesar contratos - decrementar semanas
        gameState.squad.forEach(player => {
            if (player.contractType === 'owned' && player.contractWeeks > 0) {
                player.contractWeeks--;
                player.contractYears = Math.ceil(player.contractWeeks / 52);
                
                // Avisos
                if (player.contractWeeks === CONFIG.CONTRACT.RENEWAL_WARNING_WEEKS) {
                    if (window.addNews) {
                        window.addNews(
                            `⚠️ ${player.name} tiene contrato hasta final de temporada. Renuévalo pronto.`,
                            'warning'
                        );
                    }
                }
                
                // Contrato expirado
                if (player.contractWeeks <= 0) {
                    if (window.addNews) {
                        window.addNews(
                            `⚠️ ${player.name} ha finalizado su contrato y queda libre.`,
                            'warning'
                        );
                    }
                    // El jugador permanece pero puede irse gratis
                    player.contractType = 'free_agent';
                }
            }
        });
        
        // 3. Procesar cesiones - verificar retornos
        systemState.loanedOut = systemState.loanedOut.filter(loan => {
            if (gameState.week >= loan.returnWeek) {
                // Jugador vuelve
                const playerInSquad = gameState.squad.find(p => p.name === loan.player.name);
                if (playerInSquad) {
                    playerInSquad.contractType = 'owned';
                    delete playerInSquad.loanedTo;
                    delete playerInSquad.loanEndWeek;
                    
                    if (window.addNews) {
                        window.addNews(
                            `🔄 ${loan.player.name} ha regresado de su cesión en ${loan.toClub}`,
                            'success'
                        );
                    }
                }
                return false;  // Eliminar de loanedOut
            }
            return true;  // Mantener
        });
    }
    
    // ============================================================================
    // EXPONER FUNCIONES GLOBALMENTE
    // ============================================================================
    
    window.TransferContractsSystem = {
        initialize,
        listPlayerForSale,
        listPlayerForLoan,
        firePlayer,
        renewContract,
        processWeekly,
        getTransferMarket: () => systemState.transferMarket,
        getIncomingOffers: () => systemState.incomingOffers,
        getLoanedOut: () => systemState.loanedOut
    };
    
    console.log('✅ Sistema Integrado de Fichajes y Contratos: Cargado correctamente');
    
})();
