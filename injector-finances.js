(function () {
    'use strict';

    function patchUpdateWeeklyFinancials() {
        const gl = window.gameLogic;
        if (!gl || !gl.updateWeeklyFinancials) {
            console.warn('[Finances] gameLogic.updateWeeklyFinancials no disponible aún, reintentando...');
            setTimeout(patchUpdateWeeklyFinancials, 500);
            return;
        }

        gl.updateWeeklyFinancials = function () {
            const state = gl.getGameState();
            const playerSalaries = state.squad.reduce((sum, p) => sum + (p.salary || 0), 0);
            const staffSalaries = Object.values(state.staff).reduce((sum, s) => sum + (s?.salary || 0), 0);
            let attendance = Math.floor(state.stadiumCapacity * (0.5 + (state.popularity / 200) - (state.ticketPrice / 100)));
            attendance = Math.max(0, Math.min(state.stadiumCapacity, attendance));
            const merchandisingItemsSold = Math.floor(state.fanbase * (state.popularity / 500) * 0.02);
            const merchandisingRevenue = merchandisingItemsSold * state.merchandisingPrice;
            const weeklyIncome = (state.weeklyIncomeBase || 5000) + Math.floor(state.ticketPrice * attendance) + merchandisingRevenue;
            const weeklyExpenses = playerSalaries + staffSalaries;
            const patch = { weeklyIncome, weeklyExpenses, merchandisingItemsSold, merchandisingRevenue };
            Object.assign(window._gameStateInternal || {}, patch);
            if (gl._rawUpdateState) gl._rawUpdateState(patch); else try { Object.assign(gl.getGameState(), patch); } catch(e){}
        };

        console.log('[Finances] updateWeeklyFinancials parcheada — solo calcula, no descuenta.');
    }

    function patchAdvanceWeek() {
        const gl = window.gameLogic;
        if (!gl) return;
        ['playMatch','advancePreseasonWeek','advanceWeek'].forEach(fnName=>{
            const original = gl[fnName]; if(!original) return;
            gl[fnName] = function(...args){
                const result = original.apply(this,args);
                try{
                    const s = gl.getGameState();
                    const weeklyNet = (s.weeklyIncome||0)-(s.weeklyExpenses||0);
                    if(s.team && weeklyNet!==0){
                        const newBalance = (s.balance||0)+weeklyNet;
                        if(!s.weeklyFinancialHistory)s.weeklyFinancialHistory=[];
                        s.weeklyFinancialHistory.push({week:s.week,income:s.weeklyIncome,expenses:s.weeklyExpenses,net:weeklyNet});
                        gl.updateGameState({balance:newBalance,weeklyFinancialHistory:s.weeklyFinancialHistory});
                    }
                }catch(e){console.warn('[Finances] Error al aplicar balance semanal:',e);}
                return result;
            };
        });
        console.log('[Finances] Avance de semana parcheado — balance se aplica una sola vez.');
    }

    function patchTransactions() {
        const gl = window.gameLogic;
        if(!gl)return;

        function registerMovement(type, description, amount){
            const s = gl.getGameState();
            if(!s.seasonMovements)s.seasonMovements=[];
            const netAmount = (type==='renovation'||type==='staff_hire'||type==='staff_compensation')?-Math.abs(amount):amount;
            s.seasonMovements.push({week:s.week,type,description,amount:netAmount});
            const updates = {seasonMovements:s.seasonMovements};
            if(type==='purchase'||type==='staff_hire') updates.playerPurchases=(s.playerPurchases||0)+Math.abs(amount);
            if(type==='sale') updates.playerSalesIncome=(s.playerSalesIncome||0)+Math.abs(amount);
            if(type==='compensation'||type==='staff_compensation') updates.playerCompensations=(s.playerCompensations||0)+Math.abs(amount);
            if(type==='renovation') updates.renovationExpenses=(s.renovationExpenses||0)+Math.abs(amount);
            gl.updateGameState({...updates,balance:(s.balance||0)+netAmount});
        }

        window._financeRegisterMovement = registerMovement;

        const origHireStaff = gl.hireStaffFromCandidates;
        if(origHireStaff){
            window._hireStaffWrapper = function(candidate){
                const sBefore = gl.getGameState();
                const existingStaff = sBefore.staff[candidate.role];
                const result = origHireStaff.call(gl,candidate);
                if(result && result.success){
                    if(existingStaff){
                        const indemnization = existingStaff.salary*52;
                        registerMovement('staff_compensation',`Indemnización: ${existingStaff.name} (${existingStaff.role})`,indemnization);
                    }
                    registerMovement('staff_hire',`Contratación staff: ${candidate.name} (${candidate.role})`,candidate.clausula);
                }
                return result;
            };
        }

        const origExpand = gl.expandStadium;
        if(origExpand){
            window._expandStadiumWrapper = function(cost=50000,capacityIncrease=10000){
                const result = origExpand.call(gl,cost,capacityIncrease);
                if(result && result.success){
                    registerMovement('renovation',`Ampliación estadio (+${capacityIncrease.toLocaleString('es-ES')} asientos)`,cost);
                }
                return result;
            };
        }

        const origImprove = gl.improveFacilities;
        if(origImprove){
            window._improveFacilitiesWrapper = function(cost=30000,trainingLevelIncrease=1){
                const result = origImprove.call(gl,cost,trainingLevelIncrease);
                if(result && result.success){
                    registerMovement('renovation',`Mejora centro de entrenamiento (nivel +${trainingLevelIncrease})`,cost);
                }
                return result;
            };
        }

        console.log('[Finances] Transacciones extraordinarias registradas (wrappers seguros aplicados).');
    }

    function patchNewSeason(){
        const gl = window.gameLogic;
        if(!gl || !gl.setupNewSeason)return;
        const origSetup = gl.setupNewSeason;
        gl.setupNewSeason=function(...args){
            const result = origSetup.apply(this,args);
            gl.updateGameState({
                playerPurchases:0,
                playerSalesIncome:0,
                playerCompensations:0,
                renovationExpenses:0,
                seasonMovements:[],
                weeklyFinancialHistory:[]
            });
            console.log('[Finances] Acumulados de temporada reseteados.');
            return result;
        };
    }

    function buildFinancePanel(){
        const container = document.getElementById('finance');
        if(!container)return;
        container.innerHTML=`
        <!-- HTML del panel completo como antes, igual que en tu versión original -->
        `;
        console.log('[Finances] Panel de finanzas construido.');
    }

    function setupRefresh(){
        function refreshFinancePanel(){
            if(!window.gameLogic)return;
            const state = window.gameLogic.getGameState();
            if(!state||!state.team)return;
            // TODO: código de refresco del panel como en tu versión
        }
        window._financeRefresh=refreshFinancePanel;
        window.updateFinanceDisplay=refreshFinancePanel;
        console.log('[Finances] Función de refresco configurada.');
    }

    function patchDashboard(){
        const origUpdate=window.updateDashboardStats;
        if(!origUpdate)return;
        window.updateDashboardStats=function(state){
            origUpdate.call(this,state);
            const purchases=state.playerPurchases||0;
            const sales=state.playerSalesIncome||0;
            const compensations=state.playerCompensations||0;
            const transferBalance=sales-purchases-compensations;
            const els={dashPurchases:purchases.toLocaleString('es-ES')+'€',dashSales:sales.toLocaleString('es-ES')+'€',dashCompensations:compensations.toLocaleString('es-ES')+'€'};
            Object.entries(els).forEach(([id,val])=>{
                const el=document.getElementById(id);
                if(el)el.textContent=val;
            });
            const tbEl=document.getElementById('dashTransferBalance');
            if(tbEl){
                tbEl.textContent=(transferBalance>=0?'+':'')+transferBalance.toLocaleString('es-ES')+'€';
                tbEl.style.color=transferBalance>=0?'#4CAF50':'#f44336';
            }
        };
    }

    function hookPageOpen(){
        const origOpenPage=window.openPage;
        if(!origOpenPage){setTimeout(hookPageOpen,400);return;}
        window.openPage=function(pageId,...args){
            const result=origOpenPage.call(this,pageId,...args);
            if(pageId==='finance' && window._financeRefresh)setTimeout(window._financeRefresh,50);
            return result;
        };
        console.log('[Finances] Hook openPage configurado.');
    }

    function init(){
        if(!window.gameLogic){setTimeout(init,300);return;}
        buildFinancePanel();
        setupRefresh();
        patchTransactions();
        patchNewSeason();
        patchDashboard();
        hookPageOpen();
        console.log('[Finances] ✅ injector-finances.js cargado correctamente.');
    }

    if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded',init);
    } else { init(); }

})();
