// ============================================
// FIX FINAL REAL - Compatible con tu estructura
// ============================================

(function() {
    'use strict';
    
    console.log('🔧 [FIX FINAL REAL] Iniciando...');
    
    let checkCount = 0;
    const checkInterval = setInterval(function() {
        checkCount++;
        
        // Verificar que TODO esté disponible
        if (window.gameLogic && 
            window.ui && 
            window.ui.renderSquadList &&
            window.openPage) {
            
            clearInterval(checkInterval);
            console.log('✅ Sistemas detectados, aplicando en 1 segundo...');
            setTimeout(applyFixes, 1000);
            
        } else if (checkCount > 100) {
            clearInterval(checkInterval);
            console.error('❌ Timeout - Sistemas no disponibles');
        }
    }, 200);
    
    function applyFixes() {
        console.log('🔄 Aplicando correcciones...');
        
        // 1. Parchear plantilla
        patchSquad();
        
        // 2. Parchear venta
        patchSell();
        
        // 3. Ofertas
        patchWeek();
        
        // 4. Mercado
        if (!window.transferMarket) window.transferMarket = [];
        
        console.log('✅ [FIX FINAL REAL] Aplicado correctamente');
    }
    
    // ==========================================
    // PARCHEAR PLANTILLA
    // ==========================================
    function patchSquad() {
        const orig = window.ui.renderSquadList;
        
        window.ui.renderSquadList = function(squad, teamName) {
            const c = document.getElementById('squadList');
            if (!c) return;
            
            c.innerHTML = ''; // CRÍTICO
            
            const t = document.createElement('table');
            t.style.width = '100%';
            t.style.borderCollapse = 'collapse';
            
            t.innerHTML = `
                <thead>
                    <tr style="background: rgba(233, 69, 96, 0.3); border-bottom: 2px solid #e94560;">
                        <th style="padding: 10px; text-align: left; color: #fff;">Jugador</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Pos</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Media</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Estado</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Contrato</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Duración</th>
                        <th style="padding: 10px; text-align: right; color: #fff;">Salario</th>
                        <th style="padding: 10px; text-align: center; color: #fff;">Acciones</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            const tb = t.querySelector('tbody');
            
            squad.forEach((p, i) => {
                const r = document.createElement('tr');
                r.style.borderBottom = '1px solid rgba(233, 69, 96, 0.1)';
                
                // Estado
                let s = '<span style="color: #00ff00; font-weight: bold;">✅ Apto</span>';
                if (p.isInjured) s = `<span style="color: #ff0000; font-weight: bold;">❌ Lesión (${p.weeksOut || 0}sem)</span>`;
                else if (p.isSuspended) s = `<span style="color: #FFA500; font-weight: bold;">⛔ Sanción (${p.suspensionWeeks || 0})</span>`;
                
                if (p.yellowCards > 0) s += ` <span style="background: #FFD700; color: #000; padding: 3px 6px; border-radius: 3px;">🟨${p.yellowCards}</span>`;
                if (p.redCards > 0) s += ` <span style="background: #DC143C; color: #fff; padding: 3px 6px; border-radius: 3px;">🟥${p.redCards}</span>`;
                
                // Contrato
                const ct = p.contractType === 'loan' ? 'Cedido' : 'Propiedad';
                const cc = p.contractType === 'loan' ? '#4169E1' : '#00ff00';
                
                // Duración
                let d = '';
                if (p.contractType === 'loan') {
                    d = '<span style="color: #4169E1; font-weight: bold;">1 (Cesión)</span>';
                } else {
                    const y = p.contractYears || 0;
                    const col = y <= 1 ? '#ff0000' : (y <= 2 ? '#FFA500' : '#00ff00');
                    d = `<span style="color: ${col}; font-weight: bold;">${y}</span>`;
                }
                
                r.innerHTML = `
                    <td style="padding: 10px; color: #fff; font-weight: bold;">${p.name}</td>
                    <td style="padding: 10px; text-align: center; color: #fff;">${p.position}</td>
                    <td style="padding: 10px; text-align: center; color: #00ff00; font-weight: bold;">${p.overall || 65}</td>
                    <td style="padding: 10px; text-align: center;">${s}</td>
                    <td style="padding: 10px; text-align: center; color: ${cc}; font-weight: bold;">${ct}</td>
                    <td style="padding: 10px; text-align: center;">${d}</td>
                    <td style="padding: 10px; text-align: right; color: #fff; font-weight: bold;">${(p.salary || 0).toLocaleString('es-ES')}€</td>
                    <td style="padding: 10px; text-align: center;">
                        <button class="bt" style="background: #4169E1; color: #fff; border: none; padding: 8px; border-radius: 5px; cursor: pointer; margin: 2px;">💪</button>
                        <button class="bs" style="background: #FFA500; color: #fff; border: none; padding: 8px; border-radius: 5px; cursor: pointer; margin: 2px;">💰</button>
                        <button class="bf" style="background: #DC143C; color: #fff; border: none; padding: 8px; border-radius: 5px; cursor: pointer; margin: 2px;">⚠️</button>
                    </td>
                `;
                
                r.querySelector('.bt').onclick = () => { if (window.openTrainingModal) window.openTrainingModal(i); };
                r.querySelector('.bs').onclick = () => openTM(p);
                r.querySelector('.bf').onclick = () => fireP(p);
                
                tb.appendChild(r);
            });
            
            c.appendChild(t);
            console.log(`✅ Plantilla: ${squad.length} jugadores`);
        };
        
        console.log('✅ renderSquadList parcheado');
    }
    
    // ==========================================
    // PARCHEAR VENTA
    // ==========================================
    function patchSell() {
        window.sellPlayer = function(n) {
            const gs = window.gameLogic.getGameState();
            const p = gs.squad.find(x => x.name === n);
            if (p) openTM(p);
        };
        console.log('✅ sellPlayer parcheado');
    }
    
    function openTM(p) {
        const m = cM();
        const pr = Math.floor((p.overall || 65) * 2500);
        
        m.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #e94560; margin: 0 0 20px 0;">💰 ${p.name}</h2>
                <div style="background: rgba(233, 69, 96, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Media:</strong> ${p.overall || 65}</p>
                    <p style="margin: 5px 0;"><strong>Salario:</strong> ${(p.salary || 0).toLocaleString('es-ES')}€/sem</p>
                    <p style="margin: 5px 0;"><strong>Valor:</strong> ${pr.toLocaleString('es-ES')}€</p>
                </div>
                <button id="s" style="width: 100%; padding: 15px; background: #FFA500; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">💵 Venta</button>
                <button id="l" style="width: 100%; padding: 15px; background: #4169E1; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">🔄 Cesión</button>
                <button id="c" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
            </div>
        `;
        
        m.querySelector('#s').onclick = () => { m.remove(); openSM(p, pr); };
        m.querySelector('#l').onclick = () => { m.remove(); openLM(p); };
        m.querySelector('#c').onclick = () => m.remove();
    }
    
    function openSM(p, pr) {
        const m = cM();
        m.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #FFA500; margin: 0 0 20px 0;">💵 Vender - ${p.name}</h2>
                <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">Precio:</label>
                <input type="number" id="p" value="${pr}" min="1000" step="1000" style="width: 100%; padding: 12px; border-radius: 8px; background: #1a1a2e; color: #00ff00; border: 2px solid #e94560; font-size: 1.2em; margin-bottom: 20px;">
                <button id="ok" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">✅ OK</button>
                <button id="cc" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
            </div>
        `;
        m.querySelector('#ok').onclick = () => { listS(p, parseInt(m.querySelector('#p').value)); m.remove(); };
        m.querySelector('#cc').onclick = () => m.remove();
    }
    
    function openLM(p) {
        const m = cM();
        m.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #4169E1; margin: 0 0 20px 0;">🔄 Ceder - ${p.name}</h2>
                <label style="display: block; margin-bottom: 8px; color: #fff; font-weight: bold;">% salario:</label>
                <input type="range" id="sl" min="0" max="100" value="50" style="width: 100%; margin-bottom: 10px;">
                <div style="text-align: center; color: #00ff00; margin-bottom: 20px; font-size: 1.5em; font-weight: bold;"><span id="v">50</span>%</div>
                <button id="ok" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">✅ OK</button>
                <button id="cc" style="width: 100%; padding: 10px; background: #666; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Cancelar</button>
            </div>
        `;
        const sl = m.querySelector('#sl');
        const v = m.querySelector('#v');
        sl.oninput = () => v.textContent = sl.value;
        m.querySelector('#ok').onclick = () => { listL(p, parseInt(sl.value)); m.remove(); };
        m.querySelector('#cc').onclick = () => m.remove();
    }
    
    function listS(p, pr) {
        const gs = window.gameLogic.getGameState();
        window.transferMarket.push({ player: {...p}, type: 'sale', price: pr, listedWeek: gs.week });
        if (window.addNews) window.addNews(`📢 ${p.name} en venta por ${pr.toLocaleString('es-ES')}€`, 'info');
        alert(`✅ ${p.name} en venta`);
    }
    
    function listL(p, w) {
        const gs = window.gameLogic.getGameState();
        window.transferMarket.push({ player: {...p}, type: 'loan', wagePercent: w, listedWeek: gs.week });
        if (window.addNews) window.addNews(`📢 ${p.name} en cesión (pagas ${w}%)`, 'info');
        alert(`✅ ${p.name} en cesión`);
    }
    
    function fireP(p) {
        const gs = window.gameLogic.getGameState();
        const comp = (p.salary || 1000) * (p.contractWeeks || 52);
        if (!confirm(`⚠️ DESPEDIR ${p.name}\n\nIndemnización: ${comp.toLocaleString('es-ES')}€\n\n¿OK?`)) return;
        if (gs.balance < comp) { alert('❌ Sin dinero'); return; }
        gs.balance -= comp;
        const idx = gs.squad.findIndex(x => x.name === p.name);
        if (idx !== -1) gs.squad.splice(idx, 1);
        if (window.addNews) window.addNews(`⚠️ ${p.name} despedido. Indemnización: ${comp.toLocaleString('es-ES')}€`, 'warning');
        alert(`✅ ${p.name} despedido`);
        window.openPage('squad');
    }
    
    // ==========================================
    // OFERTAS
    // ==========================================
    function patchWeek() {
        const o = window.simulateWeek;
        if (!o) return;
        
        window.simulateWeek = function() {
            genO();
            return o.apply(this, arguments);
        };
        
        console.log('✅ simulateWeek parcheado');
    }
    
    function genO() {
        if (!window.transferMarket || window.transferMarket.length === 0) return;
        
        const gs = window.gameLogic.getGameState();
        const ts = ['Real Madrid', 'Atlético', 'Barcelona', 'Sevilla', 'Valencia'];
        
        window.transferMarket.forEach((l, i) => {
            const w = gs.week - l.listedWeek;
            if (Math.random() < Math.min(0.3 + w * 0.1, 0.7)) {
                const t = ts[Math.floor(Math.random() * ts.length)];
                const o = Math.floor(l.price * (0.7 + Math.random() * 0.4));
                
                if (window.addNews) window.addNews(`📨 OFERTA: ${t} ofrece ${o.toLocaleString('es-ES')}€ por ${l.player.name}`, 'info');
                
                setTimeout(() => showO(l, i, t, o), 500);
            }
        });
    }
    
    function showO(l, i, t, o) {
        const m = cM();
        m.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%); padding: 30px; border-radius: 15px; border: 2px solid #e94560; max-width: 500px; width: 90%;">
                <h2 style="color: #00ff00; margin: 0 0 20px 0; text-align: center;">📨 Oferta</h2>
                <div style="background: rgba(233, 69, 96, 0.1); padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                    <p><strong>${t}</strong> quiere</p>
                    <p style="font-size: 1.3em; color: #00ff00; font-weight: bold;">${l.player.name}</p>
                    <p style="font-size: 2em; color: #00ff00; font-weight: bold;">${o.toLocaleString('es-ES')}€</p>
                    <p style="color: #aaa;">Pedías: ${l.price.toLocaleString('es-ES')}€</p>
                </div>
                <button id="a" style="width: 100%; padding: 15px; background: #00ff00; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">✅ Aceptar</button>
                <button id="r" style="width: 100%; padding: 15px; background: #c73446; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">❌ Rechazar</button>
            </div>
        `;
        m.querySelector('#a').onclick = () => { acc(l, i, o); m.remove(); };
        m.querySelector('#r').onclick = () => { if (window.addNews) window.addNews(`❌ Oferta rechazada`, 'info'); m.remove(); };
    }
    
    function acc(l, i, o) {
        const gs = window.gameLogic.getGameState();
        gs.balance += o;
        const pi = gs.squad.findIndex(x => x.name === l.player.name);
        if (pi !== -1) gs.squad.splice(pi, 1);
        window.transferMarket.splice(i, 1);
        if (window.addNews) window.addNews(`✅ ${l.player.name} vendido por ${o.toLocaleString('es-ES')}€!`, 'success');
        alert(`✅ Vendido!\n${l.player.name} por ${o.toLocaleString('es-ES')}€`);
        if (window.ui?.refreshUI) window.ui.refreshUI(gs);
    }
    
    function cM() {
        const m = document.createElement('div');
        m.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);align-items:center;justify-content:center;z-index:10000;';
        document.body.appendChild(m);
        return m;
    }
    
})();
