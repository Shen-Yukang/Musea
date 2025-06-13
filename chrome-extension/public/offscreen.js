// Offscreen document for playing audio
// Enhanced error logging and debugging

// Error logging utility
function logDetailedError(context, error, additionalInfo = {}) {
  const errorDetails = {
    context,
    timestamp: new Date().toISOString(),
    errorType: error.constructor.name,
    errorMessage: error.message,
    errorStack: error.stack,
    additionalInfo,
    userAgent: navigator.userAgent,
    audioContext: {
      audioContextState: window.AudioContext ? new AudioContext().state : 'not_supported',
      mediaDevicesSupported: !!navigator.mediaDevices,
    },
  };

  console.error(`[OFFSCREEN ERROR] ${context}:`, errorDetails);

  // Send detailed error to background script for centralized logging
  try {
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_ERROR_REPORT',
      errorDetails,
    });
  } catch (e) {
    console.error('Failed to send error report to background:', e);
  }

  return errorDetails;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[OFFSCREEN] Received message:', { type: message.type, hasAudioData: !!message.audioData });

  // 处理ping请求，用于验证offscreen document是否可用
  if (message.type === 'PING_OFFSCREEN') {
    console.log('[OFFSCREEN] Received ping, responding with pong');
    sendResponse({
      success: true,
      timestamp: Date.now(),
      message: 'Offscreen document is ready',
    });
    return true; // 保持消息通道开放以确保响应能够发送
  }

  if (message.type === 'PLAY_NOTIFICATION_SOUND') {
    playNotificationSound(message.volume, message.audioUrl)
      .then(() => {
        console.log('[OFFSCREEN] Notification sound played successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        const errorDetails = logDetailedError('NOTIFICATION_SOUND_PLAYBACK', error, {
          volume: message.volume,
          audioUrl: message.audioUrl,
        });
        sendResponse({ success: false, error: error.message, errorDetails });
      });
    return true; // Keep the message channel open for async response
  } else if (message.type === 'PLAY_TTS_SOUND') {
    playTTSSound(message.volume, message.audioData)
      .then(() => {
        console.log('[OFFSCREEN] TTS sound played successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        const errorDetails = logDetailedError('TTS_SOUND_PLAYBACK', error, {
          volume: message.volume,
          audioDataLength: message.audioData ? message.audioData.length : 0,
          audioDataPrefix: message.audioData ? message.audioData.substring(0, 50) : 'null',
        });
        sendResponse({ success: false, error: error.message, errorDetails });
      });
    return true; // Keep the message channel open for async response
  } else if (message.type === 'PLAY_MEDITATION_AUDIO') {
    playMeditationAudio(message.scene, message.volume, message.loop, message.audioUrl)
      .then(() => {
        console.log('[OFFSCREEN] Meditation audio started successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        const errorDetails = logDetailedError('MEDITATION_AUDIO_PLAYBACK', error, {
          scene: message.scene,
          volume: message.volume,
          loop: message.loop,
          audioUrl: message.audioUrl,
        });
        sendResponse({ success: false, error: error.message, errorDetails });
      });
    return true; // Keep the message channel open for async response
  } else if (message.type === 'STOP_MEDITATION_AUDIO') {
    stopMeditationAudio()
      .then(() => {
        console.log('[OFFSCREEN] Meditation audio stopped successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        const errorDetails = logDetailedError('MEDITATION_AUDIO_STOP', error);
        sendResponse({ success: false, error: error.message, errorDetails });
      });
    return true; // Keep the message channel open for async response
  }
});

// 在offscreen document加载时发送就绪信号
document.addEventListener('DOMContentLoaded', () => {
  console.log('[OFFSCREEN] Document loaded and ready');

  // 可选：向background script发送就绪信号
  try {
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_READY',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.warn('[OFFSCREEN] Could not send ready signal:', error);
  }
});

async function playNotificationSound(volume, audioUrl) {
  try {
    console.log('[OFFSCREEN] Starting notification sound playback:', { volume, audioUrl });

    const audio = new Audio(audioUrl);
    audio.volume = volume;

    // Add detailed event listeners for debugging
    audio.addEventListener('loadstart', () => console.log('[AUDIO] Load start'));
    audio.addEventListener('loadeddata', () => console.log('[AUDIO] Loaded data'));
    audio.addEventListener('canplay', () => console.log('[AUDIO] Can play'));
    audio.addEventListener('playing', () => console.log('[AUDIO] Playing'));
    audio.addEventListener('ended', () => console.log('[AUDIO] Ended'));
    audio.addEventListener('error', e => {
      console.error('[AUDIO] Audio error event:', e);
      logDetailedError('NOTIFICATION_AUDIO_ERROR_EVENT', new Error('Audio error event'), {
        audioError: e.target.error,
        audioSrc: e.target.src,
        audioReadyState: e.target.readyState,
        audioNetworkState: e.target.networkState,
      });
    });

    await audio.play();
    console.log('[OFFSCREEN] Notification sound played successfully with volume:', volume);
  } catch (error) {
    console.error('[OFFSCREEN] Failed to play notification sound:', error);
    logDetailedError('NOTIFICATION_SOUND_PLAY_FAILED', error, { volume, audioUrl });
    throw error;
  }
}

// 将base64字符串转换为Blob - Enhanced with error handling
function base64ToBlob(base64, mimeType) {
  try {
    console.log('[OFFSCREEN] Converting base64 to blob:', {
      base64Length: base64.length,
      mimeType,
      base64Prefix: base64.substring(0, 50),
    });

    // Validate base64 string
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Invalid base64 string: empty or not a string');
    }

    // Remove data URL prefix if present
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');

    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
      throw new Error('Invalid base64 format');
    }

    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    console.log('[OFFSCREEN] Base64 to blob conversion successful:', {
      blobSize: blob.size,
      blobType: blob.type,
    });

    return blob;
  } catch (error) {
    console.error('[OFFSCREEN] Base64 to blob conversion failed:', error);
    logDetailedError('BASE64_TO_BLOB_CONVERSION', error, {
      base64Length: base64 ? base64.length : 0,
      mimeType,
      base64Sample: base64 ? base64.substring(0, 100) : 'null',
    });
    throw error;
  }
}

async function playTTSSound(volume, audioData) {
  let audioUrl = null;
  try {
    console.log('[OFFSCREEN] Starting TTS sound playback:', {
      volume,
      audioDataLength: audioData ? audioData.length : 0,
      audioDataType: typeof audioData,
    });

    // Validate input parameters
    if (!audioData) {
      throw new Error('No audio data provided');
    }

    if (typeof audioData !== 'string') {
      throw new Error(`Invalid audio data type: expected string, got ${typeof audioData}`);
    }

    if (volume < 0 || volume > 1) {
      console.warn('[OFFSCREEN] Volume out of range, clamping:', volume);
      volume = Math.max(0, Math.min(1, volume));
    }

    // 将base64数据转换为Blob URL
    const audioBlob = base64ToBlob(audioData, 'audio/mpeg');
    audioUrl = URL.createObjectURL(audioBlob);

    console.log('[OFFSCREEN] Created audio URL:', audioUrl);

    const audio = new Audio(audioUrl);
    audio.volume = volume;

    // 添加详细的事件监听器用于调试
    audio.addEventListener('loadstart', () => console.log('[TTS AUDIO] Load start'));
    audio.addEventListener('loadeddata', () => console.log('[TTS AUDIO] Loaded data'));
    audio.addEventListener('canplay', () => console.log('[TTS AUDIO] Can play'));
    audio.addEventListener('playing', () => console.log('[TTS AUDIO] Playing'));
    audio.addEventListener('ended', () => {
      console.log('[TTS AUDIO] Ended');
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        console.log('[OFFSCREEN] TTS audio URL cleaned up');
      }
    });

    audio.addEventListener('error', e => {
      console.error('[TTS AUDIO] Audio error event:', e);
      const audioError = e.target.error;
      logDetailedError('TTS_AUDIO_ERROR_EVENT', new Error('TTS Audio error event'), {
        audioError: audioError
          ? {
              code: audioError.code,
              message: audioError.message,
            }
          : null,
        audioSrc: e.target.src,
        audioReadyState: e.target.readyState,
        audioNetworkState: e.target.networkState,
        audioCurrentTime: e.target.currentTime,
        audioDuration: e.target.duration,
      });

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        console.log('[OFFSCREEN] TTS audio URL cleaned up after error');
      }
    });

    await audio.play();
    console.log('[OFFSCREEN] TTS sound played successfully with volume:', volume);
  } catch (error) {
    console.error('[OFFSCREEN] Failed to play TTS sound:', error);
    logDetailedError('TTS_SOUND_PLAY_FAILED', error, {
      volume,
      audioDataLength: audioData ? audioData.length : 0,
      audioDataSample: audioData ? audioData.substring(0, 100) : 'null',
      audioUrl,
    });

    // 确保在错误时也清理URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      console.log('[OFFSCREEN] TTS audio URL cleaned up after error');
    }
    throw error;
  }
}

// 冥想音频管理
let currentMeditationAudio = null;

async function playMeditationAudio(scene, volume, loop, audioUrl) {
  try {
    console.log('[OFFSCREEN] Starting meditation audio playback:', {
      scene,
      volume,
      loop,
      audioUrl,
    });

    // 停止当前播放的冥想音频
    if (currentMeditationAudio) {
      await stopMeditationAudio();
    }

    // 静音场景不需要播放音频
    if (scene === 'silent' || !audioUrl) {
      console.log('[OFFSCREEN] Silent meditation scene, no audio to play');
      return;
    }

    // 验证音量范围
    if (volume < 0 || volume > 1) {
      console.warn('[OFFSCREEN] Volume out of range, clamping:', volume);
      volume = Math.max(0, Math.min(1, volume));
    }

    // 创建音频对象
    const audio = new Audio(audioUrl);
    audio.volume = volume;
    audio.loop = loop;

    // 添加事件监听器
    audio.addEventListener('loadstart', () => console.log('[MEDITATION AUDIO] Load start'));
    audio.addEventListener('loadeddata', () => console.log('[MEDITATION AUDIO] Loaded data'));
    audio.addEventListener('canplay', () => console.log('[MEDITATION AUDIO] Can play'));
    audio.addEventListener('playing', () => console.log('[MEDITATION AUDIO] Playing'));
    audio.addEventListener('ended', () => {
      console.log('[MEDITATION AUDIO] Ended');
      if (currentMeditationAudio === audio) {
        currentMeditationAudio = null;
      }
    });

    audio.addEventListener('error', e => {
      console.error('[MEDITATION AUDIO] Audio error event:', e);
      const audioError = e.target.error;
      logDetailedError('MEDITATION_AUDIO_ERROR_EVENT', new Error('Meditation Audio error event'), {
        scene,
        audioError: audioError
          ? {
              code: audioError.code,
              message: audioError.message,
            }
          : null,
        audioSrc: e.target.src,
        audioReadyState: e.target.readyState,
        audioNetworkState: e.target.networkState,
      });

      if (currentMeditationAudio === audio) {
        currentMeditationAudio = null;
      }
    });

    // 播放音频
    await audio.play();
    currentMeditationAudio = audio;

    console.log('[OFFSCREEN] Meditation audio started successfully:', {
      scene,
      volume,
      loop,
      duration: audio.duration,
    });
  } catch (error) {
    console.error('[OFFSCREEN] Failed to play meditation audio:', error);
    logDetailedError('MEDITATION_AUDIO_PLAY_FAILED', error, {
      scene,
      volume,
      loop,
      audioUrl,
    });
    throw error;
  }
}

async function stopMeditationAudio() {
  try {
    if (currentMeditationAudio) {
      console.log('[OFFSCREEN] Stopping meditation audio');

      // 停止播放
      currentMeditationAudio.pause();
      currentMeditationAudio.currentTime = 0;

      // 清理引用
      currentMeditationAudio = null;

      console.log('[OFFSCREEN] Meditation audio stopped successfully');
    } else {
      console.log('[OFFSCREEN] No meditation audio to stop');
    }
  } catch (error) {
    console.error('[OFFSCREEN] Failed to stop meditation audio:', error);
    logDetailedError('MEDITATION_AUDIO_STOP_FAILED', error);
    throw error;
  }
}


