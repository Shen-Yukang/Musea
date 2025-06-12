import { createRoot } from 'react-dom/client';
import App from '@src/App';
// @ts-expect-error Because file doesn't exist before build
import tailwindcssOutput from '../dist/tailwind-output.css?inline';

// Check extension context validity before mounting
function isExtensionContextValid(): boolean {
  try {
    // Check if chrome runtime is available and has valid ID
    return !!chrome?.runtime?.id;
  } catch (error) {
    console.warn('Extension context check failed:', error);
    return false;
  }
}

// Only proceed if extension context is valid
if (!isExtensionContextValid()) {
  console.warn('Extension context is not valid, skipping content-ui initialization');
} else {
  try {
    const root = document.createElement('div');
    root.id = 'chrome-extension-boilerplate-react-vite-content-view-root';

    document.body.append(root);

    const rootIntoShadow = document.createElement('div');
    rootIntoShadow.id = 'shadow-root';

    const shadowRoot = root.attachShadow({ mode: 'open' });

    if (navigator.userAgent.includes('Firefox')) {
      /**
       * In the firefox environment, adoptedStyleSheets cannot be used due to the bug
       * @url https://bugzilla.mozilla.org/show_bug.cgi?id=1770592
       *
       * Injecting styles into the document, this may cause style conflicts with the host page
       */
      const styleElement = document.createElement('style');
      styleElement.innerHTML = tailwindcssOutput;
      shadowRoot.appendChild(styleElement);
    } else {
      /** Inject styles into shadow dom */
      const globalStyleSheet = new CSSStyleSheet();
      globalStyleSheet.replaceSync(tailwindcssOutput);
      shadowRoot.adoptedStyleSheets = [globalStyleSheet];
    }

    shadowRoot.appendChild(rootIntoShadow);
    createRoot(rootIntoShadow).render(<App />);

    console.log('Content UI initialized successfully');
  } catch (error) {
    console.error('Error initializing content UI:', error);
    // Clean up if initialization fails
    const existingRoot = document.getElementById('chrome-extension-boilerplate-react-vite-content-view-root');
    if (existingRoot) {
      existingRoot.remove();
    }
  }
}
