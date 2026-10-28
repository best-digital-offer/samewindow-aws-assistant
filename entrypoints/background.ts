export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.storage.local.get(['cloudAnalysisConsent','autoOpenPanel','notifications']).then(state => {
      browser.storage.local.set({ cloudAnalysisConsent: state.cloudAnalysisConsent ?? false, autoOpenPanel: state.autoOpenPanel ?? true, notifications: state.notifications ?? true });
    });
  });
  browser.runtime.onMessage.addListener(async (message: any) => {
    if (message?.type !== 'AWS_ASSISTANT_ERROR_DETECTED') return;
    const state = await browser.storage.local.get(['notifications']);
    if (state.notifications === false) return;
    await browser.notifications.create({ type: 'basic', iconUrl: browser.runtime.getURL('/icon/128.png'), title: 'SameWindow AWS Assistant', message: `${message.error?.service || 'AWS Console'} error detected. Open the extension to investigate.` }).catch(() => undefined);
  });
});