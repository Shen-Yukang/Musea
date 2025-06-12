import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// 语音缓存配置
export type VoiceCacheConfig = {
  startVoiceCache?: {
    voiceType: string; // 语音类型
    audioData: string; // base64音频数据
    cachedAt: number; // 缓存时间戳
  };
  endVoiceCache?: {
    voiceType: string; // 语音类型
    audioData: string; // base64音频数据
    cachedAt: number; // 缓存时间戳
  };
};

// 语音缓存存储
type VoiceCacheStorage = BaseStorage<VoiceCacheConfig> & {
  // 开始语音缓存
  cacheStartVoice: (voiceType: string, audioData: string) => Promise<void>;
  getStartVoice: (voiceType: string) => Promise<string | null>;
  clearStartVoice: () => Promise<void>;

  // 结束语音缓存
  cacheEndVoice: (voiceType: string, audioData: string) => Promise<void>;
  getEndVoice: (voiceType: string) => Promise<string | null>;
  clearEndVoice: () => Promise<void>;

  // 清除所有缓存
  clearAllVoiceCache: () => Promise<void>;

  // 检查缓存是否有效（根据voiceType）
  isStartVoiceCacheValid: (voiceType: string) => Promise<boolean>;
  isEndVoiceCacheValid: (voiceType: string) => Promise<boolean>;
};

// 创建语音缓存存储
const voiceCacheBaseStorage = createStorage<VoiceCacheConfig>(
  'voice-cache-storage-key',
  {},
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// 扩展语音缓存存储
export const voiceCacheStorage: VoiceCacheStorage = {
  ...voiceCacheBaseStorage,

  // 缓存开始语音
  cacheStartVoice: async (voiceType: string, audioData: string) => {
    await voiceCacheBaseStorage.set(current => ({
      ...current,
      startVoiceCache: {
        voiceType,
        audioData,
        cachedAt: Date.now(),
      },
    }));
    console.log('Start voice cached for voiceType:', voiceType);
  },

  // 获取开始语音缓存
  getStartVoice: async (voiceType: string) => {
    const cache = await voiceCacheBaseStorage.get();

    if (!cache.startVoiceCache) {
      return null;
    }

    // 检查voiceType是否匹配
    if (cache.startVoiceCache.voiceType !== voiceType) {
      console.log('Start voice cache voiceType mismatch, clearing cache');
      await voiceCacheStorage.clearStartVoice();
      return null;
    }

    // 检查缓存是否过期（7天）
    const cacheAge = Date.now() - cache.startVoiceCache.cachedAt;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (cacheAge > sevenDays) {
      console.log('Start voice cache expired, clearing cache');
      await voiceCacheStorage.clearStartVoice();
      return null;
    }

    console.log('Using cached start voice for voiceType:', voiceType);
    return cache.startVoiceCache.audioData;
  },

  // 清除开始语音缓存
  clearStartVoice: async () => {
    await voiceCacheBaseStorage.set(current => ({
      ...current,
      startVoiceCache: undefined,
    }));
    console.log('Start voice cache cleared');
  },

  // 缓存结束语音
  cacheEndVoice: async (voiceType: string, audioData: string) => {
    await voiceCacheBaseStorage.set(current => ({
      ...current,
      endVoiceCache: {
        voiceType,
        audioData,
        cachedAt: Date.now(),
      },
    }));
    console.log('End voice cached for voiceType:', voiceType);
  },

  // 获取结束语音缓存
  getEndVoice: async (voiceType: string) => {
    const cache = await voiceCacheBaseStorage.get();

    if (!cache.endVoiceCache) {
      return null;
    }

    // 检查voiceType是否匹配
    if (cache.endVoiceCache.voiceType !== voiceType) {
      console.log('End voice cache voiceType mismatch, clearing cache');
      await voiceCacheStorage.clearEndVoice();
      return null;
    }

    // 检查缓存是否过期（7天）
    const cacheAge = Date.now() - cache.endVoiceCache.cachedAt;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (cacheAge > sevenDays) {
      console.log('End voice cache expired, clearing cache');
      await voiceCacheStorage.clearEndVoice();
      return null;
    }

    console.log('Using cached end voice for voiceType:', voiceType);
    return cache.endVoiceCache.audioData;
  },

  // 清除结束语音缓存
  clearEndVoice: async () => {
    await voiceCacheBaseStorage.set(current => ({
      ...current,
      endVoiceCache: undefined,
    }));
    console.log('End voice cache cleared');
  },

  // 清除所有语音缓存
  clearAllVoiceCache: async () => {
    await voiceCacheBaseStorage.set({});
    console.log('All voice cache cleared');
  },

  // 检查开始语音缓存是否有效
  isStartVoiceCacheValid: async (voiceType: string) => {
    const audioData = await voiceCacheStorage.getStartVoice(voiceType);
    return audioData !== null;
  },

  // 检查结束语音缓存是否有效
  isEndVoiceCacheValid: async (voiceType: string) => {
    const audioData = await voiceCacheStorage.getEndVoice(voiceType);
    return audioData !== null;
  },
};
