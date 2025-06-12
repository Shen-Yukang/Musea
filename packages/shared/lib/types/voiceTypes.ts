/**
 * 语音交互相关类型定义
 */

// 语音错误类型枚举
export enum VoiceErrorType {
  // 权限相关错误
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  MICROPHONE_ACCESS_DENIED = 'MICROPHONE_ACCESS_DENIED',

  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',

  // TTS相关错误
  TTS_GENERATION_FAILED = 'TTS_GENERATION_FAILED',
  TTS_PLAYBACK_FAILED = 'TTS_PLAYBACK_FAILED',
  TTS_CONFIG_INVALID = 'TTS_CONFIG_INVALID',

  // 语音识别相关错误
  SPEECH_RECOGNITION_FAILED = 'SPEECH_RECOGNITION_FAILED',
  SPEECH_RECOGNITION_NOT_SUPPORTED = 'SPEECH_RECOGNITION_NOT_SUPPORTED',
  NO_SPEECH_DETECTED = 'NO_SPEECH_DETECTED',

  // 状态管理错误
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  CONCURRENT_OPERATION = 'CONCURRENT_OPERATION',

  // 配置错误
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_CONFIGURATION = 'MISSING_CONFIGURATION',

  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
}

// 语音状态枚举
export enum VoiceState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  PROCESSING = 'PROCESSING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}

// 语音错误类
export class VoiceError extends Error {
  constructor(
    public readonly type: VoiceErrorType,
    message: string,
    public readonly originalError?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'VoiceError';
  }

  // 创建用户友好的错误消息
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case VoiceErrorType.PERMISSION_DENIED:
      case VoiceErrorType.MICROPHONE_ACCESS_DENIED:
        return '需要麦克风权限才能使用语音功能，请在浏览器设置中允许访问麦克风';

      case VoiceErrorType.NETWORK_ERROR:
        return '网络连接失败，请检查网络连接后重试';

      case VoiceErrorType.TTS_GENERATION_FAILED:
        return '语音合成失败，请检查TTS配置或稍后重试';

      case VoiceErrorType.TTS_CONFIG_INVALID:
        return 'TTS配置无效，请检查AppID和Token设置';

      case VoiceErrorType.SPEECH_RECOGNITION_NOT_SUPPORTED:
        return '您的浏览器不支持语音识别功能';

      case VoiceErrorType.NO_SPEECH_DETECTED:
        return '没有检测到语音，请重试';

      default:
        return this.message || '语音功能出现未知错误';
    }
  }

  // 判断是否为可重试的错误
  isRetryable(): boolean {
    const retryableTypes = [
      VoiceErrorType.NETWORK_ERROR,
      VoiceErrorType.API_TIMEOUT,
      VoiceErrorType.TTS_GENERATION_FAILED,
      VoiceErrorType.NO_SPEECH_DETECTED,
    ];
    return retryableTypes.includes(this.type);
  }
}

// 语音操作结果
export interface VoiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: VoiceError;
}

// 语音播放选项
export interface SpeechOptions {
  voiceType?: string;
  speed?: number;
  volume?: number;
  interruptCurrent?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: VoiceError) => void;
}

// 语音播放结果
export interface SpeechResult {
  duration: number;
  interrupted: boolean;
}

// 语音监听选项
export interface ListenOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  timeout?: number;
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: VoiceError) => void;
}

// 语音监听结果
export interface ListenResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// 语音状态信息
export interface VoiceStateInfo {
  state: VoiceState;
  isListening: boolean;
  isSpeaking: boolean;
  conversationMode: boolean;
  currentOperation?: string;
  error?: VoiceError;
}

// 状态转换规则
export const STATE_TRANSITIONS: Record<VoiceState, VoiceState[]> = {
  [VoiceState.IDLE]: [VoiceState.LISTENING, VoiceState.SPEAKING],
  [VoiceState.LISTENING]: [VoiceState.PROCESSING, VoiceState.ERROR, VoiceState.IDLE],
  [VoiceState.PROCESSING]: [VoiceState.SPEAKING, VoiceState.ERROR, VoiceState.IDLE],
  [VoiceState.SPEAKING]: [VoiceState.LISTENING, VoiceState.ERROR, VoiceState.IDLE],
  [VoiceState.ERROR]: [VoiceState.IDLE],
};

// 语音服务接口
export interface IVoiceService {
  // 状态管理
  getState(): VoiceStateInfo;

  // 语音合成
  speak(text: string, options?: SpeechOptions): Promise<VoiceResult<SpeechResult>>;
  stopSpeaking(): Promise<VoiceResult<void>>;

  // 语音识别
  listen(options?: ListenOptions): Promise<VoiceResult<ListenResult>>;
  stopListening(): Promise<VoiceResult<void>>;

  // 权限管理
  requestPermissions(): Promise<VoiceResult<boolean>>;
  checkPermissions(): Promise<VoiceResult<boolean>>;

  // 对话模式
  startConversation(): Promise<VoiceResult<void>>;
  stopConversation(): Promise<VoiceResult<void>>;

  // 清理资源
  cleanup(): Promise<void>;
}
