import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * @prop default_locale
 * if you want to support multiple languages, you can use the following reference
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
 *
 * @prop browser_specific_settings
 * Must be unique to your extension to upload to addons.mozilla.org
 * (you can delete if you only want a chrome extension)
 *
 * @prop permissions
 * Firefox doesn't support sidePanel (It will be deleted in manifest parser)
 *
 * @prop content_scripts
 * css: ['content.css'], // public folder
 */
const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extensionName__',
  browser_specific_settings: {
    gecko: {
      id: 'example@example.com',
      strict_min_version: '109.0',
    },
  },
  version: packageJson.version,
  description: '__MSG_extensionDescription__',
  host_permissions: ['<all_urls>'],
  permissions: ['storage', 'scripting', 'tabs', 'notifications', 'offscreen', 'nativeMessaging'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_title: 'Fuck_Brain_Concentration',
    default_popup: 'popup/index.html',
    default_icon: {
      '16': 'spring-16.png',
      '48': 'spring-48.png',
      '128': 'spring-128.png',
    },
  },
  icons: {
    '128': 'spring-128.png',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content/index.iife.js'],
    },
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      css: ['content.css'],
    },
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content-ui/index.iife.js'],
    },
  ],
  web_accessible_resources: [
    {
      resources: [
        'spring-16.png',
        'spring-48.png',
        'spring-128.png',
        'notification.mp3',
        'offscreen.html',
        'offscreen.js',
        'blocked.html',
        'blocked.js',
        'brain-guide.js',
        'tailwind.min.js',
        'chart.min.js',
        // Content scripts resources
        'content/index.iife.js',
        'content/index.iife_dev.js',
        'content/index.iife_dev.js.map',
        'content/logo.svg',
        'content-ui/index.iife.js',
        'content-ui/index.iife_dev.js',
        'content-ui/index.iife_dev.js.map',
        'content-ui/logo.svg',
        'content-runtime/index.iife.js',
        'content-runtime/index.iife.js.map',
        // HMR and development resources (critical for dev mode)
        'refresh.js',
        'hot.js',
        // CSS files
        'content.css',
        // Popup assets (in case needed)
        'popup/assets/*',
        'popup/logo_vertical.svg',
        'popup/logo_vertical_dark.svg',
      ],
      matches: ['<all_urls>'],
    },
  ],
} satisfies chrome.runtime.ManifestV3;

export default manifest;
