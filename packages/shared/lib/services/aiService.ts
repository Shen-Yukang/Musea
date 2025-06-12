import { AIProvider } from '@extension/storage';

/**
 * AI Service - 提供与AI模型交互的通用接口
 *
 * 这个模块设计为可扩展的，支持多种AI提供商和多种交互类型
 */

// AI模型配置
export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  apiEndpoint?: string;
  temperature?: number;
  maxTokens?: number;
}

// AI请求选项
export interface AIRequestOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

// AI响应接口
export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  provider?: AIProvider;
}

// 默认配置
const DEFAULT_CONFIG: AIModelConfig = {
  provider: AIProvider.DEEPSEEK,
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 256,
};

// 默认API端点
const API_ENDPOINTS = {
  [AIProvider.DEEPSEEK]: 'https://api.deepseek.com/v1/chat/completions',
  [AIProvider.OPENAI]: 'https://api.openai.com/v1/chat/completions',
};

/**
 * AI服务类 - 处理与AI模型的交互
 */
export class AIService {
  private config: AIModelConfig;

  constructor(config: Partial<AIModelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 如果没有提供API端点，使用默认端点
    if (!this.config.apiEndpoint) {
      this.config.apiEndpoint = API_ENDPOINTS[this.config.provider];
    }
  }

  /**
   * 生成文本
   * @param options 请求选项
   * @returns AI响应
   */
  async generateText(options: AIRequestOptions): Promise<AIResponse> {
    try {
      // 检查API密钥
      if (!this.config.apiKey) {
        throw new Error('API key is required');
      }

      // 准备请求体
      const requestBody = this.prepareRequestBody(options);

      // 设置超时
      const timeout = options.timeout || 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // 发送请求
      const response = await fetch(this.config.apiEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer; ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // 清除超时
      clearTimeout(timeoutId);

      // 检查响应
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`AI API error: ${response.status} ${response.statusText} ${JSON.stringify(errorData)}`);
      }

      // 解析响应
      const data = await response.json();

      // 根据不同提供商解析响应
      return this.parseResponse(data);
    } catch (error) {
      console.error('Error generating text:', error);
      throw error;
    }
  }

  /**
   * 准备请求体
   * @param options 请求选项
   * @returns 请求体对象
   */
  private prepareRequestBody(options: AIRequestOptions): any {
    const { prompt, systemPrompt, temperature, maxTokens } = options;

    // 根据不同提供商准备请求体
    switch (this.config.provider) {
      case AIProvider.DEEPSEEK:
      case AIProvider.OPENAI:
        return {
          model: this.config.model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          temperature: temperature ?? this.config.temperature,
          max_tokens: maxTokens ?? this.config.maxTokens,
        };
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
  }

  /**
   * 解析响应
   * @param data 响应数据
   * @returns 格式化的AI响应
   */
  private parseResponse(data: any): AIResponse {
    // 根据不同提供商解析响应
    switch (this.config.provider) {
      case AIProvider.DEEPSEEK:
      case AIProvider.OPENAI:
        return {
          text: data.choices[0].message.content,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
          model: data.model,
          provider: this.config.provider,
        };
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<AIModelConfig>): void {
    this.config = { ...this.config, ...config };

    // 如果提供商改变，更新API端点
    if (config.provider && !config.apiEndpoint) {
      this.config.apiEndpoint = API_ENDPOINTS[config.provider];
    }
  }
}

/**
 * 创建AI服务实例
 * @param config 配置
 * @returns AI服务实例
 */
export function createAIService(config: Partial<AIModelConfig> = {}): AIService {
  return new AIService(config);
}
