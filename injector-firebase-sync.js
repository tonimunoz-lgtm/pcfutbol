// injector-firebase-sync.js  
import { TEAM_CUSTOM_DATA } from './teamData.js'; // <-- Importación correcta de TEAM_CUSTOM_DATA  
  
(function() {  
    console.log('🔥 Firebase Sync Injector cargando...');  
  
    // Función para obtener los datos por defecto específicos de un equipo  
    function getDefaultTeamDataForTeam(teamName) {  
        // Utiliza TEAM_CUSTOM_DATA del archivo teamData.js como base  
        const customData = TEAM_CUSTOM_DATA[teamName];  
        return customData || { // Fallback si no hay customData para ese equipo  
            logo: null,  
            stadiumImage: null,  
            stadiumCapacity: 10000,  
            initialBudget: 5000000,  
            stadiumName: 'Estadio Municipal'  
        };  
    }  
  
    // =============================  
    // FUNCIONES EQUIPOS MEJORADAS  
    // =============================  
    async function getTeamDataFromFirebaseSafe(teamName) {  
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
        if (!isFirebaseEnabled || !window.firebaseDB) {  
            return { success: false, data: null };  
        }  
        try {  
            // Esperar a que la autenticación esté lista  
            if (window.authReadyPromise) {  
                await window.authReadyPromise;  
            }  
            const result = await window.getTeamDataFromFirebase(teamName);  
            if (result.success && result.data) {  
                return result;  
            }  
            // Si no hay datos en Firebase, inicializar con defaultTeamData para ese equipo  
            if (!result.data) {  
                console.log(`📝 Inicializando datos por defecto para ${teamName}`);  
                const teamSpecificDefault = getDefaultTeamDataForTeam(teamName); // Usar esta función  
                // Defaults stay local; only an explicit admin save writes catalog data.  
                return { success: true, data: teamSpecificDefault };  
            }  
            return { success: false, data: null };  
        } catch (error) {  
            console.error('❌ Error accediendo a Firebase para equipo:', error);  
            return { success: false, data: null };  
        }  
    }  
  
    // Función global para obtener datos del equipo  
    // Esta es la función principal que el juego (gameLogic, admin) debe llamar  
const teamCache = new Map();
const teamPending = new Map();
window.cacheTeamData = (name, data) => teamCache.set(name, structuredClone(data));
// Acceso síncrono a lo ya leído (la interfaz lo usa para los escudos si localStorage no los tiene)
window.getCachedTeamData = name => teamCache.get(name);
let catalogTask;
// ── Copia persistente del catálogo en este dispositivo (IndexedDB) ───────────────────────────────────────────────
// localStorage no sirve para esto: con 5 MB no caben ni la mitad de los equipos con su escudo. Con la copia, si la red va
// lenta o falla se usa el catálogo de la última vez en vez de generar plantillas locales sin escudos.
const IDB_NAME = 'pcf_catalog', IDB_STORE = 'kv';
function idbOpen() {
    return new Promise((resolve, reject) => {
        const r = indexedDB.open(IDB_NAME, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
}
async function idbLoad() {
    try {
        const db = await idbOpen();
        try { return await new Promise((resolve, reject) => { const q = db.transaction(IDB_STORE).objectStore(IDB_STORE).get('catalog'); q.onsuccess = () => resolve(q.result || null); q.onerror = () => reject(q.error); }); }
        finally { db.close(); }
    } catch (e) { return null; }
}
async function idbSave(data) {
    try {
        const db = await idbOpen();
        try { await new Promise((resolve, reject) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).put(data, 'catalog'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }
        finally { db.close(); }
    } catch (e) { /* sin IndexedDB: se sigue sin copia */ }
}
window.__pcfCatalogIDB = { load: idbLoad, save: idbSave };
// Tiempo máximo de espera al catálogo: corto si hay copia guardada (se usa esa), largo si no hay nada con lo que seguir.
const catalogLimits = () => window.pcfCatalogLimits || { withCache: 6000, noCache: 25000 };
// One catalog read per session; no default writes from ordinary players.
window.preloadTeamCatalog = function({retry=false, quiet=false}={}) {
    if (catalogTask && !retry) return catalogTask;
    catalogTask = (async () => {
        const cached = await idbLoad();
        const limit = cached ? catalogLimits().withCache : catalogLimits().noCache;
        const request = (async () => {
            // Firebase habilitado pero aún sin inicializar (arranque): se espera un poco en vez de dar el catálogo por perdido,
            // porque el resultado «sin conexión» se queda guardado para toda la sesión.
            if (window.firebaseConfig?.enabled && !window.firebaseDB) { for (let i = 0; i < 20 && !window.firebaseDB; i++) await new Promise(r => setTimeout(r, 250)); }
            if (!window.firebaseConfig?.enabled || !window.firebaseDB) return false;
            await window.authReadyPromise;
            // Catálogo versionado: si la versión no ha cambiado (y la copia tiene <24 h) se usa la copia sin releer todos los equipos
            let remoteVersion = null;
            try { remoteVersion = await window.getCatalogVersionFromFirebase?.(); } catch (_) {}
            if (cached && remoteVersion != null) {
                let meta = null; try { meta = JSON.parse(localStorage.getItem('pcf_catalog_meta') || 'null'); } catch (_) {}
                if (meta && meta.version === remoteVersion && Date.now() - meta.ts < 24 * 3600 * 1000) { window.__pcfCatalogVersion = remoteVersion; return cached; }
            }
            window.__pcfCatalogVersion = remoteVersion;
            const result = await window.getAllTeamsDataFromFirebase();
            if (!result.success) throw new Error(result.error || 'Catálogo no disponible');
            return result.data;
        })();
        // Llegue cuando llegue (aunque sea después del límite): memoria y copia del dispositivo se actualizan y la sesión deja de estar «sin catálogo»
        request.then(data => {
            if (!data) return;
            for (const [name, value] of Object.entries(data)) teamCache.set(name, value);
            window.pcfCatalogOffline = false; window.pcfCatalogFromCache = false;
            catalogTask = Promise.resolve(true);
            try { setTimeout(() => window.pcfSyncNationalities?.(), 300); } catch (_) {}      // las nacionalidades del admin se aplican a la partida en curso
            if (data !== cached) {
                idbSave(data);
                try { localStorage.setItem('pcf_catalog_meta', JSON.stringify({ version: window.__pcfCatalogVersion ?? null, ts: Date.now() })); } catch (_) {}
            }
        }).catch(() => {});
        let timer, slowNotice;
        if (!quiet) slowNotice = setTimeout(() => window.pcfToast?.('Cargando el catálogo de equipos… la conexión va lenta', { type: 'info', duration: 7000 }), 1500);
        try {
            const data = await Promise.race([request, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`El catálogo ha tardado más de ${Math.round(limit / 1000)} segundos`)), limit); })]);
            window.pcfCatalogOffline = !data;
            if (data) for (const [name, value] of Object.entries(data)) teamCache.set(name, value);
            return !!data;
        } catch (error) {
            if (cached) {                                    // red lenta o caída: se usa la copia guardada en este dispositivo
                for (const [name, value] of Object.entries(cached)) if (!teamCache.has(name)) teamCache.set(name, value);
                window.pcfCatalogOffline = false; window.pcfCatalogFromCache = true;
                console.warn('Catálogo: la red va lenta, se usa la copia guardada en este dispositivo', error.message);
                return true;
            }
            window.pcfCatalogOffline = true;
            console.warn('Catálogo: se usan datos locales', error);
            return false;
        } finally { clearTimeout(timer); clearTimeout(slowNotice); }
    })();
    return catalogTask;
};
// Al CARGAR una partida guardada no se pasa por la selección de equipo, que es lo que traía el catálogo (con los escudos):
// en una partida cargada los escudos dependían de lo que hubiera quedado en localStorage de sesiones anteriores, y la
// protección de almacenamiento lo vacía si la copia local de la partida no cabe. Se trae aquí, en segundo plano, y se repinta.
function preloadAfterLoad(tries = 0) {
    const st = window.gameLogic?.getGameState?.();
    if (!st || !st.team) return;                    // sin partida activa (arranque, pantalla de inicio): no se toca el catálogo
    if (!window.firebaseConfig?.enabled || !window.firebaseDB) { if (tries < 40) setTimeout(() => preloadAfterLoad(tries + 1), 500); return; }
    Promise.resolve(window.preloadTeamCatalog?.({ retry: !!window.pcfCatalogOffline, quiet: true }))
        .then(() => setTimeout(() => { try { window.ui?.refreshUI?.(window.gameLogic?.getViewState?.()); } catch (e) { /* */ } }, 300))
        .catch(() => {});
}
window.addEventListener('pcf:state-replaced', () => setTimeout(() => preloadAfterLoad(0), 300));
window.getTeamData = function(teamName) {
    if (teamCache.has(teamName)) return Promise.resolve(structuredClone(teamCache.get(teamName)));
    if (teamPending.has(teamName)) return teamPending.get(teamName).then(structuredClone);
    const task = (async () => {
        const catalogLoaded = await window.preloadTeamCatalog();
        if (teamCache.has(teamName)) return teamCache.get(teamName);
        let data;
        try { data = JSON.parse(localStorage.getItem(`team_data_${teamName}`) || 'null'); } catch (_) {}
        data = data || getDefaultTeamDataForTeam(teamName);
        teamCache.set(teamName, data);
        return data;
    })();
    teamPending.set(teamName, task);
    return task.finally(() => teamPending.delete(teamName)).then(structuredClone);
};

 
  
    // Función global para guardar datos del equipo (llamada desde admin panel)  
    window.saveTeamData = async function(teamName, teamData) {  
        // Siempre guardar en localStorage primero (sincrónico)  
        teamCache.set(teamName, structuredClone(teamData));
        try { localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData)); } catch (_) {}  
        console.log(`💾 Datos guardados en localStorage para ${teamName}`);  
  
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
        if (isFirebaseEnabled && window.firebaseDB) {  
            try {  
                // Esperar a que la autenticación esté lista  
                if (window.authReadyPromise) {  
                    await window.authReadyPromise;  
                }  
                const result = await window.saveTeamDataToFirebase(teamName, teamData);  
                if (result.success) {  
                    console.log(`✅ Datos guardados en Firebase para ${teamName}`);  
                    return { success: true };  
                } else {  
                    console.warn('⚠️ Error guardando en Firebase, datos guardados solo localmente', result.error);  
                    return { success: false, error: result.error };  
                }  
            } catch (error) {  
                console.warn('⚠️ Error guardando en Firebase:', error);  
                return { success: false, error: error.message };  
            }  
        }  
        return { success: true, message: 'Guardado en localStorage (Firebase deshabilitado)' };  
    };  
      
    // Global function to get all team data (used by admin panel export)  
    window.getAllTeamsData = async function() {  
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
        if (isFirebaseEnabled && window.firebaseDB) {  
            try {  
                await window.authReadyPromise;  
                const result = await window.getAllTeamsDataFromFirebase();  
                if (result.success) {  
                    return result.data;  
                }  
            } catch (error) {  
                console.warn('⚠️ Error al cargar todos los datos de equipos desde Firebase:', error);  
            }  
        }  
        // Fallback a cargar desde localStorage si Firebase no está disponible o falla  
        const allData = {};  
        Object.keys(localStorage).forEach(key => {  
            if (key.startsWith('team_data_')) {  
                const teamName = key.replace('team_data_', '');  
                try {  
                    allData[teamName] = JSON.parse(localStorage.getItem(key));  
                } catch (error) {  
                    console.error(`Error parseando datos de ${teamName} desde localStorage:`, error);  
                }  
            }  
        });  
        return allData;  
    };  
  
  
    // =============================  
    // PRECARGA DE EQUIPOS DESDE FIREBASE  
    // =============================  
    async function preloadTeamsFromFirebase() {  
        const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
        if (!isFirebaseEnabled || !window.firebaseDB) {  
            console.log('⚠️ Firebase no disponible para precarga de equipos');  
            return;  
        }  
        try {  
            // Esperar a que la autenticación esté lista  
            if (window.authReadyPromise) {  
                console.log('⏳ Esperando autenticación para precargar equipos...');  
                await window.authReadyPromise;  
            }  
            console.log('📥 Precargando equipos desde Firebase...');  
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const querySnapshot = await getDocs(collection(window.firebaseDB, 'teams_data'));  
            let count = 0;  
            querySnapshot.forEach(docSnap => {  
                const teamData = docSnap.data();  
                localStorage.setItem(`team_data_${docSnap.id}`, JSON.stringify(teamData));  
                count++;  
            });  
            console.log(`✅ ${count} equipos precargados desde Firebase`);  
        } catch (error) {  
            console.warn('⚠️ Error precargando equipos desde Firebase:', error);  
        }  
    }  
  
    // =============================  
    // AUTENTICACIÓN Y LISTENERS  
    // =============================  
    const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
    if (isFirebaseEnabled && window.firebaseAuth) {  
        // Este onAuthStateChanged ya está en firebase-config.js.  
        // Es mejor dejar que firebase-config.js maneje el estado de currentUserId y authReady  
        // y este injector solo reaccione a ello si es necesario,  
        // o que firebase-config.js llame a preloadTeamsFromFirebase.  
        // He eliminado el listener duplicado aquí para evitar efectos secundarios.  
        // preloadTeamsFromFirebase ahora se llamará desde firebase-config.js  
    } else if (isFirebaseEnabled) {  
        console.warn('⚠️ window.firebaseAuth no disponible en injector-firebase-sync');  
    }  
  
    // =============================  
    // INICIALIZACIÓN  
    // =============================  
    window.addEventListener('DOMContentLoaded', () => {  
        // El estado del botón de guardar es gestionado por firebase-config.js  
        // cuando onAuthStateChanged se dispara.  
        console.log('✓ Firebase Sync Injector cargado correctamente');  
    });  
})();  
