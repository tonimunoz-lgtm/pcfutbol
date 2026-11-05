// Persistent ownership and transactions. No UI or network dependencies.
export const CLUB_FIELDS = ['academy','lineup','staff','balance','teamLogo','stadiumImage','stadiumName','stadiumCapacity','fanbase','popularity','ticketPrice','merchandisingPrice','trainingLevel','trainingFocus','weeklyIncomeBase','weeklyIncome','weeklyExpenses','pendingOffers','pendingRenewals','competitions','competitionPlayoff','cupData','matchPlan','autoSubstitutions','pressStyle','specialInstruction','formation','mentality','lastWeekFinance','playerPurchases','playerSalesIncome','playerCompensations','seasonMovements','financePostings','squadToppedUp','potentialFixed','lastMatchResultHTML','lastMatchResultAt'];
export function assignPlayerIds(world, squad, club) {
    const names=new Set();
    for(const p of squad){
        if(!p.id)p.id=`p_${world.nextPlayerId++}`;
        if(names.has(p.name))p.name=`${p.name} (${p.id})`;
        names.add(p.name);p.club=club;
    }
    return squad;
}
export function locatePlayer(world, reference) {
    for(const [club,c] of Object.entries(world.clubs)){
        const p=c.squad.find(p=>reference.id?p.id===reference.id:p.name===reference.name&&club===(reference.sourceClub||reference.originalTeam||reference.club));
        if(p)return {club,player:p};
    }
    return null;
}
export function moveWorldPlayer(world, {id,from,to,fee=0,salary,alreadyPaid=false,loan=false,wagePercent=100,season,week,phase}) {
    const seller=world.clubs[from],buyer=world.clubs[to];
    if(!seller||!buyer||from===to)return {success:false,message:'Club de origen o destino inválido.'};
    const index=seller.squad.findIndex(p=>p.id===id),p=seller.squad[index];
    if(!p)return {success:false,message:'El jugador ya no pertenece al club vendedor.'};
    if(buyer.squad.length>=25)return {success:false,message:'El club de destino no tiene fichas libres.'};
    if(!Number.isFinite(fee)||fee<0||(!alreadyPaid&&buyer.balance<fee))return {success:false,message:'Presupuesto insuficiente o importe inválido.'};
    if((world.loans||[]).some(l=>l.playerId===id))return {success:false,message:'No se puede traspasar un jugador que está cedido.'};
    const originalSalary=Number(p.salary)||100;
    if(loan){
        const pct=Math.max(0,Math.min(100,Number(wagePercent)||0));
        world.loans.push({playerId:id,name:p.name,owner:from,borrower:to,season,originalSalary,contractYears:p.contractYears||1,ownerCost:Math.round(originalSalary*(1-pct/100))});
        p.loanOwner=from;p.loan=true;p.contractType='loaned';p.contractYears=1;p.salary=Math.round(originalSalary*pct/100);
    }else{
        p.salary=Math.max(100,Number(salary)||originalSalary);p.contractType='owned';p.loan=false;delete p.loanOwner;
        if(!alreadyPaid)buyer.balance-=fee;
        seller.balance+=fee;
    }
    if(buyer.squad.some(q=>q.name===p.name))p.name+=` (${p.id})`;
    seller.squad.splice(index,1);buyer.squad.push(p);p.club=to;p.transferListed=false;p.loanListed=false;
    p.joinedSeason=season;p.joinedPhase=phase;p.joinedWeek=week;
    const movement={id:`t_${world.nextTransferId++}`,playerId:p.id,name:p.name,from,to,fee:loan?0:fee,type:loan?'loan':'transfer',season,week,phase};
    world.transfers.push(movement);if(world.transfers.length>500)world.transfers.shift();world.revision++;
    return {success:true,player:p,movement};
}
export function returnWorldLoans(world) {
    for(const l of world.loans){
        const borrower=world.clubs[l.borrower],owner=world.clubs[l.owner];
        if(!borrower||!owner)continue;
        const i=borrower.squad.findIndex(p=>p.id===l.playerId);if(i<0)continue;
        const p=borrower.squad.splice(i,1)[0];p.club=l.owner;p.salary=l.originalSalary;p.contractType='owned';p.contractYears=l.contractYears;delete p.loanOwner;delete p.loan;delete p.loanWagePercent;
        // Returning owned players may temporarily exceed the registration cap; no player is discarded.
        owner.squad.push(p);
    }
    world.loans=[];world.revision++;
}
export function assertWorldOwnership(world,freeAgents=[]) {
    const ids=new Set();
    for(const [name,club] of Object.entries(world.clubs))for(const p of [...club.squad,...(club.snapshot?.academy||[])]){
        if(!p.id||ids.has(p.id)||p.club!==name)throw new Error(`Propiedad de jugador incoherente: ${p.name}`);
        ids.add(p.id);
    }
    for(const p of freeAgents){if(!p.id||ids.has(p.id))throw new Error(`Agente libre duplicado: ${p.name}`);ids.add(p.id);}
    return true;
}
export function buildBoardObjectives(state,rank,count) {
    const n=Math.max(2,count),remaining=Math.max(1,(state.maxSeasonWeeks||38)-(state.seasonType==='regular'?(state.week||1)-1:0));
    const target=Math.min(n-1,Math.max(1,rank));
    const wages=(state.squad||[]).reduce((s,p)=>s+(Number(p.salary)||0),0)+(state.loanSalaryExpense||0);
    return {season:state.currentSeason,club:state.team,rank,count:n,leagueTarget:target,
        wageLimit:Math.round(wages*1.10),cashFloor:Math.min(0,state.balance||0),
        youthMinutes:(state.academy?.length||(state.squad||[]).some(p=>p.age<=21))?Math.min(360,remaining*20):0,
        development:(state.academy||[]).some(p=>(p.potential||0)>(p.overall||0))?1:0,
        youthMinutesBaseline:(state.squad||[]).filter(p=>p.age<=21).reduce((n,p)=>n+(p.minutes||0),0),
        copaWinsBaseline:(state.competitions?.copaResults||[]).filter(r=>r.win).length,
        youthBaseline:Object.fromEntries((state.academy||[]).map(p=>[p.id||p.name,p.overall||0])),
        copaWins:['primera','segunda'].includes(state.division)&&!state.competitions?.historyUnavailable&&state.competitions?.copaQualified!==false?(rank<=Math.ceil(n*.25)?2:1):0,
        negotiated:false,joinedWeek:state.week||1};
}
export function evaluateBoardObjectives(state) {
    const o=state.boardObjectives;if(!o)return [];
    const rows=Object.entries(state.standings||{}).sort((a,b)=>(b[1].pts-a[1].pts)||((b[1].gf-b[1].gc)-(a[1].gf-a[1].gc)));
    const position=rows.findIndex(([t])=>t===state.team)+1;
    const wages=(state.squad||[]).reduce((s,p)=>s+(Number(p.salary)||0),0)+(state.loanSalaryExpense||0);
    const youth=(state.squad||[]).filter(p=>p.age<=21).reduce((s,p)=>s+(p.minutes||0),0);
    const grown=[...(state.academy||[]),...(state.squad||[])].filter(p=>Object.hasOwn(o.youthBaseline||{},p.id||p.name)&&(p.overall||0)>o.youthBaseline[p.id||p.name]).length;
    const wins=(state.competitions?.copaResults||[]).filter(r=>r.win).length;
    const result=[{key:'league',label:`Liga: puesto ${o.leagueTarget}º o mejor`,value:position,met:position>0&&position<=o.leagueTarget},
        {key:'wages',label:`Salarios: máximo ${o.wageLimit.toLocaleString('es-ES')} €/sem`,value:wages,met:wages<=o.wageLimit},
        {key:'cash',label:'Mantener la deuda bajo control',value:state.balance||0,met:(state.balance||0)>=o.cashFloor}];
    if(o.youthMinutes)result.push({key:'youth',label:`Jóvenes: ${o.youthMinutes} minutos`,value:Math.max(0,youth-(o.youthMinutesBaseline||0)),met:youth-(o.youthMinutesBaseline||0)>=o.youthMinutes});
    if(o.development)result.push({key:'development',label:'Mejorar al menos un canterano',value:grown,met:grown>=1});
    if(o.copaWins)result.push({key:'copa',label:`Copa: ganar ${o.copaWins} eliminatoria(s)`,value:Math.max(0,wins-(o.copaWinsBaseline||0)),met:wins-(o.copaWinsBaseline||0)>=o.copaWins});
    return result;
}

export function retirementProbability(age,position) {
    const years=age-(position==='POR'?2:0);
    return years>=40?1:years===39?.95:years===38?.85:years===37?.7:years===36?.45:years===35?.25:years===34?.1:0;
}
