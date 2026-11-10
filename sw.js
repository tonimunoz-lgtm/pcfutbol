// Service worker mínimo: red primero y copia de respaldo (solo mismo origen).
// Firebase y otros dominios externos NO se tocan. Sube CACHE al publicar una versión nueva.
const CACHE = 'pcf-static-2026-11-08-r38';
const CORE = ['./', './index.html', './style.css', './pcf6-theme.css', './pcf-mobile.css', './pcf-pwa.css', './pcf-mobile-fixes.css', './pcf-menu-theme.css', './manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(
    caches.open(CACHE)
        .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null))))   // un fallo suelto no cancela la instalación
        .then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
    const r = e.request;
    if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
    e.respondWith(fetch(r).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
        return res;
    }).catch(() => caches.match(r).then(hit => hit || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
