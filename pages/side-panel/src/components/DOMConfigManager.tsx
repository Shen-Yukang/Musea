import React, { useState } from 'react';
import type { DOMConfig, SiteDOMConfig, DOMActionConfig, DOMActionType } from '@extension/storage';
import { domConfigStorage } from '@extension/storage';
import { SelectorHelper } from './SelectorHelper';

interface DOMConfigManagerProps {
  activeTab: 'sites' | 'global' | 'presets';
  domConfig: DOMConfig;
  isLight: boolean;
}

export const DOMConfigManager: React.FC<DOMConfigManagerProps> = ({ activeTab, domConfig, isLight }) => {
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [showSelectorHelper, setShowSelectorHelper] = useState(false);

  // 删除网站处理函数
  const handleDeleteSite = async (domain: string, siteName: string) => {
    const confirmMessage = `确定要删除网站 "${siteName}" (${domain}) 的所有配置吗？\n\n这将会：\n• 删除所有DOM操作配置\n• 从学习模式列表中移除该网站\n• 此操作不可撤销`;

    if (window.confirm(confirmMessage)) {
      try {
        await domConfigStorage.removeSite(domain);

        // 如果删除的是当前选中的网站，清除选中状态
        if (selectedSite === domain) {
          setSelectedSite(null);
        }

        console.log('✅ 网站配置已删除:', domain);

        // 显示成功提示（可选）
        // 这里可以添加一个toast通知，但为了简单起见使用console.log
      } catch (error) {
        console.error('❌ 删除网站配置失败:', error);
        alert('删除失败，请重试。错误信息：' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  const renderSitesTab = () => (
    <div className="space-y-6">
      {/* Sites List */}
      <div className={`rounded-lg border ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'} p-4`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>网站列表</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSelectorHelper(true)}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
              🎯 选择器助手
            </button>
            <button
              onClick={() => setShowAddSite(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
              添加网站
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {domConfig.sites.length === 0 ? (
            <div
              className={`p-8 text-center rounded-lg border-2 border-dashed ${
                isLight ? 'border-gray-300 text-gray-500' : 'border-gray-600 text-gray-400'
              }`}>
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className={`text-lg font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                暂无网站配置
              </h3>
              <p className="mb-4">点击"添加网站"按钮开始配置您的第一个网站DOM操作</p>
              <button
                onClick={() => setShowAddSite(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                添加第一个网站
              </button>
            </div>
          ) : (
            domConfig.sites.map(site => (
              <div
                key={site.domain}
                className={`p-3 rounded-lg border transition-colors ${
                  selectedSite === site.domain
                    ? isLight
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-blue-600 bg-blue-900/20'
                    : isLight
                      ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => setSelectedSite(site.domain)}>
                    <h3 className={`font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{site.name}</h3>
                    <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{site.domain}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          site.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {site.enabled ? '启用' : '禁用'}
                      </span>
                      <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        {site.actions.length} 个操作
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteSite(site.domain, site.name);
                      }}
                      className={`p-1 rounded transition-colors ${
                        isLight
                          ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                          : 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                      }`}
                      title={`删除 ${site.name}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Site Details */}
      {selectedSite && (
        <SiteDetails
          site={domConfig.sites.find(s => s.domain === selectedSite)!}
          isLight={isLight}
          onUpdate={updates => {
            domConfigStorage.updateSite(selectedSite, updates);
          }}
          onAddAction={() => setShowAddAction(true)}
        />
      )}

      {/* Add Site Modal */}
      {showAddSite && (
        <AddSiteModal
          isLight={isLight}
          onClose={() => setShowAddSite(false)}
          onAdd={site => {
            domConfigStorage.addSite(site);
            setShowAddSite(false);
          }}
        />
      )}

      {/* Add Action Modal */}
      {showAddAction && selectedSite && (
        <AddActionModal
          isLight={isLight}
          domain={selectedSite}
          onClose={() => setShowAddAction(false)}
          onAdd={action => {
            domConfigStorage.addAction(selectedSite, action);
            setShowAddAction(false);
          }}
        />
      )}

      {/* Selector Helper */}
      {showSelectorHelper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto ${isLight ? 'bg-white' : 'bg-gray-800'} rounded-lg`}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>选择器助手</h3>
              <button
                onClick={() => setShowSelectorHelper(false)}
                className={`text-gray-500 hover:text-gray-700 ${isLight ? '' : 'hover:text-gray-300'}`}>
                ✕
              </button>
            </div>
            <div className="p-4">
              <SelectorHelper
                isLight={isLight}
                onSelectorSelect={selector => {
                  // 这里可以将选择器传递给当前的添加操作表单
                  setShowSelectorHelper(false);
                  // 如果有选中的网站，可以直接添加操作
                  if (selectedSite) {
                    setShowAddAction(true);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderGlobalTab = () => (
    <div className={`rounded-lg border ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'} p-6`}>
      <h2 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>全局设置</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className={`text-sm font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>启用DOM配置</label>
          <input
            type="checkbox"
            checked={domConfig.globalSettings.enabled}
            onChange={e => {
              domConfigStorage.updateGlobalSettings({ enabled: e.target.checked });
            }}
            className="rounded"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className={`text-sm font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>启用动画效果</label>
          <input
            type="checkbox"
            checked={domConfig.globalSettings.animationsEnabled}
            onChange={e => {
              domConfigStorage.updateGlobalSettings({ animationsEnabled: e.target.checked });
            }}
            className="rounded"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className={`text-sm font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>调试模式</label>
          <input
            type="checkbox"
            checked={domConfig.globalSettings.debugMode}
            onChange={e => {
              domConfigStorage.updateGlobalSettings({ debugMode: e.target.checked });
            }}
            className="rounded"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            默认操作类型
          </label>
          <select
            value={domConfig.globalSettings.defaultAction}
            onChange={e => {
              domConfigStorage.updateGlobalSettings({ defaultAction: e.target.value as DOMActionType });
            }}
            className={`w-full p-2 border rounded-md ${
              isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-100'
            }`}>
            <option value="hide">隐藏 (Hide)</option>
            <option value="blur">模糊 (Blur)</option>
            <option value="fade">淡化 (Fade)</option>
            <option value="remove">移除 (Remove)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderPresetsTab = () => (
    <div className={`rounded-lg border ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'} p-6`}>
      <h2 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>预设模板</h2>

      <div className="space-y-3">
        {Object.entries(domConfig.presets).map(([name, preset]) => (
          <div key={name} className={`p-3 border rounded-lg ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{name}</h3>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  类型: {preset.type} | 启用: {preset.enabled ? '是' : '否'}
                </p>
              </div>
              <button
                onClick={() => domConfigStorage.removePreset(name)}
                className="text-red-600 hover:text-red-700 text-sm">
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  switch (activeTab) {
    case 'sites':
      return renderSitesTab();
    case 'global':
      return renderGlobalTab();
    case 'presets':
      return renderPresetsTab();
    default:
      return null;
  }
};

// Site Details Component
interface SiteDetailsProps {
  site: SiteDOMConfig;
  isLight: boolean;
  onUpdate: (updates: Partial<SiteDOMConfig>) => void;
  onAddAction: () => void;
}

const SiteDetails: React.FC<SiteDetailsProps> = ({ site, isLight, onUpdate, onAddAction }) => (
  <div className={`rounded-lg border ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'} p-4`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{site.name} 配置</h3>
      <div className="flex items-center space-x-2">
        <label className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>启用:</label>
        <input
          type="checkbox"
          checked={site.enabled}
          onChange={e => onUpdate({ enabled: e.target.checked })}
          className="rounded"
        />
      </div>
    </div>

    {/* Actions List */}
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className={`font-medium ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>DOM 操作</h4>
        <button onClick={onAddAction} className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
          添加操作
        </button>
      </div>

      <div className="space-y-2">
        {site.actions.map((action, index) => (
          <div key={index} className={`p-2 border rounded ${isLight ? 'border-gray-200' : 'border-gray-600'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`font-mono text-sm ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                  {action.selector}
                </span>
                <span
                  className={`ml-2 text-xs px-2 py-1 rounded ${
                    action.enabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {action.type}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={action.enabled}
                  onChange={e => {
                    domConfigStorage.toggleAction(site.domain, action.selector, e.target.checked);
                  }}
                  className="rounded"
                />
                <button
                  onClick={() => {
                    domConfigStorage.removeAction(site.domain, action.selector);
                  }}
                  className="text-red-600 hover:text-red-700 text-xs">
                  删除
                </button>
              </div>
            </div>
            {action.description && (
              <p className={`text-xs mt-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{action.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Add Site Modal Component
interface AddSiteModalProps {
  isLight: boolean;
  onClose: () => void;
  onAdd: (site: SiteDOMConfig) => void;
}

const AddSiteModal: React.FC<AddSiteModalProps> = ({ isLight, onClose, onAdd }) => {
  const [domain, setDomain] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (domain && name) {
      onAdd({
        domain,
        name,
        enabled: true,
        actions: [],
        reminder: {
          message: `已为您优化 ${name} 的浏览体验`,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          enabled: true,
        },
        advanced: {
          observeChanges: true,
          applyDelay: 300,
          retryCount: 3,
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-lg max-w-md w-full mx-4 ${isLight ? 'bg-white' : 'bg-gray-800'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>添加新网站</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              域名
            </label>
            <input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="example.com"
              className={`w-full p-2 border rounded-md ${
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              网站名称
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="网站名称"
              className={`w-full p-2 border rounded-md ${
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100'
              }`}
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
              添加
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 rounded-md border ${
                isLight
                  ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}>
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Action Modal Component
interface AddActionModalProps {
  isLight: boolean;
  domain: string;
  onClose: () => void;
  onAdd: (action: DOMActionConfig) => void;
}

const AddActionModal: React.FC<AddActionModalProps> = ({ isLight, domain, onClose, onAdd }) => {
  const [selector, setSelector] = useState('');
  const [type, setType] = useState<DOMActionType>('hide' as DOMActionType);
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selector) {
      onAdd({
        type,
        selector,
        description,
        enabled: true,
        animation: {
          duration: 300,
          easing: 'ease-in-out',
        },
        params: {
          blurLevel: 5,
          opacity: 0.3,
          scale: 0.1,
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-lg max-w-md w-full mx-4 ${isLight ? 'bg-white' : 'bg-gray-800'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>添加 DOM 操作</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              CSS 选择器
            </label>
            <input
              type="text"
              value={selector}
              onChange={e => setSelector(e.target.value)}
              placeholder=".class-name, #id, div[data-attr]"
              className={`w-full p-2 border rounded-md font-mono text-sm ${
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              操作类型
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as DOMActionType)}
              className={`w-full p-2 border rounded-md ${
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100'
              }`}>
              <option value="hide">隐藏 (Hide)</option>
              <option value="blur">模糊 (Blur)</option>
              <option value="fade">淡化 (Fade)</option>
              <option value="slide_out">滑出 (Slide Out)</option>
              <option value="scale_down">缩小 (Scale Down)</option>
              <option value="grayscale">灰度 (Grayscale)</option>
              <option value="overlay">遮罩 (Overlay)</option>
              <option value="remove">移除 (Remove)</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              描述 (可选)
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="操作描述"
              className={`w-full p-2 border rounded-md ${
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100'
              }`}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700">
              添加
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 rounded-md border ${
                isLight
                  ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}>
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
