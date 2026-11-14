// injector-install-prompt.js — Aviso para instalar el juego como aplicación (móvil y escritorio).
// · Si el navegador ofrece instalar (beforeinstallprompt), el botón «Instalar» lanza el diálogo nativo.
// · En iPhone/iPad (Safari) no existe ese diálogo: se muestran los pasos manuales.
// · No aparece si ya se ejecuta como aplicación instalada, ni si el navegador no permite instalar.
// · «Ahora no» lo vuelve a mostrar a los 7 días; «No volver a preguntar» lo silencia para siempre.
(function () {
    'use strict';
    var KEY_SNOOZE = 'pcf_install_snooze', KEY_NEVER = 'pcf_install_never', KEY_DONE = 'pcf_install_done';
    function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }

    var standalone = false;
    try { standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true; } catch (e) {}
    if (standalone) return;
    if (ls(KEY_NEVER) === '1' || ls(KEY_DONE) === '1') return;
    var snooze = parseInt(ls(KEY_SNOOZE) || '0', 10);
    if (snooze && Date.now() < snooze) return;

    var ua = navigator.userAgent || '';
    var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var deferred = null, shown = false, ready = false;

    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; ready = true; });
    window.addEventListener('appinstalled', function () { ls(KEY_DONE, '1'); close(); });

    var css = '#pcfInstall{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,8,22,.78);animation:pcfInFade .25s ease}' +
        '@keyframes pcfInFade{from{opacity:0}to{opacity:1}}' +
        '#pcfInstall .pcfin-box{width:100%;max-width:440px;padding:22px 20px 18px;border:2px solid #4cc9ff;border-radius:18px;text-align:center;color:#e6f0ff;' +
        'background:linear-gradient(180deg,rgba(14,44,96,.97),rgba(4,16,40,.98));box-shadow:0 0 28px rgba(70,170,255,.6),inset 0 0 26px rgba(70,150,255,.2)}' +
        '#pcfInstall .pcfin-ico{width:84px;height:84px;border-radius:20px;margin:-6px auto 8px;display:block;box-shadow:0 6px 16px rgba(0,0,0,.55)}' +
        '#pcfInstall h2{margin:0 0 8px;font-family:"Saira Condensed",sans-serif;font-style:italic;font-weight:800;font-size:1.7rem;letter-spacing:.04em;text-transform:uppercase;color:#ffd24a;text-shadow:0 2px 3px rgba(0,0,0,.7)}' +
        '#pcfInstall p{margin:0 0 10px;font-size:1rem;line-height:1.4}' +
        '#pcfInstall ul{list-style:none;margin:0 0 14px;padding:0;text-align:left;display:grid;gap:6px;font-size:.95rem}' +
        '#pcfInstall ul li{padding:6px 10px;border-radius:8px;background:rgba(30,74,150,.35)}' +
        '#pcfInstall ol{margin:0 0 14px;padding:0 0 0 22px;text-align:left;font-size:.98rem;line-height:1.5}' +
        '#pcfInstall .pcfin-btn{display:block;width:100%;min-height:46px;margin:6px 0 0;padding:8px 16px;border:1px solid #06142e;border-radius:10px;cursor:pointer;color:#fff;' +
        'font-family:"Saira Condensed",sans-serif;font-style:italic;font-weight:800;font-size:1.15rem;letter-spacing:.05em;text-transform:uppercase;text-shadow:0 1px 3px rgba(0,0,0,.8);' +
        'background:linear-gradient(180deg,#7fe597 0%,#22a84f 40%,#137a35 54%,#08461d 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -3px 5px rgba(0,0,0,.4),0 3px 6px rgba(0,0,0,.55)}' +
        '#pcfInstall .pcfin-btn.sec{background:linear-gradient(180deg,#8bbcff 0%,#2f72d9 40%,#1a4cae 54%,#0a2a70 100%)}' +
        '#pcfInstall .pcfin-never{display:inline-block;margin-top:10px;padding:6px;background:none;border:0;color:#9db8e8;font-size:.82rem;text-decoration:underline;cursor:pointer}';

    function close() { var m = document.getElementById('pcfInstall'); if (m) m.remove(); }
    function later() { ls(KEY_SNOOZE, String(Date.now() + 7 * 864e5)); close(); }

    function show() {
        if (shown || document.getElementById('pcfInstall')) return;
        shown = true;
        var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
        var m = document.createElement('div'); m.id = 'pcfInstall'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
        var body = isIOS
            ? '<p>Instálalo en tu iPhone o iPad para jugar a pantalla completa:</p><ol><li>Pulsa el botón <b>Compartir</b> (el cuadrado con la flecha).</li><li>Elige <b>«Añadir a pantalla de inicio»</b>.</li><li>Pulsa <b>Añadir</b>.</li></ol>'
            : '<p>Instala el juego en tu dispositivo y ábrelo como una aplicación:</p><ul><li>🖥️ Se abre a pantalla completa, sin barra del navegador</li><li>⚡ Arranca más rápido</li><li>📴 Funciona aunque la conexión falle</li></ul>';
        m.innerHTML = '<div class="pcfin-box"><img class="pcfin-ico" src="assets/pwa/icon-192.png" alt="" onerror="this.style.display=\'none\'"><h2>Instala PC Fútbol Manager</h2>' + body +
            (isIOS ? '' : '<button class="pcfin-btn" id="pcfinGo">Instalar la aplicación</button>') +
            '<button class="pcfin-btn sec" id="pcfinLater">' + (isIOS ? 'Entendido' : 'Ahora no') + '</button>' +
            '<button class="pcfin-never" id="pcfinNever">No volver a preguntar</button></div>';
        document.body.appendChild(m);
        var go = document.getElementById('pcfinGo');
        if (go) go.onclick = function () {
            if (!deferred) { later(); return; }
            try { deferred.prompt(); deferred.userChoice.then(function (c) { if (c && c.outcome === 'accepted') ls(KEY_DONE, '1'); else ls(KEY_SNOOZE, String(Date.now() + 7 * 864e5)); }); } catch (e) {}
            close();
        };
        document.getElementById('pcfinLater').onclick = later;
        document.getElementById('pcfinNever').onclick = function () { ls(KEY_NEVER, '1'); close(); };
    }

    // Esperar a que acabe la intro y a que el navegador diga si se puede instalar.
    var t0 = Date.now();
    var timer = setInterval(function () {
        if (shown) { clearInterval(timer); return; }
        if (Date.now() - t0 > 90000) { clearInterval(timer); return; }
        var intro = document.getElementById('pcfIntro');
        var introOn = intro && !intro.classList.contains('pcfi--backdrop');
        if (introOn || !document.body) return;
        if (isIOS || ready || (Date.now() - t0 > 3000 && ready)) { clearInterval(timer); setTimeout(show, 1200); }
    }, 700);
    window.pcfShowInstallPrompt = function () { ls(KEY_NEVER, '0'); ls(KEY_SNOOZE, '0'); shown = false; show(); };
})();
