import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, domConfigStorage } from '@extension/storage';
import { ToggleButton } from '@extension/ui';
import { useState } from 'react';
import { DOMConfigManager } from './components/DOMConfigManager';
import { TestPage } from './components/TestPage';
import { BackgroundMusicSettings } from './components/BackgroundMusicSettings';

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const domConfig = useStorage(domConfigStorage);
  const [activeTab, setActiveTab] = useState<'sites' | 'global' | 'presets' | 'music' | 'test'>('sites');

  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      {/* Header */}
      <header className={`border-b ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'} p-4`}>
        <div className="flex items-center justify-between">
          <h1 className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>DOM 配置管理</h1>
          <ToggleButton onClick={exampleThemeStorage.toggle}>{isLight ? '🌙' : '☀️'}</ToggleButton>
        </div>

        {/* Tab Navigation */}
        <nav className="mt-4">
          <div className="flex space-x-1">
            {[
              { key: 'sites', label: '网站配置' },
              { key: 'global', label: '全局设置' },
              { key: 'presets', label: '预设模板' },
              { key: 'music', label: '背景音乐' },
              { key: 'test', label: '测试调试' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? isLight
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-blue-900 text-blue-300'
                    : isLight
                      ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="p-4">
        {activeTab === 'test' ? (
          <TestPage isLight={isLight} />
        ) : activeTab === 'music' ? (
          <BackgroundMusicSettings isLight={isLight} />
        ) : (
          <DOMConfigManager activeTab={activeTab} domConfig={domConfig} isLight={isLight} />
        )}
      </main>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
