// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
const firebaseConfig = window.firebaseConfigData || { enabled: false };
// Importar configuración desde config.js
import { firebaseConfig } from './config.js';

let app = null;
let db = null;
let auth = null;

// Inicializar Firebase solo si está habilitado
if (firebaseConfig.enabled) {
    try {
        console.log('🔥 Inicializando Firebase...');
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Exponer globalmente
        window.firebaseApp = app;
        window.firebaseDB = db;
        window.firebaseAuth = auth;
        window.firebaseConfig = firebaseConfig;
        
        console.log('✅ Firebase inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando Firebase:', error);
        window.firebaseConfig = { enabled: false };
    }
} else {
    console.log('⚠️ Firebase deshabilitado en config.js');
    window.firebaseConfig = { enabled: false };
}

// ==========================================
// FUNCIONES PARA DATOS DE EQUIPOS (GLOBALES)
// ==========================================

async function saveTeamDataToFirebase(teamName, teamData) {
    if (!firebaseConfig.enabled || !db) {
        console.log('⚠️ Firebase deshabilitado, guardando en localStorage');
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));
        return { success: true };
    }
    
    try {
        await setDoc(doc(db, 'teams_data', teamName), teamData);
        console.log(`✅ Datos del equipo ${teamName} guardados en Firebase`);
        // También guardar en localStorage como caché
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));
        return { success: true };
    } catch (error) {
        console.error('❌ Error guardando en Firebase:', error);
        // Fallback a localStorage
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));
        return { success: false, error: error.message };
    }
}

async function getTeamDataFromFirebase(teamName) {
    if (!firebaseConfig.enabled || !db) {
        console.log('⚠️ Firebase deshabilitado, cargando desde localStorage');
        const localData = localStorage.getItem(`team_data_${teamName}`);
        if (localData) {
            return { success: true, data: JSON.parse(localData) };
        }
        return { success: false, data: null };
    }
    
    try {
        const docRef = doc(db, 'teams_data', teamName);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log(`✅ Datos del equipo ${teamName} cargados desde Firebase`);
            const data = docSnap.data();
            // Guardar en localStorage como caché
            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(data));
            return { success: true, data: data };
        } else {
            console.log(`⚠️ No hay datos en Firebase para ${teamName}, intentando localStorage`);
            const localData = localStorage.getItem(`team_data_${teamName}`);
            if (localData) {
                return { success: true, data: JSON.parse(localData) };
            }
            return { success: false, data: null };
        }
    } catch (error) {
        console.error('❌ Error cargando desde Firebase:', error);
        // Fallback a localStorage
        const localData = localStorage.getItem(`team_data_${teamName}`);
        if (localData) {
            return { success: true, data: JSON.parse(localData) };
        }
        return { success: false, error: error.message };
    }
}

async function getAllTeamsDataFromFirebase() {
    if (!firebaseConfig.enabled || !db) {
        console.log('⚠️ Firebase deshabilitado, cargando desde localStorage');
        const allData = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('team_data_')) {
                const teamName = key.replace('team_data_', '');
                try {
                    allData[teamName] = JSON.parse(localStorage.getItem(key));
                } catch (error) {
                    console.error(`Error parseando datos de ${teamName}:`, error);
                }
            }
        });
        return { success: true, data: allData };
    }
    
    try {
        const querySnapshot = await getDocs(collection(db, 'teams_data'));
        const allData = {};
        querySnapshot.forEach((doc) => {
            allData[doc.id] = doc.data();
            // Guardar en localStorage como caché
            localStorage.setItem(`team_data_${doc.id}`, JSON.stringify(doc.data()));
        });
        console.log(`✅ ${Object.keys(allData).length} equipos cargados desde Firebase`);
        return { success: true, data: allData };
    } catch (error) {
        console.error('❌ Error cargando todos los equipos:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// FUNCIONES PARA PARTIDAS GUARDADAS (POR USUARIO)
// ==========================================

async function saveGameToCloud(userId, gameId, gameName, gameState) {
    if (!firebaseConfig.enabled || !db) {
        console.log('⚠️ Firebase deshabilitado, guardando localmente');
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
        localGames[gameId] = {
            id: gameId,
            name: gameName,
            team: gameState.team,
            week: gameState.week,
            lastSaved: Date.now(),
            gameState: gameState
        };
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));
        return { success: true };
    }
    
    try {
        const gameData = {
            id: gameId,
            name: gameName,
            team: gameState.team,
            week: gameState.week,
            division: gameState.division,
            lastSaved: Date.now(),
            gameState: gameState
        };
        
        await setDoc(doc(db, 'users', userId, 'saved_games', gameId), gameData);
        console.log(`✅ Partida ${gameId} guardada en Firebase para usuario ${userId}`);
        
        // También guardar localmente como backup
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
        localGames[gameId] = gameData;
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));
        
        return { success: true };
    } catch (error) {
        console.error('❌ Error guardando partida en Firebase:', error);
        return { success: false, error: error.message };
    }
}

async function loadUserSavedGames(userId) {
    if (!firebaseConfig.enabled || !db) {
        console.log('⚠️ Firebase deshabilitado, cargando juegos locales');
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
        return Object.values(localGames);
    }
    
    try {
        const querySnapshot = await getDocs(collection(db, 'users', userId, 'saved_games'));
        const games = [];
        querySnapshot.forEach((doc) => {
            games.push(doc.data());
        });
        console.log(`✅ ${games.length} partidas cargadas desde Firebase para usuario ${userId}`);
        
        // Guardar en localStorage como caché
        const localGames = {};
        games.forEach(game => {
            localGames[game.id] = game;
        });
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));
        
        return games;
    } catch (error) {
        console.error('❌ Error cargando partidas desde Firebase:', error);
        // Fallback a localStorage
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
        return Object.values(localGames);
    }
}

async function loadGameFromCloud(userId, gameId) {
    if (!firebaseConfig.enabled || !db) {
        console.log('⚠️ Firebase deshabilitado, cargando desde localStorage');
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
        if (localGames[gameId]) {
            // Cargar el estado en gameLogic
            if (window.gameLogic) {
                window.gameLogic.updateGameState(localGames[gameId].gameState);
            }
            return { success: true, data: localGames[gameId] };
        }
        return { success: false, message: 'Partida no encontrada' };
    }
    
    try {
        const docRef = doc(db, 'users', userId, 'saved_games', gameId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const gameData = docSnap.data();
            console.log(`✅ Partida ${gameId} cargada desde Firebase`);
            
            // Cargar el estado en gameLogic
            if (window.gameLogic) {
                window.gameLogic.updateGameState(gameData.gameState);
            }
            
            return { success: true, data: gameData };
        } else {
            return { success: false, message: 'Partida no encontrada en Firebase' };
        }
    } catch (error) {
        console.error('❌ Error cargando partida desde Firebase:', error);
        return { success: false, error: error.message };
    }
}

async function deleteGameFromCloud(userId, gameId) {
    if (!firebaseConfig.enabled || !db) {
        console.log('⚠️ Firebase deshabilitado, eliminando localmente');
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
        delete localGames[gameId];
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));
        return { success: true };
    }
    
    try {
        await deleteDoc(doc(db, 'users', userId, 'saved_games', gameId));
        console.log(`✅ Partida ${gameId} eliminada de Firebase`);
        
        // También eliminar localmente
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');
        delete localGames[gameId];
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));
        
        return { success: true };
    } catch (error) {
        console.error('❌ Error eliminando partida de Firebase:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// EXPORTAR FUNCIONES GLOBALMENTE
// ==========================================

// Equipos (datos globales)
window.saveTeamDataToFirebase = saveTeamDataToFirebase;
window.getTeamDataFromFirebase = getTeamDataFromFirebase;
window.getAllTeamsDataFromFirebase = getAllTeamsDataFromFirebase;

// Partidas (datos por usuario)
window.saveGameToCloud = saveGameToCloud;
window.loadUserSavedGames = loadUserSavedGames;
window.loadGameFromCloud = loadGameFromCloud;
window.deleteGameFromCloud = deleteGameFromCloud;

// Exportar como módulos ES6 también
export {
    auth,
    db,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    saveTeamDataToFirebase,
    getTeamDataFromFirebase,
    getAllTeamsDataFromFirebase,
    saveGameToCloud,
    loadUserSavedGames,
    loadGameFromCloud,
    deleteGameFromCloud
};
