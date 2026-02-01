// injector-firebase-sync.js  
// Este archivo YA NO define getTeamData ni saveTeamData
// Esas funciones están en teamData.js y se exponen globalmente
// Este archivo solo se encarga de precargar datos al inicio

(function() {  
    console.log('🔥 Firebase Sync Injector cargando...');  
  
    // =============================  
    // PRECARGA DE EQUIPOS DESDE FIREBASE AL INICIAR
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
            
            console.log('🔥 Precargando equipos desde Firebase...');  
            
            // Usar la función global que ya existe en teamData.js
            if (window.loadAllTeamData) {
                const allData = await window.loadAllTeamData();
                const count = Object.keys(allData).length;
                console.log(`✅ ${count} equipos precargados desde Firebase`);
            } else {
                console.warn('⚠️ window.loadAllTeamData no está disponible');
            }
        } catch (error) {  
            console.warn('⚠️ Error precargando equipos desde Firebase:', error);  
        }  
    }  
  
    // =============================  
    // INICIALIZACIÓN  
    // =============================  
    window.addEventListener('DOMContentLoaded', () => {  
        // Esperar a que Firebase esté listo antes de precargar
        if (window.authReadyPromise) {
            window.authReadyPromise.then(() => {
                // Pequeño delay para asegurar que todo esté listo
                setTimeout(() => {
                    preloadTeamsFromFirebase();
                }, 1000);
            }).catch(err => {
                console.warn('⚠️ Error en autenticación, no se precargarán equipos:', err);
            });
        } else {
            // Si no hay promesa de autenticación, intentar precargar después de un delay
            setTimeout(() => {
                preloadTeamsFromFirebase();
            }, 3000);
        }
        
        console.log('✅ Firebase Sync Injector cargado correctamente');  
    });  
})();
