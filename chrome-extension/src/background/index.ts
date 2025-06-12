import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import { FocusManager } from './managers/focusManager.js';
import { AudioManager } from './managers/audioManager.js';
import { UrlBlocker } from './managers/urlBlocker.js';
import { MESSAGE_TYPES, MCP, ERROR_MESSAGES } from '../constants/index.js';
import { TTSService } from '../services/ttsService.js';

// Native messaging 连接管理
let mcpPort: chrome.runtime.Port | null = null;

// 管理器实例
const focusManager = FocusManager.getInstance();
const audioManager = AudioManager.getInstance();
const urlBlocker = UrlBlocker.getInstance();

// 错误报告收集器
const errorReports: any[] = [];

// 消息监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理来自offscreen的错误报告
  if (message.type === 'OFFSCREEN_ERROR_REPORT') {
    console.error('[BACKGROUND] Received offscreen error report:', message.errorDetails);
    errorReports.push({
      ...message.errorDetails,
      source: 'offscreen',
      tabId: sender.tab?.id,
      url: sender.tab?.url,
    });

    // 保留最近100个错误报告
    if (errorReports.length > 100) {
      errorReports.splice(0, errorReports.length - 100);
    }

    sendResponse({ success: true });
    return true;
  }

  if (message.type === MESSAGE_TYPES.TEST_TTS) {
    // 处理TTS测试请求，支持传递测试配置
    audioManager
      .testTTS(message.text, message.config)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('[BACKGROUND] TTS test error:', error);
        errorReports.push({
          context: 'TTS_TEST',
          timestamp: new Date().toISOString(),
          errorType: error.constructor.name,
          errorMessage: error.message,
          errorStack: error.stack,
          source: 'background',
          additionalInfo: { text: message.text, config: message.config },
        });
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放以进行异步响应
  }

  if (message.type === 'PLAY_TTS_SOUND') {
    // 处理TTS播放请求（来自语音对话）
    audioManager
      .playTTSNotification(message.text)
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('[BACKGROUND] TTS play error:', error);
        errorReports.push({
          context: 'TTS_PLAY',
          timestamp: new Date().toISOString(),
          errorType: error.constructor.name,
          errorMessage: error.message,
          errorStack: error.stack,
          source: 'background',
          additionalInfo: { text: message.text },
        });
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放以进行异步响应
  }

  if (message.type === 'GENERATE_TTS_AUDIO') {
    // 处理TTS音频生成请求（来自character manager）
    console.log('[BACKGROUND] Received GENERATE_TTS_AUDIO request:', message.text);

    TTSService.generateSpeech(message.text)
      .then(audioData => {
        if (audioData) {
          console.log('[BACKGROUND] TTS audio generated successfully');
          sendResponse({ success: true, audioData });
        } else {
          console.warn('[BACKGROUND] TTS generation returned null');
          sendResponse({ success: false, error: 'TTS generation failed' });
        }
      })
      .catch(error => {
        console.error('[BACKGROUND] TTS generation error:', error);
        errorReports.push({
          context: 'TTS_GENERATION',
          timestamp: new Date().toISOString(),
          errorType: error.constructor.name,
          errorMessage: error.message,
          errorStack: error.stack,
          source: 'background',
          additionalInfo: { text: message.text },
        });
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放以进行异步响应
  }

  if (message.type === 'SPEECH_CONFIG_CHANGED') {
    // 处理语音配置变化通知
    console.log('Speech configuration changed:', message.config);
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'GENERATE_TTS_AUDIO') {
    // 处理角色语音合成请求
    console.log('[BACKGROUND] Received GENERATE_TTS_AUDIO request:', message.text);

    TTSService.generateSpeech(message.text)
      .then(audioData => {
        if (audioData) {
          console.log('[BACKGROUND] TTS audio generated successfully');
          sendResponse({ success: true, audioData });
        } else {
          console.warn('[BACKGROUND] TTS generation returned null');
          sendResponse({ success: false, error: 'TTS generation failed' });
        }
      })
      .catch(error => {
        console.error('[BACKGROUND] TTS generation error:', error);
        errorReports.push({
          context: 'TTS_GENERATION',
          timestamp: new Date().toISOString(),
          errorType: error.constructor.name,
          errorMessage: error.message,
          errorStack: error.stack,
          source: 'background',
          additionalInfo: { text: message.text },
        });
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放以进行异步响应
  }

  if (message.type === 'ENSURE_CHARACTER_MANAGER') {
    // 处理确保角色管理器可用的请求
    console.log('[BACKGROUND] Received ENSURE_CHARACTER_MANAGER request from tab:', sender.tab?.id);

    if (!sender.tab?.id) {
      sendResponse({ success: false, error: 'No tab ID available' });
      return false;
    }

    // 尝试注入content-runtime脚本以确保character manager可用
    chrome.scripting
      .executeScript({
        target: { tabId: sender.tab.id },
        files: ['/content-runtime/index.iife.js'],
      })
      .then(() => {
        console.log('[BACKGROUND] Content-runtime script injected successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('[BACKGROUND] Failed to inject content-runtime script:', error);
        errorReports.push({
          context: 'CONTENT_RUNTIME_INJECTION',
          timestamp: new Date().toISOString(),
          errorType: error.constructor.name,
          errorMessage: error.message,
          errorStack: error.stack,
          source: 'background',
          additionalInfo: { tabId: sender.tab?.id, url: sender.tab?.url },
        });
        sendResponse({ success: false, error: error.message });
      });

    return true; // 保持消息通道开放以进行异步响应
  }

  // 处理错误报告查询
  if (message.type === 'GET_ERROR_REPORTS') {
    console.log('[BACKGROUND] Sending error reports, count:', errorReports.length);
    sendResponse({
      success: true,
      reports: errorReports.slice(-20), // 返回最近20个错误
      totalCount: errorReports.length,
    });
    return false;
  }

  // 处理清除错误报告
  if (message.type === 'CLEAR_ERROR_REPORTS') {
    const clearedCount = errorReports.length;
    errorReports.length = 0; // 清空数组
    console.log('[BACKGROUND] Cleared error reports, count:', clearedCount);
    sendResponse({ success: true, clearedCount });
    return false;
  }

  // 处理MCP请求
  if (message.type === MESSAGE_TYPES.MCP_REQUEST) {
    handleMCPRequest(message, sender, sendResponse);
    return true; // 保持消息通道开放以进行异步响应
  }

  return false;
});

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local') {
    // 监听专注时间配置变化
    if (changes['focus-time-storage-key']) {
      const newValue = changes['focus-time-storage-key'].newValue;
      const oldValue = changes['focus-time-storage-key'].oldValue;

      // 如果状态从非活跃变为活跃，启动专注模式
      if (newValue?.isActive && !oldValue?.isActive) {
        await focusManager.startFocus(newValue.duration);
      }
      // 如果状态从活跃变为非活跃，停止专注模式
      else if (!newValue?.isActive && oldValue?.isActive) {
        await focusManager.stopFocus();
      }
    }

    // 监听TTS配置变化
    if (changes['tts-config-storage-key']) {
      const newValue = changes['tts-config-storage-key'].newValue;
      const oldValue = changes['tts-config-storage-key'].oldValue;

      // 如果voiceType发生变化，清除语音缓存
      if (newValue?.voiceType && oldValue?.voiceType && newValue.voiceType !== oldValue.voiceType) {
        console.log('VoiceType changed, clearing voice cache');
        await audioManager.clearVoiceCacheOnVoiceTypeChange(oldValue.voiceType, newValue.voiceType);
      }

      // 如果defaultText发生变化，也清除开始语音缓存
      if (newValue?.defaultText !== oldValue?.defaultText) {
        console.log('DefaultText changed, clearing start voice cache');
        await audioManager.clearVoiceCacheOnVoiceTypeChange('', ''); // 这会清除所有缓存
      }
    }

    // 监听语音对话配置变化
    if (changes['speech-chat-config-storage-key']) {
      const newValue = changes['speech-chat-config-storage-key'].newValue;
      const oldValue = changes['speech-chat-config-storage-key'].oldValue;

      console.log('Speech chat configuration changed:', {
        old: oldValue,
        new: newValue,
      });

      // 通知所有标签页配置已更改
      try {
        const tabs = await chrome.tabs.query({});
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs
              .sendMessage(tab.id, {
                type: 'SPEECH_CONFIG_CHANGED',
                config: newValue,
              })
              .catch(() => {
                // 忽略无法发送消息的标签页（如chrome://页面）
              });
          }
        });
      } catch (error) {
        console.error('Error notifying tabs of speech config change:', error);
      }
    }
  }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await urlBlocker.checkTabUrl(tabId, tab.url);
  }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener(async activeInfo => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await urlBlocker.checkTabUrl(activeInfo.tabId, tab.url);
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

// 初始化
async function initialize() {
  try {
    console.log('Initializing background script...');

    // 初始化主题
    const theme = await exampleThemeStorage.get();
    console.log('Theme loaded:', theme);

    // 初始化专注管理器
    await focusManager.initialize();

    // 初始化预设网站处理器
    await urlBlocker.initializePredefinedSites();

    console.log('Background script initialized successfully');
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

/**
 * MCP Native Messaging 处理函数
 */
async function handleMCPRequest(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
): Promise<void> {
  try {
    console.log('Handling MCP request:', message);

    // 确保连接到MCP
    await connectToMCP();

    if (!mcpPort) {
      throw new Error('Failed to establish MCP connection');
    }

    // 创建唯一的请求ID用于匹配响应
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // 设置响应监听器
    const responseHandler = (response: any) => {
      if (response.requestId === requestId) {
        mcpPort?.onMessage.removeListener(responseHandler);
        sendResponse(response);
      }
    };

    mcpPort.onMessage.addListener(responseHandler);

    // 设置超时处理
    const timeout = setTimeout(() => {
      mcpPort?.onMessage.removeListener(responseHandler);
      sendResponse({
        success: false,
        error: ERROR_MESSAGES.MCP_REQUEST_TIMEOUT,
        requestId,
      });
    }, MCP.REQUEST_TIMEOUT);

    // 发送请求到本地MCP client
    mcpPort.postMessage({
      requestId,
      command: message.command,
      query: message.query,
      taskId: message.taskId,
      options: message.options,
      tabId: sender.tab?.id,
      timestamp: Date.now(),
    });

    // 清除超时（当收到响应时会被清除）
    mcpPort.onMessage.addListener(() => {
      clearTimeout(timeout);
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown MCP error',
    });
  }
}

/**
 * 连接到本地MCP client
 */
async function connectToMCP(): Promise<void> {
  if (mcpPort && mcpPort.name) {
    // 连接已存在且有效
    return;
  }

  try {
    console.log('Connecting to MCP native host...');
    mcpPort = chrome.runtime.connectNative(MCP.HOST_NAME);

    // 设置连接事件监听器
    mcpPort.onDisconnect.addListener(() => {
      console.log('MCP connection disconnected:', chrome.runtime.lastError);
      mcpPort = null;
    });

    mcpPort.onMessage.addListener(message => {
      console.log('Received message from MCP:', message);
    });

    console.log('MCP connection established successfully');
  } catch (error) {
    console.error('Failed to connect to MCP:', error);
    mcpPort = null;
    throw new Error(`MCP connection failed: ${error}`);
  }
}

/**
 * 断开MCP连接
 */
function disconnectMCP(): void {
  if (mcpPort) {
    mcpPort.disconnect();
    mcpPort = null;
    console.log('MCP connection closed');
  }
}

// 扩展卸载时清理连接
chrome.runtime.onSuspend.addListener(() => {
  disconnectMCP();
});

// 启动初始化
initialize();
