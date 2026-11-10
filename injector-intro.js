// ============================================================
// injector-intro.js — Intro de PC Fútbol Manager
// Se carga justo al abrir <body> para tapar la pantalla principal desde el
// primer instante.
//   1. Estadio de noche: se encienden las torres de focos, flashes en la grada.
//   2. El campo se dibuja en perspectiva y entra el balón rodando.
//   3. Título cromado "PC FÚTBOL" + "MANAGER" dorado + temporada.
//   4. Marcador corrido con los equipos de Primera.
//   5. "PULSA UNA TECLA PARA EMPEZAR" (silbato + grada, generados con Web Audio).
//   6. El logo sube y el estadio queda de fondo de login / bienvenida
//      ("Conectando con el vestuario…" mientras Firebase responde) hasta que
//      empiezas o cargas una partida.
// Saltar intro · versión corta si ya se vio en esta sesión · respeta
// "reducir movimiento" del sistema.
// ============================================================
(function () {
    'use strict';
    if (window.__pcfIntro) return;
    window.__pcfIntro = true;

    const SEEN_KEY = 'pcf_intro_seen';
    const SOUND_KEY = 'pcf_intro_sound';
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const quick = sessionStorage.getItem(SEEN_KEY) === '1';
    const T = quick || reduced ? 0.25 : 1;              // factor de tiempo

    const css = `
    #pcfIntro{position:fixed;inset:0;z-index:200000;overflow:hidden;background:#01040c;color:#fff;
        font-family:'Saira Condensed','Arial Narrow',Arial,sans-serif;cursor:pointer;user-select:none;transition:opacity .7s ease}
    #pcfIntro.pcfi--backdrop{z-index:190;cursor:default}
    #pcfIntro.pcfi--out{opacity:0;pointer-events:none}
    .pcfi-sky{position:absolute;inset:0;background:linear-gradient(180deg,#01040c 0%,#020a1c 45%,#030e22 100%);transition:opacity .9s}
    /* Escena: la foto del estadio y todo lo que se alinea con ella (focos, flashes, balón). Cubre la pantalla recortando por arriba y abajo */
    .pcfi-scene{position:absolute;left:50%;top:54%;width:max(100vw,177.78vh);height:max(56.25vw,100vh);transform:translate(-50%,-50%);transition:opacity .9s}
    .pcfi-img{position:absolute;inset:0;background-size:100% 100%;background-repeat:no-repeat;opacity:0}
    .pcfi-off{background-image:url(assets/imagenes/intro-estadio-apagado.webp);transition:opacity 1.1s ease}
    .pcfi-off.in{opacity:1}
    .pcfi-on{background-image:url(assets/imagenes/intro-estadio-encendido.webp);transition:opacity 1.5s ease}
    .pcfi-on.in{opacity:1}
    /* Focos que se encienden uno a uno: la foto «encendida» enmascarada alrededor de cada torre */
    .pcfi-lt{position:absolute;inset:0;background:url(assets/imagenes/intro-estadio-encendido.webp) 0 0/100% 100% no-repeat;opacity:0;
        -webkit-mask-image:radial-gradient(ellipse var(--rx) var(--ry) at var(--x) var(--y),#000 0%,rgba(0,0,0,.8) 32%,transparent 100%);
        mask-image:radial-gradient(ellipse var(--rx) var(--ry) at var(--x) var(--y),#000 0%,rgba(0,0,0,.8) 32%,transparent 100%)}
    .pcfi-lt.on{animation:pcfiLt .9s steps(1) forwards}
    @keyframes pcfiLt{0%{opacity:0}8%{opacity:.9}16%{opacity:.15}26%{opacity:1}38%{opacity:.35}52%{opacity:1}100%{opacity:1}}
    .l1{--x:7.9%;--y:16.3%;--rx:24%;--ry:42%}.l2{--x:92%;--y:16.5%;--rx:24%;--ry:42%}
    .l3{--x:28.3%;--y:44.3%;--rx:15%;--ry:26%}.l4{--x:71.5%;--y:44.4%;--rx:15%;--ry:26%}
    /* Flashes de la grada */
    .pcfi-stands{position:absolute;left:0;right:0;top:50%;height:21%;pointer-events:none}
    .pcfi-flash{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 8px 3px #fff;animation:pcfiFlash .35s ease-out forwards}
    @keyframes pcfiFlash{from{opacity:1;transform:scale(1.4)}to{opacity:0;transform:scale(.4)}}
    /* Balón (foto con transparencia) que entra rodando por el césped */
    .pcfi-ball{position:absolute;left:-8%;top:70%;width:5.4%;aspect-ratio:1;opacity:0;transform:translate(-50%,-50%)}
    .pcfi-ball.roll{animation:pcfiRoll calc(1.4s * var(--t)) cubic-bezier(.2,.7,.25,1) forwards}
    @keyframes pcfiRoll{0%{left:-8%;opacity:1;transform:translate(-50%,-50%) scale(.75)}100%{left:50%;opacity:1;transform:translate(-50%,-50%) scale(1)}}
    .pcfi-bimg{display:block;width:100%;height:100%;object-fit:contain;animation:pcfiSpin calc(1.4s * var(--t)) cubic-bezier(.2,.7,.25,1) forwards;filter:drop-shadow(0 3px 3px rgba(0,0,0,.55))}
    @keyframes pcfiSpin{to{transform:rotate(780deg)}}
    .pcfi-bshadow{position:absolute;left:4%;right:4%;bottom:-10%;height:24%;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.7),transparent 72%);filter:blur(2px)}
    /* Título */
    .pcfi-title{position:absolute;left:0;right:0;top:9%;text-align:center;transition:transform .9s cubic-bezier(.6,0,.2,1),top .9s cubic-bezier(.6,0,.2,1)}
    .pcfi-t1{display:inline-block;font-weight:900;font-size:clamp(44px,min(11vw,19vh),170px);line-height:.9;letter-spacing:.02em;font-style:italic;
        background:linear-gradient(100deg,#ffffff 0%,#c9d6ea 38%,#5f7394 48%,#ffffff 52%,#aebdd6 62%,#ffffff 100%);background-size:250% 100%;
        -webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.35);opacity:0;transform:scale(2.6);filter:blur(12px)}
    .pcfi-t1.in{animation:pcfiSlam calc(.55s * var(--t)) cubic-bezier(.2,1.4,.4,1) forwards,pcfiShine 3.2s 1.2s ease-in-out infinite}
    @keyframes pcfiSlam{0%{opacity:0;transform:scale(2.6);filter:blur(12px)}100%{opacity:1;transform:scale(1);
        filter:drop-shadow(0 3px 0 #0b2550) drop-shadow(0 6px 0 #071733) drop-shadow(0 0 30px rgba(25,195,255,.55)) drop-shadow(0 14px 18px rgba(0,0,0,.7))}}
    @keyframes pcfiShine{0%,60%{background-position:100% 0}100%{background-position:-60% 0}}
    .pcfi-t2{display:block;margin-top:.15em;font-weight:900;font-size:clamp(20px,min(4.4vw,8vh),66px);letter-spacing:.42em;padding-left:.42em;
        background:linear-gradient(180deg,#fff3c4 0%,#ffd24a 45%,#c98a00 55%,#ffe58a 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
        filter:drop-shadow(0 3px 0 #5a3a00) drop-shadow(0 8px 12px rgba(0,0,0,.7));opacity:0;transform:translateY(20px)}
    .pcfi-t2.in{transition:opacity .5s,transform .5s cubic-bezier(.2,1.2,.4,1);opacity:1;transform:none}
    /* Subtítulo en fichas inclinadas */
    .pcfi-t3{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;margin-top:1.1em;opacity:0;transition:opacity .8s}
    .pcfi-t3.in{opacity:1}
    .pcfi-chip,.pcfi-btn,.pcfi-team,.pcfi-tag{position:relative;isolation:isolate}
    .pcfi-chip{height:38px;display:inline-flex;align-items:center;padding:0 34px;margin-left:-9px;font:800 clamp(.78rem,1.3vw,1.15rem) 'Saira Condensed',sans-serif;letter-spacing:.1em;color:#e6f0ff;text-shadow:0 1px 3px rgba(0,0,0,.8);filter:drop-shadow(0 3px 4px rgba(0,0,0,.55))}
    .pcfi-chip:first-child{margin-left:0}
    .pcfi-chip::before,.pcfi-btn::before,.pcfi-team::before,.pcfi-tag::before{content:'';position:absolute;inset:0;z-index:-1;clip-path:polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%);
        background:linear-gradient(180deg,#14407f 0%,#0b2b5c 48%,#071d42 52%,#040f26 100%);box-shadow:inset 0 0 0 1px #4c8fff,inset 0 0 14px rgba(70,150,255,.55),inset 0 1px 0 rgba(255,255,255,.35)}
    .pcfi-chip.gold,.pcfi-tag{color:#3a2400;text-shadow:0 1px 0 rgba(255,255,255,.5)}
    .pcfi-chip.gold::before,.pcfi-tag::before{background:linear-gradient(180deg,#ffe49a 0%,#e6a61f 46%,#a56b00 54%,#4f3000 100%);box-shadow:inset 0 0 0 1px #3a2400,inset 0 1px 0 rgba(255,255,255,.7)}
    /* Marcador corrido */
    .pcfi-ticker{position:absolute;left:0;right:0;bottom:0;height:56px;background:linear-gradient(180deg,#0f3a78,#061a40 55%,#030f26);border-top:2px solid #19c3ff;
        box-shadow:0 -4px 22px rgba(25,195,255,.45),0 -6px 20px rgba(0,0,0,.6);overflow:hidden;opacity:0;transform:translateY(100%);transition:all .6s}
    .pcfi-ticker.in{opacity:1;transform:none}
    .pcfi-track{display:flex;gap:0;align-items:center;height:100%;white-space:nowrap;width:max-content;animation:pcfiTick 60s linear infinite;padding-left:100vw}
    .pcfi-team{display:flex;gap:8px;align-items:center;height:38px;padding:0 28px 0 16px;margin-left:-8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:15px;color:#e6eefb;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
    .pcfi-team::before{clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%)}
    .pcfi-team img,.pcfi-team i{width:26px;height:26px;margin-left:8px;object-fit:contain}
    .pcfi-team i{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:#2a5aa0;border:1px solid #7aa0d4;font-style:normal;font-size:10px;font-weight:800}
    .pcfi-tag{display:inline-flex;align-items:center;height:38px;padding:0 30px;margin:0 10px;font-weight:800;letter-spacing:.1em}
    .pcfi-tag::before{clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%)}
    @keyframes pcfiTick{to{transform:translateX(-100%)}}
    /* Pulsa para empezar */
    .pcfi-press{display:block;width:max-content;max-width:92vw;margin:1.6em auto 0;text-align:center;font-weight:800;letter-spacing:.26em;font-size:clamp(13px,1.5vw,19px);
        color:#fff;text-shadow:0 0 12px rgba(255,210,74,.8),0 2px 0 #000;padding:10px 38px;border:2px solid #19c3ff;border-radius:999px;background:rgba(4,16,40,.72);
        box-shadow:0 0 22px rgba(25,195,255,.6),inset 0 0 14px rgba(25,195,255,.2);opacity:0}
    .pcfi-press.in{animation:pcfiBlink 1.1s steps(1) infinite}
    @keyframes pcfiBlink{0%{opacity:1}55%{opacity:0}}
    .pcfi-status{position:absolute;left:0;right:0;top:46%;text-align:center;letter-spacing:.25em;text-transform:uppercase;font-size:14px;color:#cfe0ff;opacity:0;transition:opacity .4s}
    .pcfi-status.in{opacity:.9}
    .pcfi-status::before{content:'';display:inline-block;width:12px;height:12px;border:2px solid #ffd24a;border-top-color:transparent;border-radius:50%;margin-right:10px;vertical-align:-1px;animation:pcfiSpin2 .8s linear infinite}
    @keyframes pcfiSpin2{to{transform:rotate(360deg)}}
    .pcfi-btn{position:absolute;top:14px;height:38px;padding:0 30px;border:0;background:none;color:#e6f0ff;font:700 .9rem 'Saira Condensed',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;z-index:2;filter:drop-shadow(0 3px 4px rgba(0,0,0,.55))}
    .pcfi-skip{right:14px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8)}.pcfi-sound{left:14px}
    .pcfi-skip::before{background:linear-gradient(180deg,#6fe0ff 0%,#1f8cf0 46%,#1450c0 54%,#0a2a78 100%);box-shadow:inset 0 0 0 1px #8fe8ff,inset 0 1px 0 rgba(255,255,255,.6),inset 0 -3px 5px rgba(0,0,0,.35)}
    .pcfi-btn:hover{filter:drop-shadow(0 3px 4px rgba(0,0,0,.55)) brightness(1.18)}
    .pcfi-whiteflash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
    .pcfi-whiteflash.go{animation:pcfiWF .6s ease-out}
    @keyframes pcfiWF{0%{opacity:.85}100%{opacity:0}}
    /* Fondo de la bienvenida (como hasta ahora): el estadio queda detrás de login / bienvenida, algo más oscuro, con el título pequeño arriba */
    #pcfIntro.pcfi--backdrop .pcfi-title{top:3%;transform:scale(.5);transform-origin:50% 0}
    #pcfIntro.pcfi--backdrop .pcfi-press,#pcfIntro.pcfi--backdrop .pcfi-skip,#pcfIntro.pcfi--backdrop .pcfi-t3{display:none}
    #pcfIntro.pcfi--backdrop .pcfi-sky::after,#pcfIntro.pcfi--backdrop .pcfi-scene::after{content:'';position:absolute;inset:0;background:rgba(1,4,12,.35)}
    #pcfIntro.pcfi--backdrop .pcfi-ball{opacity:0 !important;transition:opacity .4s}
    /* Con el estadio de fondo, las ventanas de arranque no oscurecen tanto */
    body.pcfi-has-backdrop #loginModal, body.pcfi-has-backdrop #gameSelectionModal, body.pcfi-has-backdrop #gameModeModal,
    body.pcfi-has-backdrop #selectTeamModal, body.pcfi-has-backdrop #savedGamesModal { background: rgba(1,4,12,.18) !important; }
    body.pcfi-has-backdrop #loginModal > *, body.pcfi-has-backdrop #gameSelectionModal > * { margin-top: 13vh; }
    /* Móvil en vertical: la foto ocupa la parte baja y se ven los dos focos centrales; la parte alta es cielo para el título */
    @media (orientation:portrait) and (max-width:820px){
        .pcfi-scene{top:auto;bottom:0;transform:translateX(-50%);width:calc(60vh * 1.7778);height:60vh}
        .pcfi-img,.pcfi-lt{-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 16%);mask-image:linear-gradient(180deg,transparent 0,#000 16%)}
        .pcfi-lt{-webkit-mask-image:radial-gradient(ellipse var(--rx) var(--ry) at var(--x) var(--y),#000 0%,rgba(0,0,0,.8) 32%,transparent 100%);mask-image:radial-gradient(ellipse var(--rx) var(--ry) at var(--x) var(--y),#000 0%,rgba(0,0,0,.8) 32%,transparent 100%)}
        .pcfi-title{top:13vh}
        .pcfi-t1{font-size:17vw}
        .pcfi-t2{font-size:7.2vw;letter-spacing:.32em;padding-left:.32em}
        .pcfi-chip{height:30px;padding:0 20px;font-size:.66rem}
        .pcfi-ball{width:9%;top:71%}
        .pcfi-press{font-size:3.2vw;letter-spacing:.13em;padding:9px 18px;margin-top:2em}
        .pcfi-btn{top:10px;height:32px;padding:0 22px;font-size:.78rem}
        .pcfi-status{top:44vh}
        #pcfIntro.pcfi--backdrop .pcfi-title{top:1.5vh;transform:scale(.55)}
    }
    /* Móvil en horizontal */
    @media (max-height:520px) and (orientation:landscape){
        .pcfi-title{top:6%}
        .pcfi-chip{height:28px;padding:0 24px;font-size:.7rem}
        .pcfi-ticker{height:46px}.pcfi-team,.pcfi-tag{height:32px}
        .pcfi-press{padding:6px 26px;margin-top:1em;font-size:12px}
        .pcfi-btn{top:8px;height:30px;padding:0 22px;font-size:.74rem}
    }
    `;


    const root = document.createElement('div');
    root.id = 'pcfIntro';
    root.style.setProperty('--t', T);
    root.innerHTML = `<style>${css}</style>
        <div class="pcfi-sky"></div>
        <div class="pcfi-scene">
            <div class="pcfi-img pcfi-off"></div><div class="pcfi-img pcfi-on"></div>
            <div class="pcfi-lt l1"></div><div class="pcfi-lt l2"></div><div class="pcfi-lt l3"></div><div class="pcfi-lt l4"></div>
            <div class="pcfi-stands"></div>
            <div class="pcfi-ball"><div class="pcfi-bshadow"></div><img class="pcfi-bimg" src="assets/imagenes/intro-balon.webp" alt=""></div>
        </div>
        <div class="pcfi-title">
            <div class="pcfi-t1">PC FÚTBOL</div>
            <span class="pcfi-t2">MANAGER</span>
            <div class="pcfi-t3"><span class="pcfi-chip gold">TEMPORADA&nbsp;<b>2026/27</b></span><span class="pcfi-chip">PRIMERA</span><span class="pcfi-chip">SEGUNDA</span><span class="pcfi-chip">PRIMERA RFEF</span></div>
            <div class="pcfi-press">${('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 'TOCA LA PANTALLA PARA EMPEZAR' : 'PULSA UNA TECLA PARA EMPEZAR'}</div>
        </div>
        <div class="pcfi-status">Conectando con el vestuario…</div>
        <div class="pcfi-ticker"><div class="pcfi-track"></div></div>
        <button class="pcfi-btn pcfi-sound" type="button" title="Sonido de la intro"></button>
        <button class="pcfi-btn pcfi-skip" type="button">Saltar intro ▸</button>
        <div class="pcfi-whiteflash"></div>`;
    (document.body || document.documentElement).appendChild(root);

    const $ = s => root.querySelector(s);
    const later = (ms, fn) => setTimeout(fn, ms * T);
    let phase = 'intro';     // intro → ready → backdrop → out
    const timers = [];
    const at = (ms, fn) => timers.push(later(ms, fn));

    // ── Sonido (Web Audio, sin ficheros) ─────────────────────────
    let soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
    const soundBtn = $('.pcfi-sound');
    const paintSound = () => { soundBtn.textContent = soundOn ? '🔊 Sonido' : '🔇 Sonido'; };
    paintSound();
    soundBtn.addEventListener('click', e => {
        e.stopPropagation();
        soundOn = !soundOn;
        localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
        paintSound();
    });
    function playKickoff() {
        if (!soundOn) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            const ctx = new AC();
            const now = ctx.currentTime;
            // Silbato: dos pitidos con vibrato
            [[0, .28], [.36, .62]].forEach(([s, e]) => {
                const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
                o.type = 'square'; o.frequency.value = 2850;
                lfo.frequency.value = 38; lg.gain.value = 140; lfo.connect(lg); lg.connect(o.frequency);
                g.gain.setValueAtTime(0, now + s); g.gain.linearRampToValueAtTime(.07, now + s + .02);
                g.gain.setValueAtTime(.07, now + e - .04); g.gain.linearRampToValueAtTime(0, now + e);
                const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2900; bp.Q.value = 6;
                o.connect(bp); bp.connect(g); g.connect(ctx.destination);
                o.start(now + s); lfo.start(now + s); o.stop(now + e + .05); lfo.stop(now + e + .05);
            });
            // Grada: ruido filtrado que crece y se apaga
            const len = 3.2, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 900));
            const src = ctx.createBufferSource(); src.buffer = buf;
            const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
            const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, now + .5); g.gain.linearRampToValueAtTime(.16, now + 1.2); g.gain.linearRampToValueAtTime(0, now + .5 + len);
            src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(ctx.destination);
            src.start(now + .5);
            setTimeout(() => ctx.close && ctx.close(), (len + 1) * 1000);
        } catch (e) { /* sin audio */ }
    }

    // ── Flashes de la grada (cuando ya hay focos) ────────────────
    let flashTimer = null;
    function startFlashes() {
        const stands = $('.pcfi-stands');
        if (flashTimer) return;
        flashTimer = setInterval(() => {
            if (phase === 'out') return;
            for (let i = 0; i < 2; i++) {
                const f = document.createElement('div');
                f.className = 'pcfi-flash';
                f.style.left = (Math.random() * 100) + '%';
                f.style.top = (Math.random() * 100) + '%';
                stands.appendChild(f);
                setTimeout(() => f.remove(), 400);
            }
        }, 220);
    }

    // ── Marcador corrido con los equipos ─────────────────────────
    function buildTicker() {
        const track = $('.pcfi-track');
        const teams = (window.TEAMS_DATA && window.TEAMS_DATA.primera) || [
            'Real Madrid CF', 'FC Barcelona', 'Atlético de Madrid', 'Athletic Club', 'Villarreal CF', 'Real Betis Balompié',
            'Real Sociedad', 'Valencia CF', 'Celta de Vigo', 'Sevilla FC', 'CA Osasuna', 'Getafe CF', 'Rayo Vallecano',
            'RCD Espanyol', 'Deportivo Alavés', 'Elche CF', 'Levante UD', 'Racing de Santander', 'Deportivo de La Coruña', 'Málaga CF'];
        const file = { 'FC Barcelona': 'escudobarcelona', 'Athletic Club': 'escudoatletic', 'Atlético de Madrid': 'escudoatletico', 'Deportivo Alavés': 'escudoalaves' };
        // Solo se aceptan escudos con URL segura (los mismos criterios que safeImageURL)
        const okLogo = l => (typeof l === 'string' && /^(https?:\/\/|data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);base64,|\.?\/?assets\/)/i.test(l.trim())) ? l.trim().replace(/"/g, '&quot;') : null;
        const logoOf = t => {
            // 1) memoria de la sesión · 2) localStorage (solo caben unos ~75 equipos) · 3) escudos incluidos en el proyecto
            try { const m = window.getCachedTeamData && window.getCachedTeamData(t); if (m && okLogo(m.logo)) return okLogo(m.logo); } catch (e) { /* */ }
            try { const d = JSON.parse(localStorage.getItem('team_data_' + t) || 'null'); if (d && okLogo(d.logo)) return okLogo(d.logo); } catch (e) { /* */ }
            return file[t] ? `assets/escudos/${file[t]}.png` : null;
        };
        const initials = t => t.replace(/^(FC|CF|CA|RCD|UD|SD|CD|RC|Real|Club)\s+/i, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
        const one = teams.map(t => {
            const l = logoOf(t);
            return `<span class="pcfi-team" data-team="${encodeURIComponent(t)}">${l ? `<img src="${l}" alt="">` : `<i>${initials(t)}</i>`}${t}</span>`;
        }).join('');
        track.innerHTML = `<span class="pcfi-tag">⚽ PRIMERA DIVISIÓN 2026/27</span>${one}<span class="pcfi-tag">⚽ ¡QUE EMPIECE LA TEMPORADA!</span>${one}`;
        // Los equipos que siguen sin escudo lo toman de la copia del catálogo guardada en este dispositivo (IndexedDB), sin tocar la red
        Promise.race([loadDeviceCatalog(), new Promise(r => setTimeout(() => r(null), 2500))]).then(cat => {
            if (!cat) return;
            track.querySelectorAll('.pcfi-team[data-team]').forEach(el => {
                const i = el.querySelector('i'); if (!i) return;
                const d = cat[decodeURIComponent(el.dataset.team)]; const l = d && okLogo(d.logo); if (!l) return;
                const img = new Image(); img.alt = ''; img.src = l.replace(/&quot;/g, '"'); i.replaceWith(img);
            });
        }).catch(() => {});
    }
    // Copia persistente del catálogo (la crea injector-firebase-sync.js); si su API no está, se lee la base directamente
    async function loadDeviceCatalog() {
        try {
            if (window.__pcfCatalogIDB && window.__pcfCatalogIDB.load) return await window.__pcfCatalogIDB.load();
            return await new Promise(res => {
                const r = indexedDB.open('pcf_catalog', 1);
                r.onupgradeneeded = () => r.result.createObjectStore('kv');
                r.onerror = () => res(null);
                r.onsuccess = () => {
                    const db = r.result;
                    try { const q = db.transaction('kv').objectStore('kv').get('catalog'); q.onsuccess = () => { db.close(); res(q.result || null); }; q.onerror = () => { db.close(); res(null); }; }
                    catch (e) { db.close(); res(null); }
                };
            });
        } catch (e) { return null; }
    }

    // ── Escena ───────────────────────────────────────────────────
    function play() {
        at(150, () => $('.pcfi-off').classList.add('in'));                                   // estadio a oscuras
        root.querySelectorAll('.pcfi-lt').forEach((l, i) => at(1100 + [0, 380, 780, 1100][i], () => l.classList.add('on')));   // los focos se encienden uno a uno
        at(2500, () => { $('.pcfi-on').classList.add('in'); startFlashes(); });              // todo el estadio ya iluminado
        at(2900, () => { $('.pcfi-ball').classList.add('roll'); });
        at(3700, () => { $('.pcfi-t1').classList.add('in'); });
        at(4150, () => { $('.pcfi-t2').classList.add('in'); });
        at(4600, () => { $('.pcfi-t3').classList.add('in'); });
        at(4900, () => { buildTicker(); $('.pcfi-ticker').classList.add('in'); });
        at(5500, ready);
    }
    function ready() {
        if (phase !== 'intro') return;
        phase = 'ready';
        $('.pcfi-press').classList.add('in');
    }
    function skipToReady() {
        timers.forEach(clearTimeout);
        $('.pcfi-off').classList.add('in'); $('.pcfi-on').classList.add('in');
        root.querySelectorAll('.pcfi-lt').forEach(l => l.classList.add('on'));
        startFlashes();
        root.style.setProperty('--t', 0.01);
        $('.pcfi-ball').classList.add('roll');
        ['.pcfi-t1', '.pcfi-t2', '.pcfi-t3'].forEach(s => $(s).classList.add('in'));
        if (!$('.pcfi-track').children.length) buildTicker();
        $('.pcfi-ticker').classList.add('in');
        phase = 'intro'; ready();
    }

    // ── Pasar a fondo de la bienvenida ───────────────────────────
    function start() {
        if (phase === 'intro') { skipToReady(); return; }   // primer toque: saltar a la portada completa
        if (phase !== 'ready') return;
        phase = 'backdrop';
        sessionStorage.setItem(SEEN_KEY, '1');
        playKickoff();
        $('.pcfi-whiteflash').classList.add('go');
        root.classList.add('pcfi--backdrop');
        document.body.classList.add('pcfi-has-backdrop');
        watchForGame();
    }
    $('.pcfi-skip').addEventListener('click', e => { e.stopPropagation(); skipToReady(); });
    root.addEventListener('click', start);
    const onKey = e => { if (phase === 'intro' || phase === 'ready') { e.preventDefault(); start(); } };
    window.addEventListener('keydown', onKey);

    // Ventanas que se muestran sobre el estadio (login, bienvenida, elegir equipo…)
    const MODAL_IDS = ['loginModal', 'gameSelectionModal', 'gameModeModal', 'selectTeamModal', 'savedGamesModal',
        'pmInitialModal', 'pmOfferModal', 'pmWaitingModal', 'pmFiredModal'];
    function anyStartModalOpen() {
        return MODAL_IDS.some(id => {
            const m = document.getElementById(id);
            if (!m) return false;
            if (m.classList.contains('active')) return true;
            const d = m.style.display;
            if (d && d !== 'none') return true;
            // Ventanas de la carrera: se crean al abrirse y se borran al cerrarse
            return id.startsWith('pm') && getComputedStyle(m).display !== 'none';
        });
    }
    function gameStarted() {
        try { const s = window.gameLogic && window.gameLogic.getViewState(); return !!(s && s.team); } catch (e) { return false; }
    }
    function watchForGame() {
        const status = $('.pcfi-status');
        let idleSince = null;
        const iv = setInterval(() => {
            const modal = anyStartModalOpen();
            const started = gameStarted();
            if (started && !modal) {
                clearInterval(iv);
                finish();
                return;
            }
            // Sin ventana abierta ni partida (p. ej. cerraste "Cargar partida" sin partidas):
            // tras un momento, volver a mostrar las opciones en lugar de quedarse esperando
            if (!modal && !started) {
                idleSince = idleSince || Date.now();
                const user = window.currentUser;
                if (Date.now() - idleSince > 900) {
                    if (user && typeof window.showGameSelectionModal === 'function') {
                        window.showGameSelectionModal();
                        idleSince = null;
                    } else if (user === null && document.getElementById('loginModal')) {
                        document.getElementById('loginModal').classList.add('active');
                        idleSince = null;
                    }
                }
            } else {
                idleSince = null;
            }
            // "Conectando…" solo mientras se comprueba la sesión
            status.classList.toggle('in', !modal && !started && window.currentUser === undefined);
        }, 300);
    }
    function finish() {
        if (phase === 'out') return;
        phase = 'out';
        window.removeEventListener('keydown', onKey);
        root.classList.add('pcfi--out');
        document.body.classList.remove('pcfi-has-backdrop');
        setTimeout(() => { clearInterval(flashTimer); root.remove(); }, 800);
    }
    window.pcfIntro = { skip: skipToReady, start, finish };

    // Las imágenes (estadio a oscuras, estadio iluminado y balón) se precargan: así el fundido no «salta» con una red lenta
    const loadAll = Promise.all(['intro-estadio-apagado', 'intro-estadio-encendido', 'intro-balon'].map(n => new Promise(res => {
        const im = new Image(); im.onload = im.onerror = () => res(); im.src = `assets/imagenes/${n}.webp`;
    })));
    if (reduced) skipToReady(); else Promise.race([loadAll, new Promise(r => setTimeout(r, 2200))]).then(() => { if (phase === 'intro' && !timers.length) play(); });
})();
