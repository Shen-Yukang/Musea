import { blockedUrlsStorage, focusStorage } from '@extension/storage';
import { getSiteHandler, type SiteHandler, siteHandlers } from '../site-handlers.js';

export class UrlBlocker {
  private static instance: UrlBlocker;

  private constructor() {}

  static getInstance(): UrlBlocker {
    if (!UrlBlocker.instance) {
      UrlBlocker.instance = new UrlBlocker();
    }
    return UrlBlocker.instance;
  }

  /**
   * 检查并处理标签页URL
   */
  async checkTabUrl(tabId: number, url: string): Promise<void> {
    try {
      console.log('UrlBlocker: Checking tab URL:', url);

      // 获取专注状态
      const focusConfig = await focusStorage.get();
      console.log('UrlBlocker: Focus config:', focusConfig);

      if (!focusConfig.isActive) {
        console.log('UrlBlocker: Focus mode not active, skipping URL check');
        return; // 非专注模式下不进行URL检查
      }

      // 获取阻止的URL列表
      const blockedConfig = await blockedUrlsStorage.get();
      console.log('UrlBlocker: Blocked config:', blockedConfig);

      // 检查是否为完全阻止的URL
      const isBlocked = this.isUrlBlocked(url, blockedConfig.urls);
      console.log('UrlBlocker: Is blocked?', isBlocked);

      // 如果是完全阻止的URL，显示警告页面
      if (isBlocked) {
        console.log('UrlBlocker: Blocking URL:', url);
        await this.showBlockedWarning(tabId, url);
        return; // 完全阻止的URL不再继续处理....--------stop
      }

      // 检查是否为学习模式URL
      const isStudyMode = this.isUrlBlocked(url, blockedConfig.studyModeUrls);
      console.log('UrlBlocker: Is study mode?', isStudyMode);

      if (isStudyMode) {
        console.log('UrlBlocker: Applying study mode to URL:', url);
        await this.handleStudyModeUrl(tabId, url, blockedConfig.studyModeSelectors);
        return;
      }

      console.log('UrlBlocker: URL is allowed:', url);
    } catch (error) {
      console.error('Error checking tab URL:', error);
    }
  }

  /**
   * 检查URL是否被阻止
   */
  private isUrlBlocked(url: string, blockedUrls: string[]): boolean {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      console.log('UrlBlocker: Checking URL:', url);
      console.log('UrlBlocker: Domain:', domain);
      console.log('UrlBlocker: Blocked URLs list:', blockedUrls);

      const isBlocked = blockedUrls.some(blockedUrl => {
        // 清理阻止的URL，移除协议前缀
        let cleanBlockedUrl = blockedUrl.trim();

        // 如果包含协议，提取域名
        if (cleanBlockedUrl.startsWith('http://') || cleanBlockedUrl.startsWith('https://')) {
          try {
            cleanBlockedUrl = new URL(cleanBlockedUrl).hostname;
          } catch {
            // 如果解析失败，尝试手动提取
            cleanBlockedUrl = cleanBlockedUrl.replace(/^https?:\/\//, '').split('/')[0];
          }
        }

        console.log('UrlBlocker: Comparing with cleaned URL:', cleanBlockedUrl);

        // 支持通配符域名匹配
        if (cleanBlockedUrl.startsWith('*.')) {
          const wildcardDomain = cleanBlockedUrl.substring(2);
          const matches = domain.endsWith(wildcardDomain);
          console.log('UrlBlocker: Wildcard match result:', matches);
          return matches;
        }

        // 支持完整URL匹配（原始URL包含路径的情况）
        if (blockedUrl.includes('/') && !blockedUrl.startsWith('http')) {
          const matches = url.includes(blockedUrl);
          console.log('UrlBlocker: Full URL match result:', matches);
          return matches;
        }

        // 域名匹配逻辑
        // 1. 精确匹配
        const exactMatch = domain === cleanBlockedUrl;

        // 2. 子域名匹配 (www.example.com 匹配 example.com)
        const subdomainMatch = domain.endsWith('.' + cleanBlockedUrl);

        // 3. 父域名匹配 (example.com 匹配 www.example.com)
        const parentDomainMatch = cleanBlockedUrl.endsWith('.' + domain);

        // 4. 移除 www 前缀后的匹配
        const domainWithoutWww = domain.startsWith('www.') ? domain.substring(4) : domain;
        const cleanBlockedUrlWithoutWww = cleanBlockedUrl.startsWith('www.')
          ? cleanBlockedUrl.substring(4)
          : cleanBlockedUrl;
        const wwwMatch = domainWithoutWww === cleanBlockedUrlWithoutWww;

        const matches = exactMatch || subdomainMatch || parentDomainMatch || wwwMatch;

        console.log('UrlBlocker: Domain match result:', {
          domain,
          cleanBlockedUrl,
          domainWithoutWww,
          cleanBlockedUrlWithoutWww,
          exactMatch,
          subdomainMatch,
          parentDomainMatch,
          wwwMatch,
          finalResult: matches,
        });

        return matches;
      });

      console.log('UrlBlocker: Final blocking result:', isBlocked);
      return isBlocked;
    } catch (error) {
      console.error('Error checking if URL is blocked:', error);
      return false;
    }
  }

  /**
   * 显示阻止警告页面
   */
  private async showBlockedWarning(tabId: number, url: string): Promise<void> {
    try {
      const warningUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(url);
      await chrome.tabs.update(tabId, { url: warningUrl });
      console.log('Blocked URL redirected to warning page:', url);
    } catch (error) {
      console.error('Error showing blocked warning:', error);
    }
  }

  /**
   * 处理学习模式URL
   */
  private async handleStudyModeUrl(
    tabId: number,
    url: string,
    studyModeSelectors: Record<string, string[]>,
  ): Promise<void> {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      console.log('UrlBlocker: Handling study mode for URL:', url);
      console.log('UrlBlocker: Domain:', domain);

      // 首先检查是否有预设的网站处理器
      const siteHandler = getSiteHandler(url);

      if (siteHandler) {
        console.log('UrlBlocker: Found predefined site handler for domain:', siteHandler.domain);
        await this.applySiteHandler(tabId, siteHandler);
        return;
      }

      console.log('UrlBlocker: No predefined site handler found, checking user selectors');

      // 如果没有预设处理器，使用用户配置的选择器
      const selectors = studyModeSelectors[domain] || [];

      console.log('UrlBlocker: User selectors for domain:', domain, selectors);

      if (selectors.length === 0) {
        console.log('UrlBlocker: No selectors configured for study mode URL:', url);
        return;
      }

      // 注入CSS隐藏指定元素
      await this.injectHideElements(tabId, selectors);

      console.log('UrlBlocker: Study mode applied to:', url, 'with selectors:', selectors);
    } catch (error) {
      console.error('Error handling study mode URL:', error);
    }
  }

  /**
   * 注入CSS隐藏元素
   */
  private async injectHideElements(tabId: number, selectors: string[]): Promise<void> {
    try {
      const css = selectors.map(selector => `${selector} { display: none !important; }`).join('\n');

      await chrome.scripting.insertCSS({
        target: { tabId },
        css: css,
      });

      console.log('CSS injected to hide elements:', selectors);
    } catch (error) {
      console.error('Error injecting CSS:', error);
    }
  }

  /**
   * 应用网站特定处理器
   */
  private async applySiteHandler(tabId: number, siteHandler: SiteHandler): Promise<void> {
    try {
      const selectors = siteHandler.getSelectors();

      // 检查标签页状态
      const tab = await chrome.tabs.get(tabId);
      console.log('UrlBlocker: Tab status before injection:', {
        tabId,
        status: tab.status,
        url: tab.url,
        domain: siteHandler.domain,
      });

      // 如果页面还在加载，等待一下
      if (tab.status === 'loading') {
        console.log('UrlBlocker: Page is loading, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 如果有自定义处理函数，使用自定义处理函数
      if (siteHandler.getCustomHandler) {
        const customHandler = siteHandler.getCustomHandler(tabId);
        console.log('UrlBlocker: Executing custom handler for:', tabId, siteHandler.domain, selectors);

        try {
          const result = await chrome.scripting.executeScript({
            target: { tabId },
            func: customHandler,
            args: [selectors],
          });

          console.log('UrlBlocker: Script injection result:', result);
          console.log('UrlBlocker: Applied custom site handler for:', siteHandler.domain);
        } catch (injectionError) {
          console.error('UrlBlocker: Script injection failed:', injectionError);
          // 降级到CSS注入
          console.log('UrlBlocker: Falling back to CSS injection');
          await this.injectHideElements(tabId, selectors);
        }
      } else {
        // 否则使用默认的CSS隐藏方式
        await this.injectHideElements(tabId, selectors);
        console.log('UrlBlocker: Applied default site handler for:', siteHandler.domain);
      }
    } catch (error) {
      console.error('Error applying site handler:', error);
    }
  }

  /**
   * 添加阻止的URL
   */
  async addBlockedUrl(url: string): Promise<void> {
    try {
      await blockedUrlsStorage.addUrl(url);
      console.log('URL added to blocked list:', url);
    } catch (error) {
      console.error('Error adding blocked URL:', error);
      throw error;
    }
  }

  /**
   * 移除阻止的URL
   */
  async removeBlockedUrl(url: string): Promise<void> {
    try {
      await blockedUrlsStorage.removeUrl(url);
      console.log('URL removed from blocked list:', url);
    } catch (error) {
      console.error('Error removing blocked URL:', error);
      throw error;
    }
  }

  /**
   * 添加学习模式URL
   */
  async addStudyModeUrl(url: string): Promise<void> {
    try {
      await blockedUrlsStorage.addStudyModeUrl(url);
      console.log('URL added to study mode list:', url);
    } catch (error) {
      console.error('Error adding study mode URL:', error);
      throw error;
    }
  }

  /**
   * 移除学习模式URL
   */
  async removeStudyModeUrl(url: string): Promise<void> {
    try {
      await blockedUrlsStorage.removeStudyModeUrl(url);
      console.log('URL removed from study mode list:', url);
    } catch (error) {
      console.error('Error removing study mode URL:', error);
      throw error;
    }
  }

  /**
   * 获取阻止的URL列表
   */
  async getBlockedUrls(): Promise<{ urls: string[]; studyModeUrls: string[] }> {
    try {
      const config = await blockedUrlsStorage.get();
      return {
        urls: config.urls,
        studyModeUrls: config.studyModeUrls,
      };
    } catch (error) {
      console.error('Error getting blocked URLs:', error);
      return { urls: [], studyModeUrls: [] };
    }
  }

  /**
   * 初始化预设网站处理器
   * 自动将有预设处理器的网站添加到学习模式列表
   */
  async initializePredefinedSites(): Promise<void> {
    try {
      const config = await blockedUrlsStorage.get();
      console.log('UrlBlocker: Current config before initialization:', config);
      let hasChanges = false;

      // 检查每个预设网站处理器
      for (const handler of siteHandlers) {
        const domain = handler.domain;

        // 如果该域名还没有在学习模式列表中，添加它
        if (!config.studyModeUrls.includes(domain)) {
          config.studyModeUrls.push(domain);
          hasChanges = true;
          console.log('UrlBlocker: Added predefined site to study mode:', domain);
        } else {
          console.log('UrlBlocker: Predefined site already in study mode:', domain);
        }
      }

      // 如果有变化，保存配置
      if (hasChanges) {
        await blockedUrlsStorage.set(config);
        console.log('UrlBlocker: Predefined sites initialized');
      } else {
        console.log('UrlBlocker: No changes needed, all predefined sites already configured');
      }

      // 输出最终配置用于调试
      const finalConfig = await blockedUrlsStorage.get();
      console.log('UrlBlocker: Final config after initialization:', finalConfig);
    } catch (error) {
      console.error('Error initializing predefined sites:', error);
    }
  }
}
