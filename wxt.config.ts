import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'SameWindow AWS Assistant',
    description: 'Detects visible AWS Console errors locally and supports consent-based investigations.',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://console.aws.amazon.com/*', 'https://*.console.aws.amazon.com/*'],
    browser_specific_settings: { gecko: { id: 'aws-assistant@samewindow.com', strict_min_version: '128.0' } },
    sidebar_action: { default_title: 'SameWindow AWS Assistant', default_panel: 'sidebar.html', open_at_install: false },
  },
});