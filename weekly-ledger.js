// Domain accounting: no DOM, timers, globals or network calls.
export function weekAdvanced(before, after, result) {
    return !!(before?.team && after?.team===before.team && !result?.ignored && !result?.cupMatch &&
        (before.week!==after.week || before.seasonType!==after.seasonType || before.currentSeason!==after.currentSeason ||
        (before.matchHistory||[]).length!==(after.matchHistory||[]).length));
}
export function settleWeeklyFinance(before, after, result, economy, offseasonWeeks=8) {
    if(!weekAdvanced(before,after,result))return null;
    const key=`${before.team}|${before.currentSeason}|${before.seasonType}|${before.week}`+
        (before.seasonType==='playoff'?`|${(before.matchHistory||[]).length}`:'');
    if(after.financePostings?.[key])return null;
    const home=before.seasonType==='regular' && (before.seasonCalendar||[]).some(m=>m.week===before.week && m.home===before.team);
    const attendance=home?economy.attendance(before):0, merch=home?economy.merch(before):{revenue:0,items:0};
    const ticketInc=home?Math.floor((before.ticketPrice??0)*attendance):0;
    const merchInc=merch.revenue,baseInc=before.weeklyIncomeBase??5000;
    const expSalaries=(before.squad||[]).reduce((n,p)=>n+(Number(p.salary)||0),0)+(before.loanSalaryExpense||0);
    const expStaff=Object.values(before.staff||{}).reduce((n,p)=>n+(Number(p?.salary)||0),0);
    const expLoans=Array.isArray(before.fd_loans)?before.fd_loans.filter(l=>l.weeksLeft>0).reduce((n,l)=>n+(Number(l.weeklyPayment)||0),0):(before.fd_loanPayment||0);
    const benefits=economy.benefits(before,ticketInc,merchInc);
    const expStructure=typeof economy.structure==='function'?economy.structure(before):0;
    const totalInc=ticketInc+merchInc+baseInc,totalExp=expSalaries+expStaff+expLoans+benefits.total+expStructure;
    const net=totalInc-totalExp,loans=(before.fd_loans||[]).map(l=>({...l,weeksLeft:Math.max(0,(l.weeksLeft||0)-1)}));
    const patch={balance:(after.balance??0)+net,fd_loans:loans,
        fd_loanPayment:loans.filter(l=>l.weeksLeft>0).reduce((n,l)=>n+(Number(l.weeklyPayment)||0),0),
        lastWeekFinance:{week:before.week,season:before.currentSeason,phase:before.seasonType,home,att:attendance,items:merch.items,
            ticketInc,merchInc,baseInc,totalInc,totalExp,expSalaries,expStaff,expLoans,expStructure,expBonus:0,benefits,net},
        financePostings:{...(after.financePostings||{}),[key]:true}};
    if(before.currentSeason!==after.currentSeason){
        const extra=Math.max(0,offseasonWeeks-1),summer=economy.offseasonCashflow({...after,...patch},extra,economy.benefits(after).total,typeof economy.structure==='function'?economy.structure(after):0);
        patch.balance+=summer.net;patch.fd_loans=summer.fd_loans;patch.fd_loanPayment=summer.fd_loanPayment;
        patch.financePostings[key+'|summer']=true;
        patch.seasonMovements=[...(after.seasonMovements||[]),{week:after.week,type:summer.net>=0?'income':'expense',description:`Verano: ${extra} semanas adicionales`,amount:summer.net}];
    }
    return patch;
}
