import React, { useState } from 'react';
import { useStorage, TTSTextProcessor } from '@extension/shared';
import { speechChatConfigStorage } from '@extension/storage';

export const SpeechChatSettings = () => {
  const config = useStorage(speechChatConfigStorage);
  const [isTestingInput, setIsTestingInput] = useState(false);
  const [isTestingOutput, setIsTestingOutput] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  // 语音录入设置处理
  const handleInputToggle = async () => {
    await speechChatConfigStorage.enableSpeechInput(!config.input.enabled);
  };

  const handleInputConfigChange = async (field: string, value: any) => {
    await speechChatConfigStorage.updateInputConfig({ [field]: value });
  };

  // 语音播放设置处理
  const handleOutputToggle = async () => {
    await speechChatConfigStorage.enableSpeechOutput(!config.output.enabled);
  };

  const handleOutputConfigChange = async (field: string, value: any) => {
    await speechChatConfigStorage.updateOutputConfig({ [field]: value });
  };

  // 对话模式设置
  const handleConversationModeToggle = async () => {
    await speechChatConfigStorage.enableConversationMode(!config.conversationMode);
  };

  // 测试语音录入
  const handleTestSpeechInput = async () => {
    if (isTestingInput) return;

    setIsTestingInput(true);
    setTestResult('');

    try {
      // 检查浏览器支持
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setTestResult('❌ 您的浏览器不支持语音识别功能');
        return;
      }

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      // 创建语音识别实例
      const recognition = new SpeechRecognition();
      recognition.continuous = config.input.continuous;
      recognition.interimResults = config.input.interimResults;
      recognition.lang = config.input.language;
      recognition.maxAlternatives = config.input.maxAlternatives;

      recognition.onstart = () => {
        setTestResult('🎤 正在监听，请说话...');
      };

      recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0;

        if (result.isFinal) {
          setTestResult(`✅ 识别结果: "${transcript}" (置信度: ${Math.round(confidence * 100)}%)`);
        } else {
          setTestResult(`🎤 识别中: "${transcript}"`);
        }
      };

      recognition.onerror = (event: any) => {
        setTestResult(`❌ 识别错误: ${event.error}`);
      };

      recognition.onend = () => {
        setIsTestingInput(false);
      };

      recognition.start();

      // 5秒后自动停止
      setTimeout(() => {
        if (recognition) {
          recognition.stop();
        }
      }, 5000);
    } catch (error) {
      setTestResult(`❌ 测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsTestingInput(false);
    }
  };

  // 测试语音播放
  const handleTestSpeechOutput = async () => {
    if (isTestingOutput) return;

    setIsTestingOutput(true);

    try {
      // 使用更友好的测试文本
      const testText = '您好！这是语音播放测试。如果您能听到这段话，说明语音功能工作正常。';

      if (config.output.useTTS && typeof chrome !== 'undefined' && chrome.runtime) {
        // 使用TTS服务
        chrome.runtime.sendMessage({
          type: 'PLAY_TTS_SOUND',
          text: testText,
        });
      } else {
        // 使用Web Speech API
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.lang = config.input.language;
        utterance.rate = config.output.playSpeed;
        utterance.volume = config.output.volume;

        utterance.onend = () => {
          setIsTestingOutput(false);
        };

        utterance.onerror = () => {
          setIsTestingOutput(false);
        };

        speechSynthesis.speak(utterance);
      }

      // 3秒后重置状态
      setTimeout(() => {
        setIsTestingOutput(false);
      }, 3000);
    } catch (error) {
      console.error('Speech output test failed:', error);
      setIsTestingOutput(false);
    }
  };

  // 语言选项
  const languageOptions = [
    { value: 'zh-CN', label: '中文（简体）' },
    { value: 'zh-TW', label: '中文（繁体）' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'ja-JP', label: '日本語' },
    { value: 'ko-KR', label: '한국어' },
  ];

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🎙️ 语音对话设置</h3>

      {/* 语音录入设置 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">语音录入</h4>

        {/* 启用语音录入 */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用语音录入</label>
          <button
            onClick={handleInputToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.input.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.input.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {config.input.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
            {/* 识别语言 */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">识别语言</label>
              <select
                value={config.input.language}
                onChange={e => speechChatConfigStorage.setLanguage(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {languageOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 灵敏度 */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                灵敏度: {Math.round(config.input.sensitivity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.input.sensitivity}
                onChange={e => speechChatConfigStorage.setSensitivity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* 高级选项 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600 dark:text-gray-400">连续识别</label>
                <input
                  type="checkbox"
                  checked={config.input.continuous}
                  onChange={e => handleInputConfigChange('continuous', e.target.checked)}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600 dark:text-gray-400">自动发送</label>
                <input
                  type="checkbox"
                  checked={config.input.autoSend}
                  onChange={e => handleInputConfigChange('autoSend', e.target.checked)}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600 dark:text-gray-400">噪音降噪</label>
                <input
                  type="checkbox"
                  checked={config.input.noiseReduction}
                  onChange={e => handleInputConfigChange('noiseReduction', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>

            {/* 测试按钮 */}
            <button
              onClick={handleTestSpeechInput}
              disabled={isTestingInput}
              className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isTestingInput
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800'
              }`}>
              {isTestingInput ? '🎤 测试中...' : '🎤 测试语音录入'}
            </button>
          </div>
        )}
      </div>

      {/* 语音播放设置 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">语音播放</h4>

        {/* 启用语音播放 */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">启用语音播放</label>
          <button
            onClick={handleOutputToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.output.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.output.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {config.output.enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
            {/* 播放速度 */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                播放速度: {config.output.playSpeed}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={config.output.playSpeed}
                onChange={e => speechChatConfigStorage.setPlaySpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* 播放音量 */}
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                播放音量: {Math.round(config.output.volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.output.volume}
                onChange={e => speechChatConfigStorage.setVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* 高级选项 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600 dark:text-gray-400">自动播放回复</label>
                <input
                  type="checkbox"
                  checked={config.output.autoPlay}
                  onChange={e => handleOutputConfigChange('autoPlay', e.target.checked)}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600 dark:text-gray-400">使用TTS引擎</label>
                <input
                  type="checkbox"
                  checked={config.output.useTTS}
                  onChange={e => handleOutputConfigChange('useTTS', e.target.checked)}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600 dark:text-gray-400">新输入时中断播放</label>
                <input
                  type="checkbox"
                  checked={config.output.interruptOnNewInput}
                  onChange={e => handleOutputConfigChange('interruptOnNewInput', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>

            {/* 测试按钮 */}
            <button
              onClick={handleTestSpeechOutput}
              disabled={isTestingOutput}
              className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isTestingOutput
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800'
              }`}>
              {isTestingOutput ? '🔊 播放中...' : '🔊 测试语音播放'}
            </button>
          </div>
        )}
      </div>

      {/* 对话模式设置 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">对话模式</h4>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">连续语音对话</label>
          <button
            onClick={handleConversationModeToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.conversationMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.conversationMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">启用后，助手回复完成后会自动开始监听您的下一句话</p>
      </div>

      {/* 测试结果显示 */}
      {testResult && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">{testResult}</p>
        </div>
      )}
    </div>
  );
};
