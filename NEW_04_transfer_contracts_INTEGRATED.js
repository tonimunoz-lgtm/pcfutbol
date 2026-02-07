// ============================================================================
// 04_transfer_contracts_INTEGRATED.js - VERSIÓN AUTOCONTENIDA
// ============================================================================


console.log('📦 [INICIO] Cargando Sistema de Transferencias...');

(function() {
    'use strict';
    
    // ============================================================================
    // CONFIGURACIÓN
    // ============================================================================
    
    const CONFIG = {
        MAX_SQUAD_SIZE: 25,
        MIN_SQUAD_SIZE: 16,
        MAX_LOAN_OUT: 5,
        
        TRANSFER_WINDOW: {
            summer: { startWeek: 0, endWeek: 4 },
            winter: { startWeek: 19, endWeek: 22 }
        },
        
        CONTRACT: {
            MIN_YEARS: 1,
            MAX_YEARS: 5,
            RENEWAL_WARNING_WEEKS: 26,
            URGENT_WARNING_WEEKS: 13
        },
        
        MARKET: {
            AI_OFFER_CHANCE_PER_WEEK: 0.3,
            OFFER_VARIANCE: 0.15,
            MIN_WEEKS_BEFORE_OFFER: 1
        }
    };
    
    // ============================================================================
    // ESTADO GLOBAL
    // ============================================================================
    
    const systemState = {
        transferMarket: [],
        incomingOffers: [],
        negotiations: [],
        loanedOut: [],
        initialized: false
    };
    
    // ============================================================================
    // FUNCIONES PRINCIPALES
    // ============================================================================
    
    function initialize(gameState) {
        if (systemState.initialized) {
            console.log('⚠️ Sistema ya inicializado');
            return;
        }
        
        console.log('🔄 Inicializando sistema de transferencias...');
        
        if (gameState && gameState.squad) {
            gameState.squad.forEach(player => {
                if (!player.contractType) player.contractType = 'owned';
                if (!player.contractYears) player.contractYears = 2 + Math.floor(Math.random() * 3);
                if (!player.contractWeeks) player.contractWeeks = player.contractYears * 52;
            });
        }
        
        systemState.initialized = true;
        console.log('✅ Sistema de transferencias inicializado correctamente');
    }
    
    function listPlayerForSale(player, price, gameState) {
        if (!player || !gameState) {
            return { success: false, message: 'Datos inválidos' };
        }
        
        const playerInSquad = gameState.squad.find(p => p.name === player.name);
        if (!playerInSquad) {
            return { success: false, message: 'Jugador no en plantilla' };
        }
        
        const alreadyListed = systemState.transferMarket.find(item => item.player.name === player.name);
        if (alreadyListed) {
            return { success: false, message: 'Ya está en el mercado' };
        }
        
        systemState.transferMarket.push({
            player: { ...player },
            type: 'sale',
            price: price,
            listedWeek: gameState.week,
            fromClub: gameState.team
        });
        
        if (window.addNews) {
            window.addNews(`📢 ${player.name} en venta por ${price.toLocaleString('es-ES')}€`, 'info');
        }
        
        console.log(`✅ ${player.name} listado para venta: ${price}€`);
        
        return { 
            success: true, 
            message: `${player.name} en venta. Recibirás ofertas próximamente.` 
        };
    }
    
    function listPlayerForLoan(player, wagePercentage, gameState) {
        if (!player || !gameState) {
            return { success: false, message: 'Datos inválidos' };
        }
        
        const playerInSquad = gameState.squad.find(p => p.name === player.name);
        if (!playerInSquad) {
            return { success: false, message: 'Jugador no en plantilla' };
        }
        
        const currentLoansOut = systemState.loanedOut.length;
        if (currentLoansOut >= CONFIG.MAX_LOAN_OUT) {
            return { 
                success: false, 
                message: `Máximo ${CONFIG.MAX_LOAN_OUT} cesiones permitidas` 
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
            window.addNews(`📢 ${player.name} en cesión (pagas ${wagePercentage}%)`, 'info');
        }
        
        console.log(`✅ ${player.name} listado cesión: ${wagePercentage}%`);
        
        return { success: true, message: `${player.name} disponible en cesión` };
    }
    
    function firePlayer(player, gameState) {
        if (!player || !gameState) {
            return { success: false, message: 'Datos inválidos' };
        }
        
        const playerIndex = gameState.squad.findIndex(p => p.name === player.name);
        if (playerIndex === -1) {
            return { success: false, message: 'Jugador no encontrado' };
        }
        
        const compensation = (player.salary || 1000) * (player.contractWeeks || 52);
        
        if (gameState.balance < compensation) {
            return { 
                success: false, 
                message: `Necesitas ${compensation.toLocaleString('es-ES')}€` 
            };
        }
        
        gameState.balance -= compensation;
        gameState.squad.splice(playerIndex, 1);
        
        systemState.transferMarket = systemState.transferMarket.filter(
            item => item.player.name !== player.name
        );
        
        if (window.addNews) {
            window.addNews(`⚠️ ${player.name} despedido. Indemnización: ${compensation.toLocaleString('es-ES')}€`, 'warning');
        }
        
        console.log(`✅ ${player.name} despedido. Compensación: ${compensation}€`);
        
        return { 
            success: true, 
            message: `${player.name} despedido. Indemnización: ${compensation.toLocaleString('es-ES')}€`,
            compensation: compensation
        };
    }
    
    function renewContract(player, years, salary, gameState) {
        if (!player || !gameState) {
            return { success: false, message: 'Datos inválidos' };
        }
        
        const playerInSquad = gameState.squad.find(p => p.name === player.name);
        if (!playerInSquad) {
            return { success: false, message: 'Jugador no encontrado' };
        }
        
        if (playerInSquad.contractType === 'loan') {
            return { success: false, message: 'No puedes renovar cedidos' };
        }
        
        if (years < CONFIG.CONTRACT.MIN_YEARS || years > CONFIG.CONTRACT.MAX_YEARS) {
            return { 
                success: false, 
                message: `Contrato entre ${CONFIG.CONTRACT.MIN_YEARS} y ${CONFIG.CONTRACT.MAX_YEARS} años` 
            };
        }
        
        const currentSalary = playerInSquad.salary || 1000;
        const salaryRatio = salary / currentSalary;
        
        let acceptanceChance = 0.5;
        
        if (salaryRatio >= 1.2) acceptanceChance = 0.9;
        else if (salaryRatio >= 1.1) acceptanceChance = 0.75;
        else if (salaryRatio >= 1.0) acceptanceChance = 0.6;
        else if (salaryRatio >= 0.9) acceptanceChance = 0.4;
        else acceptanceChance = 0.2;
        
        if (years >= 4) acceptanceChance += 0.1;
        
        const accepted = Math.random() < acceptanceChance;
        
        if (accepted) {
            playerInSquad.contractYears = years;
            playerInSquad.contractWeeks = years * 52;
            playerInSquad.salary = salary;
            
            if (window.addNews) {
                window.addNews(`✅ ${playerInSquad.name} renovó ${years} años, ${salary.toLocaleString('es-ES')}€/sem`, 'success');
            }
            
            console.log(`✅ Renovación: ${playerInSquad.name} - ${years} años`);
            
            return { 
                success: true, 
                message: `¡${playerInSquad.name} aceptó la renovación!`,
                player: playerInSquad
            };
        } else {
            if (window.addNews) {
                window.addNews(`❌ ${playerInSquad.name} rechazó la renovación`, 'warning');
            }
            
            console.log(`❌ Renovación rechazada: ${playerInSquad.name}`);
            
            return { 
                success: false, 
                message: `${playerInSquad.name} rechazó. Intenta con más salario o años.` 
            };
        }
    }
    
    function generateAIOffers(gameState) {
        if (!gameState || systemState.transferMarket.length === 0) {
            return;
        }
        
        const teams = [
            'Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Sevilla',
            'Valencia', 'Real Betis', 'Athletic Club', 'Real Sociedad'
        ];
        
        systemState.transferMarket.forEach((listing, index) => {
            if (listing.fromClub !== gameState.team) return;
            
            const weeksSinceListed = gameState.week - listing.listedWeek;
            
            if (weeksSinceListed < CONFIG.MARKET.MIN_WEEKS_BEFORE_OFFER) return;
            
            const baseChance = CONFIG.MARKET.AI_OFFER_CHANCE_PER_WEEK;
            const timeBonus = weeksSinceListed * 0.1;
            const totalChance = Math.min(baseChance + timeBonus, 0.7);
            
            if (Math.random() < totalChance) {
                const buyingClub = teams[Math.floor(Math.random() * teams.length)];
                
                let offerAmount;
                if (listing.type === 'sale') {
                    const variance = CONFIG.MARKET.OFFER_VARIANCE;
                    offerAmount = Math.floor(listing.price * (1 - variance + Math.random() * variance * 2));
                } else {
                    offerAmount = 0;
                }
                
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
                        window.addNews(`📨 OFERTA: ${buyingClub} ofrece ${offerAmount.toLocaleString('es-ES')}€ por ${listing.player.name}`, 'info');
                    } else {
                        window.addNews(`📨 ${buyingClub} quiere a ${listing.player.name} cedido`, 'info');
                    }
                }
                
                console.log(`📨 Oferta: ${buyingClub} por ${listing.player.name}`);
                
                setTimeout(() => showOfferModal(offer, gameState), 500);
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
                        <p style="font-size: 1.1em;"><strong>${offer.fromClub}</strong> quiere</p>
                        <p style="font-size: 1.3em; color: #00ff00; font-weight: bold;">${offer.player.name}</p>
                        <p style="font-size: 2em; color: #00ff00; font-weight: bold;">${offer.amount.toLocaleString('es-ES')}€</p>
                        <p style="color: #aaa;">Pedías: ${listing.price.toLocaleString('es-ES')}€</p>
                    </div>
                    <button id="accept" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">✅ Aceptar</button>
                    <button id="reject" style="width: 100%; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">❌ Rechazar</button>
                </div>
            `;
        } else {
            content = `
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                    <h2 style="color: #4169E1; margin: 0 0 20px 0; text-align: center;">🔄 Oferta Cesión</h2>
                    <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                        <p><strong>${offer.fromClub}</strong> quiere</p>
                        <p style="font-size: 1.3em; color: #4169E1; font-weight: bold;">${offer.player.name}</p>
                        <p style="color: #aaa;">Pagas ${listing.wagePercentage}%</p>
                    </div>
                    <button id="accept" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">✅ Aceptar</button>
                    <button id="reject" style="width: 100%; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">❌ Rechazar</button>
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
            gameState.balance += offer.amount;
            
            const playerIndex = gameState.squad.findIndex(p => p.name === offer.player.name);
            if (playerIndex !== -1) {
                gameState.squad.splice(playerIndex, 1);
            }
            
            systemState.transferMarket.splice(offer.listingIndex, 1);
            
            const offerIndex = systemState.incomingOffers.findIndex(o => o.player.name === offer.player.name);
            if (offerIndex !== -1) {
                systemState.incomingOffers.splice(offerIndex, 1);
            }
            
            if (window.addNews) {
                window.addNews(`✅ ${offer.player.name} vendido a ${offer.fromClub} por ${offer.amount.toLocaleString('es-ES')}€!`, 'success');
            }
            
            alert(`✅ Venta!\n${offer.player.name} vendido por ${offer.amount.toLocaleString('es-ES')}€\nSaldo: ${gameState.balance.toLocaleString('es-ES')}€`);
            
        } else {
            const playerInSquad = gameState.squad.find(p => p.name === offer.player.name);
            if (playerInSquad) {
                playerInSquad.contractType = 'loaned_out';
                playerInSquad.loanedTo = offer.fromClub;
                playerInSquad.loanEndWeek = gameState.week + 52;
                
                systemState.loanedOut.push({
                    player: { ...playerInSquad },
                    toClub: offer.fromClub,
                    wagePercentage: offer.wagePercentage,
                    returnWeek: playerInSquad.loanEndWeek
                });
            }
            
            systemState.transferMarket.splice(offer.listingIndex, 1);
            
            if (window.addNews) {
                window.addNews(`✅ ${offer.player.name} cedido a ${offer.fromClub} por 1 año`, 'success');
            }
            
            alert(`✅ Cesión!\n${offer.player.name} cedido a ${offer.fromClub}`);
        }
        
        if (window.ui && window.ui.refreshUI) {
            window.ui.refreshUI(gameState);
        }
        
        if (window.openPage) {
            setTimeout(() => window.openPage('squad'), 100);
        }
    }
    
    function rejectOffer(offer) {
        const offerIndex = systemState.incomingOffers.findIndex(
            o => o.player.name === offer.player.name && o.fromClub === offer.fromClub
        );
        if (offerIndex !== -1) {
            systemState.incomingOffers.splice(offerIndex, 1);
        }
        
        if (window.addNews) {
            window.addNews(`❌ Oferta de ${offer.fromClub} rechazada`, 'info');
        }
    }
    
    function processWeekly(gameState) {
        if (!gameState) return;
        
        console.log('🔄 Procesando transferencias semanales...');
        
        generateAIOffers(gameState);
        
        gameState.squad.forEach(player => {
            if (player.contractType === 'owned' && player.contractWeeks > 0) {
                player.contractWeeks--;
                player.contractYears = Math.ceil(player.contractWeeks / 52);
                
                if (player.contractWeeks === CONFIG.CONTRACT.RENEWAL_WARNING_WEEKS) {
                    if (window.addNews) {
                        window.addNews(`⚠️ ${player.name} contrato expira pronto. Renueva.`, 'warning');
                    }
                }
                
                if (player.contractWeeks <= 0) {
                    if (window.addNews) {
                        window.addNews(`⚠️ ${player.name} contrato finalizado.`, 'warning');
                    }
                    player.contractType = 'free_agent';
                }
            }
        });
        
        systemState.loanedOut = systemState.loanedOut.filter(loan => {
            if (gameState.week >= loan.returnWeek) {
                const playerInSquad = gameState.squad.find(p => p.name === loan.player.name);
                if (playerInSquad) {
                    playerInSquad.contractType = 'owned';
                    delete playerInSquad.loanedTo;
                    delete playerInSquad.loanEndWeek;
                    
                    if (window.addNews) {
                        window.addNews(`🔄 ${loan.player.name} regresó de ${loan.toClub}`, 'success');
                    }
                }
                return false;
            }
            return true;
        });
    }
    
    // ============================================================================
    // EXPONER GLOBALMENTE
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
    
    console.log('✅ Sistema de Transferencias: CARGADO Y LISTO');
    
})();
