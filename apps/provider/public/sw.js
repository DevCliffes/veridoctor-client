self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "VeriDoctor", body: event.data.text() };
  }

  const title = payload.title || "VeriDoctor";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { link: payload.link || "/" },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      const channel = new BroadcastChannel("vd-push");
      channel.postMessage(payload);
      channel.close();
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return clients.openWindow(link);
    })
  );
});
