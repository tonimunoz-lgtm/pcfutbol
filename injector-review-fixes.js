// UI actions for the review patch. Persistent data lives in gameState.
(function () {
    'use strict';
    const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    document.addEventListener('click', async e => {
        const button = e.target.closest('.youth-dismiss');
        if (!button) return;
        const name = decodeURIComponent(button.dataset.player);
        const ok = window.pcfConfirm ? await window.pcfConfirm('Despedir canterano', `¿Dar la baja a ${name}? No recibirás ingresos por la salida.`) : confirm(`¿Dar la baja a ${name}?`);
        if (!ok) return;
        const state = window.gameLogic.getGameState();
        state.academy = (state.academy || []).filter(p => p.name !== name);
        window.gameLogic.updateGameState(state);
        window.gameLogic.addNews(`Cantera: ${name} ha recibido la baja.`, 'info');
        window.ui?.refreshUI(state);
    });
    window.negotiateBoardObjective = function(state, rank, count) {
        const label = target => target === 1 ? 'Ganar la liga' : target <= 2 && state.division !== 'primera' ? 'Luchar por el ascenso directo (top 2)' :
            target <= 6 && state.division !== 'primera' ? `Entrar en la zona alta: puesto ${target}º o mejor` :
            target <= Math.ceil(count / 2) ? `Terminar en la primera mitad (top ${target})` :
            target <= count - (state.division === 'segunda' ? 4 : 3) ? `Asegurar la permanencia: puesto ${target}º o mejor` :
            target === count ? 'Evitar quedar descolgado: competir hasta el final' : `Evitar el último puesto: terminar ${target}º o mejor`;
        return new Promise(resolve => {
            const root = document.createElement('div');
            root.style.cssText = 'position:fixed;inset:0;z-index:290000;background:#000b;display:grid;place-items:center;padding:20px';
            const proposed = state.boardTarget;
            const relaxed = Math.min(count, proposed + Math.max(1, Math.round(count / 10)));
            root.innerHTML = `<section style="max-width:560px;background:#10274a;color:white;padding:24px;border:1px solid #ffd700;border-radius:8px"><h2>Objetivos con la directiva</h2><p>${esc(state.team)} · ${esc(state.currentSeason)}</p><p>Plantilla: ${rank}ª de ${count} por nivel.</p><p><b>Propuesta: ${esc(label(proposed))}</b></p><p>La confianza se evaluará según el puesto acordado, la dinámica de resultados y la economía.</p><button data-target="${proposed}" class="btn">Aceptar objetivo</button><button data-target="${relaxed}" class="btn">Contraoferta: ${esc(label(relaxed))}</button><p>La directiva admite esta rebaja moderada para dar margen al proyecto.</p></section>`;
            root.querySelectorAll('[data-target]').forEach(b => b.onclick = () => {
                state.boardTarget = Number(b.dataset.target); state.boardObjectiveLabel = label(state.boardTarget);
                root.remove(); resolve();
            });
            document.body.appendChild(root);
        });
    };
})();
