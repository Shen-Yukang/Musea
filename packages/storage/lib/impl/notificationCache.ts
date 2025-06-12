import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// 通知缓存配置
export type NotificationCacheConfig = {
  pendingNotification?: string; // 预生成的通知内容
  generatedAt?: number; // 生成时间戳
  expiresAt?: number; // 过期时间戳
  isGenerating: boolean; // 是否正在生成中
};

// 通知缓存存储
type NotificationCacheStorage = BaseStorage<NotificationCacheConfig> & {
  saveNotification: (notification: string, expiryMinutes?: number) => Promise<void>;
  getNotification: () => Promise<string | null>;
  clearNotification: () => Promise<void>;
  setGenerating: (isGenerating: boolean) => Promise<void>;
  isGenerating: () => Promise<boolean>;
};

// 创建通知缓存存储
const notificationCacheBaseStorage = createStorage<NotificationCacheConfig>(
  'notification-cache-storage-key',
  {
    isGenerating: false,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// 扩展通知缓存存储
export const notificationCacheStorage: NotificationCacheStorage = {
  ...notificationCacheBaseStorage,

  // 保存通知内容
  saveNotification: async (notification: string, expiryMinutes = 60) => {
    const now = Date.now();
    await notificationCacheBaseStorage.set({
      pendingNotification: notification,
      generatedAt: now,
      expiresAt: now + expiryMinutes * 60 * 1000,
      isGenerating: false,
    });
  },

  // 获取通知内容（如果有效）
  getNotification: async () => {
    const cache = await notificationCacheBaseStorage.get();

    // 如果没有缓存的通知，返回null
    if (!cache.pendingNotification) {
      return null;
    }

    // 如果通知已过期，清除并返回null
    if (cache.expiresAt && cache.expiresAt < Date.now()) {
      await notificationCacheStorage.clearNotification();
      return null;
    }

    // 返回缓存的通知内容
    return cache.pendingNotification;
  },

  // 清除通知缓存
  clearNotification: async () => {
    await notificationCacheBaseStorage.set(current => ({
      ...current,
      pendingNotification: undefined,
      generatedAt: undefined,
      expiresAt: undefined,
      isGenerating: false,
    }));
  },

  // 设置生成状态
  setGenerating: async (isGenerating: boolean) => {
    await notificationCacheBaseStorage.set(current => ({
      ...current,
      isGenerating,
    }));
  },

  // 检查是否正在生成中
  isGenerating: async () => {
    const cache = await notificationCacheBaseStorage.get();
    return cache.isGenerating;
  },
};
