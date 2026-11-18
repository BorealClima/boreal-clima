/* Boreal Clima · service worker: deixa o app abrir sem internet */
const V = "boreal-v3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)); }
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.hostname.endsWith("supabase.co") || u.hostname.endsWith("supabase.in")) return; // dados: sempre direto
  if (r.mode === "navigate") {
    // página: tenta a versão mais nova; sem internet, usa a guardada
    e.respondWith(Promise.race([fetch(r), timeout(5000)]).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put("./index.html", cp)); }
      return res;
    }).catch(() => caches.match("./index.html").then(h => h || caches.match("./"))));
    return;
  }
  // arquivos (ícones, fontes, biblioteca): guardado primeiro, atualiza por trás
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => {
      if (res && (res.ok || res.type === "opaque")) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
