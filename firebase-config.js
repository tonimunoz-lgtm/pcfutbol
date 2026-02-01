// firebase-config.js  
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';  
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';  
// IMPORTANTE: Asegúrate de que signInAnonymously NO esté en esta línea de importación  
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';   
  
const firebaseConfig = {  
    enabled: true,   
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
  
let resolveAuthReady;  
const authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; });  
window.authReadyPromise = authReadyPromise;   
  
if (firebaseConfig.enabled) {  
    try {  
        console.log('🔥 Inicializando Firebase...'); // Corregido carácter  
        app = initializeApp(firebaseConfig);  
        db = getFirestore(app);  
        auth = getAuth(app);  
  
        window.firebaseApp = app;  
        window.firebaseDB = db;  
        window.firebaseAuth = auth;  
        window.firebaseConfig = firebaseConfig;  
  
        // *** CAMBIO CLAVE AQUI: ELIMINAR CUALQUIER LLAMADA A signInAnonymously(auth) ***  
        // Si encuentras alguna línea como esta (comentada o no), bórrala:  
        // signInAnonymously(auth)  
        //     .then(() => { console.log('✅ Autenticación anónima iniciada'); })  
        //     .catch(error => { console.error('❌ Error en autenticación anónima:', error); });  
        // Esto asegura que NO se intente iniciar sesión anónimamente.  
  
        onAuthStateChanged(auth, async (user) => {   
            if (user) {  
                // Eliminar cualquier verificación 'if (user.isAnonymous)' aquí.  
                // Si la autenticación anónima está deshabilitada en la consola, un 'user' en este punto  
                // SIEMPRE será un usuario autenticado con email/password (o similar).  
  
                currentUserId = user.uid;  
                window.currentUserId = user.uid;  
                authReady = true;  
                console.log('✅ Usuario autenticado con UID:', user.uid); // Corregido carácter  
  
                let userData = {   
                    email: user.email || 'unknown@example.com',   
                    uid: user.uid,   
                    role: 'user',   
                    name: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario')   
                };  
                  
                if (db) {   
                    const userDocRef = doc(db, 'users_metadata', user.uid);  
                    const userDocSnap = await getDoc(userDocRef);  
                    if (userDocSnap.exists()) {  
                        userData = { ...userDocSnap.data(), uid: user.uid, email: user.email };  
                        if (user.displayName && userData.name !== user.displayName) {  
                             userData.name = user.displayName;  
                             await setDoc(userDocRef, { name: user.displayName }, { merge: true });  
                        }  
                    } else {  
                        await setDoc(userDocRef, {   
                            email: user.email,   
                            name: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'),   
                            role: 'user'   
                        });  
                    }  
                }  
                window.currentUser = userData;   
  
                if (resolveAuthReady) {  
                    resolveAuthReady(user.uid);  
                    // Para evitar que se resuelva múltiples veces en el ciclo de vida de la app,  
                    // y para que futuros `await authReadyPromise` esperen el estado correcto.  
                    resolveAuthReady = null;   
                    window.authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; });   
                }  
  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; }  
                if (window.updateFirebaseStatusIndicator) window.updateFirebaseStatusIndicator();  
  
                if (window.addUserButtons && window.currentUser) {  
                    window.addUserButtons(window.currentUser);  
                }  
  
            } else { // No hay usuario autenticado (email/password)  
                currentUserId = null;  
                window.currentUserId = null;  
                authReady = false;  
                window.currentUser = null;  
                console.log('⚪ Usuario no autenticado (email/password).'); // Corregido carácter  
  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; }  
  
                if (resolveAuthReady) {  
                    resolveAuthReady(null);  
                    resolveAuthReady = null;   
                    window.authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; });   
                }  
                if (window.updateFirebaseStatusIndicator) window.updateFirebaseStatusIndicator();  
  
                if (window.removeUserButtons) {  
                    window.removeUserButtons();  
                }  
            }  
        });  
        console.log('✅ Firebase inicializado correctamente'); // Corregido carácter  
    } catch (error) {  
        console.error('❌ Error inicializando Firebase:', error); // Corregido carácter  
        window.firebaseConfig = { enabled: false };  
        if (resolveAuthReady) {   
            resolveAuthReady(null);   
            resolveAuthReady = null;   
            window.authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; });   
        }  
    }  
} else {  
    console.log('⚪ Firebase deshabilitado en la configuración'); // Corregido carácter  
    window.firebaseConfig = { enabled: false };  
    if (resolveAuthReady) {   
        resolveAuthReady(null);   
        resolveAuthReady = null;   
        window.authReadyPromise = new Promise((resolve) => { resolveAuthReady = resolve; });   
    }  
} 
  
// ==========================================  
// FUNCIONES PARA DATOS DE EQUIPOS (GLOBALES)  
// ==========================================  
  
async function saveTeamDataToFirebase(teamName, teamData) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, guardando solo en localStorage');  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: false, error: 'Firebase no disponible' };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para saveTeamDataToFirebase...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, error: 'No se pudo autenticar para guardar datos de equipo' };  
        }  
    }  
      
    try {  
        console.log(`📤 Guardando datos de equipo en Firebase: ${teamName}...`);  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        await setDoc(doc(db, 'teams_data', teamName), teamData);  
        console.log(`✅ Datos del equipo ${teamName} guardados en Firebase`);  
        // También guardar en localStorage como caché  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: true };  
    } catch (error) {  
        console.error('❌ Error guardando en Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        // Fallback a localStorage  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        return { success: false, error: error.message };  
    }  
}  
  
async function getTeamDataFromFirebase(teamName) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, cargando desde localStorage');  
        const localData = localStorage.getItem(`team_data_${teamName}`);  
        if (localData) {  
            return { success: true, data: JSON.parse(localData) };  
        }  
        return { success: false, data: null };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para getTeamDataFromFirebase...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, error: 'No se pudo autenticar para cargar datos de equipo' };  
        }  
    }  
  
    try {  
        console.log(`📥 Cargando desde Firebase: ${teamName}...`);  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const docRef = doc(db, 'teams_data', teamName);  
        const docSnap = await getDoc(docRef);  
        if (docSnap.exists()) {  
            console.log(`✅ Datos del equipo ${teamName} cargados desde Firebase`);  
            const data = docSnap.data();  
            // Guardar en localStorage como caché  
            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(data));  
            return { success: true, data: data };  
        } else {  
            console.log(`⚠️ No hay datos en Firebase para ${teamName}, buscando en localStorage`);  
            const localData = localStorage.getItem(`team_data_${teamName}`);  
            if (localData) {  
                const data = JSON.parse(localData);  
                // Subir a Firebase para sincronización  
                console.log(`📤 Subiendo datos locales de ${teamName} a Firebase...`);  
                // Asegúrate de usar el db inicializado  
                await setDoc(doc(db, 'teams_data', teamName), data);  
                return { success: true, data: data };  
            }  
            return { success: false, data: null };  
        }  
    } catch (error) {  
        console.error('❌ Error cargando desde Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
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
        console.log('⚠️ Firebase no disponible, cargando desde localStorage');  
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
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para getAllTeamsDataFromFirebase...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, error: 'No se pudo autenticar para cargar todos los datos de equipo' };  
        }  
    }  
  
    try {  
        console.log('📥 Cargando todos los equipos desde Firebase...');  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
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
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
// ==========================================  
// FUNCIONES PARA PARTIDAS GUARDADAS (POR USUARIO)  
// ==========================================  
  
async function saveGameToCloud(userId, gameId, gameName, gameState) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, guardando localmente');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        localGames[gameId] = { id: gameId, name: gameName,  
            team: gameState.team, week: gameState.week, lastSaved: Date.now(), gameState: gameState };  
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));  
        return { success: false, error: 'Firebase no disponible' };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación antes de guardar partida...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
  
    // Validar userId y gameId después de esperar autenticación  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string') {  
        console.error('❌ Error: userId es inválido:', finalUserId);  
        return { success: false, error: 'Usuario no autenticado o ID de usuario inválido' };  
    }  
    if (!gameId || typeof gameId !== 'string') {  
        console.error('❌ Error: gameId es inválido:', gameId);  
        return { success: false, error: 'ID de partida inválido' };  
    }  
  
    try {  
        console.log(`📤 Guardando partida ${gameId} en Firebase para usuario ${finalUserId}...`);  
        const gameData = {  
            id: gameId,  
            name: gameName,  
            team: gameState.team,  
            week: gameState.week,  
            division: gameState.division,  
            lastSaved: Date.now(),  
            gameState: gameState  
        };  
        // Asegúrate de que db esté definido y no sea null/undefined aquí  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        await setDoc(doc(db, 'users', finalUserId, 'saved_games', gameId), gameData);  
        console.log(`✅ Partida ${gameId} guardada en Firebase`);  
        // También guardar localmente como backup  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        localGames[gameId] = gameData;  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return { success: true };  
    } catch (error) {  
        console.error('❌ Error guardando partida en Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
async function loadUserSavedGames(userId) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, cargando juegos locales');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        return Object.values(localGames);  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para loadUserSavedGames...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return [];  
        }  
    }  
  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string') {  
        console.error('❌ Error: userId es inválido para cargar partidas');  
        return [];  
    }  
  
    try {  
        console.log(`📥 Cargando partidas guardadas desde Firebase para usuario ${finalUserId}...`);  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const querySnapshot = await getDocs(collection(db, 'users', finalUserId, 'saved_games'));  
        const games = [];  
        querySnapshot.forEach((doc) => {  
            games.push(doc.data());  
        });  
        console.log(`✅ ${games.length} partidas cargadas desde Firebase`);  
        // Guardar en localStorage como caché  
        const localGames = {};  
        games.forEach(game => { localGames[game.id] = game; });  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return games;  
    } catch (error) {  
        console.error('❌ Error cargando partidas desde Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        // Fallback a localStorage  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        return Object.values(localGames);  
    }  
}  
  
async function loadGameFromCloud(userId, gameId) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, cargando desde localStorage');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        if (localGames[gameId]) {  
            return { success: true, data: localGames[gameId] };  
        }  
        return { success: false, message: 'Partida no encontrada' };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para loadGameFromCloud...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, message: 'No se pudo autenticar' };  
        }  
    }  
  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string' || !gameId || typeof gameId !== 'string') {  
        console.error('❌ Error: userId o gameId son inválidos para cargar partida');  
        return { success: false, message: 'Parámetros inválidos' };  
    }  
  
    try {  
        console.log(`📥 Cargando partida ${gameId} desde Firebase para usuario ${finalUserId}...`);  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        const docRef = doc(db, 'users', finalUserId, 'saved_games', gameId);  
        const docSnap = await getDoc(docRef);  
        if (docSnap.exists()) {  
            const gameData = docSnap.data();  
            console.log(`✅ Partida ${gameId} cargada desde Firebase`);  
            return { success: true, data: gameData };  
        } else {  
            console.log('⚠️ Partida no encontrada en Firebase');  
            return { success: false, message: 'Partida no encontrada en Firebase' };  
        }  
    } catch (error) {  
        console.error('❌ Error cargando partida desde Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
        return { success: false, error: error.message };  
    }  
}  
  
async function deleteGameFromCloud(userId, gameId) {  
    if (!firebaseConfig.enabled || !db) {  
        console.log('⚠️ Firebase no disponible, eliminando localmente');  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${userId}`) || '{}');  
        delete localGames[gameId];  
        localStorage.setItem(`user_games_${userId}`, JSON.stringify(localGames));  
        return { success: true };  
    }  
  
    // Esperar a que la autenticación esté lista antes de operar  
    if (!authReady) {  
        console.log('⏳ Esperando autenticación para deleteGameFromCloud...');  
        try {  
            await authReadyPromise;  
        } catch (error) {  
            console.error('❌ Error esperando autenticación:', error);  
            return { success: false, error: 'No se pudo autenticar' };  
        }  
    }  
  
    const finalUserId = userId || currentUserId;  
    if (!finalUserId || typeof finalUserId !== 'string' || !gameId || typeof gameId !== 'string') {  
        console.error('❌ Error: userId o gameId son inválidos para eliminar partida');  
        return { success: false, error: 'Parámetros inválidos' };  
    }  
  
    try {  
        console.log(`🗑️ Eliminando partida ${gameId} de Firebase para usuario ${finalUserId}...`);  
        if (!db) { // Añadir esta validación  
            console.error('❌ Firestore DB no está inicializado.');  
            return { success: false, error: 'Firestore DB no inicializado' };  
        }  
        await deleteDoc(doc(db, 'users', finalUserId, 'saved_games', gameId));  
        console.log(`✅ Partida ${gameId} eliminada de Firebase`);  
        // También eliminar localmente  
        const localGames = JSON.parse(localStorage.getItem(`user_games_${finalUserId}`) || '{}');  
        delete localGames[gameId];  
        localStorage.setItem(`user_games_${finalUserId}`, JSON.stringify(localGames));  
        return { success: true };  
    } catch (error) {  
        console.error('❌ Error eliminando partida de Firebase:', error);  
        console.error('Detalles:', error.code, error.message);  
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
  
// Exportar como módulos ES6  
export {  
    app,  
    auth,  
    db,    
    onAuthStateChanged,  
    saveTeamDataToFirebase,  
    getTeamDataFromFirebase,  
    getAllTeamsDataFromFirebase,  
    saveGameToCloud,  
    loadUserSavedGames,  
    loadGameFromCloud,  
    deleteGameFromCloud,  
    authReadyPromise,  
    firebaseConfig // Exportar firebaseConfig también  
};  
