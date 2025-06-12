import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// 专注时间配置
export type FocusTimeConfig = {
  duration: number; // 专注时长（分钟）
  isActive: boolean; // 是否处于专注状态
  startTime?: number; // 开始专注的时间戳
  endTime?: number; // 结束专注的时间戳
};

// 专注时间存储接口
type FocusTimeStorage = BaseStorage<FocusTimeConfig> & {
  startFocus: (duration: number) => Promise<void>;
  stopFocus: () => Promise<void>;
  getRemainingTime: () => Promise<number>; // 获取剩余时间（秒）
};

// 创建专注时间基础存储
const focusTimeBaseStorage = createStorage<FocusTimeConfig>(
  'focus-time-storage-key',
  {
    duration: 25, // 默认25分钟
    isActive: false,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// 扩展专注时间存储
export const focusStorage: FocusTimeStorage = {
  ...focusTimeBaseStorage,

  startFocus: async (duration: number) => {
    const now = Date.now();
    await focusTimeBaseStorage.set({
      duration,
      isActive: true,
      startTime: now,
      endTime: now + duration * 60 * 1000,
    });
  },

  stopFocus: async () => {
    await focusTimeBaseStorage.set(current => ({
      ...current,
      isActive: false,
      startTime: undefined,
      endTime: undefined,
    }));
  },

  getRemainingTime: async () => {
    const config = await focusTimeBaseStorage.get();
    if (!config.isActive || !config.endTime) {
      return 0;
    }

    const remaining = Math.max(0, config.endTime - Date.now());
    return Math.floor(remaining / 1000); // 转换为秒
  },
};
