import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// Define AIProvider enum here to avoid circular dependency
export enum AIProvider {
  DEEPSEEK = 'deepseek',
  OPENAI = 'openai',
}

// AI配置
export type AIConfig = {
  enabled: boolean; // 是否启用AI生成通知
  provider: AIProvider; // AI提供商
  model: string; // 模型名称
  apiKey: string; // API密钥
  apiEndpoint?: string; // 自定义API端点
  systemPrompt?: string; // 自定义系统提示词
  promptTemplate?: string; // 自定义用户提示词模板
  preGenerateMinutes: number; // 提前多少分钟生成通知
};

// AI配置存储
type AIConfigStorage = BaseStorage<AIConfig> & {
  enableAI: (enabled: boolean) => Promise<void>;
  updateAPIKey: (apiKey: string) => Promise<void>;
  updateProvider: (provider: AIProvider, model?: string, endpoint?: string) => Promise<void>;
  updatePrompts: (systemPrompt?: string, promptTemplate?: string) => Promise<void>;
  updatePreGenerateTime: (minutes: number) => Promise<void>;
};

// 创建AI配置存储
const aiConfigBaseStorage = createStorage<AIConfig>(
  'ai-config-storage-key',
  {
    enabled: false,
    provider: AIProvider.DEEPSEEK,
    model: 'deepseek-chat',
    apiKey: '',
    preGenerateMinutes: 5, // 默认提前5分钟生成
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// 扩展AI配置存储
export const aiConfigStorage: AIConfigStorage = {
  ...aiConfigBaseStorage,

  // 启用/禁用AI生成
  enableAI: async (enabled: boolean) => {
    await aiConfigBaseStorage.set(current => ({
      ...current,
      enabled,
    }));
  },

  // 更新API密钥
  updateAPIKey: async (apiKey: string) => {
    await aiConfigBaseStorage.set(current => ({
      ...current,
      apiKey,
    }));
  },

  // 更新AI提供商
  updateProvider: async (provider: AIProvider, model?: string, endpoint?: string) => {
    await aiConfigBaseStorage.set(current => ({
      ...current,
      provider,
      ...(model ? { model } : {}),
      ...(endpoint ? { apiEndpoint: endpoint } : { apiEndpoint: undefined }),
    }));
  },

  // 更新提示词
  updatePrompts: async (systemPrompt?: string, promptTemplate?: string) => {
    await aiConfigBaseStorage.set(current => ({
      ...current,
      ...(systemPrompt !== undefined ? { systemPrompt } : {}),
      ...(promptTemplate !== undefined ? { promptTemplate } : {}),
    }));
  },

  // 更新预生成时间
  updatePreGenerateTime: async (minutes: number) => {
    await aiConfigBaseStorage.set(current => ({
      ...current,
      preGenerateMinutes: Math.max(1, Math.min(30, minutes)), // 限制在1-30分钟之间
    }));
  },
};
