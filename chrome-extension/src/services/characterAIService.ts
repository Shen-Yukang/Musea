import { aiConfigStorage, characterStorage, focusStorage } from '@extension/storage';
import { MCPService } from './mcpService';
import { MESSAGE_TYPES } from '../constants/index';

/**
 * 虚拟角色AI服务
 * 专门为虚拟角色生成个性化的对话回应
 */
export class CharacterAIService {
  private static instance: CharacterAIService;
  private isAIEnabled = false;
  private mcpService: MCPService;

  private constructor() {
    this.mcpService = MCPService.getInstance();
  }

  static getInstance(): CharacterAIService {
    if (!CharacterAIService.instance) {
      CharacterAIService.instance = new CharacterAIService();
    }
    return CharacterAIService.instance;
  }

  /**
   * 初始化AI服务
   */
  async initialize(): Promise<void> {
    try {
      const aiConfig = await aiConfigStorage.get();
      this.isAIEnabled = aiConfig.enabled && !!aiConfig.apiKey;

      // 初始化MCP服务
      await this.mcpService.initialize();

      if (this.isAIEnabled) {
        console.log('Character AI service initialized with AI enabled');
      } else {
        console.log('AI not configured, character will use fallback responses');
      }
    } catch (error) {
      console.error('Error initializing character AI service:', error);
      this.isAIEnabled = false;
    }
  }

  /**
   * 生成角色回应
   */
  async generateResponse(
    userMessage: string,
    context?: {
      website?: string;
      focusMode?: boolean;
      conversationHistory?: string[];
    },
  ): Promise<string> {
    try {
      // 首先检查是否为MCP研究请求
      const mcpDetection = this.mcpService.detectResearchRequest(userMessage);

      if (mcpDetection.isResearch && this.mcpService.isEnabled()) {
        console.log('Detected MCP research request:', mcpDetection);

        try {
          // 执行MCP任务
          const mcpResponse = await this.executeMCPTask(mcpDetection);

          if (mcpResponse.success) {
            // 格式化MCP结果为友好的回应
            const formattedResponse = this.formatMCPResponse(mcpResponse, mcpDetection);
            console.log('MCP response generated:', formattedResponse);
            return formattedResponse;
          } else {
            console.log('MCP task failed, using fallback response');
            return `抱歉，搜索时遇到了问题：${mcpResponse.error}。让我用其他方式帮助你吧！`;
          }
        } catch (error) {
          console.error('MCP task execution failed:', error);
          return '抱歉，我现在无法帮你搜索信息，请稍后再试。不过我还是很乐意和你聊天的！😊';
        }
      }

      // 如果不是MCP请求，继续原有的AI/回退逻辑
      if (!this.isAIEnabled) {
        console.log('AI not enabled, using fallback response');
        return this.getFallbackResponse(userMessage, context);
      }

      // 构建个性化提示词
      const prompt = await this.buildCharacterPrompt(userMessage, context);
      const systemPrompt = await this.buildSystemPrompt();

      // 直接调用AI API
      const response = await this.callAIAPI(prompt, systemPrompt);

      if (response) {
        console.log('AI response generated:', response);
        return response;
      } else {
        console.log('AI API failed, using fallback response');
        return this.getFallbackResponse(userMessage, context);
      }
    } catch (error) {
      console.error('Error generating character response:', error);
      return this.getFallbackResponse(userMessage, context);
    }
  }

  /**
   * 构建角色系统提示词
   */
  private async buildSystemPrompt(): Promise<string> {
    const characterConfig = await characterStorage.get();
    const { personality, name } = characterConfig.personality;

    // 基础角色设定
    let basePrompt = `你是${name}，一个友好的虚拟学习助手。`;

    // 根据性格类型调整提示词
    switch (personality) {
      case 'friendly':
        basePrompt += `你性格友好亲切，总是用温暖的语气与用户交流，像朋友一样关心用户的学习和生活。`;
        break;
      case 'professional':
        basePrompt += `你性格专业严谨，提供准确有用的建议，但保持亲和力，不会过于正式。`;
        break;
      case 'encouraging':
        basePrompt += `你性格积极鼓励，总是能发现用户的进步，给予正面的反馈和动力，帮助用户保持学习热情。`;
        break;
      case 'playful':
        basePrompt += `你性格活泼有趣，喜欢用轻松幽默的方式与用户交流，让学习变得更有趣。`;
        break;
      case 'custom':
        if (characterConfig.personality.customPrompt) {
          basePrompt += characterConfig.personality.customPrompt;
        } else {
          basePrompt += `你性格温和友善，善于倾听和理解用户的需求。`;
        }
        break;
      default:
        basePrompt += `你性格温和友善，善于倾听和理解用户的需求。`;
    }

    // 回应风格指导
    const { responseStyle } = characterConfig.personality;
    switch (responseStyle) {
      case 'brief':
        basePrompt += `\n\n回应风格：简洁明了，用最少的话表达最重要的内容，通常1-2句话。`;
        break;
      case 'detailed':
        basePrompt += `\n\n回应风格：详细周到，提供充分的解释和建议，但保持条理清晰。`;
        break;
      case 'conversational':
        basePrompt += `\n\n回应风格：对话式交流，自然流畅，就像朋友间的聊天。`;
        break;
    }

    // 通用指导原则
    basePrompt += `\n\n指导原则：
1. 始终保持积极正面的态度
2. 根据用户的学习状态给予适当的建议
3. 使用自然、亲切的中文表达
4. 避免过于正式或机械化的语言
5. 适当使用表情符号增加亲和力
6. 关注用户的专注学习和休息平衡`;

    return basePrompt;
  }

  /**
   * 构建角色对话提示词
   */
  private async buildCharacterPrompt(
    userMessage: string,
    context?: {
      website?: string;
      focusMode?: boolean;
      conversationHistory?: string[];
    },
  ): Promise<string> {
    let prompt = `用户说："${userMessage}"`;

    // 添加上下文信息
    if (context) {
      if (context.website) {
        prompt += `\n\n当前网站：${context.website}`;
      }

      if (context.focusMode !== undefined) {
        prompt += `\n专注模式：${context.focusMode ? '开启中' : '未开启'}`;

        if (context.focusMode) {
          const focusConfig = await focusStorage.get();
          prompt += `（专注时长：${focusConfig.duration}分钟）`;
        }
      }

      // 添加对话历史（最近3条）
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        const recentHistory = context.conversationHistory.slice(-3);
        prompt += `\n\n最近对话：\n${recentHistory.join('\n')}`;
      }
    }

    prompt += `\n\n请根据你的角色设定，用自然、亲切的方式回应用户。回应应该：
1. 符合你的性格特点
2. 考虑当前的上下文环境
3. 给用户有用的建议或鼓励
4. 保持对话的连贯性`;

    return prompt;
  }

  /**
   * 获取回退回应（当AI不可用时）
   */
  private getFallbackResponse(
    userMessage: string,
    context?: {
      website?: string;
      focusMode?: boolean;
    },
  ): string {
    const responses = {
      greeting: [
        '你好！我是你的学习助手，有什么可以帮助你的吗？😊',
        '嗨！很高兴见到你！今天学习怎么样？',
        '你好呀！我在这里陪伴你的学习之旅～',
      ],
      encouragement: [
        '你做得很好！继续保持这种状态！💪',
        '我相信你能做到的！加油！',
        '每一步进步都值得庆祝，你很棒！',
        '坚持就是胜利，我为你感到骄傲！',
      ],
      focus: [
        '专注学习的你真的很有魅力呢！✨',
        '看你这么认真，我也要更努力地帮助你！',
        '专注的时光总是过得很快，记得适当休息哦～',
      ],
      general: [
        '我理解你的想法！',
        '这很有趣，告诉我更多吧！',
        '我在这里支持你！',
        '让我们一起努力吧！',
        '你的想法很不错呢！',
        '我会一直陪伴在你身边的～',
      ],
      rest: ['学习了这么久，要不要休息一下？', '劳逸结合才能更高效哦！', '适当的休息是为了更好的前进～'],
    };

    // 根据上下文选择合适的回应类型
    let responseType = 'general';

    if (context?.focusMode) {
      responseType = 'focus';
    } else if (userMessage.includes('你好') || userMessage.includes('hi') || userMessage.includes('hello')) {
      responseType = 'greeting';
    } else if (userMessage.includes('累') || userMessage.includes('休息')) {
      responseType = 'rest';
    } else if (userMessage.includes('加油') || userMessage.includes('鼓励')) {
      responseType = 'encouragement';
    }

    const responseList = responses[responseType as keyof typeof responses];
    return responseList[Math.floor(Math.random() * responseList.length)];
  }

  /**
   * 生成专注模式开始时的鼓励消息
   */
  async generateFocusStartMessage(): Promise<string> {
    try {
      if (!this.isAIEnabled) {
        return this.getFallbackResponse('开始专注', { focusMode: true });
      }

      const focusConfig = await focusStorage.get();
      const prompt = `用户刚刚开始了${focusConfig.duration}分钟的专注学习时间。请生成一条简短的鼓励消息，让用户感到动力和支持。`;
      const systemPrompt = await this.buildSystemPrompt();

      const response = await this.callAIAPI(prompt, systemPrompt);

      if (response) {
        return response.trim();
      } else {
        return '开始专注学习啦！我会在这里默默支持你的！加油！💪';
      }
    } catch (error) {
      console.error('Error generating focus start message:', error);
      return '开始专注学习啦！我会在这里默默支持你的！加油！💪';
    }
  }

  /**
   * 生成专注模式结束时的庆祝消息
   */
  async generateFocusEndMessage(): Promise<string> {
    try {
      if (!this.isAIEnabled) {
        return '太棒了！你完成了这次专注学习！🎉 记得适当休息一下哦～';
      }

      const focusConfig = await focusStorage.get();
      const prompt = `用户刚刚完成了${focusConfig.duration}分钟的专注学习。请生成一条庆祝和鼓励的消息，同时提醒用户适当休息。`;
      const systemPrompt = await this.buildSystemPrompt();

      const response = await this.callAIAPI(prompt, systemPrompt);

      if (response) {
        return response.trim();
      } else {
        return '恭喜你完成了专注学习！🎉 你真的很棒！现在可以好好休息一下了～';
      }
    } catch (error) {
      console.error('Error generating focus end message:', error);
      return '恭喜你完成了专注学习！🎉 你真的很棒！现在可以好好休息一下了～';
    }
  }

  /**
   * 直接调用AI API
   */
  private async callAIAPI(prompt: string, systemPrompt: string): Promise<string | null> {
    try {
      const aiConfig = await aiConfigStorage.get();

      if (!aiConfig.enabled || !aiConfig.apiKey) {
        return null;
      }

      // 获取API端点
      const apiEndpoint = this.getAPIEndpoint(aiConfig.provider);

      // 准备请求体
      const requestBody = {
        model: aiConfig.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      };

      // 设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

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

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling AI API:', error);
      return null;
    }
  }

  /**
   * 获取API端点
   */
  private getAPIEndpoint(provider: string): string {
    switch (provider) {
      case 'deepseek':
        return 'https://api.deepseek.com/v1/chat/completions';
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      default:
        return 'https://api.deepseek.com/v1/chat/completions';
    }
  }

  /**
   * 执行MCP任务
   */
  private async executeMCPTask(mcpDetection: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // 发送MCP请求到background script
      chrome.runtime.sendMessage(
        {
          type: MESSAGE_TYPES.MCP_REQUEST,
          command: mcpDetection.suggestedTask || 'general_research',
          query: mcpDetection.query,
          taskId: mcpDetection.suggestedTask,
          options: {
            maxResults: 5,
            timeout: 30000,
          },
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response) {
            resolve(response);
          } else {
            reject(new Error('No response from background script'));
          }
        },
      );
    });
  }

  /**
   * 格式化MCP响应为友好的回应
   */
  private formatMCPResponse(mcpResponse: any, mcpDetection: any): string {
    try {
      if (!mcpResponse.success || !mcpResponse.data) {
        return '抱歉，我没能找到相关信息，但我很乐意继续和你聊天！😊';
      }

      const data = mcpResponse.data;

      // 根据不同的MCP响应类型格式化
      if (data.message && data.platform) {
        // 系统操作类响应
        return `好的！${data.message} 😊`;
      } else if (data.action === 'chrome_search' && data.url) {
        // 搜索类响应
        return `我帮你准备了搜索链接！你可以点击这里查看结果：${data.url} 🔍`;
      } else if (data.platform && data.arch) {
        // 系统信息响应
        return `这是你的系统信息：\n平台：${data.platform}\n架构：${data.arch}\nNode版本：${data.nodeVersion}\n主机：${data.hostname} 💻`;
      } else if (data.results && Array.isArray(data.results)) {
        // 搜索结果响应
        const formattedResults = this.mcpService.formatResultsForChat(data.results);
        return `我帮你搜索了相关信息！\n\n${formattedResults}`;
      } else {
        // 通用响应
        return `我完成了你的请求！${data.message || '操作成功'} ✨`;
      }
    } catch (error) {
      console.error('Error formatting MCP response:', error);
      return '我处理了你的请求，但在格式化结果时遇到了一些问题。不过操作应该是成功的！😊';
    }
  }

  /**
   * 更新AI配置
   */
  async updateAIConfig(): Promise<void> {
    await this.initialize();
  }
}
