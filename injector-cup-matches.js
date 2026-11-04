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
    playoff: {
        name:'Playoff de ascenso', shortName:'Playoff de ascenso',
        emoji:'⬆️', color:'#2E7D32', accentColor:'#66BB6A',
        gradient:'linear-gradient(135deg,#06240f 0%,#0d3d1c 50%,#1b5e20 100%)'
    },
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
    // comps_v2 sigue en localStorage (lo gestiona injector-competitions.js)
    try { return JSON.parse(localStorage.getItem('comps_v2')); }
    catch(e) { return null; }
}
function saveCompState(c) {
    try { localStorage.setItem('comps_v2', JSON.stringify(c)); } catch(e) {}
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
        // Solo se sortea la primera ronda; las siguientes, al llegar a ellas (como en la realidad)
        const copaMatches = cal.filter(m=>m.type==='copa');
        copaMatches.forEach((m,i)=>{
            m.opponent = i===0 ? getCopaRival(division, m.phase, []) : null;
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

// ============================================================
// RIVALES, FUERZA, PRÓRROGA Y PENALTIS
// - Rivales de Copa: equipos reales de la estructura de ligas de la partida,
//   de menos a más nivel según la ronda.
// - Rivales europeos asignados al desbloquear cada eliminatoria (antes "null").
// - Fuerza real de los equipos españoles (mismo motor que la liga) y por
//   categorías para los extranjeros.
// - Empates en eliminatoria: prórroga y penaltis. Final en campo neutral.
// ============================================================
const FOREIGN_TIERS = {
    86: ['Liverpool FC','Arsenal FC','Manchester City','Bayern München','PSG','Inter de Milán'],
    82: ['Chelsea FC','Bayer Leverkusen','B. Dortmund','Juventus FC','SSC Napoli','Atalanta BC','Tottenham Hotspur','Manchester United','RB Leipzig','AS Roma'],
    78: ['Eintracht Frankfurt','AS Monaco','Olympique Marsella','PSV Eindhoven','Sporting CP','Benfica SL','FC Porto','SS Lazio','Fiorentina','Olympique Lyonnais','RC Lens','Galatasaray SK','Fenerbahçe SK','Feyenoord','Ajax','Club Bruges'],
    73: ['Celtic FC','Rangers FC','Red Bull Salzburg','Shakhtar','Olympiacos','Braga','AZ Alkmaar','PAOK FC','Anderlecht','Union Saint-Gilloise','Dinamo Zagreb','Slavia Praha','Sparta Praha','FC Basel','Gent','FC Midtjylland','Sturm Graz']
};
function foreignRating(team) {
    for (const [r, list] of Object.entries(FOREIGN_TIERS)) if (list.includes(team)) return Number(r);
    return 68;
}

// Apellidos por país para los goleadores de equipos extranjeros
const COUNTRY_OF = t =>
    /Liverpool|Arsenal|Manchester|Chelsea|Tottenham/.test(t) ? 'en' :
    /München|Leverkusen|Frankfurt|Dortmund|Leipzig/.test(t) ? 'de' :
    /Milán|Atalanta|Juventus|Napoli|Roma|Lazio|Fiorentina|Sampdoria/.test(t) ? 'it' :
    /PSG|Monaco|Marsella|Lyonnais|Lens/.test(t) ? 'fr' :
    /Sporting|Benfica|Porto|Braga/.test(t) ? 'pt' :
    /PSV|Ajax|Feyenoord|AZ /.test(t) ? 'nl' :
    /Galatasaray|Fenerbahçe/.test(t) ? 'tr' : 'xx';
const SURNAMES = {
    en: ['Walker','Rice','Foden','Saka','Palmer','Gordon','Watkins','Bowen','Mainoo','James','Gallagher','Toney'],
    de: ['Müller','Schmidt','Wagner','Becker','Hofmann','Krämer','Neumann','Brandt','Weber','Schulz','Fischer','Hahn'],
    it: ['Rossi','Bianchi','Romano','Esposito','Ricci','Marino','Greco','Conti','Barella','Colombo','Ferri','Galli'],
    fr: ['Martin','Bernard','Dubois','Moreau','Laurent','Girard','Lefèvre','Roux','Fournier','Mercier','Blanc','Faure'],
    pt: ['Silva','Santos','Ferreira','Pereira','Costa','Oliveira','Rodrigues','Gomes','Lopes','Marques','Sousa','Pinto'],
    nl: ['de Jong','Bakker','Visser','Smit','Meijer','de Boer','Mulder','Bos','Vos','Dekker','Peters','Hendriks'],
    tr: ['Yılmaz','Kaya','Demir','Şahin','Çelik','Yıldız','Aydın','Öztürk','Arslan','Doğan','Kılıç','Aslan'],
    xx: ['Novak','Horvat','Kovač','Petrov','Ivanov','Jensen','Nielsen','Larsen','Andersen','Popescu','Nagy','Kowalski']
};

function leaguesOfGame() {
    const gs = getGS();
    return gs?.leagues || window.TEAMS_DATA || {};
}

function getCopaRival(division, phase, exclude = []) {
    const L = leaguesOfGame();
    const gs = getGS();
    const pools = {
        copa_r1:   ['rfef_grupo1', 'rfef_grupo2', 'promesas'],
        copa_r32:  ['segunda', 'rfef_grupo1', 'rfef_grupo2'],
        copa_r16:  ['primera', 'segunda'],
        copa_qf:   ['primera', 'primera', 'segunda'],
        copa_sf:   ['primera'],
        copa_final:['primera']
    }[phase] || ['primera', 'segunda'];
    const candidates = pools.flatMap(d => L[d] || []).filter(t => t && t !== gs?.team && !exclude.includes(t));
    if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
    const fallback = (L.primera || []).filter(t => t !== gs?.team);
    return fallback[Math.floor(Math.random() * fallback.length)] || 'Real Valladolid';
}

function facedRivals() {
    const comp = getCompState() || {};
    const cal = getCal() || [];
    return [...new Set([...(comp.europeanResults || []).map(r => r.rival), ...cal.filter(m => m.opponent).map(m => m.opponent)])];
}

// Garantiza que el partido tiene rival (ida/vuelta con el mismo)
function ensureOpponent(m) {
    if (m.opponent && m.opponent !== 'null') return;
    const cal = getCal();
    if (/_2$/.test(m.id)) {
        const leg1 = cal.find(x => x.id === m.id.replace(/_2$/, '_1'));
        if (leg1?.opponent) { m.opponent = leg1.opponent; return; }
    }
    if (m.type === 'copa') {
        m.opponent = getCopaRival(getGS()?.division, m.phase, facedRivals());
    } else {
        const pool = (EU_POOLS[m.type] || EU_POOLS.champions).filter(t => !facedRivals().includes(t));
        const list = pool.length ? pool : (EU_POOLS[m.type] || EU_POOLS.champions);
        m.opponent = list[Math.floor(Math.random() * list.length)];
    }
}

async function prepareMatch(m) {
    ensureOpponent(m);
    m.neutral = m.phase === 'copa_final' || m.id === 'eu_final';
    const L = leaguesOfGame();
    const spanishDiv = Object.keys(L).find(k => (L[k] || []).includes(m.opponent));
    m.oppSquad = null;
    if (spanishDiv && window.pcfTeamStrength) {
        try {
            m.oppRating = Math.round(await window.pcfTeamStrength(m.opponent, spanishDiv));
            const squad = await window.pcfTeamSquad(m.opponent, spanishDiv);
            m.oppSquad = (squad || []).map(p => ({ name: p.name, position: p.position }));
        } catch (e) { m.oppRating = null; }
    }
    if (!m.oppRating) m.oppRating = foreignRating(m.opponent) + (Math.floor(Math.random() * 5) - 2);
    if (m.neutral) {
        // Sorteo de quién actúa como local en la final
        m.drawnHome = Math.random() < 0.5;
    }
    return m;
}

function poisson(lambda) {
    const L = Math.exp(-lambda); let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
}

// ¿Este partido decide la eliminatoria? (partido único o vuelta)
function decidesTie(m) {
    if (m.type === 'copa') return m.id !== 'copa_sf_1';
    if (m.isFinal) return true;
    return (m.isPlayoff || m.isKnockout) && /_2$/.test(m.id);
}

function aggregateBefore(m) {
    if (!/_2$/.test(m.id)) return { my: 0, opp: 0 };
    const cal = getCal();
    const leg1 = cal.find(x => x.id === m.id.replace(/_2$/, '_1'));
    return { my: leg1?.result?.myGoals || 0, opp: leg1?.result?.oppGoals || 0 };
}

function resolveTie(m, result) {
    if (!decidesTie(m)) return result;
    const agg = aggregateBefore(m);
    let my = agg.my + result.myGoals, opp = agg.opp + result.oppGoals;
    if (my !== opp) { result.qualified = my > opp; return result; }
    // Prórroga (30 minutos ≈ un tercio de los goles esperados)
    const etMy = poisson((result.myXG || 1.2) / 3), etOpp = poisson((result.oppXG || 1.2) / 3);
    result.extraTime = { my: etMy, opp: etOpp };
    result.myGoals += etMy; result.oppGoals += etOpp;
    my += etMy; opp += etOpp;
    if (my !== opp) { result.qualified = my > opp; }
    else {
        // Penaltis: 5 por equipo y muerte súbita
        let pm = 0, po = 0, i = 0;
        for (; i < 5; i++) { if (Math.random() < 0.76) pm++; if (Math.random() < 0.76) po++; }
        while (pm === po && i < 30) { if (Math.random() < 0.76) pm++; if (Math.random() < 0.76) po++; i++; }
        result.penalties = { my: pm, opp: po };
        result.qualified = pm > po;
    }
    result.win = result.myGoals > result.oppGoals;
    result.draw = result.myGoals === result.oppGoals;
    result.loss = !result.win && !result.draw;
    return result;
}

// ============================================================
// OBTENER PARTIDO PENDIENTE PARA ESTA SEMANA
// ============================================================
function getPendingMatch(week) {
    const cal  = getCal();
    const comp = getCompState();

    for (const m of cal) {
        if (m.played || m.eliminated) continue;
        // Toca jugarlo esta semana o ya va con retraso (dos partidos en la misma jornada,
        // o ronda desbloqueada con la jornada ya pasada). Antes solo si coincidía exacta.
        if (m.afterLigaWeek > week) continue;
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
    let myRating = 75;
    if (window.calculateTeamEffectiveOverallImproved && gs?.lineup?.length) {
        myRating = window.calculateTeamEffectiveOverallImproved(gs.lineup.slice(0,11), gs.formation || '433');
    } else if (gs?.squad?.length) {
        myRating = gs.squad.reduce((a,b)=>a+(b.overall||70),0)/gs.squad.length;
    }
    const oppRating = match.oppRating || 75;
    const forms = (gs?.lineup||[]).map(p=>p.form||75);
    const myForm = forms.length ? forms.reduce((a,b)=>a+b,0)/forms.length : 75;

    // Mismo motor que la liga (Poisson). "team" = nosotros; la prima y la
    // táctica se aplican a nuestro lado (homeIsUser indica el lado "team").
    const engine = window.calculateMatchOutcomeImproved;
    const out = engine ? engine({
        teamOverall: myRating, opponentOverall: oppRating,
        teamFormation: gs?.formation || '433', teamMentality: gs?.mentality || 'balanced',
        isHome: !!match.isHome, neutral: !!match.neutral, teamForm: myForm, opponentForm: 75,
        homeIsUser: true, awayIsUser: false
    }) : { teamGoals: Math.floor(Math.random()*3), opponentGoals: Math.floor(Math.random()*3), teamXG: 1.2, opponentXG: 1.2 };

    const myG = out.teamGoals, opG = out.opponentGoals;
    const result = { myGoals:myG, oppGoals:opG, myXG: out.teamXG, oppXG: out.opponentXG,
        win: myG>opG, draw: myG===opG, loss: myG<opG,
        myTeam: gs?.team, opponent: match.opponent, isHome: match.isHome, neutral: !!match.neutral };
    console.log(`🏆 Copa/Europa: ${gs?.team} (${myRating.toFixed(1)}) ${myG}-${opG} ${match.opponent} (${oppRating})`);
    return resolveTie(match, result);
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
        // Ida de semifinales: no decide nada todavía
        if(match.id==='copa_sf_1'){
            const sf2=cal.find(m=>m.id==='copa_sf_2'); if(sf2){ sf2.opponent=match.opponent; }
            comp.copaResults=[...(comp.copaResults||[]),{phase:'copa_sf',leg:1,rival:match.opponent,opponent:match.opponent,myGoals:result.myGoals,oppGoals:result.oppGoals,win:result.win}];
            saveCal(cal);saveCompState(comp);
            return {advances:null,isLeg:true};
        }
        const qualified = result.qualified ?? result.win;
        if(qualified){
            const order=['copa_r1','copa_r32','copa_r16','copa_qf','copa_sf','copa_final'];
            const idx=order.indexOf(match.phase);
            comp.copaPhase=order[idx+1]||'champion';
            // Sorteo de la siguiente ronda (ahora, no antes)
            const nextPhase=order[idx+1];
            const nextMatches=cal.filter(m=>m.type==='copa'&&m.phase===nextPhase&&!m.played);
            if(nextMatches.length){
                const rival=getCopaRival(getGS()?.division, nextPhase, [...(comp.copaResults||[]).map(r=>r.rival), match.opponent]);
                nextMatches.forEach(m=>{ m.opponent=rival; });
                const label=(PHASE_NAMES[nextPhase]||nextPhase);
                window.gameLogic?.addNews?.(`🎲 Sorteo de Copa del Rey — ${label}: te enfrentarás al ${rival}.`, 'info');
            }
        }else{
            comp.copaPhase='eliminated';
            cal.filter(m=>m.type==='copa'&&!m.played).forEach(m=>m.eliminated=true);
        }
        comp.copaResults=[...(comp.copaResults||[]),{phase:match.phase,leg:match.id==='copa_sf_2'?2:undefined,rival:match.opponent,opponent:match.opponent,myGoals:result.myGoals,oppGoals:result.oppGoals,win:qualified,extraTime:result.extraTime||null,penalties:result.penalties||null}];
        saveCal(cal);saveCompState(comp);
        return {advances:qualified};
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
            const adv=result.qualified ?? (totMy>totOp);
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
            const won = result.qualified ?? result.win;
            comp.europeanPhase=won?'champion':'eliminated';
            if(won)window.gameLogic?.addNews(`🏆 ¡¡CAMPEONES DE LA ${(CUP_CONFIG[match.type]?.name||'').toUpperCase()}!!`,'success');
            saveCompState(comp);
            return {advances:won};
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
            const adv=result.qualified ?? (totMy>totOp);
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
    if (!match.isHome || match.neutral) return 0;
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
function genScorers(team,n,isMine,squad){
    const gs=getGS();
    const out=[],used=new Set();
    const weight=p=>p.position==='DC'?4:p.position==='EXT'||p.position==='MCO'?3:['MC','MI','MD'].includes(p.position)?2:p.position==='POR'?0:1;
    const pickFrom=arr=>{
        const pool=arr.filter(p=>weight(p)>0);
        const tot=pool.reduce((a,p)=>a+weight(p),0);
        let r=Math.random()*tot;
        for(const p of pool){ r-=weight(p); if(r<=0) return p.name; }
        return pool[0]?.name;
    };
    for(let i=0;i<n;i++){
        let min;do{min=Math.floor(Math.random()*90)+1;}while(used.has(min));used.add(min);
        let name;
        if(isMine&&gs?.squad?.length){
            const xi=(gs.lineup||[]).filter(Boolean);
            name=pickFrom(xi.length?xi:gs.squad.filter(p=>!p.isInjured));
        }else if(squad&&squad.length){
            name=pickFrom(squad);                       // equipo español: su plantilla real
        }else{
            const list=SURNAMES[COUNTRY_OF(team)]||SURNAMES.xx; // extranjero: apellido de su país
            name=list[Math.floor(Math.random()*list.length)];
        }
        out.push({name:name||'—',min,team,mine:isMine});
    }
    return out.sort((a,b)=>a.min-b.min);
}

// ============================================================
// MODAL 1 — ANUNCIO DEL PARTIDO (HYPE)
// ============================================================
function showAnnouncementModal(match) {
    return new Promise(resolve => {
        const cfg = CUP_CONFIG[match.type] || CUP_CONFIG.copa;
        const phaseName = PHASE_NAMES[match.phase] || match.phase;
        const locText = match.neutral
            ? `🏟️ CAMPO NEUTRAL · Sorteo: actúa como local ${match.drawnHome !== false ? (getGS()?.team || 'tu equipo') : match.opponent}`
            : match.isHome ? '🏟️ EN CASA' : '✈️ A DOMICILIO';
        const gs = getGS();
        const myTeam = gs?.team || 'Tu Equipo';

        // ── Datos de lesionados y alineación ──────────────────
        function getInjuredList() {
            const squad = gs?.squad || [];
            return squad.filter(p => p.isInjured);
        }
        function getLineup() {
            return gs?.lineup || [];
        }
        function getInjuredInLineup() {
            const lineup = getLineup();
            const injured = new Set(getInjuredList().map(p => p.name));
            return lineup.filter(p => injured.has(p.name));
        }

        // ── Prima actual ───────────────────────────────────────
        function getCurrentBonus() {
            return window._fdGetMatchBonus ? window._fdGetMatchBonus() : 0;
        }
        function fmt(n) { return Math.round(n).toLocaleString('es-ES'); }

        // ── Construir HTML de lesionados ───────────────────────
        function buildInjuredHTML() {
            const injured = getInjuredList();
            if (!injured.length) return `<div style="color:#4CAF50;font-size:.85em">✅ Toda la plantilla disponible</div>`;
            const inLineup = getInjuredInLineup();
            let html = injured.map(p =>
                `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.07)">
                    <span style="color:#f44336">🚑</span>
                    <span style="color:#fff;flex:1">${p.name}</span>
                    <span style="color:#888;font-size:.8em">${p.position||''}</span>
                    ${getLineup().some(l=>l.name===p.name)
                        ? '<span style="color:#FF8F00;font-size:.75em;background:rgba(255,143,0,.2);padding:2px 6px;border-radius:4px">⚠️ EN 11</span>'
                        : ''}
                </div>`
            ).join('');
            if (inLineup.length) {
                html += `<div style="margin-top:8px;padding:8px;background:rgba(255,143,0,.15);border:1px solid #FF8F00;border-radius:8px;font-size:.82em;color:#FF8F00">
                    ⚠️ Tienes ${inLineup.length} jugador(es) lesionado(s) en el once. ¡Revisa la alineación!
                </div>`;
            }
            return html;
        }

        // ── Construir HTML de prima ────────────────────────────
        function buildBonusHTML() {
            const current = getCurrentBonus();
            const boost = current > 0 ? Math.min(25, Math.round(Math.sqrt(current / 50000) * 2)) : 0;
            return `
            <div id="cu-bonus-section">
                ${current > 0
                    ? `<div style="background:rgba(255,143,0,.2);border:1px solid #FF8F00;border-radius:8px;padding:10px;margin-bottom:10px;font-size:.85em;color:#FF8F00">
                        💰 Prima activa: <strong>${fmt(current)}€</strong> → boost rendimiento <strong>+${boost}</strong>
                       </div>`
                    : ''}
                <div style="display:flex;gap:8px;align-items:center">
                    <select id="cu-bonus-sel" style="flex:1;background:#1a1a1a;color:#fff;border:1px solid #333;border-radius:8px;padding:8px;font-size:.85em">
                        <option value="0">Sin prima</option>
                        <option value="50000">50.000€ — +2 rendimiento</option>
                        <option value="100000">100.000€ — +3 rendimiento</option>
                        <option value="250000" selected>250.000€ — +4 rendimiento</option>
                        <option value="500000">500.000€ — +6 rendimiento</option>
                        <option value="1000000">1.000.000€ — +9 rendimiento</option>
                    </select>
                    <button id="cu-bonus-btn" style="background:#FF8F00;color:#fff;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-weight:bold;white-space:nowrap;font-size:.85em">
                        💰 Prometer
                    </button>
                </div>
                <div id="cu-bonus-msg" style="font-size:.78em;color:#aaa;margin-top:5px">
                    Saldo actual: <strong style="color:#4CAF50">${fmt(gs?.balance || 0)}€</strong>
                </div>
            </div>`;
        }

        // ── Construir modal ────────────────────────────────────
        const el = document.createElement('div');
        el.id = 'cupAnnModal';
        el.innerHTML = `<style>
#cupAnnModal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.97);display:flex;align-items:center;justify-content:center;z-index:999999;overflow-y:auto;animation:cu-fi .4s ease;padding:16px;box-sizing:border-box}
@keyframes cu-fi{from{opacity:0}to{opacity:1}}
@keyframes cu-pg{0%,100%{box-shadow:0 0 20px ${cfg.color}44}50%{box-shadow:0 0 50px ${cfg.color}88}}
@keyframes cu-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.cu-box{background:${cfg.gradient};border:2px solid ${cfg.color}88;border-radius:20px;padding:24px 20px;max-width:520px;width:100%;position:relative;animation:cu-pg 2s ease-in-out infinite}
.cu-header{text-align:center;margin-bottom:18px;animation:cu-up .4s .1s both}
.cu-comp{font-size:.78em;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${cfg.accentColor};margin-bottom:4px}
.cu-logo{font-size:2.5em;margin:6px 0}
.cu-phase{font-size:1.3em;font-weight:900;color:#fff;text-shadow:0 2px 20px ${cfg.color}}
.cu-vs{display:flex;align-items:center;justify-content:center;gap:10px;margin:14px 0;animation:cu-up .4s .2s both}
.cu-team{font-size:1em;font-weight:800;color:#fff;flex:1;padding:10px 8px;border-radius:10px;background:rgba(255,255,255,.08);text-align:center}
.cu-team.h{border-left:3px solid ${cfg.accentColor}}.cu-team.a{border-right:3px solid ${cfg.accentColor}}
.cu-vsbdg{font-size:1.1em;font-weight:900;color:${cfg.accentColor};background:rgba(255,255,255,.1);width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid ${cfg.color};flex-shrink:0}
.cu-loc{text-align:center;font-size:.83em;color:rgba(255,255,255,.55);margin-bottom:16px;animation:cu-up .4s .25s both}
.cu-section{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;margin-bottom:12px;animation:cu-up .4s .3s both}
.cu-section-title{font-size:.75em;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${cfg.accentColor};margin-bottom:10px}
.cu-actions{display:flex;flex-direction:column;gap:8px;margin-top:16px;animation:cu-up .4s .5s both}
.cu-btn-play{background:linear-gradient(135deg,${cfg.color},${cfg.accentColor});color:${match.type==='copa'?'#000':'#fff'};border:none;padding:14px;border-radius:50px;font-size:1.1em;font-weight:900;cursor:pointer;text-transform:uppercase;box-shadow:0 6px 25px ${cfg.color}55;transition:all .2s;width:100%}
.cu-btn-play:hover{transform:translateY(-2px);box-shadow:0 10px 35px ${cfg.color}88}
.cu-btn-lineup{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.25);padding:11px;border-radius:50px;font-size:.9em;font-weight:700;cursor:pointer;transition:all .2s;width:100%}
.cu-btn-lineup:hover{background:rgba(255,255,255,.18)}
.cu-stakes{text-align:center;font-size:.76em;color:rgba(255,255,255,.4);margin-top:8px;animation:cu-up .4s .6s both}
</style>
<div class="cu-box">
  <div class="cu-header">
    <div class="cu-comp">${cfg.emoji} ${cfg.shortName}</div>
    <div class="cu-logo">${cfg.emoji}</div>
    <div class="cu-phase">${phaseName}</div>
  </div>
  <div class="cu-vs">
    <div class="cu-team h">${(match.neutral ? match.drawnHome !== false : match.isHome) ? myTeam : match.opponent}</div>
    <div class="cu-vsbdg">VS</div>
    <div class="cu-team a">${(match.neutral ? match.drawnHome !== false : match.isHome) ? match.opponent : myTeam}</div>
  </div>
  <div class="cu-loc">${locText} · ${cfg.name}</div>

  <!-- Sección lesionados -->
  <div class="cu-section">
    <div class="cu-section-title">🚑 Estado de la plantilla</div>
    <div id="cu-injured-list">${buildInjuredHTML()}</div>
  </div>

  <!-- Sección prima -->
  <div class="cu-section">
    <div class="cu-section-title">💰 Prima motivacional</div>
    ${buildBonusHTML()}
  </div>

  <div class="cu-actions">
    <button class="cu-btn-lineup" id="cuLineupBtn">📋 Revisar alineación antes de jugar</button>
    <button class="cu-btn-play" id="cuPlayBtn">⚽ ¡JUGAR PARTIDO!</button>
  </div>
  <div class="cu-stakes">${getStakesText(match)}</div>
</div>`;

        document.body.appendChild(el);

        // ── Botón prima ────────────────────────────────────────
        document.getElementById('cu-bonus-btn').onclick = () => {
            const amount = parseInt(document.getElementById('cu-bonus-sel').value);
            const balance = getGS()?.balance || 0;
            const msg = document.getElementById('cu-bonus-msg');
            if (!amount) { msg.style.color='#aaa'; msg.textContent='Selecciona un importe de prima.'; return; }
            if (balance < amount) { msg.style.color='#f44336'; msg.textContent=`❌ Saldo insuficiente (${fmt(balance)}€)`; return; }
            // Aplicar prima via injector-financial-deals si está disponible
            if (window._fdSetBonus) {
                window._fdSetBonus(amount);
            } else {
                // fallback manual
                const d_fd = JSON.parse(localStorage.getItem('fd_data_' + getGS()?.team) || '{}');
                d_fd.bonus = amount;
                localStorage.setItem('fd_data_' + getGS()?.team, JSON.stringify(d_fd));
                window.gameLogic?.updateGameState({ balance: balance - amount });
            }
            const boost = Math.min(25, Math.round(Math.sqrt(amount / 50000) * 2));
            msg.style.color = '#4CAF50';
            msg.textContent = `✅ Prima de ${fmt(amount)}€ prometida. Boost: +${boost} rendimiento`;
            document.getElementById('cu-bonus-btn').disabled = true;
            document.getElementById('cu-bonus-btn').style.opacity = '0.5';
        };

        // ── Botón revisar alineación ────────────────────────────
        document.getElementById('cuLineupBtn').onclick = () => {
            el.style.opacity = '0.15';
            el.style.pointerEvents = 'none';
            // Abrir página de alineación
            window.openPage?.('lineup');
            // Añadir botón flotante para volver al partido
            if (!document.getElementById('cu-return-btn')) {
                const returnBtn = document.createElement('button');
                returnBtn.id = 'cu-return-btn';
                returnBtn.innerHTML = `${cfg.emoji} Volver al partido`;
                returnBtn.style.cssText = `position:fixed;bottom:24px;right:16px;z-index:9999999;
                    background:linear-gradient(135deg,${cfg.color},${cfg.accentColor});
                    color:${match.type==='copa'?'#000':'#fff'};border:none;padding:14px 22px;
                    border-radius:50px;font-size:1em;font-weight:900;cursor:pointer;
                    box-shadow:0 6px 25px ${cfg.color}77;animation:cu-fi .3s ease`;
                returnBtn.onclick = () => {
                    returnBtn.remove();
                    el.style.opacity = '1';
                    el.style.pointerEvents = 'auto';
                    // Refrescar lista de lesionados por si hubo cambios
                    document.getElementById('cu-injured-list').innerHTML = buildInjuredHTML();
                    window.openPage?.('dashboard');
                };
                document.body.appendChild(returnBtn);
            }
        };

        // ── Botón jugar ────────────────────────────────────────
        document.getElementById('cuPlayBtn').onclick = () => {
            document.getElementById('cu-return-btn')?.remove();
            el.style.transition = 'opacity .25s';
            el.style.opacity = '0';
            setTimeout(() => { el.remove(); resolve(); }, 260);
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
        const locText=match.neutral?'🏟️ CAMPO NEUTRAL':match.isHome?'🏟️ EN CASA':'✈️ A DOMICILIO';
        const myTeam=result.myTeam||'Tu Equipo';
        const win=result.win,draw=result.draw;
        const pens=result.penalties;
        const outLabel=pens?(result.qualified?'¡PASAMOS EN LOS PENALTIS!':'ELIMINADOS EN LOS PENALTIS'):win?'¡VICTORIA!':draw?'EMPATE':'DERROTA';
        const outColor=pens?(result.qualified?'#4CAF50':'#f44336'):win?'#4CAF50':draw?'#FFD700':'#f44336';
        const outEmoji=pens?(result.qualified?'🎉':'😞'):win?'🎉':draw?'🤝':'😞';

        const etMy=result.extraTime?.my||0, etOpp=result.extraTime?.opp||0;
        const goals=[...genScorers(myTeam,result.myGoals-etMy,true),...genScorers(match.opponent,result.oppGoals-etOpp,false,match.oppSquad)]
            .concat([...genScorers(myTeam,etMy,true),...genScorers(match.opponent,etOpp,false,match.oppSquad)].map(g=>({...g,min:91+Math.floor(Math.random()*29)})))
            .sort((a,b)=>a.min-b.min);
        // El local a la izquierda (en la final, el que salió en el sorteo)
        const meLeft = match.neutral ? match.drawnHome !== false : !!match.isHome;
        const extraLine = result.penalties
            ? `<div style="color:#FFD700;font-weight:bold;margin:6px 0">Prórroga · Penaltis ${meLeft?`${result.penalties.my}-${result.penalties.opp}`:`${result.penalties.opp}-${result.penalties.my}`}</div>`
            : result.extraTime ? `<div style="color:#FFD700;font-weight:bold;margin:6px 0">Tras la prórroga</div>` : '';
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
  ${meLeft
    ? `<div class="cr-tm"><div class="cr-tn">${myTeam}</div><div class="cr-g" style="color:${outColor}">${result.myGoals}</div></div>
       <div class="cr-sep">–</div>
       <div class="cr-tm"><div class="cr-tn">${match.opponent}</div><div class="cr-g" style="color:${result.oppGoals>result.myGoals?'#f44336':'rgba(255,255,255,.4)'}">${result.oppGoals}</div></div>`
    : `<div class="cr-tm"><div class="cr-tn">${match.opponent}</div><div class="cr-g" style="color:${result.oppGoals>result.myGoals?'#f44336':'rgba(255,255,255,.4)'}">${result.oppGoals}</div></div>
       <div class="cr-sep">–</div>
       <div class="cr-tm"><div class="cr-tn">${myTeam}</div><div class="cr-g" style="color:${outColor}">${result.myGoals}</div></div>`}
</div>
${extraLine}
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

        // Guardar datos para la página Resultados
        window._lastCupMatchData = {
            type: match.type,
            cfg,
            phaseName,
            myTeam,
            opponent: match.opponent,
            myGoals: result.myGoals,
            oppGoals: result.oppGoals,
            win: result.win,
            draw: result.draw,
            outLabel,
            outColor,
            outEmoji,
            goals,
            poss,
            shots,
            banner,
            locText,
            timestamp: Date.now()
        };

        function closeModal() {
            el.style.opacity='0';el.style.transform='scale(.97)';el.style.transition='all .22s';
            setTimeout(()=>{el.remove();resolve();},220);
        }
        document.getElementById('cuResClose').onclick = closeModal;
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
        await prepareMatch(pending);
        { const cal=getCal(); const e=cal.find(m=>m.id===pending.id); if(e){ e.opponent=pending.opponent; saveCal(cal);} }

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
        const phTxt = String(ph).startsWith(cfg.shortName) ? ph : `${cfg.shortName} — ${ph}`;
        const extraTxt = result.penalties ? ` (prórroga; penaltis ${result.penalties.my}-${result.penalties.opp}: ${result.qualified?'pasamos':'eliminados'})`
            : result.extraTime ? ' (tras la prórroga)' : '';
        window.gameLogic?.addNews(
            `${cfg.emoji} ${phTxt}: ${result.win?'¡Victoria':result.draw?'Empate':'Derrota'} ${result.myGoals}-${result.oppGoals} vs ${pending.opponent}${extraTxt}`,
            (result.qualified ?? result.win)?'success':result.draw?'info':'error'
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
    // Partidos aún por jugar (desbloqueados y sin eliminar): el juego no cierra la temporada hasta jugarlos
    pendingCount: () => {
        const comp = getCompState() || {};
        return (getCal() || []).filter(m => !m.played && !m.eliminated && !m.locked)
            .filter(m => m.type === 'copa' ? !['eliminated', 'champion'].includes(comp.copaPhase)
                                           : !['eliminated', 'champion'].includes(comp.europeanPhase)).length;
    },
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
            // Esperar competitionsReady para que comps_v2 esté listo antes de initCupCalendar
            let _done = false;
            const onReady = () => {
                if (_done) return; _done = true;
                window.removeEventListener('competitionsReady', onReady);
                console.log('🏆 CupMatches: nueva partida, iniciando calendario...');
                _cupData = {};
                const gs = getGS();
                if (gs) gs.cupData = {};
                initCupCalendar();
                setTimeout(()=>{ hookCupSimulateWeek(); }, 800);
            };
            window.addEventListener('competitionsReady', onReady);
            setTimeout(()=>{ if (!_done) { console.log('🏆 CupMatches: fallback init...'); onReady(); } }, 2000);
            return result;
        };
        console.log('🏆 CupMatches: hook selectTeam instalado');
    }

    // Init si ya hay partida cargada (recarga de página o carga desde Firebase)
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
            hookCupSimulateWeek();
            console.log('✅ injector-cup-matches.js v4 LISTO');
        } else if(n < 20){
            // 10 segundos máximo — si no hay equipo es pantalla de selección (normal)
            setTimeout(()=>tryInit(n+1), 500);
        } else {
            // Sin equipo = pantalla login. Registrar listener permanente para competitionsReady.
            console.log('📋 CupMatches: sin partida activa — esperando competitionsReady...');
            window.addEventListener('competitionsReady', function onReady(){
                window.removeEventListener('competitionsReady', onReady);
                const gs2 = getGS(); const comp2 = getCompState();
                if (!gs2?.team || !comp2) return;
                console.log('🏆 CupMatches: competitionsReady recibido, iniciando para', gs2.team);
                _cupData = {}; if (gs2) gs2.cupData = {};
                initCupCalendar();
                setTimeout(()=>{ hookCupSimulateWeek(); }, 800);
            });
        }
    };
    tryInit();
}

boot();
