import { blockedUrlsStorage, focusStorage, domConfigStorage, visitMonitorStorage } from '@extension/storage';
import { getSiteHandler, type SiteHandler, siteHandlers } from '../site-handlers.js';
import { DOMEngine } from '../domEngine.js';

export class UrlBlocker {
  private static instance: UrlBlocker;
  private visitStartTimes: Map<string, number> = new Map(); // 记录访问开始时间

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

      // 记录访问开始时间
      const tabKey = `${tabId}-${url}`;
      this.visitStartTimes.set(tabKey, Date.now());

      // 获取阻止的URL列表
      const blockedConfig = await blockedUrlsStorage.get();
      console.log('UrlBlocker: Blocked config:', blockedConfig);

      // 检查是否为被监控的URL（阻止列表或学习模式列表）
      const isBlocked = this.isUrlBlocked(url, blockedConfig.urls);
      const isStudyMode = this.isUrlBlocked(url, blockedConfig.studyModeUrls);
      const isMonitored = isBlocked || isStudyMode;

      // 如果是被监控的URL，立即记录访问并检查阈值（不管专注模式是否开启）
      if (isMonitored) {
        console.log('UrlBlocker: Monitored URL detected, recording visit:', url);
        await this.recordVisitForMonitoring(url, isBlocked);

        // 检查是否超过阈值，如果超过则直接跳转到深呼吸页面
        const thresholdCheck = await visitMonitorStorage.checkThreshold(url);
        if (thresholdCheck.exceeded) {
          console.log('UrlBlocker: Threshold exceeded, redirecting to deep breathing page:', thresholdCheck.reason);
          await this.showDeepBreathingPage(tabId, url, thresholdCheck.reason);
          return; // 已经处理，直接返回
        }
      }

      // 获取专注状态
      const focusConfig = await focusStorage.get();
      console.log('UrlBlocker: Focus config:', focusConfig);

      if (!focusConfig.isActive) {
        console.log('UrlBlocker: Focus mode not active, skipping URL blocking');
        return; // 非专注模式下不进行URL阻止，但已经记录了访问
      }

      // 专注模式下的URL处理
      console.log('UrlBlocker: Is blocked?', isBlocked);
      console.log('UrlBlocker: Is study mode?', isStudyMode);

      // 如果是完全阻止的URL，检查阈值并显示相应页面
      if (isBlocked) {
        console.log('UrlBlocker: Blocking URL:', url);
        await this.handleBlockedUrlWithThreshold(tabId, url);
        return;
      }

      // 如果是学习模式URL，应用DOM修改
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

        // 域名匹配逻辑 - 更严格的匹配规则
        // 1. 精确匹配
        const exactMatch = domain === cleanBlockedUrl;

        // 2. 子域名匹配 (sub.example.com 匹配 example.com)
        // 只有当前域名是真正的子域名时才匹配，排除www前缀情况
        const subdomainMatch =
          domain.endsWith('.' + cleanBlockedUrl) && domain !== cleanBlockedUrl && !domain.startsWith('www.');

        // 3. www前缀匹配 - 只在特定情况下允许
        // 当配置的是无www版本，当前访问的是www版本时匹配
        // 或者当配置的是www版本，当前访问的是无www版本时匹配
        let wwwMatch = false;
        if (domain.startsWith('www.') && !cleanBlockedUrl.startsWith('www.')) {
          // 当前是www版本，配置是无www版本
          wwwMatch = domain.substring(4) === cleanBlockedUrl;
        } else if (!domain.startsWith('www.') && cleanBlockedUrl.startsWith('www.')) {
          // 当前是无www版本，配置是www版本
          wwwMatch = domain === cleanBlockedUrl.substring(4);
        }

        const matches = exactMatch || subdomainMatch || wwwMatch;

        console.log('UrlBlocker: Domain match result:', {
          domain,
          cleanBlockedUrl,
          exactMatch,
          subdomainMatch,
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
   * 记录访问用于监控（不管专注模式是否开启）
   */
  private async recordVisitForMonitoring(url: string, isBlocked: boolean): Promise<void> {
    try {
      // 记录访问（初始时长为1秒，确保统计正确更新）
      await visitMonitorStorage.recordVisit(url, 1000, isBlocked);
      console.log('UrlBlocker: Visit recorded for monitoring:', url);
    } catch (error) {
      console.error('Error recording visit for monitoring:', error);
    }
  }

  /**
   * 处理被阻止的URL并检查阈值
   */
  private async handleBlockedUrlWithThreshold(tabId: number, url: string): Promise<void> {
    try {
      // 检查是否超过阈值
      const thresholdCheck = await visitMonitorStorage.checkThreshold(url);

      if (thresholdCheck.exceeded) {
        console.log('UrlBlocker: Threshold exceeded, redirecting to deep breathing page:', thresholdCheck.reason);
        await this.showDeepBreathingPage(tabId, url, thresholdCheck.reason);
      } else {
        // 正常显示阻止页面
        await this.showBlockedWarning(tabId, url);
      }
    } catch (error) {
      console.error('Error handling blocked URL with threshold:', error);
      // 出错时显示正常阻止页面
      await this.showBlockedWarning(tabId, url);
    }
  }

  /**
   * 记录访问并检查阈值（保留用于兼容性）
   */
  private async recordVisitAndCheckThreshold(tabId: number, url: string, isBlocked: boolean): Promise<void> {
    try {
      // 计算访问时长
      const tabKey = `${tabId}-${url}`;
      const startTime = this.visitStartTimes.get(tabKey) || Date.now();
      const duration = Date.now() - startTime;

      // 记录访问
      await visitMonitorStorage.recordVisit(url, duration, isBlocked);

      // 检查是否超过阈值
      const thresholdCheck = await visitMonitorStorage.checkThreshold(url);

      if (thresholdCheck.exceeded) {
        console.log('UrlBlocker: Threshold exceeded, redirecting to deep breathing page:', thresholdCheck.reason);
        await this.showDeepBreathingPage(tabId, url, thresholdCheck.reason);
      } else {
        // 正常显示阻止页面
        await this.showBlockedWarning(tabId, url);
      }

      // 清理访问时间记录
      this.visitStartTimes.delete(tabKey);
    } catch (error) {
      console.error('Error recording visit and checking threshold:', error);
      // 出错时显示正常阻止页面
      await this.showBlockedWarning(tabId, url);
    }
  }

  /**
   * 显示深呼吸页面
   */
  private async showDeepBreathingPage(tabId: number, url: string, reason: string): Promise<void> {
    try {
      const breathingUrl =
        chrome.runtime.getURL('deep-breathing.html') +
        '?url=' +
        encodeURIComponent(url) +
        '&reason=' +
        encodeURIComponent(reason);
      await chrome.tabs.update(tabId, { url: breathingUrl });
      console.log('Redirected to deep breathing page:', url, reason);
    } catch (error) {
      console.error('Error showing deep breathing page:', error);
      // 出错时显示正常阻止页面
      await this.showBlockedWarning(tabId, url);
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

      // 首先检查DOM配置系统
      const domConfig = await domConfigStorage.get();

      if (domConfig.globalSettings.enabled) {
        const siteConfig = domConfig.sites.find(site => {
          let configDomain = site.domain;

          // 如果配置的域名包含协议，提取纯域名
          if (configDomain.startsWith('http://') || configDomain.startsWith('https://')) {
            try {
              configDomain = new URL(configDomain).hostname;
            } catch {
              // 如果URL解析失败，手动提取域名
              configDomain = configDomain.replace(/^https?:\/\//, '').split('/')[0];
            }
          }

          // 移除末尾的斜杠
          configDomain = configDomain.replace(/\/$/, '');

          // 使用与UrlBlocker一致的严格匹配逻辑
          // 1. 精确匹配
          const exactMatch = domain === configDomain;

          // 2. 子域名匹配 (sub.example.com 匹配 example.com)
          // 只有当前域名是真正的子域名时才匹配，排除www前缀情况
          const subdomainMatch =
            domain.endsWith('.' + configDomain) && domain !== configDomain && !domain.startsWith('www.');

          // 3. www前缀匹配
          let wwwMatch = false;
          if (domain.startsWith('www.') && !configDomain.startsWith('www.')) {
            // 当前是www版本，配置是无www版本
            wwwMatch = domain.substring(4) === configDomain;
          } else if (!domain.startsWith('www.') && configDomain.startsWith('www.')) {
            // 当前是无www版本，配置是www版本
            wwwMatch = domain === configDomain.substring(4);
          }

          return exactMatch || subdomainMatch || wwwMatch;
        });

        if (siteConfig && siteConfig.enabled) {
          console.log('UrlBlocker: Found DOM config for domain:', siteConfig.domain);
          await DOMEngine.applySiteConfig(tabId, siteConfig);
          return;
        }
      }

      // 降级到预设的网站处理器
      const siteHandler = getSiteHandler(url);

      if (siteHandler) {
        console.log('UrlBlocker: Found predefined site handler for domain:', siteHandler.domain);
        await this.applySiteHandler(tabId, siteHandler);
        return;
      }

      console.log('UrlBlocker: No DOM config or predefined handler found, checking user selectors');

      // 如果没有DOM配置或预设处理器，使用用户配置的选择器
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
   * 处理标签页关闭或切换，记录访问时长
   */
  async handleTabLeave(tabId: number, url: string): Promise<void> {
    try {
      const tabKey = `${tabId}-${url}`;
      const startTime = this.visitStartTimes.get(tabKey);

      if (startTime) {
        const duration = Date.now() - startTime;

        // 检查是否为被监控的URL
        const blockedConfig = await blockedUrlsStorage.get();
        const isBlocked = this.isUrlBlocked(url, blockedConfig.urls);
        const isStudyMode = this.isUrlBlocked(url, blockedConfig.studyModeUrls);

        if (isBlocked || isStudyMode) {
          // 更新访问时长（如果之前已经记录过访问，这里会更新时长）
          await visitMonitorStorage.recordVisit(url, duration, isBlocked);
          console.log('UrlBlocker: Updated visit duration:', url, `${Math.round(duration / 1000)}s`);
        }

        // 清理记录
        this.visitStartTimes.delete(tabKey);
      }
    } catch (error) {
      console.error('Error handling tab leave:', error);
    }
  }

  /**
   * 处理标签页URL变化，记录之前URL的访问时长
   */
  async handleTabUrlChange(tabId: number, oldUrl: string, newUrl: string): Promise<void> {
    try {
      // 先处理旧URL的离开
      if (oldUrl) {
        await this.handleTabLeave(tabId, oldUrl);
      }

      // 然后开始记录新URL
      if (newUrl) {
        const tabKey = `${tabId}-${newUrl}`;
        this.visitStartTimes.set(tabKey, Date.now());
        console.log('UrlBlocker: Started tracking new URL:', newUrl);
      }
    } catch (error) {
      console.error('Error handling tab URL change:', error);
    }
  }

  /**
   * 清理访问监控数据
   */
  async cleanupVisitData(): Promise<void> {
    try {
      await visitMonitorStorage.cleanupOldRecords();
      console.log('UrlBlocker: Visit data cleanup completed');
    } catch (error) {
      console.error('Error cleaning up visit data:', error);
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

      // 启动定期清理任务
      this.startPeriodicCleanup();
    } catch (error) {
      console.error('Error initializing predefined sites:', error);
    }
  }

  /**
   * 启动定期清理任务
   */
  private startPeriodicCleanup(): void {
    // 每小时清理一次旧数据
    setInterval(
      async () => {
        await this.cleanupVisitData();
      },
      60 * 60 * 1000,
    ); // 1小时
  }
}
