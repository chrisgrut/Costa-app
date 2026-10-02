/* Offline-Speicher
   cr-<build>: App-Hülle, wird bei jedem Update ersetzt
   cr-files:   Fotos, Karten, Bilder (bleibt über Updates, geänderte Dateien werden anhand offline.json entfernt)
   cr-ext:     Kartenbibliothek, Schriften, Satellitenbilder, Google-Fotos (bleibt über Updates) */
const C = "cr-d_Ply7mk", FILES = "cr-files", EXT = "cr-ext";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(["./", "index.html", "app.enc", "manifest.webmanifest", "icons/apple-touch-icon.png"]))); });
self.addEventListener("activate", e => { e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C && k !== FILES && k !== EXT) await caches.delete(k);
  try {
    const man = await (await fetch("offline.json", {cache: "no-store"})).json(), c = await caches.open(FILES);
    const old = await c.match("__hashes__"), prev = old ? await old.json() : {};
    for (const [f, h] of Object.entries(prev)) if (man.files[f] !== h) await c.delete(new URL(f, self.registration.scope).href);
    await c.put("__hashes__", new Response(JSON.stringify(man.files)));
  } catch (_) {}
  await self.clients.claim();
})()); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url), same = u.origin === location.origin;
  if (u.hostname === "api.open-meteo.com") return;  /* Wetter immer frisch aus dem Netz */
  const fresh = same && (u.pathname.endsWith("/") || u.pathname.endsWith(".html") || u.pathname.endsWith("app.enc") || u.pathname.endsWith("offline.json"));
  if (fresh) { const key = u.origin + u.pathname; e.respondWith(fetch(u.href, {cache: "no-store", credentials: "same-origin"}).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(key, cp)); } return res; }).catch(() => caches.match(key, {ignoreSearch: true}))); return; }
  const store = same ? FILES : EXT;
  e.respondWith(caches.match(r, {ignoreVary: true}).then(hit => hit || fetch(r).then(res => { if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(store).then(c => c.put(r, cp)); } return res; })));
});
