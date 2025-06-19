import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// 背景音乐配置
export type BackgroundMusicConfig = {
  enabled: boolean; // 是否启用背景音乐
  source: 'meditation' | 'custom'; // 音乐来源：冥想场景或自定义URL
  meditationScene?: string; // 冥想场景名称（当source为meditation时）
  customUrl?: string; // 自定义音频URL（当source为custom时）
  volume: number; // 音量 (0-1)
  loop: boolean; // 是否循环播放
};

// 专注时间配置
export type FocusTimeConfig = {
  duration: number; // 专注时长（分钟）
  isActive: boolean; // 是否处于专注状态
  startTime?: number; // 开始专注的时间戳
  endTime?: number; // 结束专注的时间戳
  backgroundMusic: BackgroundMusicConfig; // 背景音乐配置
};

// 专注时间存储接口
type FocusTimeStorage = BaseStorage<FocusTimeConfig> & {
  startFocus: (duration: number) => Promise<void>;
  stopFocus: () => Promise<void>;
  getRemainingTime: () => Promise<number>; // 获取剩余时间（秒）
  updateBackgroundMusic: (config: Partial<BackgroundMusicConfig>) => Promise<void>;
};

// 创建专注时间基础存储
const focusTimeBaseStorage = createStorage<FocusTimeConfig>(
  'focus-time-storage-key',
  {
    duration: 25, // 默认25分钟
    isActive: false,
    backgroundMusic: {
      enabled: false,
      source: 'meditation',
      meditationScene: 'forest',
      volume: 0.3,
      loop: true,
    },
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// 默认背景音乐配置
const defaultBackgroundMusic: BackgroundMusicConfig = {
  enabled: false,
  source: 'meditation',
  meditationScene: 'forest',
  volume: 0.3,
  loop: true,
};

// 扩展专注时间存储
export const focusStorage: FocusTimeStorage = {
  ...focusTimeBaseStorage,

  // 重写 get 方法以确保向后兼容
  get: async () => {
    const config = await focusTimeBaseStorage.get();

    // 如果没有 backgroundMusic 配置，添加默认配置
    if (!config.backgroundMusic) {
      const updatedConfig = {
        ...config,
        backgroundMusic: defaultBackgroundMusic,
      };

      // 保存更新后的配置
      await focusTimeBaseStorage.set(updatedConfig);
      return updatedConfig;
    }

    return config;
  },

  startFocus: async (duration: number) => {
    const now = Date.now();
    const current = await focusTimeBaseStorage.get();
    await focusTimeBaseStorage.set({
      ...current,
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

  updateBackgroundMusic: async (musicConfig: Partial<BackgroundMusicConfig>) => {
    await focusTimeBaseStorage.set(current => ({
      ...current,
      backgroundMusic: {
        ...(current.backgroundMusic || defaultBackgroundMusic),
        ...musicConfig,
      },
    }));
  },
};
