/**
 * 语音服务 - 处理语音输入和输出
 * 集成Web Speech API和现有的TTS系统
 */

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

  private constructor() {
    this.initializeSpeechRecognition();
  }

  static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
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
   * 集成现有的TTS系统
   */
  async speak(text: string): Promise<boolean> {
    try {
      // 这里集成现有的TTS服务
      // 发送消息到background script来播放TTS
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'PLAY_TTS_SOUND',
          text: text,
        });
        return true;
      } else {
        // 回退到Web Speech API
        return this.fallbackSpeak(text);
      }
    } catch (error) {
      console.error('Error speaking text:', error);
      return false;
    }
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
}
