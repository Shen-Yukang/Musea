import { useStorage, VOICE_OPTIONS, TTSTextProcessor, getVoiceLabelByType } from '@extension/shared';
import { ttsConfigStorage } from '@extension/storage';
import React, { useState, useCallback, useRef, useEffect } from 'react';

export const TTSSettings = () => {
  const ttsConfig = useStorage(ttsConfigStorage);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  // 本地状态用于输入框，避免每次输入都触发存储更新
  const [localDefaultText, setLocalDefaultText] = useState(ttsConfig.defaultText);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleTTS = async () => {
    await ttsConfigStorage.updateConfig({ enabled: !ttsConfig.enabled });
  };

  const handleConfigChange = async (field: string, value: string | number) => {
    await ttsConfigStorage.updateConfig({ [field]: value });
  };

  // 防抖的文本更新函数
  const debouncedUpdateDefaultText = useCallback((text: string) => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 设置新的定时器
    debounceTimerRef.current = setTimeout(async () => {
      await ttsConfigStorage.updateConfig({ defaultText: text });
    }, 500); // 500ms 防抖延迟
  }, []);

  // 处理默认文本输入变化
  const handleDefaultTextChange = (text: string) => {
    setLocalDefaultText(text); // 立即更新本地状态
    debouncedUpdateDefaultText(text); // 防抖更新存储
  };

  // 获取当前语音类型的默认文本（用作 placeholder）
  const getCurrentDefaultText = () => {
    // 创建一个临时配置，清空用户自定义文本，获取语音类型的默认文本
    const tempConfig = { ...ttsConfig, defaultText: '' };
    return TTSTextProcessor.getDisplayDefaultText(tempConfig);
  };

  // 获取实际用于TTS的文本（用户自定义 > 语音类型默认）
  const getEffectiveText = () => {
    // 使用本地状态而不是存储状态，以获取最新的输入
    const tempConfig = { ...ttsConfig, defaultText: localDefaultText };
    return TTSTextProcessor.getDisplayDefaultText(tempConfig);
  };

  // 同步存储状态到本地状态（当存储状态变化时）
  useEffect(() => {
    setLocalDefaultText(ttsConfig.defaultText);
  }, [ttsConfig.defaultText]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleTestTTS = async () => {
    if (isTestPlaying) return;

    setIsTestPlaying(true);
    setTestResult('');

    try {
      // 确保配置已保存
      if (!ttsConfig.appid || !ttsConfig.token) {
        setTestResult('❌ 请先配置AppID和Token');
        return;
      }

      // 使用当前配置的默认文本进行测试
      const testText = getEffectiveText() || '这是语音合成测试，你好！';

      console.log('Testing TTS with:', {
        voiceType: ttsConfig.voiceType,
        text: testText,
        enabled: ttsConfig.enabled,
      });

      // 发送消息给background script进行TTS测试
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_TTS',
        text: testText,
        // 明确传递当前配置，确保使用正确的语音类型
        config: {
          voiceType: ttsConfig.voiceType,
          speedRatio: ttsConfig.speedRatio,
          appid: ttsConfig.appid,
          token: ttsConfig.token,
        },
      });

      if (response && response.success) {
        setTestResult(`✅ 测试成功！使用语音类型: ${getVoiceLabelByType(ttsConfig.voiceType)}`);
      } else {
        setTestResult('❌ 测试失败：' + (response?.error || '未知错误'));
      }
    } catch (error) {
      console.error('TTS test error:', error);
      setTestResult('❌ 测试失败：' + (error as Error).message);
    } finally {
      setIsTestPlaying(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🎤 语音合成设置</h3>

      {/* 启用/禁用TTS */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用语音通知</label>
        <button
          onClick={handleToggleTTS}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            ttsConfig.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
          }`}>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              ttsConfig.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* TTS配置 */}
      {ttsConfig.enabled && (
        <div className="space-y-4">
          {/* API配置 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">API 配置</h4>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">应用ID (AppID)</label>
              <input
                type="text"
                value={ttsConfig.appid}
                onChange={e => handleConfigChange('appid', e.target.value)}
                placeholder="请输入字节跳动TTS应用ID"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">访问令牌 (Token)</label>
              <input
                type="password"
                value={ttsConfig.token}
                onChange={e => handleConfigChange('token', e.target.value)}
                placeholder="请输入访问令牌"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* 语音设置 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">语音设置</h4>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">语音类型</label>
              <select
                value={ttsConfig.voiceType}
                onChange={e => handleConfigChange('voiceType', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                {VOICE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                语速: {ttsConfig.speedRatio}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsConfig.speedRatio}
                onChange={e => handleConfigChange('speedRatio', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>慢 (0.5x)</span>
                <span>正常 (1.0x)</span>
                <span>快 (2.0x)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">默认语音文本</label>
              <textarea
                value={localDefaultText}
                onChange={e => handleDefaultTextChange(e.target.value)}
                placeholder={getCurrentDefaultText()}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">💡 留空将使用当前语音角色的默认文本</div>
            </div>
          </div>

          {/* 测试按钮 */}
          <div className="space-y-2">
            <button
              onClick={handleTestTTS}
              disabled={isTestPlaying || !ttsConfig.appid || !ttsConfig.token}
              className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isTestPlaying || !ttsConfig.appid || !ttsConfig.token
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
              }`}>
              {isTestPlaying ? '🎵 测试中...' : '🎤 测试语音合成'}
            </button>

            {testResult && (
              <div
                className={`p-2 text-xs rounded-md ${
                  testResult.includes('✅')
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}>
                {testResult}
              </div>
            )}
          </div>

          {/* 使用说明 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>💡 使用说明：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>需要配置字节跳动TTS服务的API密钥</li>
              <li>启用后，专注模式的通知将使用语音播报</li>
              <li>如果语音合成失败，会自动回退到普通音效</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
