import { useEffect, useState } from 'react';
import { VirtualCharacter } from '@extension/ui';
import { ContentCharacterManager } from './characterManager';

// Extend window interface for type safety
declare global {
  interface Window {
    __EXTENSION_NAMESPACE__?: {
      characterManager?: ContentCharacterManager;
    };
  }
}

export default function App() {
  const [extensionContextValid, setExtensionContextValid] = useState(true);
  const [characterManager, setCharacterManager] = useState<ContentCharacterManager | null>(null);

  useEffect(() => {
    console.log('content ui loaded');

    let manager: ContentCharacterManager | null = null;

    // Check extension context validity
    const checkExtensionContext = () => {
      try {
        if (!chrome?.runtime?.id) {
          console.warn('Extension context is not valid');
          setExtensionContextValid(false);
          return false;
        }
        return true;
      } catch (error) {
        console.warn('Extension context check failed:', error);
        setExtensionContextValid(false);
        return false;
      }
    };

    // Only initialize if extension context is valid
    if (!checkExtensionContext()) {
      console.warn('Skipping character initialization - extension context invalid');
      return;
    }

    // Initialize character manager in content script context
    const initializeCharacterManager = async () => {
      try {
        // Double-check extension context before initialization
        if (!checkExtensionContext()) {
          console.warn('Extension context became invalid during initialization');
          return;
        }

        manager = ContentCharacterManager.getInstance();
        await manager.initialize();

        // Expose character manager in a namespaced way to avoid conflicts
        if (!window.__EXTENSION_NAMESPACE__) {
          window.__EXTENSION_NAMESPACE__ = {};
        }
        window.__EXTENSION_NAMESPACE__.characterManager = manager;

        setCharacterManager(manager);
        console.log('Character manager initialized in content script');
      } catch (error) {
        console.error('Error initializing character manager:', error);
        // If error is related to extension context, update state
        if (error instanceof Error && error.message.includes('Extension context invalidated')) {
          setExtensionContextValid(false);
        }
      }
    };

    initializeCharacterManager();

    // Cleanup function
    return () => {
      console.log('Cleaning up content UI...');

      // Cleanup character manager
      if (manager) {
        manager.destroy();
      }

      // Clear global reference
      if (window.__EXTENSION_NAMESPACE__?.characterManager) {
        delete window.__EXTENSION_NAMESPACE__.characterManager;
      }
    };
  }, []);

  // Don't render VirtualCharacter if extension context is invalid
  if (!extensionContextValid) {
    return null;
  }

  return (
    <div>
      {/* Virtual Character Component */}
      <VirtualCharacter />
    </div>
  );
}
