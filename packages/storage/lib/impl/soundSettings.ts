import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// 声音设置配置
export type SoundSettings = {
  enabled: boolean; // 是否启用通知声音
  volume: number; // 音量 (0-1)
};

// 声音设置存储
type SoundSettingsStorage = BaseStorage<SoundSettings> & {
  enableSound: (enabled: boolean) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
};

// 创建声音设置存储
const soundSettingsBaseStorage = createStorage<SoundSettings>(
  'sound-settings-storage-key',
  {
    enabled: true, // 默认启用声音
    volume: 0.5, // 默认音量50%
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// 扩展声音设置存储
export const soundSettingsStorage: SoundSettingsStorage = {
  ...soundSettingsBaseStorage,

  // 启用/禁用声音
  enableSound: async (enabled: boolean) => {
    await soundSettingsBaseStorage.set(current => ({
      ...current,
      enabled,
    }));
  },

  // 设置音量
  setVolume: async (volume: number) => {
    // 确保音量在0-1之间
    const clampedVolume = Math.max(0, Math.min(1, volume));
    await soundSettingsBaseStorage.set(current => ({
      ...current,
      volume: clampedVolume,
    }));
  },
};
