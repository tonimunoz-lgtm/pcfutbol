// Pure football simulation. No DOM, storage, clock or mutation of caller rosters.
import { FORMATIONS } from './config.js';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const value = (p, a) => Number.isFinite(Number(p[a])) ? Number(p[a]) : (Number(p.overall) || 50);
const layout = f => (FORMATIONS[f] || FORMATIONS['433']).layout;
const available = p => p && !p.isInjured && !p.isSuspended && p.contractType !== 'loaned_out';
const group = pos => pos === 'POR' ? 'keeper' : ['LI','LD','DFC'].includes(pos) ? 'defense' : ['DC','EXT'].includes(pos) ? 'attack' : 'midfield';
const compatible = (p, pos) => p.position === pos ? 1 : group(p.position) === group(pos) ? .86 : p.position === 'POR' || pos === 'POR' ? .22 : .64;
const average = (xs, fallback = 0) => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : fallback;
const copy = x => JSON.parse(JSON.stringify(x));
export function syntheticLineup(rating = 50, team = 'Equipo', formation = '433') {
    return layout(formation).map((s,i)=>({name:`${team} ${s.pos} ${i+1}`,position:s.pos,overall:rating,
        AT:rating,DF:rating,EF:rating,VE:rating,AG:rating,CA:rating,RE:rating,MO:rating,EN:rating,form:75,condition:100}));
}
function choose(xs, weight, rng) {
    if (!xs.length) return null;
    let r = rng() * xs.reduce((n,p)=>n+Math.max(.01,weight(p)),0);
    return xs.find(p=>(r-=Math.max(.01,weight(p)))<0) || xs[xs.length-1];
}
function makeSide(p, prefix, index) {
    const formation = p[prefix+'Formation'] || '433';
    const team = p[prefix+'Name'] || (index === 0 ? p.homeTeamName : p.awayTeamName) || `Equipo ${index+1}`;
    const supplied = p[prefix+'Lineup'];
    const lineup = Array.isArray(supplied) ? supplied : syntheticLineup(p[prefix+'Overall'] ?? 50,team,formation);
    const used = new Set();
    const records = [];
    const register = (player,slot,active) => {
        if (!available(player) || used.has(player.name)) return null;
        used.add(player.name);
        const r={...player,slot,active,entered:active,minutes:0,matchGoals:0,matchAssists:0,matchConceded:0,
            fitness:clamp(Number(player.condition ?? 100),1,100),matchYellow:0,removed:false};
        records.push(r); return r;
    };
    const active = layout(formation).map((_,i)=>register(lineup[i],i,true));
    const bench = (p[prefix+'Bench'] || []).map(x=>register(x,-1,false)).filter(Boolean).slice(0,9);
    return {team,formation,mentality:p[prefix+'Mentality']||'balanced',press:p[prefix+'Press']||'medium',
        instruction:p[prefix+'Instruction']||'none',plan:p[prefix+'Plan']||'hold',
        form:Number(p[prefix+'Form'] ?? 75),attackMod:p[prefix+'AttackMod']||1,defenseMod:p[prefix+'DefenseMod']||1,
        autoSubs:p.autoSubs!==false && p[prefix+'AutoSubs']!==false,coachLevel:Number.isFinite(Number(p[prefix+'CoachLevel']))?Number(p[prefix+'CoachLevel']):3,changes:0,active,bench,records,goals:0,
        shots:0,onTarget:0,corners:0,fouls:0,offsides:0,passes:0,completed:0,saves:0,control:0,xg:0};
}
function skill(player, attrs) {
    return .45*(Number(player.overall)||average(attrs.map(a=>value(player,a))))+.55*average(attrs.map(a=>value(player,a)));
}
export function lineStrength(side) {
    const slots=layout(side.formation), totals={keeper:[],defense:[],midfield:[],attack:[]};
    side.active.forEach((p,i)=>{
        const role=slots[i]?.pos || p?.position || 'MC', g=group(role);
        if(!p){totals[g].push(0);return;}
        const fit=.62+.38*p.fitness/100;
        const form=clamp(.90+side.form/750,.9,1.035);
        const factor=fit*form*compatible(p,role);
        const attrs=g==='keeper'?['DF','AG','RE']:g==='defense'?['DF','CA','RE','VE']:g==='midfield'?['AT','MO','RE','AG']:['AT','EF','VE','AG'];
        totals[g].push(skill(p,attrs)*factor);
    });
    const out=Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,average(v)]));
    // Midfield/defense help build attacks; attacks start defending too.
    out.creation=.62*out.midfield+.38*out.attack;
    out.resistance=.77*out.defense+.23*out.midfield;
    out.count=side.active.filter(Boolean).length;
    return out;
}
function tactics(a,b,la,lb) {
    let attack=1,defense=1,control=1;
    if(a.mentality==='offensive'){attack*=1.14;defense*=.89;control*=1.03;}
    if(a.mentality==='defensive'){attack*=.84;defense*=1.13;control*=.94;}
    if(a.formation==='433'){attack*=1.04;defense*=.98;}
    if(a.formation==='352'){control*=1.07;defense*=.95;}
    if(a.formation==='541'){defense*=1.08;attack*=.91;}
    if(a.formation==='451'){control*=1.04;attack*=.96;}
    if(a.press==='high'){
        const endurance=average(a.active.filter(Boolean).map(p=>value(p,'RE')));
        control*=1.035+(endurance-60)/1500;defense*=.97;
        attack*=1.02;
    }else if(a.press==='low'){defense*=1.07;attack*=.94;control*=.93;}
    const field=a.active.filter(p=>p&&p.position!=='POR');
    if(a.instruction==='counter'){
        const speed=average(field.map(p=>value(p,'VE')));
        attack*=clamp(.92+(speed-55)*.002+(b.mentality==='offensive'?.12:0)+(b.press==='high'?.05:0),.88,1.16);
        control*=.90;
    } else if(a.instruction==='possession'){
        const technique=average(field.map(p=>average([value(p,'AG'),value(p,'MO')])));
        control*=clamp(1+(technique-50)*.002,.94,1.10);attack*=.97;
    } else if(a.instruction==='direct'){
        const aerial=average(field.filter(p=>['DC','EXT'].includes(p.position)).map(p=>value(p,'CA')),50);
        attack*=clamp(.95+(aerial-50)*.002,.91,1.08);control*=.94;
    } else if(a.instruction==='setpieces'){attack*=1.01;control*=.97;}
    return {attack:attack*a.attackMod,defense:defense*a.defenseMod,control};
}
// k < 1 amortigua la diferencia de nivel entre los equipos (en los derbis el favorito lo tiene menos fácil)
function shotModel(a,b,la,lb,ta,tb,home,k=1) {
    const manpower=Math.pow(Math.max(.1,la.count/11),1.25);
    const shots=clamp(11.5*Math.exp(((la.creation-lb.resistance)*.015+(la.midfield-lb.midfield)*.008)*k)
        *ta.attack/tb.defense*manpower*home,1,32);
    const quality=clamp(.112*Math.exp((la.attack-lb.defense)*.007*k),.035,.25);
    return {shots,quality};
}
// Cambios por fatiga según el nivel del segundo entrenador (la IA usa el nivel 3 de siempre).
const FATIGUE_WINDOWS={1:[82],2:[72,82],3:[62,72,82],4:[60,70,80],5:[55,65,75,85]};
const FATIGUE_LIMIT={1:80,2:84,3:88,4:90,5:92};
const SUB_SLIP={1:.30,2:.15};
function substitute(side,slot,minute,timeline,reason,rng=Math.random) {
    if(!side.autoSubs || side.changes>=5)return false;
    // Las sustituciones forzadas (lesión, portero expulsado) las hace cualquiera; las tácticas, solo con segundo entrenador.
    if(reason==='fatiga' && side.coachLevel<1)return false;
    const off=side.active[slot],pos=layout(side.formation)[slot]?.pos||off?.position||'MC';
    const candidates=side.bench.filter(p=>!p.removed && p.fitness>35 && (pos==='POR'?p.position==='POR':p.position!=='POR'));
    const ranked=candidates.sort((a,b)=>(skill(b,['RE','AT','DF'])*compatible(b,pos)*(.62+.38*b.fitness/100))-(skill(a,['RE','AT','DF'])*compatible(a,pos)*(.62+.38*a.fitness/100)));
    // Un segundo entrenador de poco nivel a veces elige al segundo mejor
    const on=(reason==='fatiga' && ranked.length>1 && rng()<(SUB_SLIP[side.coachLevel]||0))?ranked[1]:ranked[0];
    if(!on)return false;
    if(off){off.active=false;off.removed=true;}
    on.active=true;on.entered=true;on.slot=slot;side.active[slot]=on;side.bench=side.bench.filter(p=>p!==on);side.changes++;
    timeline.push({type:'substitution',team:side.team,minute,off:off?.name||'',on:on.name,reason});return true;
}
function dismiss(side,p,minute,timeline,secondYellow=false) {
    p.active=false;p.removed=true;side.active[p.slot]=null;
    timeline.push({type:'red',team:side.team,player:p.name,minute,secondYellow,suspension:2});
    if(p.position==='POR'){
        const sacrifice=side.active.map((x,i)=>({p:x,i})).reverse().find(x=>x.p&&x.p.position!=='POR');
        if(sacrifice && side.changes<5 && side.bench.some(x=>x.position==='POR')){
            const oldSlot=p.slot;const off=sacrifice.p;side.active[sacrifice.i]=null;side.active[oldSlot]=off;
            substitute(side,oldSlot,minute,timeline,'portero expulsado');
        }
    }
}
function injury(side,p,minute,timeline,rng) {
    const weeks=rng()<.85?1+Math.floor(rng()*3):4+Math.floor(rng()*5);
    timeline.push({type:'injury',team:side.team,player:p.name,minute,weeks,typeLabel:'Lesión muscular',injuryType:'Lesión muscular'});
    if(!substitute(side,p.slot,minute,timeline,'lesión')){p.active=false;p.removed=true;side.active[p.slot]=null;}
}
const previewCache=new Map();
export function simulateFootballMatch(params = {}) {
    if(params.preview){
        const key=JSON.stringify(params);if(previewCache.has(key))return copy(previewCache.get(key));
        let seed=2166136261;for(let i=0;i<key.length;i++)seed=Math.imul(seed^key.charCodeAt(i),16777619)>>>0;
        const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
        let win=0,draw=0,loss=0,x=0,y=0;
        for(let i=0;i<160;i++){
            const r=simulateFootballMatch({...params,preview:false,rng});
            if(r.teamGoals>r.opponentGoals)win++;else if(r.teamGoals===r.opponentGoals)draw++;else loss++;
            x+=r.teamXG;y+=r.opponentXG;
        }
        const r={teamGoals:0,opponentGoals:0,teamXG:x/160,opponentXG:y/160,probabilities:{win:win/160,draw:draw/160,loss:loss/160},estimated:true};
        if(previewCache.size>=8)previewCache.delete(previewCache.keys().next().value);previewCache.set(key,r);return copy(r);
    }
    const rng=params.rng||Math.random;
    const state=params.resume?copy(params.resume):{sides:[makeSide(params,'team',0),makeSide(params,'opponent',1)],timeline:[],minute:0};
    if (params.resume) for (const s of state.sides) {
        const byName=new Map(s.records.map(p=>[p.name,p]));
        s.active=s.active.map(p=>p?byName.get(p.name):null);
        s.bench=s.bench.map(p=>byName.get(p.name));
    }
    const [a,b]=state.sides,timeline=state.timeline;
    const duration=clamp(Number(params.duration||90),1,120),end=state.minute+duration;
    const initialLines=state.sides.map(lineStrength);
    for(let minute=state.minute+1;minute<=end;minute++){
        for(const [index,s] of state.sides.entries()){
            const other=state.sides[1-index];
            if(minute===60 && s.plan!=='hold' && (s.plan==='attack' || s.goals<other.goals)){
                s.mentality='offensive';timeline.push({type:'tactic',team:s.team,minute,mentality:s.mentality});
            }
            if(minute===75 && s.plan==='protect' && s.goals>other.goals){s.mentality='defensive';timeline.push({type:'tactic',team:s.team,minute,mentality:s.mentality});}
            for(const forced of (params.scheduledEvents||[]).filter(e=>e.minute===minute&&e.side===index)){
                const p=s.active[forced.slot||0];if(!p)continue;
                if(forced.type==='red')dismiss(s,p,minute,timeline);
                if(forced.type==='injury')injury(s,p,minute,timeline,rng);
            }
            if(!params.disableDiscipline && rng()<.14*(s.press==='high'?1.18:1)*(1+.15*(params.derby||0))){   // derbi: más faltas
                s.fouls++;
                // Un jugador ya amonestado juega con más cuidado (calibrado: ≈0,13 rojas y ≈4,7 amarillas por partido).
                const offender=choose(s.active.filter(Boolean),p=>(['DFC','MC'].includes(p.position)?2:1)*(p.matchYellow>=1?.18:1),rng);
                if(offender){
                    const draw=rng();
                    if(draw<.0012)dismiss(s,offender,minute,timeline);
                    else if(draw<.19){
                        offender.matchYellow++;timeline.push({type:'yellow',team:s.team,player:offender.name,minute});
                        if(offender.matchYellow>=2)dismiss(s,offender,minute,timeline,true);
                    }
                }
            }
            if(!params.disableInjuries && rng()<.0023*(s.press==='high'?1.3:1)*(params[(index===0?'team':'opponent')+'InjuryRisk']||1)*(1+Math.max(0,80-average(s.active.filter(Boolean).map(p=>p.fitness),80))/50)){
                const hurt=choose(s.active.filter(Boolean),p=>1+(100-p.fitness)/35,rng);
                if(hurt)injury(s,hurt,minute,timeline,rng);
            }
            if((FATIGUE_WINDOWS[s.coachLevel]||[]).includes(minute)){
                const tired=s.active.map((p,i)=>({p,i})).filter(x=>x.p&&x.p.position!=='POR').sort((x,y)=>x.p.fitness-y.p.fitness)[0];
                if(tired&&tired.p.fitness<(FATIGUE_LIMIT[s.coachLevel]||88))substitute(s,tired.i,minute,timeline,'fatiga',rng);
            }
        }
        const lines=state.sides.map(lineStrength),ta=tactics(a,b,lines[0],lines[1]),tb=tactics(b,a,lines[1],lines[0]);
        const control=clamp(1/(1+Math.exp(-((lines[0].midfield*ta.control-lines[1].midfield*tb.control)/22))),.18,.82);
        a.control+=control;b.control+=1-control;
        for(const [i,s] of state.sides.entries()){
            const o=state.sides[1-i],t=i===0?ta:tb,ot=i===0?tb:ta;
            const home=params.neutral?1:((i===0)===(params.isHome!==false)?1.10:.90);
            const model=shotModel(s,o,lines[i],lines[1-i],t,ot,home,1-.1*(params.derby||0));
            const chances=Math.floor(model.shots/90)+(rng()<(model.shots/90)%1?1:0);
            for(let c=0;c<chances;c++){
                const shooter=choose(s.active.filter(p=>p&&p.position!=='POR'),p=>({DC:7,EXT:5,MCO:3,MC:1.5}[p.position]||.5)*(value(p,'EF')+20),rng);
                if(!shooter)continue;
                s.shots++;
                const corner=rng()<.32,quality=clamp(model.quality*(corner&&s.instruction==='setpieces'?1.20:1),.025,.35);
                if(corner)s.corners++;
                s.xg+=quality;
                const target=clamp(.35+(value(shooter,'EF')-60)*.002,.24,.48);
                let shotType='offTarget';
                if(rng()<target){
                    s.onTarget++;
                    const conversion=clamp(quality/target*Math.exp((value(shooter,'EF')-lines[1-i].keeper)*.009),.04,.90);
                    if(rng()<conversion){
                        s.goals++;shooter.matchGoals++;shotType='goal';
                        const assist=choose(s.active.filter(p=>p&&p!==shooter&&p.position!=='POR'),p=>['MC','MCO','EXT','MI','MD'].includes(p.position)?3:1,rng);
                        if(assist)assist.matchAssists++;
                        timeline.push({type:'goal',team:s.team,name:shooter.name,player:shooter.name,minute,assist:assist?.name||null,xg:quality});
                        const keeper=o.active.find(p=>p&&layout(o.formation)[p.slot]?.pos==='POR');if(keeper)keeper.matchConceded++;
                    }else{o.saves++;shotType='saved';}
                }
                timeline.push({type:'shot',team:s.team,player:shooter.name,minute,outcome:shotType,xg:quality});
            }
            const possession=i===0?control:1-control;
            const passes=Math.round(8.0*possession*(s.instruction==='direct'?.80:1));s.passes+=passes;
            const acc=clamp(.73+(lines[i].midfield-50)*.002,.60,.91);
            for(let k=0;k<passes;k++)if(rng()<acc)s.completed++;
            if(rng()<.018 && s.active.some(p=>p&&['DC','EXT'].includes(p.position)))s.offsides++;
            for(const player of s.active.filter(Boolean)){
                player.minutes++;
                const work=player.position==='POR'?.065:(.22+(100-value(player,'RE'))*.0015+(s.press==='high'?.105:s.press==='low'?-.025:0));
                player.fitness=clamp(player.fitness-work,1,100);
            }
        }
    }
    state.minute=end;
    const pair=key=>state.sides.map(s=>s[key]);
    const stats={possession:[Math.round(a.control/end*100),0],shots:pair('shots'),shotsOnTarget:pair('onTarget'),
        corners:pair('corners'),fouls:pair('fouls'),offsides:pair('offsides'),passes:pair('passes'),
        passAccuracy:state.sides.map(s=>s.passes?Math.round(s.completed/s.passes*100):0),saves:pair('saves'),
        yellowCards:state.sides.map(s=>timeline.filter(e=>e.team===s.team&&e.type==='yellow').length),
        redCards:state.sides.map(s=>timeline.filter(e=>e.team===s.team&&e.type==='red').length)};
    stats.possession[1]=100-stats.possession[0];
    return {engineVersion:2,teamGoals:a.goals,opponentGoals:b.goals,teamXG:+a.xg.toFixed(2),opponentXG:+b.xg.toFixed(2),
        goals:timeline.filter(e=>e.type==='goal'),cards:timeline.filter(e=>e.type==='yellow'||e.type==='red'),
        injuries:timeline.filter(e=>e.type==='injury'),substitutions:timeline.filter(e=>e.type==='substitution'),
        timeline,stats,initialLines,finalLines:state.sides.map(lineStrength),
        players:state.sides.map(s=>s.records.map(p=>({name:p.name,entered:p.entered,minutes:p.minutes,condition:+p.fitness.toFixed(1),goals:p.matchGoals,assists:p.matchAssists,conceded:p.matchConceded,position:p.position}))),
        matchState:state};
}
