// ============================================================
// injector-lineup-tap.js — "Modo cambio" táctil para la alineación.
// El arrastrar y soltar HTML5 no es fiable en pantallas táctiles (iOS) y los
// huecos no respondían al toque. Este módulo añade un botón: con el modo activo,
// se toca un jugador y luego otro jugador/hueco para intercambiarlos.
// Reutiliza window.drag / window.drop, así que conserva todas las validaciones
// (lesionados, sancionados, duplicados...). Con el modo apagado no cambia nada.
// ============================================================
(function () {
    'use strict';
    const MQ = '(pointer:coarse), (max-width:767px)';
    let active = false;
    let selected = null; // { name, from: 'pitch' | 'reserve', slotId }

    function injectStyles() {
        if (document.getElementById('pcfTapStyles')) return;
        const st = document.createElement('style');
        st.id = 'pcfTapStyles';
        st.textContent = `
        #pcfTapSwapBtn{display:block;width:100%;max-width:420px;margin:8px auto;min-height:44px;font-weight:700;cursor:pointer}
        #pcfTapSwapBtn.on{background:linear-gradient(180deg,#ffd700,#c99a00)!important;color:#000!important}
        body.pcf-tap-on #pitchContainer .pitch-player,body.pcf-tap-on #reservesList .draggable-player{cursor:pointer}
        .pcf-tap-selected{outline:3px solid #ffd700!important;box-shadow:0 0 12px 2px #ffd700!important;transform:scale(1.04)}
        body.pcf-tap-on #pitchContainer .pitch-position-placeholder{outline:1px dashed rgba(255,215,0,.6)}`;
        document.head.appendChild(st);
    }

    const state = () => window.gameLogic?.getViewState?.();
    const playerByName = name => (state()?.squad || []).find(p => p.name === name);
    const fakeEvent = target => ({ preventDefault() {}, stopPropagation() {}, currentTarget: target,
        dataTransfer: { setData() {}, effectAllowed: '' } });

    function move(player, targetEl, targetId) {
        // drag() fija el jugador arrastrado; drop() aplica el cambio y vuelve a pintar.
        window.drag(fakeEvent(targetEl), encodeURIComponent(JSON.stringify(player)));
        window.drop(fakeEvent(targetEl), targetId);
    }

    function clearSelection() {
        selected = null;
        document.querySelectorAll('.pcf-tap-selected').forEach(e => e.classList.remove('pcf-tap-selected'));
    }

    function refreshButton() {
        const msg = document.getElementById('lineupMessage');
        if (!msg) return;
        let btn = document.getElementById('pcfTapSwapBtn');
        if (!window.matchMedia(MQ).matches) { btn?.remove(); document.body.classList.remove('pcf-tap-on'); return; }
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'pcfTapSwapBtn';
            btn.type = 'button';
            btn.className = 'btn';
            btn.addEventListener('click', () => {
                active = !active;
                clearSelection();
                refreshButton();
            });
            msg.after(btn);
        }
        btn.classList.toggle('on', active);
        btn.textContent = active ? '✔ Modo cambio ACTIVO: toca dos jugadores' : '↔ Modo cambio (tocar en vez de arrastrar)';
        document.body.classList.toggle('pcf-tap-on', active);
    }

    function restoreSelection() {
        if (!selected) return;
        const sel = selected.from === 'pitch' ? '#pitchContainer .pitch-player' : '#reservesList .draggable-player';
        const el = [...document.querySelectorAll(sel)].find(e => e.dataset.playername === selected.name);
        if (el) el.classList.add('pcf-tap-selected'); else selected = null;
    }

    function onTap(ev) {
        if (!active) return;
        const t = ev.target;
        const pitchPlayer = t.closest?.('#pitchContainer .pitch-player');
        const slot = t.closest?.('#pitchContainer .pitch-position-placeholder');
        const reservePlayer = t.closest?.('#reservesList .draggable-player');
        const reservesArea = t.closest?.('#reservesList');
        if (!slot && !reservePlayer && !reservesArea) return;
        ev.preventDefault(); ev.stopPropagation(); // evita abrir la ficha mientras se intercambia

        const tapped = pitchPlayer || reservePlayer;
        const tappedName = tapped?.dataset.playername;
        const tappedFrom = pitchPlayer ? 'pitch' : reservePlayer ? 'reserve' : null;

        if (!selected) {
            if (!tapped) return;               // hueco vacío sin selección: nada que hacer
            selected = { name: tappedName, from: tappedFrom, slotId: slot?.id };
            tapped.classList.add('pcf-tap-selected');
            return;
        }
        if (tapped && tappedName === selected.name) { clearSelection(); return; }   // desmarcar

        const player = playerByName(selected.name);
        if (!player) { clearSelection(); return; }
        const from = selected.from, fromSlot = selected.slotId;
        clearSelection();

        if (slot) {                           // destino: un hueco del campo (con o sin jugador)
            move(player, slot, slot.id);
        } else if (reservePlayer && from === 'pitch') {   // campo -> suplente: el suplente ocupa el hueco
            const sub = playerByName(tappedName);
            const fromEl = document.getElementById(fromSlot);
            if (sub && fromEl) move(sub, fromEl, fromSlot);
        } else if (reservePlayer && from === 'reserve') { // cambia la selección entre suplentes
            selected = { name: tappedName, from: 'reserve' };
            restoreSelection();
        } else if (reservesArea && from === 'pitch') {    // campo -> zona de suplentes: se saca del once
            move(player, reservesArea, 'reservesList');
        }
    }

    function install() {
        const orig = window.renderLineupPageUI;
        if (typeof orig !== 'function' || !window.drag || !window.drop) { setTimeout(install, 400); return; }
        if (orig._pcfTap) return;
        injectStyles();
        window.renderLineupPageUI = function (...args) {
            const r = orig.apply(this, args);
            refreshButton();
            restoreSelection();
            return r;
        };
        window.renderLineupPageUI._pcfTap = true;
        document.addEventListener('click', onTap, true);   // fase de captura: va antes que los onclick de cada jugador
        window.addEventListener('resize', () => refreshButton());
    }
    install();
})();
