// injector-match-summary.js - Resumen profesional de partido

window.injectMatchSummary = function(matchResult) {
    console.log('📊 injectMatchSummary llamado con:', matchResult);
    
    if (!matchResult) {
        console.error('❌ matchResult es null o undefined');
        return;
    }

    const homeTeam = matchResult.home;
    const awayTeam = matchResult.away;
    const homeGoals = matchResult.homeGoals;
    const awayGoals = matchResult.awayGoals;

    console.log(`⚽ Partido: ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}`);

    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'matchSummaryModal';
    
    modal.innerHTML = `
        <div class="match-container">
            <h1>⚽ RESULTADO DEL PARTIDO</h1>
            
            <div class="match-score">
                <div class="team-info">
                    <div class="team-name">${homeTeam}</div>
                    <div class="team-score">${homeGoals}</div>
                </div>
                
                <div class="score-separator">-</div>
                
                <div class="team-info">
                    <div class="team-name">${awayTeam}</div>
                    <div class="team-score">${awayGoals}</div>
                </div>
            </div>
            
            <button class="btn-continue" onclick="this.closest('#matchSummaryModal').remove()">
                ✅ Continuar
            </button>
        </div>
    `;
    
    // Añadir al DOM
    document.body.appendChild(modal);
    console.log('✅ Modal añadido al DOM');
    
    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
        const existingModal = document.getElementById('matchSummaryModal');
        if (existingModal) {
            existingModal.remove();
            console.log('⏱️ Modal cerrado automáticamente');
        }
    }, 10000);
};

console.log('✅ injector-match-summary.js cargado correctamente');
