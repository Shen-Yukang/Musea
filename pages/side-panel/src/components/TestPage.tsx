import React, { useState } from 'react';
import { domConfigStorage } from '@extension/storage';

interface TestPageProps {
  isLight: boolean;
}

export const TestPage: React.FC<TestPageProps> = ({ isLight }) => {
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testDOMConfig = async () => {
    if (!testUrl) {
      setTestResult('请输入测试URL');
      return;
    }

    setIsLoading(true);
    setTestResult('');

    try {
      // 获取所有相关配置
      const domConfig = await domConfigStorage.get();
      const { focusStorage, blockedUrlsStorage } = await import('@extension/storage');
      const focusConfig = await focusStorage.get();
      const blockedConfig = await blockedUrlsStorage.get();

      // 解析URL获取域名
      const url = new URL(testUrl.startsWith('http') ? testUrl : `https://${testUrl}`);
      const domain = url.hostname;
      const domainWithoutWww = domain.replace('www.', '');

      // 检查各种状态
      const globalEnabled = domConfig.globalSettings.enabled;
      const focusActive = focusConfig.isActive;

      // 详细检查学习模式匹配
      const studyModeMatches = blockedConfig.studyModeUrls.map(studyUrl => {
        let cleanStudyUrl = studyUrl.trim();

        // 如果包含协议，提取域名
        if (cleanStudyUrl.startsWith('http://') || cleanStudyUrl.startsWith('https://')) {
          try {
            cleanStudyUrl = new URL(cleanStudyUrl).hostname;
          } catch {
            cleanStudyUrl = cleanStudyUrl.replace(/^https?:\/\//, '').split('/')[0];
          }
        }

        // 各种匹配方式
        const exactMatch = domain === cleanStudyUrl;
        const subdomainMatch = domain.endsWith('.' + cleanStudyUrl);
        const parentDomainMatch = cleanStudyUrl.endsWith('.' + domain);
        const wwwMatch = domainWithoutWww === cleanStudyUrl.replace('www.', '');

        const matches = exactMatch || subdomainMatch || parentDomainMatch || wwwMatch;

        return {
          studyUrl,
          cleanStudyUrl,
          exactMatch,
          subdomainMatch,
          parentDomainMatch,
          wwwMatch,
          matches,
        };
      });

      const inStudyMode = studyModeMatches.some(m => m.matches);

      // 查找匹配的网站配置
      const siteConfig = domConfig.sites.find(
        site =>
          domain === site.domain ||
          domain.endsWith('.' + site.domain) ||
          domainWithoutWww === site.domain ||
          site.domain === domainWithoutWww,
      );

      let result = `🔍 DOM配置系统详细诊断\n\n`;
      result += `URL: ${testUrl}\n`;
      result += `域名: ${domain}\n`;
      result += `域名(无www): ${domainWithoutWww}\n\n`;

      result += `📊 系统状态:\n`;
      result += `- DOM配置全局启用: ${globalEnabled ? '✅ 是' : '❌ 否'}\n`;
      result += `- 专注模式激活: ${focusActive ? '✅ 是' : '❌ 否'}\n`;
      result += `- 在学习模式列表: ${inStudyMode ? '✅ 是' : '❌ 否'}\n\n`;

      // 详细的学习模式匹配信息
      result += `🔍 学习模式URL匹配详情:\n`;
      result += `学习模式列表: [${blockedConfig.studyModeUrls.join(', ')}]\n\n`;

      if (studyModeMatches.length > 0) {
        studyModeMatches.forEach((match, index) => {
          result += `${index + 1}. ${match.studyUrl} -> ${match.cleanStudyUrl}\n`;
          result += `   精确匹配: ${match.exactMatch ? '✅' : '❌'}\n`;
          result += `   子域名匹配: ${match.subdomainMatch ? '✅' : '❌'}\n`;
          result += `   父域名匹配: ${match.parentDomainMatch ? '✅' : '❌'}\n`;
          result += `   www匹配: ${match.wwwMatch ? '✅' : '❌'}\n`;
          result += `   最终结果: ${match.matches ? '✅ 匹配' : '❌ 不匹配'}\n\n`;
        });
      } else {
        result += `❌ 学习模式列表为空\n\n`;
      }

      if (siteConfig) {
        const enabledActions = siteConfig.actions.filter(action => action.enabled);
        result += `🎯 找到DOM配置:\n`;
        result += `- 网站名称: ${siteConfig.name}\n`;
        result += `- 配置域名: ${siteConfig.domain}\n`;
        result += `- 配置启用: ${siteConfig.enabled ? '✅ 是' : '❌ 否'}\n`;
        result += `- 操作数量: ${enabledActions.length}\n\n`;

        if (enabledActions.length > 0) {
          result += `📝 操作详情:\n`;
          enabledActions.forEach(action => {
            result += `- ${action.type}: ${action.selector}`;
            if (action.description) result += ` (${action.description})`;
            result += '\n';
          });
          result += '\n';
        }

        if (siteConfig.reminder?.enabled) {
          result += `💬 提醒消息: ${siteConfig.reminder.message}\n\n`;
        }
      } else {
        result += `❌ 未找到DOM配置\n\n`;
      }

      // 给出建议
      result += `💡 问题诊断和建议:\n`;
      if (!globalEnabled) {
        result += `❌ DOM配置全局未启用 - 请在"全局设置"中启用\n`;
      }
      if (!focusActive) {
        result += `❌ 专注模式未激活 - 请启动专注模式\n`;
      }
      if (!inStudyMode) {
        result += `❌ 不在学习模式列表 - 请添加 ${domain} 到学习模式\n`;
      }
      if (!siteConfig) {
        result += `❌ 无DOM配置 - 请为 ${domain} 创建DOM配置\n`;
      }
      if (siteConfig && !siteConfig.enabled) {
        result += `❌ DOM配置已禁用 - 请启用 ${siteConfig.name} 的配置\n`;
      }

      if (globalEnabled && focusActive && inStudyMode && siteConfig && siteConfig.enabled) {
        result += `✅ 所有条件满足，应该能看到DOM引擎日志\n`;
        result += `\n🔧 如果仍然没有日志，请检查:\n`;
        result += `- 浏览器控制台是否有错误\n`;
        result += `- 扩展是否正确加载\n`;
        result += `- 页面是否完全加载\n`;
      }

      setTestResult(result);
    } catch (error) {
      setTestResult(`错误: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url) {
        setTestUrl(tab.url);
      }
    } catch (error) {
      console.error('获取当前标签页失败:', error);
    }
  };

  const exportConfig = async () => {
    try {
      const config = await domConfigStorage.exportConfig();
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'dom-config.json';
      a.click();

      URL.revokeObjectURL(url);
      setTestResult('配置已导出');
    } catch (error) {
      setTestResult(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const resetConfig = async () => {
    if (confirm('确定要重置所有配置吗？这将删除所有自定义设置。')) {
      try {
        await domConfigStorage.resetToDefaults();
        setTestResult('配置已重置为默认值');
      } catch (error) {
        setTestResult(`重置失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  };

  const quickFix = async () => {
    try {
      const { focusStorage, blockedUrlsStorage } = await import('@extension/storage');

      // 启用DOM配置全局设置
      await domConfigStorage.updateGlobalSettings({ enabled: true });

      // 启动专注模式（如果没有激活）
      const focusConfig = await focusStorage.get();
      if (!focusConfig.isActive) {
        await focusStorage.startFocus(25); // 启动25分钟专注
      }

      // 如果有测试URL，将其添加到学习模式
      if (testUrl) {
        const url = new URL(testUrl.startsWith('http') ? testUrl : `https://${testUrl}`);
        const domain = url.hostname.replace('www.', '');
        await blockedUrlsStorage.addStudyModeUrl(domain);
      }

      setTestResult('✅ 快速修复完成！\n- 已启用DOM配置\n- 已启动专注模式\n- 已添加到学习模式列表');
    } catch (error) {
      setTestResult(`快速修复失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <div className={`rounded-lg border ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'} p-6`}>
      <h2 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>测试与调试</h2>

      {/* URL测试 */}
      <div className="space-y-4 mb-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            测试URL
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={testUrl}
              onChange={e => setTestUrl(e.target.value)}
              placeholder="输入网站URL或域名"
              className={`flex-1 p-2 border rounded-md ${
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100'
              }`}
            />
            <button
              onClick={getCurrentTab}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm">
              当前页面
            </button>
            <button
              onClick={testDOMConfig}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? '测试中...' : '测试'}
            </button>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-md border ${
              testResult.includes('错误') || testResult.includes('失败')
                ? isLight
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-red-800 bg-red-900/20 text-red-300'
                : isLight
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-green-800 bg-green-900/20 text-green-300'
            }`}>
            <pre className="text-sm whitespace-pre-wrap font-mono">{testResult}</pre>
          </div>
        )}
      </div>

      {/* 配置管理 */}
      <div className="space-y-4">
        <h3 className={`font-medium ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>配置管理</h3>

        <div className="flex space-x-2">
          <button
            onClick={async () => {
              try {
                const { focusStorage, blockedUrlsStorage } = await import('@extension/storage');

                // 启用DOM配置全局设置
                await domConfigStorage.updateGlobalSettings({ enabled: true });

                // 启动专注模式（如果没有激活）
                const focusConfig = await focusStorage.get();
                if (!focusConfig.isActive) {
                  await focusStorage.startFocus(25); // 启动25分钟专注
                }

                // 确保预设网站在学习模式列表中
                const presetSites = ['bilibili.com', 'baidu.com', 'zhihu.com'];
                for (const site of presetSites) {
                  await blockedUrlsStorage.addStudyModeUrl(site);
                }

                setTestResult('✅ 快速修复完成！\n- 已启用DOM配置\n- 已启动专注模式\n- 已添加预设网站到学习模式');
              } catch (error) {
                setTestResult(`快速修复失败: ${error instanceof Error ? error.message : '未知错误'}`);
              }
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
            🚀 快速修复
          </button>

          <button onClick={exportConfig} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            导出配置
          </button>

          <button onClick={resetConfig} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            重置配置
          </button>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className={`font-medium mb-2 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>使用说明</h3>
        <div className={`text-sm space-y-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
          <p>
            • <strong>测试功能</strong>：输入URL检查是否有匹配的DOM配置
          </p>
          <p>
            • <strong>当前页面</strong>：自动填入当前浏览器标签页的URL
          </p>
          <p>
            • <strong>导出配置</strong>：将所有配置保存为JSON文件
          </p>
          <p>
            • <strong>重置配置</strong>：恢复到默认的预设配置
          </p>
        </div>
      </div>

      {/* 快速添加常用网站 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className={`font-medium mb-2 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>快速添加常用网站</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { domain: 'youtube.com', name: 'YouTube' },
            { domain: 'twitter.com', name: 'Twitter' },
            { domain: 'facebook.com', name: 'Facebook' },
            { domain: 'instagram.com', name: 'Instagram' },
            { domain: 'tiktok.com', name: 'TikTok' },
            { domain: 'reddit.com', name: 'Reddit' },
          ].map(site => (
            <button
              key={site.domain}
              onClick={async () => {
                const config = await domConfigStorage.get();
                const exists = config.sites.some(s => s.domain === site.domain);

                if (!exists) {
                  await domConfigStorage.addSite({
                    domain: site.domain,
                    name: site.name,
                    enabled: true,
                    actions: [
                      {
                        type: 'hide' as any,
                        selector: '.advertisement, .ads, [data-ad]',
                        description: '广告元素',
                        enabled: true,
                      },
                    ],
                    reminder: {
                      message: `已为您优化 ${site.name} 的浏览体验`,
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      enabled: true,
                    },
                    advanced: {
                      observeChanges: true,
                      applyDelay: 300,
                      retryCount: 3,
                    },
                  });
                  setTestResult(`已添加 ${site.name} 配置`);
                } else {
                  setTestResult(`${site.name} 配置已存在`);
                }
              }}
              className={`p-2 text-sm border rounded-md transition-colors ${
                isLight
                  ? 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  : 'border-gray-600 hover:border-blue-600 hover:bg-blue-900/20'
              }`}>
              {site.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
