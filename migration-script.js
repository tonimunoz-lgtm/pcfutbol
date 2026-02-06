// migration-script.js

async function migrateLocalStorageToFirebase() {
    if (!window.currentUserId) {
        alert('Debes iniciar sesión primero');
        return;
    }
    
    console.log('🔄 Iniciando migración...');
    
    // 1. Migrar gameState
    const gameStateStr = localStorage.getItem('gameState');
    if (gameStateStr) {
        const gameState = JSON.parse(gameStateStr);
        
        // Crear partida en Firebase
        const gameId = `game_${Date.now()}`;
        await window.saveGameToCloud(window.currentUserId, gameId, {
            id: gameId,
            name: `Partida ${gameState.team}`,
            team: gameState.team,
            division: gameState.division,
            week: gameState.week,
            gameState: gameState,
            lastSaved: Date.now()
        });
        
        console.log('✅ GameState migrado');
    }
    
    // 2. Migrar datos de equipos
    const teamDataKeys = Object.keys(localStorage).filter(k => k.startsWith('team_data_'));
    
    for (const key of teamDataKeys) {
        const teamName = key.replace('team_data_', '');
        const teamData = JSON.parse(localStorage.getItem(key));
        
        // IMPORTANTE: Convertir base64 a Storage URLs
        if (teamData.logo && teamData.logo.startsWith('data:image')) {
            // Convertir base64 a Blob y subir
            const logoBlob = dataURLtoBlob(teamData.logo);
            const logoFile = new File([logoBlob], 'logo.png', { type: 'image/png' });
            const uploadResult = await window.uploadImageToFirebase(logoFile, `teams/${teamName}/logo.png`);
            if (uploadResult.success) {
                teamData.logoUrl = uploadResult.url;
                delete teamData.logo; // Eliminar base64
            }
        }
        
        if (teamData.stadiumImage && teamData.stadiumImage.startsWith('data:image')) {
            const stadiumBlob = dataURLtoBlob(teamData.stadiumImage);
            const stadiumFile = new File([stadiumBlob], 'stadium.png', { type: 'image/png' });
            const uploadResult = await window.uploadImageToFirebase(stadiumFile, `teams/${teamName}/stadium.png`);
            if (uploadResult.success) {
                teamData.stadiumImageUrl = uploadResult.url;
                delete teamData.stadiumImage; // Eliminar base64
            }
        }
        
        await window.saveTeamDataToFirebase(teamName, teamData);
        console.log(`✅ ${teamName} migrado`);
    }
    
    // 3. Migrar jugadores a la base de datos global
    if (gameState && gameState.squad) {
        for (const player of gameState.squad) {
            await window.PlayersDatabase.save(player);
        }
        console.log('✅ Jugadores migrados a base de datos global');
    }
    
    alert('✅ Migración completada!\n\nAhora puedes eliminar localStorage y usar solo Firebase.');
}

// Función auxiliar
function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

window.migrateToFirebase = migrateLocalStorageToFirebase;
