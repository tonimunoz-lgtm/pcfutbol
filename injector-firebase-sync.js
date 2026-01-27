// injector-firebase-sync.js  
// Importar funciones de Firestore necesarias para la precarga de equipos si db es una instancia v9  
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';  
  
(function() {  
    console.log('🔥 Firebase Sync Injector cargando...');  
  
    const isFirebaseEnabled = window.firebaseConfig && window.firebaseConfig.enabled;  
  
    const defaultTeamData = {  
        logo: null,  
        stadiumImage: null,  
        stadiumCapacity: 10000,  
        initialBudget: 5000000,  
        stadiumName: 'Estadio Municipal'  
    };  
  
    // =============================  
    // AUTENTICACIÓN ANÓNIMA  
    // =============================  
    // Asegurarse de que window.firebaseAuth esté disponible antes de usarlo  
    if (isFirebaseEnabled && window.firebaseAuth) {  
        // Podrías quitar esta llamada si ya la haces en firebase-config.js al iniciar la app  
        // window.firebaseAuth.signInAnonymously()  
        //    .then(() => console.log('✅ Usuario anónimo autenticado'))  
        //    .catch(err => console.error('❌ Error autenticando anónimo:', err));  
  
        window.firebaseAuth.onAuthStateChanged(async (user) => {  
            if (user) {  
                console.log('Usuario activo con UID:', user.uid);  
                window.currentUserId = user.uid; // ¡Este es crucial!  
  
                // Precargar todos los equipos desde Firebase  
                if (isFirebaseEnabled && window.firebaseDB) {  
                    try {  
                        // Usando la sintaxis modular (v9) para precargar equipos  
                        const querySnapshot = await getDocs(collection(window.firebaseDB, 'teams_data'));  
                        querySnapshot.forEach(docSnap => {  
                            localStorage.setItem(`team_data_${docSnap.id}`, JSON.stringify(docSnap.data()));  
                        });  
                        console.log(`✅ ${querySnapshot.size} equipos precargados desde Firebase`);  
                    } catch (error) {  
                        console.warn('⚠️ Error precargando equipos desde Firebase (en injector-firebase-sync), usando localStorage', error);  
                    }  
                }  
  
                // Habilitar botón Guardar  
                const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                if (saveBtn) saveBtn.disabled = false;  
            } else {  
                 console.log('Usuario no autenticado. El botón de guardar estará deshabilitado.');  
                 window.currentUserId = null;  
                 const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
                 if (saveBtn) saveBtn.disabled = true; // Asegurarse de deshabilitar si el usuario cierra sesión  
            }  
        });  
    } else if (isFirebaseEnabled) {  
        console.warn('⚠️ window.firebaseAuth no disponible, la autenticación y carga de equipos no funcionará.');  
    }  
  
  
    // =============================  
    // FUNCIONES EQUIPOS (se mantienen aquí si no quieres moverlas a firebase-config.js)  
    // =============================  
  
    // Notar que estas funciones ahora llamarán a las versiones que firebase-config.js expone globalmente  
    // O puedes optar por moverlas también a firebase-config.js y simplemente llamar a window.saveTeamDataToFirebase  
    // y window.getTeamDataFromFirebase. Por ahora, las mantengo aquí asumiendo que son específicas de este inyector.  
  
    async function getTeamDataFromFirebaseSafe(teamName) {  
        // Aquí no se usa window.firebaseDB.collection directamente sino las funciones globales o importadas  
        if (!isFirebaseEnabled || !window.firebaseDB) return { success: false, data: null };  
        try {  
            // Se asume que window.getTeamDataFromFirebase es una función de firebase-config.js  
            const result = await window.getTeamDataFromFirebase(teamName);   
            if (result.success && result.data) return result;  
  
            // Si no hay datos, inicializa con defaultTeamData y lo guarda  
            if (!result.data) {  
                await window.saveTeamDataToFirebase(teamName, defaultTeamData);  
                return { success: true, data: defaultTeamData };  
            }  
            return { success: false, data: null };  
  
        } catch (error) {  
            console.error('❌ Error accediendo a Firebase para equipo:', error);  
            return { success: false, data: null };  
        }  
    }  
  
  
    // Esta función llama a la versión globalmente expuesta por firebase-config.js  
    window.getTeamData = async function(teamName) {  
        console.log(`📥 Cargando datos para ${teamName}...`);  
        const firebaseResult = await getTeamDataFromFirebaseSafe(teamName);  
        if (firebaseResult.success && firebaseResult.data) {  
            console.log(`✅ Datos cargados desde Firebase para ${teamName}`);  
            localStorage.setItem(`team_data_${teamName}`, JSON.stringify(firebaseResult.data));  
            return firebaseResult.data;  
        }  
  
        const localData = localStorage.getItem(`team_data_${teamName}`);  
        if (localData) {  
            console.log(`📦 Datos cargados desde localStorage para ${teamName}`);  
            return JSON.parse(localData);  
        }  
  
        console.log(`⚠️ No hay datos en Firebase ni localStorage para ${teamName}, usando valores por defecto`);  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(defaultTeamData));  
        return defaultTeamData;  
    };  
  
    // Esta función llama a la versión globalmente expuesta por firebase-config.js  
    window.saveTeamData = async function(teamName, teamData) {  
        localStorage.setItem(`team_data_${teamName}`, JSON.stringify(teamData));  
        console.log(`💾 Datos guardados en localStorage para ${teamName}`);  
  
        if (isFirebaseEnabled && window.firebaseDB) {  
            // Llama a la función de firebase-config.js  
            const result = await window.saveTeamDataToFirebase(teamName, teamData);  
            if (result.success) {  
                console.log(`✅ Datos guardados en Firebase para ${teamName}`);  
                return { success: true };  
            } else {  
                console.warn('⚠️ Error guardando en Firebase, usando localStorage', result.error);  
                return { success: false, error: result.error };  
            }  
        }  
        return { success: true, message: 'Guardado en localStorage (Firebase deshabilitado)' };  
    };  
  
    // =============================  
    // FUNCIONES PARTIDAS (ELIMINADAS de aquí, se usa la versión de firebase-config.js)  
    // =============================  
    // Estas funciones ya no se definen aquí. Se asume que se llamará a  
    // window.saveGameToCloud, window.loadUserSavedGames, etc.,  
    // que están definidas en firebase-config.js.  
  
    // window.saveGameToCloud ya no se define aquí, se usa la de firebase-config.js  
    // window.loadUserSavedGames ya no se define aquí, se usa la de firebase-config.js  
    // window.loadGameFromCloud ya no se define aquí, se usa la de firebase-config.js  
    // window.deleteGameFromCloud ya no se define aquí, se usa la de firebase-config.js  
  
  
    // =============================  
    // BLOQUEO DEL BOTÓN GUARDAR HASTA UID  
    // =============================  
    window.addEventListener('DOMContentLoaded', () => {  
        const saveBtn = document.querySelector('button[onclick="window.saveCurrentGame()"]');  
        if (saveBtn) {  
            // Inicialmente deshabilitado hasta que haya un usuario autenticado  
            saveBtn.disabled = !window.currentUserId;   
        }  
  
        // El onAuthStateChanged de arriba ya se encarga de habilitar/deshabilitar  
        // Este listener DOMContentLoaded solo establece el estado inicial  
    });  
  
    console.log('✓ Firebase Sync Injector cargado correctamente');  
})();  
