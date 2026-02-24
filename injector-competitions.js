// ============================================================
// injector-competitions.js  v2.0

// Sistema de Competiciones: Champions, Europa League,
// Conference League, Copa del Rey + Colores Clasificación
// + Playoff Segunda División + Playoff Ascenso RFEF
// ============================================================
//
// DATOS REALES LaLiga 2024-25 (clasificación final):
//  1. FC Barcelona          → Champions League 2025-26
//  2. Real Madrid CF        → Champions League 2025-26
//  3. Atlético de Madrid    → Champions League 2025-26
//  4. Athletic Club         → Champions League 2025-26
//  5. Villarreal CF         → Champions League 2025-26 (plaza extra rendimiento UEFA)
//  6. Real Betis Balompié   → Europa League 2025-26
//  7. RC Celta de Vigo      → Europa League 2025-26 (Barcelona ganó Copa, ya en UCL → plaza baja a 7º)
//  8. Rayo Vallecano        → Conference League 2025-26
// Descendidos: CD Leganés, UD Las Palmas, Real Valladolid
//
// Segunda División 2024-25:
//  Pos 1-2: Ascenso directo (Levante UD, Elche CF)
//  Pos 3-6: Playoff eliminatorio real (3ºvs6º y 4ºvs5º → final a doble partido)
//           Ganador: Real Oviedo
//  Pos 19-22: Descenso a Primera RFEF
// ============================================================

console.log('🏆 Sistema de Competiciones v2.0 cargando...');

// ============================================================
// TABLA HISTÓRICA REAL — LaLiga 2024-25
// Usada para detectar clasificaciones europeas al inicio de partida
// si se elige un equipo de Primera y la temporada es 2025/2026
// ============================================================
const LALIGA_2024_25_FINAL = {
    'FC Barcelona':        { pos: 1,  european: 'champions' },
    'Real Madrid CF':      { pos: 2,  european: 'champions' },
    'Real Madrid':         { pos: 2,  european: 'champions' },  // alias
    'Atlético de Madrid':  { pos: 3,  european: 'champions' },
    'Athletic Club':       { pos: 4,  european: 'champions' },
    'Villarreal CF':       { pos: 5,  european: 'champions' },
    'Villarreal':          { pos: 5,  european: 'champions' },  // alias
    'Real Betis Balompié': { pos: 6,  european: 'europaLeague' },
    'Real Betis':          { pos: 6,  european: 'europaLeague' }, // alias
    'RC Celta de Vigo':    { pos: 7,  european: 'europaLeague' },
    'Celta de Vigo':       { pos: 7,  european: 'europaLeague' }, // alias
    'Rayo Vallecano':      { pos: 8,  european: 'conferenceLague' },
    'Real Sociedad':       { pos: 9,  european: null },
    'Girona FC':           { pos: 10, european: null },
    'Girona':              { pos: 10, european: null },
    'Sevilla FC':          { pos: 11, european: null },
    'Sevilla':             { pos: 11, european: null },
    'RCD Espanyol':        { pos: 12, european: null },
    'Espanyol':            { pos: 12, european: null },
    'Getafe CF':           { pos: 13, european: null },
    'Getafe':              { pos: 13, european: null },
    'Deportivo Alavés':    { pos: 14, european: null },
    'Alavés':              { pos: 14, european: null },
    'RCD Mallorca':        { pos: 15, european: null },
    'Mallorca':            { pos: 15, european: null },
    'CA Osasuna':          { pos: 16, european: null },
    'Osasuna':             { pos: 16, european: null },
    'Valencia CF':         { pos: 17, european: null },
    'Valencia':            { pos: 17, european: null },
    'CD Leganés':          { pos: 18, european: null, relegated: true },
    'Leganés':             { pos: 18, european: null, relegated: true },
    'UD Las Palmas':       { pos: 19, european: null, relegated: true },
    'Las Palmas':          { pos: 19, european: null, relegated: true },
    'Real Valladolid':     { pos: 20, european: null, relegated: true },
    'Valladolid':          { pos: 20, european: null, relegated: true },
};

// ============================================================
// CONFIGURACIÓN DE ZONAS POR DIVISIÓN
// España 2025-26: 5 plazas UCL (rendimiento europeo), 2 UEL, 1 UECL
// ============================================================
const COMPETITION_CONFIG = {
    primera: {
        champions:        [1, 2, 3, 4, 5],
        europaLeague:     [6, 7],
        conferenceLague:  [8],
        relegate:         3,
    },
    segunda: {
        promoteAuto:    [1, 2],
        promotePlayoff: [3, 4, 5, 6],
        relegate:       4,
    },
    rfef_grupo1: {
        promoteAuto:    [1],
        promotePlayoff: [2, 3, 4, 5],
        relegate:       0
    },
    rfef_grupo2: {
        promoteAuto:    [1],
        promotePlayoff: [2, 3, 4, 5],
        relegate:       0
    }
};

// ============================================================
// COLORES DE ZONA
// ============================================================
const ZONE_COLORS = {
    champions:       { bg: 'rgba(30,90,200,0.25)',  border: '#1E5AC8', label: '🔵 Champions League' },
    europaLeague:    { bg: 'rgba(255,140,0,0.22)',  border: '#FF8C00', label: '🟠 Europa League' },
    conferenceLague: { bg: 'rgba(0,180,100,0.22)',  border: '#00B464', label: '🟢 Conference League' },
    promoteAuto:     { bg: 'rgba(50,200,50,0.25)',  border: '#32C832', label: '⬆️ Ascenso directo' },
    promotePlayoff:  { bg: 'rgba(180,150,0,0.22)',  border: '#B49600', label: '⭐ Playoff ascenso' },
    relegate:        { bg: 'rgba(200,40,40,0.25)',  border: '#C82828', label: '⬇️ Descenso' }
};

// ============================================================
// STORAGE
// ============================================================
const COMP_KEY    = 'comps_v2';
const PLAYOFF_KEY = 'playoff_v2';

const store = {
    getComp:      () => { try{ return JSON.parse(localStorage.getItem(COMP_KEY));    }catch(e){ return null; } },
    saveComp:     (s) => { try{ localStorage.setItem(COMP_KEY, JSON.stringify(s));   }catch(e){} },
    clearComp:    () => localStorage.removeItem(COMP_KEY),
    getPlayoff:   () => { try{ return JSON.parse(localStorage.getItem(PLAYOFF_KEY)); }catch(e){ return null; } },
    savePlayoff:  (s) => { try{ localStorage.setItem(PLAYOFF_KEY, JSON.stringify(s));}catch(e){} },
    clearPlayoff: () => localStorage.removeItem(PLAYOFF_KEY)
};

// ============================================================
// EQUIPOS EUROPEOS FICTICIOS
// ============================================================
const EU_TEAMS = {
    elite: [
        { name: 'Bayern München',       country: '🇩🇪', rating: 88 },
        { name: 'Paris Saint-Germain',  country: '🇫🇷', rating: 87 },
        { name: 'Manchester City',      country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 89 },
        { name: 'Inter de Milán',       country: '🇮🇹', rating: 85 },
        { name: 'Arsenal FC',           country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 84 },
        { name: 'Borussia Dortmund',    country: '🇩🇪', rating: 82 },
        { name: 'Juventus',             country: '🇮🇹', rating: 81 },
        { name: 'Liverpool FC',         country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 84 },
        { name: 'Benfica',              country: '🇵🇹', rating: 80 },
        { name: 'Ajax',                 country: '🇳🇱', rating: 79 },
    ],
    mid: [
        { name: 'AS Roma',              country: '🇮🇹', rating: 79 },
        { name: 'Bayer Leverkusen',     country: '🇩🇪', rating: 80 },
        { name: 'Feyenoord',            country: '🇳🇱', rating: 76 },
        { name: 'Tottenham Hotspur',    country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 78 },
        { name: 'Lazio',                country: '🇮🇹', rating: 77 },
        { name: 'Eintracht Frankfurt',  country: '🇩🇪', rating: 76 },
        { name: 'Sporting CP',          country: '🇵🇹', rating: 75 },
    ],
    small: [
        { name: 'Fiorentina',           country: '🇮🇹', rating: 74 },
        { name: 'Club Bruges',          country: '🇧🇪', rating: 73 },
        { name: 'PAOK',                 country: '🇬🇷', rating: 70 },
        { name: 'Braga',                country: '🇵🇹', rating: 71 },
        { name: 'Fenerbahçe',           country: '🇹🇷', rating: 72 },
    ]
};

function getEUPool(comp) {
    if (comp === 'champions')      return [...EU_TEAMS.elite];
    if (comp === 'europaLeague')   return [...EU_TEAMS.elite.slice(5), ...EU_TEAMS.mid];
    return [...EU_TEAMS.mid.slice(3), ...EU_TEAMS.small];
}

// ============================================================
// COPA DEL REY — POOLS DE RIVALES
// ============================================================
const COPA_POOLS = {
    primera: ['Real Madrid CF','Atlético de Madrid','Athletic Club','Villarreal CF','Real Sociedad',
              'Real Betis Balompié','Sevilla FC','Valencia CF','RC Celta de Vigo','RCD Espanyol',
              'Girona FC','Rayo Vallecano','CA Osasuna','Getafe CF','RCD Mallorca'],
    segunda: ['UD Almería','Real Zaragoza','Burgos CF','Cádiz CF','SD Eibar','Málaga CF',
              'Córdoba CF','CD Castellón','Levante UD','Elche CF','Real Oviedo'],
    rfef:    ['CD Lugo','CF Talavera','Racing de Ferrol','SD Ponferradina','Zamora CF',
              'AD Mérida','Unionistas CF','CD Arenteiro']
};

function pickFrom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

function buildCopaOpponents(division) {
    if (division === 'primera') return {
        round32: pickFrom(COPA_POOLS.segunda),
        round16:  pickFrom(COPA_POOLS.primera),
        quarters: pickFrom(COPA_POOLS.primera),
        semis:    pickFrom(COPA_POOLS.primera),
        final:    pickFrom(COPA_POOLS.primera)
    };
    return {
        round1:   pickFrom(COPA_POOLS.rfef),
        round32:  pickFrom(COPA_POOLS.primera),
        round16:  pickFrom(COPA_POOLS.primera),
        quarters: pickFrom(COPA_POOLS.primera),
        semis:    pickFrom(COPA_POOLS.primera),
        final:    pickFrom(COPA_POOLS.primera)
    };
}

// ============================================================
// HELPERS: NOMBRES Y SIMULACIÓN
// ============================================================
function compName(c)  { return { champions:'Champions League', europaLeague:'Europa League', conferenceLague:'Conference League' }[c] || 'Europa'; }
function compEmoji(c) { return { champions:'⭐', europaLeague:'🟠', conferenceLague:'🟢' }[c] || '🌍'; }
function phaseName(p) { return { round1:'1ª Ronda Copa', round32:'Dieciseisavos Copa', round16:'Octavos', quarters:'Cuartos', semis:'Semifinales', final:'Final', champion:'CAMPEÓN', quarterfinals:'Cuartos de final', semifinals:'Semifinales de Europa' }[p] || p; }

function getMyRating() {
    try {
        const sq = window.gameLogic?.getGameState()?.squad || [];
        if (!sq.length) return 75;
        return Math.round(sq.reduce((a,b) => a+(b.overall||70), 0) / sq.length);
    } catch(e) { return 75; }
}

function simMatch(myR, oppR, homeBonus=0.04) {
    const diff = (myR - oppR) / 100;
    const prob = Math.max(0.12, Math.min(0.82, 0.46 + diff + homeBonus));
    const r = Math.random();
    let mg, og;
    if (r < prob) {
        mg = Math.floor(Math.random()*3)+1; og = Math.max(0, mg-1-Math.floor(Math.random()*2));
    } else if (r < prob+0.22) {
        mg = Math.floor(Math.random()*2)+1; og = mg;
    } else {
        og = Math.floor(Math.random()*3)+1; mg = Math.max(0, og-1-Math.floor(Math.random()*2));
    }
    return { myGoals: mg, oppGoals: og };
}

function updateSt(st, a, b, ga, gb) {
    [a,b].forEach(n => { if(!st[n]) st[n]={pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}; });
    st[a].pj++; st[a].gf+=ga; st[a].gc+=gb;
    st[b].pj++; st[b].gf+=gb; st[b].gc+=ga;
    if(ga>gb){ st[a].g++; st[a].pts+=3; st[b].p++; }
    else if(ga===gb){ st[a].e++; st[a].pts++; st[b].e++; st[b].pts++; }
    else{ st[b].g++; st[b].pts+=3; st[a].p++; }
}

function sortSt(st) {
    return Object.entries(st).sort((a,b)=>{
        const pd = b[1].pts-a[1].pts; if(pd!==0) return pd;
        return (b[1].gf-b[1].gc)-(a[1].gf-a[1].gc);
    });
}

// ============================================================
// DETECTAR COMPETICIÓN EUROPEA AL INICIO
// ============================================================
function detectInitialEuropean(teamName, division, season) {
    if (division !== 'primera') return null;
    if (season === '2025/2026') {
        const data = LALIGA_2024_25_FINAL[teamName];
        if (data?.european) return data.european;
    }
    return null;
}

// ============================================================
// INICIALIZAR COMPETICIONES PARA UNA TEMPORADA
// ============================================================
function initCompetitionsForSeason(myTeam, division, season, forceEuropean) {
    const existing = store.getComp();
    if (existing && existing.season === season && existing.team === myTeam) return existing;

    const europeanComp = forceEuropean !== undefined
        ? forceEuropean
        : detectInitialEuropean(myTeam, division, season);

    const copaQualified = division === 'primera' || division === 'segunda';

    const comp = {
        team: myTeam, season, division,
        europeanComp,
        europeanPhase:          europeanComp ? 'groups' : null,
        europeanGroup:          europeanComp ? buildEUGroup(europeanComp, myTeam) : null,
        europeanGroupStandings: null,
        europeanResults:        [],
        europeanKnockout:       [],
        copaQualified,
        copaPhase:     copaQualified ? (division === 'primera' ? 'round32' : 'round1') : null,
        copaResults:   [],
        copaOpponents: copaQualified ? buildCopaOpponents(division) : {}
    };

    if (comp.europeanGroup) {
        comp.europeanGroupStandings = initGroupSt(comp.europeanGroup);
    }

    store.saveComp(comp);
    console.log(`🏆 Comp init: ${myTeam} | Europa: ${europeanComp||'—'} | Copa: ${comp.copaPhase||'—'}`);
    return comp;
}

// ============================================================
// GRUPOS EUROPEOS
// ============================================================
function buildEUGroup(comp, myTeam) {
    const pool = getEUPool(comp).filter(t => t.name !== myTeam);
    return [{ name: myTeam, country: '🇪🇸', rating: 80, isPlayer: true },
            ...pool.sort(()=>Math.random()-0.5).slice(0,3)];
}

function initGroupSt(group) {
    const s = {}; group.forEach(t=>{ s[t.name]={pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}; }); return s;
}

function simulateGroupPhase(myTeam) {
    const comp = store.getComp();
    if (!comp?.europeanGroup) return;
    const rivals = comp.europeanGroup.filter(t=>!t.isPlayer);
    const myR = getMyRating();
    const results = [];

    rivals.forEach(rival => {
        const r1 = simMatch(myR, rival.rating, 0.05);
        updateSt(comp.europeanGroupStandings, myTeam, rival.name, r1.myGoals, r1.oppGoals);
        results.push({ jornada:'ida', rival:rival.name, myGoals:r1.myGoals, oppGoals:r1.oppGoals });
        const r2 = simMatch(myR, rival.rating, -0.02);
        updateSt(comp.europeanGroupStandings, myTeam, rival.name, r2.myGoals, r2.oppGoals);
        results.push({ jornada:'vuelta', rival:rival.name, myGoals:r2.myGoals, oppGoals:r2.oppGoals });
        rivals.forEach(other => {
            if (rival.name < other.name) {
                const rr = simMatch(rival.rating, other.rating);
                updateSt(comp.europeanGroupStandings, rival.name, other.name, rr.myGoals, rr.oppGoals);
            }
        });
    });

    comp.europeanResults = results;
    const sorted = sortSt(comp.europeanGroupStandings);
    const myPos = sorted.findIndex(([n])=>n===myTeam)+1;
    comp.europeanPhase = myPos <= 2 ? 'round16' : 'eliminated';
    const gl = window.gameLogic;
    if (myPos<=2) gl?.addNews(`🏆 ¡Clasificados para Octavos de la ${compName(comp.europeanComp)}! (${myPos}º grupo)`, 'success');
    else gl?.addNews(`😞 Eliminados fase grupos ${compName(comp.europeanComp)} (${myPos}º)`, 'error');
    store.saveComp(comp);
}

function simulateEUKnockout(phase, myTeam) {
    const comp = store.getComp();
    if (!comp) return;
    const pool = getEUPool(comp.europeanComp);
    const rival = pool[Math.floor(Math.random()*pool.length)];
    const r = simMatch(getMyRating(), rival.rating);
    comp.europeanKnockout.push({ phase, rival:rival.name, myGoals:r.myGoals, oppGoals:r.oppGoals });
    const order = ['round16','quarterfinals','semifinals','final'];
    const idx = order.indexOf(phase);
    const win = r.myGoals > r.oppGoals;
    if (win) {
        const next = order[idx+1];
        comp.europeanPhase = next || 'winner';
        window.gameLogic?.addNews(next
            ? `✅ ${compName(comp.europeanComp)}: Pasamos vs ${rival.name} ${r.myGoals}-${r.oppGoals}. ¡A ${phaseName(next)}!`
            : `🏆 ¡¡CAMPEONES DE LA ${compName(comp.europeanComp).toUpperCase()}!!`, 'success');
    } else {
        comp.europeanPhase = 'eliminated';
        window.gameLogic?.addNews(`❌ ${compName(comp.europeanComp)}: Eliminados en ${phaseName(phase)} vs ${rival.name} ${r.myGoals}-${r.oppGoals}`, 'error');
    }
    store.saveComp(comp);
}

// ============================================================
// COPA DEL REY
// ============================================================
function simulateCopa(myTeam, phase) {
    const comp = store.getComp();
    if (!comp) return;
    const opponent = comp.copaOpponents?.[phase] || pickFrom(COPA_POOLS.primera);
    const r = simMatch(getMyRating(), 70+Math.floor(Math.random()*16));
    comp.copaResults.push({ phase, opponent, myGoals:r.myGoals, oppGoals:r.oppGoals, advanced:r.myGoals>r.oppGoals });
    const order = ['round1','round32','round16','quarters','semis','final'];
    const idx = order.indexOf(phase);
    const win = r.myGoals > r.oppGoals;
    if (win) {
        const next = order[idx+1];
        comp.copaPhase = next || 'champion';
        if (!next) window.gameLogic?.addNews('🏆 ¡¡CAMPEONES DE LA COPA DEL REY!!', 'success');
        else window.gameLogic?.addNews(`✅ Copa: ¡A ${phaseName(next)}! Ganamos ${r.myGoals}-${r.oppGoals} al ${opponent}`, 'success');
    } else {
        comp.copaPhase = 'eliminated';
        window.gameLogic?.addNews(`❌ Copa del Rey: Eliminados en ${phaseName(phase)} vs ${opponent} ${r.myGoals}-${r.oppGoals}`, 'error');
    }
    store.saveComp(comp);
}

// ============================================================
// PLAYOFF SEGUNDA DIVISIÓN → PRIMERA
// Formato real: 3ºvs6º y 4ºvs5º → ganadores se enfrentan en final
// Todas las eliminatorias a doble partido. Sin penaltis, si hay empate
// en global gana el mejor clasificado en liga.
// ============================================================
function initSegundaPlayoff(myTeam, sortedAll, season) {
    const p3 = sortedAll[2]?.[0], p4 = sortedAll[3]?.[0],
          p5 = sortedAll[4]?.[0], p6 = sortedAll[5]?.[0];
    const inPlayoff = [p3,p4,p5,p6].includes(myTeam);
    const myPos = sortedAll.findIndex(([n])=>n===myTeam)+1;

    const po = {
        type: 'segunda', season, myTeam, myPos,
        directAscent: [sortedAll[0]?.[0], sortedAll[1]?.[0]],
        pos3:p3, pos4:p4, pos5:p5, pos6:p6,
        // SF: pos3 (mejor) vs pos6 (peor) — ida en campo del peor
        sf1: { teamA: p3, teamB: p6 }, // teamA = mejor posición
        sf2: { teamA: p4, teamB: p5 },
        sf1Result: null, sf2Result: null,
        finalResult: null, winner: null,
        myResult: myPos<=2 ? 'promoted_direct' : inPlayoff ? null : 'not_qualified',
        phase: (myPos<=2||!inPlayoff) ? 'done' : 'pending',
        simulated: false
    };

    store.savePlayoff(po);
    return po;
}

function simDoubleLeg(tA, tB, myTeam, myR) {
    // Ida en campo del peor (teamB). Vuelta en campo del mejor (teamA).
    function oneMatch(home, away) {
        const isMyHome = home===myTeam, isMyAway = away===myTeam;
        if (isMyHome||isMyAway) {
            const r = simMatch(myR, 68+Math.floor(Math.random()*14), isMyHome?0.04:-0.02);
            return { hg: isMyHome?r.myGoals:r.oppGoals, ag: isMyHome?r.oppGoals:r.myGoals };
        }
        return { hg: Math.floor(Math.random()*3), ag: Math.floor(Math.random()*3) };
    }
    const leg1 = oneMatch(tB, tA); // ida en campo del "peor" (tB)
    const leg2 = oneMatch(tA, tB); // vuelta en campo del "mejor" (tA)
    // Global: goles de tA = leg1.ag + leg2.hg; goles de tB = leg1.hg + leg2.ag
    const totalA = leg1.ag + leg2.hg;
    const totalB = leg1.hg + leg2.ag;
    // Si empate global, avanza el mejor clasificado (tA)
    const winner = totalA >= totalB ? tA : tB;
    return { leg1, leg2, totalA, totalB, winner, teamA:tA, teamB:tB };
}

function runSegundaPlayoff(myTeam) {
    const po = store.getPlayoff();
    if (!po || po.type!=='segunda') return po;
    const myR = getMyRating();

    po.sf1Result = simDoubleLeg(po.sf1.teamA, po.sf1.teamB, myTeam, myR);
    po.sf2Result = simDoubleLeg(po.sf2.teamA, po.sf2.teamB, myTeam, myR);
    po.finalResult = simDoubleLeg(po.sf1Result.winner, po.sf2Result.winner, myTeam, myR);
    po.winner = po.finalResult.winner;
    po.simulated = true; po.phase = 'done';

    if (!po.myResult) {
        const inFinal = [po.sf1Result.winner, po.sf2Result.winner].includes(myTeam);
        if (po.winner === myTeam) po.myResult = 'promoted_playoff';
        else if (inFinal) po.myResult = 'lost_final';
        else po.myResult = 'eliminated_sf';
    }

    store.savePlayoff(po);
    return po;
}

// ============================================================
// PLAYOFF RFEF → SEGUNDA
// Mini-ligas cruzadas round-robin (ida y vuelta)
// ============================================================
function initRFEFPlayoff(myTeam, sortedMyGroup, sortedOtherGroup, season) {
    const pool1 = sortedMyGroup.slice(1,5).map(([n])=>n);
    const pool2 = sortedOtherGroup.slice(1,5).map(([n])=>n);
    const miniA = [pool1[0], pool2[1], pool1[2], pool2[3]].filter(Boolean);
    const miniB = [pool1[1], pool2[0], pool1[3], pool2[2]].filter(Boolean);
    const myMini = miniA.includes(myTeam)?'A': miniB.includes(myTeam)?'B':null;

    const isDirectA = sortedMyGroup[0]?.[0]===myTeam || sortedOtherGroup[0]?.[0]===myTeam;

    const po = {
        type:'rfef', season, myTeam,
        directAscent1: sortedMyGroup[0]?.[0],
        directAscent2: sortedOtherGroup[0]?.[0],
        miniA: { teams:miniA, standings:initMiniSt(miniA), matches:genMiniMatches(miniA), simulated:false },
        miniB: { teams:miniB, standings:initMiniSt(miniB), matches:genMiniMatches(miniB), simulated:false },
        myMini,
        winnerA:null, winnerB:null,
        myResult: isDirectA ? 'promoted_direct' : myMini ? null : 'not_qualified',
        phase: (isDirectA||!myMini) ? 'done' : 'pending',
        simulated: false
    };

    store.savePlayoff(po);
    return po;
}

function initMiniSt(teams) {
    const s={}; teams.forEach(t=>{ s[t]={pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}; }); return s;
}

function genMiniMatches(teams) {
    const m=[];
    for(let i=0;i<teams.length;i++) for(let j=i+1;j<teams.length;j++) {
        m.push({home:teams[i],away:teams[j],played:false,hg:null,ag:null});
        m.push({home:teams[j],away:teams[i],played:false,hg:null,ag:null});
    }
    return m;
}

function simMiniLeague(mini, myTeam, myR) {
    mini.matches.forEach(m=>{
        if(m.played) return;
        let hg,ag;
        const isMe = m.home===myTeam||m.away===myTeam;
        if(isMe) {
            const isH=m.home===myTeam;
            const r=simMatch(myR, 68+Math.floor(Math.random()*14), isH?0.04:-0.02);
            hg=isH?r.myGoals:r.oppGoals; ag=isH?r.oppGoals:r.myGoals;
        } else { hg=Math.floor(Math.random()*3); ag=Math.floor(Math.random()*3); }
        m.played=true; m.hg=hg; m.ag=ag;
        updateSt(mini.standings, m.home, m.away, hg, ag);
    });
    mini.simulated=true; return mini;
}

function runRFEFPlayoff(myTeam) {
    const po = store.getPlayoff();
    if(!po||po.type!=='rfef') return po;
    const myR = getMyRating();
    po.miniA = simMiniLeague(po.miniA, myTeam, myR);
    po.miniB = simMiniLeague(po.miniB, myTeam, myR);
    po.winnerA = sortSt(po.miniA.standings)[0]?.[0];
    po.winnerB = sortSt(po.miniB.standings)[0]?.[0];
    po.simulated=true; po.phase='done';
    if(!po.myResult)
        po.myResult = (myTeam===po.winnerA||myTeam===po.winnerB) ? 'promoted_playoff' : 'eliminated';
    store.savePlayoff(po);
    return po;
}

function generateFakeOtherGroup(groupKey) {
    const FAKE = {
        rfef_grupo1: ['AD Mérida','Arenas Club','Athletic Club B','Barakaldo CF','CA Osasuna B','CD Arenteiro','CD Guadalajara','CD Lugo','CD Tenerife','CF Talavera de la Reina','CP Cacereño','Ourense CF','Pontevedra CF','Racing Club de Ferrol','RC Celta Fortuna','Real Avilés Industrial','Real Madrid Castilla','SD Ponferradina','Unionistas de Salamanca CF','Zamora CF'],
        rfef_grupo2: ['AD Alcorcón','Algeciras CF','Atlético Sanluqueño CF','Antequera CF','Betis Deportivo Balompié','Atlético de Madrid B','CD Eldense','CD Teruel','CE Europa','CE Sabadell FC','FC Cartagena','Gimnàstic de Tarragona','Hércules CF','UD Ibiza','Marbella FC','Real Murcia CF','SD Tarazona','Sevilla Atlético','CD Castellón B','Villarreal CF B']
    };
    const teams = FAKE[groupKey] || [];
    let pts=55;
    return teams.map(name=>{
        const p=pts; pts-=2+Math.floor(Math.random()*3);
        const gf=30+Math.floor(Math.random()*30), gc=20+Math.floor(Math.random()*25);
        return [name,{pj:38,pts:p,gf,gc,g:Math.floor(p/3),e:p%3,p:38-Math.floor(p/3)-(p%3)}];
    });
}

// ============================================================
// COLOREADO DE TABLA DE CLASIFICACIÓN
// ============================================================
function updateStandingsColors() {
    const state = window.gameLogic?.getGameState();
    if (!state?.standings) return;
    const division = state.division;
    const cfg = COMPETITION_CONFIG[division] || {};
    const total = Object.keys(state.standings).length;

    const rows = document.querySelectorAll('#standingsTable tr, .standings-table tbody tr');
    rows.forEach((row, idx) => {
        const pos = idx+1;
        row.style.background = ''; row.style.borderLeft = '';
        const apply = zone => {
            row.style.background  = ZONE_COLORS[zone].bg;
            row.style.borderLeft  = `4px solid ${ZONE_COLORS[zone].border}`;
        };
        if (division==='primera') {
            if (cfg.champions?.includes(pos))        apply('champions');
            else if (cfg.europaLeague?.includes(pos)) apply('europaLeague');
            else if (cfg.conferenceLague?.includes(pos)) apply('conferenceLague');
            else if (cfg.relegate && pos > total-cfg.relegate) apply('relegate');
        } else if (division==='segunda') {
            if (cfg.promoteAuto?.includes(pos))       apply('promoteAuto');
            else if (cfg.promotePlayoff?.includes(pos)) apply('promotePlayoff');
            else if (cfg.relegate && pos > total-cfg.relegate) apply('relegate');
        } else if (division==='rfef_grupo1'||division==='rfef_grupo2') {
            if (cfg.promoteAuto?.includes(pos))       apply('promoteAuto');
            else if (cfg.promotePlayoff?.includes(pos)) apply('promotePlayoff');
        }

        // ── RESALTAR EQUIPO DEL JUGADOR ──────────────────────
        if (row.classList.contains('my-team-row')) {
            // Preservar el color de zona pero añadir borde izquierdo doble y fondo más intenso
            const currentBg = row.style.background;
            if (currentBg && currentBg !== '') {
                // Hay zona de color — intensificar fondo y añadir borde derecho
                row.style.background = currentBg.replace(/[\d.]+\)$/, '0.45)');
            } else {
                row.style.background = 'rgba(233,69,96,0.22)';
            }
            row.style.borderLeft   = '4px solid #e94560';
            row.style.borderRight  = '3px solid rgba(233,69,96,0.6)';
            row.style.fontWeight   = 'bold';
            // Añadir ⭐ al nombre si no lo tiene ya
            const nameCell = row.querySelector('.team-name, td:nth-child(2)');
            if (nameCell && !nameCell.textContent.includes('⭐')) {
                nameCell.innerHTML = '⭐ ' + nameCell.innerHTML;
            }
        } else {
            row.style.borderRight = '';
            row.style.fontWeight  = '';
        }
    });
    addLegend(division, cfg, total);
}

function addLegend(division, cfg, total) {
    const page = document.getElementById('standings');
    if (!page) return;
    document.getElementById('comp-legend')?.remove();
    const div = document.createElement('div');
    div.id = 'comp-legend';
    div.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;font-size:.82em;';
    const items = [];
    if (division==='primera') {
        const n = cfg.champions?.length||0;
        const eu = cfg.europaLeague?.length||0;
        const co = cfg.conferenceLague?.length||0;
        if(n)  items.push({...ZONE_COLORS.champions,       text:`Pos 1-${n}: ${ZONE_COLORS.champions.label}`});
        if(eu) items.push({...ZONE_COLORS.europaLeague,    text:`Pos ${n+1}-${n+eu}: ${ZONE_COLORS.europaLeague.label}`});
        if(co) items.push({...ZONE_COLORS.conferenceLague, text:`Pos ${n+eu+1}: ${ZONE_COLORS.conferenceLague.label}`});
        if(cfg.relegate) items.push({...ZONE_COLORS.relegate, text:`Pos ${total-cfg.relegate+1}-${total}: ${ZONE_COLORS.relegate.label}`});
    } else if (division==='segunda') {
        items.push({...ZONE_COLORS.promoteAuto,    text:`Pos 1-2: ${ZONE_COLORS.promoteAuto.label}`});
        items.push({...ZONE_COLORS.promotePlayoff, text:`Pos 3-6: ${ZONE_COLORS.promotePlayoff.label}`});
        if(cfg.relegate) items.push({...ZONE_COLORS.relegate, text:`Pos ${total-cfg.relegate+1}-${total}: ${ZONE_COLORS.relegate.label}`});
    } else {
        items.push({...ZONE_COLORS.promoteAuto,    text:`Pos 1: ${ZONE_COLORS.promoteAuto.label}`});
        items.push({...ZONE_COLORS.promotePlayoff, text:`Pos 2-5: ${ZONE_COLORS.promotePlayoff.label}`});
    }
    items.forEach(item => {
        const s = document.createElement('span');
        s.style.cssText = `background:${item.bg};border-left:3px solid ${item.border};padding:4px 10px;border-radius:4px;color:#fff;`;
        s.textContent = item.text; div.appendChild(s);
    });
    const tbl = page.querySelector('table');
    if (tbl) tbl.insertAdjacentElement('afterend', div);
    else page.appendChild(div);
}

// ============================================================
// UI: INYECCIÓN DE TABS EN CLASIFICACIÓN
// ============================================================
function injectCompUI() {
    const page = document.getElementById('standings');
    if (!page || document.getElementById('comp-tabs')) return;

    const state  = window.gameLogic?.getGameState();
    const division = state?.division || '';
    const isRFEF    = division.includes('rfef');
    const isSegunda = division === 'segunda';
    const hasPO     = isRFEF || isSegunda;
    const hasEU     = !isRFEF;

    const tabs = document.createElement('div');
    tabs.id = 'comp-tabs';
    tabs.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px;';

    let html = `<button class="ctab active" id="ctab-liga" onclick="window.showCompTab('liga')">⚽ Liga</button>`;
    if (hasPO) html += `<button class="ctab" id="ctab-playoff" onclick="window.showCompTab('playoff')">⬆️ Playoff Ascenso</button>`;
    if (hasEU) html += `<button class="ctab" id="ctab-europa" onclick="window.showCompTab('europa')">🏆 Europa</button>`;
    if (hasEU) html += `<button class="ctab" id="ctab-copa" onclick="window.showCompTab('copa')">🥇 Copa del Rey</button>`;
    tabs.innerHTML = html;

    const header = page.querySelector('.page-header');
    if (header) header.appendChild(tabs);
    else page.insertBefore(tabs, page.firstChild);

    // CSS
    if (!document.getElementById('comp-css')) {
        const s = document.createElement('style');
        s.id = 'comp-css';
        s.textContent = `
            .ctab{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;padding:6px 14px;border-radius:20px;cursor:pointer;font-size:.85em;transition:all .2s}
            .ctab:hover{background:rgba(255,255,255,.2)}
            .ctab.active{background:rgba(233,69,96,.6);border-color:#e94560}
            #comp-europa-panel,#comp-copa-panel,#comp-playoff-panel{display:none;padding:4px 0}
            #comp-europa-panel.on,#comp-copa-panel.on,#comp-playoff-panel.on{display:block}
            .cg-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:.88em}
            .cg-table th,.cg-table td{padding:7px;text-align:center;border-bottom:1px solid rgba(255,255,255,.1);color:#fff}
            .cg-table th{color:#FFD700;font-size:.8em;text-transform:uppercase}
            .ccard{background:rgba(255,255,255,.05);border-radius:8px;padding:10px 14px;margin:8px 0;border-left:3px solid #e94560}
            .ccard .ctitle{color:#FFD700;font-size:.82em;font-weight:bold;margin-bottom:4px}
            .cwin{color:#4CAF50}.cdraw{color:#FFD700}.closs{color:#f44336}
            .po-wrap{display:flex;flex-direction:column;gap:10px;margin-top:8px}
            .po-match{background:rgba(255,255,255,.07);border-radius:8px;padding:10px 14px;border-left:3px solid #B49600}
            .po-match .pm-title{color:#B49600;font-size:.8em;font-weight:bold;margin-bottom:6px}
            .po-row{display:flex;justify-content:space-between;padding:3px 0;font-size:.9em;color:#fff}
            .po-row.winner{color:#4CAF50;font-weight:bold}
            .po-row.loser{color:rgba(255,255,255,.4)}
            .po-info{color:#FFD700;font-size:.82em;margin-top:4px}
            .result-banner{border-radius:8px;padding:14px;text-align:center;margin-top:14px;border-width:2px;border-style:solid}
        `;
        document.head.appendChild(s);
    }

    // Paneles
    ['comp-europa-panel','comp-copa-panel','comp-playoff-panel'].forEach(id=>{
        if(!document.getElementById(id)){
            const p=document.createElement('div'); p.id=id; page.appendChild(p);
        }
    });

    // ID a la tabla
    const tbl = page.querySelector('table');
    if (tbl && !tbl.id) tbl.id = 'comp-liga-tbl';
}

window.showCompTab = function(tab) {
    document.querySelectorAll('.ctab').forEach(b=>b.classList.remove('active'));
    document.getElementById('ctab-'+tab)?.classList.add('active');

    const ligaTbl = document.getElementById('comp-liga-tbl');
    const legend  = document.getElementById('comp-legend');
    ['comp-europa-panel','comp-copa-panel','comp-playoff-panel'].forEach(id=>{
        document.getElementById(id)?.classList.remove('on');
    });

    if (tab==='liga') {
        if(ligaTbl) ligaTbl.style.display='';
        if(legend)  legend.style.display='';
        updateStandingsColors();
    } else {
        if(ligaTbl) ligaTbl.style.display='none';
        if(legend)  legend.style.display='none';
        if(tab==='europa')  { document.getElementById('comp-europa-panel')?.classList.add('on');  renderEuropa(); }
        if(tab==='copa')    { document.getElementById('comp-copa-panel')?.classList.add('on');    renderCopa(); }
        if(tab==='playoff') { document.getElementById('comp-playoff-panel')?.classList.add('on'); renderPlayoff(); }
    }
};

// ============================================================
// RENDER: EUROPA — formato real 2025-26 (fase liga 36 equipos)
// ============================================================
function renderEuropa() {
    const panel = document.getElementById('comp-europa-panel');
    if (!panel) return;
    const comp  = store.getComp();
    const state = window.gameLogic?.getGameState();

    if (!comp?.europeanComp) {
        panel.innerHTML = `<div style="text-align:center;padding:40px;color:rgba(255,255,255,.5)">
            <div style="font-size:3em">🌍</div>
            <div style="margin-top:10px;font-size:1em">Tu equipo no está clasificado para competición europea esta temporada.</div>
            <div style="font-size:.82em;margin-top:8px;color:rgba(255,255,255,.3)">Clasifica entre los 8 primeros de Primera División.</div>
        </div>`; return;
    }

    const cn  = compName(comp.europeanComp);
    const ce  = compEmoji(comp.europeanComp);
    const isConf = comp.europeanComp === 'conferenceLague';
    const totalMd = isConf ? 6 : 8;
    const myTeam  = comp.team;

    // Leer cupData: primero desde CupMatches (fuente directa), luego desde gameState (partida guardada)
    const cupData   = window.CupMatches?.getData() || state?.cupData || {};
    const field     = cupData.leagueField || null;
    const calendar  = cupData.calendar    || [];
    const mdJugadas = calendar.filter(m => m.type === comp.europeanComp && m.isGroup && m.played).length;

    let html = `<h3 style="color:#FFD700;margin:10px 0 4px">${ce} ${cn}</h3>`;

    // ── FASE LIGA (nuevo formato real) ──────────────────────
    const phaseLabel = comp.europeanLeaguePos
        ? `Fase Liga — Terminada (${mdJugadas}/${totalMd} jornadas)`
        : `Fase Liga — Jornada ${mdJugadas}/${totalMd}`;

    html += `<div style="color:rgba(255,255,255,.65);font-size:.82em;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span>📊 ${phaseLabel}</span>
        <span style="font-size:.78em;color:rgba(255,255,255,.4)">36 equipos</span>
    </div>`;

    // Leyenda de clasificación
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;font-size:.75em">
        <span style="background:rgba(30,90,200,.3);border-left:3px solid #1E5AC8;padding:3px 8px;border-radius:4px;color:#fff">1-8: Octavos directos</span>
        <span style="background:rgba(255,140,0,.2);border-left:3px solid #FF8C00;padding:3px 8px;border-radius:4px;color:#fff">9-24: Play-off</span>
        <span style="background:rgba(244,67,54,.15);border-left:3px solid #f44336;padding:3px 8px;border-radius:4px;color:#fff">25-36: Eliminados</span>
    </div>`;

    if (field?.table) {
        // Tabla con todos los equipos ordenados por puntos
        const sorted = Object.values(field.table).sort((a,b) => {
            const pd = b.pts - a.pts; if(pd!==0) return pd;
            return (b.gf-b.gc) - (a.gf-a.gc);
        });

        // Mostrar top 10 + posición del jugador si está fuera
        const myPos  = sorted.findIndex(t=>t.isPlayer) + 1;
        const showFull = sorted.length <= 10;
        const display  = showFull ? sorted : sorted.slice(0, 10);
        const myInTop  = myPos <= 10;

        html += `<table class="cg-table"><thead><tr>
            <th>Pos</th><th style="text-align:left">Equipo</th>
            <th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
        </tr></thead><tbody>`;

        display.forEach((t, i) => {
            const pos   = i + 1;
            const me    = t.isPlayer;
            const top8  = pos <= 8;
            const po    = pos <= 24 && pos > 8;
            const elim  = pos > 24;
            const rowBg = me
                ? 'background:rgba(233,69,96,.25);'
                : top8 ? 'background:rgba(30,90,200,.12);'
                : po   ? 'background:rgba(255,140,0,.08);'
                : '';
            const posIcon = top8 ? '🔵' : po ? '🟠' : '🔴';
            html += `<tr style="${rowBg}">
                <td style="font-size:.82em">${posIcon}${pos}</td>
                <td style="text-align:left;${me?'font-weight:bold;color:#FFD700':''}">${me?'⭐ ':''}${t.name}</td>
                <td>${t.pj}</td><td>${t.g}</td><td>${t.e}</td><td>${t.p}</td>
                <td>${t.gf}</td><td>${t.gc}</td>
                <td style="${(t.gf-t.gc)>=0?'color:#4CAF50':'color:#f44336'}">${t.gf-t.gc>0?'+':''}${t.gf-t.gc}</td>
                <td><strong>${t.pts}</strong></td>
            </tr>`;
        });

        // Si el jugador no está en el top 10, mostrar su posición al final
        if (!myInTop && !showFull) {
            const mt = sorted[myPos-1];
            html += `<tr style="border-top:2px dashed rgba(255,255,255,.2)"><td colspan="10" style="color:rgba(255,255,255,.4);font-size:.78em;padding:4px">... ${myPos-10} equipos ...</td></tr>`;
            html += `<tr style="background:rgba(233,69,96,.25)">
                <td style="font-size:.82em">${myPos<=8?'🔵':myPos<=24?'🟠':'🔴'}${myPos}</td>
                <td style="text-align:left;font-weight:bold;color:#FFD700">⭐ ${mt.name}</td>
                <td>${mt.pj}</td><td>${mt.g}</td><td>${mt.e}</td><td>${mt.p}</td>
                <td>${mt.gf}</td><td>${mt.gc}</td>
                <td style="${(mt.gf-mt.gc)>=0?'color:#4CAF50':'color:#f44336'}">${mt.gf-mt.gc>0?'+':''}${mt.gf-mt.gc}</td>
                <td><strong>${mt.pts}</strong></td>
            </tr>`;
        }
        html += `</tbody></table>`;
        if (!showFull) {
            html += `<div style="font-size:.75em;color:rgba(255,255,255,.35);text-align:center;margin-top:2px">Mostrando top 10 de 36 equipos · Tú: ${myPos}º</div>`;
        }
    } else {
        // Aún no hay datos (no se ha jugado ninguna jornada)
        html += `<div style="text-align:center;padding:20px;color:rgba(255,255,255,.4);font-size:.9em">
            📅 La fase liga comienza en la jornada 3.<br>
            <span style="font-size:.82em">Cada semana europea se intercala entre las jornadas de liga.</span>
        </div>`;
    }

    // ── TUS RESULTADOS EN FASE LIGA ─────────────────────────
    // Solo mostrar resultados que correspondan a jornadas realmente jugadas en el calendario actual
    const jugadas = calendar.filter(m => m.type === comp.europeanComp && m.isGroup && m.played);
    const jugadasMd = new Set(jugadas.map(m => m.matchday));
    const resultadosValidos = (comp.europeanResults||[]).filter(r => jugadasMd.has(r.md));

    if (resultadosValidos.length > 0) {
        html += `<div style="color:rgba(255,255,255,.65);font-size:.82em;font-weight:bold;margin:14px 0 6px">📋 Tus partidos jugados</div>`;
        resultadosValidos.forEach(r => {
            const w = r.myGoals > r.oppGoals, d = r.myGoals === r.oppGoals;
            const icon = w ? '✅' : d ? '🤝' : '❌';
            const loc  = r.md % 2 === 1 ? '🏟️' : '✈️';
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-radius:6px;margin-bottom:3px;background:rgba(255,255,255,.05);font-size:.86em">
                <span style="color:rgba(255,255,255,.5);min-width:28px">J${r.md} ${loc}</span>
                <span style="flex:1;color:rgba(255,255,255,.8)">vs ${r.rival}</span>
                <span style="${w?'color:#4CAF50':d?'color:#FFD700':'color:#f44336'};font-weight:bold">${icon} ${r.myGoals}-${r.oppGoals}</span>
            </div>`;
        });
    }

    // ── PRÓXIMOS PARTIDOS ───────────────────────────────────
    const pendingEu = calendar.filter(m => m.type===comp.europeanComp && !m.played && !m.eliminated && !m.locked).slice(0,3);
    if (pendingEu.length) {
        html += `<div style="color:rgba(255,255,255,.65);font-size:.82em;font-weight:bold;margin:14px 0 6px">📅 Próximos partidos</div>`;
        const phNames = {groups_md1:'Fase Liga J1',groups_md2:'Fase Liga J2',groups_md3:'Fase Liga J3',groups_md4:'Fase Liga J4',groups_md5:'Fase Liga J5',groups_md6:'Fase Liga J6',groups_md7:'Fase Liga J7',groups_md8:'Fase Liga J8',round16:'Octavos',quarterfinals:'Cuartos',semifinals:'Semis',final:'Final',playoff_leg1:'Play-off Ida',playoff_leg2:'Play-off Vuelta'};
        pendingEu.forEach(m => {
            const loc = m.isHome ? '🏟️ Casa' : '✈️ Fuera';
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:6px;margin-bottom:3px;background:rgba(255,255,255,.05);font-size:.86em">
                <span style="color:rgba(255,255,255,.5);min-width:28px">J${m.afterLigaWeek}</span>
                <span style="flex:1;color:#fff">vs ${m.opponent||'?'}</span>
                <span style="color:rgba(255,255,255,.4);font-size:.82em">${loc}</span>
            </div>`;
        });
    }

    // ── FASE ELIMINATORIA ───────────────────────────────────
    const hasKO = comp.europeanKO && Object.keys(comp.europeanKO).length > 0;
    if (hasKO) {
        html += `<div style="color:rgba(255,255,255,.65);font-size:.82em;font-weight:bold;margin:14px 0 6px">⚔️ Fase Eliminatoria</div>`;
        const koNames = {round16:'Octavos de Final',quarterfinals:'Cuartos de Final',semifinals:'Semifinales'};
        Object.entries(comp.europeanKO).forEach(([phase, data]) => {
            const l1=data.leg1, l2=data.leg2;
            const name=koNames[phase]||phase;
            html += `<div class="ccard" style="border-color:${data.leg2?.advances?'#4CAF50':'#f44336'}">
                <div class="ctitle">⚔️ ${name} — vs ${data.opponent}</div>`;
            if(l1) html+=`<div style="font-size:.86em;color:rgba(255,255,255,.7)">Ida: <strong style="${l1.myGoals>l1.oppGoals?'color:#4CAF50':l1.myGoals<l1.oppGoals?'color:#f44336':'color:#FFD700'}">${l1.myGoals}-${l1.oppGoals}</strong></div>`;
            if(l2){
                const totMy=(l1?.myGoals||0)+l2.myGoals, totOp=(l1?.oppGoals||0)+l2.oppGoals;
                html+=`<div style="font-size:.86em;color:rgba(255,255,255,.7)">Vuelta: <strong>${l2.myGoals}-${l2.oppGoals}</strong> · Global: <strong style="${totMy>totOp?'color:#4CAF50':'color:#f44336'}">${totMy}-${totOp}</strong></div>`;
                html+=`<div style="margin-top:4px;font-weight:bold;${l2.advances?'color:#4CAF50':'color:#f44336'}">${l2.advances?'✅ AVANZAMOS':'❌ ELIMINADOS'}</div>`;
            }else if(l1){
                html+=`<div style="font-size:.8em;color:rgba(255,255,255,.4);margin-top:4px">⏳ Vuelta pendiente</div>`;
            }
            html += `</div>`;
        });
    }

    // ── PLAY-OFF ────────────────────────────────────────────
    if (cupData.playoff) {
        const po=cupData.playoff;
        html+=`<div class="ccard" style="border-color:#FF8C00">
            <div class="ctitle">⚔️ Play-off acceso a Octavos</div>`;
        if(po.leg1) html+=`<div style="font-size:.86em;color:rgba(255,255,255,.7)">Ida: <strong>${po.leg1.myGoals}-${po.leg1.oppGoals}</strong></div>`;
        if(po.leg2){
            const totMy=(po.leg1?.myGoals||0)+po.leg2.myGoals,totOp=(po.leg1?.oppGoals||0)+po.leg2.oppGoals;
            html+=`<div style="font-size:.86em;color:rgba(255,255,255,.7)">Vuelta: <strong>${po.leg2.myGoals}-${po.leg2.oppGoals}</strong> · Global: <strong style="${totMy>totOp?'color:#4CAF50':'color:#f44336'}">${totMy}-${totOp}</strong></div>`;
            html+=`<div style="font-weight:bold;${po.leg2.advances?'color:#4CAF50':'color:#f44336'}">${po.leg2.advances?'✅ PASAMOS A OCTAVOS':'❌ ELIMINADOS'}</div>`;
        }else if(po.leg1){html+=`<div style="font-size:.8em;color:rgba(255,255,255,.4)">⏳ Vuelta pendiente</div>`;}
        html+=`</div>`;
    }

    // ── BANNER FINAL ────────────────────────────────────────
    if (comp.europeanPhase==='champion') {
        html+=`<div class="result-banner" style="background:rgba(255,215,0,.15);border-color:#FFD700"><div style="font-size:2em">🏆</div><div style="color:#FFD700;font-weight:bold;font-size:1.2em">¡CAMPEONES DE LA ${cn.toUpperCase()}!</div></div>`;
    } else if (comp.europeanPhase==='eliminated') {
        html+=`<div style="text-align:center;color:#f44336;padding:12px;margin-top:8px">😞 Eliminados de la ${cn}</div>`;
    }

    panel.innerHTML = html;
}

// ============================================================
// RENDER: COPA
// ============================================================
function renderCopa() {
    const panel = document.getElementById('comp-copa-panel');
    if (!panel) return;
    const comp  = store.getComp();
    const state = window.gameLogic?.getGameState();

    if (!comp?.copaQualified) {
        panel.innerHTML=`<div style="text-align:center;padding:40px;color:rgba(255,255,255,.5)"><div style="font-size:3em">🥇</div><div style="margin-top:10px">Tu equipo no participa en la Copa del Rey esta temporada.</div></div>`;
        return;
    }

    const phase=comp.copaPhase;
    const order=['round1','round32','round16','quarters','semis','final'];
    let html=`<h3 style="color:#FFD700;margin:10px 0 8px">🥇 Copa del Rey — ${state?.currentSeason||''}</h3>`;

    if (phase==='champion') {
        html+=`<div class="result-banner" style="background:rgba(255,215,0,.2);border-color:#FFD700;margin-bottom:12px"><div style="font-size:1.8em">🏆</div><div style="color:#FFD700;font-weight:bold;font-size:1.1em">¡CAMPEÓN DE LA COPA DEL REY!</div></div>`;
    } else if (phase==='eliminated') {
        const last=comp.copaResults?.[comp.copaResults.length-1];
        html+=`<div style="background:rgba(244,67,54,.12);border-left:3px solid #f44336;border-radius:6px;padding:10px 14px;margin-bottom:12px"><strong style="color:#f44336">❌ ELIMINADO</strong>${last?` <span style="color:rgba(255,255,255,.7);font-size:.88em">en ${phaseName(last.phase)} vs ${last.opponent} (${last.myGoals}-${last.oppGoals})</span>`:''}</div>`;
    } else {
        const nextOpp=comp.copaOpponents?.[phase];
        html+=`<div style="background:rgba(76,175,80,.12);border-left:3px solid #4CAF50;border-radius:6px;padding:10px 14px;margin-bottom:12px"><strong style="color:#4CAF50">✅ EN COMPETICIÓN</strong> <span style="color:rgba(255,255,255,.8);font-size:.88em;margin-left:8px">Próxima: <strong>${phaseName(phase)}</strong>${nextOpp?` · Rival posible: ${nextOpp}`:''}</span></div>`;
    }

    order.forEach(p=>{
        const res=comp.copaResults?.find(r=>r.phase===p);
        const opp=comp.copaOpponents?.[p];
        const isCurrent=p===phase&&!['eliminated','champion'].includes(phase);
        html+=`<div class="ccard" style="${isCurrent?'border-color:#FFD700':''}"><div class="ctitle">${phaseName(p)}</div>`;
        if(res){
            const w=res.myGoals>res.oppGoals;
            html+=`<div class="${w?'cwin':'closs'}">${w?'✅':'❌'} vs ${res.opponent}: <strong>${res.myGoals}-${res.oppGoals}</strong></div>`;
        } else if(isCurrent){
            html+=`<div style="color:rgba(255,255,255,.5);font-style:italic;font-size:.88em">⏳ Pendiente${opp?` — Rival: ${opp}`:''}</div>`;
        } else {
            html+=`<div style="color:rgba(255,255,255,.3);font-size:.85em">— No alcanzado</div>`;
        }
        html+=`</div>`;
    });

    panel.innerHTML = html;
}

// ============================================================
// RENDER: PLAYOFF
// ============================================================
function renderPlayoff() {
    const panel = document.getElementById('comp-playoff-panel');
    if (!panel) return;
    const state = window.gameLogic?.getGameState();
    if (!state) return;

    // Regenerar con standings actuales SOLO si el playoff no se ha jugado todavía
    const existing = store.getPlayoff();
    const alreadySimulated = existing?.simulated === true;
    if (!alreadySimulated) {
        const sorted = Object.entries(state.standings||{}).sort((a,b)=>(b[1].pts||0)-(a[1].pts||0));
        if (sorted.length > 0) {
            initPlayoffForDiv(state, sorted, state.currentSeason);
        }
    }

    const po = store.getPlayoff();
    if (!po) {
        panel.innerHTML=`<div style="text-align:center;padding:30px;color:rgba(255,255,255,.5)"><div style="font-size:2em">⬆️</div><div style="margin-top:10px">El playoff de ascenso se disputará al final de la temporada regular.</div></div>`;
        return;
    }

    if (po.type==='segunda') renderSegundaPlayoff(panel, po);
    else if (po.type==='rfef') renderRFEFPlayoff(panel, po);
}

function renderSegundaPlayoff(panel, po) {
    const myTeam=po.myTeam;
    let html=`<h3 style="color:#FFD700;margin:10px 0 10px">⬆️ Playoff Ascenso a Primera — ${po.season}</h3>`;

    // Ascensos directos
    html+=`<div style="background:rgba(50,200,50,.12);border-left:4px solid #32C832;border-radius:6px;padding:10px 14px;margin-bottom:14px">
        <div style="color:#32C832;font-weight:bold;font-size:.85em;margin-bottom:6px">✅ ASCENSOS DIRECTOS</div>
        ${(po.directAscent||[]).map(t=>`<div style="color:#fff">🥇 <strong>${t}</strong>${t===myTeam?' <span style="color:#FFD700">(TÚ)</span>':''}</div>`).join('')}
    </div>`;

    // Bracket
    html+=`<div style="color:rgba(255,255,255,.6);font-size:.82em;margin-bottom:8px">Playoff — Pos 3 vs 6 y Pos 4 vs 5 (doble partido)</div>`;
    html+=`<div class="po-wrap">`;
    if (!po.simulated) {
        html+=matchPending('Semifinal 1',`${po.pos3} <span style="opacity:.5">(3º)</span>`,`${po.pos6} <span style="opacity:.5">(6º)</span>`);
        html+=matchPending('Semifinal 2',`${po.pos4} <span style="opacity:.5">(4º)</span>`,`${po.pos5} <span style="opacity:.5">(5º)</span>`);
        html+=matchPending('Final','Ganador SF1','Ganador SF2','#FFD700');
    } else {
        html+=matchResult('Semifinal 1', po.sf1Result, myTeam);
        html+=matchResult('Semifinal 2', po.sf2Result, myTeam);
        html+=matchResult('⭐ FINAL', po.finalResult, myTeam, '#FFD700');
    }
    html+=`</div>`;
    html+=resultBanner(po.myResult);
    panel.innerHTML=html;
}

function renderRFEFPlayoff(panel, po) {
    const myTeam=po.myTeam;
    let html=`<h3 style="color:#FFD700;margin:10px 0 10px">⬆️ Playoff Ascenso a Segunda — ${po.season}</h3>`;
    html+=`<div style="background:rgba(50,200,50,.12);border-left:4px solid #32C832;border-radius:6px;padding:10px 14px;margin-bottom:14px">
        <div style="color:#32C832;font-weight:bold;font-size:.85em;margin-bottom:6px">✅ ASCENSOS DIRECTOS (1º de cada grupo)</div>
        <div style="color:#fff">🥇 Grupo 1: <strong>${po.directAscent1||'—'}</strong>${po.directAscent1===myTeam?' <span style="color:#FFD700">(TÚ)</span>':''}</div>
        <div style="color:#fff">🥇 Grupo 2: <strong>${po.directAscent2||'—'}</strong>${po.directAscent2===myTeam?' <span style="color:#FFD700">(TÚ)</span>':''}</div>
    </div>`;

    if (!po.simulated) {
        html+=`<div style="color:rgba(255,255,255,.5);text-align:center;padding:20px">⏳ Mini-ligas de playoff aún no disputadas...</div>`;
    } else {
        html+=miniLeagueTable('A', po.miniA, myTeam, po.winnerA);
        html+=miniLeagueTable('B', po.miniB, myTeam, po.winnerB);
    }
    html+=resultBanner(po.myResult);
    panel.innerHTML=html;
}

// Helper: partido pendiente en bracket
function matchPending(title, t1, t2, borderColor='#B49600') {
    return `<div class="po-match" style="border-color:${borderColor}"><div class="pm-title">${title}</div>
        <div class="po-row">${t1}</div><div class="po-row">${t2}</div>
        <div class="po-info">⏳ Pendiente</div></div>`;
}

// Helper: partido ya simulado
function matchResult(title, res, myTeam, borderColor='#B49600') {
    if (!res) return matchPending(title,'—','—',borderColor);
    const { teamA, teamB, leg1, leg2, totalA, totalB, winner } = res;
    const winA=winner===teamA, winB=winner===teamB;
    const meA=teamA===myTeam, meB=teamB===myTeam;
    return `<div class="po-match" style="border-color:${borderColor}"><div class="pm-title">${title}</div>
        <div class="po-row ${winA?'winner':winB?'loser':''}">${teamA}${meA?' ⭐':''} <span>${totalA}</span></div>
        <div class="po-row ${winB?'winner':winA?'loser':''}">${teamB}${meB?' ⭐':''} <span>${totalB}</span></div>
        <div class="po-info">Ida: ${leg1.hg}-${leg1.ag} · Vuelta: ${leg2.hg}-${leg2.ag} · Pasa: <strong>${winner}</strong></div>
    </div>`;
}

// Helper: tabla mini-liga RFEF
function miniLeagueTable(letter, mini, myTeam, winner) {
    const sorted=sortSt(mini.standings);
    let html=`<div style="margin-bottom:14px"><div style="color:#B49600;font-size:.88em;font-weight:bold;margin-bottom:6px">Mini-Liga ${letter}</div>
    <table class="cg-table"><thead><tr><th>Pos</th><th style="text-align:left">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GD</th><th>Pts</th></tr></thead><tbody>`;
    sorted.forEach(([n,s],i)=>{
        const me=n===myTeam, w=n===winner;
        const bg=w?'background:rgba(50,200,50,.2);':me?'background:rgba(233,69,96,.15);':'';
        html+=`<tr style="${bg}border-bottom:1px solid rgba(255,255,255,.08)"><td>${i+1}</td>
            <td style="text-align:left;${(me||w)?'font-weight:bold':''}">${n}${w?' 🔺':''}${me?' ⭐':''}</td>
            <td>${s.pj}</td><td>${s.g}</td><td>${s.e}</td><td>${s.p}</td>
            <td>${s.gf-s.gc>0?'+':''}${s.gf-s.gc}</td><td><strong>${s.pts}</strong></td></tr>`;
    });
    html+=`</tbody></table>`;
    const myM=mini.matches.filter(m=>m.played&&(m.home===myTeam||m.away===myTeam));
    if(myM.length){
        html+=`<div style="font-size:.8em;margin-top:4px">`;
        myM.forEach(m=>{
            const h=m.home===myTeam, mg=h?m.hg:m.ag, og=h?m.ag:m.hg, opp=h?m.away:m.home;
            html+=`<div class="${mg>og?'cwin':mg===og?'cdraw':'closs'}" style="padding:2px 0">${mg>og?'✅':mg===og?'🤝':'❌'} vs ${opp}: ${mg}-${og} ${h?'(🏠)':'(✈️)'}</div>`;
        });
        html+=`</div>`;
    }
    html+=`</div>`; return html;
}

// Helper: banner de resultado final para el jugador
function resultBanner(result) {
    const cfg = {
        promoted_direct:  { bg:'rgba(50,200,50,.2)',  border:'#32C832', icon:'🏆', text:'¡HAS ASCENDIDO DIRECTAMENTE!' },
        promoted_playoff: { bg:'rgba(50,200,50,.2)',  border:'#32C832', icon:'🎉', text:'¡HAS ASCENDIDO VÍA PLAYOFF!' },
        lost_final:       { bg:'rgba(255,150,0,.15)', border:'#FF8C00', icon:'😤', text:'Eliminado en la FINAL del playoff. Tan cerca...' },
        eliminated_sf:    { bg:'rgba(200,40,40,.15)', border:'#C82828', icon:'😞', text:'Eliminado en Semifinales del playoff.' },
        eliminated:       { bg:'rgba(200,40,40,.15)', border:'#C82828', icon:'😞', text:'Eliminado en el playoff. Permaneces en tu división.' },
        not_qualified:    { bg:'rgba(255,255,255,.05)',border:'#888',   icon:'📊', text:'Tu equipo no clasificó para el playoff.' },
    }[result] || { bg:'rgba(255,255,255,.05)',border:'#888',icon:'⏳',text:'Resultado pendiente.' };
    return `<div class="result-banner" style="background:${cfg.bg};border-color:${cfg.border}"><div style="font-size:1.5em">${cfg.icon}</div><div style="color:#fff;font-weight:bold;margin-top:4px">${cfg.text}</div></div>`;
}

// ============================================================
// SIMULAR COMPETICIONES PROGRESIVAMENTE DURANTE TEMPORADA
// ============================================================
function processWeeklyComps(state) {
    const comp = store.getComp();
    if (!comp || comp.season !== state.currentSeason) return;
    const w=state.week, total=state.maxSeasonWeeks||38, myTeam=state.team;

    // Grupos Europa ~30% temporada
    if (comp.europeanComp && comp.europeanPhase==='groups' && w===Math.round(total*0.30)) {
        simulateGroupPhase(myTeam);
    }
    // Knockouts Europa
    [['round16',0.48],['quarterfinals',0.62],['semifinals',0.76],['final',0.90]].forEach(([phase,frac])=>{
        if (comp.europeanPhase===phase && w===Math.round(total*frac)) simulateEUKnockout(phase,myTeam);
    });
    // Copa
    const copaW={ round1:0.14,round32:0.25,round16:0.38,quarters:0.52,semis:0.68,final:0.84 };
    if (comp.copaPhase && !['eliminated','champion'].includes(comp.copaPhase)) {
        const tw=Math.round(total*(copaW[comp.copaPhase]||0));
        if (tw && w===tw) simulateCopa(myTeam, comp.copaPhase);
    }
    // Playoff Segunda — semana penúltima
    if (state.division==='segunda' && w===total-1) {
        const po=store.getPlayoff();
        if(po&&po.type==='segunda'&&!po.simulated){
            const res=runSegundaPlayoff(myTeam);
            notifySegundaPO(res);
        }
    }
    // Playoff RFEF
    if ((state.division==='rfef_grupo1'||state.division==='rfef_grupo2') && w===total-1) {
        const po=store.getPlayoff();
        if(po&&po.type==='rfef'&&!po.simulated){
            const res=runRFEFPlayoff(myTeam);
            notifyRFEFPO(res);
        }
    }
}

function notifySegundaPO(po) {
    const gl=window.gameLogic;
    if(po.sf1Result) gl?.addNews(`⬆️ Playoff SF1: ${po.sf1Result.winner} pasa a la final`, 'info');
    if(po.sf2Result) gl?.addNews(`⬆️ Playoff SF2: ${po.sf2Result.winner} pasa a la final`, 'info');
    if(po.winner) gl?.addNews(`🏆 Final playoff: ${po.winner} asciende a Primera División`, 'success');
    const msgs={promoted_playoff:'🎉 ¡HAS ASCENDIDO VÍA PLAYOFF!',lost_final:'😤 Eliminado en la FINAL del playoff. Permaneces en Segunda.',eliminated_sf:'😞 Eliminado en Semifinales del playoff.'};
    if(msgs[po.myResult]) gl?.addNews(msgs[po.myResult], po.myResult==='promoted_playoff'?'success':'error');
}

function notifyRFEFPO(po) {
    const gl=window.gameLogic;
    if(po.winnerA) gl?.addNews(`⬆️ Mini-Liga A: ${po.winnerA} asciende a Segunda División`, 'info');
    if(po.winnerB) gl?.addNews(`⬆️ Mini-Liga B: ${po.winnerB} asciende a Segunda División`, 'info');
    const msgs={promoted_playoff:'🎉 ¡HAS ASCENDIDO VÍA PLAYOFF A SEGUNDA!',eliminated:'😞 Eliminado en el playoff de ascenso. Permaneces en Primera RFEF.'};
    if(msgs[po.myResult]) gl?.addNews(msgs[po.myResult], po.myResult==='promoted_playoff'?'success':'error');
}

// ============================================================
// HOOK DE FIN DE TEMPORADA
// ============================================================
let _prevSeason = '';

function hookSimulateWeek() {
    const orig = window.simulateWeek;
    if (!orig || window._compHooked) { if(!orig) setTimeout(hookSimulateWeek,800); return; }
    window._compHooked=true;

    window.simulateWeek = async function() {
        const before = window.gameLogic?.getGameState();
        const res = await orig.apply(this, arguments);
        const after = window.gameLogic?.getGameState();

        if (before && after) {
            if (before.currentSeason !== after.currentSeason) {
                onNewSeason(before, after);
            } else if (after.seasonType==='regular') {
                processWeeklyComps(after);
            }
        }
        return res;
    };
}

function onNewSeason(before, after) {
    const sorted = Object.entries(before.standings||{}).sort((a,b)=>{
        const pd=(b[1].pts||0)-(a[1].pts||0); return pd!==0?pd:((b[1].gf||0)-(b[1].gc||0))-((a[1].gf||0)-(a[1].gc||0));
    });
    const myPos = sorted.findIndex(([n])=>n===before.team)+1;
    const newDiv=after.division, newSeason=after.currentSeason;

    setTimeout(()=>{
        store.clearComp(); store.clearPlayoff();

        // Competición europea según posición final
        let euroComp=null;
        if(newDiv==='primera'){
            const cfg=COMPETITION_CONFIG.primera;
            if(cfg.champions?.includes(myPos)) euroComp='champions';
            else if(cfg.europaLeague?.includes(myPos)) euroComp='europaLeague';
            else if(cfg.conferenceLague?.includes(myPos)) euroComp='conferenceLague';
        }

        const comp=initCompetitionsForSeason(after.team, newDiv, newSeason, euroComp);
        if(comp.europeanComp) window.gameLogic?.addNews(`🏆 ¡Clasificados para la ${compName(comp.europeanComp)} ${newSeason}!`,'success');
        if(comp.copaQualified) window.gameLogic?.addNews(`🥇 Participaréis en la Copa del Rey ${newSeason}`,'info');

        // Init playoff para la nueva división
        initPlayoffForDiv(after, sorted, newSeason);
        updateStandingsColors();
    }, 1500);
}

function initPlayoffForDiv(state, sorted, season) {
    const div=state.division;
    if(div==='segunda') initSegundaPlayoff(state.team, sorted, season);
    else if(div==='rfef_grupo1'||div==='rfef_grupo2'){
        const otherKey=div==='rfef_grupo1'?'rfef_grupo2':'rfef_grupo1';
        initRFEFPlayoff(state.team, sorted, generateFakeOtherGroup(otherKey), season);
    }
}

// ============================================================
// HOOK APERTURA DE CLASIFICACIÓN
// ============================================================
function hookStandingsOpen() {
    if (window._standingsHooked) return;
    const origOpen = window.openPage;
    if (origOpen) {
        window._standingsHooked=true;
        window.openPage = function(pageId,...args) {
            origOpen.call(this, pageId,...args);
            if(pageId==='standings') setTimeout(()=>{ injectCompUI(); updateStandingsColors(); },300);
        };
    }
    document.addEventListener('click', e=>{
        const btn=e.target.closest('[onclick*="standings"],.nav-item,.bottom-nav-item');
        if(btn && btn.textContent?.toLowerCase().includes('clasif'))
            setTimeout(()=>{ injectCompUI(); updateStandingsColors(); },350);
    });
}

// ============================================================
// INICIALIZACIÓN AL CARGAR PARTIDA
// ============================================================
function initOnLoad() {
    const state = window.gameLogic?.getGameState();
    if (!state?.team) { setTimeout(initOnLoad, 1000); return; }

    _prevSeason = state.currentSeason;
    let comp = store.getComp();

    // Si no existe estado o es de otro equipo/temporada
    if (!comp || comp.team!==state.team || comp.season!==state.currentSeason) {
        const euroComp = detectInitialEuropean(state.team, state.division, state.currentSeason);
        comp = initCompetitionsForSeason(state.team, state.division, state.currentSeason, euroComp);
        if(euroComp) console.log(`🏆 ${state.team} → ${compName(euroComp)} ${state.currentSeason}`);
    }

    // Init playoff si no existe O si es de otro equipo
    const po = store.getPlayoff();
    if (!po || po.season!==state.currentSeason || po.myTeam!==state.team) {
        const sorted = Object.entries(state.standings||{}).sort((a,b)=>(b[1].pts||0)-(a[1].pts||0));
        initPlayoffForDiv(state, sorted, state.currentSeason);
    }

    // Notificar a cup-matches (necesario cuando se hace login y no hay F5)
    window.dispatchEvent(new CustomEvent('competitionsReady', { detail: { team: state.team } }));
}

// ============================================================
// BOOTSTRAP
// ============================================================
function boot() {
    if (!window.gameLogic) { setTimeout(boot, 800); return; }
    console.log('🏆 Iniciando competiciones v2.0...');

    // Hook selectTeam: reinicializar cuando usuario selecciona equipo tras login
    const origSelect = window.gameLogic.selectTeamWithInitialSquad;
    if (origSelect && !window._compSelectHooked) {
        window._compSelectHooked = true;
        window.gameLogic.selectTeamWithInitialSquad = async function(...args) {
            const result = await origSelect.apply(this, args);
            setTimeout(() => {
                store.clearComp(); store.clearPlayoff();
                initOnLoad();
            }, 200);
            return result;
        };
    }

    initOnLoad();
    hookStandingsOpen();
    hookSimulateWeek();

    // Escuchar también cuando se abre clasificación desde el menú de navegación
    const origNav = window.showPage || window.navigateTo;

    window.CompetitionsSystem = {
        getComp:     store.getComp,
        getPlayoff:  store.getPlayoff,
        reset: ()=>{store.clearComp(); store.clearPlayoff(); initOnLoad();},
        updateColors: updateStandingsColors,
        renderEuropa, renderCopa, renderPlayoff,
        runSegundaPlayoff, runRFEFPlayoff
    };

    // Inyectar CSS básico para las filas
    if(!document.getElementById('comp-row-css')){
        const s=document.createElement('style'); s.id='comp-row-css';
        s.textContent=`
            #standingsTable tr, table.standings-table tbody tr { transition: background .3s, border-left .3s; }
            #standingsTable tr.my-team-row, table.standings-table tbody tr.my-team-row {
                background: rgba(233,69,96,0.22) !important;
                border-left: 4px solid #e94560 !important;
                border-right: 3px solid rgba(233,69,96,0.5) !important;
                font-weight: bold !important;
            }
        `;
        document.head.appendChild(s);
    }

    console.log('✅ Sistema de competiciones v2.0 listo');
}

setTimeout(boot, 2000);
console.log('✅ injector-competitions.js v2.0 parseado');
