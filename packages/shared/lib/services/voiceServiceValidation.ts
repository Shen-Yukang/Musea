/**
 * 语音服务验证脚本
 * 验证重构后的语音交互功能是否正常工作
 */

import { UnifiedVoiceService } from './unifiedVoiceService.js';
import { VoicePlaybackManager } from './voicePlaybackManager.js';
import { VoiceRecognitionManager } from './voiceRecognitionManager.js';
import { VoiceState, VoiceErrorType, VoiceError, STATE_TRANSITIONS } from '../types/voiceTypes.js';
import { VOICE_CONSTANTS, RECOGNITION_CONSTANTS } from '../constants/voiceConstants.js';

/**
 * 验证语音服务基本功能
 */
export function validateVoiceService(): boolean {
  try {
    console.log('🔍 开始验证语音服务...');

    // 1. 验证常量定义
    console.log('✅ 验证常量定义...');
    if (!VOICE_CONSTANTS.ESTIMATED_DURATION_PER_CHAR) {
      throw new Error('VOICE_CONSTANTS 未正确定义');
    }
    if (!RECOGNITION_CONSTANTS.CONVERSATION_RESTART_DELAY) {
      throw new Error('RECOGNITION_CONSTANTS 未正确定义');
    }

    // 2. 验证错误类型
    console.log('✅ 验证错误类型...');
    const error = new VoiceError(VoiceErrorType.MICROPHONE_ACCESS_DENIED, 'Test error');
    if (!error.getUserFriendlyMessage().includes('麦克风权限')) {
      throw new Error('VoiceError 用户友好消息不正确');
    }

    // 3. 验证状态转换
    console.log('✅ 验证状态转换...');
    const idleTransitions = STATE_TRANSITIONS[VoiceState.IDLE];
    if (!idleTransitions.includes(VoiceState.LISTENING)) {
      throw new Error('状态转换规则不正确');
    }

    // 4. 验证管理器实例化
    console.log('✅ 验证管理器实例化...');
    const playbackManager = new VoicePlaybackManager();
    const recognitionManager = new VoiceRecognitionManager();

    if (!playbackManager.getState) {
      throw new Error('VoicePlaybackManager 接口不完整');
    }
    if (!recognitionManager.getState) {
      throw new Error('VoiceRecognitionManager 接口不完整');
    }

    // 5. 验证统一服务
    console.log('✅ 验证统一语音服务...');
    const voiceService = new UnifiedVoiceService();
    const state = voiceService.getState();

    if (state.state !== VoiceState.IDLE) {
      throw new Error('UnifiedVoiceService 初始状态不正确');
    }

    // 清理资源
    voiceService.cleanup();
    playbackManager.cleanup();
    recognitionManager.cleanup();

    console.log('🎉 语音服务验证通过！');
    return true;
  } catch (error) {
    console.error('❌ 语音服务验证失败:', error);
    return false;
  }
}

/**
 * 验证错误处理机制
 */
export function validateErrorHandling(): boolean {
  try {
    console.log('🔍 验证错误处理机制...');

    // 测试各种错误类型
    const errorTypes = [
      VoiceErrorType.PERMISSION_DENIED,
      VoiceErrorType.NETWORK_ERROR,
      VoiceErrorType.TTS_GENERATION_FAILED,
      VoiceErrorType.SPEECH_RECOGNITION_FAILED,
      VoiceErrorType.INVALID_CONFIGURATION,
    ];

    for (const errorType of errorTypes) {
      const error = new VoiceError(errorType, 'Test error');
      const message = error.getUserFriendlyMessage();

      if (!message || message.length === 0) {
        throw new Error(`错误类型 ${errorType} 没有用户友好消息`);
      }

      console.log(`✅ ${errorType}: ${message}`);
    }

    // 测试可重试错误
    const retryableError = new VoiceError(VoiceErrorType.NETWORK_ERROR, 'Network error');
    const nonRetryableError = new VoiceError(VoiceErrorType.PERMISSION_DENIED, 'Permission error');

    if (!retryableError.isRetryable()) {
      throw new Error('网络错误应该是可重试的');
    }

    if (nonRetryableError.isRetryable()) {
      throw new Error('权限错误不应该是可重试的');
    }

    console.log('🎉 错误处理验证通过！');
    return true;
  } catch (error) {
    console.error('❌ 错误处理验证失败:', error);
    return false;
  }
}

/**
 * 验证状态管理
 */
export function validateStateManagement(): boolean {
  try {
    console.log('🔍 验证状态管理...');

    // 验证所有状态都有转换规则
    const states = Object.values(VoiceState);
    for (const state of states) {
      if (!STATE_TRANSITIONS[state]) {
        throw new Error(`状态 ${state} 没有转换规则`);
      }
    }

    // 验证状态转换的合理性
    const idleTransitions = STATE_TRANSITIONS[VoiceState.IDLE];
    if (!idleTransitions.includes(VoiceState.LISTENING) || !idleTransitions.includes(VoiceState.SPEAKING)) {
      throw new Error('IDLE 状态转换规则不合理');
    }

    const errorTransitions = STATE_TRANSITIONS[VoiceState.ERROR];
    if (!errorTransitions.includes(VoiceState.IDLE)) {
      throw new Error('ERROR 状态应该能转换到 IDLE');
    }

    console.log('🎉 状态管理验证通过！');
    return true;
  } catch (error) {
    console.error('❌ 状态管理验证失败:', error);
    return false;
  }
}

/**
 * 验证常量定义
 */
export function validateConstants(): boolean {
  try {
    console.log('🔍 验证常量定义...');

    // 验证语音常量
    const requiredVoiceConstants = [
      'ESTIMATED_DURATION_PER_CHAR',
      'MIN_PLAY_DURATION',
      'MAX_PLAY_DURATION',
      'PLAY_STATUS_CHECK_INTERVAL',
    ];

    for (const constant of requiredVoiceConstants) {
      if (!(constant in VOICE_CONSTANTS)) {
        throw new Error(`缺少语音常量: ${constant}`);
      }
      if (typeof VOICE_CONSTANTS[constant as keyof typeof VOICE_CONSTANTS] !== 'number') {
        throw new Error(`语音常量 ${constant} 类型不正确`);
      }
    }

    // 验证识别常量
    const requiredRecognitionConstants = [
      'CONVERSATION_RESTART_DELAY',
      'AUTO_SEND_DELAY',
      'PERMISSION_CHECK_TIMEOUT',
      'RECOGNITION_TIMEOUT',
    ];

    for (const constant of requiredRecognitionConstants) {
      if (!(constant in RECOGNITION_CONSTANTS)) {
        throw new Error(`缺少识别常量: ${constant}`);
      }
      if (typeof RECOGNITION_CONSTANTS[constant as keyof typeof RECOGNITION_CONSTANTS] !== 'number') {
        throw new Error(`识别常量 ${constant} 类型不正确`);
      }
    }

    // 验证常量值的合理性
    if (VOICE_CONSTANTS.MIN_PLAY_DURATION >= VOICE_CONSTANTS.MAX_PLAY_DURATION) {
      throw new Error('最小播放时长应该小于最大播放时长');
    }

    if (VOICE_CONSTANTS.PLAY_STATUS_CHECK_INTERVAL <= 0) {
      throw new Error('播放状态检查间隔应该大于0');
    }

    console.log('🎉 常量定义验证通过！');
    return true;
  } catch (error) {
    console.error('❌ 常量定义验证失败:', error);
    return false;
  }
}

/**
 * 运行所有验证
 */
export function runAllValidations(): boolean {
  console.log('🚀 开始运行语音服务验证...\n');

  const validations = [
    { name: '常量定义', fn: validateConstants },
    { name: '错误处理', fn: validateErrorHandling },
    { name: '状态管理', fn: validateStateManagement },
    { name: '语音服务', fn: validateVoiceService },
  ];

  let allPassed = true;

  for (const validation of validations) {
    console.log(`\n📋 验证 ${validation.name}...`);
    const passed = validation.fn();
    if (!passed) {
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 所有验证通过！语音交互系统重构成功！');
  } else {
    console.log('❌ 部分验证失败，请检查相关问题。');
  }
  console.log('='.repeat(50));

  return allPassed;
}

// 如果直接运行此文件，执行验证
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runAllValidations();
}
