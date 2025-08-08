import { useState, useEffect } from 'react';
import { useStorage } from '@extension/shared';
import { visitMonitorStorage } from '@extension/storage';
import type { VisitMonitorConfig, SiteVisitStats } from '@extension/storage';

type VisitMonitorSettingsProps = {
  isLight: boolean;
};

export const VisitMonitorSettings: React.FC<VisitMonitorSettingsProps> = ({ isLight }) => {
  const visitConfig = useStorage(visitMonitorStorage);
  const [stats, setStats] = useState<Record<string, SiteVisitStats>>({});
  const [customMessage, setCustomMessage] = useState(visitConfig.customMessage || '');
  const [maxVisits, setMaxVisits] = useState(visitConfig.maxVisitsPerDay || 5);
  const [maxDuration, setMaxDuration] = useState(visitConfig.maxDurationPerDay || 15);
  const [isLoading, setIsLoading] = useState(false);

  // 加载统计数据
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const allStats = await visitMonitorStorage.getAllStats();
      setStats(allStats);
    } catch (error) {
      console.error('Error loading visit stats:', error);
    }
  };

  // 同步配置
  useEffect(() => {
    setCustomMessage(visitConfig.customMessage || '');
    setMaxVisits(visitConfig.maxVisitsPerDay || 5);
    setMaxDuration(visitConfig.maxDurationPerDay || 15);
  }, [visitConfig]);

  // 切换启用状态
  const handleToggleEnabled = async () => {
    setIsLoading(true);
    try {
      await visitMonitorStorage.set(current => ({
        ...current,
        enabled: !current.enabled,
      }));
    } catch (error) {
      console.error('Error toggling monitor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 更新阈值
  const handleUpdateThresholds = async () => {
    setIsLoading(true);
    try {
      await visitMonitorStorage.updateThresholds(maxVisits, maxDuration);
      alert('阈值设置已保存');
    } catch (error) {
      console.error('Error updating thresholds:', error);
      alert('保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 更新自定义消息
  const handleUpdateMessage = async () => {
    setIsLoading(true);
    try {
      await visitMonitorStorage.updateCustomMessage(customMessage);
      alert('自定义消息已保存');
    } catch (error) {
      console.error('Error updating message:', error);
      alert('保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 重置统计数据
  const handleResetStats = async () => {
    if (!confirm('确定要重置所有访问统计数据吗？此操作不可撤销。')) {
      return;
    }

    setIsLoading(true);
    try {
      await visitMonitorStorage.resetDailyStats();
      setStats({});
      alert('统计数据已重置');
    } catch (error) {
      console.error('Error resetting stats:', error);
      alert('重置失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 清理旧数据
  const handleCleanupData = async () => {
    setIsLoading(true);
    try {
      await visitMonitorStorage.cleanupOldRecords();
      await loadStats();
      alert('数据清理完成');
    } catch (error) {
      console.error('Error cleaning up data:', error);
      alert('清理失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化时间
  const formatDuration = (milliseconds: number) => {
    const minutes = Math.round(milliseconds / (1000 * 60));
    return `${minutes} 分钟`;
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>访问监控设置</h2>
        <p className={`mt-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
          监控被阻止网站的访问频率，当超过阈值时自动引导到深呼吸页面
        </p>
      </div>

      {/* 启用/禁用开关 */}
      <div
        className={`p-4 rounded-lg ${isLight ? 'bg-white border border-gray-200' : 'bg-gray-700 border border-gray-600'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>启用访问监控</h3>
            <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>监控用户对被阻止网站的访问行为</p>
          </div>
          <button
            onClick={handleToggleEnabled}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              visitConfig.enabled ? 'bg-blue-600' : isLight ? 'bg-gray-200' : 'bg-gray-600'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                visitConfig.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 阈值设置 */}
      <div
        className={`p-4 rounded-lg ${isLight ? 'bg-white border border-gray-200' : 'bg-gray-700 border border-gray-600'}`}>
        <h3 className={`text-lg font-medium mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>阈值设置</h3>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              24小时内最大访问次数
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={maxVisits}
              onChange={e => setMaxVisits(parseInt(e.target.value) || 5)}
              className={`w-full px-3 py-2 border rounded-md ${
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-100'
              }`}
            />
            <p className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>超过此次数将触发深呼吸页面</p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              24小时内最大停留时间（分钟）
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={maxDuration}
              onChange={e => setMaxDuration(parseInt(e.target.value) || 15)}
              className={`w-full px-3 py-2 border rounded-md ${
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-100'
              }`}
            />
            <p className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              累计停留时间超过此值将触发深呼吸页面
            </p>
          </div>

          <button
            onClick={handleUpdateThresholds}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}>
            {isLoading ? '保存中...' : '保存阈值设置'}
          </button>
        </div>
      </div>

      {/* 自定义消息 */}
      <div
        className={`p-4 rounded-lg ${isLight ? 'bg-white border border-gray-200' : 'bg-gray-700 border border-gray-600'}`}>
        <h3 className={`text-lg font-medium mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>自定义提醒消息</h3>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              深呼吸页面显示的消息
            </label>
            <textarea
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              rows={3}
              placeholder="输入在深呼吸页面显示的自定义消息..."
              className={`w-full px-3 py-2 border rounded-md ${
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-100'
              }`}
            />
          </div>

          <button
            onClick={handleUpdateMessage}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}>
            {isLoading ? '保存中...' : '保存消息'}
          </button>
        </div>
      </div>

      {/* 访问统计 */}
      <div
        className={`p-4 rounded-lg ${isLight ? 'bg-white border border-gray-200' : 'bg-gray-700 border border-gray-600'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>24小时访问统计</h3>
          <button
            onClick={loadStats}
            disabled={isLoading}
            className={`px-3 py-1 text-sm rounded-md ${
              isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            刷新
          </button>
        </div>

        {Object.keys(stats).length === 0 ? (
          <p className={`text-center py-8 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>暂无访问记录</p>
        ) : (
          <div className="space-y-3">
            {Object.values(stats).map(stat => (
              <div key={stat.url} className={`p-3 rounded-md ${isLight ? 'bg-gray-50' : 'bg-gray-600'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{stat.url}</p>
                    <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                      最后访问: {formatTimestamp(stat.lastVisit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                      访问 {stat.visitCount} 次
                    </p>
                    <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                      停留 {formatDuration(stat.totalDuration)}
                    </p>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>访问次数进度</span>
                    <span className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                      {stat.visitCount}/{visitConfig.maxVisitsPerDay}
                    </span>
                  </div>
                  <div className={`w-full bg-gray-200 rounded-full h-1.5 ${isLight ? '' : 'bg-gray-700'}`}>
                    <div
                      className={`h-1.5 rounded-full ${
                        stat.visitCount >= visitConfig.maxVisitsPerDay
                          ? 'bg-red-500'
                          : stat.visitCount >= visitConfig.maxVisitsPerDay * 0.8
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min((stat.visitCount / visitConfig.maxVisitsPerDay) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 数据管理 */}
      <div
        className={`p-4 rounded-lg ${isLight ? 'bg-white border border-gray-200' : 'bg-gray-700 border border-gray-600'}`}>
        <h3 className={`text-lg font-medium mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>数据管理</h3>

        <div className="flex space-x-3">
          <button
            onClick={handleCleanupData}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}>
            清理旧数据
          </button>

          <button
            onClick={handleResetStats}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
            }`}>
            重置统计
          </button>
        </div>

        <p className={`text-xs mt-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          清理旧数据：删除24小时前的访问记录
          <br />
          重置统计：清空所有访问记录和统计数据
        </p>
      </div>
    </div>
  );
};
