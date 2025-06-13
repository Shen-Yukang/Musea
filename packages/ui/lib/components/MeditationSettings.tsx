import { useStorage } from '@extension/shared';
import { meditationStorage, MeditationScene } from '@extension/storage';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type MeditationSettingsProps = {
  className?: string;
};

// 场景配置
const SCENE_CONFIG = {
  [MeditationScene.FOREST]: { name: '森林', icon: '🌲', description: '鸟鸣与树叶沙沙声' },
  [MeditationScene.OCEAN]: { name: '海洋', icon: '🌊', description: '海浪轻拍海岸声' },
  [MeditationScene.RAIN]: { name: '雨声', icon: '🌧️', description: '温柔的雨滴声' },
  [MeditationScene.BIRDS]: { name: '鸟鸣', icon: '🐦', description: '清晨鸟儿歌唱' },
  [MeditationScene.CAFE]: { name: '咖啡厅', icon: '☕', description: '温馨的咖啡厅环境音' },
  [MeditationScene.LIBRARY]: { name: '图书馆', icon: '📚', description: '安静的学习氛围' },
  [MeditationScene.WHITE_NOISE]: { name: '白噪音', icon: '🔊', description: '纯净的白噪音' },
  [MeditationScene.TEMPLE]: { name: '寺庙', icon: '🏯', description: '宁静的寺庙钟声' },
  [MeditationScene.SINGING_BOWL]: { name: '颂钵', icon: '🎵', description: '治愈的颂钵音' },
  [MeditationScene.SILENT]: { name: '静音', icon: '🤫', description: '完全安静的冥想' },
};

// 预设时间选项
const DURATION_OPTIONS = [5, 10, 15, 20, 30];

export const MeditationSettings = ({ className }: MeditationSettingsProps) => {
  const meditationConfig = useStorage(meditationStorage);
  const [duration, setDuration] = useState(meditationConfig.duration);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(meditationConfig.isActive);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTime: 0,
    averageSessionTime: 0,
    streakDays: 0,
  });

  // 格式化时间为 MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算进度百分比
  const calculateProgress = () => {
    if (!isActive || duration === 0) return 0;
    const totalSeconds = duration * 60;
    const elapsed = totalSeconds - remainingTime;
    return Math.min(100, (elapsed / totalSeconds) * 100);
  };

  // 更新剩余时间
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (meditationConfig.isActive) {
      // 立即获取一次剩余时间
      meditationStorage.getRemainingTime().then(time => {
        setRemainingTime(time);
      });

      // 设置定时器每秒更新一次
      interval = setInterval(() => {
        meditationStorage.getRemainingTime().then(time => {
          setRemainingTime(time);
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [meditationConfig.isActive]);

  // 同步状态
  useEffect(() => {
    setIsActive(meditationConfig.isActive);
    setDuration(meditationConfig.duration);
  }, [meditationConfig]);

  // 加载统计数据
  useEffect(() => {
    meditationStorage.getSessionStats().then(setStats);
  }, [meditationConfig.completedSessions]);

  // 开始冥想
  const handleStartMeditation = async () => {
    await meditationStorage.startMeditation(meditationConfig.selectedScene, duration);
    // 打开冥想页面
    chrome.tabs.create({ url: chrome.runtime.getURL('meditation.html') });
  };

  // 停止冥想
  const handleStopMeditation = async () => {
    await meditationStorage.stopMeditation();
  };

  // 更新场景
  const handleSceneChange = async (scene: MeditationScene) => {
    await meditationStorage.updateScene(scene);
  };

  // 更新音量
  const handleVolumeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(event.target.value);
    await meditationStorage.updateVolume(volume);
  };

  // 切换呼吸引导
  const handleToggleBreathingGuide = async () => {
    await meditationStorage.toggleBreathingGuide(!meditationConfig.breathingGuide);
  };

  return (
    <div className={cn('space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg', className)}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🧘 冥想设置</h3>

      {/* 冥想统计 */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-white dark:bg-gray-700 p-2 rounded text-center">
          <div className="font-semibold text-blue-600 dark:text-blue-400">{stats.totalSessions}</div>
          <div className="text-gray-600 dark:text-gray-300">总次数</div>
        </div>
        <div className="bg-white dark:bg-gray-700 p-2 rounded text-center">
          <div className="font-semibold text-green-600 dark:text-green-400">{stats.totalTime}分</div>
          <div className="text-gray-600 dark:text-gray-300">总时长</div>
        </div>
      </div>

      {isActive ? (
        <div className="flex flex-col items-center py-3">
          <div className="relative w-32 h-32 mb-4 flex items-center justify-center">
            {/* Progress circle */}
            <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#10b981"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * calculateProgress()) / 100}
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            <div className="text-3xl font-bold z-10 text-gray-900 dark:text-white">{formatTime(remainingTime)}</div>
          </div>
          <button
            onClick={handleStopMeditation}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
            停止冥想
          </button>
        </div>
      ) : (
        <>
          {/* 场景选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">冥想场景</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SCENE_CONFIG).map(([scene, config]) => (
                <button
                  key={scene}
                  onClick={() => handleSceneChange(scene as MeditationScene)}
                  className={`p-2 rounded-lg text-sm transition-colors ${
                    meditationConfig.selectedScene === scene
                      ? 'bg-green-100 text-green-700 border-2 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-600'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                  }`}>
                  <div className="text-lg mb-1">{config.icon}</div>
                  <div className="font-medium">{config.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 时间设置 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">冥想时长</label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map(time => (
                <button
                  key={time}
                  onClick={() => setDuration(time)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    duration === time
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                  }`}>
                  {time}分
                </button>
              ))}
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">自定义: {duration} 分钟</div>
          </div>

          {/* 音量控制 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              音量: {Math.round(meditationConfig.volume * 100)}%
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">🔈</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={meditationConfig.volume}
                onChange={handleVolumeChange}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <span className="text-xs text-gray-500">🔊</span>
            </div>
          </div>

          {/* 呼吸引导 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">呼吸引导</label>
            <button
              onClick={handleToggleBreathingGuide}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                meditationConfig.breathingGuide ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  meditationConfig.breathingGuide ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 开始按钮 */}
          <button
            onClick={handleStartMeditation}
            className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">
            🧘 开始冥想 ({duration} 分钟)
          </button>
        </>
      )}
    </div>
  );
};
