// Nuevo archivo: players-database.js

import { doc, setDoc, getDoc, collection, query, where, getDocs } from 
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Guarda un jugador en la base de datos global
 */
async function savePlayerToDatabase(player) {
    if (!window.firebaseDB) return { success: false };
    
    try {
        const playerId = player.id || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        player.id = playerId;
        
        await setDoc(doc(window.firebaseDB, 'players_database', playerId), {
            personal: {
                id: playerId,
                name: player.name,
                age: player.age,
                nationality: player.nationality || 'España',
                position: player.position,
                foot: player.foot || 'Derecho'
            },
            attributes: {
                EN: player.EN || 50,
                VE: player.VE || 50,
                RE: player.RE || 50,
                AG: player.AG || 50,
                CA: player.CA || 50,
                EF: player.EF || 50,
                MO: player.MO || 50,
                AT: player.AT || 50,
                DF: player.DF || 50
            },
            contract: {
                team: player.currentTeam || null,
                years: player.contractYears || 0,
                weeks: player.contractWeeks || 0,
                salary: player.salary || 0,
                type: player.contractType || 'free_agent',
                releaseClause: player.releaseClause || 0
            },
            status: {
                isInjured: player.isInjured || false,
                weeksOut: player.weeksOut || 0,
                injuryType: player.injuryType || null,
                isSuspended: player.isSuspended || false,
                suspensionWeeks: player.suspensionWeeks || 0,
                yellowCards: player.yellowCards || 0,
                redCards: player.redCards || 0
            },
            stats: {
                overall: calculateOverall(player),
                potential: player.potential || calculateOverall(player) + Math.floor(Math.random() * 10),
                minutesPlayed: player.minutesPlayed || 0,
                goals: player.goals || 0,
                assists: player.assists || 0
            },
            history: player.history || [],
            created: Date.now(),
            lastUpdated: Date.now()
        });
        
        return { success: true, playerId };
    } catch (error) {
        console.error('Error guardando jugador:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene un jugador de la base de datos
 */
async function getPlayerFromDatabase(playerId) {
    if (!window.firebaseDB) return { success: false };
    
    try {
        const docRef = doc(window.firebaseDB, 'players_database', playerId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { success: true, player: docSnap.data() };
        } else {
            return { success: false, error: 'Jugador no encontrado' };
        }
    } catch (error) {
        console.error('Error obteniendo jugador:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca jugadores por criterios
 */
async function searchPlayers(criteria) {
    if (!window.firebaseDB) return { success: false };
    
    try {
        let q = collection(window.firebaseDB, 'players_database');
        
        // Aplicar filtros
        if (criteria.position) {
            q = query(q, where('personal.position', '==', criteria.position));
        }
        
        if (criteria.team) {
            q = query(q, where('contract.team', '==', criteria.team));
        }
        
        if (criteria.freeAgent) {
            q = query(q, where('contract.type', '==', 'free_agent'));
        }
        
        const querySnapshot = await getDocs(q);
        const players = [];
        
        querySnapshot.forEach(doc => {
            players.push(doc.data());
        });
        
        return { success: true, players };
    } catch (error) {
        console.error('Error buscando jugadores:', error);
        return { success: false, error: error.message };
    }
}

// Exportar funciones
window.PlayersDatabase = {
    save: savePlayerToDatabase,
    get: getPlayerFromDatabase,
    search: searchPlayers
};
