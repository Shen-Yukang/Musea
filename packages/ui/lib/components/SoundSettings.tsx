import { useStorage } from '@extension/shared';
import { soundSettingsStorage } from '@extension/storage';
import { useState } from 'react';

export const SoundSettings = () => {
  const soundSettings = useStorage(soundSettingsStorage);
  const [isTestPlaying, setIsTestPlaying] = useState(false);

  const handleToggleSound = async () => {
    await soundSettingsStorage.enableSound(!soundSettings.enabled);
  };

  const handleVolumeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(event.target.value);
    await soundSettingsStorage.setVolume(volume);
  };

  const handleTestSound = async () => {
    if (isTestPlaying) return;

    setIsTestPlaying(true);
    try {
      // 播放测试音频
      const audio = new Audio(chrome.runtime.getURL('notification.mp3'));
      audio.volume = soundSettings.volume;
      await audio.play();
    } catch (error) {
      console.error('Error playing test sound:', error);
    } finally {
      setIsTestPlaying(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🔊 声音设置</h3>

      {/* 启用/禁用声音 */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用通知声音</label>
        <button
          onClick={handleToggleSound}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            soundSettings.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
          }`}>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              soundSettings.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 音量控制 */}
      {soundSettings.enabled && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            音量: {Math.round(soundSettings.volume * 100)}%
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">🔈</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={soundSettings.volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span className="text-xs text-gray-500">🔊</span>
          </div>

          {/* 测试按钮 */}
          <button
            onClick={handleTestSound}
            disabled={isTestPlaying}
            className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isTestPlaying
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800'
            }`}>
            {isTestPlaying ? '播放中...' : '🎵 测试声音'}
          </button>
        </div>
      )}
    </div>
  );
};
