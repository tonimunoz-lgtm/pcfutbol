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
                <div class="modal-content">  
                    <span class="close-button" onclick="window.closeModal('adminModal')">&times;</span>  
                    <h1>⚙️ Panel de Administración</h1>  
  
                    <h2>Seleccionar Equipo</h2>  
                    <label for="adminDivisionSelect">División:</label>  
                    <select id="adminDivisionSelect" onchange="window.adminBackend.loadTeamsFromDivision()">  
                        <option value="">-- Selecciona una división --</option>  
                        <option value="primera">Primera División</option>  
                        <option value="segunda">Segunda División</option>  
                        <option value="rfef_grupo1">Primera RFEF Grupo 1</option>  
                        <option value="rfef_grupo2">Primera RFEF Grupo 2</option>  
                    </select>  
                    <label for="adminTeamSelect">Equipo:</label>  
                    <select id="adminTeamSelect" onchange="window.adminBackend.loadTeamData()">  
                        <option value="">-- Selecciona un equipo --</option>  
                    </select>  
  
                    <div id="adminTeamDataContainer" style="display: none; margin-top: 20px;">  
                        <h3>Datos del Equipo: <span id="adminCurrentTeamName"></span></h3>  
  
                        <h4>🏟️ Estadio</h4>  
                        <label for="adminStadiumName">Nombre del estadio:</label>  
                        <input type="text" id="adminStadiumName">  
                        <label for="adminStadiumCapacity">Capacidad:</label>  
                        <input type="number" id="adminStadiumCapacity" min="1000">  
                        <label for="adminStadiumImage">Foto del estadio (.png):</label>  
                        <input type="file" id="adminStadiumImage" accept="image/png, image/jpeg">  
                        <div id="adminStadiumPreview" style="margin-top: 10px; text-align: center;"></div>  
  
                        <h4>🛡️ Escudo</h4>  
                        <label for="adminTeamLogo">Escudo del equipo (.png):</label>  
                        <input type="file" id="adminTeamLogo" accept="image/png, image/jpeg">  
                        <div id="adminLogoPreview" style="margin-top: 10px; text-align: center;"></div>  
  
                        <h4>💰 Presupuesto Inicial</h4>  
                        <label for="adminInitialBudget">Presupuesto inicial (€):</label>  
                        <input type="number" id="adminInitialBudget" min="0">  
                        <p style="font-size: 0.8em;">Este será el presupuesto al iniciar con este equipo</p>  
  
                        <button class="btn btn-primary" onclick="window.adminBackend.saveTeamData()">💾 Guardar Datos</button>  
                    </div>  
  
                    <hr>  
                    <h2>Herramientas de Datos Globales</h2>  
                    <button class="btn btn-secondary" onclick="window.adminBackend.exportAllData()">📤 Exportar Todos los Datos (JSON)</button>  
                    <input type="file" id="importFileInput" accept=".json" style="display: none;" onchange="window.adminBackend.importAllData(event)">  
                    <button class="btn btn-secondary" onclick="document.getElementById('importFileInput').click()">📥 Importar Datos (JSON)</button>  
                      
                    <button class="btn btn-danger" onclick="window.closeModal('adminModal')">Cerrar</button>  
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
            teamSelect.innerHTML = '<option value="">-- Selecciona un equipo --</option>' + teams.map(team => `<option value="${team}">${team}</option>`).join('');  
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
            const logoPreview = document.getElementById('adminLogoPreview');  
            if (teamData.logo) {  
                logoPreview.innerHTML = ` <img src="${teamData.logo}" alt="Escudo" style="max-width: 100px; max-height: 100px;"> `;  
            } else {  
                logoPreview.innerHTML = 'No hay escudo cargado';  
            }  
  
            const stadiumPreview = document.getElementById('adminStadiumPreview');  
            if (teamData.stadiumImage) {  
                stadiumPreview.innerHTML = ` <img src="${teamData.stadiumImage}" alt="Estadio" style="max-width: 200px; max-height: 100px;"> `;  
            } else {  
                stadiumPreview.innerHTML = 'No hay foto del estadio';  
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
  
            // Cargar datos existentes para mantener los logos/imágenes si no se actualizan  
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
                      `🖼️ Foto estadio: ${teamData.stadiumImage ? 'Sí' : 'No'}`);  
                this.loadTeamData(); // Recargar datos para actualizar las previews  
            } else {  
                alert(`❌ Error al guardar en Firebase: ${saveResult.error}\n\nLos datos se guardaron localmente, pero no se sincronizaron.`);  
            }  
        },  
  
        // Modificar exportAllData:  
        exportAllData: async function() {  
            const allData = await window.getAllTeamsData(); // Usa la función global  
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
                    // Guardar todos los datos en Firebase (a través de la función global)  
                    const promises = Object.keys(data).map(teamName => window.saveTeamData(teamName, data[teamName]));  
                    await Promise.all(promises);  
                    alert(`✅ Datos importados correctamente a Firebase para ${Object.keys(data).length} equipos`);  
                    if (this.currentTeam) { // Si hay un equipo seleccionado, recargar sus datos  
                        await this.loadTeamData();  
                    }  
                } catch (error) {  
                    alert('❌ Error al importar los datos: ' + error.message);  
                }  
            };  
            reader.readAsText(file);  
            event.target.value = ''; // Limpiar el input file  
        }  
    }; // <-- Este es el cierre del objeto window.adminBackend  
  
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
                // Insertar al inicio de headerInfo (o donde esté el userIndicator si existe)  
                const userIndicator = document.getElementById('userIndicator');  
                if (userIndicator) {  
                    headerInfo.insertBefore(adminBtn, userIndicator.nextSibling);  
                } else {  
                    headerInfo.appendChild(adminBtn);  
                }  
            }  
        }, 1000);  
    });  
})();  
