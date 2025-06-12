import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useStorage } from '@extension/shared';
import { characterStorage, chatHistoryStorage, mcpConfigStorage, speechChatConfigStorage } from '@extension/storage';
import type { ChatMessage } from '@extension/storage';
import { TaskSelector } from './TaskSelector.js';
import { TaskProgress } from './TaskProgress.js';

// Task execution state type (simplified for UI)
type TaskExecutionState = {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  progress: number;
  startTime: number;
  endTime?: number;
  currentSite?: string;
  message?: string;
  error?: string;
};

type ChatDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string, type: 'text' | 'voice') => Promise<void>;
  onTaskExecute?: (taskId: string, query: string) => Promise<void>;
  characterPosition: { x: number; y: number };
};

export const ChatDialog: React.FC<ChatDialogProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  onTaskExecute,
  characterPosition,
}) => {
  const config = useStorage(characterStorage);
  const mcpConfig = useStorage(mcpConfigStorage);
  const speechConfig = useStorage(speechChatConfigStorage);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showTaskProgress, setShowTaskProgress] = useState(false);
  const [currentSpeakingMessageId, setCurrentSpeakingMessageId] = useState<string | null>(null);
  const [currentTaskState, setCurrentTaskState] = useState<TaskExecutionState | undefined>();
  const [suggestedTask, setSuggestedTask] = useState<string>('');
  const [suggestedQuery, setSuggestedQuery] = useState<string>('');
  const [recognition, setRecognition] = useState<any>(null);
  const [conversationSession, setConversationSession] = useState(false);
  const [hasRecognitionResult, setHasRecognitionResult] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 用于存储对话模式的定时器
  const isUserStoppedRef = useRef(false); // 标记用户是否主动停止

  // Load recent messages when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadRecentMessages();
      // Focus input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Clear conversation timeout
      if (conversationTimeoutRef.current) {
        clearTimeout(conversationTimeoutRef.current);
        conversationTimeoutRef.current = null;
      }

      // Stop all speech activities when dialog closes
      if (recognition) {
        recognition.abort();
        setRecognition(null);
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
      setIsListening(false);
      setIsSpeaking(false);
      setConversationSession(false);
      setHasRecognitionResult(false);
    }
  }, [isOpen, recognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear conversation timeout
      if (conversationTimeoutRef.current) {
        clearTimeout(conversationTimeoutRef.current);
        conversationTimeoutRef.current = null;
      }

      // Cleanup speech recognition when component unmounts
      if (recognition) {
        recognition.abort();
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, [recognition]);

  const loadRecentMessages = async () => {
    try {
      const recentMessages = await chatHistoryStorage.getRecentMessages(10);
      setMessages(recentMessages.reverse()); // Show oldest first
    } catch (error) {
      console.error('Error loading recent messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Detect research requests in messages
  const detectResearchRequest = (message: string) => {
    const lowerMessage = message.toLowerCase();

    // Research keywords
    const researchKeywords = [
      '研究',
      '搜索',
      '查找',
      '寻找',
      '帮我找',
      '需要',
      '论文',
      'research',
      'search',
      'find',
      'look for',
      'help me find',
      'papers',
    ];

    // Academic keywords
    const academicKeywords = ['论文', '学术', '研究', '期刊', 'paper', 'academic', 'journal', 'arxiv'];

    // Code keywords
    const codeKeywords = ['代码', '库', '项目', '开源', 'code', 'library', 'project', 'github', 'repository'];

    const hasResearchKeyword = researchKeywords.some(keyword => lowerMessage.includes(keyword));

    if (!hasResearchKeyword) {
      return { isResearch: false };
    }

    // Determine suggested task
    let suggestedTaskId = 'general_research';
    if (academicKeywords.some(keyword => lowerMessage.includes(keyword))) {
      suggestedTaskId = 'research_papers';
    } else if (codeKeywords.some(keyword => lowerMessage.includes(keyword))) {
      suggestedTaskId = 'code_search';
    }

    // Extract query (simplified)
    let query = message
      .replace(/^(请|帮我|帮忙|能否|可以|我想|我需要|help me|can you|please)/i, '')
      .replace(/(搜索|查找|寻找|找到|research|search|find)/i, '')
      .replace(/(相关的|关于|有关|related to|about)/i, '')
      .replace(/(论文|资料|信息|papers|information|data)/i, '')
      .trim();

    // Extract content within brackets or quotes
    const bracketMatch = query.match(/[\[【]([^】\]]+)[\]】]/);
    if (bracketMatch) {
      query = bracketMatch[1];
    }

    const quoteMatch = query.match(/["'"]([^"'"]+)["'"]/);
    if (quoteMatch) {
      query = quoteMatch[1];
    }

    return {
      isResearch: true,
      suggestedTask: suggestedTaskId,
      query: query.trim() || message.trim(),
    };
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      // Check if MCP is enabled and detect research requests
      if (mcpConfig.enabled) {
        const detection = detectResearchRequest(messageText);
        if (detection.isResearch) {
          // Show task selector with suggestions
          setSuggestedTask(detection.suggestedTask || '');
          setSuggestedQuery(detection.query || '');
          setShowTaskSelector(true);
          setIsLoading(false);
          return;
        }
      }

      await onSendMessage(messageText, 'text');
      // Reload messages to get the latest
      await loadRecentMessages();

      // If speech output is enabled and auto-play is on, play the assistant's response
      if (speechConfig.output.enabled && speechConfig.output.autoPlay) {
        // Get the latest character message and play it
        const recentMessages = await chatHistoryStorage.getRecentMessages(1);
        if (recentMessages.length > 0 && recentMessages[0].sender === 'character') {
          await playAssistantMessage(recentMessages[0].content);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Play assistant message using TTS or Web Speech API
  const playAssistantMessage = async (text: string) => {
    try {
      setIsSpeaking(true);

      if (speechConfig.output.useTTS && typeof chrome !== 'undefined' && chrome.runtime) {
        // Use TTS service
        chrome.runtime.sendMessage({
          type: 'PLAY_TTS_SOUND',
          text: text,
        });

        // Simulate speaking duration (TTS doesn't provide end callback)
        const estimatedDuration = text.length * 100; // Rough estimate
        setTimeout(() => {
          setIsSpeaking(false);
        }, estimatedDuration);
      } else {
        // Use Web Speech API
        await playWithWebSpeechAPI(text);
      }
    } catch (error) {
      console.error('Error playing assistant message:', error);
      setIsSpeaking(false);
    }
  };

  // 播放消息语音 - 增强的错误处理和回退机制
  const handleSpeakMessage = async (message: ChatMessage) => {
    try {
      // 停止当前播放
      if (currentSpeakingMessageId) {
        handleStopSpeaking();
      }

      setCurrentSpeakingMessageId(message.id);
      setIsSpeaking(true);

      // 尝试多种播放方式，按优先级排序
      const success = await tryMultipleSpeechMethods(message.content, {
        onStart: () => {
          console.log('Started speaking message:', message.id);
        },
        onEnd: () => {
          setCurrentSpeakingMessageId(null);
          setIsSpeaking(false);
          console.log('Finished speaking message:', message.id);
        },
        onError: (error: Error) => {
          setCurrentSpeakingMessageId(null);
          setIsSpeaking(false);
          console.error('Error speaking message:', error);
        },
      });

      if (!success) {
        setCurrentSpeakingMessageId(null);
        setIsSpeaking(false);
        console.warn('All speech methods failed for message:', message.id);
      }
    } catch (error) {
      setCurrentSpeakingMessageId(null);
      setIsSpeaking(false);
      console.error('Error in handleSpeakMessage:', error);
    }
  };

  // 尝试多种语音播放方法的回退机制
  const tryMultipleSpeechMethods = async (
    text: string,
    callbacks: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    },
  ): Promise<boolean> => {
    const methods = [
      // 方法1: 使用角色管理器 (如果可用)
      async () => {
        const characterManager = (window as any).__EXTENSION_NAMESPACE__?.characterManager;
        if (characterManager && typeof characterManager.speakText === 'function') {
          console.log('[SPEECH] Trying character manager method');
          return await characterManager.speakText(text, callbacks);
        }
        throw new Error('Character manager not available');
      },

      // 方法2: 直接调用background script的TTS
      async () => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          console.log('[SPEECH] Trying direct TTS method');

          return new Promise<boolean>(resolve => {
            chrome.runtime.sendMessage(
              {
                type: 'PLAY_TTS_SOUND',
                text: text,
              },
              response => {
                if (chrome.runtime.lastError) {
                  console.error('[SPEECH] Direct TTS error:', chrome.runtime.lastError);
                  resolve(false);
                  return;
                }

                if (response && response.success) {
                  callbacks.onStart?.();
                  // 估算播放时间
                  const estimatedDuration = text.length * 100;
                  setTimeout(() => {
                    callbacks.onEnd?.();
                  }, estimatedDuration);
                  resolve(true);
                } else {
                  console.error('[SPEECH] Direct TTS failed:', response?.error);
                  resolve(false);
                }
              },
            );
          });
        }
        throw new Error('Chrome runtime not available');
      },

      // 方法3: 使用Web Speech API作为最后的回退
      async () => {
        console.log('[SPEECH] Trying Web Speech API fallback');
        if (speechConfig.output.enabled) {
          await playWithWebSpeechAPI(text);
          return true;
        }
        throw new Error('Web Speech API not enabled');
      },
    ];

    // 依次尝试每种方法
    for (let i = 0; i < methods.length; i++) {
      try {
        const result = await methods[i]();
        if (result) {
          console.log(`[SPEECH] Method ${i + 1} succeeded`);
          return true;
        }
      } catch (error) {
        console.warn(`[SPEECH] Method ${i + 1} failed:`, error);
        if (i === methods.length - 1) {
          // 最后一个方法也失败了
          callbacks.onError?.(error instanceof Error ? error : new Error('All speech methods failed'));
        }
      }
    }

    return false;
  };

  // 停止语音播放
  const handleStopSpeaking = () => {
    try {
      const characterManager = (window as any).__EXTENSION_NAMESPACE__?.characterManager;
      if (characterManager) {
        characterManager.stopSpeaking();
      }
      setCurrentSpeakingMessageId(null);
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  };

  // Play text using Web Speech API
  const playWithWebSpeechAPI = async (text: string): Promise<void> => {
    return new Promise(resolve => {
      try {
        if (!('speechSynthesis' in window)) {
          resolve();
          return;
        }

        // Stop any current speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = speechConfig.input.language;
        utterance.rate = speechConfig.output.playSpeed;
        utterance.volume = speechConfig.output.volume;

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Error with Web Speech API:', error);
        setIsSpeaking(false);
        resolve();
      }
    });
  };

  // Toggle conversation mode
  const toggleConversationMode = async () => {
    const newMode = !conversationSession;
    console.log('Toggling conversation mode:', newMode);

    if (newMode) {
      // Start conversation session
      setConversationSession(true);
      await speechChatConfigStorage.enableConversationMode(true);
      setHasRecognitionResult(false); // Reset result flag

      // Start with voice input
      handleVoiceInput();
    } else {
      // End conversation session
      console.log('Ending conversation session');

      // Mark as user stopped
      isUserStoppedRef.current = true;

      // Clear conversation timeout
      if (conversationTimeoutRef.current) {
        clearTimeout(conversationTimeoutRef.current);
        conversationTimeoutRef.current = null;
      }

      setConversationSession(false);
      await speechChatConfigStorage.enableConversationMode(false);

      // Stop all speech activities
      if (recognition) {
        recognition.abort();
        setRecognition(null);
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
      setIsListening(false);
      setIsSpeaking(false);
      setHasRecognitionResult(false);
    }
  };

  // Stop all speech activities
  const stopAllSpeech = () => {
    console.log('Stopping all speech activities');

    // Mark as user stopped
    isUserStoppedRef.current = true;

    // Clear conversation timeout
    if (conversationTimeoutRef.current) {
      clearTimeout(conversationTimeoutRef.current);
      conversationTimeoutRef.current = null;
    }

    // Stop speech recognition
    if (recognition) {
      recognition.abort(); // Use abort for immediate stop
      setRecognition(null);
    }

    // Stop speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    // Reset all states
    setIsListening(false);
    setIsSpeaking(false);
    setHasRecognitionResult(false);

    // If in conversation mode, end it
    if (conversationSession) {
      setConversationSession(false);
      speechChatConfigStorage.enableConversationMode(false);
    }
  };

  const handleTaskSelect = async (taskId: string, query: string) => {
    try {
      if (onTaskExecute) {
        await onTaskExecute(taskId, query);
      }
      setShowTaskSelector(false);
    } catch (error) {
      console.error('Error executing task:', error);
    }
  };

  const handleTaskCancel = async (executionId: string) => {
    try {
      // This would be handled by the character manager
      console.log('Cancelling task:', executionId);
      setShowTaskProgress(false);
    } catch (error) {
      console.error('Error cancelling task:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceInput = async () => {
    try {
      if (!speechConfig.input.enabled) {
        alert('语音录入功能已禁用，请在设置中启用');
        return;
      }

      // Check if browser supports speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert('您的浏览器不支持语音识别功能');
        return;
      }

      if (isListening) {
        // Stop current recognition - mark as user stopped
        isUserStoppedRef.current = true;
        if (recognition) {
          recognition.abort(); // Use abort instead of stop for immediate termination
        }
        setIsListening(false);
        setHasRecognitionResult(false);
        return;
      }

      // Clean up any existing recognition
      if (recognition) {
        recognition.abort();
        setRecognition(null);
      }

      // Request microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately, just checking permission
      } catch (error) {
        alert('需要麦克风权限才能使用语音输入');
        return;
      }

      // Reset user stopped flag when starting new recognition
      isUserStoppedRef.current = false;

      // Create and configure speech recognition with user settings
      const newRecognition = new SpeechRecognition();
      newRecognition.continuous = speechConfig.input.continuous;
      newRecognition.interimResults = speechConfig.input.interimResults;
      newRecognition.lang = speechConfig.input.language;
      newRecognition.maxAlternatives = speechConfig.input.maxAlternatives;

      newRecognition.onstart = () => {
        setIsListening(true);
        console.log('Speech recognition started');
      };

      newRecognition.onend = () => {
        setIsListening(false);
        console.log('Speech recognition ended');

        // Only continue listening in conversation mode if we got a valid result
        // and the user hasn't manually stopped the conversation
        if (conversationSession && speechConfig.conversationMode && hasRecognitionResult && !isUserStoppedRef.current) {
          console.log('Conversation mode: scheduling next listening session');

          // Clear any existing timeout
          if (conversationTimeoutRef.current) {
            clearTimeout(conversationTimeoutRef.current);
          }

          // Set new timeout and store reference
          conversationTimeoutRef.current = setTimeout(() => {
            // Double-check states before restarting and ensure dialog is still open
            if (conversationSession && !isListening && !isLoading && isOpen && !isUserStoppedRef.current) {
              console.log('Conversation mode: starting next listening session');
              setHasRecognitionResult(false); // Reset for next round
              isUserStoppedRef.current = false; // Reset user stopped flag
              handleVoiceInput();
            }
            conversationTimeoutRef.current = null; // Clear reference after execution
          }, 2000); // Wait 2 seconds before starting next listening session
        }

        // Reset user stopped flag if not in conversation mode
        if (!conversationSession) {
          isUserStoppedRef.current = false;
        }
      };

      newRecognition.onresult = (event: any) => {
        try {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          const isFinal = result.isFinal;

          if (isFinal && transcript.trim()) {
            setInputText(transcript.trim());
            setIsListening(false);
            setHasRecognitionResult(true); // Mark that we got a valid result

            // Auto-send if enabled
            if (speechConfig.input.autoSend) {
              setTimeout(() => {
                handleSendMessage();
              }, 500);
            }
          }
        } catch (error) {
          console.error('Error processing speech result:', error);
          setHasRecognitionResult(false); // Reset on error
        }
      };

      newRecognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setHasRecognitionResult(false); // Reset on error

        let errorMessage = '语音识别出错';
        let shouldShowAlert = true;

        switch (event.error) {
          case 'no-speech':
            errorMessage = '没有检测到语音，请重试';
            // In conversation mode, no-speech is normal, don't show alert
            shouldShowAlert = !conversationSession;
            break;
          case 'aborted':
            errorMessage = '语音识别被中断';
            // Aborted is usually intentional, don't show alert
            shouldShowAlert = false;
            break;
          case 'audio-capture':
            errorMessage = '无法访问麦克风，请检查权限';
            break;
          case 'not-allowed':
            errorMessage = '麦克风权限被拒绝';
            break;
          case 'network':
            errorMessage = '网络错误，请检查连接';
            break;
        }

        // Only show alert for serious errors or when not in conversation mode
        if (shouldShowAlert && !conversationSession) {
          alert(`语音识别错误: ${errorMessage}`);
        }
      };

      setRecognition(newRecognition);
      newRecognition.start();
    } catch (error) {
      console.error('Error with voice input:', error);
      setIsListening(false);
      alert('启动语音识别失败');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDialogPosition = () => {
    const dialogWidth = 320;
    const dialogHeight = 400;
    const padding = 20;

    // Position dialog relative to character
    let left = characterPosition.x - dialogWidth - padding;
    let top = characterPosition.y;

    // Adjust if dialog would go off-screen
    if (left < padding) {
      left = characterPosition.x + 80; // Position to the right of character
    }

    if (top + dialogHeight > window.innerHeight - padding) {
      top = window.innerHeight - dialogHeight - padding;
    }

    if (top < padding) {
      top = padding;
    }

    return { left, top };
  };

  const isDark =
    config.appearance.theme === 'dark' ||
    (config.appearance.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (!isOpen) return null;

  const dialogPosition = getDialogPosition();

  return (
    <div
      style={{
        position: 'fixed',
        left: `${dialogPosition.left}px`,
        top: `${dialogPosition.top}px`,
        width: '320px',
        height: '400px',
        zIndex: 10001,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          backgroundColor: isDark ? '#374151' : '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
            }}
          />
          <span
            style={{
              fontWeight: '600',
              color: isDark ? '#f9fafb' : '#111827',
              fontSize: '14px',
            }}>
            {config.personality.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isDark ? '#9ca3af' : '#6b7280',
            fontSize: '18px',
            padding: '4px',
            borderRadius: '4px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#f3f4f6';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}>
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: '12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
        {messages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: isDark ? '#9ca3af' : '#6b7280',
              fontSize: '14px',
              marginTop: '20px',
            }}>
            开始对话吧！我是你的学习助手 {config.personality.name} 😊
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
              }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor:
                      message.sender === 'user' ? (isDark ? '#3b82f6' : '#3b82f6') : isDark ? '#374151' : '#f3f4f6',
                    color: message.sender === 'user' ? '#ffffff' : isDark ? '#f9fafb' : '#111827',
                    fontSize: '14px',
                    lineHeight: '1.4',
                  }}>
                  {message.content}
                </div>
                {/* 语音播放按钮 - 只对角色消息显示 */}
                {message.sender === 'character' && (
                  <button
                    onClick={() => handleSpeakMessage(message)}
                    disabled={currentSpeakingMessageId === message.id}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: currentSpeakingMessageId === message.id ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      padding: '4px',
                      borderRadius: '4px',
                      color: currentSpeakingMessageId === message.id ? '#10b981' : isDark ? '#9ca3af' : '#6b7280',
                      opacity: currentSpeakingMessageId === message.id ? 1 : 0.7,
                    }}
                    title={currentSpeakingMessageId === message.id ? '正在播放...' : '播放语音'}
                    onMouseEnter={e => {
                      if (currentSpeakingMessageId !== message.id) {
                        e.currentTarget.style.opacity = '1';
                      }
                    }}
                    onMouseLeave={e => {
                      if (currentSpeakingMessageId !== message.id) {
                        e.currentTarget.style.opacity = '0.7';
                      }
                    }}>
                    {currentSpeakingMessageId === message.id ? '🔊' : '🔉'}
                  </button>
                )}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: isDark ? '#6b7280' : '#9ca3af',
                  marginTop: '2px',
                }}>
                {formatTime(message.timestamp)}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
            }}>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                backgroundColor: isDark ? '#374151' : '#f3f4f6',
                color: isDark ? '#9ca3af' : '#6b7280',
                fontSize: '14px',
              }}>
              <span>正在思考</span>
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Speech Status Bar */}
      {(isListening || isSpeaking || conversationSession) && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: isDark ? '#1f2937' : '#f0f9ff',
            borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isListening && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                <span>🎤</span>
                <span>正在监听...</span>
              </div>
            )}
            {isSpeaking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                <span>🔊</span>
                <span>正在播放...</span>
              </div>
            )}
            {conversationSession && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                <span>💬</span>
                <span>对话模式</span>
              </div>
            )}
          </div>
          <button
            onClick={stopAllSpeech}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#9ca3af' : '#6b7280',
              fontSize: '12px',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
            title="停止所有语音活动">
            ⏹️
          </button>
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: '12px',
          borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          backgroundColor: isDark ? '#374151' : '#f9fafb',
        }}>
        {/* Conversation Mode Toggle */}
        {speechConfig.input.enabled && speechConfig.output.enabled && (
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>连续语音对话</span>
            <button
              onClick={toggleConversationMode}
              disabled={isLoading}
              style={{
                padding: '4px 8px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: conversationSession ? '#3b82f6' : isDark ? '#4b5563' : '#e5e7eb',
                color: conversationSession ? '#ffffff' : isDark ? '#f9fafb' : '#374151',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                fontWeight: '500',
              }}
              title={conversationSession ? '结束对话模式' : '开始对话模式'}>
              {conversationSession ? '结束对话' : '开始对话'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? '正在监听语音...' : '输入消息...'}
            disabled={isLoading || isListening}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
              borderRadius: '8px',
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#f9fafb' : '#111827',
              fontSize: '14px',
              outline: 'none',
              opacity: isListening ? 0.7 : 1,
            }}
          />
          {mcpConfig.enabled && (
            <button
              onClick={() => setShowTaskSelector(true)}
              disabled={isLoading || isListening}
              style={{
                padding: '8px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: isDark ? '#4b5563' : '#e5e7eb',
                color: isDark ? '#f9fafb' : '#374151',
                cursor: isLoading || isListening ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
              title="研究任务">
              🤖
            </button>
          )}
          {speechConfig.input.enabled && (
            <button
              onClick={handleVoiceInput}
              disabled={isLoading}
              style={{
                padding: '8px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: isListening ? '#ef4444' : isDark ? '#4b5563' : '#e5e7eb',
                color: isListening ? '#ffffff' : isDark ? '#f9fafb' : '#374151',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                position: 'relative',
              }}
              title={isListening ? '停止语音输入' : '开始语音输入'}>
              🎤
              {isListening && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    animation: 'pulse 1s infinite',
                  }}
                />
              )}
            </button>
          )}
          {speechConfig.output.enabled && isSpeaking && (
            <button
              onClick={() => {
                if ('speechSynthesis' in window) {
                  speechSynthesis.cancel();
                }
                setIsSpeaking(false);
              }}
              style={{
                padding: '8px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '14px',
              }}
              title="停止播放">
              🔊
            </button>
          )}
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading || isListening}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor:
                !inputText.trim() || isLoading || isListening ? (isDark ? '#4b5563' : '#e5e7eb') : '#3b82f6',
              color: !inputText.trim() || isLoading || isListening ? (isDark ? '#9ca3af' : '#9ca3af') : '#ffffff',
              cursor: !inputText.trim() || isLoading || isListening ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}>
            发送
          </button>
        </div>
      </div>

      {/* Task Selector Modal */}
      <TaskSelector
        isOpen={showTaskSelector}
        onClose={() => setShowTaskSelector(false)}
        onTaskSelect={handleTaskSelect}
        suggestedTask={suggestedTask}
        suggestedQuery={suggestedQuery}
        isDark={isDark}
      />

      {/* Task Progress Modal */}
      <TaskProgress
        isOpen={showTaskProgress}
        onClose={() => setShowTaskProgress(false)}
        onCancel={handleTaskCancel}
        taskState={currentTaskState}
        isDark={isDark}
      />
    </div>
  );
};
