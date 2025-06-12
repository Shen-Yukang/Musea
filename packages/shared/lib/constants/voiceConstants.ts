/**
 * 语音交互相关常量定义
 * 消除魔法数字和硬编码值
 */

// 语音播放相关常量
export const VOICE_CONSTANTS = {
  // 播放时长估算 (毫秒/字符)
  ESTIMATED_DURATION_PER_CHAR: 150,
  // 最小播放时长 (毫秒)
  MIN_PLAY_DURATION: 1000,
  // 最大播放时长 (毫秒)
  MAX_PLAY_DURATION: 30000,
  // TTS播放状态检查间隔 (毫秒)
  PLAY_STATUS_CHECK_INTERVAL: 500,
} as const;

// 语音识别相关常量
export const RECOGNITION_CONSTANTS = {
  // 对话模式重启延迟 (毫秒)
  CONVERSATION_RESTART_DELAY: 2000,
  // 自动发送延迟 (毫秒)
  AUTO_SEND_DELAY: 500,
  // 权限检查超时 (毫秒)
  PERMISSION_CHECK_TIMEOUT: 5000,
  // 识别结果等待超时 (毫秒)
  RECOGNITION_TIMEOUT: 10000,
} as const;

// 缓存相关常量
export const CACHE_CONSTANTS = {
  // 缓存过期时间 (毫秒)
  CACHE_EXPIRY_TIME: 7 * 24 * 60 * 60 * 1000, // 7天
  // 最大缓存大小 (字节)
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  // 缓存清理间隔 (毫秒)
  CACHE_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24小时
} as const;

// 错误重试相关常量
export const RETRY_CONSTANTS = {
  // 最大重试次数
  MAX_RETRY_COUNT: 3,
  // 重试延迟 (毫秒)
  RETRY_DELAY: 1000,
  // 重试延迟倍数
  RETRY_BACKOFF_MULTIPLIER: 2,
} as const;
