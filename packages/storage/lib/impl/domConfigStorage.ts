import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// DOM操作类型
export enum DOMActionType {
  HIDE = 'hide', // 隐藏元素 (display: none)
  BLUR = 'blur', // 模糊元素
  FADE = 'fade', // 淡化元素
  REMOVE = 'remove', // 移除元素
  CUSTOM_CSS = 'custom_css', // 自定义CSS
  SLIDE_OUT = 'slide_out', // 滑出动画
  SCALE_DOWN = 'scale_down', // 缩小动画
  GRAYSCALE = 'grayscale', // 灰度化
  OVERLAY = 'overlay', // 添加遮罩
}

// DOM操作配置
export interface DOMActionConfig {
  type: DOMActionType;
  selector: string;
  description?: string; // 操作描述
  enabled: boolean; // 是否启用

  // 动画配置
  animation?: {
    duration?: number; // 动画持续时间(ms)
    easing?: string; // 动画缓动函数
    delay?: number; // 动画延迟(ms)
  };

  // 样式配置
  styles?: {
    [key: string]: string; // 自定义CSS属性
  };

  // 特定操作的参数
  params?: {
    blurLevel?: number; // 模糊级别 (px)
    opacity?: number; // 透明度 (0-1)
    scale?: number; // 缩放比例 (0-1)
    overlayColor?: string; // 遮罩颜色
    overlayOpacity?: number; // 遮罩透明度
  };
}

// 网站DOM配置
export interface SiteDOMConfig {
  domain: string; // 网站域名
  name: string; // 网站名称
  enabled: boolean; // 是否启用
  actions: DOMActionConfig[]; // DOM操作列表

  // 提醒配置
  reminder?: {
    message: string; // 提醒消息
    backgroundColor: string; // 背景颜色
    enabled: boolean; // 是否显示提醒
  };

  // 高级配置
  advanced?: {
    observeChanges: boolean; // 是否监听DOM变化
    applyDelay: number; // 应用延迟(ms)
    retryCount: number; // 重试次数
    persistentMode?: boolean; // 持久性模式：防止样式被覆盖
    persistentInterval?: number; // 持久性检查间隔(ms)，0表示禁用定时检查
    useImportant?: boolean; // 是否使用!important提高样式优先级
    monitorAttributes?: boolean; // 是否监听属性变化（如style、class）
    enableIntelligentWatcher?: boolean; // 是否启用智能DOM监听器（默认true）
    useDynamicScript?: boolean; // 是否使用动态脚本模式（更轻量级）
    debugMode?: boolean; // 是否启用调试模式
  };
}

// DOM配置存储结构
export interface DOMConfig {
  sites: SiteDOMConfig[]; // 网站配置列表
  globalSettings: {
    enabled: boolean; // 全局启用状态
    defaultAction: DOMActionType; // 默认操作类型
    animationsEnabled: boolean; // 是否启用动画
    debugMode: boolean; // 调试模式
  };
  presets: {
    // 预设配置
    [key: string]: Partial<DOMActionConfig>;
  };
}

// DOM配置存储接口
export type DOMConfigStorage = BaseStorage<DOMConfig> & {
  // 网站管理
  addSite: (siteConfig: SiteDOMConfig) => Promise<void>;
  removeSite: (domain: string) => Promise<void>;
  updateSite: (domain: string, updates: Partial<SiteDOMConfig>) => Promise<void>;
  getSite: (domain: string) => Promise<SiteDOMConfig | undefined>;

  // 操作管理
  addAction: (domain: string, action: DOMActionConfig) => Promise<void>;
  removeAction: (domain: string, selector: string) => Promise<void>;
  updateAction: (domain: string, selector: string, updates: Partial<DOMActionConfig>) => Promise<void>;
  toggleAction: (domain: string, selector: string, enabled: boolean) => Promise<void>;

  // 全局设置
  updateGlobalSettings: (settings: Partial<DOMConfig['globalSettings']>) => Promise<void>;

  // 预设管理
  addPreset: (name: string, preset: Partial<DOMActionConfig>) => Promise<void>;
  removePreset: (name: string) => Promise<void>;

  // 导入导出
  exportConfig: () => Promise<DOMConfig>;
  importConfig: (config: Partial<DOMConfig>) => Promise<void>;

  // 重置
  resetToDefaults: () => Promise<void>;
};

// 默认配置
const defaultDOMConfig: DOMConfig = {
  sites: [
    // 预设网站配置
    {
      domain: 'bilibili.com',
      name: 'Bilibili',
      enabled: true,
      actions: [
        {
          type: DOMActionType.HIDE,
          selector: '#nav-searchform',
          description: '搜索框',
          enabled: true,
        },
        {
          type: DOMActionType.FADE,
          selector: '.center-search__bar',
          description: '搜索栏',
          enabled: true,
          params: { opacity: 0.3 },
          animation: { duration: 300, easing: 'ease-in-out' },
        },
      ],
      reminder: {
        message: '已为您屏蔽搜索功能，专注于观看学习内容',
        backgroundColor: 'rgba(255, 105, 180, 0.8)',
        enabled: true,
      },
      advanced: {
        observeChanges: true,
        applyDelay: 500,
        retryCount: 3,
        persistentMode: false,
        persistentInterval: 0,
        useImportant: false,
        monitorAttributes: false,
        enableIntelligentWatcher: true,
      },
    },
    {
      domain: 'baidu.com',
      name: '百度',
      enabled: true,
      actions: [
        {
          type: DOMActionType.HIDE,
          selector: '#s-hotsearch-wrapper, .s-hotsearch-wrapper, [data-module="HotSearch"]',
          description: '热搜区域',
          enabled: true,
        },
        {
          type: DOMActionType.FADE,
          selector: '#head, .head_wrapper, .s-top-nav, [data-module="TopNav"]',
          description: '顶部导航',
          enabled: true,
          params: { opacity: 0.3 },
          animation: { duration: 300, easing: 'ease-out' },
        },
        {
          type: DOMActionType.HIDE,
          selector: '.c-recommend, [data-module="Recommend"], .result-op',
          description: '推荐内容',
          enabled: true,
        },
      ],
      reminder: {
        message: '已为您屏蔽热搜和顶部导航，专注于当前任务',
        backgroundColor: 'rgba(0, 128, 0, 0.8)',
        enabled: true,
      },
      advanced: {
        observeChanges: true,
        applyDelay: 300,
        retryCount: 2,
        persistentMode: false,
        persistentInterval: 0,
        useImportant: false,
        monitorAttributes: false,
        enableIntelligentWatcher: true,
      },
    },
    {
      domain: 'zhihu.com',
      name: '知乎',
      enabled: true,
      actions: [
        {
          type: DOMActionType.SCALE_DOWN,
          selector: '.Topstory',
          description: '热门话题',
          enabled: true,
          params: { scale: 0.1 },
          animation: { duration: 400, easing: 'ease-in' },
        },
      ],
      reminder: {
        message: '已为您屏蔽热门话题推荐，专注于学习和阅读',
        backgroundColor: 'rgba(0, 123, 255, 0.8)',
        enabled: true,
      },
      advanced: {
        observeChanges: true,
        applyDelay: 400,
        retryCount: 3,
        persistentMode: false,
        persistentInterval: 0,
        useImportant: false,
        monitorAttributes: false,
        enableIntelligentWatcher: true,
      },
    },
  ],
  globalSettings: {
    enabled: true,
    defaultAction: DOMActionType.HIDE,
    animationsEnabled: true,
    debugMode: false,
  },
  presets: {
    'quick-hide': {
      type: DOMActionType.HIDE,
      enabled: true,
    },
    'gentle-fade': {
      type: DOMActionType.FADE,
      enabled: true,
      params: { opacity: 0.2 },
      animation: { duration: 500, easing: 'ease-in-out' },
    },
    'smooth-blur': {
      type: DOMActionType.BLUR,
      enabled: true,
      params: { blurLevel: 3 },
      animation: { duration: 300, easing: 'ease-out' },
    },
  },
};

// 创建DOM配置基础存储
const domConfigBaseStorage = createStorage<DOMConfig>('dom-config-storage-key', defaultDOMConfig, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// 扩展DOM配置存储
export const domConfigStorage: DOMConfigStorage = {
  ...domConfigBaseStorage,

  addSite: async (siteConfig: SiteDOMConfig) => {
    await domConfigBaseStorage.set(current => {
      const existingIndex = current.sites.findIndex(site => site.domain === siteConfig.domain);
      if (existingIndex >= 0) {
        current.sites[existingIndex] = siteConfig;
      } else {
        current.sites.push(siteConfig);
      }
      return { ...current };
    });

    // 自动将新网站添加到学习模式URL列表中
    try {
      const { blockedUrlsStorage } = await import('./blockedUrlsStorage.js');
      await blockedUrlsStorage.addStudyModeUrl(siteConfig.domain);
      console.log('🎯 [DOM Config] Auto-added site to study mode:', siteConfig.domain);
    } catch (error) {
      console.error('🚨 [DOM Config] Failed to add site to study mode:', error);
    }
  },

  removeSite: async (domain: string) => {
    await domConfigBaseStorage.set(current => ({
      ...current,
      sites: current.sites.filter(site => site.domain !== domain),
    }));

    // 同时从学习模式URL列表中移除该域名
    try {
      const { blockedUrlsStorage } = await import('./blockedUrlsStorage.js');
      await blockedUrlsStorage.removeStudyModeUrl(domain);
      console.log('🎯 [DOM Config] Auto-removed site from study mode:', domain);
    } catch (error) {
      console.error('🚨 [DOM Config] Failed to remove site from study mode:', error);
    }
  },

  updateSite: async (domain: string, updates: Partial<SiteDOMConfig>) => {
    await domConfigBaseStorage.set(current => {
      const siteIndex = current.sites.findIndex(site => site.domain === domain);
      if (siteIndex >= 0) {
        current.sites[siteIndex] = { ...current.sites[siteIndex], ...updates };
      }
      return { ...current };
    });
  },

  getSite: async (domain: string) => {
    const config = await domConfigBaseStorage.get();
    return config.sites.find(site => site.domain === domain);
  },

  addAction: async (domain: string, action: DOMActionConfig) => {
    await domConfigBaseStorage.set(current => {
      const siteIndex = current.sites.findIndex(site => site.domain === domain);
      if (siteIndex >= 0) {
        const existingActionIndex = current.sites[siteIndex].actions.findIndex(a => a.selector === action.selector);
        if (existingActionIndex >= 0) {
          current.sites[siteIndex].actions[existingActionIndex] = action;
        } else {
          current.sites[siteIndex].actions.push(action);
        }
      }
      return { ...current };
    });
  },

  removeAction: async (domain: string, selector: string) => {
    await domConfigBaseStorage.set(current => {
      const siteIndex = current.sites.findIndex(site => site.domain === domain);
      if (siteIndex >= 0) {
        current.sites[siteIndex].actions = current.sites[siteIndex].actions.filter(
          action => action.selector !== selector,
        );
      }
      return { ...current };
    });
  },

  updateAction: async (domain: string, selector: string, updates: Partial<DOMActionConfig>) => {
    await domConfigBaseStorage.set(current => {
      const siteIndex = current.sites.findIndex(site => site.domain === domain);
      if (siteIndex >= 0) {
        const actionIndex = current.sites[siteIndex].actions.findIndex(action => action.selector === selector);
        if (actionIndex >= 0) {
          current.sites[siteIndex].actions[actionIndex] = {
            ...current.sites[siteIndex].actions[actionIndex],
            ...updates,
          };
        }
      }
      return { ...current };
    });
  },

  toggleAction: async (domain: string, selector: string, enabled: boolean) => {
    await domConfigStorage.updateAction(domain, selector, { enabled });
  },

  updateGlobalSettings: async (settings: Partial<DOMConfig['globalSettings']>) => {
    await domConfigBaseStorage.set(current => ({
      ...current,
      globalSettings: { ...current.globalSettings, ...settings },
    }));
  },

  addPreset: async (name: string, preset: Partial<DOMActionConfig>) => {
    await domConfigBaseStorage.set(current => ({
      ...current,
      presets: { ...current.presets, [name]: preset },
    }));
  },

  removePreset: async (name: string) => {
    await domConfigBaseStorage.set(current => {
      const { [name]: removed, ...presets } = current.presets;
      return { ...current, presets };
    });
  },

  exportConfig: async () => {
    return await domConfigBaseStorage.get();
  },

  importConfig: async (config: Partial<DOMConfig>) => {
    await domConfigBaseStorage.set(current => ({
      ...current,
      ...config,
      sites: config.sites ? [...config.sites] : current.sites,
      globalSettings: config.globalSettings
        ? { ...current.globalSettings, ...config.globalSettings }
        : current.globalSettings,
      presets: config.presets ? { ...current.presets, ...config.presets } : current.presets,
    }));
  },

  resetToDefaults: async () => {
    await domConfigBaseStorage.set(() => defaultDOMConfig);
  },
};
