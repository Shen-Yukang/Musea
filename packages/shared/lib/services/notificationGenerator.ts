/**
 * 通知生成器服务
 *
 * 注意：此服务已被弃用。AI通知生成逻辑已统一移至 Background Script 的 NotificationManager 中。
 * 保留此文件是为了向后兼容和类型定义，但主要功能已不再使用。
 */

// 备用消息，当AI生成失败时使用
export const FALLBACK_MESSAGES = [
  '休息一下吧！你已经专注工作了一段时间。',
  '该活动一下了！站起来伸展一下身体吧。',
  '休息是为了更好的工作，现在是放松的时候了。',
  '你的大脑需要休息，去喝杯水吧！',
  '专注时间结束，给自己一个小奖励吧！',
  '太棒了！你完成了一个专注周期，现在享受一下休息时光。',
  '记得休息是工作的一部分，现在放松一下吧。',
  '眨眨眼睛，活动一下，让身体放松一下吧！',
  '专注时间已结束，深呼吸，放松一下。',
  '恭喜完成专注时间！现在是休息和恢复的时候了。',
];

/**
 * 获取随机备用消息
 * @returns 随机备用消息
 */
export function getRandomFallbackMessage(): string {
  const index = Math.floor(Math.random() * FALLBACK_MESSAGES.length);
  return FALLBACK_MESSAGES[index];
}

/**
 * 通知生成器类 - 已弃用，保留用于向后兼容
 * @deprecated 请使用 Background Script 中的 NotificationManager
 */
export class NotificationGenerator {
  /**
   * @deprecated 此类已弃用，功能已移至 Background Script
   */
  constructor() {
    console.warn('NotificationGenerator is deprecated. Use Background Script NotificationManager instead.');
  }

  /**
   * @deprecated 此方法已弃用
   */
  async generateNotification(duration: number): Promise<string> {
    console.warn('generateNotification is deprecated');
    return getRandomFallbackMessage();
  }

  /**
   * @deprecated 此方法已弃用
   */
  async getNotification(duration: number): Promise<string> {
    console.warn('getNotification is deprecated');
    return getRandomFallbackMessage();
  }
}

/**
 * @deprecated 此函数已弃用
 */
export function createNotificationGenerator(): NotificationGenerator {
  console.warn('createNotificationGenerator is deprecated');
  return new NotificationGenerator();
}
