/**
 * 动态脚本生成器 - 根据配置生成可注入的DOM监听脚本
 */

import type { DOMActionConfig, SiteDOMConfig } from '@extension/storage';

export interface DynamicScriptConfig {
  selectors: string[];
  actions: DOMActionConfig[];
  options?: {
    observeAttributes?: boolean;
    useImportant?: boolean;
    debounceDelay?: number;
    enableLogging?: boolean;
    retryInterval?: number;
    maxRetries?: number;
  };
}

/**
 * 生成动态DOM监听脚本
 */
export function generateDynamicScript(config: DynamicScriptConfig): string {
  const { selectors, actions, options = {} } = config;

  const {
    observeAttributes = true,
    useImportant = true,
    debounceDelay = 100,
    enableLogging = true,
    retryInterval = 1000,
    maxRetries = 5,
  } = options;

  return `
(function() {
  'use strict';
  
  // 配置参数
  const CONFIG = {
    selectors: ${JSON.stringify(selectors)},
    actions: ${JSON.stringify(actions)},
    observeAttributes: ${observeAttributes},
    useImportant: ${useImportant},
    debounceDelay: ${debounceDelay},
    enableLogging: ${enableLogging},
    retryInterval: ${retryInterval},
    maxRetries: ${maxRetries}
  };
  
  // 日志函数
  const log = CONFIG.enableLogging ? 
    (msg) => console.log('[Dynamic DOM Script]', msg) : 
    () => {};
  
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
  
  // 生成CSS样式规则
  function generateCSSRules() {
    const rules = [];
    
    CONFIG.actions.forEach(action => {
      if (action.enabled && action.selector) {
        switch (action.type) {
          case 'hide':
            rules.push(\`\${action.selector} { display: none !important; }\`);
            break;
          case 'fade':
            const opacity = action.params?.opacity || 0.3;
            rules.push(\`\${action.selector} { opacity: \${opacity} !important; }\`);
            break;
          case 'blur':
            const blurLevel = action.params?.blurLevel || 5;
            rules.push(\`\${action.selector} { filter: blur(\${blurLevel}px) !important; }\`);
            break;
          case 'grayscale':
            rules.push(\`\${action.selector} { filter: grayscale(100%) !important; }\`);
            break;
        }
      }
    });
    
    return rules.join('\\n');
  }
  
  // 注入全局样式
  function injectGlobalStyles() {
    const existingStyle = document.getElementById('dynamic-dom-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'dynamic-dom-styles';
    style.innerHTML = generateCSSRules();
    document.head.appendChild(style);
    
    log('Global styles injected');
  }
  
  // 强制应用DOM操作
  function forceApplyActions() {
    let processedCount = 0;
    
    CONFIG.actions.forEach(action => {
      if (!action.enabled) return;
      
      const elements = document.querySelectorAll(action.selector);
      elements.forEach(element => {
        const htmlElement = element;
        
        // 检查是否需要处理
        if (htmlElement.dataset.dynamicDomProcessed === 'true') {
          // 检查是否被重置
          let needsReapply = false;
          
          switch (action.type) {
            case 'hide':
              needsReapply = htmlElement.style.display !== 'none';
              break;
            case 'fade':
              const expectedOpacity = (action.params?.opacity || 0.3).toString();
              needsReapply = htmlElement.style.opacity !== expectedOpacity;
              break;
            case 'blur':
              needsReapply = !htmlElement.style.filter.includes('blur');
              break;
            case 'grayscale':
              needsReapply = !htmlElement.style.filter.includes('grayscale');
              break;
          }
          
          if (!needsReapply) return;
        }
        
        // 应用操作
        const priority = CONFIG.useImportant ? 'important' : '';
        
        switch (action.type) {
          case 'hide':
            htmlElement.style.setProperty('display', 'none', priority);
            break;
          case 'fade':
            const opacity = action.params?.opacity || 0.3;
            htmlElement.style.setProperty('opacity', opacity.toString(), priority);
            break;
          case 'blur':
            const blurLevel = action.params?.blurLevel || 5;
            htmlElement.style.setProperty('filter', \`blur(\${blurLevel}px)\`, priority);
            break;
          case 'grayscale':
            htmlElement.style.setProperty('filter', 'grayscale(100%)', priority);
            break;
          case 'remove':
            htmlElement.remove();
            break;
          case 'custom_css':
            if (action.styles) {
              Object.entries(action.styles).forEach(([property, value]) => {
                htmlElement.style.setProperty(property, value, priority);
              });
            }
            break;
        }
        
        // 标记已处理
        htmlElement.dataset.dynamicDomProcessed = 'true';
        htmlElement.dataset.dynamicDomAction = action.type;
        processedCount++;
      });
    });
    
    if (processedCount > 0) {
      log(\`Applied actions to \${processedCount} elements\`);
    }
    
    return processedCount;
  }
  
  // 防抖的强制应用函数
  const debouncedForceApply = debounce(forceApplyActions, CONFIG.debounceDelay);
  
  // 设置MutationObserver
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let hasRelevantChanges = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          // 检查新增节点
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node;
              
              // 检查是否匹配目标选择器
              CONFIG.actions.forEach(action => {
                if (action.enabled) {
                  try {
                    if (element.matches && element.matches(action.selector)) {
                      hasRelevantChanges = true;
                    } else if (element.querySelector && element.querySelector(action.selector)) {
                      hasRelevantChanges = true;
                    }
                  } catch (e) {
                    // 忽略选择器错误
                  }
                }
              });
            }
          });
        } else if (mutation.type === 'attributes' && CONFIG.observeAttributes) {
          // 检查属性变化
          const target = mutation.target;
          if (target.dataset && target.dataset.dynamicDomProcessed === 'true') {
            if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
              hasRelevantChanges = true;
            }
          }
        }
      });
      
      if (hasRelevantChanges) {
        debouncedForceApply();
      }
    });
    
    const observeOptions = {
      childList: true,
      subtree: true
    };
    
    if (CONFIG.observeAttributes) {
      observeOptions.attributes = true;
      observeOptions.attributeFilter = ['style', 'class'];
    }
    
    observer.observe(document.documentElement, observeOptions);
    
    // 保存观察器引用
    window.__dynamicDomObserver = observer;
    
    log('MutationObserver setup complete');
  }
  
  // 智能重试机制
  function setupRetryMechanism() {
    let retryCount = 0;
    
    function scheduleRetry() {
      if (retryCount >= CONFIG.maxRetries) {
        log('Max retry attempts reached');
        return;
      }
      
      setTimeout(() => {
        const processedCount = forceApplyActions();
        
        if (processedCount === 0) {
          retryCount++;
          log(\`Retry #\${retryCount}, no elements found\`);
          scheduleRetry();
        } else {
          log(\`Retry #\${retryCount + 1} successful, found \${processedCount} elements\`);
        }
      }, CONFIG.retryInterval * (retryCount + 1)); // 递增延迟
    }
    
    // 初始延迟后开始重试
    setTimeout(scheduleRetry, 2000);
  }
  
  // 清理函数
  function cleanup() {
    // 清理样式
    const style = document.getElementById('dynamic-dom-styles');
    if (style) {
      style.remove();
    }
    
    // 清理观察器
    if (window.__dynamicDomObserver) {
      window.__dynamicDomObserver.disconnect();
      window.__dynamicDomObserver = null;
    }
    
    log('Cleanup complete');
  }
  
  // 暴露控制接口
  window.__dynamicDomController = {
    forceApply: forceApplyActions,
    cleanup: cleanup,
    getConfig: () => CONFIG
  };
  
  // 初始化
  function init() {
    log('Initializing dynamic DOM script');
    
    // 等待DOM准备
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectGlobalStyles();
        forceApplyActions();
        setupMutationObserver();
        setupRetryMechanism();
      });
    } else {
      injectGlobalStyles();
      forceApplyActions();
      setupMutationObserver();
      setupRetryMechanism();
    }
    
    log('Dynamic DOM script initialized');
  }
  
  // 启动
  init();
  
})();
`;
}

/**
 * 从站点配置生成动态脚本配置
 */
export function createScriptConfigFromSiteConfig(siteConfig: SiteDOMConfig): DynamicScriptConfig {
  const selectors = siteConfig.actions.filter(action => action.enabled).map(action => action.selector);

  return {
    selectors,
    actions: siteConfig.actions,
    options: {
      observeAttributes: siteConfig.advanced?.monitorAttributes ?? true,
      useImportant: siteConfig.advanced?.useImportant ?? true,
      debounceDelay: 100,
      enableLogging: siteConfig.advanced?.debugMode ?? false,
      retryInterval: 1000,
      maxRetries: 5,
    },
  };
}

/**
 * 注入动态脚本到指定标签页
 */
export async function injectDynamicScript(tabId: number, config: DynamicScriptConfig): Promise<void> {
  const script = generateDynamicScript(config);

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: new Function(script),
    });

    console.log('🎯 [Dynamic Script] Successfully injected to tab:', tabId);
  } catch (error) {
    console.error('🚨 [Dynamic Script] Injection failed:', error);
    throw error;
  }
}

/**
 * 清理动态脚本
 */
export async function cleanupDynamicScript(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        if (window.__dynamicDomController) {
          window.__dynamicDomController.cleanup();
          window.__dynamicDomController = null;
        }
      },
    });

    console.log('🧹 [Dynamic Script] Cleanup complete for tab:', tabId);
  } catch (error) {
    console.warn('🧹 [Dynamic Script] Cleanup failed:', error);
  }
}
