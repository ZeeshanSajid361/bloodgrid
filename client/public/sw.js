/**
 * Service Worker — BloodLink Web Push
 *
 * Handles incoming push events and displays system notifications.
 * Place this file in /public so it is served at the root scope.
 *
 * The sw.js must be at the root to have scope over the whole app.
 * With Vite, files in /public/ are served as-is at /.
 */

/* eslint-disable no-undef */

const CACHE_NAME = 'bloodlink-v1';

/* ── Install & Activate ─────────────────────────────────────────────────── */

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

/* ── Push event ─────────────────────────────────────────────────────────── */

self.addEventListener('push', (event) => {
  let data = { title: 'BloodLink', message: 'You have a new notification.', link: '/' };

  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch {
      data.message = event.data.text();
    }
  }

  const options = {
    body:    data.message,
    icon:    '/icon-192.png',   // place a 192×192 icon in /public/
    badge:   '/badge-72.png',   // small monochrome badge icon
    data:    { link: data.link || '/' },
    vibrate: [200, 100, 200],
    tag:     'bloodlink-notification', // replaces older notifications instead of stacking
    renotify: true,
    actions: [
      { action: 'open',    title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss'  },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/* ── Notification click ─────────────────────────────────────────────────── */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const link = event.notification.data?.link || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open, focus it and navigate.
        for (const client of windowClients) {
          if ('focus' in client) {
            client.navigate(link);
            return client.focus();
          }
        }
        // Otherwise open a new tab.
        if (self.clients.openWindow) {
          return self.clients.openWindow(link);
        }
      })
  );
});
