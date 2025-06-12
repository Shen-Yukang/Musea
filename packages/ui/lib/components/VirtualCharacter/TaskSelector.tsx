import type React from 'react';
import { useState, useEffect } from 'react';
import { useStorage } from '@extension/shared';
import { mcpConfigStorage } from '@extension/storage';
import type { MCPTaskType } from '@extension/storage';

type TaskSelectorProps = {
  isOpen: boolean;
  onClose: () => void;
  onTaskSelect: (taskId: string, query: string) => void;
  suggestedTask?: string;
  suggestedQuery?: string;
  isDark?: boolean;
};

export const TaskSelector: React.FC<TaskSelectorProps> = ({
  isOpen,
  onClose,
  onTaskSelect,
  suggestedTask,
  suggestedQuery = '',
  isDark = false,
}) => {
  const mcpConfig = useStorage(mcpConfigStorage);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(suggestedTask || '');
  const [query, setQuery] = useState<string>(suggestedQuery);
  const [maxResults, setMaxResults] = useState<number>(20);

  useEffect(() => {
    if (suggestedTask) {
      setSelectedTaskId(suggestedTask);
    }
    if (suggestedQuery) {
      setQuery(suggestedQuery);
    }
  }, [suggestedTask, suggestedQuery]);

  const availableTasks = mcpConfig.tasks.filter(task => task.enabled);
  const selectedTask = availableTasks.find(task => task.id === selectedTaskId);

  const handleExecute = () => {
    if (!selectedTaskId || !query.trim()) {
      return;
    }
    onTaskSelect(selectedTaskId, query.trim());
    onClose();
  };

  const getTaskIcon = (taskType: MCPTaskType): string => {
    switch (taskType) {
      case 'research':
        return '🔬';
      case 'web_search':
        return '🔍';
      case 'data_collection':
        return '📊';
      case 'content_analysis':
        return '📝';
      default:
        return '🤖';
    }
  };

  const getTaskTypeLabel = (taskType: MCPTaskType): string => {
    switch (taskType) {
      case 'research':
        return '学术研究';
      case 'web_search':
        return '网络搜索';
      case 'data_collection':
        return '数据收集';
      case 'content_analysis':
        return '内容分析';
      default:
        return '未知类型';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '480px',
        maxHeight: '600px',
        zIndex: 10002,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          backgroundColor: isDark ? '#374151' : '#f9fafb',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: isDark ? '#f9fafb' : '#111827',
              }}>
              🤖 选择研究任务
            </h3>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                color: isDark ? '#9ca3af' : '#6b7280',
              }}>
              选择一个任务类型来帮助您进行自动化研究
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#9ca3af' : '#6b7280',
              fontSize: '24px',
              padding: '4px',
              borderRadius: '6px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#f3f4f6';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}>
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        {/* Task Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: isDark ? '#f9fafb' : '#111827',
              marginBottom: '8px',
            }}>
            任务类型
          </label>
          <div style={{ display: 'grid', gap: '8px' }}>
            {availableTasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${selectedTaskId === task.id ? '#3b82f6' : isDark ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  backgroundColor:
                    selectedTaskId === task.id ? (isDark ? '#1e3a8a' : '#eff6ff') : isDark ? '#374151' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  if (selectedTaskId !== task.id) {
                    e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#f9fafb';
                  }
                }}
                onMouseLeave={e => {
                  if (selectedTaskId !== task.id) {
                    e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#ffffff';
                  }
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{getTaskIcon(task.type)}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: isDark ? '#f9fafb' : '#111827',
                        marginBottom: '2px',
                      }}>
                      {task.name}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: isDark ? '#9ca3af' : '#6b7280',
                      }}>
                      {getTaskTypeLabel(task.type)} • 最多 {task.maxResults} 个结果
                    </div>
                  </div>
                  {selectedTaskId === task.id && (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}>
                      ✓
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: isDark ? '#9ca3af' : '#6b7280',
                    marginTop: '8px',
                    lineHeight: '1.4',
                  }}>
                  {task.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Query Input */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: isDark ? '#f9fafb' : '#111827',
              marginBottom: '8px',
            }}>
            搜索关键词
          </label>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="输入您要搜索的关键词或问题..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
              borderRadius: '8px',
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#f9fafb' : '#111827',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#3b82f6';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = isDark ? '#4b5563' : '#d1d5db';
            }}
          />
        </div>

        {/* Advanced Options */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: isDark ? '#f9fafb' : '#111827',
              marginBottom: '8px',
            }}>
            最大结果数量
          </label>
          <input
            type="number"
            value={maxResults}
            onChange={e => setMaxResults(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
            min="1"
            max="100"
            style={{
              width: '100px',
              padding: '8px 12px',
              border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
              borderRadius: '6px',
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#f9fafb' : '#111827',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Task Info */}
        {selectedTask && (
          <div
            style={{
              padding: '12px',
              backgroundColor: isDark ? '#374151' : '#f3f4f6',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: isDark ? '#f9fafb' : '#111827',
                marginBottom: '4px',
              }}>
              任务详情
            </div>
            <div
              style={{
                fontSize: '11px',
                color: isDark ? '#9ca3af' : '#6b7280',
                lineHeight: '1.4',
              }}>
              搜索站点:{' '}
              {selectedTask.sites
                .filter(s => s.enabled)
                .map(s => s.name)
                .join(', ')}
              <br />
              超时时间: {selectedTask.timeout}秒 • 重试次数: {selectedTask.retryAttempts}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          backgroundColor: isDark ? '#374151' : '#f9fafb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
            borderRadius: '6px',
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            color: isDark ? '#f9fafb' : '#374151',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: '500',
          }}>
          取消
        </button>
        <button
          onClick={handleExecute}
          disabled={!selectedTaskId || !query.trim()}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: !selectedTaskId || !query.trim() ? (isDark ? '#4b5563' : '#e5e7eb') : '#3b82f6',
            color: !selectedTaskId || !query.trim() ? (isDark ? '#9ca3af' : '#9ca3af') : '#ffffff',
            fontSize: '14px',
            cursor: !selectedTaskId || !query.trim() ? 'not-allowed' : 'pointer',
            fontWeight: '500',
          }}>
          🚀 开始研究
        </button>
      </div>
    </div>
  );
};
