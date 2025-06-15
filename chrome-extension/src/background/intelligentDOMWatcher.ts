/**
 * 智能DOM监听器 - 提供更优雅的动态DOM处理策略
 * 避免使用定时检测，通过事件驱动和智能观察器实现
 */

import type { DOMActionConfig, SiteDOMConfig } from '@extension/storage';

export interface IntelligentWatcherManager {
  observers: Map<string, MutationObserver>;
  intersectionObservers: Map<string, IntersectionObserver>;
  eventListeners: Map<string, () => void>;
  retryTimers: Map<string, number>;
  communicationChannel?: MessageChannel;
  cleanup(): void;
}

/**
 * 创建智能DOM监听器
 */
export function createIntelligentDOMWatcher(actions: DOMActionConfig[], advanced?: SiteDOMConfig['advanced']): string {
  return `
    // 智能DOM监听器 - 注入到页面的函数
    function setupIntelligentDOMWatcher(
      actions,
      advanced
    ) {
      console.log('🧠 [DOM Engine] Setting up intelligent DOM watcher');

      // 创建智能监听器管理器
      const watcherManager = {
        observers: new Map(),
        intersectionObservers: new Map(),
        eventListeners: new Map(),
        retryTimers: new Map(),
        communicationChannel: null,
        
        // 清理所有监听器
        cleanup() {
          this.observers.forEach(observer => observer.disconnect());
          this.intersectionObservers.forEach(observer => observer.disconnect());
          this.eventListeners.forEach((cleanup, key) => {
            cleanup();
          });
          this.retryTimers.forEach(timer => clearTimeout(timer));
          
          if (this.communicationChannel) {
            this.communicationChannel.port1.close();
            this.communicationChannel.port2.close();
          }
          
          this.observers.clear();
          this.intersectionObservers.clear();
          this.eventListeners.clear();
          this.retryTimers.clear();
        }
      };

      // 将管理器存储到全局，便于后续清理和通信
      window.__domWatcherManager = watcherManager;

      // 设置与background script的通信通道
      setupCommunicationChannel(watcherManager, actions);

      // 1. 设置基于事件的监听器
      setupEventBasedWatchers(actions, watcherManager, advanced);

      // 2. 设置基于Intersection Observer的监听器
      setupIntersectionWatchers(actions, watcherManager, advanced);

      // 3. 设置智能重试机制
      setupIntelligentRetry(actions, watcherManager, advanced);

      // 4. 设置页面生命周期监听
      setupPageLifecycleWatchers(actions, watcherManager, advanced);

      // 5. 设置框架特定的监听器
      setupFrameworkSpecificWatchers(actions, watcherManager, advanced);

      console.log('✅ [DOM Engine] Intelligent DOM watcher setup complete');
    }

    // 设置通信通道
    function setupCommunicationChannel(manager, actions) {
      // 监听来自background script的消息
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'REAPPLY_DOM_ACTIONS') {
          console.log('🔄 [DOM Engine] Received reapply request from background');
          actions.forEach(action => {
            applyDOMAction(action, 0);
          });
          sendResponse({ success: true });
          return true;
        }
        
        if (message.type === 'CLEANUP_DOM_WATCHERS') {
          console.log('🧹 [DOM Engine] Cleaning up DOM watchers');
          manager.cleanup();
          sendResponse({ success: true });
          return true;
        }
        
        return false;
      });
    }

    // 基于事件的监听器
    function setupEventBasedWatchers(actions, manager, advanced) {
      const events = ['scroll', 'resize', 'focus', 'blur', 'visibilitychange'];
      
      events.forEach(eventType => {
        const handler = debounce(() => {
          console.log(\`🔄 [DOM Engine] \${eventType} event triggered, checking DOM\`);
          actions.forEach(action => {
            applyDOMAction(action, 0);
          });
        }, 100);

        document.addEventListener(eventType, handler, { passive: true });
        
        manager.eventListeners.set(eventType, () => {
          document.removeEventListener(eventType, handler);
        });
      });

      // 监听路由变化（SPA应用）
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      const routeChangeHandler = debounce(() => {
        console.log('🔄 [DOM Engine] Route change detected, checking DOM');
        setTimeout(() => {
          actions.forEach(action => {
            applyDOMAction(action, 0);
          });
        }, 500); // 给SPA时间渲染
      }, 200);

      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        routeChangeHandler();
      };

      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        routeChangeHandler();
      };

      window.addEventListener('popstate', routeChangeHandler);

      manager.eventListeners.set('history', () => {
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
        window.removeEventListener('popstate', routeChangeHandler);
      });
    }

    // 基于Intersection Observer的监听器
    function setupIntersectionWatchers(actions, manager, advanced) {
      // 监听视口变化，当元素进入/离开视口时重新检查
      const intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            console.log('🔄 [DOM Engine] Element entered viewport, checking DOM');
            actions.forEach(action => {
              applyDOMAction(action, 0);
            });
          }
        });
      }, {
        threshold: [0, 0.1, 0.5, 1.0],
        rootMargin: '50px'
      });

      // 观察页面主要容器
      const containers = document.querySelectorAll('main, #main, .main, #content, .content, #app, .app, [data-testid*="main"], [class*="container"]');
      containers.forEach(container => {
        intersectionObserver.observe(container);
      });

      manager.intersectionObservers.set('viewport', intersectionObserver);
    }

    // 智能重试机制
    function setupIntelligentRetry(actions, manager, advanced) {
      const retryIntervals = [1000, 2000, 5000, 10000]; // 递增重试间隔
      let retryCount = 0;

      function scheduleRetry() {
        if (retryCount >= retryIntervals.length) {
          console.log('🎯 [DOM Engine] Max retry attempts reached');
          return;
        }

        const interval = retryIntervals[retryCount];
        const timer = setTimeout(() => {
          console.log(\`🔄 [DOM Engine] Intelligent retry #\${retryCount + 1}\`);
          
          let foundElements = false;
          actions.forEach(action => {
            const elements = document.querySelectorAll(action.selector);
            if (elements.length > 0) {
              foundElements = true;
              applyDOMAction(action, 0);
            }
          });

          if (!foundElements) {
            retryCount++;
            scheduleRetry();
          } else {
            console.log('🎯 [DOM Engine] Elements found, stopping retry');
          }
        }, interval);

        manager.retryTimers.set(\`retry-\${retryCount}\`, timer);
      }

      // 初始延迟后开始重试
      setTimeout(scheduleRetry, 2000);
    }

    // 页面生命周期监听
    function setupPageLifecycleWatchers(actions, manager, advanced) {
      // 监听页面可见性变化
      const visibilityHandler = () => {
        if (!document.hidden) {
          console.log('🔄 [DOM Engine] Page became visible, checking DOM');
          setTimeout(() => {
            actions.forEach(action => {
              applyDOMAction(action, 0);
            });
          }, 100);
        }
      };

      document.addEventListener('visibilitychange', visibilityHandler);
      
      manager.eventListeners.set('visibility', () => {
        document.removeEventListener('visibilitychange', visibilityHandler);
      });

      // 监听页面焦点变化
      const focusHandler = () => {
        console.log('🔄 [DOM Engine] Window focused, checking DOM');
        actions.forEach(action => {
          applyDOMAction(action, 0);
        });
      };

      window.addEventListener('focus', focusHandler);
      
      manager.eventListeners.set('focus', () => {
        window.removeEventListener('focus', focusHandler);
      });
    }

    // 框架特定的监听器
    function setupFrameworkSpecificWatchers(actions, manager, advanced) {
      // React应用监听
      if (window.React || document.querySelector('[data-reactroot]')) {
        console.log('🔄 [DOM Engine] React app detected, setting up React-specific watchers');
        
        // 监听React状态更新
        const reactUpdateHandler = debounce(() => {
          actions.forEach(action => {
            applyDOMAction(action, 0);
          });
        }, 150);

        // 使用requestAnimationFrame监听React更新
        let rafId;
        function checkReactUpdates() {
          reactUpdateHandler();
          rafId = requestAnimationFrame(checkReactUpdates);
        }
        rafId = requestAnimationFrame(checkReactUpdates);

        manager.eventListeners.set('react', () => {
          if (rafId) {
            cancelAnimationFrame(rafId);
          }
        });
      }

      // Vue应用监听
      if (window.Vue || document.querySelector('[data-v-]')) {
        console.log('🔄 [DOM Engine] Vue app detected, setting up Vue-specific watchers');
        
        // Vue的nextTick监听
        const vueUpdateHandler = debounce(() => {
          actions.forEach(action => {
            applyDOMAction(action, 0);
          });
        }, 150);

        // 监听Vue的DOM更新
        if (window.Vue && window.Vue.nextTick) {
          const originalNextTick = window.Vue.nextTick;
          window.Vue.nextTick = function(...args) {
            const result = originalNextTick.apply(this, args);
            vueUpdateHandler();
            return result;
          };

          manager.eventListeners.set('vue', () => {
            window.Vue.nextTick = originalNextTick;
          });
        }
      }
    }

    // 防抖函数
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // 执行智能监听器设置
    setupIntelligentDOMWatcher(arguments[0], arguments[1]);
  `;
}

/**
 * 通知content script重新应用DOM操作
 */
export async function notifyDOMReapply(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'REAPPLY_DOM_ACTIONS',
    });
  } catch (error) {
    console.warn('🔄 [DOM Engine] Failed to notify DOM reapply:', error);
  }
}

/**
 * 清理智能DOM监听器
 */
export async function cleanupIntelligentWatchers(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'CLEANUP_DOM_WATCHERS',
    });
  } catch (error) {
    console.warn('🧹 [DOM Engine] Failed to cleanup watchers:', error);
  }
}
