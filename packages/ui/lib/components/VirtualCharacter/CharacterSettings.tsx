import type React from 'react';
import { useState, useEffect } from 'react';
import { useStorage } from '@extension/shared';
import { characterStorage, chatHistoryStorage } from '@extension/storage';

type CharacterSettingsProps = {
  className?: string;
};

export const CharacterSettings: React.FC<CharacterSettingsProps> = ({ className }) => {
  const config = useStorage(characterStorage);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [isTestingRuntime, setIsTestingRuntime] = useState(false);
  const [runtimeTestResult, setRuntimeTestResult] = useState('');

  // Load chat statistics
  useEffect(() => {
    loadChatStats();
  }, []);

  const loadChatStats = async () => {
    try {
      const history = await chatHistoryStorage.get();
      setTotalMessages(history.totalMessages);
    } catch (error) {
      console.error('Error loading chat stats:', error);
    }
  };

  const handleToggleEnabled = async () => {
    await characterStorage.enable(!config.enabled);
  };

  const handleAppearanceChange = async (field: string, value: string) => {
    await characterStorage.updateAppearance({ [field]: value } as any);
  };

  const handleBehaviorChange = async (field: string, value: boolean | string) => {
    await characterStorage.updateBehavior({ [field]: value } as any);
  };

  const handlePersonalityChange = async (field: string, value: string) => {
    await characterStorage.updatePersonality({ [field]: value } as any);
  };

  const handleClearHistory = async () => {
    if (confirm('确定要清除所有聊天记录吗？此操作不可撤销。')) {
      await chatHistoryStorage.clearHistory();
      setTotalMessages(0);
    }
  };

  const handleTestRuntimeScript = async () => {
    if (isTestingRuntime) return;

    setIsTestingRuntime(true);
    setRuntimeTestResult('');

    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        setRuntimeTestResult('❌ 无法获取当前标签页');
        return;
      }

      // Inject the runtime script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['/content-runtime/index.iife.js'],
      });

      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Execute a test task
      const result = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXECUTE_RUNTIME_TASK',
        taskId: 'analyze-page',
        params: {},
      });

      if (result && result.success) {
        setRuntimeTestResult(`✅ 运行时脚本测试成功！\n页面分析完成：${result.data.title}`);
      } else {
        setRuntimeTestResult(`❌ 测试失败：${result?.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Runtime script test error:', error);
      setRuntimeTestResult(`❌ 测试出错：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsTestingRuntime(false);
    }
  };

  return (
    <div className={`space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🤖 虚拟助手设置</h3>

      {/* 启用/禁用 */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用虚拟助手</label>
        <button
          onClick={handleToggleEnabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
          }`}>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {config.enabled && (
        <div className="space-y-4">
          {/* 外观设置 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">外观设置</h4>

            {/* 角色风格 */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">角色风格</label>
              <select
                value={config.appearance.style}
                onChange={e => handleAppearanceChange('style', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="cute-mascot">可爱吉祥物</option>
                <option value="simple-geometric">简约几何</option>
                <option value="minimalist-icon">极简图标</option>
              </select>
            </div>

            {/* 大小 */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">大小</label>
              <select
                value={config.appearance.size}
                onChange={e => handleAppearanceChange('size', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </div>

            {/* 位置 */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">屏幕位置</label>
              <select
                value={config.appearance.position}
                onChange={e => handleAppearanceChange('position', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="bottom-right">右下角</option>
                <option value="bottom-left">左下角</option>
                <option value="top-right">右上角</option>
                <option value="top-left">左上角</option>
              </select>
            </div>
          </div>

          {/* 个性设置 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">个性设置</h4>

            {/* 名称 */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">助手名称</label>
              <input
                type="text"
                value={config.personality.name}
                onChange={e => handlePersonalityChange('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="给你的助手起个名字"
              />
            </div>

            {/* 性格类型 */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">性格类型</label>
              <select
                value={config.personality.personality}
                onChange={e => handlePersonalityChange('personality', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="friendly">友好</option>
                <option value="professional">专业</option>
                <option value="encouraging">鼓励</option>
                <option value="playful">活泼</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            {/* 回应风格 */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">回应风格</label>
              <select
                value={config.personality.responseStyle}
                onChange={e => handlePersonalityChange('responseStyle', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="brief">简洁</option>
                <option value="detailed">详细</option>
                <option value="conversational">对话式</option>
              </select>
            </div>
          </div>

          {/* 高级设置 */}
          <div className="space-y-3">
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>高级设置</span>
              <span className={`transform transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isAdvancedOpen && (
              <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                {/* 行为设置 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-600 dark:text-gray-400">空闲动画</label>
                    <input
                      type="checkbox"
                      checked={config.behavior.idleAnimations}
                      onChange={e => handleBehaviorChange('idleAnimations', e.target.checked)}
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-600 dark:text-gray-400">主动聊天</label>
                    <input
                      type="checkbox"
                      checked={config.behavior.proactiveChat}
                      onChange={e => handleBehaviorChange('proactiveChat', e.target.checked)}
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-600 dark:text-gray-400">专注模式集成</label>
                    <input
                      type="checkbox"
                      checked={config.behavior.focusModeIntegration}
                      onChange={e => handleBehaviorChange('focusModeIntegration', e.target.checked)}
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-600 dark:text-gray-400">上下文提示</label>
                    <input
                      type="checkbox"
                      checked={config.behavior.contextualTips}
                      onChange={e => handleBehaviorChange('contextualTips', e.target.checked)}
                      className="rounded"
                    />
                  </div>

                  {/* 语音功能设置 */}
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300">🎤 语音功能</h6>

                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600 dark:text-gray-400">启用语音合成</label>
                      <input
                        type="checkbox"
                        checked={config.behavior.voiceEnabled}
                        onChange={e => handleBehaviorChange('voiceEnabled', e.target.checked)}
                        className="rounded"
                      />
                    </div>

                    {config.behavior.voiceEnabled && (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-600 dark:text-gray-400">自动播放回应</label>
                          <input
                            type="checkbox"
                            checked={config.behavior.autoSpeak}
                            onChange={e => handleBehaviorChange('autoSpeak', e.target.checked)}
                            className="rounded"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-600 dark:text-gray-400">允许中断播放</label>
                          <input
                            type="checkbox"
                            checked={config.behavior.voiceInterruptible}
                            onChange={e => handleBehaviorChange('voiceInterruptible', e.target.checked)}
                            className="rounded"
                          />
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                          💡 提示：语音功能需要配置 TTS 设置才能正常工作
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 交互频率 */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">交互频率</label>
                  <select
                    value={config.behavior.interactionFrequency}
                    onChange={e => handleBehaviorChange('interactionFrequency', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>

                {/* Runtime Script Test */}
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">运行时脚本测试</h5>
                  <button
                    onClick={handleTestRuntimeScript}
                    disabled={isTestingRuntime}
                    className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isTestingRuntime
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800'
                    }`}>
                    {isTestingRuntime ? '🔄 测试中...' : '🚀 测试运行时脚本'}
                  </button>
                  {runtimeTestResult && (
                    <div
                      className={`text-xs p-2 rounded ${
                        runtimeTestResult.startsWith('✅')
                          ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                      <pre className="whitespace-pre-wrap">{runtimeTestResult}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 统计信息 */}
          <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">统计信息</h4>
            <div className="text-xs text-gray-600 dark:text-gray-400">总消息数: {totalMessages}</div>
            <button onClick={handleClearHistory} className="text-xs text-red-600 dark:text-red-400 hover:underline">
              清除聊天记录
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
