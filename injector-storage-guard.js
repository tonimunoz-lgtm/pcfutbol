// ============================================================
// injector-storage-guard.js — Almacenamiento del navegador y de la nube
// (se carga el PRIMERO, antes que firebase-config.js)
//
// El error «cuota excedida» de los guardados NO era de Firebase: el juego copia en
// el localStorage del navegador (límite ≈ 5 MB) los datos de cada equipo (con su
// escudo y foto de estadio como texto) y todas las partidas guardadas. Al llenarse,
// setItem lanzaba QuotaExceededError y el guardado devolvía error aunque la nube ya
// lo hubiera grabado.
//
// Este módulo:
//  1. Protege setItem: si no cabe, libera cachés (se vuelven a bajar de la nube) y
//     reintenta; si aun así no cabe y es una caché, se ignora sin romper nada.
//  2. Mantiene las copias locales de partidas a las 3 últimas y sin la foto del estadio.
//  3. Guarda las partidas en la nube SIN la foto del estadio (se recupera del equipo).
//  4. Herramientas de Admin: ver uso, vaciar caché y optimizar escudos y fotos.
// ============================================================
(function () {
    'use strict';
    if (window.__pcfStorageGuard) return;
    window.__pcfStorageGuard = true;

    // Temporizador que no trabaja con la pestaña oculta (ahorra batería en móvil). Lo usan los módulos que sondean el estado.
    // Diagnóstico del orden de los envoltorios de simulateWeek (cada inyector lo reasigna; el orden depende de los tiempos de carga).
// Solo registra; no cambia el comportamiento. Consulta: pcfSimWrapperOrder() → ['index.html','injector-x.js',...] (de dentro a fuera).
(function () {
    let current; const order = [];
    const fileOf = () => { const m = String(new Error().stack).split('\n').slice(2).map(l => (l.match(/([\w.-]+\.(?:js|html))/) || [])[1]).find(f => f && f !== 'injector-storage-guard.js'); return m || '?'; };
    try {
        Object.defineProperty(window, 'simulateWeek', { configurable: true, enumerable: true,
            get() { return current; }, set(fn) { current = fn; if (typeof fn === 'function') { order.push(fileOf()); window.__pcfSimWrapperOrder = order.slice(); } } });
    } catch (_) { /* si el navegador no lo permite, se sigue sin diagnóstico */ }
    window.pcfSimWrapperOrder = () => order.slice();
})();
window.pcfEvery = function (fn, ms) { return setInterval(() => { if (!document.hidden) fn(); }, ms); };

    const LS = window.localStorage;
    const origSet = Storage.prototype.setItem;
    const CACHE_TEAM = /^team_data_/, CACHE_GAMES = /^user_games_/;
    const isQuota = e => e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014 || /quota/i.test(String(e.message)));

    const sizeOf = (k) => { const v = LS.getItem(k); return (k.length + (v ? v.length : 0)) * 2; };      // bytes UTF-16
    function usage() {
        const by = { 'Equipos (caché)': 0, 'Partidas (copia local)': 0, 'Resto': 0 };
        let total = 0;
        for (let i = 0; i < LS.length; i++) {
            const k = LS.key(i), b = sizeOf(k); total += b;
            if (CACHE_TEAM.test(k)) by['Equipos (caché)'] += b; else if (CACHE_GAMES.test(k)) by['Partidas (copia local)'] += b; else by['Resto'] += b;
        }
        return { total, by };
    }
    function purge(prefixRegex) {
        const keys = []; for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (prefixRegex.test(k)) keys.push(k); }
        keys.forEach(k => LS.removeItem(k)); return keys.length;
    }

    // Reduce lo que se copia en local: solo las 3 últimas partidas y sin imágenes
    function shrinkGames(value) {
        try {
            const map = JSON.parse(value);
            const list = Object.values(map).sort((a, b) => (b.lastSaved || 0) - (a.lastSaved || 0)).slice(0, 3);
            const out = {};
            list.forEach(g => { if (g && g.gameState) { const gs = { ...g.gameState }; delete gs.stadiumImage; out[g.id] = { ...g, gameState: gs }; } else if (g) out[g.id] = g; });
            return JSON.stringify(out);
        } catch (e) { return value; }
    }

    Storage.prototype.setItem = function (key, value) {
        key = String(key); let v = String(value);
        const isLocal = (this === LS);
        if (isLocal && CACHE_TEAM.test(key) && v.length > 300000) {        // equipo demasiado pesado para cachear: se lee de la nube
            try { this.removeItem(key); } catch (e) { /* */ } return;
        }
        if (isLocal && CACHE_GAMES.test(key)) v = shrinkGames(v);
        try { return origSet.call(this, key, v); }
        catch (e) {
            if (!isQuota(e) || !isLocal) throw e;
            // 1.º cachés de equipos; 2.º copias locales de partidas
            purge(CACHE_TEAM);
            try { return origSet.call(this, key, v); } catch (e2) { if (!isQuota(e2)) throw e2; }
            if (!CACHE_GAMES.test(key)) purge(CACHE_GAMES);
            try { return origSet.call(this, key, v); } catch (e3) { if (!isQuota(e3)) throw e3; }
            if (CACHE_TEAM.test(key) || CACHE_GAMES.test(key)) { console.warn('Almacenamiento local lleno: se omite la caché de', key); return; }
            throw e;
        }
    };

    // Limpieza preventiva al arrancar
    try { if (usage().total > 3.2 * 1024 * 1024) purge(CACHE_TEAM); } catch (e) { /* */ }

    // Save snapshots are now complete, chunked and backed up in IndexedDB.
    // Do not strip images or poll the world every four seconds.

    // ── Compresión de imágenes ──────────────────────────────────
    function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
    async function compress(dataURL, { max = 160, type = 'image/webp', q = 0.85, flatten = false } = {}) {
        const img = await loadImg(dataURL);
        let w = img.naturalWidth, h = img.naturalHeight;
        const sc = Math.min(1, max / Math.max(w, h)); w = Math.max(1, Math.round(w * sc)); h = Math.max(1, Math.round(h * sc));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'); if (flatten) { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); }
        x.drawImage(img, 0, 0, w, h);
        let out = c.toDataURL(type, q);
        if (type === 'image/webp' && !out.startsWith('data:image/webp')) out = c.toDataURL('image/png');   // navegador sin WebP
        return out;
    }
    const kb = n => (n / 1024).toFixed(n > 1048576 ? 0 : 1) + ' KB';
    const mb = n => (n / 1048576).toFixed(2) + ' MB';
    const out = (html) => { const el = document.getElementById('pcfStorageOut'); if (el) el.innerHTML = html; };

    async function allTeams() {
        const r = await window.getAllTeamsDataFromFirebase();
        if (!r || !r.success) throw new Error((r && r.error) || 'No se pudieron leer los equipos');
        return r.data || {};
    }

    async function showReport() {
        const u = usage(); const LIMIT = 5 * 1024 * 1024;
        let html = `<b>Memoria del navegador</b> (límite aprox. 5 MB): <b>${mb(u.total)}</b> usados (${Math.round(u.total / LIMIT * 100)} %)<br>` +
            Object.entries(u.by).map(([k, v]) => `&nbsp;&nbsp;• ${k}: ${mb(v)}`).join('<br>') + '<br><br>Leyendo la base de datos…';
        out(html);
        try {
            const teams = await allTeams(); let logos = 0, fotos = 0, otros = 0; const rows = [];
            Object.entries(teams).forEach(([name, d]) => {
                const l = d.logo ? d.logo.length : 0, f = d.stadiumImage ? d.stadiumImage.length : 0, t = JSON.stringify(d).length;
                logos += l; fotos += f; otros += t - l - f; rows.push([name, l + f, l, f]);
            });
            rows.sort((a, b) => b[1] - a[1]);
            html = html.replace('Leyendo la base de datos…', `<b>Base de datos</b> (${Object.keys(teams).length} equipos): escudos <b>${mb(logos)}</b> · fotos de estadio <b>${mb(fotos)}</b> · plantillas y datos <b>${mb(otros)}</b><br>` +
                `<b>Los 8 equipos con más peso en imágenes:</b><br>` + rows.slice(0, 8).map(r => `&nbsp;&nbsp;• ${r[0]}: ${kb(r[1])} (escudo ${kb(r[2])}, foto ${kb(r[3])})`).join('<br>'));
            out(html);
        } catch (e) { out(html.replace('Leyendo la base de datos…', 'No se pudo leer la base de datos: ' + e.message)); }
    }

    async function purgeBrowser() {
        const ok = await (window.pcfConfirm ? window.pcfConfirm('Vaciar caché del navegador', 'Se borrarán de este navegador las copias de equipos y de partidas. No se pierde nada: todo sigue en la nube y se volverá a bajar cuando haga falta.', { okLabel: 'Vaciar' }) : confirm('¿Vaciar caché?'));
        if (!ok) return;
        const a = purge(CACHE_TEAM), b = purge(CACHE_GAMES), u = usage();
        out(`✅ Caché vaciada (${a} equipos y ${b} copias de partidas). Ahora el navegador usa ${mb(u.total)}.`);
    }

    async function optimizeAll() {
        const ok = await (window.pcfConfirm ? window.pcfConfirm('Optimizar escudos y fotos', 'Se reducirán todos los escudos a 160 px y las fotos de estadio a 800 px (JPEG), y se volverán a guardar en la base de datos (una escritura por equipo que cambie).\n\nLa calidad visual casi no cambia y el tamaño baja mucho. ¿Continuar?', { okLabel: 'Optimizar' }) : confirm('¿Optimizar?'));
        if (!ok) return;
        out('Leyendo equipos…');
        let teams; try { teams = await allTeams(); } catch (e) { return out('❌ ' + e.message); }
        const names = Object.keys(teams); let before = 0, after = 0, changed = 0, failed = 0, i = 0; const log = [];
        for (const name of names) {
            i++; const d = teams[name]; let logo = d.logo, foto = d.stadiumImage, touched = false;
            const b0 = (logo ? logo.length : 0) + (foto ? foto.length : 0); before += b0;
            try {
                if (logo && logo.length > 12000) { const n = await compress(logo, { max: 160, type: 'image/webp', q: 0.85 }); if (n.length < logo.length * 0.85) { logo = n; touched = true; } }
                if (foto && foto.length > 60000) { const n = await compress(foto, { max: 800, type: 'image/jpeg', q: 0.78, flatten: true }); if (n.length < foto.length * 0.85) { foto = n; touched = true; } }
                if (touched) {
                    const r = await window.saveTeamDataToFirebase(name, { ...d, logo, stadiumImage: foto });
                    if (r && r.success) changed++; else { failed++; log.push(`${name}: ${r && r.error}`); logo = d.logo; foto = d.stadiumImage; }
                }
            } catch (e) { failed++; log.push(`${name}: ${e.message}`); logo = d.logo; foto = d.stadiumImage; }
            after += (logo ? logo.length : 0) + (foto ? foto.length : 0);
            out(`Optimizando… ${i}/${names.length} · ${changed} equipos comprimidos · ${mb(before)} → ${mb(after)}`);
            await new Promise(r => setTimeout(r, 40));
        }
        purge(CACHE_TEAM);
        out(`✅ <b>Listo.</b> ${changed} equipos comprimidos de ${names.length}. Imágenes: <b>${mb(before)} → ${mb(after)}</b> (ahorro ${Math.round((1 - after / Math.max(1, before)) * 100)} %).` +
            (failed ? `<br>⚠️ ${failed} con error:<br>${log.slice(0, 5).join('<br>')}<br><small>Si el error habla de cuota de escritura, espera a mañana (el límite diario se renueva) y repite: solo se tocarán los que falten.</small>` : ''));
    }

    window.pcfStorageTools = { usage, purge, compress, showReport, purgeBrowser, optimizeAll };
})();
