import { aiConfigStorage, notificationCacheStorage, focusStorage } from '@extension/storage';
import { AI } from '../../constants/index.js';
import { getRandomFallbackMessage } from '@extension/shared/lib/services/notificationGenerator.js';

export class NotificationManager {
  private static instance: NotificationManager;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 获取专注结束通知消息
   */
  async getEndNotification(): Promise<string> {
    try {
      const aiConfig = await aiConfigStorage.get();

      if (!aiConfig.enabled) {
        return this.getDefaultEndMessage();
      }

      // 尝试从缓存获取AI生成的通知
      const cachedNotification = await notificationCacheStorage.getNotification();

      if (cachedNotification) {
        console.log('Using cached AI notification');
        return cachedNotification;
      }

      // 如果没有缓存或缓存过期，生成新的通知
      return await this.generateAINotification();
    } catch (error) {
      console.error('Error getting end notification:', error);
      return this.getDefaultEndMessage();
    }
  }

  /**
   * 预生成AI通知
   */
  async preGenerateNotification(duration: number): Promise<void> {
    try {
      const aiConfig = await aiConfigStorage.get();

      if (!aiConfig.enabled) {
        return;
      }

      // 在专注时间结束前几分钟预生成通知
      const preGenerateTime = Math.max(
        AI.MIN_PRE_GENERATE_MINUTES,
        Math.min(AI.MAX_PRE_GENERATE_MINUTES, duration - AI.DEFAULT_PRE_GENERATE_MINUTES),
      );

      setTimeout(
        async () => {
          try {
            await this.generateAINotification();
            console.log('AI notification pre-generated successfully');
          } catch (error) {
            console.error('Error pre-generating AI notification:', error);
          }
        },
        preGenerateTime * 60 * 1000,
      );
    } catch (error) {
      console.error('Error setting up notification pre-generation:', error);
    }
  }

  /**
   * 生成AI通知
   */
  private async generateAINotification(): Promise<string> {
    try {
      const aiConfig = await aiConfigStorage.get();

      if (!aiConfig.apiKey || !aiConfig.provider) {
        console.log('AI configuration incomplete, using default message');
        return this.getDefaultEndMessage();
      }

      // 构建AI请求
      const prompt = await this.buildNotificationPrompt();
      const aiResponse = await this.callAIService(aiConfig, prompt);

      if (aiResponse) {
        // 缓存AI生成的通知
        await notificationCacheStorage.saveNotification(aiResponse);

        console.log('AI notification generated and cached');
        return aiResponse;
      }

      return this.getDefaultEndMessage();
    } catch (error) {
      console.error('Error generating AI notification:', error);
      return this.getDefaultEndMessage();
    }
  }

  /**
   * 构建AI提示词
   */
  private async buildNotificationPrompt(): Promise<string> {
    const currentTime = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 获取专注时长
    const focusConfig = await focusStorage.get();
    const duration = focusConfig.duration;

    // 获取AI配置中的自定义提示词模板
    const aiConfig = await aiConfigStorage.get();
    const promptTemplate =
      aiConfig.promptTemplate ||
      `现在是${currentTime}，用户刚刚完成了{duration}分钟的专注时间段。请生成一条温暖、鼓励的休息提醒，内容要：
1. 简洁明了（不超过50字）
2. 积极正面，给用户成就感
3. 建议适当的休息活动
4. 语气亲切自然, 邻家女孩口吻或可爱学妹口吻, 带有情感色彩

请直接返回通知内容，不要包含其他解释。`;

    return promptTemplate.replace('{duration}', duration.toString());
  }

  /**
   * 调用AI服务
   */
  private async callAIService(aiConfig: any, prompt: string): Promise<string | null> {
    try {
      // 获取API端点
      const apiEndpoint = this.getAPIEndpoint(aiConfig.provider);

      // 准备请求体
      const requestBody = this.prepareRequestBody(aiConfig, prompt);

      // 设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      // 发送请求
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // 清除超时
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices[0].message.content;

      // 格式化通知
      const notification = text
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      // 如果消息太长，截断它
      if (notification.length > 100) {
        return notification.substring(0, 97) + '...';
      }

      return notification;
    } catch (error) {
      console.error('Error calling AI service:', error);
      return null;
    }
  }

  /**
   * 获取API端点
   */
  private getAPIEndpoint(provider: string): string {
    const endpoints: Record<string, string> = {
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      openai: 'https://api.openai.com/v1/chat/completions',
    };
    return endpoints[provider] || endpoints['deepseek'];
  }

  /**
   * 准备请求体
   */
  private prepareRequestBody(aiConfig: any, prompt: string): object {
    const defaultSystemPrompt = `你是一个友好、积极的助手，负责在用户专注工作一段时间后提醒他们休息。
你的消息应该：
1. 简短（不超过50个字）
2. 友好且鼓励性的
3. 有时可以幽默或有趣
4. 提醒用户休息的重要性
5. 偶尔可以建议简单的伸展运动或放松技巧
6. 语气亲切自然, 邻家女孩口吻或可爱学妹口吻, 带有情感色彩
7. 不要重复相同的内容
8. 不要使用过于正式或机械的语言
 `;

    const systemPrompt = aiConfig.systemPrompt || defaultSystemPrompt;

    return {
      model: aiConfig.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 100,
    };
  }

  /**
   * 获取默认结束消息
   */
  private getDefaultEndMessage(): string {
    return getRandomFallbackMessage();
  }

  /**
   * 清除通知缓存
   */
  async clearNotificationCache(): Promise<void> {
    try {
      await notificationCacheStorage.clearNotification();
      console.log('Notification cache cleared');
    } catch (error) {
      console.error('Error clearing notification cache:', error);
    }
  }
}
