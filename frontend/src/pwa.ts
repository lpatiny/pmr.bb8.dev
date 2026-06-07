import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Register the service worker and keep it up to date. With `autoUpdate` a new
 * worker activates and reloads the page on its own; on top of that we poll for
 * a new version every hour and whenever the tab becomes visible again, so a
 * long-lived (kiosk-style) tab never gets stuck on an old build.
 */
export function setupServiceWorker(): void {
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      setInterval(() => {
        void registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update();
        }
      });
    },
    onNeedRefresh() {
      void updateSW(true);
    },
  });
}
