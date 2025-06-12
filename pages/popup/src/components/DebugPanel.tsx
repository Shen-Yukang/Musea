import React, { useState, useEffect } from 'react';

interface ErrorReport {
  context: string;
  timestamp: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  source: string;
  additionalInfo?: any;
}

interface ErrorReportsResponse {
  success: boolean;
  reports: ErrorReport[];
  totalCount: number;
}

export const DebugPanel: React.FC = () => {
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 获取错误报告
  const fetchErrorReports = async () => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ERROR_REPORTS' });
      if (response && response.success) {
        setErrorReports(response.reports || []);
        setTotalCount(response.totalCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch error reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除错误报告
  const clearErrorReports = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ERROR_REPORTS' });
      if (response && response.success) {
        setErrorReports([]);
        setTotalCount(0);
        setSelectedReport(null);
        console.log(`Cleared ${response.clearedCount} error reports`);
      }
    } catch (error) {
      console.error('Failed to clear error reports:', error);
    }
  };

  // 测试TTS功能
  const testTTS = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_TTS',
        text: '这是一个TTS测试',
      });
      console.log('TTS test result:', response);
      // 刷新错误报告以查看是否有新错误
      setTimeout(fetchErrorReports, 1000);
    } catch (error) {
      console.error('TTS test failed:', error);
    }
  };

  // 测试角色管理器
  const testCharacterManager = async () => {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      // 发送测试消息
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'TEST_CHARACTER_MANAGER',
      });
      console.log('Character manager test result:', response);
      setTimeout(fetchErrorReports, 1000);
    } catch (error) {
      console.error('Character manager test failed:', error);
      setTimeout(fetchErrorReports, 1000);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchErrorReports();
    }
  }, [isExpanded]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getErrorTypeColor = (context: string) => {
    const colors: Record<string, string> = {
      TTS_GENERATION: 'text-red-600',
      TTS_PLAY: 'text-orange-600',
      TTS_SOUND_PLAYBACK: 'text-yellow-600',
      NOTIFICATION_SOUND_PLAYBACK: 'text-blue-600',
      OFFSCREEN_ERROR_REPORT: 'text-purple-600',
      CONTENT_RUNTIME_INJECTION: 'text-green-600',
    };
    return colors[context] || 'text-gray-600';
  };

  if (!isExpanded) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
          🐛 调试面板 {totalCount > 0 && `(${totalCount} 错误)`}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🐛 调试面板</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* 控制按钮 */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchErrorReports}
            disabled={isLoading}
            className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isLoading ? '加载中...' : '刷新错误'}
          </button>
          <button
            onClick={clearErrorReports}
            className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            清除错误
          </button>
          <button
            onClick={testTTS}
            className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            测试TTS
          </button>
          <button
            onClick={testCharacterManager}
            className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            测试角色
          </button>
        </div>

        {/* 错误统计 */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          总错误数: {totalCount} | 显示最近: {errorReports.length}
        </div>

        {/* 错误列表 */}
        <div className="max-h-60 overflow-y-auto space-y-2">
          {errorReports.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              {isLoading ? '加载中...' : '暂无错误报告'}
            </div>
          ) : (
            errorReports.map((report, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => setSelectedReport(selectedReport === report ? null : report)}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${getErrorTypeColor(report.context)}`}>{report.context}</span>
                  <span className="text-xs text-gray-500">{formatTimestamp(report.timestamp)}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{report.errorMessage}</div>

                {selectedReport === report && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs space-y-2">
                      <div>
                        <strong>错误类型:</strong> {report.errorType}
                      </div>
                      <div>
                        <strong>来源:</strong> {report.source}
                      </div>
                      {report.additionalInfo && (
                        <div>
                          <strong>附加信息:</strong>
                          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                            {JSON.stringify(report.additionalInfo, null, 2)}
                          </pre>
                        </div>
                      )}
                      {report.errorStack && (
                        <div>
                          <strong>堆栈跟踪:</strong>
                          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                            {report.errorStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
