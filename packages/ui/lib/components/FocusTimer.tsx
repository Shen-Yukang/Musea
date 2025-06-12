import { focusStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type FocusTimerProps = {
  className?: string;
};

export const FocusTimer = ({ className }: FocusTimerProps) => {
  const focusConfig = useStorage(focusStorage);
  const [duration, setDuration] = useState(focusConfig.duration);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(focusConfig.isActive);

  // 格式化时间为 MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算进度百分比
  const calculateProgress = () => {
    if (!focusConfig.startTime || !focusConfig.endTime) return 0;
    const totalDuration = (focusConfig.endTime - focusConfig.startTime) / 1000;
    const elapsed = totalDuration - remainingTime;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  // 更新剩余时间
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (focusConfig.isActive) {
      // 立即获取一次剩余时间
      focusStorage.getRemainingTime().then(time => {
        setRemainingTime(time);
      });

      // 设置定时器每秒更新一次
      interval = setInterval(() => {
        focusStorage.getRemainingTime().then(time => {
          setRemainingTime(time);

          // 注意：不再在这里停止专注，而是由后台脚本负责
          // 这样即使popup关闭，后台脚本也能处理倒计时结束的情况
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [focusConfig.isActive]);

  // 同步状态
  useEffect(() => {
    setIsActive(focusConfig.isActive);
    setDuration(focusConfig.duration);
  }, [focusConfig]);

  // 开始专注
  const handleStartFocus = () => {
    focusStorage.startFocus(duration);
  };

  // 停止专注
  const handleStopFocus = () => {
    focusStorage.stopFocus();
  };

  // 更新时长
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setDuration(value);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-4 rounded-lg shadow-md transition-all duration-300 bg-gray-50 dark:bg-gray-800',
        className,
      )}>
      <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
        <span className="inline-block w-1.5 h-5 bg-blue-500 rounded-sm"></span>
        专注时间设置
      </h2>

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
                stroke="#3b82f6"
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
            onClick={handleStopFocus}
            className="py-2 px-6 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-white font-bold"
            style={{ background: 'linear-gradient(to right, #ef4444, #dc2626)' }}>
            停止专注
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-3">
            <label htmlFor="duration" className="whitespace-nowrap font-medium text-gray-700 dark:text-gray-300">
              专注时长 (分钟):
            </label>
            <div className="relative">
              <input
                id="duration"
                type="number"
                min="1"
                max="180"
                value={duration}
                onChange={handleDurationChange}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 w-20 text-center outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
              />
            </div>
          </div>
          <button
            onClick={handleStartFocus}
            className="py-2 px-6 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-white font-bold"
            style={{ background: 'linear-gradient(to right, #22c55e, #16a34a)' }}>
            开始专注
          </button>
        </div>
      )}
    </div>
  );
};
