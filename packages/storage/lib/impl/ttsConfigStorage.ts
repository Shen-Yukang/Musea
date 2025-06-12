import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// TTS配置
export type TTSConfig = {
  enabled: boolean; // 是否启用TTS
  appid: string; // 字节跳动TTS应用ID
  token: string; // 访问令牌
  cluster: string; // 集群名称
  voiceType: string; // 语音类型
  encoding: string; // 音频编码格式
  speedRatio: number; // 语速比例
  uid: string; // 用户ID
  defaultText: string; // 默认语音文本
};

// TTS配置存储
type TTSConfigStorage = BaseStorage<TTSConfig> & {
  updateConfig: (config: Partial<TTSConfig>) => Promise<void>;
  isConfigured: () => Promise<boolean>;
};

// 创建TTS配置存储
const ttsConfigBaseStorage = createStorage<TTSConfig>(
  'tts-config-storage-key',
  {
    enabled: false,
    appid: '',
    token: '',
    cluster: 'volcano_tts',
    voiceType: 'zh_female_linjianvhai_moon_bigtts', // 默认使用"邻家女孩"
    encoding: 'mp3',
    speedRatio: 1.0,
    uid: 'chrome_extension_user',
    defaultText: '', // 默认为空，将根据语音类型自动设置
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// 扩展TTS配置存储
export const ttsConfigStorage: TTSConfigStorage = {
  ...ttsConfigBaseStorage,

  // 更新配置
  updateConfig: async (config: Partial<TTSConfig>) => {
    await ttsConfigBaseStorage.set(current => ({
      ...current,
      ...config,
    }));
  },

  // 检查是否已配置
  isConfigured: async () => {
    const config = await ttsConfigBaseStorage.get();
    return config.enabled && config.appid.length > 0 && config.token.length > 0;
  },
};
