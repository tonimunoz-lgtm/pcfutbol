// ============================================================
// injector-competitions.js
// Sistema de Competiciones: Champions, Europa League,
// Conference League, Copa del Rey + Colores Clasificación
// ============================================================

console.log('🏆 Sistema de Competiciones cargando...');

// ============================================================
// CONFIGURACIÓN DE PLAZAS EUROPEAS (LaLiga)
// Pos 1-4: Champions League
// Pos 5:   Europa League
// Pos 6:   Conference League
// Pos 18-20: Descenso a Segunda
// Copa del Rey ganador → Europa League (si ya clasificado, baja al 7º)
// ============================================================

const COMPETITION_CONFIG = {
    primera: {
        champions: [1, 2, 3, 4],
        europaLeague: [5],
        conferenceLague: [6],
        relegate: 3,       // últimos 3 descienden
        promote: 0
    },
    segunda: {
        promoteAuto: [1, 2],
        promotePlayoff: [3, 4, 5, 6], // playoff entre 3º-6º
        relegate: 4,
        promote: 3  // 2 directos + 1 playoff
    },
    rfef_grupo1: {
        promoteAuto: [1, 2],
        relegate: 0  // No marcamos descenso (no implementado)
    },
    rfef_grupo2: {
        promoteAuto: [1, 2],
        relegate: 0
    }
};

// ============================================================
// EQUIPOS EUROPEOS FICTICIOS PARA COMPETICIONES
// ============================================================

const EUROPEAN_TEAMS = {
    champions_group_A: [
        { name: 'Bayern München', country: '🇩🇪', rating: 88 },
        { name: 'Paris Saint-Germain', country: '🇫🇷', rating: 87 },
        { name: 'Manchester City', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 89 },
        { name: 'Inter de Milán', country: '🇮🇹', rating: 85 }
    ],
    champions_group_B: [
        { name: 'Real Madrid', country: '🇪🇸', rating: 91 },
        { name: 'Arsenal FC', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 84 },
        { name: 'Borussia Dortmund', country: '🇩🇪', rating: 82 },
        { name: 'Benfica', country: '🇵🇹', rating: 80 }
    ],
    champions_group_C: [
        { name: 'FC Barcelona', country: '🇪🇸', rating: 86 },
        { name: 'Atlético de Madrid', country: '🇪🇸', rating: 83 },
        { name: 'Juventus', country: '🇮🇹', rating: 81 },
        { name: 'Ajax', country: '🇳🇱', rating: 79 }
    ],
    europa_group_A: [
        { name: 'Liverpool FC', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 84 },
        { name: 'AS Roma', country: '🇮🇹', rating: 79 },
        { name: 'Bayer Leverkusen', country: '🇩🇪', rating: 80 },
        { name: 'Feyenoord', country: '🇳🇱', rating: 76 }
    ],
    europa_group_B: [
        { name: 'Tottenham Hotspur', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rating: 78 },
        { name: 'Lazio', country: '🇮🇹', rating: 77 },
        { name: 'Eintracht Frankfurt', country: '🇩🇪', rating: 76 },
        { name: 'Sporting CP', country: '🇵🇹', rating: 75 }
    ],
    conference_group_A: [
        { name: 'Fiorentina', country: '🇮🇹', rating: 74 },
        { name: 'Club Bruges', country: '🇧🇪', rating: 73 },
        { name: 'PAOK', country: '🇬🇷', rating: 70 },
        { name: 'Braga', country: '🇵🇹', rating: 71 }
    ]
};

// Jugadores ficticios para equipos europeos
const EUROPEAN_PLAYER_NAMES = {
    '🇩🇪': ['Müller', 'Kimmich', 'Sané', 'Goretzka', 'Gnabry', 'Pavard', 'Upamecano', 'de Ligt'],
    '🇫🇷': ['Mbappé', 'Dembélé', 'Verratti', 'Hakimi', 'Marquinhos', 'Neymar', 'Vitinha', 'Ugarte'],
    '🏴󠁧󠁢󠁥󠁮󠁧󠁿': ['Kane', 'Saka', 'Rashford', 'Rice', 'Bellingham', 'Trippier', 'Walker', 'Foden'],
    '🇮🇹': ['Lautaro', 'Barella', 'Calhanoglu', 'Bastoni', 'Dybala', 'Chiesa', 'Pellegrini', 'Zaccagni'],
    '🇪🇸': ['Modrić', 'Kroos', 'Vinícius', 'Benzema', 'Pedri', 'Gavi', 'Yamal', 'Torres'],
    '🇵🇹': ['Di María', 'João Mário', 'Coates', 'Kokçu', 'Cabral', 'Nkounkou', 'Bah', 'Trincão'],
    '🇳🇱': ['van Dijk', 'de Jong', 'Bergwijn', 'Taylor', 'Gimenez', 'Timber', 'Zirkzee', 'Reijnders'],
    '🇧🇪': ['De Bruyne', 'Hazard', 'Lukaku', 'Vanaken', 'Mignolet', 'Skov Olsen', 'Jutgla', 'Orban'],
    '🇬🇷': ['Tzolas', 'Konstantelias', 'Misić', 'Esiti', 'Murg', 'Schwab', 'Lyratzis', 'Kotarski'],
    default: ['García', 'Silva', 'Martínez', 'López', 'Fernández', 'Costa', 'Rodrigues', 'Santos']
};

function getEuropeanPlayerNames(country) {
    return EUROPEAN_PLAYER_NAMES[country] || EUROPEAN_PLAYER_NAMES.default;
}

// ============================================================
// STORAGE: Estado de competiciones (localStorage)
// ============================================================

const COMP_STORAGE_KEY = 'competitions_state';

function getCompState() {
    try {
        const raw = localStorage.getItem(COMP_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
}

function saveCompState(state) {
    try {
        localStorage.setItem(COMP_STORAGE_KEY, JSON.stringify(state));
    } catch(e) { console.error('Error guardando estado competiciones:', e); }
}

function clearCompState() {
    localStorage.removeItem(COMP_STORAGE_KEY);
}

// ============================================================
// INICIALIZACIÓN DE COMPETICIONES AL INICIO DE TEMPORADA
// ============================================================

function initCompetitionsForSeason(myTeam, myPosition, division, season) {
    const existing = getCompState();
    // Si ya está inicializado para esta temporada, no reiniciar
    if (existing && existing.season === season && existing.team === myTeam) {
        console.log('🏆 Competiciones ya inicializadas para', season);
        return existing;
    }

    const compState = {
        team: myTeam,
        season: season,
        division: division,
        // Europeas
        europeanComp: null,  // 'champions' | 'europaLeague' | 'conferenceLague' | null
        europeanPhase: null, // 'groups' | 'round16' | 'quarterfinals' | 'semifinals' | 'final' | 'eliminated'
        europeanGroup: null,
        europeanGroupStandings: null,
        europeanResults: [],
        europeanKnockout: [],
        // Copa del Rey
        copaQualified: false,  // Siempre participan 1ª y 2ª
        copaPhase: null, // 'round1' | 'round32' | 'round16' | 'quarters' | 'semis' | 'final' | 'champion' | 'eliminated'
        copaResults: [],
        copaOpponents: {},
    };

    // Determinar si clasifica a Europa (solo Primera)
    if (division === 'primera') {
        const cfg = COMPETITION_CONFIG.primera;
        if (cfg.champions.includes(myPosition)) {
            compState.europeanComp = 'champions';
        } else if (cfg.europaLeague.includes(myPosition)) {
            compState.europeanComp = 'europaLeague';
        } else if (cfg.conferenceLague.includes(myPosition)) {
            compState.europeanComp = 'conferenceLague';
        }

        if (compState.europeanComp) {
            compState.europeanPhase = 'groups';
            compState.europeanGroup = buildEuropeanGroup(compState.europeanComp, myTeam);
            compState.europeanGroupStandings = initGroupStandings(compState.europeanGroup);
        }
    }

    // Copa del Rey: participan equipos de Primera y Segunda
    if (division === 'primera' || division === 'segunda') {
        compState.copaQualified = true;
        compState.copaPhase = division === 'primera' ? 'round32' : 'round1';
        compState.copaOpponents = buildCopaOpponents(division);
    }

    saveCompState(compState);
    console.log('🏆 Competiciones inicializadas:', compState.europeanComp || 'ninguna europea', '| Copa:', compState.copaPhase);
    return compState;
}

// ============================================================
// CONSTRUCCIÓN DE GRUPO EUROPEO
// ============================================================

function buildEuropeanGroup(comp, myTeam) {
    let pool;
    if (comp === 'champions') {
        // Seleccionar 3 rivales aleatorios de distintos grupos
        const allEuro = [
            ...EUROPEAN_TEAMS.champions_group_A,
            ...EUROPEAN_TEAMS.champions_group_B,
            ...EUROPEAN_TEAMS.champions_group_C
        ].filter(t => t.name !== myTeam);
        const shuffled = allEuro.sort(() => Math.random() - 0.5);
        pool = shuffled.slice(0, 3);
    } else if (comp === 'europaLeague') {
        const allEuro = [
            ...EUROPEAN_TEAMS.europa_group_A,
            ...EUROPEAN_TEAMS.europa_group_B
        ].filter(t => t.name !== myTeam);
        const shuffled = allEuro.sort(() => Math.random() - 0.5);
        pool = shuffled.slice(0, 3);
    } else { // conference
        const allEuro = [...EUROPEAN_TEAMS.conference_group_A];
        const shuffled = allEuro.sort(() => Math.random() - 0.5);
        pool = shuffled.slice(0, 3);
    }

    // Añadir nuestro equipo
    return [
        { name: myTeam, country: '🇪🇸', rating: 80, isPlayer: true },
        ...pool
    ];
}

function initGroupStandings(group) {
    const standings = {};
    group.forEach(t => {
        standings[t.name] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };
    });
    return standings;
}

// ============================================================
// CONSTRUCCIÓN DE RIVALES COPA DEL REY
// ============================================================

function buildCopaOpponents(division) {
    const rounds = {};

    if (division === 'primera') {
        // Primera entra desde 16avos
        rounds.round32 = generateCopaMockOpponent('segunda');
        rounds.round16 = generateCopaMockOpponent('primera');
        rounds.quarters = generateCopaMockOpponent('primera');
        rounds.semis = generateCopaMockOpponent('primera');
        rounds.final = generateCopaMockOpponent('primera');
    } else {
        // Segunda entra desde 1ª ronda
        rounds.round1 = generateCopaMockOpponent('rfef_grupo1');
        rounds.round32 = generateCopaMockOpponent('primera');
        rounds.round16 = generateCopaMockOpponent('primera');
        rounds.quarters = generateCopaMockOpponent('primera');
        rounds.semis = generateCopaMockOpponent('primera');
        rounds.final = generateCopaMockOpponent('primera');
    }

    return rounds;
}

function generateCopaMockOpponent(fromDivision) {
    const pools = {
        primera: ['Real Madrid CF', 'FC Barcelona', 'Atlético de Madrid', 'Athletic Club', 'Villarreal CF', 'Real Sociedad', 'Real Betis Balompié', 'Sevilla FC', 'Valencia CF', 'Celta de Vigo'],
        segunda: ['UD Almería', 'UD Las Palmas', 'Real Zaragoza', 'Burgos CF', 'Cádiz CF', 'SD Eibar', 'Málaga CF', 'Córdoba CF'],
        rfef_grupo1: ['CD Lugo', 'CF Talavera', 'Racing Ferrol', 'Ponferradina', 'Zamora CF', 'AD Mérida']
    };
    const pool = pools[fromDivision] || pools.primera;
    return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================
// SIMULACIÓN DE PARTIDO EUROPEO
// ============================================================

function simulateEuropeanMatch(myTeam, myRating, opponent) {
    const ratingDiff = (myRating - opponent.rating) / 100;
    const homeBonus = 0.05;
    const myWinProb = Math.max(0.1, Math.min(0.85, 0.45 + ratingDiff + homeBonus));

    const rand = Math.random();
    let myGoals, oppGoals;

    if (rand < myWinProb) {
        myGoals = Math.floor(Math.random() * 3) + 1;
        oppGoals = Math.max(0, myGoals - 1 - Math.floor(Math.random() * 2));
    } else if (rand < myWinProb + 0.2) {
        myGoals = Math.floor(Math.random() * 2) + 1;
        oppGoals = myGoals;
    } else {
        oppGoals = Math.floor(Math.random() * 3) + 1;
        myGoals = Math.max(0, oppGoals - 1 - Math.floor(Math.random() * 2));
    }

    return { myGoals, oppGoals };
}

function getMyRating() {
    try {
        const state = window.gameLogic?.getGameState();
        if (!state?.squad) return 75;
        const vals = state.squad.map(p => p.overall || 70);
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    } catch(e) { return 75; }
}

function simulateGroupPhase(comp, myTeam) {
    const compState = getCompState();
    if (!compState || !compState.europeanGroup) return;

    const group = compState.europeanGroup;
    const standings = compState.europeanGroupStandings;
    const myRating = getMyRating();

    // Simular 6 jornadas (home+away vs cada rival)
    const rivals = group.filter(t => !t.isPlayer);
    const results = [];

    rivals.forEach(rival => {
        // Jornada ida
        const r1 = simulateEuropeanMatch(myTeam, myRating, rival);
        updateGroupStandings(standings, myTeam, rival.name, r1.myGoals, r1.oppGoals);
        results.push({ jornada: 'ida', rival: rival.name, myGoals: r1.myGoals, oppGoals: r1.oppGoals });

        // Jornada vuelta
        const r2 = simulateEuropeanMatch(myTeam, myRating, rival);
        updateGroupStandings(standings, myTeam, rival.name, r2.myGoals, r2.oppGoals);
        results.push({ jornada: 'vuelta', rival: rival.name, myGoals: r2.myGoals, oppGoals: r2.oppGoals });

        // Partidos entre rivales
        const otherRivals = rivals.filter(r => r.name !== rival.name);
        otherRivals.forEach(other => {
            if (rival.name < other.name) { // evitar duplicados
                const rRivals = simulateEuropeanMatch(rival.name, rival.rating, other);
                updateGroupStandings(standings, rival.name, other.name, rRivals.myGoals, rRivals.oppGoals);
            }
        });
    });

    compState.europeanGroupStandings = standings;
    compState.europeanResults = results;

    // Determinar si clasificamos
    const sorted = Object.entries(standings).sort((a, b) => {
        const ptsDiff = b[1].pts - a[1].pts;
        if (ptsDiff !== 0) return ptsDiff;
        return (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc);
    });

    const myPos = sorted.findIndex(([n]) => n === myTeam) + 1;

    if (myPos <= 2) {
        compState.europeanPhase = 'round16';
        window.gameLogic?.addNews(`🏆 ¡Clasificados para los octavos de final de la ${getCompName(comp)}! (${myPos}º del grupo)`, 'success');
    } else {
        compState.europeanPhase = 'eliminated';
        window.gameLogic?.addNews(`😞 Eliminados en la fase de grupos de la ${getCompName(comp)}. (${myPos}º del grupo)`, 'error');
    }

    saveCompState(compState);
    return compState;
}

function updateGroupStandings(standings, teamA, teamB, goalsA, goalsB) {
    if (!standings[teamA]) standings[teamA] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };
    if (!standings[teamB]) standings[teamB] = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };

    standings[teamA].pj++;
    standings[teamA].gf += goalsA;
    standings[teamA].gc += goalsB;
    standings[teamB].pj++;
    standings[teamB].gf += goalsB;
    standings[teamB].gc += goalsA;

    if (goalsA > goalsB) {
        standings[teamA].g++;
        standings[teamA].pts += 3;
        standings[teamB].p++;
    } else if (goalsA === goalsB) {
        standings[teamA].e++;
        standings[teamA].pts += 1;
        standings[teamB].e++;
        standings[teamB].pts += 1;
    } else {
        standings[teamB].g++;
        standings[teamB].pts += 3;
        standings[teamA].p++;
    }
}

// ============================================================
// SIMULACIÓN COPA DEL REY
// ============================================================

function simulateCopaDraw(myTeam, phase) {
    const compState = getCompState();
    if (!compState) return;

    const opponent = compState.copaOpponents[phase] || generateCopaMockOpponent('primera');
    const myRating = getMyRating();
    const oppRating = 75 + Math.floor(Math.random() * 15);

    const result = simulateEuropeanMatch(myTeam, myRating, { rating: oppRating });

    compState.copaResults.push({
        phase: phase,
        opponent: opponent,
        myGoals: result.myGoals,
        oppGoals: result.oppGoals,
        advanced: result.myGoals > result.oppGoals
    });

    const phaseOrder = ['round1', 'round32', 'round16', 'quarters', 'semis', 'final'];
    const currentIdx = phaseOrder.indexOf(phase);

    if (result.myGoals > result.oppGoals) {
        const nextPhase = phaseOrder[currentIdx + 1];
        compState.copaPhase = nextPhase || 'champion';
        if (compState.copaPhase === 'champion') {
            window.gameLogic?.addNews(`🏆 ¡¡CAMPEONES DE LA COPA DEL REY!! ¡Histórico!`, 'success');
        } else {
            window.gameLogic?.addNews(`✅ Copa del Rey: Clasificados para ${getPhaseName(nextPhase)}. Ganamos ${result.myGoals}-${result.oppGoals} al ${opponent}`, 'success');
        }
    } else {
        compState.copaPhase = 'eliminated';
        window.gameLogic?.addNews(`❌ Copa del Rey: Eliminados en ${getPhaseName(phase)}. Perdimos ${result.myGoals}-${result.oppGoals} ante ${opponent}`, 'error');
    }

    saveCompState(compState);
    return compState;
}

function getCompName(comp) {
    const names = {
        champions: 'Champions League',
        europaLeague: 'Europa League',
        conferenceLague: 'Conference League'
    };
    return names[comp] || 'Competición Europea';
}

function getPhaseName(phase) {
    const names = {
        round1: 'Primera Ronda',
        round32: 'Dieciseisavos',
        round16: 'Octavos de Final',
        quarters: 'Cuartos de Final',
        semis: 'Semifinales',
        final: 'Final',
        champion: 'CAMPEÓN'
    };
    return names[phase] || phase;
}

// ============================================================
// HOOK EN endSeason: INICIALIZAR COMPETICIONES NUEVA TEMPORADA
// ============================================================

function hookEndSeason() {
    const originalEndSeason = window.gameLogic?.endSeason;
    if (!originalEndSeason || window._endSeasonHooked) return;

    // Interceptar después del fin de temporada
    // No podemos hook la función en módulo ES6 directamente,
    // así que enganchamos el setupNewSeason que se llama desde endSeason
    // y usamos un observer en el gameState.week para detectar reset
    console.log('🏆 Hook de fin de temporada instalado (via observer)');
    window._endSeasonHooked = true;
}

// Detectar inicio de nueva temporada (week vuelve a 1 y seasonType='preseason')
let _lastWeek = -1;
let _lastSeasonType = '';

function checkSeasonTransition() {
    const state = window.gameLogic?.getGameState();
    if (!state) return;

    const currentWeek = state.week;
    const currentSeasonType = state.seasonType;
    const currentSeason = state.currentSeason;

    // Detectar nueva pretemporada (transición)
    if (currentSeasonType === 'preseason' && _lastSeasonType === 'regular') {
        console.log('🏆 Nueva temporada detectada! Reiniciando competiciones...');
        // Limpiar estado anterior
        clearCompState();
    }

    _lastWeek = currentWeek;
    _lastSeasonType = currentSeasonType;
}

// ============================================================
// HOOK EN simulateWeek: PROCESAR COMPETICIONES INTEGRADAS
// ============================================================

function hookSimulateWeekForCompetitions() {
    const originalSimulate = window.simulateWeek;
    if (!originalSimulate || window._compHooked) {
        if (!originalSimulate) setTimeout(hookSimulateWeekForCompetitions, 500);
        return;
    }

    window._compHooked = true;
    console.log('🏆 Hook de competiciones instalado en simulateWeek');

    window.simulateWeek = async function() {
        const state = window.gameLogic?.getGameState();
        checkSeasonTransition();

        // Llamar a la simulación original
        const result = await originalSimulate.apply(this, arguments);

        // Después de simular, procesar competiciones si corresponde
        if (state && state.seasonType === 'regular') {
            processCompetitionsAfterWeek(state);
        }

        return result;
    };
}

function processCompetitionsAfterWeek(state) {
    const compState = getCompState();
    if (!compState || compState.season !== state.currentSeason) return;

    const week = state.week;
    const totalWeeks = state.maxSeasonWeeks || 38;

    // Simular grupos europeos a mitad de temporada (semana ~12)
    if (compState.europeanComp && compState.europeanPhase === 'groups' && week === Math.floor(totalWeeks * 0.3)) {
        console.log('🏆 Simulando fase de grupos europea...');
        simulateGroupPhase(compState.europeanComp, state.team);
        if (window.renderCompetitionsInStandings) window.renderCompetitionsInStandings();
    }

    // Simular rondas eliminatorias europeas progresivamente
    if (compState.europeanComp && compState.europeanPhase === 'round16' && week === Math.floor(totalWeeks * 0.5)) {
        simulateEuropeanKnockoutRound('round16', state.team);
    }
    if (compState.europeanComp && compState.europeanPhase === 'quarterfinals' && week === Math.floor(totalWeeks * 0.65)) {
        simulateEuropeanKnockoutRound('quarterfinals', state.team);
    }
    if (compState.europeanComp && compState.europeanPhase === 'semifinals' && week === Math.floor(totalWeeks * 0.78)) {
        simulateEuropeanKnockoutRound('semifinals', state.team);
    }
    if (compState.europeanComp && compState.europeanPhase === 'final' && week === Math.floor(totalWeeks * 0.9)) {
        simulateEuropeanKnockoutRound('final', state.team);
    }

    // Copa del Rey: rondas progresivas
    if (compState.copaPhase && !['eliminated', 'champion'].includes(compState.copaPhase)) {
        const phaseWeeks = {
            round1: Math.floor(totalWeeks * 0.15),
            round32: Math.floor(totalWeeks * 0.25),
            round16: Math.floor(totalWeeks * 0.4),
            quarters: Math.floor(totalWeeks * 0.55),
            semis: Math.floor(totalWeeks * 0.7),
            final: Math.floor(totalWeeks * 0.85)
        };
        const targetWeek = phaseWeeks[compState.copaPhase];
        if (targetWeek && week === targetWeek) {
            console.log('🏆 Simulando Copa del Rey:', compState.copaPhase);
            simulateCopaDraw(state.team, compState.copaPhase);
            if (window.renderCompetitionsInStandings) window.renderCompetitionsInStandings();
        }
    }
}

function simulateEuropeanKnockoutRound(phase, myTeam) {
    const compState = getCompState();
    if (!compState) return;

    const group = compState.europeanGroup;
    const myRating = getMyRating();

    // Generar rival aleatorio de los equipos europeos
    let rivals;
    if (compState.europeanComp === 'champions') {
        rivals = [...EUROPEAN_TEAMS.champions_group_A, ...EUROPEAN_TEAMS.champions_group_B, ...EUROPEAN_TEAMS.champions_group_C];
    } else if (compState.europeanComp === 'europaLeague') {
        rivals = [...EUROPEAN_TEAMS.europa_group_A, ...EUROPEAN_TEAMS.europa_group_B];
    } else {
        rivals = [...EUROPEAN_TEAMS.conference_group_A];
    }

    const rival = rivals[Math.floor(Math.random() * rivals.length)];
    const result = simulateEuropeanMatch(myTeam, myRating, rival);

    compState.europeanKnockout.push({
        phase,
        rival: rival.name,
        myGoals: result.myGoals,
        oppGoals: result.oppGoals
    });

    const phaseOrder = ['round16', 'quarterfinals', 'semifinals', 'final'];
    const idx = phaseOrder.indexOf(phase);

    if (result.myGoals > result.oppGoals) {
        const next = phaseOrder[idx + 1];
        compState.europeanPhase = next || 'winner';
        if (!next) {
            window.gameLogic?.addNews(`🏆 ¡¡CAMPEONES DE LA ${getCompName(compState.europeanComp).toUpperCase()}!! ¡Leyendas!`, 'success');
        } else {
            window.gameLogic?.addNews(`✅ ${getCompName(compState.europeanComp)}: Superamos al ${rival.name} ${result.myGoals}-${result.oppGoals}. A ${getPhaseName(next)}`, 'success');
        }
    } else {
        compState.europeanPhase = 'eliminated';
        window.gameLogic?.addNews(`❌ ${getCompName(compState.europeanComp)}: Eliminados en ${getPhaseName(phase)} por ${rival.name} ${result.myGoals}-${result.oppGoals}`, 'error');
    }

    saveCompState(compState);
}

// ============================================================
// HOOK EN endSeason: CALCULAR CLASIFICACIÓN Y ASIGNAR PLAZAS
// ============================================================

function hookEndSeasonForCompetitions() {
    if (window._endSeasonCompHooked) return;

    // Enganchamos en el momento en que se llama injectMatchSummary
    // y detectamos fin de temporada via week > maxSeasonWeeks
    // Lo hacemos observando el estado tras cada simulación
    const origSimulate = window.simulateWeek;
    if (origSimulate && !window._compSeasonHooked) {
        window._compSeasonHooked = true;

        const hookedSimulate = window.simulateWeek;
        window.simulateWeek = async function() {
            const before = window.gameLogic?.getGameState();
            const result = await hookedSimulate.apply(this, arguments);
            const after = window.gameLogic?.getGameState();

            // Detectar cambio de temporada
            if (before && after && before.currentSeason !== after.currentSeason) {
                console.log('🏆 Temporada terminada, inicializando competiciones para', after.currentSeason);
                onSeasonEnd(before, after);
            }

            return result;
        };
    }

    window._endSeasonCompHooked = true;
}

function onSeasonEnd(beforeState, afterState) {
    // Calcular posición final de la temporada anterior
    const standings = beforeState.standings;
    if (!standings) return;

    const sorted = Object.entries(standings).sort((a, b) => {
        const ptsDiff = (b[1].pts || 0) - (a[1].pts || 0);
        if (ptsDiff !== 0) return ptsDiff;
        return ((b[1].gf || 0) - (b[1].gc || 0)) - ((a[1].gf || 0) - (a[1].gc || 0));
    });

    const myPos = sorted.findIndex(([n]) => n === beforeState.team) + 1;
    const newDivision = afterState.division;
    const newSeason = afterState.currentSeason;

    // Inicializar competiciones para la nueva temporada
    setTimeout(() => {
        const newComp = initCompetitionsForSeason(afterState.team, myPos, newDivision, newSeason);
        if (newComp.europeanComp) {
            window.gameLogic?.addNews(`🏆 ¡Has clasificado para la ${getCompName(newComp.europeanComp)}! Temporada ${newSeason}`, 'success');
        }
        if (newComp.copaQualified) {
            window.gameLogic?.addNews(`🏆 Tu equipo participará en la Copa del Rey ${newSeason}`, 'info');
        }
        renderCompetitionsInStandings();
        updateStandingsColors();
    }, 2000);
}

// ============================================================
// MODIFICAR CLASIFICACIÓN: COLORES POR POSICIÓN
// ============================================================

const ZONE_COLORS = {
    champions: { bg: 'rgba(30, 90, 200, 0.25)', border: '#1E5AC8', label: '🔵 UCL' },
    europaLeague: { bg: 'rgba(255, 140, 0, 0.2)', border: '#FF8C00', label: '🟠 UEL' },
    conferenceLague: { bg: 'rgba(0, 180, 100, 0.2)', border: '#00B464', label: '🟢 UECL' },
    playoff: { bg: 'rgba(180, 150, 0, 0.2)', border: '#B49600', label: '⭐ Playoff' },
    promoteAuto: { bg: 'rgba(50, 200, 50, 0.25)', border: '#32C832', label: '⬆️ Ascenso' },
    relegate: { bg: 'rgba(200, 40, 40, 0.25)', border: '#C82828', label: '⬇️ Descenso' }
};

function updateStandingsColors() {
    const state = window.gameLogic?.getGameState();
    if (!state) return;

    const division = state.division;
    const standings = state.standings;
    if (!standings) return;

    const sorted = Object.entries(standings).sort((a, b) => {
        const ptsDiff = (b[1].pts || 0) - (a[1].pts || 0);
        if (ptsDiff !== 0) return ptsDiff;
        return ((b[1].gf || 0) - (b[1].gc || 0)) - ((a[1].gf || 0) - (a[1].gc || 0));
    });

    const totalTeams = sorted.length;
    const cfg = COMPETITION_CONFIG[division] || {};

    // Eliminar leyenda anterior
    const oldLegend = document.getElementById('standings-zone-legend');
    if (oldLegend) oldLegend.remove();

    const rows = document.querySelectorAll('#standingsTable tr');

    rows.forEach((row, idx) => {
        const pos = idx + 1;

        // Reset
        row.style.background = '';
        row.style.borderLeft = '';

        if (division === 'primera') {
            if (cfg.champions?.includes(pos)) {
                row.style.background = ZONE_COLORS.champions.bg;
                row.style.borderLeft = `4px solid ${ZONE_COLORS.champions.border}`;
            } else if (cfg.europaLeague?.includes(pos)) {
                row.style.background = ZONE_COLORS.europaLeague.bg;
                row.style.borderLeft = `4px solid ${ZONE_COLORS.europaLeague.border}`;
            } else if (cfg.conferenceLague?.includes(pos)) {
                row.style.background = ZONE_COLORS.conferenceLague.bg;
                row.style.borderLeft = `4px solid ${ZONE_COLORS.conferenceLague.border}`;
            } else if (pos > totalTeams - cfg.relegate && cfg.relegate > 0) {
                row.style.background = ZONE_COLORS.relegate.bg;
                row.style.borderLeft = `4px solid ${ZONE_COLORS.relegate.border}`;
            }
        } else if (division === 'segunda') {
            if (cfg.promoteAuto?.includes(pos)) {
                row.style.background = ZONE_COLORS.promoteAuto.bg;
                row.style.borderLeft = `4px solid ${ZONE_COLORS.promoteAuto.border}`;
            } else if (cfg.promotePlayoff?.includes(pos)) {
                row.style.background = ZONE_COLORS.playoff.bg;
                row.style.borderLeft = `4px solid ${ZONE_COLORS.playoff.border}`;
            } else if (pos > totalTeams - cfg.relegate && cfg.relegate > 0) {
                row.style.background = ZONE_COLORS.relegate.bg;
                row.style.borderLeft = `4px solid ${ZONE_COLORS.relegate.border}`;
            }
        } else if (division === 'rfef_grupo1' || division === 'rfef_grupo2') {
            if (cfg.promoteAuto?.includes(pos)) {
                row.style.background = ZONE_COLORS.promoteAuto.bg;
                row.style.borderLeft = `4px solid ${ZONE_COLORS.promoteAuto.border}`;
            }
        }
    });

    // Añadir leyenda
    addStandingsLegend(division, cfg, totalTeams);
}

function addStandingsLegend(division, cfg, totalTeams) {
    const standingsPage = document.getElementById('standings');
    if (!standingsPage) return;

    let oldLegend = document.getElementById('standings-zone-legend');
    if (oldLegend) oldLegend.remove();

    const legend = document.createElement('div');
    legend.id = 'standings-zone-legend';
    legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;font-size:0.85em;padding:8px 0;';

    const items = [];

    if (division === 'primera') {
        if (cfg.champions?.length) items.push({ ...ZONE_COLORS.champions, text: `Pos ${cfg.champions.join(', ')}: Champions League` });
        if (cfg.europaLeague?.length) items.push({ ...ZONE_COLORS.europaLeague, text: `Pos ${cfg.europaLeague.join(', ')}: Europa League` });
        if (cfg.conferenceLague?.length) items.push({ ...ZONE_COLORS.conferenceLague, text: `Pos ${cfg.conferenceLague.join(', ')}: Conference League` });
        if (cfg.relegate) items.push({ ...ZONE_COLORS.relegate, text: `Pos ${totalTeams - cfg.relegate + 1}-${totalTeams}: Descenso` });
    } else if (division === 'segunda') {
        if (cfg.promoteAuto?.length) items.push({ ...ZONE_COLORS.promoteAuto, text: `Pos ${cfg.promoteAuto.join(', ')}: Ascenso directo` });
        if (cfg.promotePlayoff?.length) items.push({ ...ZONE_COLORS.playoff, text: `Pos ${cfg.promotePlayoff[0]}-${cfg.promotePlayoff[cfg.promotePlayoff.length-1]}: Playoff ascenso` });
        if (cfg.relegate) items.push({ ...ZONE_COLORS.relegate, text: `Pos ${totalTeams - cfg.relegate + 1}-${totalTeams}: Descenso` });
    } else {
        if (cfg.promoteAuto?.length) items.push({ ...ZONE_COLORS.promoteAuto, text: `Pos ${cfg.promoteAuto.join(', ')}: Ascenso a Segunda` });
    }

    items.forEach(item => {
        const span = document.createElement('span');
        span.style.cssText = `background:${item.bg};border-left:3px solid ${item.border};padding:4px 8px;border-radius:4px;color:#fff;`;
        span.textContent = item.text;
        legend.appendChild(span);
    });

    // Insertar después de la tabla
    const table = standingsPage.querySelector('table');
    if (table) {
        table.insertAdjacentElement('afterend', legend);
    }
}

// ============================================================
// UI: PANEL DE COMPETICIONES EN LA PÁGINA DE CLASIFICACIÓN
// ============================================================

function injectCompetitionsUI() {
    const standingsPage = document.getElementById('standings');
    if (!standingsPage) return;

    // Añadir botones de competición en el header si no existen
    const header = standingsPage.querySelector('.page-header');
    if (!header || document.getElementById('comp-tabs-container')) return;

    const tabsContainer = document.createElement('div');
    tabsContainer.id = 'comp-tabs-container';
    tabsContainer.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;';

    tabsContainer.innerHTML = `
        <button id="tab-liga" class="comp-tab active" onclick="window.showCompTab('liga')">
            ⚽ Liga
        </button>
        <button id="tab-europa" class="comp-tab" onclick="window.showCompTab('europa')">
            🏆 Europa
        </button>
        <button id="tab-copa" class="comp-tab" onclick="window.showCompTab('copa')">
            🥇 Copa del Rey
        </button>
    `;

    header.appendChild(tabsContainer);

    // Estilos de tabs
    const style = document.createElement('style');
    style.id = 'comp-tabs-style';
    style.textContent = `
        .comp-tab {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 6px 14px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 0.85em;
            transition: all 0.2s;
        }
        .comp-tab:hover { background: rgba(255,255,255,0.2); }
        .comp-tab.active {
            background: rgba(233, 69, 96, 0.6);
            border-color: #e94560;
        }
        #comp-europa-panel, #comp-copa-panel { display: none; }
        #comp-europa-panel.active, #comp-copa-panel.active { display: block; }

        .europa-group-table { width:100%; border-collapse:collapse; margin:10px 0; }
        .europa-group-table th, .europa-group-table td { padding:8px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.1); color:#fff; font-size:0.9em; }
        .europa-group-table th { color:#FFD700; font-size:0.8em; text-transform:uppercase; }
        .copa-round { background:rgba(255,255,255,0.05); border-radius:8px; padding:10px; margin:8px 0; border-left:3px solid #e94560; }
        .copa-round .round-name { color:#FFD700; font-size:0.85em; font-weight:bold; margin-bottom:4px; }
        .copa-result { font-size:1em; color:white; }
        .copa-win { color:#4CAF50; }
        .copa-loss { color:#f44336; }
        .copa-pending { color:rgba(255,255,255,0.5); font-style:italic; }

        .comp-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:0.75em; margin-left:6px; }
        .badge-ucl { background:#1E5AC8; }
        .badge-uel { background:#FF8C00; }
        .badge-uecl { background:#00B464; }
    `;
    if (!document.getElementById('comp-tabs-style')) {
        document.head.appendChild(style);
    }

    // Crear paneles
    const ligaContent = standingsPage.querySelector('table');
    if (ligaContent) {
        ligaContent.id = 'comp-liga-content';
    }

    const europaPanel = document.createElement('div');
    europaPanel.id = 'comp-europa-panel';
    standingsPage.appendChild(europaPanel);

    const copaPanel = document.createElement('div');
    copaPanel.id = 'comp-copa-panel';
    standingsPage.appendChild(copaPanel);
}

window.showCompTab = function(tab) {
    // Actualizar botones
    document.querySelectorAll('.comp-tab').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('tab-' + tab);
    if (activeBtn) activeBtn.classList.add('active');

    // Mostrar/ocultar contenido
    const ligaTable = document.getElementById('comp-liga-content');
    const legendEl = document.getElementById('standings-zone-legend');
    const europaPanel = document.getElementById('comp-europa-panel');
    const copaPanel = document.getElementById('comp-copa-panel');

    if (tab === 'liga') {
        if (ligaTable) ligaTable.style.display = '';
        if (legendEl) legendEl.style.display = '';
        if (europaPanel) europaPanel.classList.remove('active');
        if (copaPanel) copaPanel.classList.remove('active');
        updateStandingsColors();
    } else if (tab === 'europa') {
        if (ligaTable) ligaTable.style.display = 'none';
        if (legendEl) legendEl.style.display = 'none';
        if (europaPanel) europaPanel.classList.add('active');
        if (copaPanel) copaPanel.classList.remove('active');
        renderEuropaPanel();
    } else if (tab === 'copa') {
        if (ligaTable) ligaTable.style.display = 'none';
        if (legendEl) legendEl.style.display = 'none';
        if (europaPanel) europaPanel.classList.remove('active');
        if (copaPanel) copaPanel.classList.add('active');
        renderCopaPanel();
    }
};

// ============================================================
// RENDERIZAR PANEL EUROPEO
// ============================================================

function renderEuropaPanel() {
    const panel = document.getElementById('comp-europa-panel');
    if (!panel) return;

    const compState = getCompState();
    const state = window.gameLogic?.getGameState();

    if (!compState || !compState.europeanComp) {
        panel.innerHTML = `
            <div style="text-align:center;padding:40px;color:rgba(255,255,255,0.5);">
                <div style="font-size:3em;margin-bottom:10px;">🌍</div>
                <div style="font-size:1.1em;">Tu equipo no está clasificado para competición europea esta temporada.</div>
                <div style="font-size:0.9em;margin-top:8px;color:rgba(255,255,255,0.3);">
                    Clasifica entre los 6 primeros de Primera División para acceder a Europa.
                </div>
            </div>
        `;
        return;
    }

    const compName = getCompName(compState.europeanComp);
    const phase = compState.europeanPhase;
    let html = `<h3 style="color:#FFD700;margin:15px 0 10px;">${getCompEmoji(compState.europeanComp)} ${compName} — ${state?.currentSeason || ''}</h3>`;

    if (phase === 'groups' && compState.europeanGroupStandings) {
        html += renderGroupStandingsHTML(compState);
    } else if (phase === 'eliminated') {
        html += renderKnockoutHistoryHTML(compState);
        html += `<div style="text-align:center;padding:20px;color:#f44336;font-size:1.1em;">😞 Eliminados de la ${compName}</div>`;
    } else if (phase === 'winner') {
        html += renderKnockoutHistoryHTML(compState);
        html += `<div style="text-align:center;padding:20px;color:#FFD700;font-size:1.3em;font-weight:bold;">🏆 ¡CAMPEONES DE LA ${compName.toUpperCase()}!</div>`;
    } else {
        // Fase eliminatoria activa
        html += renderGroupStandingsHTML(compState);
        html += renderKnockoutHistoryHTML(compState);
        html += `<div style="text-align:center;padding:10px;color:#4CAF50;">✅ Clasificados para: ${getPhaseName(phase)}</div>`;
    }

    panel.innerHTML = html;
}

function getCompEmoji(comp) {
    return comp === 'champions' ? '⭐' : comp === 'europaLeague' ? '🟠' : '🟢';
}

function renderGroupStandingsHTML(compState) {
    if (!compState.europeanGroupStandings) return '';

    const sorted = Object.entries(compState.europeanGroupStandings).sort((a, b) => {
        const ptsDiff = b[1].pts - a[1].pts;
        if (ptsDiff !== 0) return ptsDiff;
        return (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc);
    });

    const myTeam = compState.team;

    let html = `<div style="margin-bottom:15px;">
        <div style="color:rgba(255,255,255,0.6);font-size:0.85em;margin-bottom:8px;">Fase de Grupos</div>
        <table class="europa-group-table">
            <thead><tr><th>Pos</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>Pts</th></tr></thead>
            <tbody>`;

    sorted.forEach(([name, stats], idx) => {
        const isMe = name === myTeam;
        const bg = isMe ? 'background:rgba(233,69,96,0.2);' : (idx < 2 ? 'background:rgba(30,90,200,0.15);' : '');
        const bold = isMe ? 'font-weight:bold;' : '';
        html += `<tr style="${bg}${bold}">
            <td>${idx + 1}</td>
            <td style="text-align:left;">${isMe ? '⭐ ' : ''}${name}</td>
            <td>${stats.pj}</td><td>${stats.g}</td><td>${stats.e}</td><td>${stats.p}</td>
            <td>${stats.gf}</td><td>${stats.gc}</td>
            <td><strong>${stats.pts}</strong></td>
        </tr>`;
    });

    html += '</tbody></table>';

    // Resultados del grupo
    if (compState.europeanResults?.length > 0) {
        html += `<div style="color:rgba(255,255,255,0.6);font-size:0.8em;margin:10px 0 5px;">Resultados</div>`;
        compState.europeanResults.forEach(r => {
            const win = r.myGoals > r.oppGoals;
            const draw = r.myGoals === r.oppGoals;
            const icon = win ? '✅' : draw ? '🤝' : '❌';
            const color = win ? '#4CAF50' : draw ? '#FFD700' : '#f44336';
            html += `<div style="color:${color};font-size:0.9em;padding:3px 0;">${icon} ${r.jornada === 'ida' ? '(Casa)' : '(Fuera)'} vs ${r.rival}: <strong>${r.myGoals}-${r.oppGoals}</strong></div>`;
        });
    }

    html += '</div>';
    return html;
}

function renderKnockoutHistoryHTML(compState) {
    if (!compState.europeanKnockout?.length) return '';

    let html = `<div style="margin-top:10px;"><div style="color:rgba(255,255,255,0.6);font-size:0.85em;margin-bottom:8px;">Fase Eliminatoria</div>`;
    compState.europeanKnockout.forEach(r => {
        const win = r.myGoals > r.oppGoals;
        const color = win ? '#4CAF50' : '#f44336';
        const icon = win ? '✅' : '❌';
        html += `<div class="copa-round">
            <div class="round-name">${getPhaseName(r.phase)}</div>
            <div class="copa-result" style="color:${color};">${icon} vs ${r.rival}: <strong>${r.myGoals}-${r.oppGoals}</strong></div>
        </div>`;
    });
    html += '</div>';
    return html;
}

// ============================================================
// RENDERIZAR PANEL COPA DEL REY
// ============================================================

function renderCopaPanel() {
    const panel = document.getElementById('comp-copa-panel');
    if (!panel) return;

    const compState = getCompState();
    const state = window.gameLogic?.getGameState();

    if (!compState || !compState.copaQualified) {
        panel.innerHTML = `
            <div style="text-align:center;padding:40px;color:rgba(255,255,255,0.5);">
                <div style="font-size:3em;margin-bottom:10px;">🥇</div>
                <div style="font-size:1.1em;">Tu equipo no participa en la Copa del Rey esta temporada.</div>
                <div style="font-size:0.9em;margin-top:8px;color:rgba(255,255,255,0.3);">
                    Solo equipos de Primera y Segunda División participan.
                </div>
            </div>
        `;
        return;
    }

    const phaseOrder = ['round1', 'round32', 'round16', 'quarters', 'semis', 'final'];
    const currentPhase = compState.copaPhase;
    const myTeam = compState.team;

    let html = `<h3 style="color:#FFD700;margin:15px 0 10px;">🥇 Copa del Rey — ${state?.currentSeason || ''}</h3>`;

    // Estado actual
    if (currentPhase === 'eliminated') {
        const lastResult = compState.copaResults?.[compState.copaResults.length - 1];
        html += `<div style="background:rgba(244,67,54,0.15);border-radius:8px;padding:12px;margin-bottom:15px;border-left:3px solid #f44336;">
            <strong style="color:#f44336;">❌ ELIMINADO</strong>
            ${lastResult ? `<br><span style="color:rgba(255,255,255,0.7);font-size:0.9em;">en ${getPhaseName(lastResult.phase)} vs ${lastResult.opponent} (${lastResult.myGoals}-${lastResult.oppGoals})</span>` : ''}
        </div>`;
    } else if (currentPhase === 'champion') {
        html += `<div style="background:rgba(255,215,0,0.2);border-radius:8px;padding:15px;margin-bottom:15px;text-align:center;border:2px solid #FFD700;">
            <div style="font-size:2em;">🏆</div>
            <strong style="color:#FFD700;font-size:1.2em;">¡CAMPEÓN DE LA COPA DEL REY!</strong>
        </div>`;
    } else {
        const nextOpponent = compState.copaOpponents?.[currentPhase];
        html += `<div style="background:rgba(76,175,80,0.15);border-radius:8px;padding:12px;margin-bottom:15px;border-left:3px solid #4CAF50;">
            <strong style="color:#4CAF50;">✅ EN COMPETICIÓN</strong>
            <br><span style="color:rgba(255,255,255,0.7);font-size:0.9em;">Próxima ronda: <strong>${getPhaseName(currentPhase)}</strong></span>
            ${nextOpponent ? `<br><span style="color:rgba(255,255,255,0.5);font-size:0.85em;">Posible rival: ${nextOpponent}</span>` : ''}
        </div>`;
    }

    // Historial de rondas
    html += `<div style="color:rgba(255,255,255,0.6);font-size:0.85em;margin-bottom:8px;">Historial</div>`;

    phaseOrder.forEach(phase => {
        const result = compState.copaResults?.find(r => r.phase === phase);
        const opponent = compState.copaOpponents?.[phase];
        const isCurrent = phase === currentPhase && !['eliminated', 'champion'].includes(currentPhase);
        const isPast = phaseOrder.indexOf(phase) < phaseOrder.indexOf(currentPhase) || ['eliminated', 'champion'].includes(currentPhase);

        html += `<div class="copa-round" style="${isCurrent ? 'border-color:#FFD700;' : ''}">
            <div class="round-name">${getPhaseName(phase)}</div>`;

        if (result) {
            const win = result.myGoals > result.oppGoals;
            html += `<div class="copa-result ${win ? 'copa-win' : 'copa-loss'}">
                ${win ? '✅' : '❌'} vs ${result.opponent}: <strong>${result.myGoals}-${result.oppGoals}</strong>
            </div>`;
        } else if (isCurrent) {
            html += `<div class="copa-pending">⏳ Pendiente${opponent ? ` · Rival: ${opponent}` : ''}</div>`;
        } else if (!isPast) {
            html += `<div class="copa-pending">— No alcanzado aún</div>`;
        }

        html += `</div>`;
    });

    panel.innerHTML = html;
}

// ============================================================
// RENDERIZAR COMPETICIONES EN CLASIFICACIÓN (BADGES)
// ============================================================

window.renderCompetitionsInStandings = function() {
    updateStandingsColors();
    renderEuropaPanel();
    renderCopaPanel();
};

// ============================================================
// HOOK EN APERTURA DE PÁGINA DE CLASIFICACIÓN
// ============================================================

function hookStandingsPage() {
    // Observar clics en el botón de clasificación
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[onclick*="standings"]') || e.target.closest('.classification-icon');
        if (btn) {
            setTimeout(() => {
                injectCompetitionsUI();
                updateStandingsColors();
                // Asegurar que la tabla de liga tenga ID
                const table = document.querySelector('#standings table');
                if (table && !table.id) table.id = 'comp-liga-content';
            }, 400);
        }
    });

    // También interceptar openPage si existe
    const originalOpenPage = window.openPage;
    if (originalOpenPage && !window._standingsHooked) {
        window._standingsHooked = true;
        window.openPage = function(pageId, ...args) {
            originalOpenPage.call(this, pageId, ...args);
            if (pageId === 'standings') {
                setTimeout(() => {
                    injectCompetitionsUI();
                    updateStandingsColors();
                    const table = document.querySelector('#standings table');
                    if (table && !table.id) table.id = 'comp-liga-content';
                }, 300);
            }
        };
    }
}

// ============================================================
// DETECTAR INICIO DE JUEGO Y CARGAR COMPETICIONES EXISTENTES
// ============================================================

function initOnGameLoad() {
    const state = window.gameLogic?.getGameState();
    if (!state?.team) return;

    const compState = getCompState();
    if (compState && compState.team === state.team && compState.season === state.currentSeason) {
        console.log('🏆 Competiciones existentes cargadas:', compState.europeanComp || 'ninguna');
        return;
    }

    // Si es inicio de partida nueva, calcular posición actual y ver si aplica
    if (state.division === 'primera' || state.division === 'segunda') {
        const standings = state.standings;
        if (standings && Object.keys(standings).length > 0) {
            const sorted = Object.entries(standings).sort((a, b) => (b[1].pts || 0) - (a[1].pts || 0));
            const myPos = sorted.findIndex(([n]) => n === state.team) + 1;
            if (myPos > 0) {
                initCompetitionsForSeason(state.team, myPos, state.division, state.currentSeason);
            }
        }
    }
}

// ============================================================
// INICIALIZACIÓN PRINCIPAL
// ============================================================

setTimeout(() => {
    if (!window.gameLogic) {
        console.warn('⚠️ gameLogic no disponible aún');
        setTimeout(initCompetitionsSystem, 2000);
        return;
    }
    initCompetitionsSystem();
}, 2000);

function initCompetitionsSystem() {
    console.log('🏆 Iniciando sistema de competiciones...');
    initOnGameLoad();
    hookStandingsPage();
    hookSimulateWeekForCompetitions();

    // Exponer funciones globales
    window.CompetitionsSystem = {
        getState: getCompState,
        reset: () => { clearCompState(); initOnGameLoad(); },
        initForSeason: initCompetitionsForSeason,
        simulateGroups: simulateGroupPhase,
        simulateCopa: simulateCopaDraw,
        renderEuropa: renderEuropaPanel,
        renderCopa: renderCopaPanel,
        updateColors: updateStandingsColors
    };

    console.log('✅ Sistema de competiciones listo');
}

// ============================================================
// ESTILOS CSS ADICIONALES PARA FILAS DE CLASIFICACIÓN
// ============================================================

(function addCompStyles() {
    const style = document.createElement('style');
    style.id = 'comp-zone-styles';
    style.textContent = `
        #standingsTable tr {
            transition: background 0.3s;
        }
        #standingsTable tr:hover {
            filter: brightness(1.2);
        }
    `;
    if (!document.getElementById('comp-zone-styles')) {
        document.head.appendChild(style);
    }
})();

console.log('✅ injector-competitions.js cargado');
