/**
 * 统一的语音服务实现
 * 解决代码重复和状态管理问题
 */

import type {
  IVoiceService,
  VoiceStateInfo,
  VoiceResult,
  SpeechOptions,
  SpeechResult,
  ListenOptions,
  ListenResult,
} from '../types/voiceTypes.js';
import { VoiceState, VoiceError, VoiceErrorType, STATE_TRANSITIONS } from '../types/voiceTypes.js';
import { VOICE_CONSTANTS, RECOGNITION_CONSTANTS } from '../constants/voiceConstants.js';
import type { PlaybackCallbacks } from './voicePlaybackManager.js';
import { VoicePlaybackManager } from './voicePlaybackManager.js';
import type { RecognitionCallbacks } from './voiceRecognitionManager.js';
import { VoiceRecognitionManager } from './voiceRecognitionManager.js';

export class UnifiedVoiceService implements IVoiceService {
  private state: VoiceState = VoiceState.IDLE;
  private isListening = false;
  private isSpeaking = false;
  private conversationMode = false;
  private currentError?: VoiceError;

  // 使用专门的管理器
  private playbackManager: VoicePlaybackManager;
  private recognitionManager: VoiceRecognitionManager;

  // 事件监听器清理
  private cleanupTasks: (() => void)[] = [];

  constructor() {
    this.playbackManager = new VoicePlaybackManager();
    this.recognitionManager = new VoiceRecognitionManager();
    this.initializeService();
  }

  private initializeService(): void {
    // 检查浏览器支持
    if (typeof window === 'undefined') {
      return;
    }

    // 监听页面卸载，确保资源清理
    const handleUnload = () => this.cleanup();
    window.addEventListener('beforeunload', handleUnload);
    this.cleanupTasks.push(() => window.removeEventListener('beforeunload', handleUnload));
  }

  // 状态管理
  getState(): VoiceStateInfo {
    return {
      state: this.state,
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      conversationMode: this.conversationMode,
      error: this.currentError,
    };
  }

  private setState(newState: VoiceState): void {
    const allowedTransitions = STATE_TRANSITIONS[this.state];
    if (!allowedTransitions.includes(newState)) {
      throw new VoiceError(
        VoiceErrorType.INVALID_STATE_TRANSITION,
        `Invalid state transition from ${this.state} to ${newState}`,
        undefined,
        { currentState: this.state, targetState: newState },
      );
    }

    console.log(`Voice state transition: ${this.state} -> ${newState}`);
    this.state = newState;

    // 清除错误状态
    if (newState !== VoiceState.ERROR) {
      this.currentError = undefined;
    }
  }

  private setErrorState(error: VoiceError): void {
    this.currentError = error;
    this.state = VoiceState.ERROR;
    this.isListening = false;
    this.isSpeaking = false;
    console.error('Voice service error:', error);
  }

  // 权限管理
  async requestPermissions(): Promise<VoiceResult<boolean>> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new VoiceError(VoiceErrorType.SPEECH_RECOGNITION_NOT_SUPPORTED, 'MediaDevices API not supported');
      }

      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Permission request timeout')),
            RECOGNITION_CONSTANTS.PERMISSION_CHECK_TIMEOUT,
          ),
        ),
      ]);

      // 立即停止流，只是检查权限
      stream.getTracks().forEach(track => track.stop());

      return { success: true, data: true };
    } catch (error) {
      const voiceError = new VoiceError(
        VoiceErrorType.MICROPHONE_ACCESS_DENIED,
        'Microphone permission denied',
        error as Error,
      );
      return { success: false, error: voiceError };
    }
  }

  async checkPermissions(): Promise<VoiceResult<boolean>> {
    try {
      if (typeof navigator === 'undefined' || !navigator.permissions) {
        return { success: true, data: false };
      }

      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return { success: true, data: permission.state === 'granted' };
    } catch (error) {
      // 如果权限API不支持，尝试直接请求权限
      return this.requestPermissions();
    }
  }

  // 语音合成
  async speak(text: string, options: SpeechOptions = {}): Promise<VoiceResult<SpeechResult>> {
    try {
      if (!text || text.trim().length === 0) {
        throw new VoiceError(VoiceErrorType.INVALID_CONFIGURATION, 'Text cannot be empty');
      }

      // 检查状态
      if (this.state === VoiceState.SPEAKING && !options.interruptCurrent) {
        throw new VoiceError(
          VoiceErrorType.CONCURRENT_OPERATION,
          'Already speaking. Set interruptCurrent to true to interrupt.',
        );
      }

      // 停止当前播放
      if (this.isSpeaking) {
        await this.stopSpeaking();
      }

      this.setState(VoiceState.SPEAKING);
      this.isSpeaking = true;

      // 使用播放管理器
      const callbacks: PlaybackCallbacks = {
        onStart: () => {
          options.onStart?.();
        },
        onEnd: duration => {
          this.isSpeaking = false;
          this.setState(VoiceState.IDLE);
          options.onEnd?.();
        },
        onError: error => {
          this.setErrorState(error);
          options.onError?.(error);
        },
      };

      // 优先使用TTS服务
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        await this.playbackManager.startTTSPlayback(text, callbacks);
      } else {
        await this.playbackManager.startWebSpeechPlayback(
          text,
          {
            rate: options.speed || 1.0,
            volume: options.volume || 0.8,
          },
          callbacks,
        );
      }

      const playbackState = this.playbackManager.getState();
      return {
        success: true,
        data: {
          duration: playbackState.actualDuration || 0,
          interrupted: false,
        },
      };
    } catch (error) {
      const voiceError =
        error instanceof VoiceError
          ? error
          : new VoiceError(VoiceErrorType.TTS_PLAYBACK_FAILED, 'Speech synthesis failed', error as Error);
      this.setErrorState(voiceError);
      return { success: false, error: voiceError };
    }
  }

  async stopSpeaking(): Promise<VoiceResult<void>> {
    try {
      await this.playbackManager.stop();

      this.isSpeaking = false;
      if (this.state === VoiceState.SPEAKING) {
        this.setState(VoiceState.IDLE);
      }

      return { success: true };
    } catch (error) {
      const voiceError = new VoiceError(VoiceErrorType.TTS_PLAYBACK_FAILED, 'Failed to stop speaking', error as Error);
      return { success: false, error: voiceError };
    }
  }

  async stopListening(): Promise<VoiceResult<void>> {
    try {
      await this.recognitionManager.stopListening();

      this.isListening = false;
      if (this.state === VoiceState.LISTENING) {
        this.setState(VoiceState.IDLE);
      }

      return { success: true };
    } catch (error) {
      const voiceError = new VoiceError(
        VoiceErrorType.SPEECH_RECOGNITION_FAILED,
        'Failed to stop listening',
        error as Error,
      );
      return { success: false, error: voiceError };
    }
  }

  // 语音识别
  async listen(options: ListenOptions = {}): Promise<VoiceResult<ListenResult>> {
    try {
      // 检查状态
      if (this.isListening) {
        throw new VoiceError(VoiceErrorType.CONCURRENT_OPERATION, 'Already listening. Stop current recognition first.');
      }

      this.setState(VoiceState.LISTENING);
      this.isListening = true;

      return new Promise(resolve => {
        const callbacks: RecognitionCallbacks = {
          onStart: () => {
            options.onStart?.();
          },
          onResult: (transcript, isFinal, confidence) => {
            options.onResult?.(transcript, isFinal);

            if (isFinal) {
              this.isListening = false;
              this.setState(VoiceState.IDLE);
              resolve({
                success: true,
                data: { transcript, confidence, isFinal },
              });
            }
          },
          onEnd: () => {
            this.isListening = false;
            if (this.state === VoiceState.LISTENING) {
              this.setState(VoiceState.IDLE);
            }
            options.onEnd?.();
          },
          onError: error => {
            this.setErrorState(error);
            options.onError?.(error);
            resolve({ success: false, error });
          },
        };

        this.recognitionManager
          .startListening(
            {
              language: options.language,
              continuous: options.continuous,
              interimResults: options.interimResults,
              maxAlternatives: options.maxAlternatives,
              timeout: options.timeout,
            },
            callbacks,
          )
          .catch(error => {
            const voiceError =
              error instanceof VoiceError
                ? error
                : new VoiceError(
                    VoiceErrorType.SPEECH_RECOGNITION_FAILED,
                    'Failed to start speech recognition',
                    error as Error,
                  );
            this.setErrorState(voiceError);
            resolve({ success: false, error: voiceError });
          });
      });
    } catch (error) {
      const voiceError =
        error instanceof VoiceError
          ? error
          : new VoiceError(
              VoiceErrorType.SPEECH_RECOGNITION_FAILED,
              'Failed to start speech recognition',
              error as Error,
            );
      this.setErrorState(voiceError);
      return { success: false, error: voiceError };
    }
  }

  // 对话模式管理
  async startConversation(): Promise<VoiceResult<void>> {
    try {
      if (this.conversationMode) {
        return { success: true }; // 已经在对话模式
      }

      this.conversationMode = true;
      console.log('Conversation mode started');

      // 使用识别管理器的对话模式
      await this.recognitionManager.startConversationMode(
        {
          continuous: false,
          interimResults: true,
          timeout: RECOGNITION_CONSTANTS.RECOGNITION_TIMEOUT,
        },
        {
          onStart: () => {
            this.isListening = true;
            this.setState(VoiceState.LISTENING);
          },
          onResult: (transcript, isFinal) => {
            // 对话模式的结果处理由外部组件处理
          },
          onEnd: () => {
            this.isListening = false;
            if (this.state === VoiceState.LISTENING) {
              this.setState(VoiceState.IDLE);
            }
          },
          onError: error => {
            // 在对话模式下，某些错误是正常的
            if (error.type !== VoiceErrorType.NO_SPEECH_DETECTED) {
              this.setErrorState(error);
            }
          },
        },
      );

      return { success: true };
    } catch (error) {
      const voiceError = new VoiceError(
        VoiceErrorType.SPEECH_RECOGNITION_FAILED,
        'Failed to start conversation mode',
        error as Error,
      );
      return { success: false, error: voiceError };
    }
  }

  async stopConversation(): Promise<VoiceResult<void>> {
    try {
      this.conversationMode = false;

      // 停止识别管理器的对话模式
      await this.recognitionManager.stopConversationMode();

      // 停止当前的语音活动
      await this.stopListening();
      await this.stopSpeaking();

      console.log('Conversation mode stopped');
      return { success: true };
    } catch (error) {
      const voiceError = new VoiceError(
        VoiceErrorType.UNKNOWN_ERROR,
        'Failed to stop conversation mode',
        error as Error,
      );
      return { success: false, error: voiceError };
    }
  }

  // 资源清理
  async cleanup(): Promise<void> {
    try {
      console.log('Cleaning up voice service resources');

      // 停止对话模式
      await this.stopConversation();

      // 停止所有语音活动
      await this.stopListening();
      await this.stopSpeaking();

      // 清理管理器
      this.playbackManager.cleanup();
      this.recognitionManager.cleanup();

      // 执行所有清理任务
      this.cleanupTasks.forEach(task => {
        try {
          task();
        } catch (error) {
          console.warn('Error during cleanup task:', error);
        }
      });
      this.cleanupTasks = [];

      // 重置状态
      this.state = VoiceState.IDLE;
      this.isListening = false;
      this.isSpeaking = false;
      this.conversationMode = false;
      this.currentError = undefined;

      console.log('Voice service cleanup completed');
    } catch (error) {
      console.error('Error during voice service cleanup:', error);
    }
  }
}

// 创建单例实例
let voiceServiceInstance: UnifiedVoiceService | null = null;

export function createVoiceService(): UnifiedVoiceService {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new UnifiedVoiceService();
  }
  return voiceServiceInstance;
}

export function getVoiceService(): UnifiedVoiceService | null {
  return voiceServiceInstance;
}

export function destroyVoiceService(): void {
  if (voiceServiceInstance) {
    voiceServiceInstance.cleanup();
    voiceServiceInstance = null;
  }
}
