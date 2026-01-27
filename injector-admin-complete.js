// injector-admin-complete.js
(function() {
    const DIVISIONS = {
        'primera': 'Primera División',
        'segunda': 'Segunda División',
        'rfef_grupo1': 'Primera RFEF Grupo 1',
        'rfef_grupo2': 'Primera RFEF Grupo 2'
    };

    window.openAdminPanel = function() {
        if (!window.gameLogic) {
            alert('El juego aún no está cargado completamente');
            return;
        }

        // Crear modal si no existe
        if (!document.getElementById('adminModal')) {
            const modal = document.createElement('div');
            modal.id = 'adminModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                    <span class="modal-close" onclick="document.getElementById('adminModal').classList.remove('active')">&times;</span>
                    <h1 style="color: #e94560;">🔧 Panel de Administración</h1>
                    
                    <div style="margin-bottom: 30px;">
                        <h2>Seleccionar Equipo</h2>
                        <label>División:</label>
                        <select id="adminDivisionSelect" onchange="window.adminBackend.loadTeamsFromDivision()" style="margin-bottom: 10px;">
                            <option value="">-- Selecciona una división --</option>
                            <option value="primera">Primera División</option>
                            <option value="segunda">Segunda División</option>
                            <option value="rfef_grupo1">Primera RFEF Grupo 1</option>
                            <option value="rfef_grupo2">Primera RFEF Grupo 2</option>
                        </select>
                        
                        <label>Equipo:</label>
                        <select id="adminTeamSelect" onchange="window.adminBackend.loadTeamData()">
                            <option value="">-- Selecciona un equipo --</option>
                        </select>
                    </div>

                    <div id="adminTeamDataContainer" style="display: none;">
                        <h2>Datos del Equipo: <span id="adminCurrentTeamName"></span></h2>
                        
                        <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                            <h3>🏟️ Estadio</h3>
                            <div style="margin-bottom: 10px;">
                                <label>Nombre del estadio:</label>
                                <input id="adminStadiumName" type="text" placeholder="Ej: Santiago Bernabéu">
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label>Capacidad:</label>
                                <input id="adminStadiumCapacity" type="number" step="1000" min="1000">
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label>Foto del estadio (.png):</label>
                                <input id="adminStadiumImage" type="file" accept="image/png,image/jpeg">
                                <div id="adminStadiumPreview" style="margin-top: 10px;"></div>
                            </div>
                        </div>

                        <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                            <h3>🛡️ Escudo</h3>
                            <div style="margin-bottom: 10px;">
                                <label>Escudo del equipo (.png):</label>
                                <input id="adminTeamLogo" type="file" accept="image/png,image/jpeg">
                                <div id="adminLogoPreview" style="margin-top: 10px;"></div>
                            </div>
                        </div>

                        <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                            <h3>💰 Presupuesto Inicial</h3>
                            <div style="margin-bottom: 10px;">
                                <label>Presupuesto inicial (€):</label>
                                <input id="adminInitialBudget" type="number" step="1000000" min="0">
                                <small style="display: block; color: #999; margin-top: 5px;">Este será el presupuesto al iniciar con este equipo</small>
                            </div>
                        </div>

                        <div style="margin-top: 20px;">
                            <button class="btn" onclick="window.adminBackend.saveTeamData()">💾 Guardar Datos</button>
                            <button class="btn" style="background: #ff9500;" onclick="window.adminBackend.exportAllData()">📦 Exportar Todos los Datos</button>
                            <button class="btn" style="background: #00aa00;" onclick="document.getElementById('adminImportFile').click()">📥 Importar Datos</button>
                            <input type="file" id="adminImportFile" accept=".json" style="display: none;" onchange="window.adminBackend.importAllData(event)">
                        </div>
                    </div>

                    <button class="btn" style="background: #c73446; margin-top: 20px;" onclick="document.getElementById('adminModal').classList.remove('active')">Cerrar</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('adminModal').classList.add('active');
    };

    window.adminBackend = {
        currentTeam: null,
        currentDivision: null,

        loadTeamsFromDivision: function() {
            const divisionKey = document.getElementById('adminDivisionSelect').value;
            const teamSelect = document.getElementById('adminTeamSelect');
            
            if (!divisionKey) {
                teamSelect.innerHTML = '<option value="">-- Selecciona un equipo --</option>';
                document.getElementById('adminTeamDataContainer').style.display = 'none';
                return;
            }

            this.currentDivision = divisionKey;
            const teams = window.TEAMS_DATA[divisionKey] || [];
            
            teamSelect.innerHTML = '<option value="">-- Selecciona un equipo --</option>' + 
                teams.map(team => `<option value="${team}">${team}</option>`).join('');
            
            document.getElementById('adminTeamDataContainer').style.display = 'none';
        },

       // En injector-admin-complete.js, modificar loadTeamData:
loadTeamData: async function() {
    const teamName = document.getElementById('adminTeamSelect').value;
    if (!teamName) {
        document.getElementById('adminTeamDataContainer').style.display = 'none';
        return;
    }

    this.currentTeam = teamName;
    document.getElementById('adminCurrentTeamName').textContent = teamName;
    document.getElementById('adminTeamDataContainer').style.display = 'block';

    // Cargar datos usando la nueva función que busca en Firebase
    const teamData = await window.getTeamData(teamName);

    // Rellenar formulario
    document.getElementById('adminStadiumName').value = teamData.stadiumName || '';
    document.getElementById('adminStadiumCapacity').value = teamData.stadiumCapacity || 10000;
    document.getElementById('adminInitialBudget').value = teamData.initialBudget || 5000000;

    // Mostrar previews si existen
    if (teamData.logo) {
        document.getElementById('adminLogoPreview').innerHTML = 
            `<img src="${teamData.logo}" style="max-width: 100px; max-height: 100px; border: 2px solid #e94560; border-radius: 5px;">`;
    } else {
        document.getElementById('adminLogoPreview').innerHTML = '<p style="color: #999;">No hay escudo cargado</p>';
    }

    if (teamData.stadiumImage) {
        document.getElementById('adminStadiumPreview').innerHTML = 
            `<img src="${teamData.stadiumImage}" style="max-width: 200px; max-height: 150px; border: 2px solid #e94560; border-radius: 5px;">`;
    } else {
        document.getElementById('adminStadiumPreview').innerHTML = '<p style="color: #999;">No hay foto del estadio</p>';
    }
},

// Modificar saveTeamData:
saveTeamData: async function() {
    if (!this.currentTeam) {
        alert('Selecciona un equipo primero');
        return;
    }

    const logoFile = document.getElementById('adminTeamLogo').files[0];
    const stadiumFile = document.getElementById('adminStadiumImage').files[0];

    const teamData = {
        stadiumName: document.getElementById('adminStadiumName').value || 'Estadio Municipal',
        stadiumCapacity: parseInt(document.getElementById('adminStadiumCapacity').value) || 10000,
        initialBudget: parseInt(document.getElementById('adminInitialBudget').value) || 5000000,
        logo: null,
        stadiumImage: null
    };

    // Cargar datos existentes
    const existingData = await window.getTeamData(this.currentTeam);
    teamData.logo = existingData.logo;
    teamData.stadiumImage = existingData.stadiumImage;

    // Procesar archivos de imagen
    const promises = [];

    if (logoFile) {
        promises.push(
            new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    teamData.logo = e.target.result;
                    resolve();
                };
                reader.readAsDataURL(logoFile);
            })
        );
    }

    if (stadiumFile) {
        promises.push(
            new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    teamData.stadiumImage = e.target.result;
                    resolve();
                };
                reader.readAsDataURL(stadiumFile);
            })
        );
    }

    await Promise.all(promises);

    // Guardar en Firebase y localStorage
    const saveResult = await window.saveTeamData(this.currentTeam, teamData);
    
    if (saveResult.success) {
        // Actualizar el juego si es el equipo actual
        if (window.gameLogic) {
            const state = window.gameLogic.getGameState();
            if (state.team === this.currentTeam) {
                console.log('🔄 Actualizando datos del equipo actual en el juego...');
                state.teamLogo = teamData.logo;
                state.stadiumImage = teamData.stadiumImage;
                state.stadiumName = teamData.stadiumName;
                state.stadiumCapacity = teamData.stadiumCapacity;
                
                window.gameLogic.updateGameState(state);
                
                if (window.ui && window.ui.refreshUI) {
                    window.ui.refreshUI(state);
                }
            }
        }
        
        alert(`✅ Datos guardados en Firebase para ${this.currentTeam}:\n\n` +
              `🏟️ Estadio: ${teamData.stadiumName}\n` +
              `👥 Capacidad: ${teamData.stadiumCapacity.toLocaleString()}\n` +
              `💰 Presupuesto: ${teamData.initialBudget.toLocaleString()}€\n` +
              `🛡️ Escudo: ${teamData.logo ? 'Sí' : 'No'}\n` +
              `📷 Foto estadio: ${teamData.stadiumImage ? 'Sí' : 'No'}`);
        
        this.loadTeamData();
    } else {
        alert(`❌ Error al guardar en Firebase: ${saveResult.error}\n\nLos datos se guardaron localmente, pero no se sincronizaron.`);
    }
},

// Modificar exportAllData:
exportAllData: async function() {
    const allData = await window.getAllTeamsData();

    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `pcfutbol_teams_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    alert(`✅ Datos exportados correctamente (${Object.keys(allData).length} equipos)`);
},

// Modificar importAllData:
importAllData: async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Guardar todos los datos en Firebase
            const promises = Object.keys(data).map(teamName => 
                window.saveTeamData(teamName, data[teamName])
            );
            
            await Promise.all(promises);
            
            alert(`✅ Datos importados correctamente a Firebase para ${Object.keys(data).length} equipos`);
            
            if (this.currentTeam) {
                await this.loadTeamData();
            }
        } catch (error) {
            alert('❌ Error al importar los datos: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    event.target.value = '';


    // Auto-activar panel de admin al cargar (para testing)
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            // Añadir botón de admin al header
            const headerInfo = document.querySelector('.header-info');
            if (headerInfo && !document.getElementById('adminButton')) {
                const adminBtn = document.createElement('button');
                adminBtn.id = 'adminButton';
                adminBtn.className = 'btn btn-sm';
                adminBtn.innerHTML = '⚙️ Admin';
                adminBtn.onclick = () => window.openAdminPanel();
                adminBtn.style.background = '#ff9500';
                headerInfo.appendChild(adminBtn);
            }
        }, 1000);
    });
})();
