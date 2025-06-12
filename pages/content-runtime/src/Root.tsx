import { createRoot } from 'react-dom/client';
import App from '@src/App';
import injectedStyle from '@src/index.css?inline';

// Check if extension context is valid
function isExtensionContextValid(): boolean {
  try {
    return !!chrome?.runtime?.id;
  } catch (error) {
    console.warn('Extension context check failed:', error);
    return false;
  }
}

export function mount() {
  // Check if extension context is valid before mounting
  if (!isExtensionContextValid()) {
    console.warn('Extension context invalidated, skipping runtime mount');
    return;
  }

  // Check if runtime script is already mounted to avoid duplicates
  const existingRoot = document.getElementById('chrome-extension-boilerplate-react-vite-runtime-content-view-root');
  if (existingRoot) {
    console.warn('Runtime script already mounted, skipping duplicate mount');
    return;
  }

  try {
    const root = document.createElement('div');
    root.id = 'chrome-extension-boilerplate-react-vite-runtime-content-view-root';

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
      styleElement.innerHTML = injectedStyle;
      shadowRoot.appendChild(styleElement);
    } else {
      /** Inject styles into shadow dom */
      const globalStyleSheet = new CSSStyleSheet();
      globalStyleSheet.replaceSync(injectedStyle);
      shadowRoot.adoptedStyleSheets = [globalStyleSheet];
    }

    shadowRoot.appendChild(rootIntoShadow);

    try {
      createRoot(rootIntoShadow).render(<App />);
      console.log('Runtime script mounted successfully');
    } catch (renderError) {
      console.error('Error rendering runtime React app:', renderError);
      // Clean up if rendering fails
      root.remove();
    }
  } catch (mountError) {
    console.error('Error mounting runtime script:', mountError);
    // Clean up any partial DOM elements
    const partialRoot = document.getElementById('chrome-extension-boilerplate-react-vite-runtime-content-view-root');
    if (partialRoot) {
      partialRoot.remove();
    }
  }
}
