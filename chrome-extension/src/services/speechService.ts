/**
 * 语音服务 - 处理语音输入和输出
 * 集成Web Speech API和现有的TTS系统
 * 支持语音对话配置和连续对话模式
 */

// Note: This service will be moved to shared package for better accessibility

import { speechChatConfigStorage } from '@extension/storage';

// 语音识别结果接口
export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

// 语音识别选项
export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

// 语音识别事件回调
export interface SpeechRecognitionCallbacks {
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * 语音服务类
 */
export class SpeechService {
  private static instance: SpeechService;
  private recognition: any = null;
  private isListening = false;
  private callbacks: SpeechRecognitionCallbacks = {};
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private conversationMode = false;
  private sessionTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeSpeechRecognition();
    this.loadConfiguration();
  }

  static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }

  /**
   * 加载语音对话配置
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const config = await speechChatConfigStorage.get();
      this.conversationMode = config.conversationMode;

      // 应用配置到语音识别
      if (this.recognition) {
        this.recognition.continuous = config.input.continuous;
        this.recognition.interimResults = config.input.interimResults;
        this.recognition.lang = config.input.language;
        this.recognition.maxAlternatives = config.input.maxAlternatives;
      }
    } catch (error) {
      console.error('Error loading speech configuration:', error);
    }
  }

  /**
   * 初始化语音识别
   */
  private initializeSpeechRecognition(): void {
    try {
      // 检查浏览器支持
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.warn('Speech recognition not supported in this browser');
        return;
      }

      this.recognition = new SpeechRecognition();

      // 配置语音识别
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'zh-CN'; // 默认中文
      this.recognition.maxAlternatives = 1;

      // 设置事件监听器
      this.setupEventListeners();

      console.log('Speech recognition initialized');
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('Speech recognition started');
      this.callbacks.onStart?.();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('Speech recognition ended');
      this.callbacks.onEnd?.();
    };

    this.recognition.onresult = (event: any) => {
      try {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        const isFinal = result.isFinal;

        const speechResult: SpeechRecognitionResult = {
          text: transcript,
          confidence: confidence || 0,
          isFinal,
        };

        console.log('Speech recognition result:', speechResult);
        this.callbacks.onResult?.(speechResult);
      } catch (error) {
        console.error('Error processing speech result:', error);
        this.callbacks.onError?.('处理语音结果时出错');
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;

      let errorMessage = '语音识别出错';
      switch (event.error) {
        case 'no-speech':
          errorMessage = '没有检测到语音，请重试';
          break;
        case 'audio-capture':
          errorMessage = '无法访问麦克风，请检查权限';
          break;
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝';
          break;
        case 'network':
          errorMessage = '网络错误，请检查连接';
          break;
        case 'service-not-allowed':
          errorMessage = '语音服务不可用';
          break;
      }

      this.callbacks.onError?.(errorMessage);
    };
  }

  /**
   * 开始语音识别
   */
  async startListening(
    options: SpeechRecognitionOptions = {},
    callbacks: SpeechRecognitionCallbacks = {},
  ): Promise<boolean> {
    try {
      if (!this.recognition) {
        callbacks.onError?.('语音识别不支持');
        return false;
      }

      if (this.isListening) {
        console.log('Speech recognition already active');
        return true;
      }

      // 更新配置
      if (options.language) {
        this.recognition.lang = options.language;
      }
      if (options.continuous !== undefined) {
        this.recognition.continuous = options.continuous;
      }
      if (options.interimResults !== undefined) {
        this.recognition.interimResults = options.interimResults;
      }
      if (options.maxAlternatives !== undefined) {
        this.recognition.maxAlternatives = options.maxAlternatives;
      }

      // 设置回调
      this.callbacks = callbacks;

      // 开始识别
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      callbacks.onError?.('启动语音识别失败');
      return false;
    }
  }

  /**
   * 停止语音识别
   */
  stopListening(): void {
    try {
      if (this.recognition && this.isListening) {
        this.recognition.stop();
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }

  /**
   * 检查是否正在监听
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * 检查浏览器是否支持语音识别
   */
  isSupported(): boolean {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition;
  }

  /**
   * 语音合成 - 让角色说话
   * 集成现有的TTS系统和语音对话配置
   */
  async speak(text: string, options?: { autoStartListening?: boolean }): Promise<boolean> {
    try {
      const config = await speechChatConfigStorage.get();

      // 如果新输入时中断播放，停止当前播放
      if (config.output.interruptOnNewInput) {
        this.stopSpeaking();
      }

      if (!config.output.enabled) {
        console.log('Speech output is disabled');
        return false;
      }

      let success = false;

      if (config.output.useTTS && typeof chrome !== 'undefined' && chrome.runtime) {
        // 使用TTS服务
        chrome.runtime.sendMessage({
          type: 'PLAY_TTS_SOUND',
          text: text,
        });
        success = true;
      } else {
        // 使用Web Speech API
        success = await this.speakWithWebAPI(text, config);
      }

      // 如果启用对话模式且播放成功，在播放完成后自动开始监听
      if (success && this.conversationMode && options?.autoStartListening) {
        this.scheduleAutoListening();
      }

      return success;
    } catch (error) {
      console.error('Error speaking text:', error);
      return false;
    }
  }

  /**
   * 使用Web Speech API进行语音合成
   */
  private async speakWithWebAPI(text: string, config: any): Promise<boolean> {
    return new Promise(resolve => {
      try {
        if (!('speechSynthesis' in window)) {
          resolve(false);
          return;
        }

        // 停止当前播放
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = config.input.language;
        utterance.rate = config.output.playSpeed;
        utterance.volume = config.output.volume;

        utterance.onend = () => {
          this.currentUtterance = null;
          resolve(true);
        };

        utterance.onerror = () => {
          this.currentUtterance = null;
          resolve(false);
        };

        this.currentUtterance = utterance;
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error with Web Speech API:', error);
        resolve(false);
      }
    });
  }

  /**
   * 停止当前语音播放
   */
  stopSpeaking(): void {
    try {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
      this.currentUtterance = null;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  /**
   * 安排自动监听（对话模式）
   */
  private scheduleAutoListening(): void {
    // 清除之前的定时器
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    // 延迟1秒后开始监听，给用户反应时间
    this.sessionTimeout = setTimeout(async () => {
      if (this.conversationMode && !this.isListening) {
        const config = await speechChatConfigStorage.get();
        await this.startListening({
          language: config.input.language,
          continuous: config.input.continuous,
          interimResults: config.input.interimResults,
          maxAlternatives: config.input.maxAlternatives,
        });
      }
    }, 1000);
  }

  /**
   * 回退语音合成（使用Web Speech API）
   */
  private fallbackSpeak(text: string): boolean {
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;

        speechSynthesis.speak(utterance);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error with fallback speech synthesis:', error);
      return false;
    }
  }

  /**
   * 获取可用的语音
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if ('speechSynthesis' in window) {
      return speechSynthesis.getVoices();
    }
    return [];
  }

  /**
   * 请求麦克风权限
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 立即停止流，我们只是检查权限
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * 启用/禁用对话模式
   */
  async setConversationMode(enabled: boolean): Promise<void> {
    this.conversationMode = enabled;
    await speechChatConfigStorage.enableConversationMode(enabled);

    if (!enabled && this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }

  /**
   * 检查是否处于对话模式
   */
  isConversationMode(): boolean {
    return this.conversationMode;
  }

  /**
   * 开始语音对话会话
   */
  async startConversationSession(): Promise<boolean> {
    try {
      await this.setConversationMode(true);
      const config = await speechChatConfigStorage.get();

      return await this.startListening({
        language: config.input.language,
        continuous: config.input.continuous,
        interimResults: config.input.interimResults,
        maxAlternatives: config.input.maxAlternatives,
      });
    } catch (error) {
      console.error('Error starting conversation session:', error);
      return false;
    }
  }

  /**
   * 结束语音对话会话
   */
  async endConversationSession(): Promise<void> {
    try {
      await this.setConversationMode(false);
      this.stopListening();
      this.stopSpeaking();

      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
        this.sessionTimeout = null;
      }
    } catch (error) {
      console.error('Error ending conversation session:', error);
    }
  }

  /**
   * 重新加载配置
   */
  async reloadConfiguration(): Promise<void> {
    await this.loadConfiguration();
  }
}
