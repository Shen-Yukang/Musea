import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// 语音录入设置
export type SpeechInputConfig = {
  enabled: boolean; // 是否启用语音录入
  language: string; // 识别语言
  continuous: boolean; // 是否连续识别
  interimResults: boolean; // 是否显示中间结果
  maxAlternatives: number; // 最大候选数量
  autoSend: boolean; // 识别完成后自动发送
  noiseReduction: boolean; // 噪音降噪
  sensitivity: number; // 灵敏度 (0-1)
};

// 语音播放设置
export type SpeechOutputConfig = {
  enabled: boolean; // 是否启用语音播放
  autoPlay: boolean; // 自动播放回复
  playSpeed: number; // 播放速度 (0.5-2.0)
  volume: number; // 播放音量 (0-1)
  useTTS: boolean; // 使用TTS还是Web Speech API
  interruptOnNewInput: boolean; // 新输入时中断播放
  playNotificationSound: boolean; // 播放通知音效
};

// 语音对话设置
export type SpeechChatConfig = {
  input: SpeechInputConfig;
  output: SpeechOutputConfig;
  conversationMode: boolean; // 对话模式（连续语音对话）
  pushToTalk: boolean; // 按住说话模式
  voiceActivation: boolean; // 语音激活
  activationKeyword: string; // 激活关键词
  sessionTimeout: number; // 会话超时时间（秒）
};

// 语音对话配置存储
type SpeechChatConfigStorage = BaseStorage<SpeechChatConfig> & {
  updateInputConfig: (config: Partial<SpeechInputConfig>) => Promise<void>;
  updateOutputConfig: (config: Partial<SpeechOutputConfig>) => Promise<void>;
  enableSpeechInput: (enabled: boolean) => Promise<void>;
  enableSpeechOutput: (enabled: boolean) => Promise<void>;
  enableConversationMode: (enabled: boolean) => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  setPlaySpeed: (speed: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setSensitivity: (sensitivity: number) => Promise<void>;
};

// 默认配置
const defaultSpeechChatConfig: SpeechChatConfig = {
  input: {
    enabled: true,
    language: 'zh-CN',
    continuous: false,
    interimResults: true,
    maxAlternatives: 1,
    autoSend: false,
    noiseReduction: true,
    sensitivity: 0.7,
  },
  output: {
    enabled: true,
    autoPlay: false,
    playSpeed: 1.0,
    volume: 0.8,
    useTTS: true,
    interruptOnNewInput: true,
    playNotificationSound: true,
  },
  conversationMode: false,
  pushToTalk: false,
  voiceActivation: false,
  activationKeyword: '小助手',
  sessionTimeout: 30,
};

// 创建语音对话配置存储
const speechChatConfigBaseStorage = createStorage<SpeechChatConfig>(
  'speech-chat-config-storage-key',
  defaultSpeechChatConfig,
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// 扩展语音对话配置存储
export const speechChatConfigStorage: SpeechChatConfigStorage = {
  ...speechChatConfigBaseStorage,

  // 更新语音录入配置
  updateInputConfig: async (config: Partial<SpeechInputConfig>) => {
    await speechChatConfigBaseStorage.set(current => ({
      ...current,
      input: { ...current.input, ...config },
    }));
  },

  // 更新语音播放配置
  updateOutputConfig: async (config: Partial<SpeechOutputConfig>) => {
    await speechChatConfigBaseStorage.set(current => ({
      ...current,
      output: { ...current.output, ...config },
    }));
  },

  // 启用/禁用语音录入
  enableSpeechInput: async (enabled: boolean) => {
    await speechChatConfigBaseStorage.set(current => ({
      ...current,
      input: { ...current.input, enabled },
    }));
  },

  // 启用/禁用语音播放
  enableSpeechOutput: async (enabled: boolean) => {
    await speechChatConfigBaseStorage.set(current => ({
      ...current,
      output: { ...current.output, enabled },
    }));
  },

  // 启用/禁用对话模式
  enableConversationMode: async (enabled: boolean) => {
    await speechChatConfigBaseStorage.set(current => ({
      ...current,
      conversationMode: enabled,
    }));
  },

  // 设置识别语言
  setLanguage: async (language: string) => {
    await speechChatConfigBaseStorage.set(current => ({
      ...current,
      input: { ...current.input, language },
    }));
  },

  // 设置播放速度
  setPlaySpeed: async (speed: number) => {
    const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));
    await speechChatConfigBaseStorage.set(current => ({
      ...current,
      output: { ...current.output, playSpeed: clampedSpeed },
    }));
  },

  // 设置音量
  setVolume: async (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    await speechChatConfigBaseStorage.set(current => ({
      ...current,
      output: { ...current.output, volume: clampedVolume },
    }));
  },

  // 设置灵敏度
  setSensitivity: async (sensitivity: number) => {
    const clampedSensitivity = Math.max(0, Math.min(1, sensitivity));
    await speechChatConfigBaseStorage.set(current => ({
      ...current,
      input: { ...current.input, sensitivity: clampedSensitivity },
    }));
  },
};
