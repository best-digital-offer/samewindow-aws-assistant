export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.storage.local.get(['cloudAnalysisConsent','autoOpenPanel','notifications']).then(state => {
      browser.storage.local.set({ cloudAnalysisConsent: state.cloudAnalysisConsent ?? false, autoOpenPanel: state.autoOpenPanel ?? true, notifications: state.notifications ?? false });
    });
  });
  // Detection messages are intentionally handled without notifications until
  // a packaged icon and a Firefox-specific notification UX are added.
});