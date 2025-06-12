import { focusStorage, aiConfigStorage, ttsConfigStorage } from '@extension/storage';
import { TIMEOUTS, FOCUS, NOTIFICATION_IDS } from '../../constants/index.js';
import { AudioManager } from './audioManager.js';
import { NotificationManager } from './notificationManager.js';
import { UrlBlocker } from './urlBlocker.js';
import { TTSTextProcessor } from '@extension/shared/lib/utils/ttsUtils.js';

export class FocusManager {
  private static instance: FocusManager;
  private timerInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  /**
   * 启动专注模式
   */
  async startFocus(duration: number): Promise<void> {
    try {
      await focusStorage.startFocus(duration);

      // 获取TTS配置并生成启动消息
      const ttsConfig = await ttsConfigStorage.get();
      const startMessage = TTSTextProcessor.getStartVoiceText(ttsConfig);

      chrome.notifications.create(NOTIFICATION_IDS.FOCUS_START, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('spring-128.png'),
        title: '专注模式已启动',
        message: `专注时间：${duration}分钟`,
      });

      // 播放TTS语音通知
      await AudioManager.getInstance().playTTSNotification(startMessage);

      // 设置徽章
      chrome.action.setBadgeText({ text: FOCUS.BADGE_TEXT });
      chrome.action.setBadgeBackgroundColor({ color: FOCUS.BADGE_COLOR });

      // 启动定时器检查
      this.startTimerCheck();

      // 预生成AI通知
      await this.preGenerateNotification(duration);

      // 检查所有已打开的标签页
      await this.checkAllOpenTabs();

      console.log(`Focus mode started for ${duration} minutes`);
    } catch (error) {
      console.error('Error starting focus mode:', error);
      throw error;
    }
  }

  /**
   * 停止专注模式
   */
  async stopFocus(): Promise<void> {
    try {
      await focusStorage.stopFocus();

      // 清除徽章
      chrome.action.setBadgeText({ text: '' });

      // 停止定时器
      this.stopTimerCheck();

      console.log('Focus mode stopped');
    } catch (error) {
      console.error('Error stopping focus mode:', error);
      throw error;
    }
  }

  /**
   * 启动定时器检查
   */
  private startTimerCheck(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(async () => {
      await this.checkFocusTimer();
    }, TIMEOUTS.TIMER_CHECK_INTERVAL);
  }

  /**
   * 停止定时器检查
   */
  private stopTimerCheck(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * 检查专注计时器
   */
  private async checkFocusTimer(): Promise<void> {
    try {
      const focusConfig = await focusStorage.get();

      if (!focusConfig.isActive) {
        this.stopTimerCheck();
        return;
      }

      const remainingTime = await focusStorage.getRemainingTime();

      if (remainingTime <= 0) {
        // 专注时间结束
        await this.handleFocusEnd();
      } else {
        // 更新徽章显示剩余时间
        const minutes = Math.ceil(remainingTime / 60);
        chrome.action.setBadgeText({ text: minutes.toString() });
      }
    } catch (error) {
      console.error('Error checking focus timer:', error);
    }
  }

  /**
   * 处理专注时间结束
   */
  private async handleFocusEnd(): Promise<void> {
    try {
      // 停止专注模式
      await this.stopFocus();

      // 获取通知消息
      const notificationMessage = await NotificationManager.getInstance().getEndNotification();

      // 显示结束通知
      chrome.notifications.create(NOTIFICATION_IDS.FOCUS_END, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('spring-128.png'),
        title: '专注模式已结束',
        message: notificationMessage,
      });

      // 播放TTS语音通知
      await AudioManager.getInstance().playTTSNotification(notificationMessage);

      console.log('Focus session completed');
    } catch (error) {
      console.error('Error handling focus end:', error);
    }
  }

  /**
   * 预生成AI通知
   */
  private async preGenerateNotification(duration: number): Promise<void> {
    try {
      const aiConfig = await aiConfigStorage.get();
      if (!aiConfig.enabled) {
        return;
      }

      // 预生成通知内容
      await NotificationManager.getInstance().preGenerateNotification(duration);
    } catch (error) {
      console.error('Error pre-generating notification:', error);
    }
  }

  /**
   * 检查所有已打开的标签页
   */
  private async checkAllOpenTabs(): Promise<void> {
    try {
      console.log('FocusManager: Checking all open tabs for blocked URLs');

      // 获取所有标签页
      const tabs = await chrome.tabs.query({});
      const urlBlocker = UrlBlocker.getInstance();

      // 检查每个标签页
      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          console.log('FocusManager: Checking tab:', tab.url);
          await urlBlocker.checkTabUrl(tab.id, tab.url);
        }
      }

      console.log('FocusManager: Finished checking all open tabs');
    } catch (error) {
      console.error('Error checking all open tabs:', error);
    }
  }

  /**
   * 获取当前专注状态
   */
  async getFocusStatus(): Promise<{ isActive: boolean; remainingTime: number }> {
    const focusConfig = await focusStorage.get();
    const remainingTime = await focusStorage.getRemainingTime();

    return {
      isActive: focusConfig.isActive,
      remainingTime,
    };
  }

  /**
   * 初始化专注管理器
   */
  async initialize(): Promise<void> {
    try {
      const focusConfig = await focusStorage.get();

      if (focusConfig.isActive) {
        // 如果专注模式已激活，恢复定时器检查
        this.startTimerCheck();

        // 设置徽章
        chrome.action.setBadgeText({ text: FOCUS.BADGE_TEXT });
        chrome.action.setBadgeBackgroundColor({ color: FOCUS.BADGE_COLOR });

        console.log('Focus mode restored from storage');
      }
    } catch (error) {
      console.error('Error initializing focus manager:', error);
    }
  }
}
