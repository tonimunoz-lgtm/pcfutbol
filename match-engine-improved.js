// ========================================
// MOTOR DE SIMULACIÓN DE PARTIDOS MEJORADO
// Fase 1: Mejoras Críticas
// ========================================

// ✅ MEJORA 1: Mapeo de posiciones compatibles
const POSITION_COMPATIBILITY = {
    'POR': ['POR'],                           // Solo porteros
    'DFC': ['DFC', 'LD', 'LI'],              // Centrales pueden jugar de laterales
    'LI': ['LI', 'DFC', 'MI'],               // Laterales izquierdos
    'LD': ['LD', 'DFC', 'MD'],               // Laterales derechos
    'MC': ['MC', 'MCO', 'MCD', 'MD', 'MI'],  // Medios centrales
    'MCO': ['MCO', 'MC', 'EXT', 'DC'],       // Mediapunta
    'MCD': ['MCD', 'MC', 'DFC'],             // Pivote
    'MD': ['MD', 'LD', 'MC', 'EXT'],         // Medio derecho
    'MI': ['MI', 'LI', 'MC', 'EXT'],         // Medio izquierdo
    'EXT': ['EXT', 'MD', 'MI', 'MCO', 'DC'], // Extremos
    'DC': ['DC', 'EXT', 'MCO']               // Delanteros
};

// ✅ MEJORA 2: Cálculo mejorado del overall del equipo
function calculateTeamEffectiveOverall(lineup, formation = '433') {
    if (!lineup || lineup.length === 0) return 40;
    
    const formationLayout = window.FORMATIONS?.[formation]?.layout || [];
    if (formationLayout.length === 0) {
        // Fallback: cálculo simple si no hay formación
        const availablePlayers = lineup.filter(p => !p.isInjured);
        if (availablePlayers.length === 0) return 40;
        return availablePlayers.reduce((sum, p) => sum + p.overall, 0) / availablePlayers.length;
    }
    
    let totalOverall = 0;
    let playerCount = 0;
    
    lineup.forEach((player, index) => {
        if (!player || player.isInjured) return;
        
        const tacticalPosition = formationLayout[index]?.pos;
        if (!tacticalPosition) return;
        
        // ⚠️ PENALIZACIÓN POR POSICIÓN INCORRECTA
        let positionPenalty = 1.0;
        
        if (player.position === tacticalPosition) {
            // ✅ Posición perfecta
            positionPenalty = 1.0;
        } else if (POSITION_COMPATIBILITY[tacticalPosition]?.includes(player.position)) {
            // ⚠️ Posición compatible (ej: DFC de LI)
            positionPenalty = 0.85; // -15%
        } else {
            // ❌ Posición totalmente incorrecta (ej: POR de DC)
            positionPenalty = 0.50; // -50%
        }
        
        const effectiveOverall = player.overall * positionPenalty;
        totalOverall += effectiveOverall;
        playerCount++;
    });
    
    return playerCount > 0 ? totalOverall / playerCount : 40;
}

// ✅ MEJORA 3: Generar plantilla realista para equipos IA
async function generateAISquad(teamName, division) {
    // Intentar cargar plantilla real desde Firestore
    if (window.getTeamData) {
        try {
            const teamData = await window.getTeamData(teamName);
            if (teamData && teamData.squad && teamData.squad.length > 0) {
                // Completar jugadores con campos necesarios
                return teamData.squad.map(p => ({
                    ...p,
                    overall: p.overall || calculatePlayerOverall(p),
                    form: p.form || 75,
                    isInjured: p.isInjured || false
                }));
            }
        } catch (error) {
            console.warn(`No se pudo cargar plantilla de ${teamName}:`, error);
        }
    }
    
    // Si no hay plantilla real, generar según división
    const divisionQuality = {
        primera: { min: 70, max: 88 },
        segunda: { min: 60, max: 75 },
        rfef_grupo1: { min: 50, max: 65 },
        rfef_grupo2: { min: 50, max: 65 }
    };
    
    const quality = divisionQuality[division] || { min: 55, max: 70 };
    const squad = [];
    
    // Generar 11 titulares
    for (let i = 0; i < 11; i++) {
        const overall = quality.min + Math.random() * (quality.max - quality.min);
        squad.push({
            name: `Jugador ${i+1}`,
            overall: Math.round(overall),
            form: 70 + Math.random() * 15,
            isInjured: false,
            position: ['POR', 'DFC', 'DFC', 'LI', 'LD', 'MC', 'MC', 'EXT', 'EXT', 'DC'][i] || 'MC'
        });
    }
    
    return squad;
}

// ✅ MEJORA 4: Bonus/penalización según formación
function getFormationModifiers(formation, mentality) {
    const modifiers = {
        attackBonus: 1.0,
        defenseBonus: 1.0,
        midfieldBonus: 1.0
    };
    
    // Ajustes por formación
    switch(formation) {
        case '433': // Equilibrada ofensiva
            modifiers.attackBonus = 1.05;
            modifiers.defenseBonus = 0.98;
            break;
        case '442': // Equilibrada
            modifiers.attackBonus = 1.0;
            modifiers.defenseBonus = 1.0;
            modifiers.midfieldBonus = 1.05;
            break;
        case '352': // Medio fuerte
            modifiers.midfieldBonus = 1.1;
            modifiers.defenseBonus = 0.95;
            break;
        case '541': // Muy defensiva
            modifiers.defenseBonus = 1.15;
            modifiers.attackBonus = 0.85;
            break;
        case '451': // Defensiva
            modifiers.defenseBonus = 1.08;
            modifiers.attackBonus = 0.92;
            modifiers.midfieldBonus = 1.05;
            break;
    }
    
    // Ajustes por mentalidad
    switch(mentality) {
        case 'offensive':
            modifiers.attackBonus *= 1.15;
            modifiers.defenseBonus *= 0.90;
            break;
        case 'defensive':
            modifiers.defenseBonus *= 1.15;
            modifiers.attackBonus *= 0.85;
            break;
    }
    
    return modifiers;
}

// ✅ MEJORA 5: Cálculo de resultado mejorado
function calculateMatchOutcomeImproved({
    teamOverall,
    opponentOverall,
    teamFormation = '433',
    opponentFormation = '433',
    teamMentality = 'balanced',
    opponentMentality = 'balanced',
    isHome = true,
    teamForm = 75,
    opponentForm = 75
}) {
    // Factores base
    let teamFactor = (teamOverall / 100) * (teamForm / 100);
    let opponentFactor = (opponentOverall / 100) * (opponentForm / 100);
    
    // Ventaja de local
    if (isHome) {
        teamFactor *= 1.12; // +12%
    } else {
        opponentFactor *= 1.12;
    }
    
    // Modificadores de formación
    const teamMods = getFormationModifiers(teamFormation, teamMentality);
    const oppMods = getFormationModifiers(opponentFormation, opponentMentality);
    
    // Aplicar bonus tácticos
    const teamAttack = teamFactor * teamMods.attackBonus;
    const teamDefense = teamFactor * teamMods.defenseBonus;
    const oppAttack = opponentFactor * oppMods.attackBonus;
    const oppDefense = opponentFactor * oppMods.defenseBonus;
    
    // Cálculo de goles (ataque propio vs defensa rival)
    let teamGoalChance = teamAttack / oppDefense;
    let oppGoalChance = oppAttack / teamDefense;
    
    // Aleatoriedad controlada (±15%)
    teamGoalChance *= (0.85 + Math.random() * 0.3);
    oppGoalChance *= (0.85 + Math.random() * 0.3);
    
    // Convertir a goles (más realista: 0-5 goles típicamente)
    const teamGoals = Math.min(7, Math.max(0, Math.round(teamGoalChance * 3)));
    const oppGoals = Math.min(7, Math.max(0, Math.round(oppGoalChance * 3)));
    
    return {
        teamGoals,
        opponentGoals: oppGoals
    };
}

// ========================================
// ✅ MEJORA 4: Cálculo de resultado mejorado
// ========================================
function calculateMatchOutcomeImproved({
    teamOverall,
    opponentOverall,
    teamFormation = '433',
    opponentFormation = '433',
    teamMentality = 'balanced',
    opponentMentality = 'balanced',
    isHome = true,
    teamForm = 75,
    opponentForm = 75
}) {
    // Factores base
    let teamFactor = (teamOverall / 100) * (teamForm / 100);
    let opponentFactor = (opponentOverall / 100) * (opponentForm / 100);
    
    // Ventaja de local
    if (isHome) {
        teamFactor *= 1.12; // +12%
    } else {
        opponentFactor *= 1.12;
    }
    
    // Modificadores de formación
    const teamMods = getFormationModifiers(teamFormation, teamMentality);
    const oppMods = getFormationModifiers(opponentFormation, opponentMentality);
    
    // Aplicar bonus tácticos
    const teamAttack = teamFactor * teamMods.attackBonus;
    const teamDefense = teamFactor * teamMods.defenseBonus;
    const oppAttack = opponentFactor * oppMods.attackBonus;
    const oppDefense = opponentFactor * oppMods.defenseBonus;
    
    // Cálculo de goles (ataque propio vs defensa rival)
    let teamGoalChance = teamAttack / oppDefense;
    let oppGoalChance = oppAttack / teamDefense;
    
    // Aleatoriedad controlada (±15%)
    teamGoalChance *= (0.85 + Math.random() * 0.3);
    oppGoalChance *= (0.85 + Math.random() * 0.3);
    
    // Convertir a goles (más realista: 0-5 goles típicamente)
    const teamGoals = Math.min(7, Math.max(0, Math.round(teamGoalChance * 3)));
    const oppGoals = Math.min(7, Math.max(0, Math.round(oppGoalChance * 3)));
    
    return {
        teamGoals,
        opponentGoals: oppGoals
    };
}

// ✅ MEJORA 6: Función playMatch mejorada
async function playMatchImproved(homeTeamName, awayTeamName, gameState) {
    let homeSquad, awaySquad;
    let homeFormation = '433', awayFormation = '433';
    let homeMentality = 'balanced', awayMentality = 'balanced';
    
    // EQUIPO LOCAL
    if (homeTeamName === gameState.team) {
        homeSquad = gameState.lineup;
        homeFormation = gameState.formation || '433';
        homeMentality = gameState.mentality || 'balanced';
    } else {
        // ✅ Generar plantilla IA realista
        homeSquad = await generateAISquad(homeTeamName, gameState.division);
        homeFormation = ['433', '442', '541'][Math.floor(Math.random() * 3)];
        homeMentality = Math.random() > 0.7 ? 'offensive' : (Math.random() > 0.5 ? 'balanced' : 'defensive');
    }
    
    // EQUIPO VISITANTE
    if (awayTeamName === gameState.team) {
        awaySquad = gameState.lineup;
        awayFormation = gameState.formation || '433';
        awayMentality = gameState.mentality || 'balanced';
    } else {
        // ✅ Generar plantilla IA realista
        awaySquad = await generateAISquad(awayTeamName, gameState.division);
        awayFormation = ['433', '442', '541'][Math.floor(Math.random() * 3)];
        awayMentality = Math.random() > 0.7 ? 'offensive' : (Math.random() > 0.5 ? 'balanced' : 'defensive');
    }
    
    // ✅ Calcular overall REAL de cada equipo
    const homeOverall = calculateTeamEffectiveOverall(homeSquad, homeFormation);
    const awayOverall = calculateTeamEffectiveOverall(awaySquad, awayFormation);
    
    // Forma promedio de los jugadores
    const homeForm = homeSquad.reduce((sum, p) => sum + (p.form || 75), 0) / homeSquad.length;
    const awayForm = awaySquad.reduce((sum, p) => sum + (p.form || 75), 0) / awaySquad.length;
    
    // ✅ Calcular resultado con el motor mejorado
    const { teamGoals: homeGoals, opponentGoals: awayGoals } = calculateMatchOutcomeImproved({
        teamOverall: homeOverall,
        opponentOverall: awayOverall,
        teamFormation: homeFormation,
        opponentFormation: awayFormation,
        teamMentality: homeMentality,
        opponentMentality: awayMentality,
        isHome: true,
        teamForm: homeForm,
        opponentForm: awayForm
    });
    
    console.log(`🏟️ ${homeTeamName} (${homeOverall.toFixed(1)} OVR, ${homeFormation}) ${homeGoals}-${awayGoals} ${awayTeamName} (${awayOverall.toFixed(1)} OVR, ${awayFormation})`);
    
    return {
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        homeGoals,
        awayGoals,
        homeOverall,
        awayOverall,
        homeFormation,
        awayFormation
    };
}

// ✅ Exportar funciones
if (typeof window !== 'undefined') {
    window.calculateTeamEffectiveOverallImproved = calculateTeamEffectiveOverall;
    window.playMatchImproved = playMatchImproved;
    window.calculateMatchOutcomeImproved = calculateMatchOutcomeImproved;
    window.generateAISquad = generateAISquad;
}

console.log('✅ Motor de partidos mejorado cargado (Fase 1)');
