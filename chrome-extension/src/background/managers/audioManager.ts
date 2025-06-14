import { soundSettingsStorage, ttsConfigStorage, voiceCacheStorage, meditationStorage } from '@extension/storage';
import { TTSTextProcessor, TTSCacheManager, TTSErrorHandler } from '@extension/shared';
import { TTSService } from '../../services/ttsService.js';
import { TIMEOUTS, MESSAGE_TYPES, ERROR_MESSAGES } from '../../constants/index.js';

export class AudioManager {
  private static instance: AudioManager;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * 播放TTS语音通知
   */
  async playTTSNotification(text: string): Promise<void> {
    try {
      // 获取TTS配置
      const ttsConfig = await ttsConfigStorage.get();

      // 如果TTS未启用或未配置，回退到普通音频
      if (!ttsConfig.enabled || !(await ttsConfigStorage.isConfigured())) {
        console.log('TTS not enabled or not configured, falling back to normal sound');
        return await this.playNotificationSound();
      }

      // 获取声音设置
      const soundSettings = await soundSettingsStorage.get();
      if (!soundSettings.enabled) {
        console.log('Notification sound is disabled');
        return;
      }

      console.log('Generating TTS for text:', text);

      // 检查是否为开始语音（固定文本，可以缓存）
      const isStartVoice = TTSTextProcessor.isStartVoiceText(text);
      let audioData: string | null = null;

      if (isStartVoice) {
        // 尝试从缓存获取开始语音
        audioData = await voiceCacheStorage.getStartVoice(ttsConfig.voiceType);

        if (audioData) {
          console.log('Using cached start voice for voiceType:', ttsConfig.voiceType);
        } else {
          console.log('No cached start voice found, generating new one');
          // 使用配置的默认文本或回退到固定文本
          const startText = TTSTextProcessor.getStartVoiceText(ttsConfig);
          audioData = await TTSService.generateSpeech(startText);

          if (audioData) {
            // 缓存生成的语音
            await voiceCacheStorage.cacheStartVoice(ttsConfig.voiceType, audioData);
            console.log('Start voice generated and cached for voiceType:', ttsConfig.voiceType);
          }
        }
      } else {
        // 对于其他文本（如结束语音），正常生成
        audioData = await TTSService.generateSpeech(text);
      }

      if (!audioData) {
        console.log('TTS generation failed, falling back to normal sound');
        return await this.playNotificationSound();
      }

      // 使用offscreen document来播放音频
      await this.ensureOffscreenDocument();

      // 向offscreen document发送播放TTS音频的消息
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.PLAY_TTS_SOUND,
        volume: soundSettings.volume,
        audioData: audioData,
      });

      if (response && response.success) {
        console.log('TTS notification played successfully with volume:', soundSettings.volume);
      } else {
        console.error('Failed to play TTS notification:', response?.error);
        // 如果TTS播放失败，回退到普通音频
        await this.playNotificationSound();
      }
    } catch (error) {
      console.error('Error playing TTS notification:', error);
      // 如果出错，回退到普通音频
      await this.playNotificationSound();
    }
  }

  /**
   * 播放普通通知音效
   */
  async playNotificationSound(): Promise<void> {
    try {
      // 获取声音设置
      const soundSettings = await soundSettingsStorage.get();

      // 如果声音被禁用，直接返回
      if (!soundSettings.enabled) {
        console.log('Notification sound is disabled');
        return;
      }

      // 使用offscreen document来播放音频
      await this.ensureOffscreenDocument();

      // 向offscreen document发送播放音频的消息
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.PLAY_NOTIFICATION_SOUND,
        volume: soundSettings.volume,
        audioUrl: chrome.runtime.getURL('notification.mp3'),
      });

      if (response && response.success) {
        console.log('Notification sound played successfully with volume:', soundSettings.volume);
      } else {
        console.error('Failed to play notification sound:', response?.error);
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  /**
   * 测试TTS功能
   * 修复Bug: 确保使用当前配置的语音类型进行测试
   */
  async testTTS(text: string, testConfig?: any): Promise<{ success: boolean; error?: string }> {
    try {
      // 获取当前TTS配置
      let ttsConfig = await ttsConfigStorage.get();

      // 如果提供了测试配置，临时使用测试配置
      if (testConfig) {
        ttsConfig = { ...ttsConfig, ...testConfig };
        console.log('Using test config:', testConfig);
      }

      if (!ttsConfig.enabled || !ttsConfig.appid || !ttsConfig.token) {
        return { success: false, error: ERROR_MESSAGES.TTS_NOT_CONFIGURED };
      }

      console.log('Testing TTS with config:', {
        voiceType: ttsConfig.voiceType,
        text: text,
        speedRatio: ttsConfig.speedRatio,
        appid: ttsConfig.appid ? '***' : 'missing',
        token: ttsConfig.token ? '***' : 'missing',
      });

      // 如果使用测试配置，临时保存配置以确保TTSService使用正确的设置
      if (testConfig) {
        await ttsConfigStorage.set(ttsConfig);
      }

      // 生成语音 - 这里会使用当前配置的语音类型
      const audioData = await TTSService.generateSpeech(text);

      // 如果使用了测试配置，恢复原始配置
      if (testConfig) {
        const originalConfig = await ttsConfigStorage.get();
        await ttsConfigStorage.set({ ...originalConfig, ...testConfig });
      }

      if (!audioData) {
        return { success: false, error: ERROR_MESSAGES.TTS_GENERATION_FAILED };
      }

      // 获取声音设置
      const soundSettings = await soundSettingsStorage.get();
      if (!soundSettings.enabled) {
        return { success: false, error: ERROR_MESSAGES.SOUND_DISABLED };
      }

      // 确保offscreen document存在
      await this.ensureOffscreenDocument();

      // 等待一小段时间确保offscreen document完全加载
      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.OFFSCREEN_LOAD_DELAY));

      try {
        // 使用Promise包装消息发送，设置超时
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(ERROR_MESSAGES.MESSAGE_TIMEOUT));
          }, TIMEOUTS.MESSAGE_TIMEOUT);

          chrome.runtime.sendMessage(
            {
              type: MESSAGE_TYPES.PLAY_TTS_SOUND,
              volume: soundSettings.volume,
              audioData: audioData,
            },
            response => {
              clearTimeout(timeout);
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            },
          );
        });

        const typedResponse = response as { success: boolean; error?: string };
        if (typedResponse && typedResponse.success) {
          return { success: true };
        } else {
          return { success: false, error: typedResponse?.error || '播放失败' };
        }
      } catch (messageError) {
        console.error('Message sending error:', messageError);
        return { success: false, error: '无法与音频播放器通信: ' + (messageError as Error).message };
      }
    } catch (error) {
      console.error('TTS test error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * 清除语音缓存（当voiceType改变时调用）
   */
  async clearVoiceCacheOnVoiceTypeChange(oldVoiceType: string, newVoiceType: string): Promise<void> {
    if (oldVoiceType !== newVoiceType) {
      console.log('VoiceType changed from', oldVoiceType, 'to', newVoiceType, ', clearing voice cache');
      await voiceCacheStorage.clearAllVoiceCache();
    }
  }

  /**
   * 确保offscreen document存在 - 增强版本，包含重试机制
   */
  private async ensureOffscreenDocument(): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // 检查是否已经有offscreen document
        try {
          const existingContexts = await chrome.runtime.getContexts({
            contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
            documentUrls: [chrome.runtime.getURL('offscreen.html')],
          });

          if (existingContexts.length > 0) {
            console.log('[AUDIO] Offscreen document already exists');
            return; // 已经存在
          }
        } catch (_contextError) {
          // 如果getContexts不可用，继续创建offscreen document
          console.log('[AUDIO] getContexts not available, proceeding to create offscreen document');
        }

        // 创建offscreen document
        console.log(`[AUDIO] Creating offscreen document (attempt ${retryCount + 1}/${maxRetries})`);

        await chrome.offscreen.createDocument({
          url: chrome.runtime.getURL('offscreen.html'),
          reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
          justification: 'Playing notification sounds for focus timer',
        });

        console.log('[AUDIO] Offscreen document created successfully');

        // 等待一小段时间确保文档完全加载
        await new Promise(resolve => setTimeout(resolve, TIMEOUTS.OFFSCREEN_LOAD_DELAY));

        // 验证offscreen document是否真的可用
        await this.verifyOffscreenDocument();

        return; // 成功创建并验证
      } catch (error) {
        retryCount++;
        console.error(`[AUDIO] Error creating offscreen document (attempt ${retryCount}/${maxRetries}):`, error);

        if (retryCount >= maxRetries) {
          throw new Error(`Failed to create offscreen document after ${maxRetries} attempts: ${error}`);
        }

        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  /**
   * 播放冥想场景音频
   */
  async playMeditationAudio(scene: string, volume: number, loop: boolean = true): Promise<void> {
    try {
      console.log(`Playing meditation audio for scene: ${scene}, volume: ${volume}, loop: ${loop}`);

      // 使用offscreen document来播放音频
      await this.ensureOffscreenDocument();

      // 获取场景音频URL
      const audioUrl = await this.getMeditationAudioUrl(scene);

      // 向offscreen document发送播放冥想音频的消息
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.PLAY_MEDITATION_AUDIO,
        scene,
        volume,
        loop,
        audioUrl,
      });

      if (response && response.success) {
        console.log(`Meditation audio for scene ${scene} started successfully`);
      } else {
        console.error('Failed to play meditation audio:', response?.error);
        throw new Error(response?.error || 'Failed to play meditation audio');
      }
    } catch (error) {
      console.error('Error playing meditation audio:', error);
      throw error;
    }
  }

  /**
   * 停止冥想音频
   */
  async stopMeditationAudio(): Promise<void> {
    try {
      console.log('Stopping meditation audio');

      // 向offscreen document发送停止冥想音频的消息
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.STOP_MEDITATION_AUDIO,
      });

      if (response && response.success) {
        console.log('Meditation audio stopped successfully');
      } else {
        console.error('Failed to stop meditation audio:', response?.error);
      }
    } catch (error) {
      console.error('Error stopping meditation audio:', error);
      // 不抛出错误，因为停止音频失败不应该阻止其他操作
    }
  }

  /**
   * 获取冥想场景音频URL
   */
  private async getMeditationAudioUrl(scene: string): Promise<string> {
    try {
      // 首先尝试从用户配置中获取自定义音频URL
      const meditationConfig = await meditationStorage.get();
      const customAudioUrls = (meditationConfig as any).customAudioUrls || {};

      // 如果用户配置了自定义URL，优先使用
      if (customAudioUrls[scene]) {
        console.log(`Using custom audio URL for scene ${scene}:`, customAudioUrls[scene]);
        return customAudioUrls[scene];
      }

      // 默认音频文件映射（支持多种格式，优先级：OGG > MP3 > WAV）
      const audioMap: Record<string, string[]> = {
        forest: ['meditation/forest.ogg', 'meditation/forest.mp3', 'meditation/forest.wav'],
        ocean: ['meditation/ocean.ogg', 'meditation/ocean.mp3', 'meditation/ocean.wav'],
        rain: ['meditation/rain.ogg', 'meditation/rain.mp3', 'meditation/rain.wav'],
        birds: ['meditation/birds.ogg', 'meditation/birds.mp3', 'meditation/birds.wav'],
        cafe: ['meditation/cafe.ogg', 'meditation/cafe.mp3', 'meditation/cafe.wav'],
        library: ['meditation/library.ogg', 'meditation/library.mp3', 'meditation/library.wav'],
        white_noise: ['meditation/white_noise.ogg', 'meditation/white_noise.mp3', 'meditation/white_noise.wav'],
        temple: ['meditation/temple.ogg', 'meditation/temple.mp3', 'meditation/temple.wav'],
        singing_bowl: ['meditation/singing_bowl.ogg', 'meditation/singing_bowl.mp3', 'meditation/singing_bowl.wav'],
        silent: [], // 静音场景不需要音频
      };

      const audioFiles = audioMap[scene];
      if (!audioFiles || audioFiles.length === 0) {
        // 如果没有对应的音频文件，返回空字符串（静音）
        console.warn(`No audio file found for scene: ${scene}, will be silent`);
        return '';
      }

      // 尝试找到第一个可用的音频文件
      // 优先级：OGG > MP3 > WAV
      for (const audioFile of audioFiles) {
        try {
          // 检查文件是否存在（通过尝试获取URL）
          const audioUrl = chrome.runtime.getURL(audioFile);
          console.log(`Trying audio file for scene ${scene}: ${audioFile}`);
          return audioUrl;
        } catch (error) {
          console.warn(`Audio file not available: ${audioFile}`);
          continue;
        }
      }

      // 如果所有文件都不可用，返回空字符串（静音）
      console.warn(`No available audio files found for scene: ${scene}, will be silent`);
      return '';
    } catch (error) {
      console.error('Error getting meditation audio URL:', error);
      return ''; // 出错时返回静音
    }
  }

  /**
   * 验证offscreen document是否可用
   */
  private async verifyOffscreenDocument(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Offscreen document verification timeout'));
      }, 3000);

      // 发送一个测试消息来验证offscreen document是否响应
      chrome.runtime.sendMessage(
        {
          type: 'PING_OFFSCREEN',
          timestamp: Date.now(),
        },
        response => {
          clearTimeout(timeout);

          if (chrome.runtime.lastError) {
            reject(new Error(`Offscreen document verification failed: ${chrome.runtime.lastError.message}`));
          } else if (response && response.success) {
            console.log('[AUDIO] Offscreen document verification successful');
            resolve();
          } else {
            reject(new Error('Offscreen document did not respond correctly'));
          }
        },
      );
    });
  }
}
