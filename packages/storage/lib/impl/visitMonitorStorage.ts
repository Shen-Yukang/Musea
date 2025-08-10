import { createStorage, StorageEnum, BaseStorage } from '../base/index.js';

// 访问记录接口
export interface VisitRecord {
  url: string;
  timestamp: number; // 访问时间戳
  duration: number; // 停留时间（毫秒）
  isBlocked: boolean; // 是否被阻止
}

// 网站访问统计
export interface SiteVisitStats {
  url: string;
  visitCount: number; // 24小时内访问次数
  totalDuration: number; // 24小时内总停留时间（毫秒）
  lastVisit: number; // 最后访问时间戳
  firstVisit: number; // 首次访问时间戳
}

// 访问监控配置
export interface VisitMonitorConfig {
  enabled: boolean; // 是否启用监控
  maxVisitsPerDay: number; // 24小时内最大访问次数
  maxDurationPerDay: number; // 24小时内最大停留时间（分钟）
  customMessage: string; // 自定义提醒文案
  records: VisitRecord[]; // 访问记录
  stats: Record<string, SiteVisitStats>; // 网站统计数据
  lastCleanup: number; // 最后清理时间戳
  lastDailyReset: number; // 最后每日重置时间戳
}

// 默认配置（监控始终启用，不允许用户关闭）
const defaultConfig: VisitMonitorConfig = {
  enabled: true, // 强制启用，不允许用户关闭
  maxVisitsPerDay: 5,
  maxDurationPerDay: 15, // 15分钟
  customMessage: '您今天已经过度浏览了这些网站，让我们一起深呼吸，重新专注吧！',
  records: [],
  stats: {},
  lastCleanup: Date.now(),
  lastDailyReset: Date.now(),
};

// 访问监控存储接口
export type VisitMonitorStorage = BaseStorage<VisitMonitorConfig> & {
  recordVisit: (url: string, duration: number, isBlocked: boolean) => Promise<void>;
  checkThreshold: (url: string) => Promise<{ exceeded: boolean; reason: string }>;
  getSiteStats: (url: string) => Promise<SiteVisitStats | null>;
  getAllStats: () => Promise<Record<string, SiteVisitStats>>;
  cleanupOldRecords: () => Promise<void>;
  updateThresholds: (maxVisits: number, maxDuration: number) => Promise<void>;
  updateCustomMessage: (message: string) => Promise<void>;
  resetDailyStats: () => Promise<void>;
  getRecentRecords: (hours?: number) => Promise<VisitRecord[]>;
  checkAndPerformDailyReset: () => Promise<boolean>;
};

// 创建访问监控基础存储
const visitMonitorBaseStorage = createStorage<VisitMonitorConfig>('visit-monitor-storage-key', defaultConfig, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// 扩展访问监控存储
export const visitMonitorStorage: VisitMonitorStorage = {
  ...visitMonitorBaseStorage,

  // 记录访问
  recordVisit: async (url: string, duration: number, isBlocked: boolean) => {
    const now = Date.now();

    await visitMonitorBaseStorage.set((current: VisitMonitorConfig) => {
      const domain = new URL(url).hostname;

      // 总是添加新的访问记录（每次访问都计数）
      const newRecord: VisitRecord = {
        url,
        timestamp: now,
        duration,
        isBlocked,
      };
      const updatedRecords = [...current.records, newRecord];
      console.log('VisitMonitor: Added new record for', domain, 'duration:', Math.round(duration / 1000) + 's');

      // 更新网站统计
      const stats = { ...current.stats };

      if (!stats[domain]) {
        stats[domain] = {
          url: domain,
          visitCount: 0,
          totalDuration: 0,
          lastVisit: now,
          firstVisit: now,
        };
      }

      // 只统计24小时内的数据
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const recentRecords = updatedRecords.filter(
        (record: VisitRecord) => record.timestamp > oneDayAgo && new URL(record.url).hostname === domain,
      );

      stats[domain] = {
        ...stats[domain],
        visitCount: recentRecords.length,
        totalDuration: recentRecords.reduce((sum, record) => sum + record.duration, 0),
        lastVisit: now,
      };

      return {
        ...current,
        records: updatedRecords,
        stats,
      };
    });
  },

  // 检查是否超过阈值（监控始终启用）
  checkThreshold: async (url: string) => {
    const config = await visitMonitorBaseStorage.get();

    // 强制启用监控，忽略用户设置
    // if (!config.enabled) {
    //   return { exceeded: false, reason: '' };
    // }

    const domain = new URL(url).hostname;
    const stats = config.stats[domain];

    if (!stats) {
      return { exceeded: false, reason: '' };
    }

    // 检查访问次数
    if (stats.visitCount >= config.maxVisitsPerDay) {
      return {
        exceeded: true,
        reason: `今天已访问 ${stats.visitCount} 次，超过限制 ${config.maxVisitsPerDay} 次`,
      };
    }

    // 检查停留时间（转换为分钟）
    const totalMinutes = Math.round(stats.totalDuration / (1000 * 60));
    if (totalMinutes >= config.maxDurationPerDay) {
      return {
        exceeded: true,
        reason: `今天已停留 ${totalMinutes} 分钟，超过限制 ${config.maxDurationPerDay} 分钟`,
      };
    }

    return { exceeded: false, reason: '' };
  },

  // 获取网站统计
  getSiteStats: async (url: string) => {
    const config = await visitMonitorBaseStorage.get();
    const domain = new URL(url).hostname;
    return config.stats[domain] || null;
  },

  // 获取所有统计
  getAllStats: async () => {
    const config = await visitMonitorBaseStorage.get();
    return config.stats;
  },

  // 清理旧记录
  cleanupOldRecords: async () => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    await visitMonitorBaseStorage.set((current: VisitMonitorConfig) => {
      // 只保留24小时内的记录
      const recentRecords = current.records.filter((record: VisitRecord) => record.timestamp > oneDayAgo);

      // 重新计算统计数据
      const stats: Record<string, SiteVisitStats> = {};

      recentRecords.forEach((record: VisitRecord) => {
        const domain = new URL(record.url).hostname;

        if (!stats[domain]) {
          stats[domain] = {
            url: domain,
            visitCount: 0,
            totalDuration: 0,
            lastVisit: record.timestamp,
            firstVisit: record.timestamp,
          };
        }

        stats[domain].visitCount++;
        stats[domain].totalDuration += record.duration;
        stats[domain].lastVisit = Math.max(stats[domain].lastVisit, record.timestamp);
        stats[domain].firstVisit = Math.min(stats[domain].firstVisit, record.timestamp);
      });

      return {
        ...current,
        records: recentRecords,
        stats,
        lastCleanup: now,
      };
    });
  },

  // 更新阈值设置
  updateThresholds: async (maxVisits: number, maxDuration: number) => {
    await visitMonitorBaseStorage.set((current: VisitMonitorConfig) => ({
      ...current,
      maxVisitsPerDay: maxVisits,
      maxDurationPerDay: maxDuration,
    }));
  },

  // 更新自定义消息
  updateCustomMessage: async (message: string) => {
    await visitMonitorBaseStorage.set((current: VisitMonitorConfig) => ({
      ...current,
      customMessage: message,
    }));
  },

  // 重置每日统计
  resetDailyStats: async () => {
    await visitMonitorBaseStorage.set((current: VisitMonitorConfig) => ({
      ...current,
      records: [],
      stats: {},
      lastCleanup: Date.now(),
    }));
  },

  // 获取最近记录
  getRecentRecords: async (hours = 24) => {
    const config = await visitMonitorBaseStorage.get();
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

    return config.records.filter((record: VisitRecord) => record.timestamp > cutoffTime);
  },

  // 检查并执行每日重置（基于早上7点）
  checkAndPerformDailyReset: async () => {
    const now = Date.now();
    const config = await visitMonitorBaseStorage.get();

    console.log('VisitMonitor: Checking daily reset...');
    console.log('VisitMonitor: Current time:', new Date(now).toLocaleString());
    console.log(
      'VisitMonitor: Config lastDailyReset:',
      config.lastDailyReset ? new Date(config.lastDailyReset).toLocaleString() : 'undefined',
    );
    console.log('VisitMonitor: Current records count:', config.records ? config.records.length : 0);
    console.log('VisitMonitor: Current stats count:', config.stats ? Object.keys(config.stats).length : 0);

    // 如果 lastDailyReset 不存在，说明是旧版本数据，需要重置
    if (!config.lastDailyReset) {
      console.log('VisitMonitor: lastDailyReset not found, performing initial reset');

      await visitMonitorBaseStorage.set((current: VisitMonitorConfig) => ({
        ...current,
        records: [],
        stats: {},
        lastDailyReset: now,
        lastCleanup: now,
      }));

      console.log('VisitMonitor: Initial reset completed');
      return true;
    }

    // 获取今天早上7点的时间戳
    const today = new Date();
    const todayAt7AM = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0, 0, 0);

    // 如果现在还没到今天早上7点，使用昨天早上7点
    if (now < todayAt7AM.getTime()) {
      todayAt7AM.setDate(todayAt7AM.getDate() - 1);
    }

    const resetTime = todayAt7AM.getTime();

    console.log('VisitMonitor: Today at 7AM:', todayAt7AM.toLocaleString());
    console.log('VisitMonitor: Reset time used:', new Date(resetTime).toLocaleString());
    console.log('VisitMonitor: Should reset?', config.lastDailyReset < resetTime);

    // 检查是否需要重置（上次重置时间早于今天早上7点）
    if (config.lastDailyReset < resetTime) {
      console.log(
        'VisitMonitor: Performing daily reset at 7AM. Last reset:',
        new Date(config.lastDailyReset),
        'Reset time:',
        new Date(resetTime),
      );

      await visitMonitorBaseStorage.set((current: VisitMonitorConfig) => ({
        ...current,
        records: [],
        stats: {},
        lastDailyReset: now,
        lastCleanup: now,
      }));

      console.log('VisitMonitor: Daily reset completed');
      return true; // 表示执行了重置
    }

    console.log('VisitMonitor: No reset needed');
    return false; // 表示没有执行重置
  },
};
