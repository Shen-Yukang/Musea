import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// 冥想场景类型
export enum MeditationScene {
  FOREST = 'forest',
  OCEAN = 'ocean',
  RAIN = 'rain',
  BIRDS = 'birds',
  CAFE = 'cafe',
  LIBRARY = 'library',
  WHITE_NOISE = 'white_noise',
  TEMPLE = 'temple',
  SINGING_BOWL = 'singing_bowl',
  SILENT = 'silent',
}

// 冥想配置
export type MeditationConfig = {
  selectedScene: MeditationScene; // 选择的冥想场景
  duration: number; // 冥想时长（分钟）
  volume: number; // 音量 (0-1)
  isActive: boolean; // 是否处于冥想状态
  startTime?: number; // 开始冥想的时间戳
  endTime?: number; // 结束冥想的时间戳
  breathingGuide: boolean; // 是否启用呼吸引导
  completedSessions: number; // 已完成的冥想次数
  totalMeditationTime: number; // 总冥想时间（分钟）
  lastSessionDate?: string; // 最后一次冥想日期 (YYYY-MM-DD)
  customAudioUrls?: Record<string, string>; // 自定义音频URL映射
};

// 冥想存储接口
type MeditationStorage = BaseStorage<MeditationConfig> & {
  startMeditation: (scene: MeditationScene, duration: number) => Promise<void>;
  stopMeditation: () => Promise<void>;
  getRemainingTime: () => Promise<number>; // 获取剩余时间（秒）
  updateScene: (scene: MeditationScene) => Promise<void>;
  updateVolume: (volume: number) => Promise<void>;
  toggleBreathingGuide: (enabled: boolean) => Promise<void>;
  recordCompletedSession: (duration: number) => Promise<void>;
  setCustomAudioUrl: (scene: MeditationScene, url: string) => Promise<void>;
  removeCustomAudioUrl: (scene: MeditationScene) => Promise<void>;
  getSessionStats: () => Promise<{
    totalSessions: number;
    totalTime: number;
    averageSessionTime: number;
    streakDays: number;
  }>;
};

// 创建冥想基础存储
const meditationBaseStorage = createStorage<MeditationConfig>(
  'meditation-storage-key',
  {
    selectedScene: MeditationScene.FOREST, // 默认森林场景
    duration: 10, // 默认10分钟
    volume: 0.6, // 默认音量60%
    isActive: false,
    breathingGuide: true, // 默认启用呼吸引导
    completedSessions: 0,
    totalMeditationTime: 0,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// 扩展冥想存储
export const meditationStorage: MeditationStorage = {
  ...meditationBaseStorage,

  // 开始冥想
  startMeditation: async (scene: MeditationScene, duration: number) => {
    const now = Date.now();
    await meditationBaseStorage.set(current => ({
      ...current,
      selectedScene: scene,
      duration,
      isActive: true,
      startTime: now,
      endTime: now + duration * 60 * 1000,
    }));
  },

  // 停止冥想
  stopMeditation: async () => {
    await meditationBaseStorage.set(current => ({
      ...current,
      isActive: false,
      startTime: undefined,
      endTime: undefined,
    }));
  },

  // 获取剩余时间
  getRemainingTime: async () => {
    const config = await meditationBaseStorage.get();
    if (!config.isActive || !config.endTime) {
      return 0;
    }

    const remaining = Math.max(0, config.endTime - Date.now());
    return Math.floor(remaining / 1000); // 转换为秒
  },

  // 更新场景
  updateScene: async (scene: MeditationScene) => {
    await meditationBaseStorage.set(current => ({
      ...current,
      selectedScene: scene,
    }));
  },

  // 更新音量
  updateVolume: async (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    await meditationBaseStorage.set(current => ({
      ...current,
      volume: clampedVolume,
    }));
  },

  // 切换呼吸引导
  toggleBreathingGuide: async (enabled: boolean) => {
    await meditationBaseStorage.set(current => ({
      ...current,
      breathingGuide: enabled,
    }));
  },

  // 记录完成的冥想会话
  recordCompletedSession: async (duration: number) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    await meditationBaseStorage.set(current => ({
      ...current,
      completedSessions: current.completedSessions + 1,
      totalMeditationTime: current.totalMeditationTime + duration,
      lastSessionDate: today,
    }));
  },

  // 获取冥想统计
  getSessionStats: async () => {
    const config = await meditationBaseStorage.get();
    const averageSessionTime = config.completedSessions > 0 
      ? Math.round(config.totalMeditationTime / config.completedSessions)
      : 0;

    // 计算连续天数（简化版本，后续可以增强）
    const today = new Date().toISOString().split('T')[0];
    const streakDays = config.lastSessionDate === today ? 1 : 0;

    return {
      totalSessions: config.completedSessions,
      totalTime: config.totalMeditationTime,
      averageSessionTime,
      streakDays,
    };
  },

  // 设置自定义音频URL
  setCustomAudioUrl: async (scene: MeditationScene, url: string) => {
    await meditationBaseStorage.set(current => ({
      ...current,
      customAudioUrls: {
        ...current.customAudioUrls,
        [scene]: url,
      },
    }));
  },

  // 移除自定义音频URL
  removeCustomAudioUrl: async (scene: MeditationScene) => {
    await meditationBaseStorage.set(current => {
      const customAudioUrls = { ...current.customAudioUrls };
      delete customAudioUrls[scene];
      return {
        ...current,
        customAudioUrls,
      };
    });
  },
};
