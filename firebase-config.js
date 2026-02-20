// firebase-config.js  
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';  
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';  
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';  
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

  
// Configuración directa de Firebase  
const firebaseConfig = {  
    enabled: true, // ⚠️ true = Firebase habilitado, false = solo localStorage  
    apiKey: "AIzaSyD9bNZkBzcB5__dpdn152WrsJ_HTl54xqs",  
    authDomain: "cuentacuentos-57631.firebaseapp.com",  
    projectId: "cuentacuentos-57631",  
    storageBucket: "cuentacuentos-57631.firebasestorage.app",  
    messagingSenderId: "654911737232",  
    appId: "1:654911737232:web:e87ecaea12351dd3d5b715"  
};  
  
let app = null;  
let db = null;  
let auth = null;  
let currentUserId = null;  
let authReady = false;  
  
// Promise para esperar a que la autenticación esté lista  
let resolveAuthReady;  
const authReadyPromise = new Promise((resolve) => {  
    resolveAuthReady = resolve; // Captura la función de resolución  
});  
window.authReadyPromise = authReadyPromise; // Exponer globalmente  
  
// Inicializar Firebase  
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
        window.firebaseConfig = firebaseConfig; // Exponer la configuración completa  
  
       /* // Autenticación anónima INMEDIATA  
        signInAnonymously(auth)  
            .then(() => {  
                console.log('✅ Autenticación anónima iniciada');  
            })  
            .catch(error => {  
                console.error('❌ Error en autenticación anónima:', error); // Este es el error auth/admin-restricted-operation  
                // Si la autenticación anónima falla al inicio, resolvemos la promesa para no bloquear  
                if (resolveAuthReady) {  
                    resolveAuthReady(null);  
                    resolveAuthReady = null; // Para asegurar que no se resuelve de nuevo  
                }  
            });  */
  
        // Listener de cambios de autenticación  
        onAuthStateChanged(auth, (user) => {  
            if (user) {  
                currentUserId = user.uid;  
                window.currentUserId = user.uid;  
                authReady = true;  
                console.log('✅ Usuario autenticado con UID:', user.uid, 'Email:', user.email || 'sin email'); 
                // Resolver la promesa de autenticación lista  
                if (resolveAuthReady) { // Asegurarse de que resolveAuthReady ha sido asignado  
                   resolveAuthReady(user.uid);  
                   resolveAuthReady = null; // Para asegurar que no se resuelve de nuevo  
                }  
                // Habilitar botón de guardar si existe (se manejará en injector-firebase-sync.js también)  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) {  
                    saveBtn.disabled = false;  
                    saveBtn.style.opacity = '1';  
                }  
            } else {  
                currentUserId = null;  
                window.currentUserId = null;  
                authReady = false;  
                console.log('⚠️ Usuario no autenticado');  
                // Deshabilitar botón de guardar si existe (se manejará en injector-firebase-sync.js también)  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) {  
                    saveBtn.disabled = true;  
                    saveBtn.style.opacity = '0.5';  
                }  
                // Si no hay usuario y la promesa no se ha resuelto, resuélvela con null  
                if (resolveAuthReady) { // Asegurarse de que resolveAuthReady ha sido asignado  
                    resolveAuthReady(null);  
                    resolveAuthReady = null; // Para asegurar que no se resuelve de nuevo  
                }  
            }  
        });  
        console.log('✅ Firebase inicializado correctamente');  
    } catch (error) {  
        console.error('❌ Error inicializando Firebase:', error);  
        window.firebaseConfig = { enabled: false }; // Deshabilitar si hay error  
        // Si Firebase falla al inicializar, resuelve la promesa para no bloquear  
        if (resolveAuthReady) {  
            resolveAuthReady(null);  
            resolveAuthReady = null;  
        }  
    }  
} else {  
    console.log('⚠️ Firebase deshabilitado en la configuración');  
    window.firebaseConfig = { enabled: false }; // Asegurarse de que esté deshabilitado globalmente  
    // Si Firebase está deshabilitado, resuelve la promesa para no bloquear  
    if (resolveAuthReady) {  
        resolveAuthReady(null);  
        resolveAuthReady = null;  
    }  
}  

const storage = getStorage(app);
window.firebaseStorage = storage;

// Función para subir imágenes
async function uploadImage(file, path) {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return { success: true, url };
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        return { success: false, error: error.message };
    }
}

window.uploadImageToFirebase = uploadImage;

// ==========================================  
// FUNCIONES PARA DATOS DE EQUIPOS (GLOBALES)  
// ==========================================  
  
async function saveTeamDataToFirebase(teamName, teamData) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, guardando solo en localStorage');  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: false, error: 'Firebase no disponible' };  
    }  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para saveTeamDataToFirebase...');  
        try { await authReadyPromise; } catch (error) {  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
    try {  
        await setDoc(doc(db, 'teams_data', teamName), teamData);  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: true };  
    } catch (error) {  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: false, error: error.message };  
    }  
}  
  
async function getTeamDataFromFirebase(teamName) {  
    if (!firebaseConfig.enabled || !db) {  
        const localData = localStorage.getItem(`team_data_${teamName}`);  
        return localData ? { success: true, data: JSON.parse(localData) } : { success: false, data: null };  
    }  
    if (!authReady) {  
        try { await authReadyPromise; } catch (error) {  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
    try {  
        const docRef = doc(db, 'teams_data', teamName);  
        const docSnap = await getDoc(docRef);  
        if (docSnap.exists()) {  
            const data = docSnap.data();  
            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(data));  
            return { success: true, data };  
        } else {  
            const localData = localStorage.getItem(`team_data_${teamName}`);  
            if (localData) {  
                const data = JSON.parse(localData);  
                await setDoc(doc(db, 'teams_data', teamName), data);  
                return { success: true, data };  
            }  
            return { success: false, data: null };  
        }  
    } catch (error) {  
        const localData = localStorage.getItem(`team_data_${teamName}`);  
        return localData ? { success: true, data: JSON.parse(localData) } : { success: false, error: error.message };  
    }  
}  
  
async function getAllTeamsDataFromFirebase() {  
    if (!firebaseConfig.enabled || !db) {  
        const allData = {};  
        Object.keys(localStorage).forEach(key => {  
            if (key.startsWith('team_data_')) {  
                try { allData[key.replace('team_data_', '')] = JSON.parse(localStorage.getItem(key)); } catch(e) {}  
            }  
        });  
        return { success: true, data: allData };  
    }  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para getAllTeamsDataFromFirebase...');  
        try { await authReadyPromise; } catch (error) {  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
    try {  
        const querySnapshot = await getDocs(collection(db, 'teams_data'));  
        const allData = {};  
        querySnapshot.forEach((d) => {  
            allData[d.id] = d.data();  
            localStorage.setItem(`team_data_${d.id}`, JSON.stringify(d.data()));  
        });  
        return { success: true, data: allData };  
    } catch (error) {  
        return { success: false, error: error.message };  
    }  
}  
  
async function saveGameToCloud(userId, gameId, gameName, gameState) {  
    if (!firebaseConfig.enabled || !db) {  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        localGames[gameId] = { id: gameId, name: gameName, team: gameState.team, week: gameState.week, lastSaved: Date.now(), gameState };  
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));  
        return { success: false, error: 'Firebase no disponible' };  
    }  
    if (!authReady) {  
        try { await authReadyPromise; } catch (error) {  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || !gameId) return { success: false, error: 'Parámetros inválidos' };  
    try {  
        const gameData = { id: gameId, name: gameName, team: gameState.team, week: gameState.week,  
            division: gameState.division, lastSaved: Date.now(), gameState };  
        await setDoc(doc(db, 'users', finalUserId, 'saved_games', gameId), gameData);  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        localGames[gameId] = gameData;  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return { success: true };  
    } catch (error) {  
        return { success: false, error: error.message };  
    }  
}  
  
async function loadUserSavedGames(userId) {  
    if (!firebaseConfig.enabled || !db) {  
        return Object.values(JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}'));  
    }  
    if (!authReady) {  
        try { await authReadyPromise; } catch (error) { return []; }  
    }  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId) return [];  
    try {  
        const querySnapshot = await getDocs(collection(db, 'users', finalUserId, 'saved_games'));  
        const games = [];  
        querySnapshot.forEach((d) => games.push(d.data()));  
        const localGames = {};  
        games.forEach(g => { localGames[g.id] = g; });  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return games;  
    } catch (error) {  
        return Object.values(JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}'));  
    }  
}  
  
async function loadGameFromCloud(userId, gameId) {  
    if (!firebaseConfig.enabled || !db) {  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        return localGames[gameId] ? { success: true, data: localGames[gameId] } : { success: false, message: 'Partida no encontrada' };  
    }  
    if (!authReady) {  
        try { await authReadyPromise; } catch (error) {  
            return { success: false, message: 'No se pudo autenticar' };  
        }  
    }  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || !gameId) return { success: false, message: 'Parámetros inválidos' };  
    try {  
        const docSnap = await getDoc(doc(db, 'users', finalUserId, 'saved_games', gameId));  
        return docSnap.exists() ? { success: true, data: docSnap.data() } : { success: false, message: 'Partida no encontrada' };  
    } catch (error) {  
        return { success: false, error: error.message };  
    }  
}  
  
async function deleteGameFromCloud(userId, gameId) {  
    if (!firebaseConfig.enabled || !db) {  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        delete localGames[gameId];  
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));  
        return { success: true };  
    }  
    if (!authReady) {  
        try { await authReadyPromise; } catch (error) {  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || !gameId) return { success: false, error: 'Parámetros inválidos' };  
    try {  
        await deleteDoc(doc(db, 'users', finalUserId, 'saved_games', gameId));  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        delete localGames[gameId];  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return { success: true };  
    } catch (error) {  
        return { success: false, error: error.message };  
    }  
}

// ==========================================
// MERCADO DE FICHAJES
// ==========================================

async function syncTeamToTransferMarket(teamName, squadPlayers) {
    if (!firebaseConfig.enabled || !db) return { success: false, error: 'Firebase no disponible' };
    if (!authReady) { try { await authReadyPromise; } catch(e) { return { success: false }; } }
    try {
        // Calcular overall si falta (jugadores con atributos individuales)
        function calcOverall(p) {
            if (p.overall) return p.overall;
            const attrs = ['EN', 'VE', 'RE', 'AG', 'CA', 'EF', 'MO', 'AT', 'DF'];
            const vals = attrs.map(a => parseInt(p[a]) || 0).filter(v => v > 0);
            return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 70;
        }

        // Seleccionar exactamente 2 jugadores aleatorios de la plantilla
        const candidates = squadPlayers.filter(p => p.name);
        if (candidates.length === 0) return { success: true, added: 0 };
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        const toAdd = shuffled.slice(0, 2);

        const newEntries = toAdd.map(p => ({
            ...p,
            overall: calcOverall(p),
            club: teamName,
            originalTeam: teamName,
            transferListed: true,
            loanListed: p.age < 26 ? Math.random() < 0.4 : false,
            addedToMarketAt: Date.now()
        }));

        // REEMPLAZAR (no acumular) los jugadores de este equipo en el mercado
        await setDoc(doc(db, 'transfer_market', teamName), {
            teamName,
            players: newEntries,
            lastUpdated: Date.now()
        });
        console.log('✅ Mercado sync ' + teamName + ': 2 jugadores');
        return { success: true, added: newEntries.length };
    } catch (error) {
        console.error('❌ Error sincronizando mercado:', error);
        return { success: false, error: error.message };
    }
}

async function getTransferMarket(mySquadNames = []) {
    if (!firebaseConfig.enabled || !db) return [];
    if (!authReady) { try { await authReadyPromise; } catch(e) { return []; } }
    try {
        const myNamesSet = new Set(mySquadNames.map(n => (n || '').toLowerCase()));
        const querySnapshot = await getDocs(collection(db, 'transfer_market'));
        const allPlayers = [];
        querySnapshot.forEach((d) => {
            const data = d.data();
            if (data.players) {
                data.players.forEach(p => {
                    if (p.name && !myNamesSet.has(p.name.toLowerCase())) {
                        allPlayers.push(p);
                    }
                });
            }
        });
        return allPlayers;
    } catch (error) {
        console.error('❌ Error obteniendo mercado:', error);
        return [];
    }
}

async function removePlayerFromMarket(playerName, originalTeam) {
    if (!firebaseConfig.enabled || !db) return { success: false };
    if (!authReady) { try { await authReadyPromise; } catch(e) { return { success: false }; } }
    try {
        const marketRef = doc(db, 'transfer_market', originalTeam);
        const marketSnap = await getDoc(marketRef);
        if (!marketSnap.exists()) return { success: false };
        const players = (marketSnap.data().players || []).filter(p => p.name !== playerName);
        await setDoc(marketRef, { ...marketSnap.data(), players, lastUpdated: Date.now() });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function addPlayerToMarket(teamName, player) {
    if (!firebaseConfig.enabled || !db) return { success: false };
    if (!authReady) { try { await authReadyPromise; } catch(e) { return { success: false }; } }
    try {
        const marketRef = doc(db, 'transfer_market', teamName);
        const marketSnap = await getDoc(marketRef);
        const existing = marketSnap.exists() ? (marketSnap.data().players || []) : [];
        const entry = { ...player, club: teamName, originalTeam: teamName, transferListed: true, addedToMarketAt: Date.now() };
        await setDoc(marketRef, { teamName, players: [...existing, entry], lastUpdated: Date.now() });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function removePlayerFromMarketByUser(playerName, teamName) {
    return removePlayerFromMarket(playerName, teamName);
}

async function returnLoanedPlayerToOrigin(playerName, originalTeam) {
    if (!firebaseConfig.enabled || !db) return { success: false };
    if (!authReady) { try { await authReadyPromise; } catch(e) { return { success: false }; } }
    try {
        await addPlayerToMarket(originalTeam, { name: playerName, originalTeam, transferListed: false, loanListed: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==========================================  
// EXPORTAR FUNCIONES GLOBALMENTE  
// ==========================================  
window.saveTeamDataToFirebase = saveTeamDataToFirebase;  
window.getTeamDataFromFirebase = getTeamDataFromFirebase;  
window.getAllTeamsDataFromFirebase = getAllTeamsDataFromFirebase;  
window.saveGameToCloud = saveGameToCloud;  
window.loadUserSavedGames = loadUserSavedGames;  
window.loadGameFromCloud = loadGameFromCloud;  
window.deleteGameFromCloud = deleteGameFromCloud;
window.syncTeamToTransferMarket = syncTeamToTransferMarket;
window.getTransferMarket = getTransferMarket;
window.removePlayerFromMarket = removePlayerFromMarket;
window.addPlayerToMarket = addPlayerToMarket;
window.removePlayerFromMarketByUser = removePlayerFromMarketByUser;
window.returnLoanedPlayerToOrigin = returnLoanedPlayerToOrigin;
  
// Exportar como módulos ES6  
export {  
    app, auth, db, onAuthStateChanged,  
    saveTeamDataToFirebase, getTeamDataFromFirebase, getAllTeamsDataFromFirebase,  
    saveGameToCloud, loadUserSavedGames, loadGameFromCloud, deleteGameFromCloud,  
    authReadyPromise, firebaseConfig,
    syncTeamToTransferMarket, getTransferMarket, removePlayerFromMarket,
    addPlayerToMarket, removePlayerFromMarketByUser, returnLoanedPlayerToOrigin
};  
