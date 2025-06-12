export * from './hooks/index.js';

// Re-export the classes and factory functions
export { AIService, createAIService } from './services/aiService.js';
export { NotificationGenerator, createNotificationGenerator } from './services/notificationGenerator.js';
export { SpeechService } from './services/speechService.js';
export type {
  SpeechRecognitionResult,
  SpeechRecognitionOptions,
  SpeechRecognitionCallbacks,
} from './services/speechService.js';

// Re-export new unified voice service
export {
  UnifiedVoiceService,
  createVoiceService,
  getVoiceService,
  destroyVoiceService,
} from './services/unifiedVoiceService.js';
export { VoicePlaybackManager } from './services/voicePlaybackManager.js';
export { VoiceRecognitionManager } from './services/voiceRecognitionManager.js';

// Re-export voice configuration constants
export {
  VOICE_OPTIONS,
  DEFAULT_TEXTS,
  VoiceType,
  getDefaultTextByVoiceType,
  isStartVoiceText,
  getVoiceLabelByType,
} from './constants/voiceConfig.js';
export type { VoiceOption } from './constants/voiceConfig.js';

// Re-export new voice constants and types
export {
  VOICE_CONSTANTS,
  RECOGNITION_CONSTANTS,
  CACHE_CONSTANTS,
  RETRY_CONSTANTS,
} from './constants/voiceConstants.js';
export { VoiceErrorType, VoiceState, VoiceError, STATE_TRANSITIONS } from './types/voiceTypes.js';
export type {
  VoiceResult,
  SpeechOptions,
  SpeechResult,
  ListenOptions,
  ListenResult,
  VoiceStateInfo,
  IVoiceService,
} from './types/voiceTypes.js';
