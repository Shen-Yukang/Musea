import { MCPService } from '../services/mcpService.js';
import { mcpConfigStorage } from '@extension/storage';
import { TaskStatus, TaskEventType } from './taskTypes.js';
import type {
  TaskManager,
  TaskExecutionContext,
  TaskExecutionOptions,
  TaskExecutionState,
  TaskEvent,
  TaskEventListener,
  TaskEventEmitter,
  TaskResult,
  ExecutionId,
} from './taskTypes.js';

/**
 * Task Manager Implementation
 * Manages task execution, state tracking, and event handling
 */
export class TaskManagerImpl implements TaskManager, TaskEventEmitter {
  private static instance: TaskManagerImpl;
  private mcpService: MCPService;
  private runningTasks = new Map<ExecutionId, TaskExecutionState>();
  private eventListeners = new Map<TaskEventType, TaskEventListener[]>();
  private isInitialized = false;

  private constructor() {
    this.mcpService = MCPService.getInstance();
  }

  static getInstance(): TaskManagerImpl {
    if (!TaskManagerImpl.instance) {
      TaskManagerImpl.instance = new TaskManagerImpl();
    }
    return TaskManagerImpl.instance;
  }

  /**
   * Initialize the task manager
   */
  async initialize(): Promise<void> {
    try {
      await this.mcpService.initialize();
      this.isInitialized = true;
      console.log('Task Manager initialized');
    } catch (error) {
      console.error('Error initializing Task Manager:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Execute a task
   */
  async executeTask(context: TaskExecutionContext, options?: TaskExecutionOptions): Promise<TaskResult> {
    if (!this.isInitialized) {
      throw new Error('Task Manager not initialized');
    }

    if (!this.mcpService.isEnabled()) {
      throw new Error('MCP service is not enabled');
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    // Create execution state
    const executionState: TaskExecutionState = {
      id: executionId,
      taskId: context.taskId,
      status: TaskStatus.PENDING,
      progress: 0,
      startTime,
      message: 'Initializing task...',
    };

    this.runningTasks.set(executionId, executionState);

    // Emit task started event
    this.emit({
      type: TaskEventType.TASK_STARTED,
      executionId,
      taskId: context.taskId,
      timestamp: startTime,
      data: { context, options },
    });

    try {
      // Update state to running
      this.updateTaskState(executionId, {
        status: TaskStatus.RUNNING,
        progress: 10,
        message: 'Starting task execution...',
      });

      // Check concurrent task limits
      const config = await mcpConfigStorage.get();
      const runningCount = Array.from(this.runningTasks.values()).filter(
        state => state.status === TaskStatus.RUNNING,
      ).length;

      if (runningCount > config.maxConcurrentTasks) {
        throw new Error(`Maximum concurrent tasks limit reached (${config.maxConcurrentTasks})`);
      }

      // Execute the task using MCP service
      const result = await this.executeWithProgress(executionId, context, options);

      // Update state to completed
      this.updateTaskState(executionId, {
        status: TaskStatus.COMPLETED,
        progress: 100,
        endTime: Date.now(),
        message: `Task completed successfully. Found ${result.results.length} results.`,
      });

      // Emit task completed event
      this.emit({
        type: TaskEventType.TASK_COMPLETED,
        executionId,
        taskId: context.taskId,
        timestamp: Date.now(),
        data: { result },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update state to failed
      this.updateTaskState(executionId, {
        status: TaskStatus.FAILED,
        endTime: Date.now(),
        error: errorMessage,
        message: `Task failed: ${errorMessage}`,
      });

      // Emit task failed event
      this.emit({
        type: TaskEventType.TASK_FAILED,
        executionId,
        taskId: context.taskId,
        timestamp: Date.now(),
        data: { error: errorMessage },
      });

      throw error;
    } finally {
      // Clean up completed/failed tasks after a delay
      setTimeout(() => {
        this.runningTasks.delete(executionId);
      }, 30000); // Keep for 30 seconds for UI updates
    }
  }

  /**
   * Execute task with progress updates
   */
  private async executeWithProgress(
    executionId: ExecutionId,
    context: TaskExecutionContext,
    options?: TaskExecutionOptions,
  ): Promise<TaskResult> {
    // Update progress: preparing
    this.updateTaskState(executionId, {
      progress: 20,
      message: 'Preparing search parameters...',
    });

    // Simulate progress updates during execution
    const progressInterval = setInterval(() => {
      const state = this.runningTasks.get(executionId);
      if (state && state.status === TaskStatus.RUNNING && state.progress < 90) {
        this.updateTaskState(executionId, {
          progress: Math.min(state.progress + 10, 90),
          message: 'Searching for results...',
        });

        // Emit progress event
        this.emit({
          type: TaskEventType.TASK_PROGRESS,
          executionId,
          taskId: context.taskId,
          timestamp: Date.now(),
          data: { progress: state.progress },
        });
      }
    }, 2000);

    try {
      // Execute the actual task
      const result = await this.mcpService.executeTask(context.taskId, context.query, {
        maxResults: options?.maxResults,
        timeout: options?.timeout,
        strategy: options?.strategy as any,
      });

      clearInterval(progressInterval);
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  /**
   * Update task execution state
   */
  private updateTaskState(executionId: ExecutionId, updates: Partial<TaskExecutionState>): void {
    const currentState = this.runningTasks.get(executionId);
    if (currentState) {
      const updatedState = { ...currentState, ...updates };
      this.runningTasks.set(executionId, updatedState);
    }
  }

  /**
   * Get task execution state
   */
  getTaskState(executionId: ExecutionId): TaskExecutionState | undefined {
    return this.runningTasks.get(executionId);
  }

  /**
   * Cancel a running task
   */
  async cancelTask(executionId: ExecutionId): Promise<void> {
    const state = this.runningTasks.get(executionId);
    if (!state) {
      throw new Error(`Task not found: ${executionId}`);
    }

    if (state.status !== TaskStatus.RUNNING && state.status !== TaskStatus.PENDING) {
      throw new Error(`Task cannot be cancelled in current state: ${state.status}`);
    }

    try {
      // Cancel the task in MCP service
      await this.mcpService.cancelTask(executionId);

      // Update state
      this.updateTaskState(executionId, {
        status: TaskStatus.CANCELLED,
        endTime: Date.now(),
        message: 'Task cancelled by user',
      });

      // Emit cancelled event
      this.emit({
        type: TaskEventType.TASK_CANCELLED,
        executionId,
        taskId: state.taskId,
        timestamp: Date.now(),
        data: {},
      });

      console.log(`Task cancelled: ${executionId}`);
    } catch (error) {
      console.error(`Error cancelling task ${executionId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel all running tasks
   */
  async cancelAllTasks(): Promise<void> {
    const runningTaskIds = Array.from(this.runningTasks.keys()).filter(id => {
      const state = this.runningTasks.get(id);
      return state && (state.status === TaskStatus.RUNNING || state.status === TaskStatus.PENDING);
    });

    const cancelPromises = runningTaskIds.map(id =>
      this.cancelTask(id).catch(error => console.error(`Error cancelling task ${id}:`, error)),
    );

    await Promise.all(cancelPromises);
    console.log(`Cancelled ${runningTaskIds.length} running tasks`);
  }

  /**
   * Get running tasks
   */
  getRunningTasks(): TaskExecutionState[] {
    return Array.from(this.runningTasks.values()).filter(
      state => state.status === TaskStatus.RUNNING || state.status === TaskStatus.PENDING,
    );
  }

  /**
   * Get task history
   */
  async getTaskHistory(limit = 10): Promise<TaskResult[]> {
    return await this.mcpService.getTaskHistory(limit);
  }

  // Event emitter implementation
  on(eventType: TaskEventType, listener: TaskEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  off(eventType: TaskEventType, listener: TaskEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: TaskEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in task event listener:', error);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.eventListeners.clear();
  }

  /**
   * Get task statistics
   */
  getTaskStatistics(): {
    running: number;
    pending: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const states = Array.from(this.runningTasks.values());

    return {
      running: states.filter(s => s.status === TaskStatus.RUNNING).length,
      pending: states.filter(s => s.status === TaskStatus.PENDING).length,
      completed: states.filter(s => s.status === TaskStatus.COMPLETED).length,
      failed: states.filter(s => s.status === TaskStatus.FAILED).length,
      cancelled: states.filter(s => s.status === TaskStatus.CANCELLED).length,
    };
  }

  /**
   * Check if task manager is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.mcpService.isEnabled();
  }
}
