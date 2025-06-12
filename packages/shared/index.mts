export * from './lib/hooks/index.js';
export * from './lib/hoc/index.js';
export * from './lib/utils/index.js';

// Re-export the classes and factory functions
export { AIService, createAIService } from './lib/services/aiService.js';
export { NotificationGenerator, createNotificationGenerator } from './lib/services/notificationGenerator.js';
export { SpeechService } from './lib/services/speechService.js';
export type {
  SpeechRecognitionResult,
  SpeechRecognitionOptions,
  SpeechRecognitionCallbacks
} from './lib/services/speechService.js';

// Re-export voice configuration constants
export {
  VOICE_OPTIONS,
  DEFAULT_TEXTS,
  VoiceType,
  getDefaultTextByVoiceType,
  isStartVoiceText,
  getVoiceLabelByType,
} from './lib/constants/voiceConfig.js';
export type { VoiceOption } from './lib/constants/voiceConfig.js';
