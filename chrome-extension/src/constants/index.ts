// 时间相关常量
export const TIMEOUTS = {
  OFFSCREEN_LOAD_DELAY: 200, // offscreen document加载延迟
  MESSAGE_TIMEOUT: 5000, // 消息发送超时时间
  TIMER_CHECK_INTERVAL: 1000, // 定时器检查间隔
} as const;

// TTS相关常量
export const TTS = {
  API_URL: 'https://openspeech.bytedance.com/api/v1/tts',
  DEFAULT_CLUSTER: 'volcano_tts',
  DEFAULT_VOICE_TYPE: 'zh_male_M392_conversation_wvae_bigtts',
  DEFAULT_ENCODING: 'mp3',
  DEFAULT_SPEED_RATIO: 1.0,
  DEFAULT_UID: 'chrome_extension_user',
} as const;

// 音频相关常量
export const AUDIO = {
  DEFAULT_VOLUME: 0.5,
  MIN_VOLUME: 0,
  MAX_VOLUME: 1,
  NOTIFICATION_FILE: 'notification.mp3',
} as const;

// 专注模式相关常量
export const FOCUS = {
  DEFAULT_DURATION: 25, // 默认专注时间（分钟）
  MIN_DURATION: 1,
  MAX_DURATION: 120,
  BADGE_COLOR: '#E53935',
  BADGE_TEXT: '专注',
} as const;

// AI相关常量
export const AI = {
  DEFAULT_PRE_GENERATE_MINUTES: 5,
  MIN_PRE_GENERATE_MINUTES: 1,
  MAX_PRE_GENERATE_MINUTES: 30,
} as const;

// 消息类型常量
export const MESSAGE_TYPES = {
  PLAY_NOTIFICATION_SOUND: 'PLAY_NOTIFICATION_SOUND',
  PLAY_TTS_SOUND: 'PLAY_TTS_SOUND',
  TEST_TTS: 'TEST_TTS',
  PING_POPUP: 'PING_POPUP',
  PONG_POPUP: 'PONG_POPUP',
  CHARACTER_SEND_MESSAGE: 'CHARACTER_SEND_MESSAGE',
  CHARACTER_GET_STATE: 'CHARACTER_GET_STATE',
  CHARACTER_TOGGLE_CHAT: 'CHARACTER_TOGGLE_CHAT',
  MCP_REQUEST: 'MCP_REQUEST',
  MCP_RESPONSE: 'MCP_RESPONSE',
  PLAY_MEDITATION_AUDIO: 'PLAY_MEDITATION_AUDIO',
  STOP_MEDITATION_AUDIO: 'STOP_MEDITATION_AUDIO',
} as const;

// 通知ID常量
export const NOTIFICATION_IDS = {
  FOCUS_START: 'focus-start',
  FOCUS_END: 'focus-end',
} as const;

// 存储键常量
export const STORAGE_KEYS = {
  THEME: 'theme-storage-key',
  FOCUS_TIME: 'focus-time-storage-key',
  BLOCKED_URLS: 'blocked-urls-storage-key',
  AI_CONFIG: 'ai-config-storage-key',
  SOUND_SETTINGS: 'sound-settings-storage-key',
  TTS_CONFIG: 'tts-config-storage-key',
  NOTIFICATION_CACHE: 'notification-cache-storage-key',
  CHARACTER_CONFIG: 'character-config-storage-key',
  CHARACTER_CHAT_HISTORY: 'character-chat-history-storage-key',
  MCP_CONFIG: 'mcp-config-storage-key',
  MCP_TASK_HISTORY: 'mcp-task-history-storage-key',
} as const;

// MCP相关常量
export const MCP = {
  HOST_NAME: 'com.yourcompany.mcp_bridge',
  REQUEST_TIMEOUT: 30000, // 30秒超时
  COMMANDS: {
    SEARCH: 'search',
    EXECUTE_TASK: 'execute_task',
    GET_TASKS: 'get_tasks',
    GET_HISTORY: 'get_history',
    CANCEL_TASK: 'cancel_task',
  },
} as const;

// 错误消息常量
export const ERROR_MESSAGES = {
  TTS_NOT_CONFIGURED: 'TTS未启用或未配置',
  TTS_GENERATION_FAILED: '语音生成失败',
  SOUND_DISABLED: '声音已禁用',
  MESSAGE_TIMEOUT: '消息发送超时',
  OFFSCREEN_NOT_FOUND: 'Offscreen document未找到',
  AUDIO_PLAY_FAILED: '音频播放失败',
  MCP_CONNECTION_FAILED: 'MCP连接失败',
  MCP_REQUEST_TIMEOUT: 'MCP请求超时',
  MCP_NOT_CONFIGURED: 'MCP未配置或未启用',
} as const;
