import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStorage } from '@extension/shared';
import { characterStorage } from '@extension/storage';
import { CharacterAvatar } from './CharacterAvatar';
import { ChatDialog } from './ChatDialog';
import { VirtualCharacterErrorBoundary } from './ErrorBoundary';
import { usePerformanceMonitor, performanceMonitor } from '../../utils/performanceMonitor';

// Extend window interface for type safety
declare global {
  interface Window {
    __EXTENSION_NAMESPACE__?: {
      characterManager?: {
        handleCharacterClick: () => Promise<void>;
        sendMessage: (message: string, type: 'text' | 'voice') => Promise<void>;
        executeTask: (taskId: string, query: string) => Promise<void>;
      };
      errorReporter?: {
        report: (error: Error, context: { component: string; errorInfo?: React.ErrorInfo }) => void;
      };
    };
  }
}

// Character state type (matching the service)
type CharacterState = {
  isVisible: boolean;
  isAnimating: boolean;
  isChatOpen: boolean;
  currentAnimation: string;
  position: { x: number; y: number };
};

type VirtualCharacterProps = {
  className?: string;
};

const VirtualCharacterCore: React.FC<VirtualCharacterProps> = ({ className }) => {
  const config = useStorage(characterStorage);
  const [characterState, setCharacterState] = useState<CharacterState>({
    isVisible: false,
    isAnimating: false,
    isChatOpen: false,
    currentAnimation: 'idle',
    position: { x: 0, y: 0 },
  });
  const [extensionContextValid, setExtensionContextValid] = useState(true);

  // Memoize animation duration calculation
  const getAnimationDuration = useCallback((animation: string): number => {
    const durations: Record<string, number> = {
      idle: 2000,
      greeting: 3000,
      thinking: 4000,
      speaking: 2000,
      celebrating: 5000,
      encouraging: 4000,
      sleeping: 6000,
    };
    return durations[animation] || 2000;
  }, []);

  // Memoize character size calculation
  const characterSize = useMemo(() => {
    const sizes = {
      small: 48,
      medium: 60,
      large: 72,
    };
    return sizes[config.appearance.size] || 60;
  }, [config.appearance.size]);

  // Memoize position calculation
  const calculatePosition = useCallback(() => {
    const padding = 20;

    switch (config.appearance.position) {
      case 'bottom-right':
        return {
          x: window.innerWidth - characterSize - padding,
          y: window.innerHeight - characterSize - padding,
        };
      case 'bottom-left':
        return {
          x: padding,
          y: window.innerHeight - characterSize - padding,
        };
      case 'top-right':
        return {
          x: window.innerWidth - characterSize - padding,
          y: padding,
        };
      case 'top-left':
        return {
          x: padding,
          y: padding,
        };
      default:
        return {
          x: window.innerWidth - characterSize - padding,
          y: window.innerHeight - characterSize - padding,
        };
    }
  }, [config.appearance.position, characterSize]);

  // Memoize animation function with proper cleanup
  const playAnimation = useCallback(
    (animation: string) => {
      setCharacterState(prev => ({
        ...prev,
        isAnimating: true,
        currentAnimation: animation,
      }));

      const duration = getAnimationDuration(animation);
      const timeoutId = setTimeout(() => {
        setCharacterState(prev => ({
          ...prev,
          isAnimating: false,
          currentAnimation: 'idle',
        }));
      }, duration);

      return timeoutId;
    },
    [getAnimationDuration],
  );

  // Check extension context validity with proper cleanup
  useEffect(() => {
    const checkExtensionContext = () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
          setExtensionContextValid(true);
        } else {
          setExtensionContextValid(false);
          console.warn('Extension context is not valid');
        }
      } catch (error) {
        setExtensionContextValid(false);
        console.warn('Extension context check failed:', error);
      }
    };

    checkExtensionContext();

    // Check periodically with better responsiveness
    const interval = setInterval(checkExtensionContext, 2000);

    // Listen for chrome runtime disconnect
    if (chrome?.runtime?.onConnect) {
      chrome.runtime.onConnect.addListener(() => {
        setExtensionContextValid(true);
      });
    }

    return () => {
      clearInterval(interval);
    };
  }, []);

  const showCharacter = useCallback(async () => {
    try {
      const position = calculatePosition();

      setCharacterState(prev => ({
        ...prev,
        isVisible: true,
        position,
      }));

      // Play greeting animation
      setTimeout(() => {
        playAnimation('greeting');
      }, 100);

      console.log('Virtual character shown');
    } catch (error) {
      console.error('Error showing character:', error);
    }
  }, [calculatePosition, playAnimation]);

  const hideCharacter = useCallback(async () => {
    try {
      setCharacterState(prev => ({
        ...prev,
        isVisible: false,
        isChatOpen: false,
      }));

      console.log('Virtual character hidden');
    } catch (error) {
      console.error('Error hiding character:', error);
    }
  }, []);

  const initializeCharacter = useCallback(async () => {
    try {
      if (config.enabled) {
        await showCharacter();
      }
    } catch (error) {
      console.error('Error initializing character:', error);
    }
  }, [config.enabled, showCharacter]);

  // Update character position using memoized calculation
  const updateCharacterPosition = useCallback(() => {
    const newPosition = calculatePosition();
    setCharacterState(prev => ({
      ...prev,
      position: newPosition,
    }));
  }, [calculatePosition]);

  // Initialize character when component mounts
  useEffect(() => {
    if (!extensionContextValid) {
      console.warn('Skipping character initialization - extension context invalid');
      return;
    }

    initializeCharacter();

    // Listen for character state changes from the service
    const handleStateChange = (event: CustomEvent) => {
      setCharacterState(event.detail);
    };

    window.addEventListener('characterStateChange', handleStateChange as EventListener);

    return () => {
      window.removeEventListener('characterStateChange', handleStateChange as EventListener);
    };
  }, [extensionContextValid, initializeCharacter]);

  // Update character visibility when config changes
  useEffect(() => {
    if (config.enabled && !characterState.isVisible) {
      showCharacter();
    } else if (!config.enabled && characterState.isVisible) {
      hideCharacter();
    }
  }, [config.enabled, characterState.isVisible, showCharacter, hideCharacter]);

  // Update character position when config changes
  useEffect(() => {
    if (characterState.isVisible) {
      updateCharacterPosition();
    }
  }, [config.appearance.position, config.appearance.size, characterState.isVisible, updateCharacterPosition]);

  const handleCharacterClick = async () => {
    try {
      // 尝试使用角色管理器，如果不可用则使用本地处理
      const characterManager = await ensureCharacterManagerAvailable();

      if (characterManager) {
        await characterManager.handleCharacterClick();
      } else {
        // Fallback: local handling
        console.warn('[CHARACTER] Character manager not available, using local handling');
        await characterStorage.updateLastInteraction();

        if (characterState.isChatOpen) {
          handleCloseChatDialog();
        } else {
          handleOpenChatDialog();
        }
      }
    } catch (error) {
      console.error('Error handling character click:', error);
      // 即使出错也要尝试本地处理
      try {
        await characterStorage.updateLastInteraction();
        if (characterState.isChatOpen) {
          handleCloseChatDialog();
        } else {
          handleOpenChatDialog();
        }
      } catch (fallbackError) {
        console.error('Fallback handling also failed:', fallbackError);
      }
    }
  };

  // 确保角色管理器可用的函数
  const ensureCharacterManagerAvailable = async (): Promise<any> => {
    // 检查是否已经存在
    let characterManager = window.__EXTENSION_NAMESPACE__?.characterManager;
    if (characterManager && typeof characterManager.handleCharacterClick === 'function') {
      return characterManager;
    }

    // 如果不存在，尝试等待一段时间（可能正在初始化）
    console.log('[CHARACTER] Character manager not immediately available, waiting...');

    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1))); // 递增等待时间

      characterManager = window.__EXTENSION_NAMESPACE__?.characterManager;
      if (characterManager && typeof characterManager.handleCharacterClick === 'function') {
        console.log(`[CHARACTER] Character manager became available after ${attempt + 1} attempts`);
        return characterManager;
      }
    }

    // 如果还是不可用，检查是否需要注入content-runtime
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        console.log('[CHARACTER] Attempting to request character manager initialization...');

        // 发送消息给background script，请求确保character manager可用
        const response = await new Promise(resolve => {
          chrome.runtime.sendMessage({ type: 'ENSURE_CHARACTER_MANAGER' }, response => {
            if (chrome.runtime.lastError) {
              console.error('[CHARACTER] Error requesting character manager:', chrome.runtime.lastError);
              resolve(null);
            } else {
              resolve(response);
            }
          });
        });

        if (response) {
          // 再次等待一下，看character manager是否可用了
          await new Promise(resolve => setTimeout(resolve, 500));
          characterManager = window.__EXTENSION_NAMESPACE__?.characterManager;
          if (characterManager) {
            console.log('[CHARACTER] Character manager available after initialization request');
            return characterManager;
          }
        }
      } catch (error) {
        console.error('[CHARACTER] Error during character manager initialization:', error);
      }
    }

    console.warn('[CHARACTER] Character manager still not available after all attempts');
    return null;
  };

  const handleOpenChatDialog = async () => {
    try {
      setCharacterState(prev => ({
        ...prev,
        isChatOpen: true,
      }));

      // Play greeting animation
      playAnimation('greeting');

      console.log('Chat dialog opened');
    } catch (error) {
      console.error('Error opening chat dialog:', error);
    }
  };

  const handleCloseChatDialog = async () => {
    try {
      setCharacterState(prev => ({
        ...prev,
        isChatOpen: false,
      }));

      console.log('Chat dialog closed');
    } catch (error) {
      console.error('Error closing chat dialog:', error);
    }
  };

  const handleSendMessage = async (message: string, type: 'text' | 'voice' = 'text') => {
    try {
      // Send message through character manager if available
      const characterManager = window.__EXTENSION_NAMESPACE__?.characterManager;
      if (typeof window !== 'undefined' && characterManager) {
        await characterManager.sendMessage(message, type);
      } else {
        // Fallback: simple local handling
        playAnimation('thinking');
        await new Promise(resolve => setTimeout(resolve, 1000));
        playAnimation('speaking');
        console.log('Message sent:', message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTaskExecute = async (taskId: string, query: string) => {
    try {
      // Execute task through character manager if available
      const characterManager = window.__EXTENSION_NAMESPACE__?.characterManager;
      if (typeof window !== 'undefined' && characterManager) {
        await characterManager.executeTask(taskId, query);
      } else {
        console.log('Task execution requested:', { taskId, query });
      }
    } catch (error) {
      console.error('Error executing task:', error);
    }
  };

  // Handle window resize to update character position
  useEffect(() => {
    const handleResize = () => {
      if (characterState.isVisible) {
        updateCharacterPosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [characterState.isVisible, updateCharacterPosition]);

  // Don't render anything if character is not enabled or extension context is invalid
  if (!config.enabled || !extensionContextValid) {
    return null;
  }

  return (
    <div className={className}>
      {/* Character Avatar */}
      <CharacterAvatar onCharacterClick={handleCharacterClick} characterState={characterState} />

      {/* Chat Dialog */}
      <ChatDialog
        isOpen={characterState.isChatOpen}
        onClose={handleCloseChatDialog}
        onSendMessage={handleSendMessage}
        onTaskExecute={handleTaskExecute}
        characterPosition={characterState.position}
      />
    </div>
  );
};

// Export the component wrapped with Error Boundary
export const VirtualCharacter: React.FC<VirtualCharacterProps> = props => {
  return (
    <VirtualCharacterErrorBoundary
      onError={(error, errorInfo) => {
        // Log to extension error reporting system
        console.error('VirtualCharacter Error Boundary:', error, errorInfo);

        // Report to extension namespace if available
        if (typeof window !== 'undefined' && window.__EXTENSION_NAMESPACE__?.errorReporter) {
          window.__EXTENSION_NAMESPACE__.errorReporter.report(error, {
            component: 'VirtualCharacter',
            errorInfo,
          });
        }
      }}
      maxRetries={3}>
      <VirtualCharacterCore {...props} />
    </VirtualCharacterErrorBoundary>
  );
};
