(function(){
    'use strict';
    window.pcfExportBackup=function(){
        if(window.isSimulatingWeek?.())return alert('Espera a que termine la jornada antes de exportar.');
        const state=window.gameLogic?.getGameState();
        if(!state?.team)return alert('Carga o inicia una partida antes de exportar.');
        const blob=new Blob([JSON.stringify({format:'pcf-backup-v1',savedAt:Date.now(),gameState:state})],{type:'application/json'});
        const url=URL.createObjectURL(blob),link=document.createElement('a');
        link.href=url;link.download='PCFutbol_copia_'+new Date().toISOString().slice(0,10)+'.json';
        document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    window.pcfImportBackup=function(){
        if(window.isSimulatingWeek?.())return alert('Espera a que termine la jornada antes de importar.');
        const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
        input.onchange=async()=>{
            const file=input.files?.[0];if(!file)return;
            if(file.size>32*1024*1024)return alert('La copia supera el tamaño admitido (32 MB).');
            let before;
            try{
                const {validateBackup}=await import('./backup-format.js');
                const state=validateBackup(JSON.parse(await file.text()));
                if(!await window.pcfConfirmText('¿Importar esta copia? Sustituirá la partida que tienes abierta. Puedes exportarla antes para conservarla.'))return;
                if(window.isSimulatingWeek?.())throw new Error('Hay una jornada en curso.');
                before=window.gameLogic.getGameState();
                // Imported copies are independent saves; never overwrite an unseen cloud revision.
                state.gameId='import_'+crypto.randomUUID();
                window.gameLogic.replaceGameState(state);
                await window.pcfWorld?.ensure();window.pcfWorld?.assert();
                window.ui?.refreshUI(window.gameLogic.getViewState());
                document.getElementById('savedGamesModal')?.classList.remove('active');
                alert('Copia importada. Guarda la partida para sincronizarla con la nube.');
            }catch(error){
                if(before){window.gameLogic.replaceGameState(before);window.ui?.refreshUI(window.gameLogic.getViewState());}
                alert('No se ha importado la copia: '+error.message);
            }
        };
        input.click();
    };
    function showSaveActions(saveCloud){
        if(window.isSimulatingWeek?.())return alert('Espera a que termine la jornada antes de guardar.');
        let modal=document.getElementById('pcfSaveActionsModal');
        if(!modal){
            modal=document.createElement('div');modal.id='pcfSaveActionsModal';modal.className='modal';
            modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Guardar partida');
            const panel=document.createElement('div');panel.className='modal-content';panel.style.maxWidth='420px';
            const title=document.createElement('h2');title.textContent='Guardar partida';panel.appendChild(title);
            const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap;align-items:center';
            const close=()=>modal.classList.remove('active');
            for(const [label,run] of [['Guardar en la nube',()=>saveCloud.call(window)],['Exportar copia',()=>window.pcfExportBackup()],['Cancelar',()=>{}]]){
                const button=document.createElement('button');button.type='button';button.className='btn btn-sm';button.textContent=label;
                button.addEventListener('click',async()=>{close();try{await run();}catch(error){alert('No se ha podido completar la acción: '+error.message);}});
                actions.appendChild(button);
            }
            panel.appendChild(actions);modal.appendChild(panel);modal.addEventListener('click',event=>{if(event.target===modal)close();});
            modal.addEventListener('keydown',event=>{if(event.key==='Escape')close();});document.body.appendChild(modal);
        }
        modal.classList.add('active');modal.querySelector('button')?.focus();
    }
    function install(){
        if(typeof window.saveCurrentGame!=='function' || typeof window.openSavedGamesModal!=='function'){setTimeout(install,100);return;}
        if(window.saveCurrentGame._pcfSaveActions)return;
        const saveCloud=window.saveCurrentGame;
        window.saveCurrentGame=()=>showSaveActions(saveCloud);
        window.saveCurrentGame._pcfSaveActions=true;
        // Keep the original main buttons and their styles. Extra actions belong in dialogs.
        window.openSettingsPage=()=>window.openSavedGamesModal();
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
