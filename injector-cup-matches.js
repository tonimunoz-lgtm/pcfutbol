// ============================================================
// injector-cup-matches.js  v3.0
//
// FORMATO REAL UEFA 2025-26:
//
// CHAMPIONS LEAGUE:
//   Fase liga: 36 equipos, 8 jornadas (4 casa, 4 fuera)
//   Top 8  → Octavos directos
//   9-24   → Play-off (ida/vuelta) → Octavos
//   25-36  → Eliminados
//   Octavos, Cuartos, Semis, Final: ida+vuelta (menos final)
//
// EUROPA LEAGUE:
//   Igual: 36 equipos, 8 jornadas
//   Top 8 → Octavos · 9-24 → Play-off (feb) · 25-36 → Elim.
//
// CONFERENCE LEAGUE:
//   36 equipos, 6 jornadas (3 casa, 3 fuera)
//   Mismo corte: 8 directos, 9-24 play-off, 25+ eliminados
//
// FIXES v3.0:
//   1. Solo genera partidos si el equipo está clasificado
//      (europeanComp en comps_v2 debe ser no-null)
//   2. El resto del grupo (otros 35 equipos) simula sus
//      partidos cada jornada — clasificación realista
//   3. Formato real: fase liga (no grupos), play-off previo
//      a octavos, ida+vuelta en eliminatorias
//   4. Ingresos de taquilla en partidos en casa
//   5. Copa del Rey solo para equipos clasificados
// ============================================================

console.log('🏆 injector-cup-matches.js v3.0 cargando...');

// ============================================================
// CONFIGURACIÓN VISUAL POR COMPETICIÓN
// ============================================================
const CUP_CONFIG = {
    champions: {
        name: 'UEFA Champions League', shortName: 'Champions League',
        emoji: '⭐', color: '#1E5AC8', accentColor: '#4a9eff',
        gradient: 'linear-gradient(135deg,#0a0a2e 0%,#1a1a5e 50%,#0d3b8c 100%)'
    },
    europaLeague: {
        name: 'UEFA Europa League', shortName: 'Europa League',
        emoji: '🟠', color: '#FF8C00', accentColor: '#ffaa33',
        gradient: 'linear-gradient(135deg,#1a0d00 0%,#3d1f00 50%,#7a3d00 100%)'
    },
    conferenceLeague: {
        name: 'UEFA Conference League', shortName: 'Conference League',
        emoji: '🟢', color: '#00B464', accentColor: '#00d478',
        gradient: 'linear-gradient(135deg,#001a0d 0%,#003d1f 50%,#007a3d 100%)'
    },
    copa: {
        name: 'Copa del Rey', shortName: 'Copa del Rey',
        emoji: '🥇', color: '#FFD700', accentColor: '#FFD700',
        gradient: 'linear-gradient(135deg,#1a1500 0%,#3d3000 50%,#7a6000 100%)'
    }
};
// Alias para compat con typo de injector-competitions.js
CUP_CONFIG['conferenceLague'] = CUP_CONFIG['conferenceLeague'];

const PHASE_LABELS = {
    league_md1:'Fase Liga — Jornada 1', league_md2:'Fase Liga — Jornada 2',
    league_md3:'Fase Liga — Jornada 3', league_md4:'Fase Liga — Jornada 4',
    league_md5:'Fase Liga — Jornada 5', league_md6:'Fase Liga — Jornada 6',
    league_md7:'Fase Liga — Jornada 7', league_md8:'Fase Liga — Jornada 8',
    conf_md1:'Fase Liga — Jornada 1',   conf_md2:'Fase Liga — Jornada 2',
    conf_md3:'Fase Liga — Jornada 3',   conf_md4:'Fase Liga — Jornada 4',
    conf_md5:'Fase Liga — Jornada 5',   conf_md6:'Fase Liga — Jornada 6',
    playoff_leg1:'Play-off — Ida',      playoff_leg2:'Play-off — Vuelta',
    round16_leg1:'Octavos — Ida',       round16_leg2:'Octavos — Vuelta',
    qf_leg1:'Cuartos de Final — Ida',   qf_leg2:'Cuartos de Final — Vuelta',
    sf_leg1:'Semifinales — Ida',        sf_leg2:'Semifinales — Vuelta',
    final:'GRAN FINAL',
    copa_r1:'Copa del Rey — 1ª Ronda',  copa_r32:'Copa del Rey — Dieciseisavos',
    copa_r16:'Copa del Rey — Octavos',  copa_qf:'Copa del Rey — Cuartos',
    copa_sf_leg1:'Copa — Semifinal Ida',copa_sf_leg2:'Copa — Semifinal Vuelta',
    copa_final:'Copa del Rey — FINAL'
};

// ============================================================
// POOLS DE RIVALES REALES 2025-26
// ============================================================
const EU_POOLS = {
    champions: [
        'Liverpool FC','Arsenal FC','Manchester City','Chelsea FC',
        'Bayern München','Bayer Leverkusen','Eintracht Frankfurt','B. Dortmund',
        'Inter de Milán','Atalanta BC','Juventus FC','SSC Napoli',
        'PSG','AS Monaco','Olympique Marsella',
        'PSV Eindhoven','Ajax','Sporting CP',
        'Union Saint-Gilloise','Galatasaray SK','Slavia Praha','Olympiacos',
        'FC Porto','Benfica SL','Celtic FC','Rangers FC',
        'Red Bull Salzburg','Shakhtar','Dinamo Zagreb','FC Sheriff',
        'Fenerbahçe SK','Lech Poznań','FC Midtjylland','Club Bruges','Gent'
    ],
    europaLeague: [
        'AS Roma','SS Lazio','Fiorentina','Atalanta BC',
        'Tottenham Hotspur','Manchester United','Eintracht Frankfurt',
        'Feyenoord','Ajax','Sporting CP','Benfica SL',
        'Fenerbahçe SK','Galatasaray SK','Olympique Lyonnais',
        'RC Lens','PAOK FC','Braga','Anderlecht',
        'AZ Alkmaar','Club Bruges','Olympiacos','Slavia Praha',
        'RB Leipzig','Frankfurt','Sampdoria','Genoa',
        'FC Sheriff','FC Midtjylland','Rangers FC','Celtic FC',
        'Dinamo Zagreb','Sturm Graz','Malmö FF','Qarabag'
    ],
    conferenceLeague: [
        'Chelsea FC','Fiorentina','Real Sociedad',
        'Club Bruges','Gent','AZ Alkmaar','Vitesse',
        'PAOK FC','Olympiacos','Fenerbahçe SK',
        'Braga','FC Midtjylland','Lech Poznań',
        'Molde FK','Hearts FC','Hammarby','Servette FC',
        'FC Basel','Partizan','Vojvodina','Zrinjski',
        'HJK Helsinki','Ferencváros','Shamrock Rovers',
        'Slavia Praha','Sparta Praha','Dinamo Minsk',
        'FC Sheriff','Ararat-Armenia','Ludogorets',
        'Linfield','FC La Fiorita','Dudelange'
    ]
};
EU_POOLS['conferenceLague'] = EU_POOLS.conferenceLeague;

// ============================================================
// GENERADORES DE CALENDARIO
// ============================================================
function buildEuropeanCalendar(compType) {
    const isConf = compType === 'conferenceLeague' || compType === 'conferenceLague';
    const numMd  = isConf ? 6 : 8;
    const prefix = isConf ? 'conf' : 'league';

    // Semanas de liga española en las que cae cada jornada europea
    const mdWeeks = isConf
        ? [6, 8, 11, 14, 17, 19]
        : [4, 6, 9, 11, 15, 18, 21, 23];

    const cal = [];
    for (let i = 1; i <= numMd; i++) {
        cal.push({
            id: `eu_${prefix}_md${i}`,
            compType, phase: `${prefix}_md${i}`,
            afterLigaWeek: mdWeeks[i-1],
            isLeaguePhase: true, matchday: i,
            isHome: (i % 2 === 1),
            played: false, eliminated: false, locked: false, opponent: null
        });
    }

    // Play-off previo a octavos (solo 9-24)
    cal.push({ id:'eu_playoff_leg1', compType, phase:'playoff_leg1', afterLigaWeek:25, isPlayoff:true, isHome:false, played:false, eliminated:false, locked:true, opponent:null });
    cal.push({ id:'eu_playoff_leg2', compType, phase:'playoff_leg2', afterLigaWeek:26, isPlayoff:true, isHome:true,  played:false, eliminated:false, locked:true, opponent:null });

    // Eliminatorias ida+vuelta
    const rounds = [
        {base:'round16', weeks:[28,29]},
        {base:'qf',      weeks:[31,32]},
        {base:'sf',      weeks:[34,35]}
    ];
    rounds.forEach(({base, weeks}) => {
        cal.push({ id:`eu_${base}_leg1`, compType, phase:`${base}_leg1`, afterLigaWeek:weeks[0], isKnockout:true, isHome:false, played:false, eliminated:false, locked:true, opponent:null });
        cal.push({ id:`eu_${base}_leg2`, compType, phase:`${base}_leg2`, afterLigaWeek:weeks[1], isKnockout:true, isHome:true,  played:false, eliminated:false, locked:true, opponent:null });
    });
    // Final (partido único en campo neutral)
    cal.push({ id:'eu_final', compType, phase:'final', afterLigaWeek:37, isKnockout:true, isFinal:true, isHome:false, played:false, eliminated:false, locked:true, opponent:null });

    return cal;
}

function buildCopaCalendar(division) {
    const rounds = (division === 'primera')
        ? [
            {id:'copa_r32',   phase:'copa_r32',    week:14, isHome:true},
            {id:'copa_r16',   phase:'copa_r16',    week:18, isHome:false},
            {id:'copa_qf',    phase:'copa_qf',     week:22, isHome:true},
            {id:'copa_sf1',   phase:'copa_sf_leg1',week:27, isHome:false},
            {id:'copa_sf2',   phase:'copa_sf_leg2',week:29, isHome:true},
            {id:'copa_final', phase:'copa_final',  week:36, isHome:false, isFinal:true}
          ]
        : [
            {id:'copa_r1',    phase:'copa_r1',     week:10, isHome:true},
            {id:'copa_r32',   phase:'copa_r32',    week:14, isHome:false},
            {id:'copa_r16',   phase:'copa_r16',    week:18, isHome:true},
            {id:'copa_qf',    phase:'copa_qf',     week:22, isHome:false},
            {id:'copa_sf1',   phase:'copa_sf_leg1',week:27, isHome:true},
            {id:'copa_sf2',   phase:'copa_sf_leg2',week:29, isHome:false},
            {id:'copa_final', phase:'copa_final',  week:36, isHome:false, isFinal:true}
          ];

    return rounds.map(r => ({
        ...r, compType:'copa',
        afterLigaWeek: r.week,
        played:false, eliminated:false, locked:false, opponent:null
    }));
}

// ============================================================
// TABLA DE 36 EQUIPOS — FASE LIGA EUROPEA
// ============================================================
function buildLeagueField(compType, myTeam) {
    const pool = [...(EU_POOLS[compType] || EU_POOLS.europaLeague)].filter(n => n !== myTeam);
    const extra = ['FC Porto','Olympiacos','Celtic FC','Lech Poznań','Ludogorets',
                   'Partizan','Servette FC','Shamrock Rovers','Ferencváros'];
    while (pool.length < 35) pool.push(extra[pool.length % extra.length] + ' ' + pool.length);

    const rivals = pool.slice(0, 35);
    const table = {};
    [myTeam, ...rivals].forEach(n => {
        table[n] = {name:n, pj:0, g:0, e:0, p:0, gf:0, gc:0, pts:0, isPlayer: n===myTeam};
    });

    // Los 8 rivales del jugador (de los 35, elegidos aleatoriamente)
    const shuffled = [...rivals].sort(()=>Math.random()-0.5);
    const myOpponents = shuffled.slice(0, 8);

    return { rivals, table, myOpponents, compType, leaguePhaseFinished:false, myLeaguePos:null };
}

// ============================================================
// STORAGE
// ============================================================
const CAL_KEY   = 'cup_cal_v3';
const FIELD_KEY = 'cup_field_v3';

const getCal   = ()  => { try{ return JSON.parse(localStorage.getItem(CAL_KEY))||[]; }catch(e){return[];} };
const saveCal  = c   => { try{ localStorage.setItem(CAL_KEY,JSON.stringify(c)); }catch(e){} };
const clearCal = ()  => { localStorage.removeItem(CAL_KEY); localStorage.removeItem(FIELD_KEY); };
const getField  = () => { try{ return JSON.parse(localStorage.getItem(FIELD_KEY)); }catch(e){return null;} };
const saveField = f  => { try{ localStorage.setItem(FIELD_KEY,JSON.stringify(f)); }catch(e){} };
const getComp   = () => { try{ return JSON.parse(localStorage.getItem('comps_v2')); }catch(e){return null;} };
const saveComp  = c  => { try{ localStorage.setItem('comps_v2',JSON.stringify(c)); }catch(e){} };

// ============================================================
// INIT — GENERA EL CALENDARIO AL INICIO DE TEMPORADA
// ============================================================
function initCupCalendar() {
    const comp  = getComp();
    const state = window.gameLogic?.getGameState();
    if (!comp || !state) return;

    // No regenerar si ya existe para esta temporada y equipo
    const existing = getCal();
    if (existing.length &&
        existing[0]?.season === comp.season &&
        existing[0]?.team   === comp.team) {
        console.log('📅 Calendario copas ya existe para esta temporada');
        return;
    }

    const myTeam   = state.team;
    const division = state.division;
    const season   = comp.season;
    const cal      = [];

    // ── EUROPA: SOLO si está clasificado ──────────────────
    const euComp = comp.europeanComp;  // null si no clasificado
    if (euComp) {
        const euCal = buildEuropeanCalendar(euComp);
        const field = buildLeagueField(euComp, myTeam);
        field.season = season; field.team = myTeam;
        saveField(field);

        euCal.forEach((m, idx) => {
            m.season = season; m.team = myTeam;
            // Pre-asignar rival para la fase liga
            if (m.isLeaguePhase) {
                m.opponent = field.myOpponents[m.matchday-1] || field.rivals[idx] || 'Rival Europeo';
            }
            cal.push(m);
        });
        console.log(`🌍 ${euComp} calendario creado. Mis rivales fase liga:`, field.myOpponents.slice(0,4).join(', ')+'...');
    } else {
        console.log(`❌ Equipo "${myTeam}" sin clasificación europea → no se añaden partidos europeos`);
    }

    // ── COPA DEL REY: solo primera/segunda ────────────────
    const copaOk = (division === 'primera' || division === 'segunda') &&
                   comp.copaPhase && comp.copaPhase !== 'eliminated';
    if (copaOk) {
        const copaCal = buildCopaCalendar(division);
        copaCal.forEach(m => {
            m.season = season; m.team = myTeam;
            m.opponent = getCopaRival(comp, division);
            cal.push(m);
        });
        console.log(`🥇 Copa del Rey calendario creado (${division})`);
    } else if (division !== 'primera' && division !== 'segunda') {
        console.log(`❌ División "${division}" no participa en Copa del Rey`);
    }

    cal.sort((a,b) => a.afterLigaWeek - b.afterLigaWeek);
    saveCal(cal);
    console.log(`📅 Total partidos generados: ${cal.length}`,
        cal.map(m=>`${m.compType}/${m.phase}@J${m.afterLigaWeek}`).join(' | '));
}

function getCopaRival(comp, division) {
    const primPool = ['Real Sociedad','CA Osasuna','Rayo Vallecano','Getafe CF','RCD Mallorca',
                      'CD Leganés','Girona FC','Sevilla FC','Valencia CF','Villarreal CF'];
    const segPool  = ['CD Cartagena','Burgos CF','SD Eibar','Real Zaragoza','Córdoba CF',
                      'UD Almería','Racing Club Ferrol','SD Huesca'];
    const pool = (division === 'primera') ? primPool : segPool;
    return pool[Math.floor(Math.random()*pool.length)];
}

// ============================================================
// OBTENER PARTIDO PENDIENTE PARA ESTA SEMANA
// ============================================================
function getPendingMatch(week) {
    const cal  = getCal();
    const comp = getComp();

    for (const m of cal) {
        if (m.played || m.eliminated) continue;
        if (m.afterLigaWeek !== week) continue;

        // Verificar si está bloqueado (esperando resultado de ronda anterior)
        if (m.locked) {
            m.eliminated = true; saveCal(cal); continue;
        }

        // Copa: verificar no eliminado
        if (m.compType === 'copa') {
            if (!comp?.copaPhase || comp.copaPhase === 'eliminated' || comp.copaPhase === 'champion') {
                m.eliminated = true; saveCal(cal); continue;
            }
        }

        return m;
    }
    return null;
}

// ============================================================
// SIMULAR JORNADA EUROPEA: los otros 35 equipos también juegan
// ============================================================
function simLeaguePhaseRound(matchday, myResult) {
    const field = getField();
    if (!field) return;

    const mt = field.team;
    if (!field.table[mt]) field.table[mt]={name:mt,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0,isPlayer:true};
    const mySt = field.table[mt];
    mySt.pj++; mySt.gf+=myResult.myGoals; mySt.gc+=myResult.oppGoals;
    if(myResult.win){mySt.g++;mySt.pts+=3;}else if(myResult.draw){mySt.e++;mySt.pts++;}else{mySt.p++;}

    const op = myResult.opponent;
    if (!field.table[op]) field.table[op]={name:op,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0};
    const opSt = field.table[op];
    opSt.pj++; opSt.gf+=myResult.oppGoals; opSt.gc+=myResult.myGoals;
    if(myResult.win){opSt.p++;}else if(myResult.draw){opSt.e++;opSt.pts++;}else{opSt.g++;opSt.pts+=3;}

    // Simular el resto (17 partidos entre los 34 restantes)
    const others = field.rivals.filter(n => n !== op);
    const shuffled = [...others].sort(()=>Math.random()-0.5);
    for (let i=0; i<shuffled.length-1; i+=2) {
        const a=shuffled[i], b=shuffled[i+1];
        if(!field.table[a])field.table[a]={name:a,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0};
        if(!field.table[b])field.table[b]={name:b,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0};
        const [ga,gb]=simGoals();
        field.table[a].pj++;field.table[a].gf+=ga;field.table[a].gc+=gb;
        field.table[b].pj++;field.table[b].gf+=gb;field.table[b].gc+=ga;
        if(ga>gb){field.table[a].g++;field.table[a].pts+=3;field.table[b].p++;}
        else if(ga===gb){field.table[a].e++;field.table[a].pts++;field.table[b].e++;field.table[b].pts++;}
        else{field.table[b].g++;field.table[b].pts+=3;field.table[a].p++;}
    }

    saveField(field);
    return field;
}

function classifyLeaguePhase() {
    const field = getField();
    if (!field) return 36;
    const sorted = Object.values(field.table).sort((a,b)=>{
        const pd=b.pts-a.pts; if(pd!==0)return pd;
        const gd=(b.gf-b.gc)-(a.gf-a.gc); if(gd!==0)return gd;
        return b.gf-a.gf;
    });
    const pos = sorted.findIndex(t=>t.isPlayer)+1;
    field.myLeaguePos = pos;
    field.leaguePhaseFinished = true;
    field.sortedTable = sorted.slice(0,10).map(t=>({name:t.name,pts:t.pts,isPlayer:t.isPlayer}));
    saveField(field);
    return pos;
}

function simGoals() {
    const opts=[[0,0],[1,0],[0,1],[1,1],[2,0],[0,2],[2,1],[1,2],[2,2],[3,0],[0,3],[3,1],[1,3]];
    const w=   [5,    8,    8,    7,    5,    5,    5,    5,    3,    2,    2,    2,    2   ];
    let r=Math.random()*w.reduce((a,b)=>a+b,0);
    for(let i=0;i<w.length;i++){r-=w[i];if(r<=0)return opts[i];}
    return [1,1];
}

// ============================================================
// SIMULAR PARTIDO DEL JUGADOR
// ============================================================
function simCupMatch(match) {
    const state  = window.gameLogic?.getGameState();
    const squad  = state?.squad||[];
    const myRating = squad.length ? Math.round(squad.reduce((a,b)=>a+(b.overall||70),0)/squad.length) : 75;

    const baseDiff={champions:82,europaLeague:77,conferenceLeague:72,conferenceLague:72,copa:70}[match.compType]||74;
    const phaseMod={
        final:7,copa_final:6,sf_leg2:5,copa_sf_leg2:5,sf_leg1:4,copa_sf_leg1:4,
        qf_leg2:4,qf_leg1:3,copa_qf:3,round16_leg2:3,round16_leg1:3,
        copa_r16:2,playoff_leg2:2,playoff_leg1:2,copa_r32:1,copa_r1:0,
        league_md8:2,conf_md6:2,league_md7:1,conf_md5:1
    }[match.phase]||0;
    const oppRating = baseDiff+phaseMod+(Math.floor(Math.random()*6)-3);
    const homeBonus = match.isHome ? 0.07 : -0.04;
    const winProb   = Math.max(0.1,Math.min(0.85, 0.46+(myRating-oppRating)/100+homeBonus));
    const r=Math.random();

    let myGoals,oppGoals;
    if(r<winProb){myGoals=Math.floor(Math.random()*3)+1;oppGoals=Math.max(0,myGoals-1-Math.floor(Math.random()*2));}
    else if(r<winProb+0.22){myGoals=oppGoals=Math.floor(Math.random()*2)+1;}
    else{oppGoals=Math.floor(Math.random()*3)+1;myGoals=Math.max(0,oppGoals-1-Math.floor(Math.random()*2));}

    const win=myGoals>oppGoals, draw=myGoals===oppGoals;
    return {myGoals,oppGoals,win,draw,loss:!win&&!draw,myTeam:state?.team,opponent:match.opponent,isHome:match.isHome,oppRating,myRating};
}

// ============================================================
// PROCESAR RESULTADO Y ACTUALIZAR ESTADOS
// ============================================================
function processResult(match, result) {
    const cal  = getCal();
    const comp = getComp();
    const entry = cal.find(m=>m.id===match.id);
    if(entry){entry.played=true;entry.result={myGoals:result.myGoals,oppGoals:result.oppGoals};saveCal(cal);}

    // ── COPA DEL REY ───────────────────────────────────────
    if (match.compType === 'copa') {
        if (result.win) {
            const order=['copa_r1','copa_r32','copa_r16','copa_qf','copa_sf_leg1','copa_sf_leg2','copa_final'];
            const idx=order.indexOf(match.phase);
            comp.copaPhase = order[idx+1]||'champion';
            if(comp.copaPhase==='champion') window.gameLogic?.addNews('🏆 ¡¡CAMPEONES DE LA COPA DEL REY!!','success');
        } else {
            comp.copaPhase='eliminated';
            cal.filter(m=>m.compType==='copa'&&!m.played).forEach(m=>m.eliminated=true);
        }
        comp.copaResults=[...(comp.copaResults||[]),{phase:match.phase,rival:match.opponent,myGoals:result.myGoals,oppGoals:result.oppGoals,win:result.win}];
        saveCal(cal); saveComp(comp);
        return {advances:result.win};
    }

    // ── FASE LIGA EUROPEA ──────────────────────────────────
    if (match.isLeaguePhase) {
        const updatedField = simLeaguePhaseRound(match.matchday, result);
        const isConf = match.compType==='conferenceLeague'||match.compType==='conferenceLague';
        const totalMd = isConf ? 6 : 8;

        if (match.matchday === totalMd) {
            const pos = classifyLeaguePhase();
            comp.europeanLeaguePos = pos;

            if (pos<=8) {
                comp.europeanPhase='round16';
                ['eu_round16_leg1','eu_round16_leg2'].forEach(id=>{
                    const m=cal.find(x=>x.id===id); if(m){m.locked=false;}
                });
                window.gameLogic?.addNews(`⭐ ¡Top 8 de la fase liga! Clasificados DIRECTOS para Octavos (${pos}º/36)`,'success');
            } else if (pos<=24) {
                comp.europeanPhase='playoff';
                ['eu_playoff_leg1','eu_playoff_leg2'].forEach(id=>{
                    const m=cal.find(x=>x.id===id); if(m){m.locked=false;}
                });
                window.gameLogic?.addNews(`⚠️ Posición ${pos}ª → Jugamos Play-off de acceso a Octavos`,'info');
            } else {
                comp.europeanPhase='eliminated';
                cal.filter(m=>m.compType!=='copa'&&(m.isKnockout||m.isPlayoff)&&!m.played).forEach(m=>m.eliminated=true);
                window.gameLogic?.addNews(`😞 Eliminados de la fase liga (${pos}º/36, top 24 avanzaban)`,'error');
            }
            saveCal(cal); saveComp(comp);
            return {advances:true, leaguePhaseEnd:true, pos, field: getField()};
        }
        saveComp(comp);
        return {advances:true, field: getField()};
    }

    // ── PLAY-OFF (doble partido) ───────────────────────────
    if (match.isPlayoff) {
        comp.europeanPlayoff = comp.europeanPlayoff||{opponent:match.opponent};
        if (match.phase==='playoff_leg1') {
            comp.europeanPlayoff.leg1={myGoals:result.myGoals,oppGoals:result.oppGoals};
            // Asignar rival a la vuelta
            const leg2=cal.find(m=>m.id==='eu_playoff_leg2');
            if(leg2){leg2.locked=false;leg2.opponent=match.opponent;}
        } else {
            comp.europeanPlayoff.leg2={myGoals:result.myGoals,oppGoals:result.oppGoals};
            const l1=comp.europeanPlayoff.leg1||{myGoals:0,oppGoals:0};
            const totalMy=l1.myGoals+result.myGoals, totalOp=l1.oppGoals+result.oppGoals;
            if(totalMy>totalOp){
                comp.europeanPhase='round16';
                ['eu_round16_leg1','eu_round16_leg2'].forEach(id=>{const m=cal.find(x=>x.id===id);if(m)m.locked=false;});
                window.gameLogic?.addNews(`✅ Play-off ganado! (${totalMy}-${totalOp} global) → Octavos de Final`,'success');
            } else {
                comp.europeanPhase='eliminated';
                cal.filter(m=>m.compType!=='copa'&&m.isKnockout&&!m.played).forEach(m=>m.eliminated=true);
                window.gameLogic?.addNews(`😞 Eliminados en el Play-off (${totalMy}-${totalOp} global)`,'error');
            }
        }
        saveCal(cal); saveComp(comp);
        return {advances: match.phase==='playoff_leg1' ? null : (comp.europeanPhase==='round16'), isLeg:true,
                legInfo: match.phase==='playoff_leg2' ? {total:`${comp.europeanPlayoff.leg1?.myGoals||0+result.myGoals}-${comp.europeanPlayoff.leg1?.oppGoals||0+result.oppGoals}`} : null};
    }

    // ── ELIMINATORIA EUROPEA (octavos, cuartos, semis, final) ─
    if (match.isKnockout) {
        if (match.isFinal) {
            comp.europeanPhase = result.win ? 'champion' : 'eliminated';
            if(result.win) window.gameLogic?.addNews(`🏆 ¡¡CAMPEONES DE LA ${(CUP_CONFIG[match.compType]?.name||'').toUpperCase()}!!`,'success');
            saveComp(comp);
            return {advances:result.win};
        }

        const basePhase = match.phase.replace(/_leg[12]$/,'');
        comp.europeanKO = comp.europeanKO||{};
        if (!comp.europeanKO[basePhase]) comp.europeanKO[basePhase]={opponent:match.opponent};

        if (match.phase.endsWith('_leg1')) {
            comp.europeanKO[basePhase].leg1={myGoals:result.myGoals,oppGoals:result.oppGoals};
            const leg2Id=match.id.replace('_leg1','_leg2');
            const leg2=cal.find(m=>m.id===leg2Id);
            if(leg2){leg2.locked=false;leg2.opponent=match.opponent;}
            saveCal(cal); saveComp(comp);
            return {advances:null, isLeg:true};
        } else {
            const l1=comp.europeanKO[basePhase].leg1||{myGoals:0,oppGoals:0};
            const totMy=l1.myGoals+result.myGoals, totOp=l1.oppGoals+result.oppGoals;
            const adv=totMy>totOp;
            comp.europeanKO[basePhase].leg2={myGoals:result.myGoals,oppGoals:result.oppGoals,advances:adv};

            if (adv) {
                const nextMap={round16:'qf',qf:'sf',sf:'final'};
                const next=nextMap[basePhase];
                if(next==='final'){
                    const mf=cal.find(x=>x.id==='eu_final'); if(mf)mf.locked=false;
                } else if(next){
                    [`eu_${next}_leg1`,`eu_${next}_leg2`].forEach(id=>{const m=cal.find(x=>x.id===id);if(m)m.locked=false;});
                }
                comp.europeanPhase=next||'champion';
                window.gameLogic?.addNews(`✅ ¡Avanzamos! ${totMy}-${totOp} global → ${PHASE_LABELS[next+'_leg1']||next}`,'success');
            } else {
                comp.europeanPhase='eliminated';
                cal.filter(m=>m.compType!=='copa'&&m.isKnockout&&!m.played).forEach(m=>m.eliminated=true);
                window.gameLogic?.addNews(`😞 Eliminados (${totMy}-${totOp} global)`,'error');
            }
            saveCal(cal); saveComp(comp);
            return {advances:adv, isLeg:true, globalScore:`${totMy}-${totOp}`};
        }
    }

    return {advances:result.win};
}

// ============================================================
// INGRESOS DE TAQUILLA EN PARTIDOS EN CASA
// ============================================================
function addMatchRevenue(match) {
    const state = window.gameLogic?.getGameState();
    if (!state || !match.isHome) return 0;

    const mult={champions:1.8,europaLeague:1.4,conferenceLeague:1.2,conferenceLague:1.2,copa:1.1}[match.compType]||1.1;
    const att = Math.floor(Math.min(state.stadiumCapacity,
        state.stadiumCapacity*(0.65+state.popularity/300)*mult));
    const rev = Math.floor(att * state.ticketPrice * mult);

    if (window._financesSuppressBalance !== true && window.gameLogic) {
        const gs = window.gameLogic.getGameState();
        gs.balance += rev;
    }

    const cname = CUP_CONFIG[match.compType]?.shortName||'Copa';
    window.gameLogic?.addNews(`💰 ${cname}: Taquilla +${fmtMoney(rev)} (${att.toLocaleString()} espectadores)`,'success');
    return rev;
}

function fmtMoney(n){
    if(n>=1e6)return(n/1e6).toFixed(1)+'M€';
    if(n>=1e3)return Math.round(n/1e3)+'K€';
    return n+'€';
}

// ============================================================
// MODAL 1 — ANUNCIO DEL PARTIDO (HYPE)
// ============================================================
function showAnnouncementModal(match) {
    return new Promise(resolve => {
        const cfg=CUP_CONFIG[match.compType]||CUP_CONFIG.copa;
        const phaseName=PHASE_LABELS[match.phase]||match.phase;
        const locText=match.isHome?'🏟️ EN CASA':'✈️ A DOMICILIO';
        const myTeam=window.gameLogic?.getGameState()?.team||'Tu Equipo';

        const parts=Array.from({length:18},()=>{
            const sz=4+Math.random()*8,l=Math.random()*100,d=Math.random()*3,dur=3+Math.random()*4;
            return `<div style="position:absolute;width:${sz}px;height:${sz}px;background:${cfg.accentColor};border-radius:50%;left:${l}%;top:110%;animation:cu-flt ${dur}s ${d}s infinite ease-in;opacity:.7"></div>`;
        }).join('');

        const el=document.createElement('div');
        el.id='cupAnnModal';
        el.innerHTML=`<style>
#cupAnnModal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.97);
display:flex;align-items:center;justify-content:center;z-index:999999;overflow:hidden;animation:cu-fi .4s ease}
@keyframes cu-fi{from{opacity:0}to{opacity:1}}
@keyframes cu-flt{0%{transform:translateY(0) rotate(0);opacity:.7}100%{transform:translateY(-110vh) rotate(720deg);opacity:0}}
@keyframes cu-pg{0%,100%{box-shadow:0 0 30px ${cfg.color}44}50%{box-shadow:0 0 70px ${cfg.color}99}}
@keyframes cu-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes cu-sp{0%{transform:scale(0) rotate(-180deg);opacity:0}60%{transform:scale(1.2) rotate(10deg);opacity:1}100%{transform:scale(1) rotate(0)}}
.cu-box{background:${cfg.gradient};border:2px solid ${cfg.color}88;border-radius:24px;padding:40px 36px;
max-width:480px;width:90%;text-align:center;position:relative;animation:cu-pg 2s ease-in-out infinite;overflow:hidden}
.cu-comp{font-size:.82em;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${cfg.accentColor};margin-bottom:8px;animation:cu-up .5s .1s both}
.cu-logo{font-size:4em;margin:12px 0;animation:cu-sp .8s .2s both cubic-bezier(.175,.885,.32,1.275)}
.cu-phase{font-size:1.55em;font-weight:900;color:#fff;margin-bottom:6px;text-shadow:0 2px 20px ${cfg.color};animation:cu-up .5s .3s both}
.cu-vs{display:flex;align-items:center;justify-content:center;gap:14px;margin:18px 0;animation:cu-up .5s .4s both}
.cu-team{font-size:1.1em;font-weight:800;color:#fff;flex:1;padding:12px 8px;border-radius:12px;background:rgba(255,255,255,.08)}
.cu-team.h{border-left:3px solid ${cfg.accentColor}}.cu-team.a{border-right:3px solid ${cfg.accentColor}}
.cu-vsbdg{font-size:1.2em;font-weight:900;color:${cfg.accentColor};background:rgba(255,255,255,.1);width:48px;height:48px;border-radius:50%;
display:flex;align-items:center;justify-content:center;border:2px solid ${cfg.color};flex-shrink:0}
.cu-loc{font-size:.86em;color:rgba(255,255,255,.6);margin-bottom:22px;animation:cu-up .5s .5s both}
.cu-btn{background:linear-gradient(135deg,${cfg.color},${cfg.accentColor});color:${match.compType==='copa'?'#000':'#fff'};
border:none;padding:15px 48px;border-radius:50px;font-size:1.2em;font-weight:900;cursor:pointer;letter-spacing:1px;
text-transform:uppercase;box-shadow:0 6px 30px ${cfg.color}66;transition:all .2s;width:100%;animation:cu-up .5s .6s both}
.cu-btn:hover{transform:translateY(-3px);box-shadow:0 10px 40px ${cfg.color}99}
.cu-stakes{font-size:.8em;color:rgba(255,255,255,.5);margin-top:10px;animation:cu-up .5s .7s both}
</style>
<div class="cu-box">
<div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none">${parts}</div>
<div class="cu-comp">${cfg.emoji} ${cfg.shortName}</div>
<div class="cu-logo">${cfg.emoji}</div>
<div class="cu-phase">${phaseName}</div>
<div class="cu-vs">
<div class="cu-team h">${myTeam}</div>
<div class="cu-vsbdg">VS</div>
<div class="cu-team a">${match.opponent}</div>
</div>
<div class="cu-loc">${locText} · ${cfg.name}</div>
<button class="cu-btn" id="cuPlayBtn">⚽ ¡A JUGAR!</button>
<div class="cu-stakes">${getStakesText(match)}</div>
</div>`;

        document.body.appendChild(el);
        document.getElementById('cuPlayBtn').onclick=()=>{
            el.style.animation='cu-fi .25s ease reverse forwards';
            setTimeout(()=>{el.remove();resolve();},250);
        };
    });
}

function getStakesText(match){
    if(match.compType==='copa'){
        if(match.phase==='copa_final') return '🏆 La Copa del Rey en juego';
        if(match.phase.includes('sf')) return '🎯 Un paso de la final';
        return '⚔️ Eliminación directa';
    }
    if(match.isLeaguePhase){
        const isConf=match.compType==='conferenceLeague'||match.compType==='conferenceLague';
        const tot=isConf?6:8;
        if(match.matchday===tot) return '⚠️ Última jornada — la posición en la tabla lo decide todo';
        if(match.matchday>=tot-1) return '🎯 Recta final de la fase liga';
        return '📊 Fase Liga — cada punto sube en la tabla de 36 equipos';
    }
    if(match.isPlayoff) return '⚔️ Play-off de acceso a Octavos';
    if(match.isFinal)  return `🏆 La ${CUP_CONFIG[match.compType]?.shortName} en juego`;
    if(match.phase.includes('sf')) return '🎯 Un paso de la gran final';
    return '⚔️ Eliminación directa';
}

// ============================================================
// MODAL 2 — RESULTADO
// ============================================================
function showResultModal(match, result, processed) {
    return new Promise(resolve=>{
        const cfg=CUP_CONFIG[match.compType]||CUP_CONFIG.copa;
        const phaseName=PHASE_LABELS[match.phase]||match.phase;
        const myTeam=result.myTeam||'Tu Equipo';
        const win=result.win,draw=result.draw;
        const outLabel=win?'¡VICTORIA!':draw?'EMPATE':'DERROTA';
        const outColor=win?'#4CAF50':draw?'#FFD700':'#f44336';
        const outEmoji=win?'🎉':draw?'🤝':'😞';

        const myScr=genScorers(myTeam,result.myGoals,true);
        const opScr=genScorers(match.opponent,result.oppGoals,false);
        const goals=[...myScr,...opScr].sort((a,b)=>a.min-b.min);
        const poss=win?52+Math.floor(Math.random()*14):draw?46+Math.floor(Math.random()*8):36+Math.floor(Math.random()*12);
        const shots={my:Math.max(result.myGoals*2,Math.floor(Math.random()*8)+5),opp:Math.max(result.oppGoals*2,Math.floor(Math.random()*8)+5)};

        // Banner contextual
        let banner='';
        if(match.isLeaguePhase&&processed.leaguePhaseEnd){
            const p=processed.pos;
            const top=p<=8, play=p<=24;
            banner=`<div style="background:rgba(${top?'76,175,80':play?'255,165,0':'244,67,54'},.2);border:1px solid ${top?'#4CAF50':play?'#FFA500':'#f44336'};border-radius:10px;padding:12px;margin-top:14px;font-weight:bold;color:${top?'#4CAF50':play?'#FFA500':'#f44336'}">
                ${top?`⭐ Top 8 — Clasificados DIRECTOS para Octavos (${p}º/36)`:play?`⚠️ Posición ${p}ª/36 → Jugamos Play-off de acceso a Octavos`:`❌ Eliminados (${p}º/36 — top 24 avanzaban)`}
            </div>`;
        } else if(match.isLeaguePhase&&processed.field){
            const top5=Object.values(processed.field.table||{}).sort((a,b)=>b.pts-a.pts||(b.gf-b.gc)-(a.gf-a.gc)).slice(0,5);
            const myPos=Object.values(processed.field.table||{}).sort((a,b)=>b.pts-a.pts).findIndex(t=>t.isPlayer)+1;
            banner=`<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:12px;margin-top:14px">
                <div style="color:${cfg.accentColor};font-size:.75em;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📊 Tabla Fase Liga (posiciones)</div>
                ${top5.map((t,i)=>`<div style="display:flex;gap:8px;padding:3px 0;font-size:.83em;${t.isPlayer?'color:#FFD700;font-weight:bold':'color:rgba(255,255,255,.7)'}">
                    <span style="min-width:22px">${i+1}º</span><span style="flex:1">${t.name}</span><span>${t.pts}pts</span>
                </div>`).join('')}
                ${top5.find(t=>t.isPlayer)?'':`<div style="color:#FFD700;font-size:.8em;margin-top:6px">📍 Tú: ${myPos}º de 36</div>`}
                <div style="font-size:.72em;color:rgba(255,255,255,.4);margin-top:6px">Top 8 → Octavos directo · 9-24 → Play-off · 25-36 → Eliminado</div>
            </div>`;
        } else if((match.isPlayoff||match.isKnockout)&&processed.isLeg&&processed.advances===null){
            banner=`<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:10px;margin-top:14px;text-align:center;color:rgba(255,255,255,.7);font-size:.88em">
                ⏳ Vuelta ${match.isHome?'en campo rival':'en casa'} — resultado parcial: <strong style="color:#FFD700">${result.myGoals}-${result.oppGoals}</strong>
            </div>`;
        } else if((match.isPlayoff||match.isKnockout)&&!match.isFinal){
            const adv=processed.advances;
            const gs=processed.globalScore||`${result.myGoals}-${result.oppGoals}`;
            banner=adv
                ?`<div style="background:rgba(76,175,80,.2);border:1px solid #4CAF50;border-radius:10px;padding:12px;margin-top:14px;color:#4CAF50;font-weight:bold">✅ ¡AVANZAMOS! Global: ${gs}</div>`
                :`<div style="background:rgba(244,67,54,.2);border:1px solid #f44336;border-radius:10px;padding:12px;margin-top:14px;color:#f44336;font-weight:bold">❌ Eliminados — Global: ${gs}</div>`;
        } else if(match.isFinal&&processed.advances){
            banner=`<div style="background:rgba(255,215,0,.2);border:2px solid #FFD700;border-radius:10px;padding:18px;margin-top:14px;text-align:center"><div style="font-size:2.5em">🏆</div><div style="color:#FFD700;font-weight:900;font-size:1.3em">¡¡CAMPEONES!!</div></div>`;
        } else if(match.compType==='copa'&&result.win&&match.phase==='copa_final'){
            banner=`<div style="background:rgba(255,215,0,.2);border:2px solid #FFD700;border-radius:10px;padding:18px;margin-top:14px;text-align:center"><div style="font-size:2.5em">🥇</div><div style="color:#FFD700;font-weight:900;font-size:1.3em">¡COPA DEL REY!</div></div>`;
        } else if(match.compType==='copa'&&!result.win){
            banner=`<div style="background:rgba(244,67,54,.2);border:1px solid #f44336;border-radius:10px;padding:12px;margin-top:14px;color:#f44336;font-weight:bold">❌ Eliminados de la Copa del Rey</div>`;
        } else if(match.compType==='copa'&&result.win){
            banner=`<div style="background:rgba(76,175,80,.2);border:1px solid #4CAF50;border-radius:10px;padding:12px;margin-top:14px;color:#4CAF50;font-weight:bold">✅ ¡Pasamos a la siguiente ronda!</div>`;
        }

        const el=document.createElement('div');
        el.id='cupResModal';
        el.innerHTML=`<style>
#cupResModal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.96);
display:flex;align-items:center;justify-content:center;z-index:999998;animation:cr-fi .3s ease}
@keyframes cr-fi{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
#cupResModal .cr-box{background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid ${cfg.color}66;
border-radius:20px;padding:26px 22px;max-width:500px;width:92%;max-height:88vh;overflow-y:auto;
box-shadow:0 20px 60px rgba(0,0,0,.8),0 0 40px ${cfg.color}22}
#cupResModal .cr-badge{text-align:center;font-size:.76em;font-weight:700;letter-spacing:2px;color:${cfg.accentColor};text-transform:uppercase;margin-bottom:5px}
#cupResModal .cr-phase{text-align:center;font-size:.88em;color:rgba(255,255,255,.55);margin-bottom:14px}
#cupResModal .cr-score{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:6px}
#cupResModal .cr-tm{flex:1;text-align:center}
#cupResModal .cr-tn{font-size:.95em;font-weight:700;color:#fff;margin-bottom:8px}
#cupResModal .cr-g{font-size:3.8em;font-weight:900}
#cupResModal .cr-sep{font-size:1.8em;color:rgba(255,255,255,.25)}
#cupResModal .cr-out{text-align:center;font-size:1.5em;font-weight:900;color:${outColor};margin:10px 0 18px}
.cr-sec h4{color:${cfg.accentColor};font-size:.82em;text-transform:uppercase;letter-spacing:1px;margin:16px 0 8px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,.1)}
.cr-gi{display:flex;align-items:center;gap:8px;padding:7px;border-radius:7px;margin-bottom:5px;background:rgba(255,255,255,.05);border-left:3px solid}
.cr-gi.m{border-color:#4CAF50}.cr-gi.t{border-color:#f44336}
.cr-mn{color:#FFD700;font-weight:bold;min-width:32px;font-size:.88em}
.cr-sc{color:#fff;flex:1;font-weight:600}.cr-tt{color:rgba(255,255,255,.45);font-size:.82em}
.cr-sr{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:.88em;color:#fff}
.cr-sn{color:rgba(255,255,255,.5);flex:1;text-align:center}
.cr-btn{background:linear-gradient(135deg,${cfg.color},${cfg.accentColor});color:${match.compType==='copa'?'#000':'#fff'};
border:none;padding:13px 40px;border-radius:50px;font-size:1.05em;font-weight:900;cursor:pointer;width:100%;
margin-top:16px;transition:all .2s;box-shadow:0 4px 20px ${cfg.color}55}
.cr-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px ${cfg.color}77}
</style>
<div class="cr-box">
<div class="cr-badge">${cfg.emoji} ${cfg.shortName}</div>
<div class="cr-phase">${phaseName}</div>
<div class="cr-score">
<div class="cr-tm"><div class="cr-tn">${myTeam}</div><div class="cr-g" style="color:${outColor}">${result.myGoals}</div></div>
<div class="cr-sep">–</div>
<div class="cr-tm"><div class="cr-tn">${match.opponent}</div><div class="cr-g" style="color:${result.oppGoals>result.myGoals?'#f44336':'rgba(255,255,255,.4)'}">${result.oppGoals}</div></div>
</div>
<div class="cr-out">${outEmoji} ${outLabel}</div>
${goals.length?`<div class="cr-sec"><h4>⚽ Goles</h4>${goals.map(g=>`<div class="cr-gi ${g.mine?'m':'t'}"><span class="cr-mn">${g.min}'</span><span class="cr-sc">${g.name}</span><span class="cr-tt">(${g.team})</span></div>`).join('')}</div>`:''}
<div class="cr-sec"><h4>📊 Estadísticas</h4>
<div class="cr-sr"><strong>${poss}%</strong><span class="cr-sn">Posesión</span><strong>${100-poss}%</strong></div>
<div class="cr-sr"><strong>${shots.my}</strong><span class="cr-sn">Remates</span><strong>${shots.opp}</strong></div>
<div class="cr-sr"><strong>${result.myGoals+Math.floor(Math.random()*3)+1}</strong><span class="cr-sn">A puerta</span><strong>${result.oppGoals+Math.floor(Math.random()*3)+1}</strong></div>
<div class="cr-sr"><strong>${Math.floor(Math.random()*6)+2}</strong><span class="cr-sn">Corners</span><strong>${Math.floor(Math.random()*6)+2}</strong></div>
</div>
${banner}
<button class="cr-btn" id="cuResClose">✅ Continuar</button>
</div>`;

        document.body.appendChild(el);
        document.getElementById('cuResClose').onclick=()=>{
            el.style.opacity='0';el.style.transform='scale(.97)';el.style.transition='all .22s';
            setTimeout(()=>{el.remove();resolve();},220);
        };
        setTimeout(()=>{const e=document.getElementById('cupResModal');if(e){e.remove();resolve();}},30000);
    });
}

function genScorers(team,n,isMine){
    const state=window.gameLogic?.getGameState();
    const out=[];const used=new Set();
    for(let i=0;i<n;i++){
        let min;do{min=Math.floor(Math.random()*90)+1;}while(used.has(min));used.add(min);
        let name;
        if(isMine&&state?.squad?.length){
            const pool=state.squad.filter(p=>p.pos!=='POR'&&!p.isInjured);
            const arr=pool.length?pool:state.squad;
            const wt=arr.map(p=>['DC','EX'].includes(p.pos)?3:p.pos==='MC'?2:1);
            const tot=wt.reduce((a,b)=>a+b,0);
            let r=Math.random()*tot,pick=arr[0];
            for(let j=0;j<arr.length;j++){r-=wt[j];if(r<=0){pick=arr[j];break;}}
            name=pick.name;
        }else{
            const g=['Müller','Kane','Mbappé','Salah','De Bruyne','Vinicius','Bellingham','Haaland','Lewandowski','Ødegaard','Saka','Pedri','Gvardiol','Wirtz'];
            name=g[Math.floor(Math.random()*g.length)];
        }
        out.push({name,min,team,mine:isMine});
    }
    return out.sort((a,b)=>a.min-b.min);
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================
function hookSimulateWeek(){
    const orig=window.simulateWeek;
    if(!orig||window._cupsHookedV3){if(!orig){setTimeout(hookSimulateWeek,500);return;}return;}
    window._cupsHookedV3=true;
    console.log('🏆 Cup-matches hook v3 activo');

    window.simulateWeek=async function(){
        const state=window.gameLogic?.getGameState();
        if(!state) return orig.apply(this,arguments);

        const pending=getPendingMatch(state.week);
        if(!pending) return orig.apply(this,arguments);

        // 1. Anuncio
        await showAnnouncementModal(pending);

        // 2. Simular
        const result=simCupMatch(pending);

        // 3. Taquilla si es en casa
        addMatchRevenue(pending);

        // 4. Procesar resultado
        const processed=processResult(pending,result);

        // 5. Noticia
        const cfg=CUP_CONFIG[pending.compType]||CUP_CONFIG.copa;
        const ph=PHASE_LABELS[pending.phase]||pending.phase;
        window.gameLogic?.addNews(
            `${cfg.emoji} ${cfg.shortName} — ${ph}: ${result.win?'¡Victoria':result.draw?'Empate':'Derrota'} ${result.myGoals}-${result.oppGoals} vs ${pending.opponent}`,
            result.win?'success':result.draw?'info':'error'
        );

        // 6. Refresh UI
        window.ui?.refreshUI?.(window.gameLogic.getGameState());

        // 7. Resultado
        await showResultModal(pending,result,processed);

        // 8. Dashboard — semana NO avanza
        window.openPage?.('dashboard');
        return {cupMatch:true};
    };
}

// ============================================================
// BOOTSTRAP
// ============================================================
window.CupMatches = {
    getCalendar: getCal,
    getField,
    getComp,
    clearAll: clearCal,
    reinit: ()=>{ clearCal(); initCupCalendar(); },
    // Test desde consola del navegador:
    // CupMatches.test("champions","league_md1","Bayern München")
    // CupMatches.test("copa","copa_r32","Real Sociedad")
    // CupMatches.test("europaLeague","playoff_leg1","AS Roma")
    // CupMatches.test("champions","final","Liverpool FC")
    test: async(compType,phase,opponent)=>{
        const isLeague=phase.startsWith('league_')||phase.startsWith('conf_');
        const isPlayoff=phase.startsWith('playoff_');
        const isKnock=!isLeague&&!isPlayoff&&compType!=='copa';
        const isFinal=phase==='final'||phase==='copa_final';
        const md=parseInt(phase.replace(/[^0-9]/g,''))||1;
        const fake={id:'test_'+Date.now(),compType,phase,opponent:opponent||'Bayern München',
            isLeaguePhase:isLeague,isPlayoff,isKnockout:isKnock,isFinal,matchday:md,isHome:md%2===1,played:false};
        await showAnnouncementModal(fake);
        const r=simCupMatch(fake);
        await showResultModal(fake,r,{advances:r.win,leaguePhaseEnd:false});
    }
};

function boot(){
    if(!window.gameLogic){setTimeout(boot,700);return;}
    const waitComp=(n=0)=>{
        if(getComp()||n>25){
            initCupCalendar();
            hookSimulateWeek();
            console.log('✅ injector-cup-matches.js v3 LISTO');
            console.log('   Test: CupMatches.test("champions","league_md1","Bayern München")');
        }else{
            setTimeout(()=>waitComp(n+1),400);
        }
    };
    waitComp();
}

boot();
