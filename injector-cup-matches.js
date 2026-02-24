// ============================================================
// injector-cup-matches.js
// Sistema de partidos intercalados: Champions, Europa League,
// Conference League y Copa del Rey
//
// FLUJO:
//   1. Al inicio de temporada, se genera el calendario de
//      partidos europeos/Copa y se insertan en "semanas extra"
//      que se intercalan entre jornadas de liga.
//   2. Cuando el jugador pulsa "Seguir", el injector comprueba
//      si hay un partido de copa/europa pendiente ANTES de
//      dejar avanzar la jornada de liga.
//   3. Si hay partido → muestra modal de anuncio (hype)
//      → el jugador lo confirma → resultado + modal de stats
//      → la semana NO avanza en liga, solo se juega ese partido.
//   4. Si no hay partido → liga avanza normal.
// ============================================================

console.log('🏆 injector-cup-matches.js cargando...');

// ============================================================
// CONFIGURACIÓN DE EMOJIS Y COLORES POR COMPETICIÓN
// ============================================================
const CUP_CONFIG = {
    champions: {
        name:        'UEFA Champions League',
        shortName:   'Champions League',
        emoji:       '⭐',
        color:       '#1E5AC8',
        gradient:    'linear-gradient(135deg, #0a0a2e 0%, #1a1a5e 50%, #0d3b8c 100%)',
        accentColor: '#4a9eff',
        hymn:        true // mostraría "da da da da" jaja
    },
    europaLeague: {
        name:        'UEFA Europa League',
        shortName:   'Europa League',
        emoji:       '🟠',
        color:       '#FF8C00',
        gradient:    'linear-gradient(135deg, #1a0d00 0%, #3d1f00 50%, #7a3d00 100%)',
        accentColor: '#ffaa33'
    },
    conferenceLague: {
        name:        'UEFA Conference League',
        shortName:   'Conference League',
        emoji:       '🟢',
        color:       '#00B464',
        gradient:    'linear-gradient(135deg, #001a0d 0%, #003d1f 50%, #007a3d 100%)',
        accentColor: '#00d478'
    },
    copa: {
        name:        'Copa del Rey',
        shortName:   'Copa del Rey',
        emoji:       '🥇',
        color:       '#FFD700',
        gradient:    'linear-gradient(135deg, #1a1500 0%, #3d3000 50%, #7a6000 100%)',
        accentColor: '#FFD700'
    }
};

// Fases con nombres bonitos
const PHASE_NAMES = {
    'round1':         '1ª Ronda',
    'round32':        'Dieciseisavos de Final',
    'round16':        'Octavos de Final',
    'quarterfinals':  'Cuartos de Final',
    'quarters':       'Cuartos de Final',
    'semifinals':     'Semifinales',
    'semis':          'Semifinales',
    'final':          'FINAL',
    'groups_md1':     'Fase de Grupos — Jornada 1',
    'groups_md2':     'Fase de Grupos — Jornada 2',
    'groups_md3':     'Fase de Grupos — Jornada 3',
    'groups_md4':     'Fase de Grupos — Jornada 4',
    'groups_md5':     'Fase de Grupos — Jornada 5',
    'groups_md6':     'Fase de Grupos — Jornada 6',
};

// ============================================================
// STORAGE DE CALENDARIO DE PARTIDOS
// ============================================================
const CUP_CALENDAR_KEY = 'cup_calendar_v1';

function getCupCalendar() {
    try { return JSON.parse(localStorage.getItem(CUP_CALENDAR_KEY)) || []; }
    catch(e) { return []; }
}

function saveCupCalendar(cal) {
    try { localStorage.setItem(CUP_CALENDAR_KEY, JSON.stringify(cal)); }
    catch(e) {}
}

function clearCupCalendar() {
    localStorage.removeItem(CUP_CALENDAR_KEY);
}

// ============================================================
// GENERADOR DE CALENDARIO DE PARTIDOS EUROPEOS/COPA
// Se llama cuando se inicializan las competiciones.
// Genera entradas como:
//   { id, type:'champions'|'copa', phase:'round16', week:12,
//     opponent:'Bayern München', played:false, result:null }
// "week" aquí es una semana VIRTUAL que se inserta entre
// las jornadas de liga normales.
// ============================================================
function generateCupCalendar(myTeam, division, season, europeanComp, copaPhase) {
    const calendar = [];
    let cupWeekOffset = 0; // offset para intercalar

    // ── COPA DEL REY ──────────────────────────────────────
    if (copaPhase && division !== 'rfef_grupo1' && division !== 'rfef_grupo2') {
        const copaRounds = division === 'primera'
            ? ['round32', 'round16', 'quarters', 'semis', 'final']
            : ['round1', 'round32', 'round16', 'quarters', 'semis', 'final'];

        // Posiciones en el calendario real: Copa se juega en semanas 6,10,14,18,22,26
        const copaLigaWeeks = division === 'primera'
            ? [6, 11, 16, 22, 28]
            : [4, 8, 13, 18, 24, 30];

        copaRounds.forEach((round, idx) => {
            calendar.push({
                id: `copa_${round}`,
                type: 'copa',
                phase: round,
                afterLigaWeek: copaLigaWeeks[idx] || (idx * 6 + 6),
                opponent: null, // se asigna al generar del estado de competiciones
                played: false,
                result: null,
                eliminated: false
            });
        });
    }

    // ── EUROPA ────────────────────────────────────────────
    if (europeanComp) {
        // Grupos: 6 jornadas, semanas 3,5,8,10,13,15 (aproximado)
        const groupWeeks = [3, 5, 8, 10, 13, 15];
        for (let md = 1; md <= 6; md++) {
            calendar.push({
                id: `eu_groups_md${md}`,
                type: europeanComp,
                phase: `groups_md${md}`,
                afterLigaWeek: groupWeeks[md-1],
                opponent: null,
                played: false,
                result: null,
                isGroup: true,
                matchday: md
            });
        }

        // Eliminatorias: semanas 19, 24, 29, 34 (aproximado para 38 jornadas)
        const knockoutRounds = ['round16', 'quarterfinals', 'semifinals', 'final'];
        const knockoutWeeks = [19, 24, 29, 34];
        knockoutRounds.forEach((round, idx) => {
            calendar.push({
                id: `eu_${round}`,
                type: europeanComp,
                phase: round,
                afterLigaWeek: knockoutWeeks[idx],
                opponent: null,
                played: false,
                result: null,
                isKnockout: true,
                locked: idx > 0 // las rondas 2+ se desbloquean solo si pasas la anterior
            });
        });
    }

    // Ordenar por semana
    calendar.sort((a, b) => a.afterLigaWeek - b.afterLigaWeek);
    return calendar;
}

// ============================================================
// OBTENER RIVALES DESDE EL ESTADO DE COMPETICIONES
// ============================================================
function getOpponentForMatch(match) {
    // Intentar obtener del sistema de competiciones (injector-competitions.js)
    const comp = getCompState();
    if (!comp) return 'Rival Europeo';

    if (match.type === 'copa') {
        return comp.copaOpponents?.[match.phase] || getRandomCopaRival(comp.division);
    }

    if (match.isGroup) {
        // Rotar entre los 3 rivales del grupo
        const rivals = comp.europeanGroup?.filter(t => !t.isPlayer);
        if (!rivals?.length) return 'Rival Europeo';
        const md = match.matchday || 1;
        // Ida: jornadas 1,2,3 | Vuelta: jornadas 4,5,6
        const isReturn = md > 3;
        const rivalIdx = isReturn ? (md - 4) % rivals.length : (md - 1) % rivals.length;
        return rivals[rivalIdx % rivals.length]?.name || 'Rival Europeo';
    }

    if (match.isKnockout) {
        // Rival según fase (usar pool según competición)
        const pools = {
            champions:       ['Bayern München','Inter de Milán','Arsenal FC','Liverpool FC','Manchester City','PSG'],
            europaLeague:    ['Roma','Lazio','Feyenoord','Eintracht Frankfurt','Sporting CP','Bayer Leverkusen'],
            conferenceLague: ['Fiorentina','Club Bruges','PAOK','Braga','Fenerbahçe','Anderlecht']
        };
        const pool = pools[match.type] || pools.europaLeague;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    return 'Rival Europeo';
}

function getRandomCopaRival(division) {
    const rivals = division === 'primera'
        ? ['Real Sociedad','Getafe CF','CA Osasuna','RCD Mallorca','Rayo Vallecano','CD Leganés','Girona FC']
        : ['CD Cartagena','Burgos CF','SD Eibar','Real Zaragoza','Córdoba CF','UD Almería'];
    return rivals[Math.floor(Math.random() * rivals.length)];
}

function getCompState() {
    try { return JSON.parse(localStorage.getItem('comps_v2')); }
    catch(e) { return null; }
}

// ============================================================
// VERIFICAR SI TOCA PARTIDO ANTES DE AVANZAR LIGA
// Retorna el partido pendiente más próximo, o null
// ============================================================
function getPendingMatch(currentLigaWeek) {
    const calendar = getCupCalendar();
    const comp = getCompState();

    for (const match of calendar) {
        if (match.played || match.eliminated) continue;
        if (match.afterLigaWeek !== currentLigaWeek) continue;

        // Comprobar si está eliminado en esa competición
        if (match.type === 'copa' && comp?.copaPhase === 'eliminated') {
            match.eliminated = true;
            saveCupCalendar(calendar);
            continue;
        }
        if (match.type !== 'copa' && match.isKnockout) {
            // Si fue eliminado en grupos, no juega knockouts
            if (comp?.europeanPhase === 'eliminated' || comp?.europeanPhase === 'groups') {
                match.eliminated = true;
                saveCupCalendar(calendar);
                continue;
            }
        }

        // Asignar rival si no tiene
        if (!match.opponent) {
            match.opponent = getOpponentForMatch(match);
            saveCupCalendar(calendar);
        }

        return match;
    }
    return null;
}

// ============================================================
// SIMULAR EL RESULTADO DEL PARTIDO
// ============================================================
function simulateCupMatch(match, myTeam) {
    const state = window.gameLogic?.getGameState();
    const squad = state?.squad || [];
    const myRating = squad.length
        ? Math.round(squad.reduce((a,b) => a+(b.overall||70), 0) / squad.length)
        : 75;

    // Rating del rival según competición y fase
    const oppRatingBase = {
        champions:       82, europaLeague: 76, conferenceLague: 71, copa: 70
    }[match.type] || 73;
    const phaseBonus = {
        final: 6, semifinals: 4, semis: 4, quarterfinals: 3, quarters: 3,
        round16: 2, round32: 1, round1: -2, groups_md1: 0, groups_md2: 0,
        groups_md3: 1, groups_md4: 1, groups_md5: 2, groups_md6: 2
    }[match.phase] || 0;
    const oppRating = oppRatingBase + phaseBonus + (Math.floor(Math.random()*6) - 3);

    // Ventaja de local (asumimos mitad de partidos de grupos en casa, knockouts: ida fuera, vuelta en casa)
    const isHome = match.isKnockout
        ? (match.matchday === 2) // vuelta en casa
        : (match.matchday % 2 === 1); // impares en casa (simplificado)

    const homeBonus = isHome ? 0.06 : -0.03;
    const winProb = Math.max(0.12, Math.min(0.82, 0.46 + (myRating - oppRating)/100 + homeBonus));
    const r = Math.random();

    let myGoals, oppGoals;
    if (r < winProb) {
        myGoals  = Math.floor(Math.random()*3)+1;
        oppGoals = Math.max(0, myGoals - 1 - Math.floor(Math.random()*2));
    } else if (r < winProb + 0.22) {
        myGoals  = Math.floor(Math.random()*2)+1;
        oppGoals = myGoals;
    } else {
        oppGoals = Math.floor(Math.random()*3)+1;
        myGoals  = Math.max(0, oppGoals - 1 - Math.floor(Math.random()*2));
    }

    const isHome2 = true; // para el modal usamos perspectiva del jugador
    const homeGoals = myGoals;
    const awayGoals = oppGoals;
    const win  = myGoals > oppGoals;
    const draw = myGoals === oppGoals;

    return {
        myGoals, oppGoals, homeGoals, awayGoals,
        win, draw, loss: !win && !draw,
        myTeam, opponent: match.opponent,
        home: myTeam, away: match.opponent,
        isHome, oppRating, myRating
    };
}

// ============================================================
// DETERMINAR SI EL JUGADOR AVANZA (grupos acumulan, knockout = todo)
// ============================================================
function processMatchResult(match, result) {
    const calendar = getCupCalendar();
    const matchEntry = calendar.find(m => m.id === match.id);
    if (matchEntry) {
        matchEntry.played = true;
        matchEntry.result = { myGoals: result.myGoals, oppGoals: result.oppGoals, win: result.win, draw: result.draw };
        saveCupCalendar(calendar);
    }

    const comp = getCompState();
    if (!comp) return { advances: result.win };

    if (match.type === 'copa') {
        if (result.win) {
            // Avanzar fase Copa en el estado de competiciones
            const order = ['round1','round32','round16','quarters','semis','final'];
            const idx = order.indexOf(match.phase);
            comp.copaPhase = order[idx+1] || 'champion';
            if (comp.copaPhase === 'champion') {
                window.gameLogic?.addNews('🏆 ¡¡CAMPEONES DE LA COPA DEL REY!!', 'success');
            }
        } else {
            comp.copaPhase = 'eliminated';
            // Marcar todas las rondas Copa restantes como eliminado
            calendar.filter(m => m.type==='copa' && !m.played).forEach(m => m.eliminated = true);
        }
        comp.copaResults = comp.copaResults || [];
        comp.copaResults.push({ phase: match.phase, opponent: match.opponent, myGoals: result.myGoals, oppGoals: result.oppGoals, advanced: result.win });
        saveCompState(comp);
        saveCupCalendar(calendar);
        return { advances: result.win };
    }

    if (match.isGroup) {
        // Grupos: actualizar standings europeos
        comp.europeanResults = comp.europeanResults || [];
        comp.europeanResults.push({ jornada: match.matchday <= 3 ? 'ida' : 'vuelta', rival: match.opponent, myGoals: result.myGoals, oppGoals: result.oppGoals });
        // Actualizar standings del grupo
        if (!comp.europeanGroupStandings) comp.europeanGroupStandings = {};
        const st = comp.europeanGroupStandings;
        const mt = comp.team;
        const op = match.opponent;
        [mt,op].forEach(n => { if(!st[n]) st[n]={pj:0,g:0,e:0,p:0,gf:0,gc:0,pts:0}; });
        st[mt].pj++; st[mt].gf+=result.myGoals; st[mt].gc+=result.oppGoals;
        st[op].pj++; st[op].gf+=result.oppGoals; st[op].gc+=result.myGoals;
        if(result.win){ st[mt].g++; st[mt].pts+=3; st[op].p++; }
        else if(result.draw){ st[mt].e++; st[mt].pts++; st[op].e++; st[op].pts++; }
        else{ st[op].g++; st[op].pts+=3; st[mt].p++; }

        // Después de la jornada 6, determinar si pasa
        if (match.matchday === 6) {
            const sorted = Object.entries(st).sort((a,b)=>{
                const pd=b[1].pts-a[1].pts; return pd!==0?pd:(b[1].gf-b[1].gc)-(a[1].gf-a[1].gc);
            });
            const myPos = sorted.findIndex(([n])=>n===mt)+1;
            comp.europeanPhase = myPos<=2 ? 'round16' : 'eliminated';
            if (myPos>2) {
                calendar.filter(m => m.type!=='copa' && m.isKnockout).forEach(m => m.eliminated=true);
                saveCupCalendar(calendar);
            }
        }
        saveCompState(comp);
        return { advances: true }; // grupos siempre "continúa" hasta el final
    }

    if (match.isKnockout) {
        // Simplificado: un solo partido decide (podría hacerse ida/vuelta luego)
        const order = ['round16','quarterfinals','semifinals','final'];
        const idx = order.indexOf(match.phase);
        comp.europeanKnockout = comp.europeanKnockout || [];
        comp.europeanKnockout.push({ phase: match.phase, rival: match.opponent, myGoals: result.myGoals, oppGoals: result.oppGoals });
        if (result.win) {
            const next = order[idx+1];
            comp.europeanPhase = next || 'winner';
            if (!next) window.gameLogic?.addNews(`🏆 ¡CAMPEONES DE LA ${comp.europeanComp?.toUpperCase()}!`, 'success');
        } else {
            comp.europeanPhase = 'eliminated';
            calendar.filter(m=>m.type!=='copa'&&m.isKnockout&&!m.played).forEach(m=>m.eliminated=true);
            saveCupCalendar(calendar);
        }
        saveCompState(comp);
        return { advances: result.win };
    }

    return { advances: result.win };
}

function saveCompState(comp) {
    try { localStorage.setItem('comps_v2', JSON.stringify(comp)); } catch(e) {}
}

// ============================================================
// GENERAR GOLEADORES CON JUGADORES REALES
// ============================================================
function generateScorers(team, numGoals, isMyTeam, opponent) {
    const state = window.gameLogic?.getGameState();
    const scorers = [];
    const usedMins = new Set();

    for (let i = 0; i < numGoals; i++) {
        let minute;
        do { minute = Math.floor(Math.random()*90)+1; } while (usedMins.has(minute));
        usedMins.add(minute);

        let playerName;
        if (isMyTeam && state?.squad?.length) {
            const outfield = state.squad.filter(p => p.pos !== 'POR' && !p.isInjured);
            const pool = outfield.length ? outfield : state.squad;
            // Dar más probabilidad a delanteros
            const weights = pool.map(p => (['DC','EX'].includes(p.pos) ? 3 : p.pos === 'MC' ? 2 : 1));
            const total = weights.reduce((a,b)=>a+b,0);
            let rand = Math.random()*total;
            let picked = pool[0];
            for (let j=0; j<pool.length; j++) { rand -= weights[j]; if(rand<=0){ picked=pool[j]; break; } }
            playerName = picked.name;
        } else {
            // Nombres genéricos para el rival
            const generic = ['Müller','Sané','Kane','Mbappé','Salah','De Bruyne','Pedri','Vinicius',
                             'Bellingham','Valverde','Ødegaard','Bruno','Haaland','Lewandowski'];
            playerName = generic[Math.floor(Math.random()*generic.length)];
        }
        scorers.push({ name: playerName, minute, team });
    }
    return scorers.sort((a,b)=>a.minute-b.minute);
}

// ============================================================
// MODAL 1: ANUNCIO DEL PARTIDO (HYPE)
// Promesa que se resuelve cuando el jugador pulsa "¡A JUGAR!"
// ============================================================
function showMatchAnnouncementModal(match) {
    return new Promise(resolve => {
        const cfg = CUP_CONFIG[match.type] || CUP_CONFIG.copa;
        const phaseName = PHASE_NAMES[match.phase] || match.phase;
        const isHome = !match.isKnockout || match.matchday===2;
        const locationText = isHome ? '🏟️ EN CASA' : '✈️ A DOMICILIO';
        const state = window.gameLogic?.getGameState();
        const myTeam = state?.team || 'Tu Equipo';

        // Partículas animadas de fondo
        const particles = Array.from({length:20}, () => {
            const size = 4 + Math.random()*8;
            const left = Math.random()*100;
            const delay = Math.random()*3;
            const duration = 3 + Math.random()*4;
            const color = cfg.accentColor;
            return `<div style="position:absolute;width:${size}px;height:${size}px;background:${color};border-radius:50%;left:${left}%;top:110%;animation:float-up ${duration}s ${delay}s infinite ease-in;opacity:0.6;"></div>`;
        }).join('');

        const modal = document.createElement('div');
        modal.id = 'cupAnnouncementModal';
        modal.innerHTML = `
            <style>
                #cupAnnouncementModal {
                    position:fixed;top:0;left:0;width:100%;height:100%;
                    background:rgba(0,0,0,0.97);
                    display:flex;align-items:center;justify-content:center;
                    z-index:999999;overflow:hidden;
                    animation:fadeIn 0.4s ease;
                }
                @keyframes fadeIn { from{opacity:0} to{opacity:1} }
                @keyframes float-up {
                    0%{transform:translateY(0) rotate(0deg);opacity:0.6}
                    100%{transform:translateY(-110vh) rotate(720deg);opacity:0}
                }
                @keyframes pulse-glow {
                    0%,100%{box-shadow:0 0 30px ${cfg.color}44, 0 0 60px ${cfg.color}22}
                    50%{box-shadow:0 0 60px ${cfg.color}88, 0 0 120px ${cfg.color}44}
                }
                @keyframes slide-up {
                    from{opacity:0;transform:translateY(40px)}
                    to{opacity:1;transform:translateY(0)}
                }
                @keyframes logo-spin {
                    0%{transform:scale(0) rotate(-180deg);opacity:0}
                    60%{transform:scale(1.2) rotate(10deg);opacity:1}
                    100%{transform:scale(1) rotate(0deg);opacity:1}
                }
                @keyframes score-reveal {
                    from{opacity:0;transform:scale(0.5)}
                    to{opacity:1;transform:scale(1)}
                }
                .cup-ann-box {
                    background:${cfg.gradient};
                    border:2px solid ${cfg.color}88;
                    border-radius:24px;
                    padding:40px 36px;
                    max-width:480px;width:90%;text-align:center;position:relative;
                    animation:pulse-glow 2s ease-in-out infinite;
                    overflow:hidden;
                }
                .cup-ann-particles { position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none; }
                .cup-ann-comp {
                    font-size:0.85em;font-weight:700;letter-spacing:3px;text-transform:uppercase;
                    color:${cfg.accentColor};margin-bottom:8px;
                    animation:slide-up 0.5s 0.1s both ease;
                }
                .cup-ann-logo {
                    font-size:4em;margin:12px 0;
                    animation:logo-spin 0.8s 0.2s both cubic-bezier(0.175,0.885,0.32,1.275);
                }
                .cup-ann-phase {
                    font-size:1.6em;font-weight:900;color:white;margin-bottom:6px;
                    text-shadow:0 2px 20px ${cfg.color};
                    animation:slide-up 0.5s 0.3s both ease;
                }
                .cup-ann-vs {
                    display:flex;align-items:center;justify-content:center;gap:16px;
                    margin:20px 0;animation:slide-up 0.5s 0.4s both ease;
                }
                .cup-ann-team {
                    font-size:1.15em;font-weight:800;color:white;flex:1;
                    padding:12px 8px;border-radius:12px;
                    background:rgba(255,255,255,0.08);
                }
                .cup-ann-team.home { border-left:3px solid ${cfg.accentColor}; }
                .cup-ann-team.away { border-right:3px solid ${cfg.accentColor}; }
                .cup-ann-vs-badge {
                    font-size:1.3em;font-weight:900;color:${cfg.accentColor};
                    background:rgba(255,255,255,0.1);
                    width:50px;height:50px;border-radius:50%;
                    display:flex;align-items:center;justify-content:center;
                    border:2px solid ${cfg.color};
                    flex-shrink:0;
                }
                .cup-ann-location {
                    font-size:0.88em;color:rgba(255,255,255,0.6);margin-bottom:24px;
                    animation:slide-up 0.5s 0.5s both ease;
                }
                .cup-ann-btn {
                    background:linear-gradient(135deg, ${cfg.color}, ${cfg.accentColor});
                    color:${cfg.type==='copa'?'#000':'#fff'};
                    border:none;padding:16px 48px;border-radius:50px;
                    font-size:1.2em;font-weight:900;cursor:pointer;
                    letter-spacing:1px;text-transform:uppercase;
                    box-shadow:0 6px 30px ${cfg.color}66;
                    transition:all 0.2s;width:100%;
                    animation:slide-up 0.5s 0.6s both ease;
                }
                .cup-ann-btn:hover {
                    transform:translateY(-3px);
                    box-shadow:0 10px 40px ${cfg.color}99;
                }
                .cup-ann-btn:active { transform:translateY(0); }
                .cup-ann-stakes {
                    font-size:0.8em;color:rgba(255,255,255,0.5);
                    margin-top:12px;animation:slide-up 0.5s 0.7s both ease;
                }
            </style>
            <div class="cup-ann-box">
                <div class="cup-ann-particles">${particles}</div>
                <div class="cup-ann-comp">${cfg.emoji} ${cfg.shortName}</div>
                <div class="cup-ann-logo">${cfg.emoji}</div>
                <div class="cup-ann-phase">${phaseName}</div>
                <div class="cup-ann-vs">
                    <div class="cup-ann-team home">${myTeam}</div>
                    <div class="cup-ann-vs-badge">VS</div>
                    <div class="cup-ann-team away">${match.opponent}</div>
                </div>
                <div class="cup-ann-location">${locationText} · ${cfg.name}</div>
                <button class="cup-ann-btn" id="cupPlayBtn">⚽ ¡A JUGAR!</button>
                <div class="cup-ann-stakes">${getStakesText(match, cfg)}</div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('cupPlayBtn').addEventListener('click', () => {
            modal.style.animation = 'fadeIn 0.3s ease reverse forwards';
            setTimeout(() => { modal.remove(); resolve(); }, 300);
        });
    });
}

function getStakesText(match, cfg) {
    if (match.type === 'copa') {
        if (match.phase === 'final') return '🏆 La Copa del Rey en juego';
        if (match.phase === 'semis' || match.phase === 'semifinals') return '🎯 Un paso de la final';
        return '⚔️ Eliminación directa';
    }
    if (match.isGroup) {
        const md = match.matchday || 1;
        if (md===6) return '⚠️ Última jornada de grupos — todo se decide aquí';
        if (md===5) return '🎯 Penúltima jornada — crucial para la clasificación';
        return '📊 Fase de grupos — cada punto cuenta';
    }
    if (match.phase === 'final') return `🏆 La ${cfg.shortName} en juego`;
    if (match.phase === 'semifinals') return '🎯 Un paso de la gran final';
    return '⚔️ Eliminación directa — el ganador avanza';
}

// ============================================================
// MODAL 2: RESULTADO DEL PARTIDO
// Similar al modal de liga pero con branding de competición
// ============================================================
function showCupResultModal(match, result, advances) {
    return new Promise(resolve => {
        const cfg = CUP_CONFIG[match.type] || CUP_CONFIG.copa;
        const phaseName = PHASE_NAMES[match.phase] || match.phase;
        const state = window.gameLogic?.getGameState();
        const myTeam = state?.team || 'Tu Equipo';
        const squad  = state?.squad || [];

        const outcome = result.win ? '¡VICTORIA!' : result.draw ? 'EMPATE' : 'DERROTA';
        const outcomeColor = result.win ? '#4CAF50' : result.draw ? '#FFD700' : '#f44336';
        const outcomeEmoji = result.win ? '🎉' : result.draw ? '🤝' : '😞';

        const myScorers  = generateScorers(myTeam,         result.myGoals,  true,  match.opponent);
        const oppScorers = generateScorers(match.opponent,  result.oppGoals, false, match.opponent);
        const allGoals   = [...myScorers, ...oppScorers].sort((a,b)=>a.minute-b.minute);

        // Stats básicas
        const possession = result.win ? 52+Math.floor(Math.random()*14) : result.draw ? 45+Math.floor(Math.random()*10) : 38+Math.floor(Math.random()*12);
        const shots = {
            my:  Math.max(result.myGoals*2,  Math.floor(Math.random()*8)+6),
            opp: Math.max(result.oppGoals*2, Math.floor(Math.random()*8)+6)
        };

        // Mensaje de avance/eliminación
        let advanceMsg = '';
        if (match.isGroup) {
            if (match.matchday===6) {
                advanceMsg = advances
                    ? `<div style="background:rgba(76,175,80,.2);border:1px solid #4CAF50;border-radius:10px;padding:12px;margin-top:14px;color:#4CAF50;font-weight:bold">✅ ¡CLASIFICADOS PARA OCTAVOS!</div>`
                    : `<div style="background:rgba(244,67,54,.2);border:1px solid #f44336;border-radius:10px;padding:12px;margin-top:14px;color:#f44336;font-weight:bold">❌ Eliminados de la ${cfg.shortName}</div>`;
            }
        } else if (!match.isGroup) {
            advanceMsg = advances
                ? `<div style="background:rgba(76,175,80,.2);border:1px solid #4CAF50;border-radius:10px;padding:12px;margin-top:14px;color:#4CAF50;font-weight:bold">✅ ¡AVANZAMOS! → ${getNextPhaseName(match)}</div>`
                : `<div style="background:rgba(244,67,54,.2);border:1px solid #f44336;border-radius:10px;padding:12px;margin-top:14px;color:#f44336;font-weight:bold">❌ Eliminados de la ${cfg.shortName}</div>`;
            if (match.phase==='final' && advances) {
                advanceMsg = `<div style="background:rgba(255,215,0,.2);border:2px solid #FFD700;border-radius:10px;padding:16px;margin-top:14px;text-align:center"><div style="font-size:2em">🏆</div><div style="color:#FFD700;font-weight:900;font-size:1.2em">¡¡CAMPEONES!!</div></div>`;
            }
        }

        const modal = document.createElement('div');
        modal.id = 'cupResultModal';
        modal.innerHTML = `
            <style>
                #cupResultModal {
                    position:fixed;top:0;left:0;width:100%;height:100%;
                    background:rgba(0,0,0,0.96);
                    display:flex;align-items:center;justify-content:center;
                    z-index:999998;animation:fadeInR 0.3s ease;
                }
                @keyframes fadeInR { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
                #cupResultModal .cr-box {
                    background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);
                    border:2px solid ${cfg.color}66;
                    border-radius:20px;padding:28px 24px;
                    max-width:500px;width:92%;max-height:88vh;overflow-y:auto;
                    position:relative;
                    box-shadow:0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${cfg.color}22;
                }
                #cupResultModal .cr-badge {
                    text-align:center;font-size:0.78em;font-weight:700;letter-spacing:2px;
                    color:${cfg.accentColor};text-transform:uppercase;margin-bottom:6px;
                }
                #cupResultModal .cr-phase {
                    text-align:center;font-size:0.92em;color:rgba(255,255,255,0.6);margin-bottom:16px;
                }
                #cupResultModal .cr-score-row {
                    display:flex;align-items:center;justify-content:center;gap:16px;
                    margin-bottom:6px;
                }
                #cupResultModal .cr-team { flex:1;text-align:center; }
                #cupResultModal .cr-team-name { font-size:1em;font-weight:700;color:white;margin-bottom:8px; }
                #cupResultModal .cr-goal { font-size:4em;font-weight:900;color:${outcomeColor};text-shadow:0 2px 20px ${outcomeColor}66; }
                #cupResultModal .cr-vs { font-size:1.8em;color:rgba(255,255,255,0.3); }
                #cupResultModal .cr-outcome {
                    text-align:center;font-size:1.6em;font-weight:900;color:${outcomeColor};
                    margin:10px 0 20px;text-shadow:0 2px 20px ${outcomeColor}44;
                }
                #cupResultModal .cr-section { margin:16px 0; }
                #cupResultModal .cr-section h4 {
                    color:${cfg.accentColor};font-size:0.85em;text-transform:uppercase;
                    letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;
                    border-bottom:1px solid rgba(255,255,255,0.1);
                }
                #cupResultModal .cr-goal-item {
                    display:flex;align-items:center;gap:10px;
                    padding:8px;border-radius:8px;margin-bottom:6px;
                    background:rgba(255,255,255,0.05);
                    border-left:3px solid;
                }
                #cupResultModal .cr-goal-item.mine { border-color:#4CAF50; }
                #cupResultModal .cr-goal-item.theirs { border-color:#f44336; }
                #cupResultModal .cr-min { color:#FFD700;font-weight:bold;min-width:34px;font-size:0.9em; }
                #cupResultModal .cr-scorer { color:white;flex:1;font-weight:600; }
                #cupResultModal .cr-team-tag { color:rgba(255,255,255,0.5);font-size:0.85em; }
                #cupResultModal .cr-stat-row {
                    display:flex;justify-content:space-between;align-items:center;
                    padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07);
                    font-size:0.9em;color:white;
                }
                #cupResultModal .cr-stat-name { color:rgba(255,255,255,0.5);flex:1;text-align:center; }
                #cupResultModal .cr-btn {
                    background:linear-gradient(135deg,${cfg.color},${cfg.accentColor});
                    color:${match.type==='copa'?'#000':'#fff'};
                    border:none;padding:14px 40px;border-radius:50px;
                    font-size:1.1em;font-weight:900;cursor:pointer;width:100%;
                    margin-top:18px;transition:all 0.2s;
                    box-shadow:0 4px 20px ${cfg.color}55;
                }
                #cupResultModal .cr-btn:hover { transform:translateY(-2px);box-shadow:0 8px 30px ${cfg.color}77; }
            </style>
            <div class="cr-box">
                <div class="cr-badge">${cfg.emoji} ${cfg.shortName}</div>
                <div class="cr-phase">${phaseName}</div>
                <div class="cr-score-row">
                    <div class="cr-team">
                        <div class="cr-team-name">${myTeam}</div>
                        <div class="cr-goal">${result.myGoals}</div>
                    </div>
                    <div class="cr-vs">–</div>
                    <div class="cr-team">
                        <div class="cr-team-name">${match.opponent}</div>
                        <div class="cr-goal" style="color:${result.oppGoals > result.myGoals ? '#f44336' : 'rgba(255,255,255,0.4)'}">${result.oppGoals}</div>
                    </div>
                </div>
                <div class="cr-outcome">${outcomeEmoji} ${outcome}</div>

                ${allGoals.length ? `
                <div class="cr-section">
                    <h4>⚽ Goles</h4>
                    ${allGoals.map(g => `
                        <div class="cr-goal-item ${g.team===myTeam?'mine':'theirs'}">
                            <span class="cr-min">${g.minute}'</span>
                            <span class="cr-scorer">${g.name}</span>
                            <span class="cr-team-tag">(${g.team})</span>
                        </div>
                    `).join('')}
                </div>` : ''}

                <div class="cr-section">
                    <h4>📊 Estadísticas</h4>
                    <div class="cr-stat-row"><strong>${possession}%</strong><span class="cr-stat-name">Posesión</span><strong>${100-possession}%</strong></div>
                    <div class="cr-stat-row"><strong>${shots.my}</strong><span class="cr-stat-name">Remates</span><strong>${shots.opp}</strong></div>
                    <div class="cr-stat-row"><strong>${result.myGoals + Math.floor(Math.random()*3)+1}</strong><span class="cr-stat-name">A puerta</span><strong>${result.oppGoals + Math.floor(Math.random()*3)+1}</strong></div>
                    <div class="cr-stat-row"><strong>${Math.floor(Math.random()*6)+2}</strong><span class="cr-stat-name">Corners</span><strong>${Math.floor(Math.random()*6)+2}</strong></div>
                </div>

                ${advanceMsg}

                <button class="cr-btn" id="cupResultCloseBtn">✅ Continuar</button>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('cupResultCloseBtn').addEventListener('click', () => {
            modal.style.opacity='0'; modal.style.transform='scale(0.97)'; modal.style.transition='all 0.25s';
            setTimeout(() => { modal.remove(); resolve(); }, 250);
        });

        // Auto-cierre 30s
        setTimeout(() => { document.getElementById('cupResultModal')?.remove(); resolve(); }, 30000);
    });
}

function getNextPhaseName(match) {
    const next = {
        round16:       'Cuartos de Final', quarterfinals: 'Semifinales',
        semifinals:    'La FINAL',         round32: 'Octavos de Final',
        round1:        'Dieciseisavos',    quarters: 'Semifinales',
        semis:         'La FINAL'
    }[match.phase];
    return next || 'la siguiente ronda';
}

// ============================================================
// INICIALIZAR CALENDARIO AL INICIO DE TEMPORADA
// ============================================================
function initCupCalendar() {
    const comp = getCompState();
    const state = window.gameLogic?.getGameState();
    if (!comp || !state) return;

    const existing = getCupCalendar();
    // Si ya hay un calendario para esta temporada/equipo, no regenerar
    if (existing.length && existing[0]?.season === comp.season && existing[0]?.team === comp.team) return;

    const cal = generateCupCalendar(
        state.team,
        state.division,
        comp.season,
        comp.europeanComp,
        comp.copaPhase
    );

    // Marcar temporada y equipo en cada entrada para detectar cambios
    cal.forEach(m => { m.season = comp.season; m.team = comp.team; });

    // Pre-asignar rivales donde sea posible
    cal.forEach(m => { m.opponent = getOpponentForMatch(m); });

    saveCupCalendar(cal);
    console.log(`📅 Calendario de copas generado: ${cal.length} partidos`, cal.map(m=>`${m.type}/${m.phase}@J${m.afterLigaWeek}`));
}

// ============================================================
// HOOK PRINCIPAL: interceptar window.simulateWeek
// ============================================================
function hookSimulateWeekForCups() {
    const orig = window.simulateWeek;
    if (!orig || window._cupsHooked) {
        if (!orig) { setTimeout(hookSimulateWeekForCups, 600); return; }
        return;
    }
    window._cupsHooked = true;
    console.log('🏆 Hook de partidos de copa activo');

    window.simulateWeek = async function() {
        const state = window.gameLogic?.getGameState();
        if (!state || state.seasonType !== 'regular') {
            return orig.apply(this, arguments);
        }

        // ¿Hay partido de copa/europa esta semana?
        const pendingMatch = getPendingMatch(state.week);

        if (!pendingMatch) {
            // Jornada normal de liga
            return orig.apply(this, arguments);
        }

        // ── HAY PARTIDO INTERCALADO ──────────────────────
        // 1. Modal de anuncio (hype)
        await showMatchAnnouncementModal(pendingMatch);

        // 2. Simular resultado
        const result = simulateCupMatch(pendingMatch, state.team);

        // 3. Procesar resultado (actualizar estado de comp)
        const { advances } = processMatchResult(pendingMatch, result);

        // 4. Noticias
        const cfg = CUP_CONFIG[pendingMatch.type];
        const pn  = PHASE_NAMES[pendingMatch.phase] || pendingMatch.phase;
        const news = result.win
            ? `${cfg.emoji} ${cfg.shortName} — ${pn}: ¡Victoria ${result.myGoals}-${result.oppGoals} vs ${pendingMatch.opponent}! ${advances?'¡Clasificados!':''}`
            : result.draw
            ? `${cfg.emoji} ${cfg.shortName} — ${pn}: Empate ${result.myGoals}-${result.oppGoals} vs ${pendingMatch.opponent}`
            : `${cfg.emoji} ${cfg.shortName} — ${pn}: Derrota ${result.myGoals}-${result.oppGoals} vs ${pendingMatch.opponent}`;
        window.gameLogic?.addNews(news, result.win ? 'success' : result.draw ? 'info' : 'error');

        // 5. Actualizar UI sin avanzar semana
        if (window.ui?.refreshUI) window.ui.refreshUI(window.gameLogic.getGameState());

        // 6. Modal de resultado
        await showCupResultModal(pendingMatch, result, advances);

        // 7. Volver al dashboard
        window.openPage?.('dashboard');

        // NO llamamos a orig() → la semana de liga NO avanza
        return { myMatch: null, forcedLoss: false, cupMatch: true };
    };
}

// ============================================================
// BOOTSTRAP
// ============================================================
function bootCupMatches() {
    if (!window.gameLogic) { setTimeout(bootCupMatches, 900); return; }

    // Esperar un poco más para que injector-competitions.js también haya inicializado
    setTimeout(() => {
        initCupCalendar();
        hookSimulateWeekForCups();

        // Exponer API
        window.CupMatches = {
            getCalendar: getCupCalendar,
            clearCalendar: clearCupCalendar,
            reinit: () => { clearCupCalendar(); initCupCalendar(); },
            // Para testing: forzar un partido concreto
            testMatch: async (type, phase, opponent) => {
                const fake = { id:'test', type, phase, opponent: opponent||'Bayern München', isGroup: phase.startsWith('groups'), isKnockout: !phase.startsWith('groups') && type!=='copa', matchday:1, played:false };
                await showMatchAnnouncementModal(fake);
                const r = simulateCupMatch(fake, window.gameLogic.getGameState().team);
                await showCupResultModal(fake, r, r.win);
            }
        };

        console.log('✅ injector-cup-matches.js listo. Partidos de copa intercalados activos.');
        console.log('   Para probar: CupMatches.testMatch("champions", "round16", "Bayern München")');
    }, 3000);
}

bootCupMatches();
