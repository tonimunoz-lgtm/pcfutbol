// ============================================================
// injector-cup-matches.js  v4.0 — FIREBASE COMPATIBLE
//
// TODO el estado se guarda en gameState.cupData
// que viaja a Firebase junto con el resto del juego.
// NUNCA se usa localStorage directamente.
//
// FORMATO REAL UEFA 2025-26:
//   Champions/Europa: fase liga 36 equipos, 8 jornadas
//     · Top 8  → Octavos directos
//     · 9-24   → Play-off → Octavos
//     · 25-36  → Eliminados
//   Conference: fase liga 6 jornadas, mismos cortes
//   Eliminatorias: ida + vuelta (excepto final)
//   Copa del Rey: solo primera/segunda
//
// FIXES vs versión anterior:
//   ✅ Sin localStorage — todo en gameState.cupData
//   ✅ Solo genera partidos si el equipo está clasificado
//   ✅ Copa solo en primera/segunda (no RFEF)
//   ✅ Resto de 35 equipos simulan sus partidos cada jornada
//   ✅ Ingresos de taquilla en partidos en casa
// ============================================================

console.log('🏆 injector-cup-matches.js v4 cargando...');

// ============================================================
// CONFIG VISUAL
// ============================================================
const CUP_CONFIG = {
    champions: {
        name:'UEFA Champions League', shortName:'Champions League',
        emoji:'⭐', color:'#1E5AC8', accentColor:'#4a9eff',
        gradient:'linear-gradient(135deg,#0a0a2e 0%,#1a1a5e 50%,#0d3b8c 100%)'
    },
    europaLeague: {
        name:'UEFA Europa League', shortName:'Europa League',
        emoji:'🟠', color:'#FF8C00', accentColor:'#ffaa33',
        gradient:'linear-gradient(135deg,#1a0d00 0%,#3d1f00 50%,#7a3d00 100%)'
    },
    conferenceLague: {
        name:'UEFA Conference League', shortName:'Conference League',
        emoji:'🟢', color:'#00B464', accentColor:'#00d478',
        gradient:'linear-gradient(135deg,#001a0d 0%,#003d1f 50%,#007a3d 100%)'
    },
    copa: {
        name:'Copa del Rey', shortName:'Copa del Rey',
        emoji:'🥇', color:'#FFD700', accentColor:'#FFD700',
        gradient:'linear-gradient(135deg,#1a1500 0%,#3d3000 50%,#7a6000 100%)'
    }
};

const PHASE_NAMES = {
    groups_md1:'Fase Liga — Jornada 1', groups_md2:'Fase Liga — Jornada 2',
    groups_md3:'Fase Liga — Jornada 3', groups_md4:'Fase Liga — Jornada 4',
    groups_md5:'Fase Liga — Jornada 5', groups_md6:'Fase Liga — Jornada 6',
    groups_md7:'Fase Liga — Jornada 7', groups_md8:'Fase Liga — Jornada 8',
    playoff_leg1:'Play-off — Ida',      playoff_leg2:'Play-off — Vuelta',
    round16:'Octavos de Final',         quarterfinals:'Cuartos de Final',
    semifinals:'Semifinales',           final:'GRAN FINAL',
    copa_r1:'Copa del Rey — 1ª Ronda',  copa_r32:'Copa del Rey — Dieciseisavos',
    copa_r16:'Copa del Rey — Octavos',  copa_qf:'Copa del Rey — Cuartos',
    copa_sf:'Copa del Rey — Semifinal', copa_final:'Copa del Rey — FINAL'
};

// ============================================================
// POOLS DE RIVALES REALES 2025-26 (35 por competición)
// ============================================================
const EU_POOLS = {
    champions: [
        'Liverpool FC','Arsenal FC','Manchester City','Chelsea FC',
        'Bayern München','Bayer Leverkusen','Eintracht Frankfurt','B. Dortmund',
        'Inter de Milán','Atalanta BC','Juventus FC','SSC Napoli',
        'PSG','AS Monaco','Olympique Marsella','PSV Eindhoven','Ajax',
        'Sporting CP','Union Saint-Gilloise','Galatasaray SK','Slavia Praha',
        'Olympiacos','FC Porto','Benfica SL','Celtic FC','Rangers FC',
        'Red Bull Salzburg','Shakhtar','Dinamo Zagreb',
        'Fenerbahçe SK','Lech Poznań','FC Midtjylland','Club Bruges','Gent','Qarabağ'
    ],
    europaLeague: [
        'AS Roma','SS Lazio','Fiorentina','Tottenham Hotspur','Manchester United',
        'Eintracht Frankfurt','Feyenoord','Ajax','Sporting CP','Benfica SL',
        'Fenerbahçe SK','Galatasaray SK','Olympique Lyonnais','RC Lens',
        'PAOK FC','Braga','Anderlecht','AZ Alkmaar','Club Bruges','Olympiacos',
        'Slavia Praha','RB Leipzig','Sampdoria','FC Sheriff','FC Midtjylland',
        'Rangers FC','Celtic FC','Dinamo Zagreb','Sturm Graz',
        'Malmö FF','Qarabağ','Shakhtar','Ferencváros','Ludogorets','Partizan'
    ],
    conferenceLague: [
        'Chelsea FC','Fiorentina','Real Sociedad','Club Bruges','Gent',
        'AZ Alkmaar','PAOK FC','Olympiacos','Fenerbahçe SK','Braga',
        'FC Midtjylland','Lech Poznań','Molde FK','Hearts FC','Hammarby',
        'Servette FC','FC Basel','Partizan','HJK Helsinki','Ferencváros',
        'Shamrock Rovers','Slavia Praha','Sparta Praha','FC Sheriff',
        'Ararat-Armenia','Ludogorets','Dinamo Minsk','Vojvodina',
        'Zrinjski','Tre Penne','FC Prishtina','FC La Fiorita','Dudelange',
        'Lincoln Red Imps','Linfield'
    ]
};

// ============================================================
// ACCESO AL ESTADO — todo en gameState.cupData
//
// IMPORTANTE: getGameState() devuelve una COPIA (JSON.parse).
// Para escribir hay que usar updateGameState({cupData: ...}).
// Para leer se puede usar getGameState() o el objeto interno.
//
// Usamos un objeto en memoria _cupData sincronizado con
// updateGameState en cada escritura.
// ============================================================

// Cache en memoria — se sincroniza con gameState en cada save
let _cupData = null;

function getCupData() {
    if (_cupData) return _cupData;
    // Intentar cargar desde gameState (por si se cargó una partida guardada)
    const gs = window.gameLogic?.getGameState();
    if (gs?.cupData) {
        _cupData = gs.cupData;
    } else {
        _cupData = {};
    }
    return _cupData;
}

function flushCupData() {
    // Escribe directamente en el objeto gameState sin pasar por updateGameState
    // (evita bucles infinitos si updateGameState está hookeado)
    if (_cupData) {
        const gs = window.gameLogic?.getGameState();
        if (gs) gs.cupData = _cupData;
    }
}

function getCal() {
    return getCupData().calendar || [];
}

function saveCal(cal) {
    getCupData().calendar = cal;
    flushCupData();
}

function getField() {
    return getCupData().leagueField || null;
}

function saveField(f) {
    getCupData().leagueField = f;
    flushCupData();
}

function getGS() {
    return window.gameLogic?.getGameState();
}

function getCompState() {
    // Lee de gameState.compsData (gestionado por injector-competitions.js, persistido en Firebase)
    return window.gameLogic?.getGameState()?.compsData || null;
}
function saveCompState(c) {
    const gs = window.gameLogic?.getGameState();
    if (gs) gs.compsData = c;
}

// ============================================================
// INICIALIZACIÓN DEL CALENDARIO AL INICIO DE TEMPORADA
// ============================================================
function initCupCalendar() {
    const gs   = getGS();
    const comp = getCompState();
    if (!gs || !comp) return;

    // No regenerar si ya existe para esta temporada y equipo
    const d = getCupData();
    if (d.calSeason === comp.season && d.calTeam === comp.team && (d.calendar||[]).length > 0) {
        console.log('📅 Calendario copas ya existe para esta temporada');
        return;
    }

    const myTeam   = gs.team;
    const division = gs.division;
    const season   = comp.season;
    const cal      = [];

    // Debug info
    console.log(`🔍 Init copa: team=${myTeam}, division=${division}, euComp=${comp.europeanComp}, copaPhase=${comp.copaPhase}`);

    // ── EUROPA: SOLO si el equipo está clasificado ─────────
    const euComp = comp.europeanComp; // null si no clasificado
    if (euComp) {
        const isConf = euComp === 'conferenceLague';
        const numMd  = isConf ? 6 : 8;
        // Semanas de liga española en que caen las jornadas europeas
        // (la liga regular empieza en semana 1, las europeas en septiembre = ~jornada 4)
        const mdWeeks = isConf
            ? [4, 6, 9, 11, 14, 16]
            : [4, 6, 9, 11, 14, 17, 20, 23];

        // Fase liga: 8 (o 6) jornadas
        for (let md = 1; md <= numMd; md++) {
            cal.push({
                id: `eu_md${md}`,
                type: euComp,
                phase: `groups_md${md}`,
                afterLigaWeek: mdWeeks[md-1],
                isGroup: true,
                matchday: md,
                isHome: (md % 2 === 1), // jornadas impares en casa
                opponent: null,
                played: false, eliminated: false
            });
        }

        // Play-off de acceso a octavos (para equipos 9-24, se desbloquea tras fase liga)
        cal.push({ id:'eu_playoff_1', type:euComp, phase:'playoff_leg1', afterLigaWeek:25, isPlayoff:true, isHome:false, opponent:null, played:false, eliminated:false, locked:true });
        cal.push({ id:'eu_playoff_2', type:euComp, phase:'playoff_leg2', afterLigaWeek:26, isPlayoff:true, isHome:true,  opponent:null, played:false, eliminated:false, locked:true });

        // Eliminatorias: octavos, cuartos, semis (ida+vuelta) y final
        const rounds = [{p:'round16',w:28},{p:'quarterfinals',w:31},{p:'semifinals',w:34}];
        rounds.forEach(({p,w}) => {
            cal.push({ id:`eu_${p}_1`, type:euComp, phase:p, afterLigaWeek:w,   isKnockout:true, isHome:false, leg:1, opponent:null, played:false, eliminated:false, locked:true });
            cal.push({ id:`eu_${p}_2`, type:euComp, phase:p, afterLigaWeek:w+1, isKnockout:true, isHome:true,  leg:2, opponent:null, played:false, eliminated:false, locked:true });
        });
        cal.push({ id:'eu_final', type:euComp, phase:'final', afterLigaWeek:37, isKnockout:true, isFinal:true, isHome:false, opponent:null, played:false, eliminated:false, locked:true });

        // Tabla de 36 equipos para la fase liga
        const pool = [...(EU_POOLS[euComp]||EU_POOLS.europaLeague)].filter(n=>n!==myTeam);
        while (pool.length<35) pool.push('Rival '+pool.length);
        const rivals = pool.slice(0,35);
        const table = {};
        [myTeam,...rivals].forEach(n=>{
            table[n]={name:n,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0,isPlayer:n===myTeam};
        });
        // 8 rivales específicos del jugador (aleatorios)
        const shuffled=[...rivals].sort(()=>Math.random()-0.5);
        const myOpponents = shuffled.slice(0,8);
        // Pre-asignar rivales a las jornadas
        for (let md=1; md<=numMd; md++) {
            const m = cal.find(x=>x.id===`eu_md${md}`);
            if (m) m.opponent = myOpponents[md-1] || rivals[md-1];
        }
        saveField({ table, rivals, myOpponents, compType:euComp, team:myTeam });
        console.log(`🌍 ${euComp} calendario OK. Rivales:`, myOpponents.slice(0,3).join(', ')+'...');
    } else {
        console.log(`❌ ${gs.team} no clasificado para Europa → sin partidos europeos`);
    }

    // ── COPA DEL REY: solo primera/segunda ─────────────────
    // Copa: generar si es primera/segunda (aunque copaPhase no esté inicializada aún)
    const copaOk = (division==='primera'||division==='segunda') &&
                   comp.copaPhase !== 'eliminated' && comp.copaPhase !== 'champion';
    if (copaOk) {
        const isPrimera = division === 'primera';
        const rounds = isPrimera
            ? [{id:'copa_r32',  p:'copa_r32', w:8,  h:true},
               {id:'copa_r16',  p:'copa_r16', w:13, h:false},
               {id:'copa_qf',   p:'copa_qf',  w:18, h:true},
               {id:'copa_sf_1', p:'copa_sf',  w:24, h:false},
               {id:'copa_sf_2', p:'copa_sf',  w:26, h:true},
               {id:'copa_final',p:'copa_final',w:36, h:false, isFinal:true}]
            : [{id:'copa_r1',   p:'copa_r1',  w:6,  h:true},
               {id:'copa_r32',  p:'copa_r32', w:10, h:false},
               {id:'copa_r16',  p:'copa_r16', w:15, h:true},
               {id:'copa_qf',   p:'copa_qf',  w:20, h:false},
               {id:'copa_sf_1', p:'copa_sf',  w:25, h:true},
               {id:'copa_sf_2', p:'copa_sf',  w:27, h:false},
               {id:'copa_final',p:'copa_final',w:36, h:false, isFinal:true}];
        rounds.forEach(r => {
            cal.push({
                id:r.id, type:'copa', phase:r.p,
                afterLigaWeek:r.w, isHome:r.h,
                isFinal:r.isFinal||false,
                opponent:null, played:false, eliminated:false
            });
        });
        // Pre-asignar rival Copa (cambia cada ronda)
        cal.filter(m=>m.type==='copa').forEach(m=>{
            m.opponent = getCopaRival(division);
        });
        console.log(`🥇 Copa del Rey calendario OK (${division})`);
    } else {
        if (division!=='primera'&&division!=='segunda') {
            console.log(`❌ ${division} no participa en Copa del Rey`);
        } else {
            console.log(`⚠️ Copa: division=${division} copaPhase=${comp.copaPhase} → no se generan partidos copa`);
        }
    }

    cal.sort((a,b)=>a.afterLigaWeek-b.afterLigaWeek);
    d.calendar  = cal;
    d.calSeason = season;
    d.calTeam   = myTeam;
    flushCupData(); // CRÍTICO: persiste en gameState real
    console.log(`📅 Total: ${cal.length} partidos.`, cal.slice(0,3).map(m=>`${m.type}@J${m.afterLigaWeek}`).join(', ')+'...');
}

function getCopaRival(division) {
    const pool = division==='primera'
        ? ['Real Sociedad','CA Osasuna','Rayo Vallecano','Getafe CF','RCD Mallorca','CD Leganés','Girona FC','Sevilla FC','Valencia CF']
        : ['CD Cartagena','Burgos CF','SD Eibar','Real Zaragoza','Córdoba CF','UD Almería','SD Huesca'];
    return pool[Math.floor(Math.random()*pool.length)];
}

// ============================================================
// OBTENER PARTIDO PENDIENTE PARA ESTA SEMANA
// ============================================================
function getPendingMatch(week) {
    const cal  = getCal();
    const comp = getCompState();

    for (const m of cal) {
        if (m.played || m.eliminated) continue;
        if (m.afterLigaWeek !== week) continue;
        if (m.locked) continue; // esperando resultado de ronda anterior

        // Copa: verificar no eliminado
        if (m.type==='copa') {
            if (!comp?.copaPhase || comp.copaPhase==='eliminated' || comp.copaPhase==='champion') {
                m.eliminated=true; saveCal(cal); continue;
            }
        }

        // Europa: verificar no eliminado en knockouts
        if (m.isKnockout || m.isPlayoff) {
            if (comp?.europeanPhase==='eliminated') {
                m.eliminated=true; saveCal(cal); continue;
            }
        }

        return m;
    }
    return null;
}

// ============================================================
// SIMULAR JORNADA — los otros 35 equipos también juegan
// ============================================================
function simLeagueRound(myResult) {
    const field = getField();
    if (!field) return;

    const mt = field.team;
    const op = myResult.opponent;

    // Actualizar al jugador
    if (!field.table[mt]) field.table[mt]={name:mt,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0,isPlayer:true};
    const mySt=field.table[mt];
    mySt.pj++;mySt.gf+=myResult.myGoals;mySt.gc+=myResult.oppGoals;
    if(myResult.win){mySt.g++;mySt.pts+=3;}else if(myResult.draw){mySt.e++;mySt.pts++;}else{mySt.p++;}

    // Actualizar rival del jugador
    if(!field.table[op])field.table[op]={name:op,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0};
    const opSt=field.table[op];
    opSt.pj++;opSt.gf+=myResult.oppGoals;opSt.gc+=myResult.myGoals;
    if(myResult.win){opSt.p++;}else if(myResult.draw){opSt.e++;opSt.pts++;}else{opSt.g++;opSt.pts+=3;}

    // Simular partidos entre los otros equipos
    const others=[...field.rivals].filter(n=>n!==op).sort(()=>Math.random()-0.5);
    for(let i=0;i<others.length-1;i+=2){
        const a=others[i],b=others[i+1];
        if(!field.table[a])field.table[a]={name:a,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0};
        if(!field.table[b])field.table[b]={name:b,pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0};
        const ga=Math.floor(Math.random()*3),gb=Math.floor(Math.random()*3);
        field.table[a].pj++;field.table[a].gf+=ga;field.table[a].gc+=gb;
        field.table[b].pj++;field.table[b].gf+=gb;field.table[b].gc+=ga;
        if(ga>gb){field.table[a].g++;field.table[a].pts+=3;field.table[b].p++;}
        else if(ga===gb){field.table[a].e++;field.table[a].pts++;field.table[b].e++;field.table[b].pts++;}
        else{field.table[b].g++;field.table[b].pts+=3;field.table[a].p++;}
    }
    saveField(field);
}

function getMyLeaguePos() {
    const field=getField();
    if(!field)return 36;
    return Object.values(field.table)
        .sort((a,b)=>(b.pts-a.pts)||((b.gf-b.gc)-(a.gf-a.gc)))
        .findIndex(t=>t.isPlayer)+1;
}

// ============================================================
// SIMULAR PARTIDO DEL JUGADOR
// ============================================================
function simMatch(match) {
    const gs=getGS();
    const myRating = gs?.squad?.length
        ? Math.round(gs.squad.reduce((a,b)=>a+(b.overall||70),0)/gs.squad.length)
        : 75;

    const base={champions:82,europaLeague:76,conferenceLague:71,copa:70}[match.type]||73;
    const pmod={
        final:7,copa_final:6,playoffs:5,semifinals:4,quarterfinals:3,round16:2,
        groups_md8:2,groups_md7:1,copa_sf:3,copa_qf:2,copa_r16:1,copa_r32:0,copa_r1:-1
    }[match.phase]||0;
    const oppRating=base+pmod+(Math.floor(Math.random()*6)-3);
    const homeBonus=match.isHome?0.06:-0.03;
    const wp=Math.max(0.12,Math.min(0.82,0.46+(myRating-oppRating)/100+homeBonus));
    const r=Math.random();

    let myG,opG;
    if(r<wp){myG=Math.floor(Math.random()*3)+1;opG=Math.max(0,myG-1-Math.floor(Math.random()*2));}
    else if(r<wp+0.22){myG=opG=Math.floor(Math.random()*2)+1;}
    else{opG=Math.floor(Math.random()*3)+1;myG=Math.max(0,opG-1-Math.floor(Math.random()*2));}

    const win=myG>opG,draw=myG===opG;
    return {myGoals:myG,oppGoals:opG,win,draw,loss:!win&&!draw,
            myTeam:gs?.team,opponent:match.opponent,isHome:match.isHome};
}

// ============================================================
// PROCESAR RESULTADO Y ACTUALIZAR ESTADO
// ============================================================
function processResult(match, result) {
    const cal=getCal();
    const comp=getCompState();
    const entry=cal.find(m=>m.id===match.id);
    if(entry){entry.played=true;entry.result={myGoals:result.myGoals,oppGoals:result.oppGoals};saveCal(cal);}

    // ── COPA DEL REY ───────────────────────────────────────
    if(match.type==='copa'){
        if(result.win){
            const order=['copa_r1','copa_r32','copa_r16','copa_qf','copa_sf','copa_final'];
            const idx=order.indexOf(match.phase);
            comp.copaPhase=order[idx+1]||'champion';
        }else{
            comp.copaPhase='eliminated';
            cal.filter(m=>m.type==='copa'&&!m.played).forEach(m=>m.eliminated=true);
        }
        comp.copaResults=[...(comp.copaResults||[]),{phase:match.phase,rival:match.opponent,myGoals:result.myGoals,oppGoals:result.oppGoals,win:result.win}];
        saveCal(cal);saveCompState(comp);
        return {advances:result.win};
    }

    // ── FASE LIGA EUROPEA ──────────────────────────────────
    if(match.isGroup){
        simLeagueRound(result);
        comp.europeanResults=[...(comp.europeanResults||[]),{md:match.matchday,rival:match.opponent,myGoals:result.myGoals,oppGoals:result.oppGoals}];

        const isConf=match.type==='conferenceLague';
        const totalMd=isConf?6:8;
        if(match.matchday===totalMd){
            const pos=getMyLeaguePos();
            comp.europeanLeaguePos=pos;
            const d=getCupData();
            d.leaguePhasePos=pos;
            d.leaguePhaseTable=Object.values(getField()?.table||{}).sort((a,b)=>(b.pts-a.pts)).slice(0,10);

            if(pos<=8){
                comp.europeanPhase='round16';
                // Desbloquear octavos directamente (saltarse play-off)
                ['eu_round16_1','eu_round16_2'].forEach(id=>{
                    const m=cal.find(x=>x.id===id);if(m)m.locked=false;
                });
                // Eliminar play-off
                ['eu_playoff_1','eu_playoff_2'].forEach(id=>{
                    const m=cal.find(x=>x.id===id);if(m)m.eliminated=true;
                });
                window.gameLogic?.addNews(`⭐ ¡Top 8 fase liga! Clasificados DIRECTOS para Octavos (${pos}º/36)`,'success');
            }else if(pos<=24){
                comp.europeanPhase='playoff';
                ['eu_playoff_1','eu_playoff_2'].forEach(id=>{
                    const m=cal.find(x=>x.id===id);if(m)m.locked=false;
                });
                window.gameLogic?.addNews(`⚠️ Posición ${pos}ª/36 → Jugamos Play-off de acceso a Octavos`,'info');
            }else{
                comp.europeanPhase='eliminated';
                cal.filter(m=>m.type!=='copa'&&(m.isKnockout||m.isPlayoff)&&!m.played).forEach(m=>m.eliminated=true);
                window.gameLogic?.addNews(`😞 Eliminados en fase liga (${pos}º/36 — top 24 avanzaban)`,'error');
            }
            saveCal(cal);
        }
        saveCompState(comp);
        return {advances:true};
    }

    // ── PLAY-OFF (ida/vuelta) ──────────────────────────────
    if(match.isPlayoff){
        const d=getCupData();
        d.playoff=d.playoff||{};
        if(match.id==='eu_playoff_1'){
            d.playoff.leg1={myGoals:result.myGoals,oppGoals:result.oppGoals,opponent:match.opponent};
            const leg2=cal.find(m=>m.id==='eu_playoff_2');
            if(leg2){leg2.locked=false;leg2.opponent=match.opponent;}
            saveCal(cal);saveCompState(comp);
            return {advances:null,isLeg:true};
        }else{
            const l1=d.playoff.leg1||{myGoals:0,oppGoals:0};
            const totMy=l1.myGoals+result.myGoals,totOp=l1.oppGoals+result.oppGoals;
            const adv=totMy>totOp;
            d.playoff.leg2={myGoals:result.myGoals,oppGoals:result.oppGoals,advances:adv};
            if(adv){
                comp.europeanPhase='round16';
                ['eu_round16_1','eu_round16_2'].forEach(id=>{const m=cal.find(x=>x.id===id);if(m)m.locked=false;});
                window.gameLogic?.addNews(`✅ Play-off ganado (${totMy}-${totOp} global) → ¡Octavos!`,'success');
            }else{
                comp.europeanPhase='eliminated';
                cal.filter(m=>m.type!=='copa'&&m.isKnockout&&!m.played).forEach(m=>m.eliminated=true);
                window.gameLogic?.addNews(`😞 Eliminados en Play-off (${totMy}-${totOp} global)`,'error');
            }
            saveCal(cal);saveCompState(comp);
            return {advances:adv,isLeg:true,global:`${totMy}-${totOp}`};
        }
    }

    // ── ELIMINATORIA EUROPEA ───────────────────────────────
    if(match.isKnockout){
        if(match.isFinal){
            comp.europeanPhase=result.win?'champion':'eliminated';
            if(result.win)window.gameLogic?.addNews(`🏆 ¡¡CAMPEONES DE LA ${(CUP_CONFIG[match.type]?.name||'').toUpperCase()}!!`,'success');
            saveCompState(comp);
            return {advances:result.win};
        }
        const d=getCupData();
        const kk=`ko_${match.phase}`;
        d[kk]=d[kk]||{opponent:match.opponent};
        if(match.leg===1){
            d[kk].leg1={myGoals:result.myGoals,oppGoals:result.oppGoals};
            const leg2Id=match.id.replace('_1','_2');
            const leg2=cal.find(m=>m.id===leg2Id);
            if(leg2){leg2.locked=false;leg2.opponent=match.opponent;}
            saveCal(cal);saveCompState(comp);
            return {advances:null,isLeg:true};
        }else{
            const l1=d[kk].leg1||{myGoals:0,oppGoals:0};
            const totMy=l1.myGoals+result.myGoals,totOp=l1.oppGoals+result.oppGoals;
            const adv=totMy>totOp;
            d[kk].leg2={myGoals:result.myGoals,oppGoals:result.oppGoals,advances:adv};
            if(adv){
                const nextMap={round16:'quarterfinals',quarterfinals:'semifinals',semifinals:'final'};
                const next=nextMap[match.phase];
                if(next==='final'){const m=cal.find(x=>x.id==='eu_final');if(m)m.locked=false;}
                else if(next){[`eu_${next}_1`,`eu_${next}_2`].forEach(id=>{const m=cal.find(x=>x.id===id);if(m)m.locked=false;});}
                comp.europeanPhase=next||'champion';
            }else{
                comp.europeanPhase='eliminated';
                cal.filter(m=>m.type!=='copa'&&m.isKnockout&&!m.played).forEach(m=>m.eliminated=true);
            }
            saveCal(cal);saveCompState(comp);
            return {advances:adv,isLeg:true,global:`${totMy}-${totOp}`};
        }
    }

    return {advances:result.win};
}

// ============================================================
// INGRESOS DE TAQUILLA EN PARTIDOS EN CASA
// ============================================================
function addMatchRevenue(match) {
    if (!match.isHome) return 0;
    const gs=getGS();
    if (!gs) return 0;
    const mult={champions:1.8,europaLeague:1.4,conferenceLague:1.2,copa:1.1}[match.type]||1.1;
    const att=Math.floor(Math.min(gs.stadiumCapacity, gs.stadiumCapacity*(0.65+gs.popularity/300)*mult));
    const rev=Math.floor(att*gs.ticketPrice*mult);
    if(window._financesSuppressBalance!==true) gs.balance+=rev;
    const cname=CUP_CONFIG[match.type]?.shortName||'Copa';
    const rs=rev>=1e6?(rev/1e6).toFixed(1)+'M€':Math.round(rev/1000)+'K€';
    window.gameLogic?.addNews(`💰 ${cname}: Taquilla +${rs} (${att.toLocaleString()} espectadores)`,'success');
    return rev;
}

// ============================================================
// GOLEADORES
// ============================================================
function genScorers(team,n,isMine){
    const gs=getGS();
    const out=[],used=new Set();
    for(let i=0;i<n;i++){
        let min;do{min=Math.floor(Math.random()*90)+1;}while(used.has(min));used.add(min);
        let name;
        if(isMine&&gs?.squad?.length){
            const pool=gs.squad.filter(p=>p.pos!=='POR'&&!p.isInjured);
            const arr=pool.length?pool:gs.squad;
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
// MODAL 1 — ANUNCIO DEL PARTIDO (HYPE)
// ============================================================
function showAnnouncementModal(match) {
    return new Promise(resolve=>{
        const cfg=CUP_CONFIG[match.type]||CUP_CONFIG.copa;
        const phaseName=PHASE_NAMES[match.phase]||match.phase;
        const locText=match.isHome?'🏟️ EN CASA':'✈️ A DOMICILIO';
        const myTeam=getGS()?.team||'Tu Equipo';

        const parts=Array.from({length:18},()=>{
            const sz=4+Math.random()*8,l=Math.random()*100,d=Math.random()*3,dur=3+Math.random()*4;
            return `<div style="position:absolute;width:${sz}px;height:${sz}px;background:${cfg.accentColor};border-radius:50%;left:${l}%;top:110%;animation:cu-flt ${dur}s ${d}s infinite ease-in;opacity:.7"></div>`;
        }).join('');

        const el=document.createElement('div');
        el.id='cupAnnModal';
        el.innerHTML=`<style>
#cupAnnModal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.97);display:flex;align-items:center;justify-content:center;z-index:999999;overflow:hidden;animation:cu-fi .4s ease}
@keyframes cu-fi{from{opacity:0}to{opacity:1}}
@keyframes cu-flt{0%{transform:translateY(0) rotate(0);opacity:.7}100%{transform:translateY(-110vh) rotate(720deg);opacity:0}}
@keyframes cu-pg{0%,100%{box-shadow:0 0 30px ${cfg.color}44}50%{box-shadow:0 0 70px ${cfg.color}99}}
@keyframes cu-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes cu-sp{0%{transform:scale(0) rotate(-180deg);opacity:0}60%{transform:scale(1.2) rotate(10deg);opacity:1}100%{transform:scale(1) rotate(0)}}
.cu-box{background:${cfg.gradient};border:2px solid ${cfg.color}88;border-radius:24px;padding:40px 36px;max-width:480px;width:90%;text-align:center;position:relative;animation:cu-pg 2s ease-in-out infinite;overflow:hidden}
.cu-comp{font-size:.82em;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${cfg.accentColor};margin-bottom:8px;animation:cu-up .5s .1s both}
.cu-logo{font-size:4em;margin:12px 0;animation:cu-sp .8s .2s both cubic-bezier(.175,.885,.32,1.275)}
.cu-phase{font-size:1.55em;font-weight:900;color:#fff;margin-bottom:6px;text-shadow:0 2px 20px ${cfg.color};animation:cu-up .5s .3s both}
.cu-vs{display:flex;align-items:center;justify-content:center;gap:14px;margin:18px 0;animation:cu-up .5s .4s both}
.cu-team{font-size:1.1em;font-weight:800;color:#fff;flex:1;padding:12px 8px;border-radius:12px;background:rgba(255,255,255,.08)}
.cu-team.h{border-left:3px solid ${cfg.accentColor}}.cu-team.a{border-right:3px solid ${cfg.accentColor}}
.cu-vsbdg{font-size:1.2em;font-weight:900;color:${cfg.accentColor};background:rgba(255,255,255,.1);width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid ${cfg.color};flex-shrink:0}
.cu-loc{font-size:.86em;color:rgba(255,255,255,.6);margin-bottom:22px;animation:cu-up .5s .5s both}
.cu-btn{background:linear-gradient(135deg,${cfg.color},${cfg.accentColor});color:${match.type==='copa'?'#000':'#fff'};border:none;padding:15px 48px;border-radius:50px;font-size:1.2em;font-weight:900;cursor:pointer;letter-spacing:1px;text-transform:uppercase;box-shadow:0 6px 30px ${cfg.color}66;transition:all .2s;width:100%;animation:cu-up .5s .6s both}
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
    if(match.type==='copa'){
        if(match.phase==='copa_final')return'🏆 La Copa del Rey en juego';
        if(match.phase==='copa_sf')return'🎯 Un paso de la final';
        return'⚔️ Eliminación directa';
    }
    if(match.isGroup){
        const isConf=match.type==='conferenceLague';
        const tot=isConf?6:8;
        if(match.matchday===tot)return'⚠️ Última jornada — la posición lo decide todo';
        if(match.matchday>=tot-1)return'🎯 Recta final de la fase liga';
        return`📊 Fase Liga jornada ${match.matchday}/${tot} — cada punto cuenta`;
    }
    if(match.isPlayoff)return'⚔️ Play-off de acceso a Octavos — eliminación';
    if(match.isFinal)return`🏆 La ${CUP_CONFIG[match.type]?.shortName} en juego`;
    if(match.phase==='semifinals')return'🎯 Un paso de la gran final';
    return'⚔️ Eliminación directa — el ganador avanza';
}

// ============================================================
// MODAL 2 — RESULTADO
// ============================================================
function showResultModal(match,result,processed){
    return new Promise(resolve=>{
        const cfg=CUP_CONFIG[match.type]||CUP_CONFIG.copa;
        const phaseName=PHASE_NAMES[match.phase]||match.phase;
        const myTeam=result.myTeam||'Tu Equipo';
        const win=result.win,draw=result.draw;
        const outLabel=win?'¡VICTORIA!':draw?'EMPATE':'DERROTA';
        const outColor=win?'#4CAF50':draw?'#FFD700':'#f44336';
        const outEmoji=win?'🎉':draw?'🤝':'😞';

        const goals=[...genScorers(myTeam,result.myGoals,true),...genScorers(match.opponent,result.oppGoals,false)].sort((a,b)=>a.min-b.min);
        const poss=win?52+Math.floor(Math.random()*14):draw?46+Math.floor(Math.random()*8):36+Math.floor(Math.random()*12);
        const shots={my:Math.max(result.myGoals*2,Math.floor(Math.random()*8)+5),opp:Math.max(result.oppGoals*2,Math.floor(Math.random()*8)+5)};

        // Banner contextual
        let banner='';
        if(match.isGroup){
            const isLast=match.matchday===(match.type==='conferenceLague'?6:8);
            if(isLast){
                const pos=processed.pos||getMyLeaguePos();
                const top=pos<=8,play=pos<=24;
                banner=`<div style="background:rgba(${top?'76,175,80':play?'255,165,0':'244,67,54'},.2);border:1px solid ${top?'#4CAF50':play?'#FFA500':'#f44336'};border-radius:10px;padding:12px;margin-top:14px;font-weight:bold;color:${top?'#4CAF50':play?'#FFA500':'#f44336'}">
                    ${top?`⭐ ¡Top 8! Clasificados DIRECTOS para Octavos (${pos}º/36)`:play?`⚠️ Posición ${pos}ª/36 → Play-off de acceso a Octavos`:`❌ Eliminados (${pos}º/36)`}</div>`;
            }else{
                const pos=getMyLeaguePos();
                const d=getCupData();
                const top5=Object.values(getField()?.table||{}).sort((a,b)=>b.pts-a.pts).slice(0,5);
                banner=`<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:12px;margin-top:14px">
                    <div style="color:${cfg.accentColor};font-size:.75em;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📊 Clasificación Fase Liga (top 5)</div>
                    ${top5.map((t,i)=>`<div style="display:flex;gap:8px;padding:3px 0;font-size:.83em;${t.isPlayer?'color:#FFD700;font-weight:bold':'color:rgba(255,255,255,.7)'}">
                        <span style="min-width:22px">${i+1}º</span><span style="flex:1">${t.name}</span><span>${t.pts}pts</span></div>`).join('')}
                    ${top5.find(t=>t.isPlayer)?'':`<div style="color:#FFD700;font-size:.8em;margin-top:6px">📍 Tú: ${pos}º de 36</div>`}
                    <div style="font-size:.7em;color:rgba(255,255,255,.4);margin-top:5px">Top 8→Octavos · 9-24→Play-off · 25-36→Eliminado</div>
                </div>`;
            }
        }else if((match.isPlayoff||match.isKnockout)&&processed.advances===null){
            banner=`<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:10px;margin-top:14px;text-align:center;color:rgba(255,255,255,.7);font-size:.88em">
                ⏳ Vuelta ${match.isHome?'en campo rival':'en casa'} — resultado ida: <strong style="color:#FFD700">${result.myGoals}-${result.oppGoals}</strong></div>`;
        }else if(match.isFinal&&processed.advances){
            banner=`<div style="background:rgba(255,215,0,.2);border:2px solid #FFD700;border-radius:10px;padding:18px;margin-top:14px;text-align:center"><div style="font-size:2.5em">🏆</div><div style="color:#FFD700;font-weight:900;font-size:1.3em">¡¡CAMPEONES!!</div></div>`;
        }else if((match.isPlayoff||match.isKnockout)&&processed.advances!==null&&processed.advances!==undefined){
            const gs=processed.global||`${result.myGoals}-${result.oppGoals}`;
            banner=processed.advances
                ?`<div style="background:rgba(76,175,80,.2);border:1px solid #4CAF50;border-radius:10px;padding:12px;margin-top:14px;color:#4CAF50;font-weight:bold">✅ ¡AVANZAMOS! Global: ${gs}</div>`
                :`<div style="background:rgba(244,67,54,.2);border:1px solid #f44336;border-radius:10px;padding:12px;margin-top:14px;color:#f44336;font-weight:bold">❌ Eliminados — Global: ${gs}</div>`;
        }else if(match.type==='copa'){
            banner=result.win
                ?(match.phase==='copa_final'
                    ?`<div style="background:rgba(255,215,0,.2);border:2px solid #FFD700;border-radius:10px;padding:18px;margin-top:14px;text-align:center"><div style="font-size:2em">🥇</div><div style="color:#FFD700;font-weight:900">¡COPA DEL REY!</div></div>`
                    :`<div style="background:rgba(76,175,80,.2);border:1px solid #4CAF50;border-radius:10px;padding:12px;margin-top:14px;color:#4CAF50;font-weight:bold">✅ ¡Pasamos a la siguiente ronda!</div>`)
                :`<div style="background:rgba(244,67,54,.2);border:1px solid #f44336;border-radius:10px;padding:12px;margin-top:14px;color:#f44336;font-weight:bold">❌ Eliminados de la Copa del Rey</div>`;
        }

        const el=document.createElement('div');
        el.id='cupResModal';
        el.innerHTML=`<style>
#cupResModal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.96);display:flex;align-items:center;justify-content:center;z-index:999998;animation:cr-fi .3s ease}
@keyframes cr-fi{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
#cupResModal .cr-box{background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid ${cfg.color}66;border-radius:20px;padding:26px 22px;max-width:500px;width:92%;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.8),0 0 40px ${cfg.color}22}
.cr-badge{text-align:center;font-size:.76em;font-weight:700;letter-spacing:2px;color:${cfg.accentColor};text-transform:uppercase;margin-bottom:5px}
.cr-phase{text-align:center;font-size:.88em;color:rgba(255,255,255,.55);margin-bottom:14px}
.cr-score{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:6px}
.cr-tm{flex:1;text-align:center}.cr-tn{font-size:.95em;font-weight:700;color:#fff;margin-bottom:8px}
.cr-g{font-size:3.8em;font-weight:900}.cr-sep{font-size:1.8em;color:rgba(255,255,255,.25)}
.cr-out{text-align:center;font-size:1.5em;font-weight:900;margin:10px 0 18px}
.cr-sec h4{color:${cfg.accentColor};font-size:.82em;text-transform:uppercase;letter-spacing:1px;margin:16px 0 8px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,.1)}
.cr-gi{display:flex;align-items:center;gap:8px;padding:7px;border-radius:7px;margin-bottom:5px;background:rgba(255,255,255,.05);border-left:3px solid}
.cr-gi.m{border-color:#4CAF50}.cr-gi.t{border-color:#f44336}
.cr-mn{color:#FFD700;font-weight:bold;min-width:32px;font-size:.88em}
.cr-sc{color:#fff;flex:1;font-weight:600}.cr-tt{color:rgba(255,255,255,.45);font-size:.82em}
.cr-sr{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:.88em;color:#fff}
.cr-sn{color:rgba(255,255,255,.5);flex:1;text-align:center}
.cr-btn{background:linear-gradient(135deg,${cfg.color},${cfg.accentColor});color:${match.type==='copa'?'#000':'#fff'};border:none;padding:13px 40px;border-radius:50px;font-size:1.05em;font-weight:900;cursor:pointer;width:100%;margin-top:16px;transition:all .2s;box-shadow:0 4px 20px ${cfg.color}55}
.cr-btn:hover{transform:translateY(-2px)}
</style>
<div class="cr-box">
<div class="cr-badge">${cfg.emoji} ${cfg.shortName}</div>
<div class="cr-phase">${phaseName}</div>
<div class="cr-score">
  <div class="cr-tm"><div class="cr-tn">${myTeam}</div><div class="cr-g" style="color:${outColor}">${result.myGoals}</div></div>
  <div class="cr-sep">–</div>
  <div class="cr-tm"><div class="cr-tn">${match.opponent}</div><div class="cr-g" style="color:${result.oppGoals>result.myGoals?'#f44336':'rgba(255,255,255,.4)'}">${result.oppGoals}</div></div>
</div>
<div class="cr-out" style="color:${outColor}">${outEmoji} ${outLabel}</div>
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

// ============================================================
// HOOK PRINCIPAL — interceptar window.simulateWeek
// ============================================================
function hookCupSimulateWeek(){
    const orig=window.simulateWeek;
    if(!orig||window._cupsHookedV4){if(!orig){setTimeout(hookCupSimulateWeek,500);return;}return;}
    window._cupsHookedV4=true;
    console.log('🏆 Cup-matches hook v4 activo (gameState, sin localStorage)');

    window.simulateWeek=async function(){
        const gs=getGS();
        if(!gs) return orig.apply(this,arguments);

        // Solo durante la temporada regular (no pretemporada)
        if(gs.seasonType !== 'regular') return orig.apply(this,arguments);

        const pending=getPendingMatch(gs.week);
        if(!pending) return orig.apply(this,arguments);

        // 1. Anuncio
        await showAnnouncementModal(pending);

        // 2. Simular
        const result=simMatch(pending);

        // 3. Taquilla si es en casa
        addMatchRevenue(pending);

        // 4. Procesar
        const processed=processResult(pending,result);

        // 5. Noticia
        const cfg=CUP_CONFIG[pending.type]||CUP_CONFIG.copa;
        const ph=PHASE_NAMES[pending.phase]||pending.phase;
        window.gameLogic?.addNews(
            `${cfg.emoji} ${cfg.shortName} — ${ph}: ${result.win?'¡Victoria':result.draw?'Empate':'Derrota'} ${result.myGoals}-${result.oppGoals} vs ${pending.opponent}`,
            result.win?'success':result.draw?'info':'error'
        );

        // 6. Refresh UI
        window.ui?.refreshUI?.(getGS());

        // 7. Resultado modal
        await showResultModal(pending,result,processed);

        // 8. Dashboard — la semana de liga NO avanza
        window.openPage?.('dashboard');
        return {cupMatch:true};
    };
}

// ============================================================
// API PÚBLICA
// ============================================================
window.CupMatches = {
    // Acceso directo al cupData interno (para que renderEuropa lo lea aunque gameState no lo tenga aún)
    getData: ()=> _cupData || getCupData(),
    getCalendar: ()=> getCal(),
    getLeagueField: ()=> getField(),
    
    status: ()=>{
        const d=getCupData();
        const cal=getCal();
        const gs=getGS();
        const comp=getCompState();
        console.log('📋 CupMatches status:');
        console.log('  week:', gs?.week, '| team:', gs?.team);
        console.log('  calSeason:', d?.calSeason, '| calTeam:', d?.calTeam);
        console.log('  calendar entries:', cal.length);
        const pending=cal.filter(m=>!m.played&&!m.eliminated&&!m.locked);
        console.log('  pendientes:', pending.slice(0,5).map(m=>`${m.type}/${m.phase}@J${m.afterLigaWeek}`));
        console.log('  leagueField:', !!d?.leagueField);
        console.log('  europeanComp:', comp?.europeanComp, '| copaPhase:', comp?.copaPhase);
        if(cal.length===0) console.warn('⚠️  Calendario vacío — llama CupMatches.reinit()');
    },
    reinit: ()=>{
        // Limpiar cupData en gameState
        const d=getCupData();
        if(d){d.calendar=[];d.calSeason=null;d.calTeam=null;d.leagueField=null;d.playoff=null;}
        const gs=getGS(); if(gs) gs.cupData={};
        _cupData={};
        // Limpiar también los resultados europeos/copa en comps_v2
        const comp=getCompState();
        if(comp){
            comp.europeanResults=[];
            comp.europeanKnockout=[];
            comp.europeanLeaguePos=null;
            comp.europeanPhase=comp.europeanComp?'groups':null;
            comp.copaResults=[];
            if(comp.copaPhase&&comp.copaPhase!=='eliminated'&&comp.copaPhase!=='champion'){
                comp.copaPhase='round32'; // reset a primera ronda
            }
            saveCompState(comp);
        }
        setTimeout(()=>{ initCupCalendar(); console.log('🔄 Reiniciado. Partidos:', getCal().length); }, 200);
    },
    // Test desde consola:
    // CupMatches.test("champions","groups_md1","Bayern München")
    // CupMatches.test("copa","copa_r32","Real Sociedad")
    // CupMatches.test("champions","final","Liverpool FC")
    test: async(type,phase,opponent)=>{
        const isGroup=phase.startsWith('groups_');
        const isKnock=!isGroup&&type!=='copa';
        const md=parseInt(phase.replace(/[^0-9]/g,''))||1;
        const fake={id:'test_'+Date.now(),type,phase,isGroup,isKnockout:isKnock,isFinal:phase==='final'||phase==='copa_final',
            matchday:md,isHome:md%2===1,opponent:opponent||'Bayern München',played:false};
        await showAnnouncementModal(fake);
        const r=simMatch(fake);
        await showResultModal(fake,r,{advances:r.win});
    }
};

// ============================================================
// BOOTSTRAP
// ============================================================
function boot(){
    if(!window.gameLogic){setTimeout(boot,700);return;}

    // Hook en selectTeamWithInitialSquad para detectar nueva partida
    // Garantiza que CupMatches se inicializa DESPUÉS de que el equipo esté listo
    const origSelect = window.gameLogic.selectTeamWithInitialSquad;
    if(origSelect && !window._cupsSelectHooked){
        window._cupsSelectHooked = true;
        window.gameLogic.selectTeamWithInitialSquad = async function(...args){
            const result = await origSelect.apply(this, args);
            // Esperar el evento de competitions (garantiza que comps_v2 está listo)
            // con fallback a 1500ms por si competitions no dispara el evento
            let _cupsInitDone = false;
            const onCompReady = () => {
                if (_cupsInitDone) return;
                _cupsInitDone = true;
                window.removeEventListener('competitionsReady', onCompReady);
                console.log('🏆 CupMatches: competitionsReady recibido, iniciando calendario...');
                window._cupsHookedV4 = false;
                _cupData = {};
                const gs = getGS();
                if(gs) gs.cupData = {};
                initCupCalendar();
                setTimeout(()=>{ hookCupSimulateWeek(); }, 1000);
            };
            window.addEventListener('competitionsReady', onCompReady);
            // Fallback si el evento no llega
            setTimeout(()=>{
                if (!_cupsInitDone) {
                    console.log('🏆 CupMatches: fallback init (sin evento competitionsReady)...');
                    onCompReady();
                }
            }, 1500);
            return result;
        };
        console.log('🏆 CupMatches: hook selectTeam instalado');
    }

    // Listener permanente para competitionsReady — registrado inmediatamente al arrancar
    // Cubre todos los casos: login, nueva partida, carga desde nube
    const onCompetitionsReady = (e) => {
        const comp2 = e.detail?.comp;
        const team  = e.detail?.team;
        if (!comp2 || !team) {
            console.warn('⚠️ CupMatches: competitionsReady sin datos válidos', e.detail);
            return;
        }
        // Evitar doble init si ya existe calendario para este equipo/temporada
        const existing = getCupData();
        if (existing.calTeam === team && existing.calSeason === comp2.season && (existing.calendar||[]).length > 0) {
            console.log('📅 CupMatches: calendario ya existe para', team);
            setTimeout(()=>{ hookCupSimulateWeek(); }, 500);
            return;
        }
        console.log('🏆 CupMatches: iniciando calendario para', team, '| euComp:', comp2.europeanComp);
        // Escribir comp en gameState para que initCupCalendar lo encuentre vía getCompState()
        const gs2 = getGS();
        if (gs2) {
            gs2.compsData = comp2;
            gs2.cupData = {};
        }
        window._cupsHookedV4 = false;
        _cupData = {};
        initCupCalendar();
        setTimeout(()=>{ hookCupSimulateWeek(); }, 1000);
    };
    window.addEventListener('competitionsReady', onCompetitionsReady);

    // Init si ya hay partida cargada (recarga F5 con sesión activa)
    const tryInit=(n=0)=>{
        const gs   = getGS();
        const comp = getCompState();
        const teamOk = gs?.team && gs.team !== 'null' && gs.team !== null;

        if(teamOk && comp){
            _cupData = gs.cupData || null;
            const existing = getCupData();
            if(!existing.calendar?.length || existing.calTeam !== gs.team || existing.calSeason !== comp.season){
                console.log('🔄 CupMatches: init para', gs.team);
                _cupData = {};
                initCupCalendar();
            } else {
                console.log('📅 CupMatches: calendario existente para', gs.team, '('+existing.calendar.length+' partidos)');
            }
            setTimeout(()=>{ hookCupSimulateWeek(); }, 1500);
            console.log('✅ injector-cup-matches.js v4 LISTO');
        } else if(n < 20){
            setTimeout(()=>tryInit(n+1), 500);
        } else {
            // Sin partida activa — el listener competitionsReady se encargará
            console.log('📋 CupMatches: sin partida activa — esperando competitionsReady...');
        }
    };
    tryInit();
}

boot();
