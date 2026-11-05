// injector-firebase-sync.js  
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';  
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
let catalogTask;
// One catalog read per session; no default writes from ordinary players.
window.preloadTeamCatalog = function({retry=false}={}) {
    if (catalogTask && !retry) return catalogTask;
    let timeout;
    const request=(async()=>{
        if(!window.firebaseConfig?.enabled || !window.firebaseDB) return false;
        await window.authReadyPromise;
        const result=await window.getAllTeamsDataFromFirebase();
        if(!result.success) throw new Error(result.error||'Catálogo no disponible');
        return result.data;
    })();
    catalogTask=Promise.race([request,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('El catálogo ha tardado más de 6 segundos')),6000);})])
        .then(data=>{
            window.pcfCatalogOffline=!data;
            if(data)for(const [name,value] of Object.entries(data))teamCache.set(name,value);
            return !!data;
        }).catch(error=>{window.pcfCatalogOffline=true;console.warn('Catálogo: se usan datos locales',error);return false;})
        .finally(()=>clearTimeout(timeout));
    return catalogTask;
};
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
