import React, { useState } from 'react';

interface SelectorHelperProps {
  isLight: boolean;
  onSelectorSelect: (selector: string) => void;
}

export const SelectorHelper: React.FC<SelectorHelperProps> = ({ isLight, onSelectorSelect }) => {
  const [isActive, setIsActive] = useState(false);
  const [foundSelectors, setFoundSelectors] = useState<string[]>([]);
  const [testSelector, setTestSelector] = useState('');
  const [testResults, setTestResults] = useState<{ count: number; preview: string[] }>({ count: 0, preview: [] });

  // 启动选择器检测
  const startSelectorDetection = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      setIsActive(true);

      // 注入选择器检测脚本
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // 创建选择器检测界面
          const overlay = document.createElement('div');
          overlay.id = 'selector-helper-overlay';
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 999999;
            cursor: crosshair;
          `;

          const tooltip = document.createElement('div');
          tooltip.id = 'selector-tooltip';
          tooltip.style.cssText = `
            position: fixed;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            z-index: 1000000;
            pointer-events: none;
            max-width: 300px;
            word-break: break-all;
          `;

          let currentElement: HTMLElement | null = null;

          // 鼠标移动事件
          const handleMouseMove = (e: MouseEvent) => {
            const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
            if (!element || element === overlay || element === tooltip) return;

            // 高亮当前元素
            if (currentElement) {
              currentElement.style.outline = '';
            }
            currentElement = element;
            element.style.outline = '2px solid #ff6b6b';

            // 生成选择器
            const selector = generateSelector(element);

            // 更新提示框
            tooltip.textContent = selector;
            tooltip.style.left = `${e.clientX + 10}px`;
            tooltip.style.top = `${e.clientY - 30}px`;
          };

          // 点击事件
          const handleClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
            if (!element || element === overlay || element === tooltip) return;

            const selector = generateSelector(element);

            // 发送选择器到扩展
            chrome.runtime.sendMessage({
              type: 'SELECTOR_SELECTED',
              selector: selector,
            });

            cleanup();
          };

          // 生成选择器
          function generateSelector(element: HTMLElement): string {
            // 优先使用ID
            if (element.id) {
              return `#${element.id}`;
            }

            // 使用类名
            if (element.className && typeof element.className === 'string') {
              const classes = element.className
                .trim()
                .split(/\s+/)
                .filter(cls => cls.length > 0);
              if (classes.length > 0) {
                return `.${classes.join('.')}`;
              }
            }

            // 使用标签名和属性
            let selector = element.tagName.toLowerCase();

            // 添加有用的属性
            const attrs = ['data-testid', 'data-id', 'role', 'aria-label'];
            for (const attr of attrs) {
              const value = element.getAttribute(attr);
              if (value) {
                selector += `[${attr}="${value}"]`;
                break;
              }
            }

            return selector;
          }

          // 清理函数
          function cleanup() {
            if (currentElement) {
              currentElement.style.outline = '';
            }
            overlay.remove();
            tooltip.remove();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
          }

          // 键盘事件（ESC退出）
          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              cleanup();
            }
          };

          // 添加事件监听器
          overlay.addEventListener('mousemove', handleMouseMove);
          overlay.addEventListener('click', handleClick);
          document.addEventListener('keydown', handleKeyDown);

          // 添加到页面
          document.body.appendChild(overlay);
          document.body.appendChild(tooltip);

          // 显示说明
          const instruction = document.createElement('div');
          instruction.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000001;
          `;
          instruction.textContent = '移动鼠标选择元素，点击确认，按ESC退出';
          document.body.appendChild(instruction);

          setTimeout(() => {
            if (instruction.parentNode) {
              instruction.remove();
            }
          }, 3000);
        },
      });
    } catch (error) {
      console.error('启动选择器检测失败:', error);
      setIsActive(false);
    }
  };

  // 测试选择器
  const testSelectorOnPage = async () => {
    if (!testSelector.trim()) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector: string) => {
          try {
            const elements = document.querySelectorAll(selector);
            const preview = Array.from(elements)
              .slice(0, 5)
              .map(el => {
                const tag = el.tagName.toLowerCase();
                const id = el.id ? `#${el.id}` : '';
                const classes =
                  el.className && typeof el.className === 'string'
                    ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
                    : '';
                return `<${tag}${id}${classes}>`;
              });

            return {
              count: elements.length,
              preview: preview,
            };
          } catch (error) {
            return {
              count: 0,
              preview: [`错误: ${error instanceof Error ? error.message : '未知错误'}`],
            };
          }
        },
        args: [testSelector],
      });

      if (results[0]?.result) {
        setTestResults(results[0].result);
      }
    } catch (error) {
      console.error('测试选择器失败:', error);
      setTestResults({
        count: 0,
        preview: [`错误: ${error instanceof Error ? error.message : '未知错误'}`],
      });
    }
  };

  // 监听来自内容脚本的消息
  React.useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'SELECTOR_SELECTED') {
        setIsActive(false);
        onSelectorSelect(message.selector);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [onSelectorSelect]);

  // 常用选择器建议
  const commonSelectors = [
    { label: '广告元素', selectors: ['.ad', '.ads', '.advertisement', '[data-ad]', '.banner'] },
    { label: '导航栏', selectors: ['nav', '.nav', '.navbar', '.navigation', '#nav'] },
    { label: '侧边栏', selectors: ['.sidebar', '.side-bar', '.aside', 'aside'] },
    { label: '弹窗', selectors: ['.modal', '.popup', '.dialog', '.overlay'] },
    { label: '推荐内容', selectors: ['.recommend', '.suggestion', '.related', '.trending'] },
  ];

  return (
    <div className={`rounded-lg border ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'} p-4`}>
      <h3 className={`text-lg font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>选择器助手</h3>

      {/* 可视化选择器 */}
      <div className="mb-6">
        <h4 className={`font-medium mb-2 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>可视化选择</h4>
        <button
          onClick={startSelectorDetection}
          disabled={isActive}
          className={`w-full p-3 rounded-md border-2 border-dashed transition-colors ${
            isActive
              ? 'border-blue-300 bg-blue-50 text-blue-600 cursor-not-allowed'
              : isLight
                ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                : 'border-gray-600 hover:border-blue-500 hover:bg-blue-900/20'
          }`}>
          {isActive ? '请在页面上选择元素...' : '🎯 点击开始选择页面元素'}
        </button>
        <p className={`text-xs mt-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
          点击后切换到目标网页，移动鼠标选择要操作的元素
        </p>
      </div>

      {/* 选择器测试 */}
      <div className="mb-6">
        <h4 className={`font-medium mb-2 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>选择器测试</h4>
        <div className="flex space-x-2">
          <input
            type="text"
            value={testSelector}
            onChange={e => setTestSelector(e.target.value)}
            placeholder="输入CSS选择器进行测试"
            className={`flex-1 p-2 border rounded-md font-mono text-sm ${
              isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-gray-100'
            }`}
          />
          <button
            onClick={testSelectorOnPage}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            测试
          </button>
        </div>

        {testResults.count > 0 && (
          <div
            className={`mt-2 p-2 rounded border ${
              isLight ? 'border-green-200 bg-green-50' : 'border-green-800 bg-green-900/20'
            }`}>
            <p className={`text-sm font-medium ${isLight ? 'text-green-800' : 'text-green-300'}`}>
              找到 {testResults.count} 个元素
            </p>
            <div className={`text-xs mt-1 ${isLight ? 'text-green-700' : 'text-green-400'}`}>
              {testResults.preview.map((item, index) => (
                <div key={index} className="font-mono">
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {testResults.count === 0 && testResults.preview.length > 0 && (
          <div
            className={`mt-2 p-2 rounded border ${
              isLight ? 'border-red-200 bg-red-50' : 'border-red-800 bg-red-900/20'
            }`}>
            <p className={`text-sm ${isLight ? 'text-red-800' : 'text-red-300'}`}>{testResults.preview[0]}</p>
          </div>
        )}
      </div>

      {/* 常用选择器 */}
      <div>
        <h4 className={`font-medium mb-2 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>常用选择器</h4>
        <div className="space-y-3">
          {commonSelectors.map((category, index) => (
            <div key={index}>
              <p className={`text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                {category.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {category.selectors.map((selector, sIndex) => (
                  <button
                    key={sIndex}
                    onClick={() => onSelectorSelect(selector)}
                    className={`px-2 py-1 text-xs rounded border font-mono transition-colors ${
                      isLight
                        ? 'border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-300'
                        : 'border-gray-600 bg-gray-700 hover:bg-blue-900/20 hover:border-blue-500'
                    }`}>
                    {selector}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
