import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// Character appearance settings
export type CharacterAppearance = {
  style: 'cute-mascot' | 'simple-geometric' | 'minimalist-icon';
  size: 'small' | 'medium' | 'large';
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme: 'auto' | 'light' | 'dark';
};

// Character behavior settings
export type CharacterBehavior = {
  idleAnimations: boolean;
  proactiveChat: boolean;
  focusModeIntegration: boolean;
  interactionFrequency: 'low' | 'medium' | 'high';
  contextualTips: boolean;
  voiceEnabled: boolean; // Enable voice synthesis for character responses
  autoSpeak: boolean; // Automatically speak responses
  voiceInterruptible: boolean; // Allow interrupting current speech
};

// Character personality configuration
export type CharacterPersonality = {
  name: string;
  personality: 'friendly' | 'professional' | 'encouraging' | 'playful' | 'custom';
  customPrompt?: string;
  voiceType?: string; // Links to TTS voice types
  responseStyle: 'brief' | 'detailed' | 'conversational';
};

// Chat message structure
export type ChatMessage = {
  id: string;
  timestamp: number;
  sender: 'user' | 'character';
  content: string;
  type: 'text' | 'voice';
  metadata?: {
    website?: string;
    focusMode?: boolean;
    context?: string;
    taskResult?: any; // For storing task execution results
    pendingTask?: {
      // For storing pending MCP tasks
      taskId: string;
      query: string;
    };
  };
};

// Chat session structure
export type ChatSession = {
  id: string;
  startTime: number;
  endTime?: number;
  messages: ChatMessage[];
  website: string;
  focusMode: boolean;
};

// Main character configuration
export type CharacterConfig = {
  enabled: boolean;
  appearance: CharacterAppearance;
  behavior: CharacterBehavior;
  personality: CharacterPersonality;
  currentSession?: string; // Current active chat session ID
  lastInteraction?: number;
};

// Chat history storage
export type ChatHistory = {
  sessions: ChatSession[];
  maxSessions: number; // Limit stored sessions for performance
  totalMessages: number;
};

// Character storage interface
type CharacterStorage = BaseStorage<CharacterConfig> & {
  enable: (enabled: boolean) => Promise<void>;
  updateAppearance: (appearance: Partial<CharacterAppearance>) => Promise<void>;
  updateBehavior: (behavior: Partial<CharacterBehavior>) => Promise<void>;
  updatePersonality: (personality: Partial<CharacterPersonality>) => Promise<void>;
  setCurrentSession: (sessionId?: string) => Promise<void>;
  updateLastInteraction: () => Promise<void>;
};

// Chat history storage interface
type ChatHistoryStorage = BaseStorage<ChatHistory> & {
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage>;
  startSession: (website: string, focusMode: boolean) => Promise<ChatSession>;
  endSession: (sessionId: string) => Promise<void>;
  getRecentMessages: (limit?: number) => Promise<ChatMessage[]>;
  clearHistory: () => Promise<void>;
  getSessionById: (sessionId: string) => Promise<ChatSession | null>;
};

// Default character configuration
const defaultCharacterConfig: CharacterConfig = {
  enabled: true, // 👈 启用Character功能
  appearance: {
    style: 'cute-mascot',
    size: 'medium',
    position: 'bottom-right',
    theme: 'auto',
  },
  behavior: {
    idleAnimations: true,
    proactiveChat: false,
    focusModeIntegration: true,
    interactionFrequency: 'medium',
    contextualTips: true,
    voiceEnabled: false, // Default to disabled
    autoSpeak: true, // Auto-speak when voice is enabled
    voiceInterruptible: true, // Allow interrupting speech
  },
  personality: {
    name: '小助手',
    personality: 'encouraging',
    responseStyle: 'conversational',
  },
};

// Default chat history
const defaultChatHistory: ChatHistory = {
  sessions: [],
  maxSessions: 50, // Keep last 50 sessions
  totalMessages: 0,
};

// Create character configuration storage
const characterConfigBaseStorage = createStorage<CharacterConfig>(
  'character-config-storage-key',
  defaultCharacterConfig,
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// Create chat history storage
const chatHistoryBaseStorage = createStorage<ChatHistory>('character-chat-history-storage-key', defaultChatHistory, {
  storageEnum: StorageEnum.Local,
  liveUpdate: false, // Don't need live updates for chat history
});

// Extended character storage
export const characterStorage: CharacterStorage = {
  ...characterConfigBaseStorage,

  enable: async (enabled: boolean) => {
    await characterConfigBaseStorage.set(current => ({
      ...current,
      enabled,
    }));
  },

  updateAppearance: async (appearance: Partial<CharacterAppearance>) => {
    await characterConfigBaseStorage.set(current => ({
      ...current,
      appearance: { ...current.appearance, ...appearance },
    }));
  },

  updateBehavior: async (behavior: Partial<CharacterBehavior>) => {
    await characterConfigBaseStorage.set(current => ({
      ...current,
      behavior: { ...current.behavior, ...behavior },
    }));
  },

  updatePersonality: async (personality: Partial<CharacterPersonality>) => {
    await characterConfigBaseStorage.set(current => ({
      ...current,
      personality: { ...current.personality, ...personality },
    }));
  },

  setCurrentSession: async (sessionId?: string) => {
    await characterConfigBaseStorage.set(current => ({
      ...current,
      currentSession: sessionId,
    }));
  },

  updateLastInteraction: async () => {
    await characterConfigBaseStorage.set(current => ({
      ...current,
      lastInteraction: Date.now(),
    }));
  },
};

// Extended chat history storage
export const chatHistoryStorage: ChatHistoryStorage = {
  ...chatHistoryBaseStorage,

  addMessage: async (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
    };

    const currentConfig = await characterStorage.get();
    const currentSessionId = currentConfig.currentSession;

    await chatHistoryBaseStorage.set(current => {
      const updatedSessions = [...current.sessions];

      if (currentSessionId) {
        const sessionIndex = updatedSessions.findIndex(s => s.id === currentSessionId);
        if (sessionIndex !== -1) {
          updatedSessions[sessionIndex] = {
            ...updatedSessions[sessionIndex],
            messages: [...updatedSessions[sessionIndex].messages, newMessage],
          };
        }
      }

      return {
        ...current,
        sessions: updatedSessions,
        totalMessages: current.totalMessages + 1,
      };
    });

    return newMessage;
  },

  startSession: async (website: string, focusMode: boolean) => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      startTime: Date.now(),
      messages: [],
      website,
      focusMode,
    };

    await chatHistoryBaseStorage.set(current => {
      const updatedSessions = [newSession, ...current.sessions];

      // Keep only the most recent sessions
      if (updatedSessions.length > current.maxSessions) {
        updatedSessions.splice(current.maxSessions);
      }

      return {
        ...current,
        sessions: updatedSessions,
      };
    });

    // Set as current session
    await characterStorage.setCurrentSession(newSession.id);

    return newSession;
  },

  endSession: async (sessionId: string) => {
    await chatHistoryBaseStorage.set(current => {
      const updatedSessions = current.sessions.map(session =>
        session.id === sessionId ? { ...session, endTime: Date.now() } : session,
      );

      return {
        ...current,
        sessions: updatedSessions,
      };
    });

    // Clear current session if it matches
    const currentConfig = await characterStorage.get();
    if (currentConfig.currentSession === sessionId) {
      await characterStorage.setCurrentSession(undefined);
    }
  },

  getRecentMessages: async (limit = 20) => {
    const history = await chatHistoryBaseStorage.get();
    const allMessages: ChatMessage[] = [];

    // Collect messages from all sessions, most recent first
    for (const session of history.sessions) {
      allMessages.push(...session.messages);
    }

    // Sort by timestamp (most recent first) and limit
    return allMessages.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  },

  clearHistory: async () => {
    await chatHistoryBaseStorage.set(defaultChatHistory);
    await characterStorage.setCurrentSession(undefined);
  },

  getSessionById: async (sessionId: string) => {
    const history = await chatHistoryBaseStorage.get();
    return history.sessions.find(session => session.id === sessionId) || null;
  },
};
