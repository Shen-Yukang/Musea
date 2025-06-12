import { blockedUrlsStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type BlockedUrlsListProps = {
  className?: string;
};

export const BlockedUrlsList = ({ className }: BlockedUrlsListProps) => {
  const blockedUrlsData = useStorage(blockedUrlsStorage);
  // 确保数据结构完整
  const blockedUrls = {
    urls: blockedUrlsData.urls || [],
    studyModeUrls: blockedUrlsData.studyModeUrls || [],
    studyModeSelectors: blockedUrlsData.studyModeSelectors || {},
  };
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isStudyMode, setIsStudyMode] = useState(false);

  // 添加URL
  const handleAddUrl = () => {
    // 简单验证URL格式
    if (!newUrl.trim()) {
      setError('请输入URL');
      return;
    }

    // 尝试解析URL，确保格式正确
    try {
      setIsAdding(true);

      // 如果没有协议，添加https://
      let urlToAdd = newUrl;
      if (!urlToAdd.startsWith('http://') && !urlToAdd.startsWith('https://')) {
        urlToAdd = 'https://' + urlToAdd;
      }

      // 尝试创建URL对象验证格式
      new URL(urlToAdd);

      // 根据当前模式添加到存储
      const addPromise = isStudyMode
        ? blockedUrlsStorage.addStudyModeUrl(urlToAdd)
        : blockedUrlsStorage.addUrl(urlToAdd);

      addPromise.then(() => {
        setNewUrl('');
        setError('');
        setIsAdding(false);
      });
    } catch (e) {
      setError('无效的URL格式');
      setIsAdding(false);
    }
  };

  // 删除URL
  const handleRemoveUrl = (url: string) => {
    blockedUrlsStorage.removeUrl(url);
  };

  // 清空所有URL
  const handleClearAll = () => {
    if (confirm('确定要清空所有URL吗？')) {
      blockedUrlsStorage.clearUrls();
      // 清空学习模式URL
      blockedUrlsStorage.set(current => ({
        ...current,
        studyModeUrls: [],
        studyModeSelectors: {},
      }));
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-4 rounded-lg shadow-md transition-all duration-300 bg-gray-50 dark:bg-gray-800',
        className,
      )}>
      <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
        <span className="inline-block w-1.5 h-5 bg-purple-500 rounded-sm"></span>
        专注时禁用网站
      </h2>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-end mb-1">
          <span className="text-sm mr-2 text-gray-700 dark:text-gray-300">模式:</span>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-1">
            <button
              onClick={() => setIsStudyMode(false)}
              className={cn(
                'text-xs py-1 px-3 rounded-md transition-all',
                !isStudyMode
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-purple-700 dark:text-purple-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600',
              )}>
              完全禁用
            </button>
            <button
              onClick={() => setIsStudyMode(true)}
              className={cn(
                'text-xs py-1 px-3 rounded-md transition-all',
                isStudyMode
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-green-700 dark:text-green-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600',
              )}>
              学习模式
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder={isStudyMode ? '输入学习模式网站URL' : '输入要禁用的网站URL'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300"
              onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
            />
            {newUrl && (
              <button
                onClick={() => setNewUrl('')}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                ✕
              </button>
            )}
          </div>
          <button
            onClick={handleAddUrl}
            disabled={isAdding}
            className={cn(
              'py-2 px-4 rounded-md shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-white font-medium',
              isAdding && 'opacity-70 cursor-not-allowed',
            )}
            style={{
              background: isStudyMode
                ? 'linear-gradient(to right, #10b981, #059669)'
                : 'linear-gradient(to right, #8b5cf6, #7c3aed)',
            }}>
            {isAdding ? '添加中...' : '添加'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
        {blockedUrls.urls.length === 0 && blockedUrls.studyModeUrls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 715.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <p className="text-sm italic">暂无禁用网站</p>
          </div>
        ) : (
          <>
            {/* 完全禁用的URL */}
            {blockedUrls.urls.length > 0 && (
              <div className="mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <span className="inline-block w-1 h-4 bg-purple-500 rounded-sm mr-2"></span>
                  完全禁用
                </h3>
                {blockedUrls.urls.map((url, index) => (
                  <div
                    key={`blocked-${index}`}
                    className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group mb-1">
                    <span className="text-sm truncate flex-1 font-medium text-gray-900 dark:text-white">{url}</span>
                    <div className="flex items-center">
                      <button
                        onClick={() => blockedUrlsStorage.toggleUrlMode(url, true)}
                        title="切换到学习模式"
                        className="text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400 ml-2 opacity-100 text-xs">
                        学习
                      </button>
                      <button
                        onClick={() => handleRemoveUrl(url)}
                        title="移除"
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 ml-2 opacity-100">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 学习模式的URL */}
            {blockedUrls.studyModeUrls.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <span className="inline-block w-1 h-4 bg-green-500 rounded-sm mr-2"></span>
                  学习模式
                </h3>
                {blockedUrls.studyModeUrls.map((url, index) => (
                  <div
                    key={`study-${index}`}
                    className="flex justify-between items-center py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group mb-1">
                    <span className="text-sm truncate flex-1 font-medium text-gray-900 dark:text-white">{url}</span>
                    <div className="flex items-center">
                      <button
                        onClick={() => blockedUrlsStorage.toggleUrlMode(url, false)}
                        title="切换到完全禁用"
                        className="text-gray-400 dark:text-gray-500 hover:text-purple-500 dark:hover:text-purple-400 ml-2 opacity-100 text-xs">
                        禁用
                      </button>
                      <button
                        onClick={() => blockedUrlsStorage.removeStudyModeUrl(url)}
                        title="移除"
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 ml-2 opacity-100">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(blockedUrls.urls.length > 0 || blockedUrls.studyModeUrls.length > 0) && (
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 self-end mt-1 flex items-center gap-1 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                清空所有
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
