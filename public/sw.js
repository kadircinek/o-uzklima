// LifeOS service worker: push bildirimleri ve bildirim düğmeleri.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let yuk;
  try {
    yuk = event.data.json();
  } catch {
    yuk = { baslik: "LifeOS", govde: event.data.text(), url: "/", etiket: "lifeos" };
  }
  const actions = yuk.aksiyon
    ? [
        { action: "bitti", title: "Bitti" },
        { action: "ertele", title: "Ertele" },
        { action: "ac", title: "Aç" },
      ]
    : [];
  event.waitUntil(
    self.registration.showNotification(yuk.baslik || "LifeOS", {
      body: yuk.govde || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: yuk.etiket || undefined,
      renotify: Boolean(yuk.etiket),
      data: { url: yuk.url || "/", aksiyon: yuk.aksiyon || null },
      actions,
    }),
  );
});

async function pencereAc(url) {
  const hedef = new URL(url, self.location.origin).href;
  const pencereler = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const p of pencereler) {
    if (new URL(p.url).origin === self.location.origin && "focus" in p) {
      await p.focus();
      if ("navigate" in p) return p.navigate(hedef);
      return;
    }
  }
  return self.clients.openWindow(hedef);
}

self.addEventListener("notificationclick", (event) => {
  const { url, aksiyon } = event.notification.data || {};
  event.notification.close();

  if ((event.action === "bitti" || event.action === "ertele") && aksiyon) {
    event.waitUntil(
      fetch("/api/push/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...aksiyon, aksiyon: event.action }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return self.registration.showNotification(event.action === "bitti" ? "Tamamlandı ✓" : "Yarına ertelendi", {
            body: event.notification.body,
            tag: event.notification.tag,
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-96.png",
            silent: true,
          });
        })
        .catch(() => pencereAc(url || "/")),
    );
    return;
  }

  event.waitUntil(pencereAc(url || "/"));
});
