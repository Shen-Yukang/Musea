import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// 禁用URL列表配置
export type BlockedUrlsConfig = {
  urls: string[]; // 禁用的URL列表
  studyModeUrls: string[]; // 学习模式URL列表
  studyModeSelectors: Record<string, string[]>; // 学习模式下需要禁用的元素选择器，按URL分组
};

// 禁用URL列表存储接口
export type BlockedUrlsStorage = BaseStorage<BlockedUrlsConfig> & {
  addUrl: (url: string) => Promise<void>;
  removeUrl: (url: string) => Promise<void>;
  clearUrls: () => Promise<void>;
  addStudyModeUrl: (url: string) => Promise<void>;
  removeStudyModeUrl: (url: string) => Promise<void>;
  toggleUrlMode: (url: string, isStudyMode: boolean) => Promise<void>;
  addStudyModeSelector: (url: string, selector: string) => Promise<void>;
  removeStudyModeSelector: (url: string, selector: string) => Promise<void>;
  clearStudyModeSelectors: (url: string) => Promise<void>;
};

// 创建禁用URL列表基础存储
const blockedUrlsBaseStorage = createStorage<BlockedUrlsConfig>(
  'blocked-urls-storage-key',
  {
    urls: [],
    studyModeUrls: [],
    studyModeSelectors: {},
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// 数据迁移逻辑
const migrateStorageStructure = async () => {
  try {
    const current = await blockedUrlsBaseStorage.get();
    // 检查是否需要迁移
    if (!current.studyModeUrls || !current.studyModeSelectors) {
      console.log('Migrating blocked URLs storage structure...');
      await blockedUrlsBaseStorage.set(oldData => ({
        urls: oldData.urls || [],
        studyModeUrls: oldData.studyModeUrls || [],
        studyModeSelectors: oldData.studyModeSelectors || {},
      }));
      console.log('Blocked URLs storage migration complete.');
    }
  } catch (error) {
    console.error('Error migrating blocked URLs storage:', error);
  }
};

// 执行数据迁移
migrateStorageStructure();

// 扩展禁用URL列表存储
export const blockedUrlsStorage: BlockedUrlsStorage = {
  ...blockedUrlsBaseStorage,

  addUrl: async (url: string) => {
    await blockedUrlsBaseStorage.set(current => {
      // 如果URL已存在，则不添加
      if (current.urls.includes(url)) {
        return current;
      }
      // 如果URL在学习模式列表中，先从学习模式列表中移除
      const studyModeUrls = current.studyModeUrls.filter(u => u !== url);
      return {
        ...current,
        urls: [...current.urls, url],
        studyModeUrls,
      };
    });
  },

  removeUrl: async (url: string) => {
    await blockedUrlsBaseStorage.set(current => ({
      ...current,
      urls: current.urls.filter(u => u !== url),
    }));
  },

  clearUrls: async () => {
    await blockedUrlsBaseStorage.set(current => ({
      ...current,
      urls: [],
    }));
  },

  addStudyModeUrl: async (url: string) => {
    await blockedUrlsBaseStorage.set(current => {
      // 如果URL已存在于学习模式列表，则不添加
      if (current.studyModeUrls.includes(url)) {
        return current;
      }
      // 如果URL在完全禁用列表中，先从完全禁用列表中移除
      const urls = current.urls.filter(u => u !== url);
      return {
        ...current,
        studyModeUrls: [...current.studyModeUrls, url],
        urls,
      };
    });
  },

  removeStudyModeUrl: async (url: string) => {
    await blockedUrlsBaseStorage.set(current => ({
      ...current,
      studyModeUrls: current.studyModeUrls.filter(u => u !== url),
    }));
  },

  toggleUrlMode: async (url: string, isStudyMode: boolean) => {
    if (isStudyMode) {
      await blockedUrlsStorage.addStudyModeUrl(url);
    } else {
      await blockedUrlsStorage.addUrl(url);
    }
  },

  addStudyModeSelector: async (url: string, selector: string) => {
    await blockedUrlsBaseStorage.set(current => {
      const currentSelectors = current.studyModeSelectors[url] || [];
      // 如果选择器已存在，则不添加
      if (currentSelectors.includes(selector)) {
        return current;
      }
      return {
        ...current,
        studyModeSelectors: {
          ...current.studyModeSelectors,
          [url]: [...currentSelectors, selector],
        },
      };
    });
  },

  removeStudyModeSelector: async (url: string, selector: string) => {
    await blockedUrlsBaseStorage.set(current => {
      const currentSelectors = current.studyModeSelectors[url] || [];
      return {
        ...current,
        studyModeSelectors: {
          ...current.studyModeSelectors,
          [url]: currentSelectors.filter(s => s !== selector),
        },
      };
    });
  },

  clearStudyModeSelectors: async (url: string) => {
    await blockedUrlsBaseStorage.set(current => {
      const { [url]: _, ...restSelectors } = current.studyModeSelectors;
      return {
        ...current,
        studyModeSelectors: restSelectors,
      };
    });
  },
};
