import {
  characterStorage,
  chatHistoryStorage,
  focusStorage,
  mcpConfigStorage,
  ttsConfigStorage,
} from '@extension/storage';
import { CharacterAIService } from '../../../chrome-extension/src/services/characterAIService';
import { MCPService } from '../../../chrome-extension/src/services/mcpService';
import { TaskManagerImpl } from '../../../chrome-extension/src/tasks/taskManager';

// Character state management for content scripts
export type CharacterState = {
  isVisible: boolean;
  isAnimating: boolean;
  isChatOpen: boolean;
  currentAnimation: string;
  position: { x: number; y: number };
};

// Character animation types
export type AnimationType = 'idle' | 'greeting' | 'thinking' | 'speaking' | 'celebrating' | 'encouraging' | 'sleeping';

// Character manager for content scripts
export class ContentCharacterManager {
  private static instance: ContentCharacterManager;
  private state: CharacterState;
  private animationTimer?: NodeJS.Timeout;
  private contextCheckInterval?: NodeJS.Timeout;
  private focusModeListener?: (changes: any) => void;
  private characterConfigListener?: (changes: any) => void;
  private messageListener?: (message: any, sender: any, sendResponse: any) => void;
  private aiService: CharacterAIService;
  private mcpService: MCPService;
  private taskManager: TaskManagerImpl;
  private isDestroyed = false;
  private currentSpeechAudio?: HTMLAudioElement;

  private constructor() {
    this.aiService = CharacterAIService.getInstance();
    this.mcpService = MCPService.getInstance();
    this.taskManager = TaskManagerImpl.getInstance();
    this.state = {
      isVisible: false,
      isAnimating: false,
      isChatOpen: false,
      currentAnimation: 'idle',
      position: { x: 0, y: 0 },
    };

    // Set up cleanup on page unload
    this.setupPageUnloadCleanup();
  }

  static getInstance(): ContentCharacterManager {
    if (!ContentCharacterManager.instance) {
      ContentCharacterManager.instance = new ContentCharacterManager();
    }
    return ContentCharacterManager.instance;
  }

  // Cleanup method for proper memory management
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    console.log('Destroying ContentCharacterManager...');

    // Clear all timers
    this.clearAllTimers();

    // Remove all event listeners
    this.removeAllListeners();

    // Cleanup services
    this.cleanupServices();

    // Reset state
    this.state = {
      isVisible: false,
      isAnimating: false,
      isChatOpen: false,
      currentAnimation: 'idle',
      position: { x: 0, y: 0 },
    };

    this.isDestroyed = true;
    console.log('ContentCharacterManager destroyed');
  }

  // Setup page unload cleanup
  private setupPageUnloadCleanup(): void {
    const cleanup = () => {
      this.destroy();
    };

    // Listen for page unload events
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);

    // Listen for extension context invalidation
    if (chrome?.runtime?.onConnect) {
      chrome.runtime.onConnect.addListener(() => {
        // Context is still valid
      });
    }
  }

  // Clear all timers
  private clearAllTimers(): void {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = undefined;
    }

    if (this.contextCheckInterval) {
      clearInterval(this.contextCheckInterval);
      this.contextCheckInterval = undefined;
    }
  }

  // Remove all event listeners
  private removeAllListeners(): void {
    if (this.focusModeListener && chrome?.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.focusModeListener);
      this.focusModeListener = undefined;
    }

    if (this.characterConfigListener && chrome?.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.characterConfigListener);
      this.characterConfigListener = undefined;
    }

    if (this.messageListener && chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = undefined;
    }
  }

  // Cleanup services
  private cleanupServices(): void {
    try {
      // Stop any current speech
      this.stopSpeaking();

      // Services should have their own cleanup methods
      // For now, just log the cleanup
      console.log('Cleaning up AI service, MCP service, and task manager');
    } catch (error) {
      console.error('Error cleaning up services:', error);
    }
  }

  // 语音合成 - 让角色说话
  async speakText(
    text: string,
    options?: {
      autoPlay?: boolean;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    },
  ): Promise<boolean> {
    try {
      if (this.isDestroyed) {
        console.warn('Cannot speak: CharacterManager is destroyed');
        return false;
      }

      // 检查扩展上下文
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalid, cannot use TTS');
        return false;
      }

      // 获取TTS配置
      const ttsConfig = await ttsConfigStorage.get();
      if (!ttsConfig.enabled || !ttsConfig.appid || !ttsConfig.token) {
        console.log('TTS not configured or disabled');
        return false;
      }

      // 停止当前播放
      this.stopSpeaking();

      console.log('Character speaking:', text);

      // 播放说话动画
      await this.playAnimation('speaking');

      // 发送TTS请求到background script
      const response = await this.sendTTSRequest(text);

      if (response && response.success && response.audioData) {
        // 播放音频
        const success = await this.playAudioData(response.audioData, options);

        if (success) {
          options?.onStart?.();
          console.log('Character speech started successfully');
          return true;
        }
      }

      console.warn('TTS generation failed, character cannot speak');
      options?.onError?.(new Error('TTS generation failed'));
      return false;
    } catch (error) {
      console.error('Error in character speech:', error);
      options?.onError?.(error instanceof Error ? error : new Error('Unknown speech error'));
      return false;
    }
  }

  // 停止语音播放
  stopSpeaking(): void {
    if (this.currentSpeechAudio) {
      this.currentSpeechAudio.pause();
      this.currentSpeechAudio.currentTime = 0;
      this.currentSpeechAudio = undefined;
      console.log('Character speech stopped');
    }
  }

  // 发送TTS请求到background script
  private async sendTTSRequest(text: string): Promise<{ success: boolean; audioData?: string; error?: string }> {
    return new Promise(resolve => {
      if (!chrome?.runtime?.sendMessage) {
        resolve({ success: false, error: 'Chrome runtime not available' });
        return;
      }

      chrome.runtime.sendMessage(
        {
          type: 'GENERATE_TTS_AUDIO',
          text: text,
        },
        response => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { success: false, error: 'No response' });
        },
      );
    });
  }

  // 播放音频数据
  private async playAudioData(
    audioData: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    },
  ): Promise<boolean> {
    try {
      // 创建音频元素
      const audio = new Audio();
      this.currentSpeechAudio = audio;

      // 设置音频数据 (base64)
      audio.src = `data:audio/wav;base64,${audioData}`;

      // 设置事件监听器
      audio.onloadstart = () => {
        options?.onStart?.();
      };

      audio.onended = () => {
        this.currentSpeechAudio = undefined;
        options?.onEnd?.();
        console.log('Character speech ended');
      };

      audio.onerror = event => {
        this.currentSpeechAudio = undefined;
        const error = new Error('Audio playback failed');
        options?.onError?.(error);
        console.error('Character speech error:', event);
      };

      // 播放音频
      await audio.play();
      return true;
    } catch (error) {
      this.currentSpeechAudio = undefined;
      console.error('Error playing audio:', error);
      options?.onError?.(error instanceof Error ? error : new Error('Audio playback error'));
      return false;
    }
  }

  // Check if extension context is valid
  private isExtensionContextValid(): boolean {
    try {
      return !!chrome?.runtime?.id;
    } catch (error) {
      console.warn('Extension context check failed:', error);
      return false;
    }
  }

  // Initialize character manager
  async initialize(): Promise<void> {
    if (this.isDestroyed) {
      console.warn('Cannot initialize destroyed CharacterManager');
      return;
    }

    try {
      // Check extension context before initialization
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context is not valid, skipping character manager initialization');
        return;
      }

      // Initialize AI service
      await this.aiService.initialize();

      // Initialize MCP service and task manager
      await this.mcpService.initialize();
      await this.taskManager.initialize();

      const config = await characterStorage.get();

      if (config.enabled) {
        await this.show();
        this.startIdleAnimations();
      }

      // Listen for focus mode changes with proper cleanup tracking
      this.setupFocusModeListener();

      // Listen for character configuration changes
      this.setupCharacterConfigListener();

      // Start periodic extension context checking
      this.startContextMonitoring();

      console.log('Content character manager initialized');
    } catch (error) {
      console.error('Error initializing content character manager:', error);
      // If error is related to extension context, don't throw
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        console.warn('Character manager initialization failed due to invalid extension context');
      } else {
        throw error;
      }
    }
  }

  // Start monitoring extension context with proper cleanup
  private startContextMonitoring(): void {
    if (this.contextCheckInterval) {
      clearInterval(this.contextCheckInterval);
    }

    this.contextCheckInterval = setInterval(() => {
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context became invalid, cleaning up character manager');
        this.destroy();
      }
    }, 5000); // Check every 5 seconds
  }

  // Show character
  async show(): Promise<void> {
    const config = await characterStorage.get();

    this.state.isVisible = true;
    this.updatePosition(config.appearance.position);

    // Play greeting animation
    await this.playAnimation('greeting');

    this.notifyStateChange();
    console.log('Character shown');
  }

  // Hide character
  async hide(): Promise<void> {
    this.state.isVisible = false;
    this.stopIdleAnimations();

    if (this.state.isChatOpen) {
      await this.closeChatDialog();
    }

    this.notifyStateChange();
    console.log('Character hidden');
  }

  // Update character position based on configuration
  private updatePosition(position: string): void {
    const padding = 20;
    const characterSize = 60; // Base size, will be adjusted by size setting

    switch (position) {
      case 'bottom-right':
        this.state.position = {
          x: window.innerWidth - characterSize - padding,
          y: window.innerHeight - characterSize - padding,
        };
        break;
      case 'bottom-left':
        this.state.position = {
          x: padding,
          y: window.innerHeight - characterSize - padding,
        };
        break;
      case 'top-right':
        this.state.position = {
          x: window.innerWidth - characterSize - padding,
          y: padding,
        };
        break;
      case 'top-left':
        this.state.position = {
          x: padding,
          y: padding,
        };
        break;
      default:
        this.state.position = {
          x: window.innerWidth - characterSize - padding,
          y: window.innerHeight - characterSize - padding,
        };
    }
  }

  // Start idle animations
  private startIdleAnimations(): void {
    this.animationTimer = setInterval(async () => {
      if (!this.state.isAnimating && !this.state.isChatOpen) {
        const config = await characterStorage.get();
        if (config.behavior?.idleAnimations) {
          // Randomly play idle animations
          const animations: AnimationType[] = ['idle', 'thinking', 'sleeping'];
          const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
          this.playAnimation(randomAnimation);
        }
      }
    }, 10000); // Every 10 seconds
  }

  // Stop idle animations
  private stopIdleAnimations(): void {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = undefined;
    }
  }

  // Play character animation with proper timer management
  async playAnimation(animation: AnimationType): Promise<void> {
    if (this.isDestroyed || this.state.isAnimating) return;

    this.state.isAnimating = true;
    this.state.currentAnimation = animation;

    // Animation duration varies by type
    const duration = this.getAnimationDuration(animation);

    // Notify UI components about animation change
    this.notifyStateChange();

    // Clear existing animation timer
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
    }

    // Reset to idle after animation
    this.animationTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.state.isAnimating = false;
        this.state.currentAnimation = 'idle';
        this.notifyStateChange();
      }
      this.animationTimer = undefined;
    }, duration);
  }

  // Get animation duration in milliseconds
  private getAnimationDuration(animation: AnimationType): number {
    const durations: Record<AnimationType, number> = {
      idle: 2000,
      greeting: 3000,
      thinking: 4000,
      speaking: 2000,
      celebrating: 5000,
      encouraging: 4000,
      sleeping: 6000,
    };

    return durations[animation] || 2000;
  }

  // Handle character click
  async handleCharacterClick(): Promise<void> {
    try {
      await characterStorage.updateLastInteraction();

      if (this.state.isChatOpen) {
        await this.closeChatDialog();
      } else {
        await this.openChatDialog();
      }
    } catch (error) {
      console.error('Error handling character click:', error);
    }
  }

  // Open chat dialog
  async openChatDialog(): Promise<void> {
    try {
      this.state.isChatOpen = true;

      // Start new chat session
      const website = window.location.hostname;
      const focusConfig = await focusStorage.get();
      const focusMode = focusConfig.isActive;

      await chatHistoryStorage.startSession(website, focusMode);

      // Play greeting animation
      await this.playAnimation('greeting');

      this.notifyStateChange();

      console.log('Chat dialog opened');
    } catch (error) {
      console.error('Error opening chat dialog:', error);
    }
  }

  // Close chat dialog
  async closeChatDialog(): Promise<void> {
    try {
      this.state.isChatOpen = false;

      // End current session
      const config = await characterStorage.get();
      if (config.currentSession) {
        await chatHistoryStorage.endSession(config.currentSession);
      }

      this.notifyStateChange();

      console.log('Chat dialog closed');
    } catch (error) {
      console.error('Error closing chat dialog:', error);
    }
  }

  // Send message in chat
  async sendMessage(content: string, type: 'text' | 'voice' = 'text'): Promise<void> {
    try {
      // Add user message
      await chatHistoryStorage.addMessage({
        sender: 'user',
        content,
        type,
        metadata: {
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
        },
      });

      // Check for research requests if MCP is enabled
      const mcpConfig = await mcpConfigStorage.get();
      if (mcpConfig.enabled) {
        const detection = this.mcpService.detectResearchRequest(content);
        if (detection.isResearch && detection.suggestedTask && detection.query) {
          // Show thinking animation
          await this.playAnimation('thinking');

          // Add system message about detecting research request
          await chatHistoryStorage.addMessage({
            sender: 'character',
            content: `🔍 检测到研究请求，正在为你搜索"${detection.query}"...`,
            type: 'text',
            metadata: {
              website: window.location.hostname,
              focusMode: (await focusStorage.get()).isActive,
              context: 'mcp_detection',
            },
          });

          if (mcpConfig.autoExecute) {
            // Auto-execute research task
            await this.executeTask(detection.suggestedTask, detection.query);
            return;
          } else {
            // Ask user for confirmation
            await chatHistoryStorage.addMessage({
              sender: 'character',
              content: `我可以帮你执行这个搜索任务吗？回复"是"或"确认"来开始搜索。`,
              type: 'text',
              metadata: {
                website: window.location.hostname,
                focusMode: (await focusStorage.get()).isActive,
                context: 'mcp_confirmation',
                pendingTask: { taskId: detection.suggestedTask, query: detection.query },
              },
            });
            return;
          }
        }
      }

      // Check for confirmation of pending MCP task
      const recentMessages = await chatHistoryStorage.getRecentMessages(2);
      const lastCharacterMessage = recentMessages.find(msg => msg.sender === 'character');
      if (
        lastCharacterMessage?.metadata?.context === 'mcp_confirmation' &&
        lastCharacterMessage?.metadata?.pendingTask &&
        (content.includes('是') || content.includes('确认') || content.toLowerCase().includes('yes'))
      ) {
        const pendingTask = lastCharacterMessage.metadata.pendingTask;
        await this.executeTask(pendingTask.taskId, pendingTask.query);
        return;
      }

      // Generate character response
      await this.generateCharacterResponse(content);
    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message to chat
      await chatHistoryStorage.addMessage({
        sender: 'character',
        content: `抱歉，处理你的消息时出现了错误：${error instanceof Error ? error.message : '未知错误'}`,
        type: 'text',
        metadata: {
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
          context: 'error',
        },
      });
    }
  }

  // Execute MCP task
  async executeTask(taskId: string, query: string): Promise<void> {
    try {
      await this.playAnimation('thinking');

      // Add system message about starting task
      await chatHistoryStorage.addMessage({
        sender: 'character',
        content: `🤖 开始执行研究任务: "${query}"`,
        type: 'text',
        metadata: {
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
          context: 'task_start',
        },
      });

      // Try to execute task through task manager first
      let formattedResults: string;
      let taskResult: unknown = null;

      try {
        // Create task execution context
        const context = {
          taskId,
          query,
          userMessage: query,
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
          timestamp: Date.now(),
        };

        const result = await this.taskManager.executeTask(context);
        taskResult = result;

        if (result.results && Array.isArray(result.results)) {
          formattedResults = this.mcpService.formatResultsForChat(result.results);
        } else {
          formattedResults = '任务执行完成，但没有返回具体结果。';
        }
      } catch (taskManagerError) {
        console.warn('Task manager failed, trying direct MCP call:', taskManagerError);

        try {
          // Fallback to direct MCP call through background script
          const mcpResult = await this.executeDirectMCPTask(taskId, query);
          taskResult = mcpResult;

          if (mcpResult.success && mcpResult.data) {
            formattedResults = this.formatMCPResponseData(mcpResult.data);
          } else {
            formattedResults = `MCP 任务执行失败: ${mcpResult.error || '未知错误'}`;
          }
        } catch (mcpError) {
          console.error('Direct MCP call also failed:', mcpError);
          formattedResults = `任务执行失败: ${mcpError instanceof Error ? mcpError.message : '未知错误'}`;
        }
      }

      await chatHistoryStorage.addMessage({
        sender: 'character',
        content: `✅ 研究任务完成！\n\n${formattedResults}`,
        type: 'text',
        metadata: {
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
          context: 'task_complete',
          taskResult: taskResult,
        },
      });

      await this.playAnimation('celebrating');

      console.log('Task executed successfully:', taskResult);
    } catch (error) {
      console.error('Error executing task:', error);

      // Add error message to chat
      await chatHistoryStorage.addMessage({
        sender: 'character',
        content: `❌ 研究任务执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
        type: 'text',
        metadata: {
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
          context: 'task_error',
        },
      });
    }
  }

  // Execute MCP task directly through background script
  private async executeDirectMCPTask(
    taskId: string,
    query: string,
  ): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }> {
    return new Promise((resolve, reject) => {
      // Check extension context before making the call
      if (!this.isExtensionContextValid()) {
        reject(new Error('Extension context is not valid'));
        return;
      }

      // Check if chrome.runtime is available
      if (!chrome?.runtime?.sendMessage) {
        reject(new Error('Chrome runtime API not available'));
        return;
      }

      // Send MCP request to background script
      chrome.runtime.sendMessage(
        {
          type: 'MCP_REQUEST',
          command: taskId,
          query: query,
          taskId: taskId,
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

  // Format MCP response data for display
  private formatMCPResponseData(data: unknown): string {
    if (!data) {
      return '没有返回数据';
    }

    // Type guard for object data
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // Handle different response types
      if (obj.message && obj.platform) {
        // System operation response
        return `✅ ${obj.message} (平台: ${obj.platform})`;
      } else if (obj.action === 'chrome_search' && obj.url) {
        // Search response
        return `🔍 搜索链接已准备好：\n${obj.url}`;
      } else if (obj.platform && obj.arch) {
        // System info response
        return `💻 系统信息：\n平台：${obj.platform}\n架构：${obj.arch}\nNode版本：${obj.nodeVersion || 'N/A'}\n主机：${obj.hostname || 'N/A'}`;
      } else if (obj.results && Array.isArray(obj.results)) {
        // Search results response
        return this.mcpService.formatResultsForChat(obj.results);
      } else {
        // Generic object response
        return `操作完成：${JSON.stringify(data, null, 2)}`;
      }
    } else if (typeof data === 'string') {
      return data;
    } else {
      // Generic response
      return `操作完成：${String(data)}`;
    }
  }

  // Generate character response with optional voice synthesis
  private async generateCharacterResponse(userMessage: string): Promise<void> {
    try {
      await this.playAnimation('thinking');

      // Get conversation context
      const context = await this.buildConversationContext();

      // Generate AI response
      const aiResponse = await this.aiService.generateResponse(userMessage, context);

      // Add character response to chat
      const message = await chatHistoryStorage.addMessage({
        sender: 'character',
        content: aiResponse,
        type: 'text',
        metadata: {
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
        },
      });

      // Check if voice synthesis is enabled for character
      const characterConfig = await characterStorage.get();
      if (characterConfig.behavior?.voiceEnabled) {
        // Speak the response
        await this.speakText(aiResponse, {
          onStart: () => {
            console.log('Character started speaking response');
          },
          onEnd: () => {
            console.log('Character finished speaking response');
          },
          onError: error => {
            console.warn('Character speech failed:', error);
          },
        });
      } else {
        // Just play speaking animation without voice
        await this.playAnimation('speaking');
      }

      console.log('Character response generated:', aiResponse);
    } catch (error) {
      console.error('Error generating character response:', error);

      const fallbackMessage = '抱歉，我现在无法生成回应。不过我还是很乐意和你聊天的！😊';

      // Add fallback response
      await chatHistoryStorage.addMessage({
        sender: 'character',
        content: fallbackMessage,
        type: 'text',
        metadata: {
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
          context: 'ai_error',
        },
      });

      // Try to speak fallback message if voice is enabled
      const characterConfig = await characterStorage.get();
      if (characterConfig.behavior?.voiceEnabled) {
        await this.speakText(fallbackMessage);
      }
    }
  }

  // Build conversation context for AI
  private async buildConversationContext() {
    const focusConfig = await focusStorage.get();
    const recentMessages = await chatHistoryStorage.getRecentMessages(6);

    // Extract conversation history (alternating user/character messages)
    const conversationHistory = recentMessages
      .slice(0, 6) // Last 6 messages
      .map(msg => `${msg.sender === 'user' ? '用户' : '助手'}: ${msg.content}`)
      .reverse(); // Chronological order

    return {
      website: window.location.hostname,
      focusMode: focusConfig.isActive,
      conversationHistory,
    };
  }

  // Setup character configuration listener
  private setupCharacterConfigListener(): void {
    try {
      // Check if extension context is valid before setting up listener
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context not valid, skipping character config listener setup');
        return;
      }

      // Check if chrome.storage is available (extension context is valid)
      if (!chrome?.storage?.onChanged) {
        console.warn('Chrome storage API not available, skipping character config listener setup');
        return;
      }

      // Remove existing listener if any
      if (this.characterConfigListener) {
        chrome.storage.onChanged.removeListener(this.characterConfigListener);
      }

      // Create new listener function
      this.characterConfigListener = async (changes: any, areaName: string) => {
        try {
          // Double-check extension context and destruction state in listener
          if (this.isDestroyed || !this.isExtensionContextValid()) {
            console.warn('Extension context became invalid or manager destroyed in character config listener');
            return;
          }

          if (areaName === 'local' && changes['character-config-storage-key']) {
            const newValue = changes['character-config-storage-key'].newValue;
            const oldValue = changes['character-config-storage-key'].oldValue;

            console.log('Character configuration changed:', { old: oldValue, new: newValue });

            // Handle character enabled/disabled
            if (newValue?.enabled !== oldValue?.enabled) {
              if (newValue?.enabled) {
                console.log('Character enabled via popup');
                await this.show();
                this.startIdleAnimations();
              } else {
                console.log('Character disabled via popup - performing cleanup');
                await this.hide();
                // Perform thorough cleanup when disabled
                this.performCharacterDisabledCleanup();
              }
            }

            // Handle other configuration changes when character is enabled
            if (newValue?.enabled) {
              // Handle appearance changes
              if (newValue?.appearance?.position !== oldValue?.appearance?.position) {
                this.updatePosition(newValue.appearance.position);
                this.notifyStateChange();
              }

              // Handle behavior changes
              if (newValue?.behavior?.idleAnimations !== oldValue?.behavior?.idleAnimations) {
                if (newValue.behavior.idleAnimations) {
                  this.startIdleAnimations();
                } else {
                  this.stopIdleAnimations();
                }
              }
            }
          }
        } catch (error) {
          console.error('Error in character config listener:', error);
          // If extension context is invalidated, the listener will fail
          // This is expected behavior when extension is reloaded
        }
      };

      // Listen for character configuration changes
      chrome.storage.onChanged.addListener(this.characterConfigListener);
    } catch (error) {
      console.error('Error setting up character config listener:', error);
    }
  }

  // Perform cleanup when character is disabled via popup
  private performCharacterDisabledCleanup(): void {
    console.log('Performing character disabled cleanup...');

    // Stop all speech activities
    this.stopSpeaking();

    // Stop idle animations
    this.stopIdleAnimations();

    // Close chat dialog if open
    if (this.state.isChatOpen) {
      this.closeChatDialog().catch(error => {
        console.error('Error closing chat dialog during cleanup:', error);
      });
    }

    // Clear any pending timers
    this.clearAllTimers();

    // Reset state to hidden
    this.state.isVisible = false;
    this.state.isChatOpen = false;
    this.state.isAnimating = false;
    this.state.currentAnimation = 'idle';

    // Notify UI components
    this.notifyStateChange();

    console.log('Character disabled cleanup completed');
  }

  // Setup focus mode listener with proper cleanup tracking
  private setupFocusModeListener(): void {
    try {
      // Check if extension context is valid before setting up listener
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context not valid, skipping focus mode listener setup');
        return;
      }

      // Check if chrome.storage is available (extension context is valid)
      if (!chrome?.storage?.onChanged) {
        console.warn('Chrome storage API not available, skipping focus mode listener setup');
        return;
      }

      // Remove existing listener if any
      if (this.focusModeListener) {
        chrome.storage.onChanged.removeListener(this.focusModeListener);
      }

      // Create new listener function
      this.focusModeListener = async (changes: any, areaName: string) => {
        try {
          // Double-check extension context and destruction state in listener
          if (this.isDestroyed || !this.isExtensionContextValid()) {
            console.warn('Extension context became invalid or manager destroyed in focus mode listener');
            return;
          }

          if (areaName === 'local' && changes['focus-time-storage-key']) {
            const newValue = changes['focus-time-storage-key'].newValue;
            const oldValue = changes['focus-time-storage-key'].oldValue;

            // React to focus mode changes
            if (newValue?.isActive && !oldValue?.isActive) {
              await this.onFocusModeStart();
            } else if (!newValue?.isActive && oldValue?.isActive) {
              await this.onFocusModeEnd();
            }
          }
        } catch (error) {
          console.error('Error in focus mode listener:', error);
          // If extension context is invalidated, the listener will fail
          // This is expected behavior when extension is reloaded
        }
      };

      // Listen for focus mode changes
      chrome.storage.onChanged.addListener(this.focusModeListener);
    } catch (error) {
      console.error('Error setting up focus mode listener:', error);
    }
  }

  // Handle focus mode start
  private async onFocusModeStart(): Promise<void> {
    const config = await characterStorage.get();

    if (config.behavior.focusModeIntegration) {
      await this.playAnimation('encouraging');

      // Generate encouraging message
      try {
        const encouragingMessage = await this.aiService.generateFocusStartMessage();

        // Show message if proactive chat is enabled or chat is open
        if (config.behavior.proactiveChat || this.state.isChatOpen) {
          await chatHistoryStorage.addMessage({
            sender: 'character',
            content: encouragingMessage,
            type: 'text',
            metadata: {
              website: window.location.hostname,
              focusMode: true,
              context: 'focus_start',
            },
          });
        }

        console.log('Focus mode started - character encouraging user:', encouragingMessage);
      } catch (error) {
        console.error('Error generating focus start message:', error);
      }
    }
  }

  // Handle focus mode end
  private async onFocusModeEnd(): Promise<void> {
    const config = await characterStorage.get();

    if (config.behavior.focusModeIntegration) {
      await this.playAnimation('celebrating');

      // Generate celebration message
      try {
        const celebrationMessage = await this.aiService.generateFocusEndMessage();

        // Show message if proactive chat is enabled or chat is open
        if (config.behavior.proactiveChat || this.state.isChatOpen) {
          await chatHistoryStorage.addMessage({
            sender: 'character',
            content: celebrationMessage,
            type: 'text',
            metadata: {
              website: window.location.hostname,
              focusMode: false,
              context: 'focus_end',
            },
          });
        }

        console.log('Focus mode ended - character celebrating:', celebrationMessage);
      } catch (error) {
        console.error('Error generating focus end message:', error);
      }
    }
  }

  // Get current character state
  getState(): CharacterState {
    return { ...this.state };
  }

  // Notify UI components about state changes
  private notifyStateChange(): void {
    window.dispatchEvent(
      new CustomEvent('characterStateChange', {
        detail: this.getState(),
      }),
    );
  }

  // Check if character should be visible on current website
  async shouldBeVisible(): Promise<boolean> {
    const config = await characterStorage.get();
    return config.enabled;
  }

  // Test MCP functionality directly (for debugging)
  async testMCPFunction(command: string, query: string): Promise<void> {
    try {
      console.log(`🧪 Testing MCP function: ${command} with query: ${query}`);

      // Add test message to chat
      await chatHistoryStorage.addMessage({
        sender: 'user',
        content: `测试 MCP 功能: ${command} - ${query}`,
        type: 'text',
        metadata: {
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
          context: 'mcp_test',
        },
      });

      // Execute MCP task directly
      const result = await this.executeDirectMCPTask(command, query);

      let responseContent: string;
      if (result.success && result.data) {
        responseContent = `✅ MCP 测试成功！\n\n${this.formatMCPResponseData(result.data)}`;
      } else {
        responseContent = `❌ MCP 测试失败: ${result.error || '未知错误'}`;
      }

      // Add result to chat
      await chatHistoryStorage.addMessage({
        sender: 'character',
        content: responseContent,
        type: 'text',
        metadata: {
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
          context: 'mcp_test_result',
          taskResult: result,
        },
      });

      console.log('🎉 MCP test completed:', result);
    } catch (error) {
      console.error('❌ MCP test failed:', error);

      // Add error message to chat
      await chatHistoryStorage.addMessage({
        sender: 'character',
        content: `❌ MCP 测试出错: ${error instanceof Error ? error.message : '未知错误'}`,
        type: 'text',
        metadata: {
          website: window.location.hostname,
          focusMode: (await focusStorage.get()).isActive,
          context: 'mcp_test_error',
        },
      });
    }
  }

  // 直接让角色说话（用于外部调用）
  async makeCharacterSpeak(text: string): Promise<boolean> {
    try {
      const characterConfig = await characterStorage.get();
      if (!characterConfig.behavior?.voiceEnabled) {
        console.log('Character voice is disabled');
        return false;
      }

      return await this.speakText(text);
    } catch (error) {
      console.error('Error making character speak:', error);
      return false;
    }
  }

  // 检查角色是否正在说话
  isCharacterSpeaking(): boolean {
    return !!this.currentSpeechAudio && !this.currentSpeechAudio.paused;
  }
}
