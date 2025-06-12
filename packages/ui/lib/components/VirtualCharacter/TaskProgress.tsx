import type React from 'react';
import { useState, useEffect } from 'react';

// Task execution state type (simplified for UI)
type TaskExecutionState = {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  progress: number;
  startTime: number;
  endTime?: number;
  currentSite?: string;
  message?: string;
  error?: string;
};

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

type TaskProgressProps = {
  isOpen: boolean;
  onClose: () => void;
  onCancel?: (executionId: string) => void;
  taskState?: TaskExecutionState;
  isDark?: boolean;
};

export const TaskProgress: React.FC<TaskProgressProps> = ({ isOpen, onClose, onCancel, taskState, isDark = false }) => {
  const [dots, setDots] = useState('');

  // Animate loading dots
  useEffect(() => {
    if (taskState?.status === 'running' || taskState?.status === 'pending') {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
      }, 500);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [taskState?.status]);

  const getStatusIcon = (status: TaskStatus): string => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'running':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '⏹️';
      case 'timeout':
        return '⏰';
      default:
        return '❓';
    }
  };

  const getStatusLabel = (status: TaskStatus): string => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'running':
        return '执行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '执行失败';
      case 'cancelled':
        return '已取消';
      case 'timeout':
        return '执行超时';
      default:
        return '未知状态';
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'running':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'cancelled':
        return '#6b7280';
      case 'timeout':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const formatDuration = (startTime: number, endTime?: number): string => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    }
    return `${seconds}秒`;
  };

  const canCancel = taskState?.status === 'running' || taskState?.status === 'pending';

  if (!isOpen || !taskState) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        zIndex: 10003,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          backgroundColor: isDark ? '#374151' : '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{getStatusIcon(taskState.status)}</span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: isDark ? '#f9fafb' : '#111827',
            }}>
            任务执行状态
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isDark ? '#9ca3af' : '#6b7280',
            fontSize: '20px',
            padding: '4px',
            borderRadius: '4px',
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

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* Status */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(taskState.status),
              }}
            />
            <span
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: isDark ? '#f9fafb' : '#111827',
              }}>
              {getStatusLabel(taskState.status)}
              {(taskState.status === 'running' || taskState.status === 'pending') && dots}
            </span>
          </div>

          {taskState.message && (
            <div
              style={{
                fontSize: '13px',
                color: isDark ? '#9ca3af' : '#6b7280',
                marginLeft: '16px',
              }}>
              {taskState.message}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {(taskState.status === 'running' || taskState.status === 'pending') && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: isDark ? '#f9fafb' : '#111827',
                }}>
                进度
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: isDark ? '#9ca3af' : '#6b7280',
                }}>
                {taskState.progress}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
              <div
                style={{
                  width: `${taskState.progress}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Task Details */}
        <div
          style={{
            padding: '12px',
            backgroundColor: isDark ? '#374151' : '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '500',
              color: isDark ? '#f9fafb' : '#111827',
              marginBottom: '6px',
            }}>
            任务信息
          </div>
          <div
            style={{
              fontSize: '11px',
              color: isDark ? '#9ca3af' : '#6b7280',
              lineHeight: '1.4',
            }}>
            <div>任务ID: {taskState.taskId}</div>
            <div>执行ID: {taskState.id}</div>
            <div>开始时间: {new Date(taskState.startTime).toLocaleTimeString()}</div>
            <div>持续时间: {formatDuration(taskState.startTime, taskState.endTime)}</div>
            {taskState.currentSite && <div>当前搜索: {taskState.currentSite}</div>}
          </div>
        </div>

        {/* Error Message */}
        {taskState.error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: isDark ? '#7f1d1d' : '#fef2f2',
              border: `1px solid ${isDark ? '#dc2626' : '#fecaca'}`,
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: isDark ? '#fca5a5' : '#dc2626',
                marginBottom: '4px',
              }}>
              错误信息
            </div>
            <div
              style={{
                fontSize: '11px',
                color: isDark ? '#fca5a5' : '#dc2626',
                lineHeight: '1.4',
              }}>
              {taskState.error}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {canCancel && onCancel && (
            <button
              onClick={() => onCancel(taskState.id)}
              style={{
                padding: '8px 16px',
                border: `1px solid ${isDark ? '#dc2626' : '#fecaca'}`,
                borderRadius: '6px',
                backgroundColor: isDark ? '#7f1d1d' : '#fef2f2',
                color: isDark ? '#fca5a5' : '#dc2626',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = isDark ? '#991b1b' : '#fee2e2';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = isDark ? '#7f1d1d' : '#fef2f2';
              }}>
              取消任务
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}>
            {taskState.status === 'completed' || taskState.status === 'failed' || taskState.status === 'cancelled'
              ? '关闭'
              : '后台运行'}
          </button>
        </div>
      </div>
    </div>
  );
};
