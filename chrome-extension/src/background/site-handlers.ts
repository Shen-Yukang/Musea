/**
 * 网站特定处理模块
 */

/**
 * 网站处理器接口
 */
export interface SiteHandler {
  domain: string;
  getSelectors(): string[];
  getCustomHandler?(tabId: number): (selectors: string[]) => void;
}

/**
 * Bilibili网站处理器
 */
export const bilibiliHandler: SiteHandler = {
  domain: 'bilibili.com',
  getSelectors() {
    return ['#nav-searchform', '.center-search__bar'];
  },
  getCustomHandler(_tabId: number) {
    return function (selectors: string[]) {
      const message = '已为您屏蔽搜索功能，专注于观看学习内容';
      const backgroundColor = 'rgba(255, 105, 180, 0.8)';

      try {
        console.log('🎯 [Site Handler] Script execution started!');
        console.log('🎯 [Site Handler] Message:', message);
        console.log('🎯 [Site Handler] Background color:', backgroundColor);

        // 创建专注提醒小卡片
        function createFocusReminder(msg: string, bgColor: string) {
          const existingReminder = document.querySelector('[data-focus-reminder="true"]');
          if (existingReminder) {
            console.log('🎯 [Site Handler] Focus reminder already exists');
            return;
          }

          const focusReminder = document.createElement('div');
          focusReminder.setAttribute('data-focus-reminder', 'true');
          focusReminder.style.position = 'fixed';
          focusReminder.style.top = '70px';
          focusReminder.style.right = '10px';
          focusReminder.style.backgroundColor = bgColor;
          focusReminder.style.color = 'white';
          focusReminder.style.padding = '12px 16px';
          focusReminder.style.borderRadius = '8px';
          focusReminder.style.zIndex = '9999999';
          focusReminder.style.fontSize = '14px';
          focusReminder.style.fontFamily = 'Arial, sans-serif';
          focusReminder.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
          focusReminder.style.width = '200px';
          focusReminder.style.textAlign = 'center';

          const title = document.createElement('div');
          title.textContent = '专注提醒';
          title.style.fontWeight = 'bold';
          title.style.fontSize = '16px';
          title.style.marginBottom = '8px';
          focusReminder.appendChild(title);

          const content = document.createElement('div');
          content.textContent = msg;
          focusReminder.appendChild(content);

          document.body.appendChild(focusReminder);
          console.log('🎯 [Site Handler] Focus reminder card created');

          setTimeout(() => {
            focusReminder.style.transition = 'opacity 1s';
            focusReminder.style.opacity = '0';
            setTimeout(() => {
              if (document.body.contains(focusReminder)) {
                document.body.removeChild(focusReminder);
              }
            }, 1000);
          }, 3000);
        }

        // 处理选择器
        function applySelectors(sels: string[]) {
          sels.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(element => {
                if (element instanceof HTMLElement) {
                  element.style.display = 'none';
                  element.dataset.studyModeDisabled = 'true';
                }
              });
              console.log('🎯 [Site Handler] Disabled ' + elements.length + ' elements with selector: ' + selector);
            } catch (error) {
              console.error('🚨 [Site Handler] Error with selector ' + selector + ':', error);
            }
          });

          const observer = new MutationObserver(mutations => {
            let shouldReapply = false;
            mutations.forEach(mutation => {
              if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldReapply = true;
              }
            });

            if (shouldReapply) {
              sels.forEach(selector => {
                try {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach(element => {
                    if (element instanceof HTMLElement && !element.dataset.studyModeDisabled) {
                      element.style.display = 'none';
                      element.dataset.studyModeDisabled = 'true';
                    }
                  });
                } catch (error) {
                  console.error('🚨 [Site Handler] Mutation observer error:', error);
                }
              });
            }
          });

          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__studyModeObserver = observer;
        }

        // 执行处理
        createFocusReminder(message, backgroundColor);
        applySelectors(selectors);

        console.log('🎯 [Site Handler] Script execution completed successfully!');
      } catch (error) {
        console.error('🚨 [Site Handler] Error in script execution:', error);

        // 降级处理
        try {
          selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              if (element instanceof HTMLElement) {
                element.style.display = 'none';
              }
            });
          });
          console.log('🎯 [Site Handler] Fallback CSS hiding applied');
        } catch (fallbackError) {
          console.error('🚨 [Site Handler] Fallback also failed:', fallbackError);
        }
      }
    };
  },
};

/**
 * 百度网站处理器
 */
export const baiduHandler: SiteHandler = {
  domain: 'baidu.com',
  getSelectors() {
    return ['#s-hotsearch-wrapper', '#con-ceiling-wrapper'];
  },
  getCustomHandler(_tabId: number) {
    return function (selectors: string[]) {
      const message = '已为您屏蔽热搜和顶部导航，专注于当前任务';
      const backgroundColor = 'rgba(0, 128, 0, 0.8)';

      try {
        console.log('🎯 [Site Handler] Script execution started!');
        console.log('🎯 [Site Handler] Message:', message);
        console.log('🎯 [Site Handler] Background color:', backgroundColor);

        // 创建专注提醒小卡片
        function createFocusReminder(msg: string, bgColor: string) {
          const existingReminder = document.querySelector('[data-focus-reminder="true"]');
          if (existingReminder) {
            console.log('🎯 [Site Handler] Focus reminder already exists');
            return;
          }

          const focusReminder = document.createElement('div');
          focusReminder.setAttribute('data-focus-reminder', 'true');
          focusReminder.style.position = 'fixed';
          focusReminder.style.top = '70px';
          focusReminder.style.right = '10px';
          focusReminder.style.backgroundColor = bgColor;
          focusReminder.style.color = 'white';
          focusReminder.style.padding = '12px 16px';
          focusReminder.style.borderRadius = '8px';
          focusReminder.style.zIndex = '9999999';
          focusReminder.style.fontSize = '14px';
          focusReminder.style.fontFamily = 'Arial, sans-serif';
          focusReminder.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
          focusReminder.style.width = '200px';
          focusReminder.style.textAlign = 'center';

          const title = document.createElement('div');
          title.textContent = '专注提醒';
          title.style.fontWeight = 'bold';
          title.style.fontSize = '16px';
          title.style.marginBottom = '8px';
          focusReminder.appendChild(title);

          const content = document.createElement('div');
          content.textContent = msg;
          focusReminder.appendChild(content);

          document.body.appendChild(focusReminder);
          console.log('🎯 [Site Handler] Focus reminder card created');

          setTimeout(() => {
            focusReminder.style.transition = 'opacity 1s';
            focusReminder.style.opacity = '0';
            setTimeout(() => {
              if (document.body.contains(focusReminder)) {
                document.body.removeChild(focusReminder);
              }
            }, 1000);
          }, 3000);
        }

        // 处理选择器
        function applySelectors(sels: string[]) {
          sels.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(element => {
                if (element instanceof HTMLElement) {
                  element.style.display = 'none';
                  element.dataset.studyModeDisabled = 'true';
                }
              });
              console.log('🎯 [Site Handler] Disabled ' + elements.length + ' elements with selector: ' + selector);
            } catch (error) {
              console.error('🚨 [Site Handler] Error with selector ' + selector + ':', error);
            }
          });

          const observer = new MutationObserver(mutations => {
            let shouldReapply = false;
            mutations.forEach(mutation => {
              if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldReapply = true;
              }
            });

            if (shouldReapply) {
              sels.forEach(selector => {
                try {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach(element => {
                    if (element instanceof HTMLElement && !element.dataset.studyModeDisabled) {
                      element.style.display = 'none';
                      element.dataset.studyModeDisabled = 'true';
                    }
                  });
                } catch (error) {
                  console.error('🚨 [Site Handler] Mutation observer error:', error);
                }
              });
            }
          });

          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__studyModeObserver = observer;
        }

        // 执行处理
        createFocusReminder(message, backgroundColor);
        applySelectors(selectors);

        console.log('🎯 [Site Handler] Script execution completed successfully!');
      } catch (error) {
        console.error('🚨 [Site Handler] Error in script execution:', error);

        // 降级处理
        try {
          selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              if (element instanceof HTMLElement) {
                element.style.display = 'none';
              }
            });
          });
          console.log('🎯 [Site Handler] Fallback CSS hiding applied');
        } catch (fallbackError) {
          console.error('🚨 [Site Handler] Fallback also failed:', fallbackError);
        }
      }
    };
  },
};

/**
 * 知乎网站处理器
 */
export const zhihuHandler: SiteHandler = {
  domain: 'zhihu.com',
  getSelectors() {
    return ['.Topstory'];
  },
  getCustomHandler(_tabId: number) {
    return function (selectors: string[]) {
      const message = '已为您屏蔽热门话题推荐，专注于学习和阅读';
      const backgroundColor = 'rgba(0, 123, 255, 0.8)';

      try {
        console.log('🎯 [Site Handler] Script execution started!');
        console.log('🎯 [Site Handler] Message:', message);
        console.log('🎯 [Site Handler] Background color:', backgroundColor);

        // 创建专注提醒小卡片
        function createFocusReminder(msg: string, bgColor: string) {
          const existingReminder = document.querySelector('[data-focus-reminder="true"]');
          if (existingReminder) {
            console.log('🎯 [Site Handler] Focus reminder already exists');
            return;
          }

          const focusReminder = document.createElement('div');
          focusReminder.setAttribute('data-focus-reminder', 'true');
          focusReminder.style.position = 'fixed';
          focusReminder.style.top = '70px';
          focusReminder.style.right = '10px';
          focusReminder.style.backgroundColor = bgColor;
          focusReminder.style.color = 'white';
          focusReminder.style.padding = '12px 16px';
          focusReminder.style.borderRadius = '8px';
          focusReminder.style.zIndex = '9999999';
          focusReminder.style.fontSize = '14px';
          focusReminder.style.fontFamily = 'Arial, sans-serif';
          focusReminder.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
          focusReminder.style.width = '200px';
          focusReminder.style.textAlign = 'center';

          const title = document.createElement('div');
          title.textContent = '专注提醒';
          title.style.fontWeight = 'bold';
          title.style.fontSize = '16px';
          title.style.marginBottom = '8px';
          focusReminder.appendChild(title);

          const content = document.createElement('div');
          content.textContent = msg;
          focusReminder.appendChild(content);

          document.body.appendChild(focusReminder);
          console.log('🎯 [Site Handler] Focus reminder card created');

          setTimeout(() => {
            focusReminder.style.transition = 'opacity 1s';
            focusReminder.style.opacity = '0';
            setTimeout(() => {
              if (document.body.contains(focusReminder)) {
                document.body.removeChild(focusReminder);
              }
            }, 1000);
          }, 3000);
        }

        // 处理选择器
        function applySelectors(sels: string[]) {
          sels.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(element => {
                if (element instanceof HTMLElement) {
                  element.style.display = 'none';
                  element.dataset.studyModeDisabled = 'true';
                }
              });
              console.log('🎯 [Site Handler] Disabled ' + elements.length + ' elements with selector: ' + selector);
            } catch (error) {
              console.error('🚨 [Site Handler] Error with selector ' + selector + ':', error);
            }
          });

          const observer = new MutationObserver(mutations => {
            let shouldReapply = false;
            mutations.forEach(mutation => {
              if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldReapply = true;
              }
            });

            if (shouldReapply) {
              sels.forEach(selector => {
                try {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach(element => {
                    if (element instanceof HTMLElement && !element.dataset.studyModeDisabled) {
                      element.style.display = 'none';
                      element.dataset.studyModeDisabled = 'true';
                    }
                  });
                } catch (error) {
                  console.error('🚨 [Site Handler] Mutation observer error:', error);
                }
              });
            }
          });

          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__studyModeObserver = observer;
        }

        // 执行处理
        createFocusReminder(message, backgroundColor);
        applySelectors(selectors);

        console.log('🎯 [Site Handler] Script execution completed successfully!');
      } catch (error) {
        console.error('🚨 [Site Handler] Error in script execution:', error);

        // 降级处理
        try {
          selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              if (element instanceof HTMLElement) {
                element.style.display = 'none';
              }
            });
          });
          console.log('🎯 [Site Handler] Fallback CSS hiding applied');
        } catch (fallbackError) {
          console.error('🚨 [Site Handler] Fallback also failed:', fallbackError);
        }
      }
    };
  },
};

/**
 * 所有网站处理器的集合
 */
export const siteHandlers: SiteHandler[] = [bilibiliHandler, baiduHandler, zhihuHandler];

/**
 * 根据URL获取匹配的网站处理器
 */
export function getSiteHandler(url: string): SiteHandler | undefined {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    console.log('getSiteHandler: Checking URL:', url);
    console.log('getSiteHandler: Hostname:', hostname);

    const handler = siteHandlers.find(handler => {
      // 精确匹配
      if (hostname === handler.domain) {
        return true;
      }

      // 子域名匹配 (www.baidu.com 匹配 baidu.com)
      if (hostname.endsWith('.' + handler.domain)) {
        return true;
      }

      // 移除 www 前缀后匹配
      const hostnameWithoutWww = hostname.startsWith('www.') ? hostname.substring(4) : hostname;
      if (hostnameWithoutWww === handler.domain) {
        return true;
      }

      return false;
    });

    console.log('getSiteHandler: Found handler:', handler?.domain || 'none');
    return handler;
  } catch (error) {
    console.error('getSiteHandler: Error:', error);
    return undefined;
  }
}
