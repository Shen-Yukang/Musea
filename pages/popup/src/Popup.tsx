import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { t } from '@extension/i18n';
import {
  ToggleButton,
  FocusTimer,
  BlockedUrlsList,
  AISettings,
  // AINotificationGenerator,
  SoundSettings,
  TTSSettings,
  SpeechChatSettings,
  CharacterSettings,
  MeditationSettings,
} from '@extension/ui';
import { useEffect } from 'react';
import { DebugPanel } from './components/DebugPanel';

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  // 设置暗黑模式类
  useEffect(() => {
    if (!isLight) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isLight]);

  // 添加消息监听器，用于检测popup是否打开
  useEffect(() => {
    // 监听来自背景脚本的消息
    const messageListener = (
      message: any,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void,
    ) => {
      // 如果是ping消息，回复pong
      if (message && message.type === 'PING_POPUP') {
        sendResponse({ type: 'PONG_POPUP' });
        return true;
      }
      return false;
    };

    // 添加监听器
    chrome.runtime.onMessage.addListener(messageListener);

    // 清理函数
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  return (
    <div
      className="App"
      style={{
        backgroundColor: isLight ? '#f8fafc' : '#1e293b',
        backgroundImage: isLight
          ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
          : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}>
      {/* 添加AI通知生成器组件（不可见） */}
      {/* <AINotificationGenerator /> */}

      <div className={`App-content ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                viewBox="0 0 20 20"
                fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold">专注时间管理</h1>
          </div>
          <ToggleButton className="mt-0 text-xs">{t('toggleTheme')}</ToggleButton>
        </div>

        <div className="flex flex-col gap-6">
          {/* 专注时间设置 */}
          <FocusTimer />

          {/* 冥想设置 */}
          <MeditationSettings />

          {/* 虚拟助手设置 */}
          <CharacterSettings />

          {/* 声音设置 */}
          <SoundSettings />

          {/* 语音合成设置 */}
          <TTSSettings />

          {/* 语音对话设置 */}
          <SpeechChatSettings />

          {/* AI通知设置 */}
          <AISettings />

          {/* 禁用URL列表 */}
          <BlockedUrlsList />

          {/* 调试面板 */}
          <DebugPanel />
        </div>

        <div className="text-xs text-center mt-6 text-gray-500 py-2">
          <span className="bg-white px-3 py-1 rounded-full shadow-sm" style={{ opacity: 0.8 }}>
            专注时间管理工具 v{__APP_VERSION__}
          </span>
        </div>
      </div>
    </div>
  );
};

// Loading component with spinner
const LoadingComponent = () => (
  <div className="App bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>
      <p className="text-gray-600 font-medium">加载中...</p>
    </div>
  </div>
);

// Error component
const ErrorComponent = () => (
  <div className="App bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 max-w-xs text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-red-500"
          viewBox="0 0 20 20"
          fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-red-700">出错了</h2>
      <p className="text-red-600">应用程序发生错误，请刷新页面或重新启动扩展。</p>
    </div>
  </div>
);

export default withErrorBoundary(withSuspense(Popup, <LoadingComponent />), <ErrorComponent />);
