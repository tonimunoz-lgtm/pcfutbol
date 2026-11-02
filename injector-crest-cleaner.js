// ============================================================
// injector-crest-cleaner.js
// Elimina el fondo blanco de los escudos y los recorta al contorno.
//
// - Los escudos se guardan en Base64 (Firebase / localStorage), así que
//   los ya subidos con fondo blanco se limpian al vuelo al mostrarse.
// - Expone window.cleanCrestDataURL(dataURL) para limpiar el escudo
//   en el momento de subirlo desde el panel de admin.
// - El blanco se elimina SOLO desde los bordes hacia dentro (relleno por
//   inundación), así que los blancos interiores del escudo se respetan.
// - Las imágenes que no tienen un marco mayoritariamente blanco (fotos,
//   escudos ya transparentes) se dejan tal cual.
// ============================================================
(function () {
    'use strict';

    const HARD = 215;          // canal mínimo para considerar "blanco" de fondo
    const SOFT = 150;          // umbral para suavizar el borde (antialias)
    const MAX_SIDE = 256;      // tamaño máximo del resultado (ahorra memoria/Firestore)
    const EXCLUDE = '#stadiumImageContainer, #adminStadiumPreview, [data-no-crest-clean]';

    const done = new Map();    // src original -> src limpio (o el mismo si no aplica)
    const pending = new Map(); // src original -> Promise
    const cleanedSrcs = new Set();

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    function processImage(img) {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) return null;
        const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;

        const minAt = (i) => Math.min(d[i], d[i + 1], d[i + 2]);
        const isBg = (p) => { const i = p * 4; return d[i + 3] < 20 || minAt(i) >= HARD; };

        // ¿El marco es mayoritariamente blanco/transparente? Si no, no es un escudo con fondo.
        let borderBg = 0, borderTotal = 0;
        for (let x = 0; x < w; x++) { borderTotal += 2; if (isBg(x)) borderBg++; if (isBg((h - 1) * w + x)) borderBg++; }
        for (let y = 0; y < h; y++) { borderTotal += 2; if (isBg(y * w)) borderBg++; if (isBg(y * w + w - 1)) borderBg++; }
        if (borderBg / borderTotal < 0.5) return null;

        // Relleno por inundación desde los bordes
        const removed = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let qh = 0, qt = 0;
        const seed = (p) => { if (!removed[p] && isBg(p)) { removed[p] = 1; queue[qt++] = p; } };
        for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
        for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
        while (qh < qt) {
            const p = queue[qh++];
            const x = p % w, y = (p / w) | 0;
            if (x > 0) seed(p - 1);
            if (x < w - 1) seed(p + 1);
            if (y > 0) seed(p - w);
            if (y < h - 1) seed(p + w);
        }

        let alreadyClean = true;
        for (let p = 0; p < w * h; p++) {
            if (removed[p]) {
                if (d[p * 4 + 3] >= 20) alreadyClean = false;
                d[p * 4 + 3] = 0;
            }
        }

        // Suavizar el contorno: píxeles claros pegados al fondo se vuelven semitransparentes
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const p = y * w + x;
                if (removed[p]) continue;
                const touches = (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) ||
                                (y > 0 && removed[p - w]) || (y < h - 1 && removed[p + w]);
                if (!touches) continue;
                const i = p * 4, m = minAt(i);
                if (m >= SOFT) d[i + 3] = Math.round(d[i + 3] * Math.max(0, Math.min(1, (255 - m) / (255 - SOFT))));
            }
        }

        // Recortar al contorno visible
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (d[(y * w + x) * 4 + 3] > 16) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) return null; // imagen vacía: no tocar
        const pad = 2;
        minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
        maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
        const trimmed = !(minX === 0 && minY === 0 && maxX === w - 1 && maxY === h - 1);
        if (alreadyClean && !trimmed && scale === 1) return null;

        ctx.putImageData(imgData, 0, 0);
        const out = document.createElement('canvas');
        out.width = maxX - minX + 1; out.height = maxY - minY + 1;
        out.getContext('2d').drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
        return out.toDataURL('image/png');
    }

    function cleanCrestDataURL(src) {
        if (!src) return Promise.resolve(src);
        if (done.has(src)) return Promise.resolve(done.get(src));
        if (pending.has(src)) return pending.get(src);
        const job = loadImage(src)
            .then((img) => {
                let result = src;
                try { result = processImage(img) || src; } catch (e) { result = src; }
                done.set(src, result);
                cleanedSrcs.add(result);
                return result;
            })
            .catch(() => { done.set(src, src); return src; })
            .finally(() => pending.delete(src));
        pending.set(src, job);
        return job;
    }
    window.cleanCrestDataURL = cleanCrestDataURL;

    function isCandidate(img) {
        if (!img || img.tagName !== 'IMG') return false;
        const src = img.getAttribute('src') || '';
        if (!src || cleanedSrcs.has(src)) return false;
        if (img.closest(EXCLUDE)) return false;
        return src.startsWith('data:image/') || src.includes('/escudos/') || src.includes('escudo');
    }

    function handleImg(img) {
        if (!isCandidate(img)) return;
        const src = img.getAttribute('src');
        img.classList.add('crest-img');
        // Si ya está en caché se cambia antes de pintar: sin parpadeo del fondo blanco
        if (done.has(src)) {
            const res = done.get(src);
            if (res !== src) img.setAttribute('src', res);
            return;
        }
        img.style.visibility = 'hidden';
        cleanCrestDataURL(src).then((res) => {
            if (img.getAttribute('src') === src && res !== src) img.setAttribute('src', res);
            img.style.visibility = '';
        });
    }

    function scan(root) {
        if (!root || root.nodeType !== 1) return;
        if (root.tagName === 'IMG') { handleImg(root); return; }
        root.querySelectorAll('img').forEach(handleImg);
    }

    function start() {
        scan(document.body);
        new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'attributes') handleImg(m.target);
                else m.addedNodes.forEach(scan);
            }
        }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();
