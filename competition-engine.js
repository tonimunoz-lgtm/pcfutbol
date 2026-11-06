// Persistent competition brackets. Pure data: no DOM, network or shared storage.
const copy = x => JSON.parse(JSON.stringify(x));
const unique = xs => [...new Set(xs.filter(Boolean))];
export const CUP_PHASES = ['copa_r1','copa_r32','copa_r16','copa_qf','copa_sf','copa_final'];
const EU_PHASES = ['playoff','round16','quarterfinals','semifinals','final'];
const ALIASES = {round1:'copa_r1',round32:'copa_r32',round16:'copa_r16',quarters:'copa_qf',semis:'copa_sf',final:'copa_final'};
const COPA_WEEKS = [[6],[10],[15],[20],[25,27],[36]];
const EU_WEEKS = [[25,26],[28,29],[31,32],[34,35],[37]];
const RESERVES = ('AC Milan|FC Barcelona|Real Madrid CF|Atlético de Madrid|Athletic Club|Villarreal CF|Real Betis Balompié|RC Celta de Vigo|Rayo Vallecano|Real Sociedad|Sevilla FC|Valencia CF|Liverpool FC|Arsenal FC|Manchester City|Chelsea FC|Manchester United|Tottenham Hotspur|Newcastle United|Aston Villa|Brighton|West Ham United|Crystal Palace|Nottingham Forest|Everton|Fulham|Bournemouth|Bayern München|Bayer Leverkusen|Eintracht Frankfurt|B. Dortmund|RB Leipzig|VfB Stuttgart|SC Freiburg|Mainz 05|Werder Bremen|Wolfsburg|Borussia Mönchengladbach|Hoffenheim|Union Berlin|PSG|AS Monaco|Olympique Marsella|Olympique Lyonnais|RC Lens|Lille|Nice|Rennes|Strasbourg|Brest|Toulouse|Inter de Milán|Atalanta BC|Juventus FC|SSC Napoli|AS Roma|SS Lazio|Fiorentina|Bologna|Torino|Udinese|Genoa|Sampdoria|Sassuolo|PSV Eindhoven|Ajax|Feyenoord|AZ Alkmaar|Twente|Utrecht|Heerenveen|NEC Nijmegen|FC Groningen|Sporting CP|Benfica SL|FC Porto|Braga|Vitória Guimarães|Boavista|Santa Clara|Famalicão|Celtic FC|Rangers FC|Hearts FC|Hibernian|Aberdeen|Dundee United|Galatasaray SK|Fenerbahçe SK|Beşiktaş|Trabzonspor|Başakşehir|Samsunspor|Olympiacos|PAOK FC|Panathinaikos|AEK Atenas|Aris Salónica|Club Bruges|Gent|Anderlecht|Union Saint-Gilloise|Genk|Antwerp|Standard Liège|Red Bull Salzburg|Sturm Graz|Rapid Viena|Austria Viena|LASK|FC Basel|Servette FC|Young Boys|FC Zürich|Lugano|Dinamo Zagreb|Hajduk Split|Rijeka|Slavia Praha|Sparta Praha|Viktoria Plzeň|Baník Ostrava|FC Midtjylland|Copenhague|Brøndby|Nordsjælland|Molde FK|Bodø/Glimt|Rosenborg|Brann|Malmö FF|Hammarby|Djurgården|AIK|Legia Varsovia|Lech Poznań|Raków|Jagiellonia|Ferencváros|Ludogorets|Partizan|Estrella Roja|Shakhtar|Dynamo Kyiv|Qarabağ|FC Sheriff|HJK Helsinki|Shamrock Rovers|Linfield|Slovan Bratislava|Olimpija Ljubljana|Maribor|APOEL|Omonia|AEK Larnaca|Maccabi Haifa|Maccabi Tel Aviv|FCSB|CFR Cluj|Universitatea Craiova|Levski Sofia|CSKA Sofia|Dinamo Minsk|Zrinjski|Lincoln Red Imps').split('|');
function hash(text) { let h=2166136261;for(const c of String(text)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return h; }
function random(seed) { let n=seed>>>0;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296); }
function shuffle(xs,rng) { const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
const phaseOf = m => m.type==='copa' ? ALIASES[m.phase]||m.phase : m.isPlayoff||String(m.phase).startsWith('playoff')?'playoff':m.phase;
const legOf = m => m.id==='copa_sf_2'||/_2$/.test(m.id)||m.leg===2?2:1;
const row = name => ({name,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0});
const sortTable = t => Object.values(t).sort((a,b)=>b.pts-a.pts||(b.gf-b.gc)-(a.gf-a.gc)||b.gf-a.gf||a.name.localeCompare(b.name));
// Keep the game's configured domestic quota (5/2/1), reserving the cup slot
// and applying titleholder upgrades. No association coefficients are simulated.
export function europeanPlaces(rows=[],titles={}) {
    const places={},teams=rows.map(r=>r.team).filter(Boolean);
    teams.slice(0,5).forEach(t=>{places[t]='champions';});
    let europa=2;
    if(titles?.copa&&places[titles.copa]!=='champions'){places[titles.copa]='europaLeague';europa--;}
    for(const t of teams){if(!europa)break;if(!places[t]){places[t]='europaLeague';europa--;}}
    const conference=teams.find(t=>!places[t]);if(conference)places[conference]='conferenceLague';
    if(titles?.conferenceLague&&places[titles.conferenceLague]!=='champions')places[titles.conferenceLague]='europaLeague';
    for(const key of ['champions','europaLeague'])if(titles?.[key])places[titles[key]]='champions';
    return places;
}
function match(id,home,away,week,leg=1) {return {id,home,away,week,leg,played:false};}
function makeRound(c,phase,teams,seed,user,knownOpponent=null,entryByes=[]) {
    const index=c.key==='copa'?CUP_PHASES.indexOf(phase):EU_PHASES.indexOf(phase);
    const size=c.key==='copa'?64>>index:phase==='playoff'?16:phase==='round16'?16:phase==='quarterfinals'?8:phase==='semifinals'?4:2;
    const weeks=c.key==='copa'?COPA_WEEKS[index]:EU_WEEKS[index];
    const rng=random(hash(seed+'|'+c.key+'|'+phase));
    const selected=unique([user,knownOpponent,...shuffle(teams,rng)]).filter(t=>teams.includes(t)).slice(0,size);
    const slots=Array(size).fill(null), reserved=new Set();
    let rest=[...selected];
    if(user && rest.includes(user)){
        slots[0]=user;rest=rest.filter(t=>t!==user);
        if(entryByes.includes(user)){reserved.add(1);}else if(rest.length){const other=knownOpponent&&rest.includes(knownOpponent)?knownOpponent:rest.find(t=>!entryByes.includes(t));if(other){slots[1]=other;rest=rest.filter(t=>t!==other);}}
        // Ensure the controlled club has a real opponent in later rounds when possible.
        for(let n=2;n<size&&rest.length;n*=2){const index=rest.findIndex(t=>!entryByes.includes(t));if(index<0)break;slots[n]=rest.splice(index,1)[0];}
    }
    for(const t of entryByes.filter(t=>rest.includes(t))){
        let i=0;while(i<size&&(slots[i]||slots[i+1]||reserved.has(i)||reserved.has(i+1)))i+=2;
        if(i<size){slots[i]=t;reserved.add(i+1);rest=rest.filter(x=>x!==t);}
    }
    const free=shuffle(slots.map((_,i)=>i).filter(i=>!slots[i]&&!reserved.has(i)),rng);
    for(const t of rest){const i=free.shift();if(i!==undefined)slots[i]=t;}
    const ties=[];
    for(let i=0;i<size;i+=2){
        const a=slots[i],b=slots[i+1],id=c.key+'|'+phase+'|'+i/2;
        const tiesMatch=a&&b?weeks.map((week,j)=>match(id+'|'+(j+1),j===0?a:b,j===0?b:a,week,j+1)):[];
        ties.push({id,a,b,matches:tiesMatch,winner:!a?b:!b?a:null,bye:!a||!b});
    }
    return {phase,ties};
}
function resolveTie(tie) {
    if(tie.bye)return;
    const last=tie.matches.at(-1);
    if(!tie.matches.every(m=>m.played)){if(last?.played&&last.qualifiedTeam)tie.winner=last.qualifiedTeam;return;}
    if(last.qualifiedTeam){tie.winner=last.qualifiedTeam;return;}
    let a=0,b=0;
    for(const m of tie.matches){a+=m.home===tie.a?m.homeGoals:m.awayGoals;b+=m.home===tie.b?m.homeGoals:m.awayGoals;}
    if(a!==b)tie.winner=a>b?tie.a:tie.b;
    else if(last.penalties)tie.winner=last.penalties.home>last.penalties.away?last.home:last.away;
}
function addTable(c,m){
    if(m.tableApplied)return;
    const a=c.table[m.home],b=c.table[m.away];if(!a||!b)throw new Error('Participante europeo desconocido.');
    a.pj++;b.pj++;a.gf+=m.homeGoals;a.gc+=m.awayGoals;b.gf+=m.awayGoals;b.gc+=m.homeGoals;
    if(m.homeGoals>m.awayGoals){a.g++;b.p++;a.pts+=3;}else if(m.homeGoals<m.awayGoals){b.g++;a.p++;b.pts+=3;}else{a.e++;b.e++;a.pts++;b.pts++;}
    m.tableApplied=true;
}
function scheduleLeague(teams,days,seed,user,oldCalendar){
    const ring=shuffle(teams,random(hash(seed))),rounds=[];
    for(let md=1;md<=days;md++){
        const fixtures=[];
        for(let i=0;i<ring.length/2;i++){
            const a=ring[i],b=ring[ring.length-1-i];fixtures.push(match('league|'+md+'|'+i,md%2?a:b,md%2?b:a,(days===6?[4,6,9,11,14,16]:[4,6,9,11,14,17,20,23])[md-1]));
        }
        const old=oldCalendar.find(m=>m.isGroup&&m.matchday===md);
        if(user && old?.opponent && teams.includes(old.opponent)){
            const mine=fixtures.find(m=>m.home===user||m.away===user),rival=mine.home===user?mine.away:mine.home;
            if(rival!==old.opponent){
                const other=fixtures.find(m=>m.home===old.opponent||m.away===old.opponent);
                if(other){if(other.home===old.opponent)other.home=rival;else other.away=rival;if(mine.home===user)mine.away=old.opponent;else mine.home=old.opponent;}
            }
            if((mine.home===user)!==!!old.isHome)[mine.home,mine.away]=[mine.away,mine.home];
        }
        rounds.push({md,fixtures});ring.splice(1,0,ring.pop());
    }
    // Orient an Euler tour of the even-degree fixture graph: every club gets
    // exactly half its league-phase games at home in a newly created season.
    const fixtures=rounds.flatMap(d=>d.fixtures),adj=new Map(teams.map(t=>[t,[]])),used=new Set();
    fixtures.forEach((m,i)=>{adj.get(m.home).push([i,m.away]);adj.get(m.away).push([i,m.home]);});
    for(const start of teams){
        const stack=[start];
        while(stack.length){const team=stack.at(-1),edges=adj.get(team);let edge;
            while(edges.length&&!edge){const candidate=edges.pop();if(!used.has(candidate[0]))edge=candidate;}
            if(!edge){stack.pop();continue;}used.add(edge[0]);fixtures[edge[0]].home=team;fixtures[edge[0]].away=edge[1];stack.push(edge[1]);
        }
    }
    for(const day of rounds){const old=oldCalendar.find(m=>m.isGroup&&m.matchday===day.md);if(!user||!old)continue;
        const mine=day.fixtures.find(m=>m.home===user||m.away===user);
        if((mine.home===user)!==!!old.isHome)[mine.home,mine.away]=[mine.away,mine.home];
    }
    return rounds;
}
function findHistory(comp,calendar,key){
    const played=calendar.filter(m=>m.type===key&&m.played&&m.result).map(m=>({...m,result:copy(m.result)}));
    if(key==='copa')for(const r of comp.copaResults||[]){
        const phase=ALIASES[r.phase]||r.phase,leg=r.leg||1;
        if(!played.some(m=>phaseOf(m)===phase&&legOf(m)===leg))played.push({id:phase+(leg===2?'_2':'_1'),type:key,phase,leg,isHome:leg===2||phase!=='copa_sf',isFinal:phase==='copa_final',opponent:r.opponent||r.rival,result:{...r,qualified:leg===1&&phase==='copa_sf'?undefined:r.qualified??r.advanced??r.win}});
    }
    return played;
}
function applyResult(c,m,result,user,league=false){
    if(m.played)return false;
    const home=m.home===user;
    Object.assign(m,{played:true,source:'player',homeGoals:home?result.myGoals:result.oppGoals,awayGoals:home?result.oppGoals:result.myGoals});
    if(result.extraTime)m.extraTime=copy(result.extraTime);
    if(result.penalties)m.penalties={home:home?result.penalties.my:result.penalties.opp,away:home?result.penalties.opp:result.penalties.my};
    const decision=result.qualified;
    if(typeof decision==='boolean')m.qualifiedTeam=decision?user:home?m.away:m.home;
    if(league)addTable(c,m);
    return true;
}
function initialKnockout(c,phase,pool,seed,user,history,calendar){
    const at=history.filter(m=>phaseOf(m)===phase);
    const known=at[0]?.opponent||calendar.find(m=>phaseOf(m)===phase&&!m.eliminated)?.opponent;
    const defeated=new Set(history.filter(m=>(m.result.qualified??m.result.win)&&phaseOf(m)!==phase).map(m=>m.opponent));
    const teams=unique([user,known,...pool]).filter(t=>t&&!defeated.has(t));
    const round=makeRound(c,phase,teams,seed,user,known);
    for(const old of at){
        const tie=round.ties.find(t=>t.a===user||t.b===user);if(!tie)continue;
        const fixture=tie.matches[legOf(old)-1];if(!fixture)continue;
        // Keep the saved local/visitor orientation and its aggregate exactly.
        if((fixture.home===user)!==!!old.isHome)[fixture.home,fixture.away]=[fixture.away,fixture.home];
        if(legOf(old)===1&&tie.matches.length===2&&!tie.matches[1].played){tie.matches[1].home=fixture.away;tie.matches[1].away=fixture.home;}
        const result={...old.result};
        if(fixture===tie.matches.at(-1)&&result.qualified===undefined)result.qualified=result.win;
        applyResult(c,fixture,result,user);resolveTie(tie);
    }
    c.rounds=[round];c.historyPartial=true;
}
export function createCompetitionSeason(options) {
    const {season,team,comp={},calendar=[],field=null,leagues={},pools={},ratings={},seed=Math.floor(Math.random()*0xffffffff)}=options;
    const model={version:1,revision:1,season,seed,controlledTeam:team,controlledKeys:[...(comp.copaQualified?['copa']:[]),...(comp.europeanComp?[comp.europeanComp]:[])],ratings:{...ratings},competitions:{}};
    const copaPool=unique([...(leagues.primera||[]),...(leagues.segunda||[]),...(leagues.rfef_grupo1||[]).slice(0,5),...(leagues.rfef_grupo2||[]).slice(0,5)]);
    if(comp.copaQualified&&!copaPool.includes(team))copaPool.push(team);
    const copa={key:'copa',participants:copaPool,rounds:[],champion:null,historyPartial:(options.week||0)>1};
    const history=findHistory(comp,calendar,'copa');
    const terminal=['eliminated','champion','winner'].includes(comp.copaPhase);
    const current=terminal?history.at(-1)&&phaseOf(history.at(-1)):ALIASES[comp.copaPhase]||comp.copaPhase;
    if(history.length || current&& !['copa_r1','copa_r32'].includes(current)){
        initialKnockout(copa,CUP_PHASES.includes(current)?current:'copa_r32',copaPool,seed,comp.copaQualified?team:null,history,calendar);
    }else{
        const byes=['FC Barcelona','Real Madrid CF','Atlético de Madrid','Athletic Club'].filter(t=>copaPool.includes(t));
        if(comp.copaQualified&&['round32','copa_r32'].includes(comp.copaPhase)&&!byes.includes(team))byes.push(team);
        copa.rounds=[makeRound(copa,'copa_r1',copaPool,seed,comp.copaQualified?team:null,null,byes)];
    }
    if(terminal&&!history.length){
        copa.historyPartial=true;
        if(comp.copaPhase!=='eliminated'){copa.champion=team;copa.rounds=[];}
        else {copa.participants=copaPool.filter(t=>t!==team);copa.rounds=[makeRound(copa,'copa_r32',copa.participants,seed,null)];}
    }
    model.competitions.copa=copa;
    const keys=['champions','europaLeague','conferenceLague'];
    const allocation=comp.europeanComp?[comp.europeanComp,...keys.filter(k=>k!==comp.europeanComp)]:keys;
    const used=new Set();
    const domestic=options.domesticEurope||{};
    for(const key of allocation){
        const controlled=comp.europeanComp===key?team:null;
        const existing=controlled&&field?.table?Object.keys(field.table):[];
        const qualified=Object.entries(domestic).filter(([,k])=>k===key).map(([t])=>t);
        const candidates=unique([...existing,controlled,...qualified,...(pools[key]||[]),...RESERVES]).filter(t=>t&&!used.has(t)&&(t!==team||!!controlled)&&(existing.includes(t)||!domestic[t]||domestic[t]===key));
        const participants=candidates.slice(0,36);if(participants.length!==36)throw new Error('Faltan clubes para la competición europea.');
        participants.forEach(t=>used.add(t));
        participants.forEach(t=>{if(!model.ratings[t])model.ratings[t]={champions:76,europaLeague:71,conferenceLague:64}[key];});
        const c={key,participants,table:Object.fromEntries(participants.map(t=>[t,row(t)])),league:[],rounds:[],champion:null,historyPartial:(options.week||0)>1};
        c.league=scheduleLeague(participants,key==='conferenceLague'?6:8,seed+'|'+key,controlled,controlled?calendar:[]);
        const past=controlled?findHistory(comp,calendar,key):[];
        const phase=comp.europeanPhase;
        const doneGroups=controlled?Math.max(0,...(comp.europeanResults||[]).map(r=>r.md||0),...past.filter(m=>m.isGroup).map(m=>m.matchday||0)):0;
        if(controlled&&field?.table&&doneGroups){
            c.historyPartial=true;
            for(const t of participants){const old=field.table[t];if(old)c.table[t]={...row(t),...copy(old),name:t};}
            for(const day of c.league.filter(d=>d.md<=doneGroups))for(const m of day.fixtures){m.played=true;m.legacySummary=true;m.tableApplied=true;}
        }
        const knock=past.filter(m=>m.isKnockout||m.isPlayoff||EU_PHASES.includes(phaseOf(m)));
        if(controlled&&phase&&phase!=='groups'){
            const last=knock.at(-1),start=['eliminated','champion','winner'].includes(phase)?last&&phaseOf(last):phase;
            if(EU_PHASES.includes(start)){
                for(const day of c.league)for(const m of day.fixtures){if(!m.played){m.played=true;m.legacySummary=true;m.tableApplied=true;}}
                const ranking=sortTable(c.table).map(r=>r.name);
                c.directSeeds=start==='playoff'?ranking.filter(t=>t!==team).slice(0,8):[];
                initialKnockout(c,start,ranking.filter(t=>!c.directSeeds.includes(t)),seed,controlled,knock,calendar);
            }else if(['champion','winner'].includes(phase)){c.champion=team;c.historyPartial=true;}
            else if(phase==='eliminated'){
                c.historyPartial=true;
                for(const day of c.league)for(const m of day.fixtures){m.played=true;m.legacySummary=true;m.tableApplied=true;}
                // No user result is invented when only an elimination flag survives.
                const ranking=sortTable(c.table).map(r=>r.name).filter(t=>t!==team);
                c.directSeeds=ranking.slice(0,8);
                c.rounds=[makeRound(c,'playoff',ranking.slice(8,24),seed,null)];
            }
        }
        model.competitions[key]=c;
    }
    return model;
}
function createNextRound(model,c){
    const previous=c.rounds.at(-1);
    if(!previous){
        if(c.key==='copa'||!c.league.every(d=>d.fixtures.every(m=>m.played)))return false;
        const ranking=sortTable(c.table).map(r=>r.name);c.directSeeds=ranking.slice(0,8);
        c.rounds.push(makeRound(c,'playoff',ranking.slice(8,24),model.seed,model.controlledTeam));model.revision++;return true;
    }
    if(!previous.ties.every(t=>t.winner||t.bye))return false;
    const order=c.key==='copa'?CUP_PHASES:EU_PHASES,index=order.indexOf(previous.phase);
    const winners=previous.ties.map(t=>t.winner).filter(Boolean);
    if(index===order.length-1){c.champion=winners[0]||null;c.completed=true;return false;}
    const teams=previous.phase==='playoff'?unique([...(c.directSeeds||[]),...winners]):winners;
    c.rounds.push(makeRound(c,order[index+1],teams,model.seed,model.controlledTeam));model.revision++;return true;
}
function penalties(rng){let a=0,b=0;for(let n=0;n<5;n++){a+=rng()<.76?1:0;b+=rng()<.76?1:0;}for(let n=0;n<20&&a===b;n++){a+=rng()<.76?1:0;b+=rng()<.76?1:0;}if(a===b)a++;return {home:a,away:b};}
function playAI(model,c,m,tie,simulate){
    const rng=random(hash(model.seed+'|'+c.key+'|'+m.id));
    const params={teamName:m.home,opponentName:m.away,teamOverall:model.ratings[m.home]||70,opponentOverall:model.ratings[m.away]||70,neutral:tie?.matches.length===1&&['final','copa_final'].includes(c.rounds.at(-1).phase),rng};
    const r=simulate(params);Object.assign(m,{played:true,source:'simulation',homeGoals:r.teamGoals,awayGoals:r.opponentGoals});
    model.revision++;
    if(!tie){addTable(c,m);return;}
    if(m===tie.matches.at(-1)){
        const total=()=>tie.matches.reduce((out,f)=>{out[0]+=f.home===tie.a?f.homeGoals:f.awayGoals;out[1]+=f.home===tie.b?f.homeGoals:f.awayGoals;return out;},[0,0]);
        let [a,b]=total();
        if(a===b){const extra=simulate({...params,duration:30});m.homeGoals+=extra.teamGoals;m.awayGoals+=extra.opponentGoals;m.extraTime={home:extra.teamGoals,away:extra.opponentGoals};[a,b]=total();}
        if(a===b)m.penalties=penalties(rng);
    }
    resolveTie(tie);
}
export function advanceCompetitionSeason(model,week,simulate){
    for(const c of Object.values(model.competitions)){
        if(c.champion)continue;
        const controlled=model.controlledKeys.includes(c.key)?model.controlledTeam:null;
        for(const day of c.league||[])for(const m of day.fixtures){
            if(!m.played&&m.week<=week&&m.home!==controlled&&m.away!==controlled)playAI(model,c,m,null,simulate);
        }
        for(let step=0;step<8&&!c.champion;step++){
            if(!c.rounds.length&&!createNextRound(model,c))break;
            const round=c.rounds.at(-1);
            for(const tie of round.ties)for(const m of tie.winner?[]:tie.matches){
                if(m.played||m.week>week||m.home===controlled||m.away===controlled)continue;
                if(m.leg===2&&!tie.matches[0].played)continue;
                playAI(model,c,m,tie,simulate);
            }
            if(!createNextRound(model,c))break;
        }
    }
    return model;
}
export function userCompetitionFixture(model,descriptor){
    if(!model.controlledKeys.includes(descriptor.type))return null;
    const c=model.competitions[descriptor.type];if(!c)return null;
    let fixture,tie;
    if(descriptor.isGroup){fixture=c.league?.find(d=>d.md===descriptor.matchday)?.fixtures.find(m=>m.home===model.controlledTeam||m.away===model.controlledTeam);}
    else {
        const round=c.rounds.find(r=>r.phase===phaseOf(descriptor));
        tie=round?.ties.find(t=>t.a===model.controlledTeam||t.b===model.controlledTeam);
        if(tie?.bye)return {bye:true,phase:round.phase};
        fixture=tie?.matches[legOf(descriptor)-1];
    }
    if(!fixture)return null;
    return {id:fixture.id,opponent:fixture.home===model.controlledTeam?fixture.away:fixture.home,isHome:fixture.home===model.controlledTeam,
        neutral:!!tie&&['final','copa_final'].includes(phaseOf(descriptor)),fixture};
}
export function recordCompetitionResult(model,descriptor,result){
    const binding=userCompetitionFixture(model,descriptor);if(!binding||binding.bye)return {recorded:false};
    const c=model.competitions[descriptor.type];
    const recorded=applyResult(c,binding.fixture,result,model.controlledTeam,!!descriptor.isGroup);
    if(recorded)model.revision++;
    if(!descriptor.isGroup){const tie=c.rounds.find(r=>r.phase===phaseOf(descriptor))?.ties.find(t=>t.matches.includes(binding.fixture));if(tie)resolveTie(tie);}
    return {recorded,duplicate:!recorded};
}
export function competitionChampions(model){
    const out={season:model.season,finals:{},historyPartial:{}};
    for(const [key,c]of Object.entries(model.competitions)){
        out[key]=c.champion||null;out.historyPartial[key]=!!c.historyPartial;
        const final=c.rounds.find(r=>r.phase===(key==='copa'?'copa_final':'final'))?.ties[0];
        if(final?.matches[0]?.played)out.finals[key]=copy(final.matches[0]);
    }
    return out;
}
export function competitionLeagueField(model,key){
    const c=model.competitions[key];if(!c?.table)return null;
    return {team:model.controlledTeam,compType:key,table:Object.fromEntries(Object.entries(c.table).map(([name,r])=>[name,{...copy(r),isPlayer:name===model.controlledTeam}])),rivals:c.participants.filter(t=>t!==model.controlledTeam),
        myOpponents:c.league.map(d=>d.fixtures.find(m=>m.home===model.controlledTeam||m.away===model.controlledTeam)).filter(Boolean).map(m=>m.home===model.controlledTeam?m.away:m.home)};
}
