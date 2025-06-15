/**
 * DOM操作引擎
 * 负责执行各种DOM操作和动画
 */

import type { DOMActionConfig, DOMActionType, SiteDOMConfig } from '@extension/storage';
import { createIntelligentDOMWatcher, cleanupIntelligentWatchers } from './intelligentDOMWatcher.js';
import {
  createScriptConfigFromSiteConfig,
  injectDynamicScript,
  cleanupDynamicScript,
} from './dynamicScriptGenerator.js';

export class DOMEngine {
  private static injectedStyles = new Map<number, Set<string>>(); // 按tabId存储注入的样式
  private static appliedConfigs = new Map<number, string>(); // 按tabId存储已应用的配置域名
  private static debounceTimers = new Map<number, NodeJS.Timeout>(); // 防抖定时器
  private static configHashes = new Map<number, string>(); // 按tabId存储配置哈希，用于检测配置变化

  /**
   * 生成配置哈希，用于检测配置变化
   */
  private static generateConfigHash(siteConfig: SiteDOMConfig): string {
    const configString = JSON.stringify({
      domain: siteConfig.domain,
      enabled: siteConfig.enabled,
      actions: siteConfig.actions,
      advanced: siteConfig.advanced,
      reminder: siteConfig.reminder,
    });

    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString();
  }

  /**
   * 应用网站DOM配置
   */
  static async applySiteConfig(tabId: number, siteConfig: SiteDOMConfig): Promise<void> {
    if (!siteConfig.enabled) {
      console.log('🎯 [DOM Engine] Site config disabled for:', siteConfig.domain);
      return;
    }

    // 检查是否使用动态脚本模式
    if (siteConfig.advanced?.useDynamicScript) {
      await this.applyDynamicScript(tabId, siteConfig);
      return;
    }

    // 生成当前配置的哈希
    const currentConfigHash = this.generateConfigHash(siteConfig);
    const lastConfigHash = this.configHashes.get(tabId);
    const lastAppliedDomain = this.appliedConfigs.get(tabId);

    // 检查是否需要重新应用配置
    const needsReapply = lastAppliedDomain !== siteConfig.domain || lastConfigHash !== currentConfigHash;

    if (!needsReapply) {
      console.log('🎯 [DOM Engine] Config unchanged for:', siteConfig.domain);
      return;
    }

    if (lastConfigHash !== currentConfigHash) {
      console.log('🔄 [DOM Engine] Config changed, reapplying for:', siteConfig.domain);
    } else {
      console.log('🎯 [DOM Engine] Applying site config for:', siteConfig.domain);
    }

    // 清除之前的防抖定时器
    const existingTimer = this.debounceTimers.get(tabId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置防抖，避免短时间内重复执行
    const timer = setTimeout(async () => {
      try {
        // 注入样式
        await this.injectStyles(tabId);

        // 执行DOM操作
        const enabledActions = siteConfig.actions.filter(action => action.enabled);

        if (enabledActions.length === 0) {
          console.log('🎯 [DOM Engine] No enabled actions for:', siteConfig.domain);
          return;
        }

        // 创建执行函数
        const executeFunction = this.createExecuteFunction(enabledActions, siteConfig.reminder, siteConfig.advanced);

        // 执行脚本
        await chrome.scripting.executeScript({
          target: { tabId },
          func: executeFunction,
          args: [enabledActions, siteConfig.reminder, siteConfig.advanced],
        });

        // 记录已应用的配置和哈希
        this.appliedConfigs.set(tabId, siteConfig.domain);
        this.configHashes.set(tabId, currentConfigHash);
        console.log('🎯 [DOM Engine] Successfully applied config for:', siteConfig.domain);
      } catch (error) {
        console.error('🚨 [DOM Engine] Error applying site config:', error);

        // 降级处理：使用简单的隐藏
        await this.fallbackHideElements(
          tabId,
          siteConfig.actions.map(a => a.selector),
        );
      } finally {
        // 清理防抖定时器
        this.debounceTimers.delete(tabId);
      }
    }, 300); // 300ms防抖

    this.debounceTimers.set(tabId, timer);
  }

  /**
   * 应用动态脚本模式
   */
  private static async applyDynamicScript(tabId: number, siteConfig: SiteDOMConfig): Promise<void> {
    console.log('🎯 [DOM Engine] Using dynamic script mode for:', siteConfig.domain);

    try {
      // 先清理现有的动态脚本
      await cleanupDynamicScript(tabId);

      // 生成脚本配置
      const scriptConfig = createScriptConfigFromSiteConfig(siteConfig);

      // 注入动态脚本
      await injectDynamicScript(tabId, scriptConfig);

      // 记录已应用的配置
      this.appliedConfigs.set(tabId, siteConfig.domain);
      const currentConfigHash = this.generateConfigHash(siteConfig);
      this.configHashes.set(tabId, currentConfigHash);

      console.log('🎯 [DOM Engine] Dynamic script applied successfully for:', siteConfig.domain);
    } catch (error) {
      console.error('🚨 [DOM Engine] Dynamic script application failed:', error);

      // 降级到传统模式
      console.log('🔄 [DOM Engine] Falling back to traditional mode');
      await this.applyTraditionalMode(tabId, siteConfig);
    }
  }

  /**
   * 传统模式（原有的实现）
   */
  private static async applyTraditionalMode(tabId: number, siteConfig: SiteDOMConfig): Promise<void> {
    // 生成当前配置的哈希
    const currentConfigHash = this.generateConfigHash(siteConfig);
    const lastConfigHash = this.configHashes.get(tabId);
    const lastAppliedDomain = this.appliedConfigs.get(tabId);

    // 检查是否需要重新应用配置
    const needsReapply = lastAppliedDomain !== siteConfig.domain || lastConfigHash !== currentConfigHash;

    if (!needsReapply) {
      console.log('🎯 [DOM Engine] Config unchanged for:', siteConfig.domain);
      return;
    }

    if (lastConfigHash !== currentConfigHash) {
      console.log('🔄 [DOM Engine] Config changed, reapplying for:', siteConfig.domain);
    } else {
      console.log('🎯 [DOM Engine] Applying site config for:', siteConfig.domain);
    }

    // 清除之前的防抖定时器
    const existingTimer = this.debounceTimers.get(tabId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置防抖，避免短时间内重复执行
    const timer = setTimeout(async () => {
      try {
        // 注入样式
        await this.injectStyles(tabId);

        // 执行DOM操作
        const enabledActions = siteConfig.actions.filter(action => action.enabled);

        if (enabledActions.length === 0) {
          console.log('🎯 [DOM Engine] No enabled actions for:', siteConfig.domain);
          return;
        }

        // 创建执行函数
        const executeFunction = this.createExecuteFunction(enabledActions, siteConfig.reminder, siteConfig.advanced);

        // 执行脚本
        await chrome.scripting.executeScript({
          target: { tabId },
          func: executeFunction,
          args: [enabledActions, siteConfig.reminder, siteConfig.advanced],
        });

        // 记录已应用的配置和哈希
        this.appliedConfigs.set(tabId, siteConfig.domain);
        this.configHashes.set(tabId, currentConfigHash);
        console.log('🎯 [DOM Engine] Successfully applied config for:', siteConfig.domain);
      } catch (error) {
        console.error('🚨 [DOM Engine] Error applying site config:', error);

        // 降级处理：使用简单的隐藏
        await this.fallbackHideElements(
          tabId,
          siteConfig.actions.map(a => a.selector),
        );
      } finally {
        // 清理防抖定时器
        this.debounceTimers.delete(tabId);
      }
    }, 300); // 300ms防抖

    this.debounceTimers.set(tabId, timer);
  }

  /**
   * 注入必要的CSS样式
   */
  private static async injectStyles(tabId: number): Promise<void> {
    const styleId = 'dom-engine-styles';

    // 检查该标签页是否已注入样式
    const tabStyles = this.injectedStyles.get(tabId) || new Set();
    if (tabStyles.has(styleId)) {
      return;
    }

    const css = `
      /* DOM Engine Animations */
      @keyframes domSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(-100%); opacity: 0; }
      }
      
      @keyframes domScaleDown {
        from { transform: scale(1); opacity: 1; }
        to { transform: scale(0.1); opacity: 0; }
      }
      
      @keyframes domFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      .dom-engine-hidden {
        display: none !important;
      }
      
      .dom-engine-blurred {
        filter: blur(5px);
        transition: filter 0.3s ease;
      }
      
      .dom-engine-faded {
        opacity: 0.3;
        transition: opacity 0.3s ease;
      }
      
      .dom-engine-grayscale {
        filter: grayscale(100%);
        transition: filter 0.3s ease;
      }
      
      .dom-engine-overlay {
        position: relative;
      }
      
      .dom-engine-overlay::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        pointer-events: none;
        z-index: 1000;
      }
      
      .dom-engine-slide-out {
        animation: domSlideOut 0.5s ease-out forwards;
      }
      
      .dom-engine-scale-down {
        animation: domScaleDown 0.4s ease-in forwards;
      }
      
      .dom-engine-fade-out {
        animation: domFadeOut 0.3s ease-in-out forwards;
      }
    `;

    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        css,
      });

      // 记录该标签页已注入的样式
      const tabStyles = this.injectedStyles.get(tabId) || new Set();
      tabStyles.add(styleId);
      this.injectedStyles.set(tabId, tabStyles);
      console.log('🎯 [DOM Engine] Styles injected successfully for tab:', tabId);
    } catch (error) {
      console.error('🚨 [DOM Engine] Failed to inject styles:', error);
    }
  }

  /**
   * 创建执行函数
   */
  private static createExecuteFunction(
    actions: DOMActionConfig[],
    reminder?: SiteDOMConfig['reminder'],
    advanced?: SiteDOMConfig['advanced'],
  ) {
    return function (
      actionsParam: DOMActionConfig[],
      reminderParam?: SiteDOMConfig['reminder'],
      advancedParam?: SiteDOMConfig['advanced'],
    ) {
      console.log('🎯 [DOM Engine] Executing DOM operations:', actionsParam);

      // 创建专注提醒
      if (reminderParam?.enabled) {
        createFocusReminder(reminderParam.message, reminderParam.backgroundColor);
      }

      // 应用DOM操作
      applyDOMActions(actionsParam, advancedParam);

      // 设置DOM变化监听器
      if (advancedParam?.observeChanges) {
        setupMutationObserver(actionsParam, advancedParam);
      }

      // 设置智能DOM监听器 - 新增功能
      if (advancedParam?.enableIntelligentWatcher !== false) {
        eval(createIntelligentDOMWatcher(actionsParam, advancedParam));
      }

      // 内部函数：创建专注提醒
      function createFocusReminder(message: string, backgroundColor: string) {
        const existingReminder = document.querySelector('[data-focus-reminder="true"]');
        if (existingReminder) {
          console.log('🎯 [DOM Engine] Focus reminder already exists');
          return;
        }

        const reminder = document.createElement('div');
        reminder.setAttribute('data-focus-reminder', 'true');
        reminder.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: ${backgroundColor};
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10000;
          max-width: 300px;
          animation: slideIn 0.3s ease-out;
        `;
        reminder.textContent = message;

        document.body.appendChild(reminder);

        // 5秒后自动移除
        setTimeout(() => {
          if (reminder.parentNode) {
            reminder.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => reminder.remove(), 300);
          }
        }, 5000);
      }

      // 内部函数：应用DOM操作
      function applyDOMActions(actions: DOMActionConfig[], advanced?: SiteDOMConfig['advanced']) {
        const delay = advanced?.applyDelay || 500; // 增加默认延迟

        // 等待页面加载完成
        function waitForPageReady(callback: () => void) {
          if (document.readyState === 'complete') {
            callback();
          } else if (document.readyState === 'interactive') {
            // DOM已加载，但资源可能还在加载
            setTimeout(callback, delay);
          } else {
            // 页面还在加载
            document.addEventListener('DOMContentLoaded', () => {
              setTimeout(callback, delay);
            });
          }
        }

        waitForPageReady(() => {
          actions.forEach(action => {
            try {
              applyDOMAction(action, 0); // 从重试计数0开始
            } catch (error) {
              console.error('🚨 [DOM Engine] Error applying action:', action, error);
            }
          });
        });
      }

      // 内部函数：应用单个DOM操作
      function applyDOMAction(action: DOMActionConfig, retryCount = 0) {
        const elements = document.querySelectorAll(action.selector);

        if (elements.length === 0) {
          if (retryCount < 3) {
            console.log(
              `🎯 [DOM Engine] No elements found for selector: ${action.selector}, retrying in 500ms (attempt ${retryCount + 1}/3)`,
            );
            setTimeout(() => applyDOMAction(action, retryCount + 1), 500);
            return;
          } else {
            console.warn(`🎯 [DOM Engine] No elements found for selector after 3 retries: ${action.selector}`);
            return;
          }
        }

        console.log(`🎯 [DOM Engine] Applying ${action.type} to ${elements.length} elements:`, action.selector);

        elements.forEach(element => {
          const htmlElement = element as HTMLElement;

          // 标记元素已处理
          htmlElement.dataset.domEngineProcessed = 'true';
          htmlElement.dataset.domEngineAction = action.type;

          // 根据配置决定是否使用!important
          const useImportant = advancedParam?.useImportant ? 'important' : '';

          switch (action.type) {
            case 'hide':
              htmlElement.style.setProperty('display', 'none', useImportant);
              break;

            case 'blur':
              const blurLevel = action.params?.blurLevel || 5;
              htmlElement.style.setProperty('filter', `blur(${blurLevel}px)`, useImportant);
              if (action.animation?.duration) {
                htmlElement.style.transition = `filter ${action.animation.duration}ms ${action.animation.easing || 'ease'}`;
              }
              break;

            case 'fade':
              const opacity = action.params?.opacity || 0.3;
              htmlElement.style.setProperty('opacity', opacity.toString(), useImportant);
              if (action.animation?.duration) {
                htmlElement.style.transition = `opacity ${action.animation.duration}ms ${action.animation.easing || 'ease'}`;
              }
              break;

            case 'remove':
              htmlElement.remove();
              break;

            case 'slide_out':
              htmlElement.classList.add('dom-engine-slide-out');
              break;

            case 'scale_down':
              htmlElement.classList.add('dom-engine-scale-down');
              break;

            case 'grayscale':
              htmlElement.style.setProperty('filter', 'grayscale(100%)', useImportant);
              if (action.animation?.duration) {
                htmlElement.style.transition = `filter ${action.animation.duration}ms ${action.animation.easing || 'ease'}`;
              }
              break;

            case 'overlay':
              htmlElement.classList.add('dom-engine-overlay');
              break;

            case 'custom_css':
              if (action.styles) {
                Object.entries(action.styles).forEach(([property, value]) => {
                  htmlElement.style.setProperty(property, value, useImportant);
                });
              }
              break;

            default:
              // 默认隐藏
              htmlElement.style.setProperty('display', 'none', useImportant);
          }
        });
      }

      // 内部函数：设置增强版变化监听器
      function setupMutationObserver(actions: DOMActionConfig[], advanced?: SiteDOMConfig['advanced']) {
        // 清理现有的观察器
        const existingObserver = (window as any).__domEngineObserver;
        if (existingObserver) {
          existingObserver.disconnect();
        }

        // 创建选择器缓存，提高性能
        const selectorCache = new Map();
        actions.forEach(action => {
          try {
            // 预编译选择器，检查语法
            document.querySelector(action.selector);
            selectorCache.set(action.selector, action);
          } catch (e) {
            console.warn('🚨 [DOM Engine] Invalid selector:', action.selector);
          }
        });

        // 防抖处理，避免频繁触发
        let debounceTimer: NodeJS.Timeout | null = null;
        let pendingChanges = new Set();

        const observer = new MutationObserver(mutations => {
          let hasRelevantChanges = false;
          const relevantMutations = [];

          // 第一阶段：快速筛选相关变化
          mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
              // 检查新添加的节点
              if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;

                    // 使用缓存的选择器进行快速匹配
                    for (const [selector, action] of selectorCache) {
                      try {
                        if (element.matches && element.matches(selector)) {
                          hasRelevantChanges = true;
                          pendingChanges.add(action);
                          relevantMutations.push({ type: 'directMatch', element, action });
                        } else if (element.querySelector && element.querySelector(selector)) {
                          hasRelevantChanges = true;
                          pendingChanges.add(action);
                          relevantMutations.push({ type: 'childMatch', element, action });
                        }
                      } catch (e) {
                        // 忽略选择器错误
                      }
                    }
                  }
                });
              }

              // 检查被移除的节点（可能需要重新检查父容器）
              if (mutation.removedNodes.length > 0) {
                mutation.removedNodes.forEach(node => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;
                    if (element.dataset && element.dataset.domEngineProcessed === 'true') {
                      // 被处理过的元素被移除，可能需要检查是否有新的匹配元素
                      hasRelevantChanges = true;
                      relevantMutations.push({ type: 'processedElementRemoved', element });
                    }
                  }
                });
              }
            } else if (mutation.type === 'attributes') {
              // 检查属性变化是否影响我们处理过的元素
              const target = mutation.target as HTMLElement;

              if (target.dataset.domEngineProcessed === 'true') {
                const actionType = target.dataset.domEngineAction;
                let needsReapply = false;

                // 检查不同类型的样式重置
                if (mutation.attributeName === 'style') {
                  switch (actionType) {
                    case 'hide':
                      needsReapply = target.style.display !== 'none';
                      break;
                    case 'fade':
                      const expectedOpacity = target.dataset.domEngineOpacity || '0.3';
                      needsReapply = target.style.opacity !== expectedOpacity;
                      break;
                    case 'blur':
                      needsReapply = !target.style.filter.includes('blur');
                      break;
                    case 'grayscale':
                      needsReapply = !target.style.filter.includes('grayscale');
                      break;
                  }
                } else if (mutation.attributeName === 'class') {
                  // 检查CSS类是否被移除
                  const requiredClasses = [
                    'dom-engine-hidden',
                    'dom-engine-blurred',
                    'dom-engine-faded',
                    'dom-engine-grayscale',
                  ];
                  needsReapply = requiredClasses.some(
                    cls => target.dataset.domEngineRequiredClass === cls && !target.classList.contains(cls),
                  );
                }

                if (needsReapply) {
                  hasRelevantChanges = true;
                  relevantMutations.push({ type: 'styleReset', element: target, actionType });
                  console.log(`🎯 [DOM Engine] Detected ${actionType} style reset on element`);
                }
              }
            }
          });

          if (hasRelevantChanges) {
            // 清除之前的定时器
            if (debounceTimer) {
              clearTimeout(debounceTimer);
            }

            // 设置新的防抖定时器，使用智能延迟
            const delay = relevantMutations.length > 10 ? 100 : 50; // 大量变化时增加延迟
            debounceTimer = setTimeout(() => {
              console.log(`🎯 [DOM Engine] Processing ${relevantMutations.length} relevant mutations`);

              // 第二阶段：智能处理相关变化
              const processedElements = new Set();

              // 优先处理直接匹配的元素
              relevantMutations
                .filter(m => m.type === 'directMatch')
                .forEach(mutation => {
                  try {
                    applyDOMAction(mutation.action, 0);
                    processedElements.add(mutation.action.selector);
                  } catch (error) {
                    console.error('🚨 [DOM Engine] Error applying direct match:', error);
                  }
                });

              // 处理子元素匹配
              relevantMutations
                .filter(m => m.type === 'childMatch')
                .forEach(mutation => {
                  if (!processedElements.has(mutation.action.selector)) {
                    try {
                      applyDOMAction(mutation.action, 0);
                      processedElements.add(mutation.action.selector);
                    } catch (error) {
                      console.error('🚨 [DOM Engine] Error applying child match:', error);
                    }
                  }
                });

              // 处理样式重置
              relevantMutations
                .filter(m => m.type === 'styleReset')
                .forEach(mutation => {
                  try {
                    const action = actions.find(a => a.type === mutation.actionType);
                    if (action) {
                      // 直接重新应用到特定元素
                      applyActionToElement(mutation.element, action);
                    }
                  } catch (error) {
                    console.error('🚨 [DOM Engine] Error reapplying reset style:', error);
                  }
                });

              // 处理未直接匹配的待处理操作
              pendingChanges.forEach(action => {
                if (!processedElements.has(action.selector)) {
                  try {
                    applyDOMAction(action, 0);
                  } catch (error) {
                    console.error('🚨 [DOM Engine] Error applying pending action:', error);
                  }
                }
              });

              // 清理状态
              pendingChanges.clear();
              debounceTimer = null;

              console.log('✅ [DOM Engine] Mutation processing complete');
            }, delay);
          }
        });

        // 根据配置决定观察选项
        const observeOptions: MutationObserverInit = {
          childList: true,
          subtree: true,
        };

        // 如果启用了属性监听，添加属性观察
        if (advanced?.monitorAttributes) {
          observeOptions.attributes = true;
          observeOptions.attributeFilter = ['style', 'class'];
        }

        observer.observe(document.documentElement, observeOptions);

        // 保存观察器引用
        (window as any).__domEngineObserver = observer;

        // 设置持久性检查（如果启用）
        if (advanced?.persistentMode && advanced?.persistentInterval && advanced.persistentInterval > 0) {
          setupPersistentCheck(actions, advanced);
        }

        // 辅助函数：直接对特定元素应用操作
        function applyActionToElement(element: HTMLElement, action: DOMActionConfig) {
          // 标记元素已处理
          element.dataset.domEngineProcessed = 'true';
          element.dataset.domEngineAction = action.type;

          // 根据配置决定是否使用!important
          const useImportant = advancedParam?.useImportant ? 'important' : '';

          switch (action.type) {
            case 'hide':
              element.style.setProperty('display', 'none', useImportant);
              break;

            case 'blur':
              const blurLevel = action.params?.blurLevel || 5;
              element.style.setProperty('filter', `blur(${blurLevel}px)`, useImportant);
              if (action.animation?.duration) {
                element.style.transition = `filter ${action.animation.duration}ms ${action.animation.easing || 'ease'}`;
              }
              break;

            case 'fade':
              const opacity = action.params?.opacity || 0.3;
              element.style.setProperty('opacity', opacity.toString(), useImportant);
              element.dataset.domEngineOpacity = opacity.toString(); // 保存期望的透明度
              if (action.animation?.duration) {
                element.style.transition = `opacity ${action.animation.duration}ms ${action.animation.easing || 'ease'}`;
              }
              break;

            case 'remove':
              element.remove();
              break;

            case 'slide_out':
              element.classList.add('dom-engine-slide-out');
              element.dataset.domEngineRequiredClass = 'dom-engine-slide-out';
              break;

            case 'scale_down':
              element.classList.add('dom-engine-scale-down');
              element.dataset.domEngineRequiredClass = 'dom-engine-scale-down';
              break;

            case 'grayscale':
              element.style.setProperty('filter', 'grayscale(100%)', useImportant);
              if (action.animation?.duration) {
                element.style.transition = `filter ${action.animation.duration}ms ${action.animation.easing || 'ease'}`;
              }
              break;

            case 'overlay':
              element.classList.add('dom-engine-overlay');
              element.dataset.domEngineRequiredClass = 'dom-engine-overlay';
              break;

            case 'custom_css':
              if (action.styles) {
                Object.entries(action.styles).forEach(([property, value]) => {
                  element.style.setProperty(property, value, useImportant);
                });
              }
              break;

            default:
              // 默认隐藏
              element.style.setProperty('display', 'none', useImportant);
          }
        }
      }

      // 内部函数：设置持久性检查
      function setupPersistentCheck(actions: DOMActionConfig[], advanced: SiteDOMConfig['advanced']) {
        // 清理现有的定时器
        const existingTimer = (window as any).__domEnginePersistentTimer;
        if (existingTimer) {
          clearInterval(existingTimer);
        }

        const timer = setInterval(() => {
          let reappliedCount = 0;

          actions.forEach(action => {
            try {
              const elements = document.querySelectorAll(action.selector);
              elements.forEach(element => {
                const htmlElement = element as HTMLElement;

                // 检查元素是否需要重新应用样式
                let needsReapply = false;
                const useImportant = advanced?.useImportant ? 'important' : '';

                switch (action.type) {
                  case 'hide':
                    if (htmlElement.style.display !== 'none') {
                      htmlElement.style.setProperty('display', 'none', useImportant);
                      needsReapply = true;
                    }
                    break;
                  case 'fade':
                    const expectedOpacity = (action.params?.opacity || 0.3).toString();
                    if (htmlElement.style.opacity !== expectedOpacity) {
                      htmlElement.style.setProperty('opacity', expectedOpacity, useImportant);
                      needsReapply = true;
                    }
                    break;
                  case 'blur':
                    const expectedBlur = `blur(${action.params?.blurLevel || 5}px)`;
                    if (!htmlElement.style.filter.includes('blur')) {
                      htmlElement.style.setProperty('filter', expectedBlur, useImportant);
                      needsReapply = true;
                    }
                    break;
                  case 'grayscale':
                    if (!htmlElement.style.filter.includes('grayscale')) {
                      htmlElement.style.setProperty('filter', 'grayscale(100%)', useImportant);
                      needsReapply = true;
                    }
                    break;
                }

                if (needsReapply) {
                  htmlElement.dataset.domEngineProcessed = 'true';
                  htmlElement.dataset.domEngineAction = action.type;
                  reappliedCount++;
                }
              });
            } catch (error) {
              console.error('🚨 [DOM Engine] Persistent check error:', error);
            }
          });

          if (reappliedCount > 0) {
            console.log(`🛡️ [DOM Engine] Persistent check: reapplied styles to ${reappliedCount} elements`);
          }
        }, advanced?.persistentInterval || 1000);

        // 保存定时器引用
        (window as any).__domEnginePersistentTimer = timer;
        console.log(`🛡️ [DOM Engine] Persistent check enabled, interval: ${advanced?.persistentInterval}ms`);
      }
    };
  }

  /**
   * 清理标签页相关状态
   */
  static cleanupTab(tabId: number): void {
    this.injectedStyles.delete(tabId);
    this.appliedConfigs.delete(tabId);
    const timer = this.debounceTimers.get(tabId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(tabId);
    }

    // 清理智能DOM监听器
    cleanupIntelligentWatchers(tabId).catch(error => {
      console.warn('🧹 [DOM Engine] Failed to cleanup intelligent watchers:', error);
    });

    // 在页面中清理持久性定时器和观察器
    try {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // 清理持久性定时器
          const persistentTimer = (window as any).__domEnginePersistentTimer;
          if (persistentTimer) {
            clearInterval(persistentTimer);
            (window as any).__domEnginePersistentTimer = null;
          }

          // 清理观察器
          const observer = (window as any).__domEngineObserver;
          if (observer) {
            observer.disconnect();
            (window as any).__domEngineObserver = null;
          }

          // 清理智能监听器管理器
          const watcherManager = (window as any).__domWatcherManager;
          if (watcherManager && typeof watcherManager.cleanup === 'function') {
            watcherManager.cleanup();
            (window as any).__domWatcherManager = null;
          }
        },
      });
    } catch (error) {
      // 忽略清理错误（标签页可能已关闭）
    }

    console.log('🎯 [DOM Engine] Cleaned up tab:', tabId);
  }

  /**
   * 降级处理：简单隐藏元素
   */
  private static async fallbackHideElements(tabId: number, selectors: string[]): Promise<void> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (sels: string[]) => {
          sels.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(element => {
                if (element instanceof HTMLElement) {
                  element.style.display = 'none';
                }
              });
            } catch (error) {
              console.error('🚨 [DOM Engine] Fallback error with selector:', selector, error);
            }
          });
        },
        args: [selectors],
      });

      console.log('🎯 [DOM Engine] Fallback hiding applied');
    } catch (error) {
      console.error('🚨 [DOM Engine] Fallback also failed:', error);
    }
  }
}
