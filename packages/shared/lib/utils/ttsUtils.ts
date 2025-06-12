/**
 * TTS工具函数 - 统一的TTS相关逻辑
 */

import { getDefaultTextByVoiceType, isStartVoiceText } from '../constants/voiceConfig.js';

// TTS配置接口
export interface TTSConfig {
  enabled: boolean;
  appid: string;
  token: string;
  cluster: string;
  voiceType: string;
  encoding: string;
  speedRatio: number;
  uid: string;
  defaultText: string;
}

/**
 * TTS文本处理器
 * 负责处理TTS相关的文本逻辑
 */
export class TTSTextProcessor {
  /**
   * 获取开始语音文本
   * 优先使用用户自定义文本，否则使用语音类型的默认文本
   */
  static getStartVoiceText(ttsConfig: TTSConfig): string {
    // 如果用户设置了自定义默认文本，使用自定义文本
    if (ttsConfig.defaultText && ttsConfig.defaultText.trim()) {
      return ttsConfig.defaultText;
    }

    // 使用统一的语音配置获取默认文本
    return getDefaultTextByVoiceType(ttsConfig.voiceType);
  }

  /**
   * 检查是否为开始语音文本（可缓存的文本）
   */
  static isStartVoiceText(text: string): boolean {
    return isStartVoiceText(text);
  }

  /**
   * 获取显示用的默认文本（用于UI显示）
   * 用户自定义文本 > 语音类型默认文本
   */
  static getDisplayDefaultText(ttsConfig: TTSConfig): string {
    return ttsConfig.defaultText || getDefaultTextByVoiceType(ttsConfig.voiceType);
  }

  /**
   * 验证TTS配置是否完整
   */
  static isConfigValid(ttsConfig: TTSConfig): boolean {
    return ttsConfig.enabled && ttsConfig.appid.trim().length > 0 && ttsConfig.token.trim().length > 0;
  }

  /**
   * 生成测试文本
   */
  static getTestText(ttsConfig: TTSConfig): string {
    const displayText = TTSTextProcessor.getDisplayDefaultText(ttsConfig);
    return displayText || '哈哈！这是语音合成测试，爱笑的人才会更可爱！';
  }
}

/**
 * TTS缓存管理器
 * 负责管理TTS音频缓存逻辑
 */
export class TTSCacheManager {
  /**
   * 生成缓存键
   */
  static generateCacheKey(voiceType: string, text: string): string {
    return `tts_${voiceType}_${this.hashText(text)}`;
  }

  /**
   * 简单的文本哈希函数
   */
  private static hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 检查是否应该缓存该文本
   */
  static shouldCache(text: string): boolean {
    return TTSTextProcessor.isStartVoiceText(text);
  }
}

/**
 * TTS错误处理器
 * 统一的TTS错误处理逻辑
 */
export class TTSErrorHandler {
  /**
   * 处理TTS生成错误
   */
  static handleGenerationError(error: any): string {
    if (error.message?.includes('401')) {
      return 'TTS认证失败，请检查AppID和Token';
    }
    if (error.message?.includes('403')) {
      return 'TTS权限不足，请检查API配置';
    }
    if (error.message?.includes('429')) {
      return 'TTS请求过于频繁，请稍后重试';
    }
    if (error.message?.includes('network')) {
      return 'TTS网络连接失败，请检查网络';
    }
    return `TTS生成失败: ${error.message || '未知错误'}`;
  }

  /**
   * 处理TTS播放错误
   */
  static handlePlaybackError(error: any): string {
    if (error.message?.includes('decode')) {
      return 'TTS音频解码失败';
    }
    if (error.message?.includes('permission')) {
      return 'TTS播放权限不足';
    }
    return `TTS播放失败: ${error.message || '未知错误'}`;
  }
}

/**
 * TTS配置验证器
 * 验证TTS配置的有效性
 */
export class TTSConfigValidator {
  /**
   * 验证AppID格式
   */
  static validateAppId(appId: string): { valid: boolean; message?: string } {
    if (!appId || appId.trim().length === 0) {
      return { valid: false, message: 'AppID不能为空' };
    }
    if (appId.length < 8) {
      return { valid: false, message: 'AppID长度不足' };
    }
    return { valid: true };
  }

  /**
   * 验证Token格式
   */
  static validateToken(token: string): { valid: boolean; message?: string } {
    if (!token || token.trim().length === 0) {
      return { valid: false, message: 'Token不能为空' };
    }
    if (token.length < 16) {
      return { valid: false, message: 'Token长度不足' };
    }
    return { valid: true };
  }

  /**
   * 验证语速比例
   */
  static validateSpeedRatio(speedRatio: number): { valid: boolean; message?: string } {
    if (speedRatio < 0.5 || speedRatio > 2.0) {
      return { valid: false, message: '语速比例必须在0.5-2.0之间' };
    }
    return { valid: true };
  }

  /**
   * 验证完整配置
   */
  static validateConfig(config: TTSConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const appIdResult = this.validateAppId(config.appid);
    if (!appIdResult.valid) {
      errors.push(appIdResult.message!);
    }

    const tokenResult = this.validateToken(config.token);
    if (!tokenResult.valid) {
      errors.push(tokenResult.message!);
    }

    const speedResult = this.validateSpeedRatio(config.speedRatio);
    if (!speedResult.valid) {
      errors.push(speedResult.message!);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
