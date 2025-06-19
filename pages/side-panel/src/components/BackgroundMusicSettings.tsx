import { useState, useEffect } from 'react';
import { useStorage } from '@extension/shared';
import { focusStorage } from '@extension/storage';
import type { BackgroundMusicConfig } from '@extension/storage';

type BackgroundMusicSettingsProps = {
  isLight: boolean;
};

// 冥想场景选项
const MEDITATION_SCENES = [
  { value: 'forest', label: '🌲 森林', description: '鸟鸣与树叶沙沙声' },
  { value: 'ocean', label: '🌊 海洋', description: '海浪轻拍海岸声' },
  { value: 'rain', label: '🌧️ 雨声', description: '温柔的雨滴声' },
  { value: 'birds', label: '🐦 鸟鸣', description: '清晨鸟儿歌唱' },
  { value: 'cafe', label: '☕ 咖啡厅', description: '温馨的咖啡厅环境音' },
  { value: 'library', label: '📚 图书馆', description: '安静的学习氛围' },
  { value: 'white_noise', label: '🔊 白噪音', description: '纯净的白噪音' },
  { value: 'temple', label: '🏯 寺庙', description: '宁静的寺庙钟声' },
  { value: 'singing_bowl', label: '🎵 颂钵', description: '治愈的颂钵音' },
];

export const BackgroundMusicSettings = ({ isLight }: BackgroundMusicSettingsProps) => {
  const focusConfig = useStorage(focusStorage);

  // Default background music config for existing users
  const defaultBackgroundMusic: BackgroundMusicConfig = {
    enabled: false,
    source: 'meditation',
    meditationScene: 'forest',
    volume: 0.3,
    loop: true,
  };

  const [config, setConfig] = useState<BackgroundMusicConfig>(focusConfig.backgroundMusic || defaultBackgroundMusic);
  const [customUrl, setCustomUrl] = useState(config.customUrl || '');
  const [isTestPlaying, setIsTestPlaying] = useState(false);

  // 同步配置
  useEffect(() => {
    const backgroundMusic = focusConfig.backgroundMusic || defaultBackgroundMusic;
    setConfig(backgroundMusic);
    setCustomUrl(backgroundMusic.customUrl || '');
  }, [focusConfig.backgroundMusic]);

  // 更新配置
  const updateConfig = async (updates: Partial<BackgroundMusicConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await focusStorage.updateBackgroundMusic(updates);
  };

  // 切换启用状态
  const handleToggleEnabled = async () => {
    await updateConfig({ enabled: !config.enabled });
  };

  // 切换音乐来源
  const handleSourceChange = async (source: 'meditation' | 'custom') => {
    await updateConfig({ source });
  };

  // 更新冥想场景
  const handleSceneChange = async (scene: string) => {
    await updateConfig({ meditationScene: scene });
  };

  // 更新自定义URL
  const handleCustomUrlChange = (url: string) => {
    setCustomUrl(url);
  };

  // 保存自定义URL
  const handleSaveCustomUrl = async () => {
    await updateConfig({ customUrl: customUrl.trim() });
  };

  // 更新音量
  const handleVolumeChange = async (volume: number) => {
    await updateConfig({ volume });
  };

  // 切换循环播放
  const handleToggleLoop = async () => {
    await updateConfig({ loop: !config.loop });
  };

  // 测试播放
  const handleTestPlay = async () => {
    if (isTestPlaying) return;

    setIsTestPlaying(true);
    try {
      // 发送测试播放消息到background script
      let audioUrl = '';

      if (config.source === 'meditation' && config.meditationScene) {
        // 构建冥想场景音频URL
        const audioFiles = ['ogg', 'mp3', 'wav'];
        for (const ext of audioFiles) {
          try {
            audioUrl = chrome.runtime.getURL(`meditation/${config.meditationScene}.${ext}`);
            break;
          } catch (e) {
            continue;
          }
        }
      } else if (config.source === 'custom' && customUrl.trim()) {
        audioUrl = customUrl.trim();
      }

      if (audioUrl) {
        await chrome.runtime.sendMessage({
          type: 'PLAY_BACKGROUND_MUSIC',
          volume: config.volume,
          loop: false, // 测试时不循环
          audioUrl,
        });

        // 3秒后停止测试播放
        setTimeout(async () => {
          try {
            await chrome.runtime.sendMessage({
              type: 'STOP_BACKGROUND_MUSIC',
            });
          } catch (e) {
            console.warn('Failed to stop test playback:', e);
          }
          setIsTestPlaying(false);
        }, 3000);
      } else {
        setIsTestPlaying(false);
        alert('请先配置音频源');
      }
    } catch (error) {
      console.error('Test playback failed:', error);
      setIsTestPlaying(false);
      alert('测试播放失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题和总开关 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>专注背景音乐</h3>
          <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            在专注模式下播放背景音乐，帮助您更好地集中注意力
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={config.enabled} onChange={handleToggleEnabled} className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* 音乐来源选择 */}
          <div className="space-y-3">
            <label className={`block text-sm font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              音乐来源
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="source"
                  value="meditation"
                  checked={config.source === 'meditation'}
                  onChange={() => handleSourceChange('meditation')}
                  className="mr-2"
                />
                <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>冥想场景音频</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="source"
                  value="custom"
                  checked={config.source === 'custom'}
                  onChange={() => handleSourceChange('custom')}
                  className="mr-2"
                />
                <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>自定义音频URL</span>
              </label>
            </div>
          </div>

          {/* 冥想场景选择 */}
          {config.source === 'meditation' && (
            <div className="space-y-3">
              <label className={`block text-sm font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                选择场景
              </label>
              <div className="grid grid-cols-1 gap-2">
                {MEDITATION_SCENES.map(scene => (
                  <label
                    key={scene.value}
                    className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="scene"
                      value={scene.value}
                      checked={config.meditationScene === scene.value}
                      onChange={() => handleSceneChange(scene.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>{scene.label}</div>
                      <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        {scene.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 自定义URL输入 */}
          {config.source === 'custom' && (
            <div className="space-y-3">
              <label className={`block text-sm font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                音频URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={e => handleCustomUrlChange(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className={`flex-1 px-3 py-2 border rounded-md ${
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
                  }`}
                />
                <button
                  onClick={handleSaveCustomUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  保存
                </button>
              </div>
              <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                支持 MP3、OGG、WAV 等格式的音频文件
              </p>
            </div>
          )}

          {/* 音量控制 */}
          <div className="space-y-3">
            <label className={`block text-sm font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              音量: {Math.round(config.volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.volume}
              onChange={e => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 循环播放 */}
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>循环播放</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={config.loop} onChange={handleToggleLoop} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* 测试播放 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleTestPlay}
              disabled={isTestPlaying}
              className={`w-full py-2 px-4 rounded-md font-medium ${
                isTestPlaying
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}>
              {isTestPlaying ? '播放中...' : '🎵 测试播放 (3秒)'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
