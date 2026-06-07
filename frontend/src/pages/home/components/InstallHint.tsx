import { useEffect, useState } from 'react';

const DISMISS_KEY = 'pmr-install-hint-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isIos(): boolean {
  const { userAgent, maxTouchPoints } = window.navigator;
  const iPhone = /iPad|iPhone|iPod/.test(userAgent);
  // iPadOS 13+ reports as a Mac ("Macintosh" UA), so detect it via the touch
  // screen to tell it apart from a real desktop Mac.
  const iPad = userAgent.includes('Macintosh') && maxTouchPoints > 1;
  return iPhone || iPad;
}

/**
 * Invite the user to pin the app to their home screen so it can be opened like
 * a native app and used offline. On Android we trigger the native install
 * prompt; on iOS (which has no prompt) we explain the Share → "Sur l'écran
 * d'accueil" steps. Hidden once installed or dismissed.
 */
export function InstallHint() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () =>
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (dismissed || isStandalone()) return null;
  if (!installPrompt && !isIos()) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="install-hint">
      {installPrompt ? (
        <button
          type="button"
          className="install-button"
          onClick={() => void installPrompt.prompt()}
        >
          Installer l’application
        </button>
      ) : (
        <p className="install-text">
          Pour garder l’application sur votre téléphone : appuyez sur{' '}
          <strong>Partager</strong>
          <span aria-hidden="true"> ⎋ </span> puis{' '}
          <strong>« Sur l’écran d’accueil »</strong>.
        </p>
      )}
      <button
        type="button"
        className="install-close"
        aria-label="Fermer"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
