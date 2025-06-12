/**
 * 语音播放管理器
 * 解决TTS播放状态管理问题，提供准确的播放状态跟踪
 */

import { VoiceError, VoiceErrorType } from '../types/voiceTypes.js';
import { VOICE_CONSTANTS } from '../constants/voiceConstants.js';

export interface PlaybackState {
  isPlaying: boolean;
  startTime?: number;
  estimatedEndTime?: number;
  actualDuration?: number;
  text?: string;
  method: 'tts' | 'web-speech';
}

export interface PlaybackCallbacks {
  onStart?: () => void;
  onEnd?: (duration: number) => void;
  onError?: (error: VoiceError) => void;
  onProgress?: (progress: number) => void; // 0-1
}

export class VoicePlaybackManager {
  private state: PlaybackState = {
    isPlaying: false,
    method: 'tts',
  };

  private callbacks: PlaybackCallbacks = {};
  private progressInterval?: NodeJS.Timeout;
  private endTimeout?: NodeJS.Timeout;
  private currentUtterance?: SpeechSynthesisUtterance;

  constructor() {
    this.setupWebSpeechMonitoring();
  }

  // 获取当前播放状态
  getState(): PlaybackState {
    return { ...this.state };
  }

  // 开始TTS播放
  async startTTSPlayback(text: string, callbacks: PlaybackCallbacks = {}): Promise<void> {
    if (this.state.isPlaying) {
      await this.stop();
    }

    this.callbacks = callbacks;
    const startTime = Date.now();

    // 计算估算播放时长
    const estimatedDuration = this.calculateEstimatedDuration(text);

    this.state = {
      isPlaying: true,
      startTime,
      estimatedEndTime: startTime + estimatedDuration,
      text,
      method: 'tts',
    };

    console.log('Starting TTS playback:', {
      text: text.substring(0, 50) + '...',
      estimatedDuration,
      estimatedEndTime: this.state.estimatedEndTime ? new Date(this.state.estimatedEndTime).toISOString() : 'unknown',
    });

    this.callbacks.onStart?.();
    this.startProgressTracking();

    try {
      // 发送TTS播放请求
      const response = await this.sendTTSRequest(text);

      if (!response.success) {
        throw new VoiceError(VoiceErrorType.TTS_PLAYBACK_FAILED, response.error || 'TTS playback failed');
      }

      // 设置播放结束检测
      this.schedulePlaybackEnd(estimatedDuration);
    } catch (error) {
      const voiceError =
        error instanceof VoiceError
          ? error
          : new VoiceError(VoiceErrorType.TTS_PLAYBACK_FAILED, 'Failed to start TTS playback', error as Error);

      this.handleError(voiceError);
      throw voiceError;
    }
  }

  // 开始Web Speech API播放
  async startWebSpeechPlayback(text: string, options: any = {}, callbacks: PlaybackCallbacks = {}): Promise<void> {
    if (this.state.isPlaying) {
      await this.stop();
    }

    if (!('speechSynthesis' in window)) {
      throw new VoiceError(VoiceErrorType.TTS_PLAYBACK_FAILED, 'Speech synthesis not supported');
    }

    this.callbacks = callbacks;
    const startTime = Date.now();

    this.state = {
      isPlaying: true,
      startTime,
      text,
      method: 'web-speech',
    };

    return new Promise((resolve, reject) => {
      try {
        speechSynthesis.cancel(); // 停止之前的播放

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 1.0;
        utterance.volume = options.volume || 0.8;
        utterance.lang = options.lang || 'zh-CN';

        utterance.onstart = () => {
          console.log('Web Speech playback started');
          this.callbacks.onStart?.();
          this.startProgressTracking();
        };

        utterance.onend = () => {
          const duration = Date.now() - startTime;
          console.log('Web Speech playback ended, duration:', duration);

          this.state.actualDuration = duration;
          this.state.isPlaying = false;
          this.stopProgressTracking();

          this.callbacks.onEnd?.(duration);
          this.currentUtterance = undefined;
          resolve();
        };

        utterance.onerror = event => {
          const error = new VoiceError(
            VoiceErrorType.TTS_PLAYBACK_FAILED,
            `Web Speech error: ${event.error}`,
            new Error(event.error),
          );

          this.handleError(error);
          reject(error);
        };

        this.currentUtterance = utterance;
        speechSynthesis.speak(utterance);
      } catch (error) {
        const voiceError = new VoiceError(
          VoiceErrorType.TTS_PLAYBACK_FAILED,
          'Failed to start Web Speech playback',
          error as Error,
        );

        this.handleError(voiceError);
        reject(voiceError);
      }
    });
  }

  // 停止播放
  async stop(): Promise<void> {
    console.log('Stopping voice playback');

    this.stopProgressTracking();

    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = undefined;
    }

    // 停止Web Speech API
    if (this.currentUtterance) {
      speechSynthesis.cancel();
      this.currentUtterance = undefined;
    }

    const wasPlaying = this.state.isPlaying;
    const duration = this.state.startTime ? Date.now() - this.state.startTime : 0;

    this.state = {
      isPlaying: false,
      method: this.state.method,
    };

    if (wasPlaying) {
      this.callbacks.onEnd?.(duration);
    }
  }

  // 计算估算播放时长
  private calculateEstimatedDuration(text: string): number {
    const charCount = text.length;
    const baseDuration = charCount * VOICE_CONSTANTS.ESTIMATED_DURATION_PER_CHAR;

    // 应用边界限制
    return Math.min(Math.max(baseDuration, VOICE_CONSTANTS.MIN_PLAY_DURATION), VOICE_CONSTANTS.MAX_PLAY_DURATION);
  }

  // 发送TTS请求
  private async sendTTSRequest(text: string): Promise<{ success: boolean; error?: string }> {
    return new Promise(resolve => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        resolve({ success: false, error: 'Chrome runtime not available' });
        return;
      }

      chrome.runtime.sendMessage(
        {
          type: 'PLAY_TTS_SOUND',
          text: text,
        },
        response => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message,
            });
          } else {
            resolve(response || { success: false, error: 'No response' });
          }
        },
      );
    });
  }

  // 开始进度跟踪
  private startProgressTracking(): void {
    this.stopProgressTracking();

    this.progressInterval = setInterval(() => {
      if (!this.state.isPlaying || !this.state.startTime) {
        return;
      }

      const elapsed = Date.now() - this.state.startTime;
      let progress = 0;

      if (this.state.method === 'tts' && this.state.estimatedEndTime) {
        const totalDuration = this.state.estimatedEndTime - this.state.startTime;
        progress = Math.min(elapsed / totalDuration, 1);
      } else {
        // 对于Web Speech API，使用估算
        const estimatedDuration = this.state.text ? this.calculateEstimatedDuration(this.state.text) : 5000;
        progress = Math.min(elapsed / estimatedDuration, 0.95); // 最多95%，等待实际结束
      }

      this.callbacks.onProgress?.(progress);
    }, VOICE_CONSTANTS.PLAY_STATUS_CHECK_INTERVAL);
  }

  // 停止进度跟踪
  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = undefined;
    }
  }

  // 安排播放结束检测（仅用于TTS）
  private schedulePlaybackEnd(estimatedDuration: number): void {
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
    }

    // 添加一些缓冲时间
    const timeoutDuration = estimatedDuration + 2000; // 额外2秒缓冲

    this.endTimeout = setTimeout(() => {
      if (this.state.isPlaying && this.state.method === 'tts') {
        console.log('TTS playback timeout reached, assuming playback ended');

        const duration = this.state.startTime ? Date.now() - this.state.startTime : 0;
        this.state.actualDuration = duration;
        this.state.isPlaying = false;
        this.stopProgressTracking();

        this.callbacks.onEnd?.(duration);
      }
    }, timeoutDuration);
  }

  // 设置Web Speech API监控
  private setupWebSpeechMonitoring(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // 监听speechSynthesis的全局状态变化
    const checkSpeechSynthesis = () => {
      if (this.state.method === 'web-speech' && this.state.isPlaying) {
        if (!speechSynthesis.speaking && !speechSynthesis.pending) {
          // 如果speechSynthesis不在播放状态，但我们认为在播放，可能播放已结束
          console.log('Detected speechSynthesis stopped, updating state');
          const duration = this.state.startTime ? Date.now() - this.state.startTime : 0;
          this.state.actualDuration = duration;
          this.state.isPlaying = false;
          this.stopProgressTracking();
          this.callbacks.onEnd?.(duration);
        }
      }
    };

    // 定期检查speechSynthesis状态
    setInterval(checkSpeechSynthesis, 1000);
  }

  // 处理错误
  private handleError(error: VoiceError): void {
    console.error('Voice playback error:', error);

    this.state.isPlaying = false;
    this.stopProgressTracking();

    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = undefined;
    }

    this.callbacks.onError?.(error);
  }

  // 清理资源
  cleanup(): void {
    this.stop();
    this.callbacks = {};
  }
}
