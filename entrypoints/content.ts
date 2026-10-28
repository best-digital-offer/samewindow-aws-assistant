import { detectAwsError } from '../shared/detection';

export default defineContentScript({
  matches: ['https://console.aws.amazon.com/*', 'https://*.console.aws.amazon.com/*'],
  runAt: 'document_idle',
  main() {
    let last = '';
    let queued = false;
    const scan = () => {
      queued = false;
      const candidates = Array.from(document.querySelectorAll('[role="alert"], [role="status"], .awsui_flashbar, .awsui-alert, [data-testid*="error" i]'));
      const text = candidates.map(n => n.textContent || '').join('\n').slice(0, 5000);
      const found = detectAwsError(text, location.origin + location.pathname);
      if (found && found.message !== last) {
        last = found.message;
        browser.runtime.sendMessage({ type: 'AWS_ASSISTANT_ERROR_DETECTED', error: found }).catch(() => undefined);
        browser.storage.local.get(['investigations']).then(state => {
          const list = Array.isArray(state.investigations) ? state.investigations : [];
          browser.storage.local.set({ investigations: [found, ...list].slice(0, 50) });
        });
      }
    };
    const schedule = () => { if (!queued) { queued = true; queueMicrotask(scan); } };
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
    schedule();
  },
});