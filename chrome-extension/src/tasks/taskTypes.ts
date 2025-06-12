/**
 * Task Type Definitions and Interfaces
 * Defines the structure and types for MCP task system
 */

// Import types from storage for use in interfaces
import type {
  MCPTaskType,
  ResearchStrategy,
  TaskConfig,
  TaskResult,
  SearchResult,
  SearchSiteConfig,
} from '@extension/storage';

// Re-export types from storage for convenience
export type {
  MCPTaskType,
  ResearchStrategy,
  TaskConfig,
  TaskResult,
  SearchResult,
  SearchSiteConfig,
} from '@extension/storage';

// Task execution context
export interface TaskExecutionContext {
  taskId: string;
  query: string;
  userMessage: string;
  conversationHistory?: string[];
  website?: string;
  focusMode?: boolean;
  timestamp: number;
}

// Task execution options
export interface TaskExecutionOptions {
  maxResults?: number;
  timeout?: number;
  strategy?: string;
  autoExecute?: boolean;
  saveResults?: boolean;
  priority?: TaskPriority;
}

// Task priority levels
export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Task status during execution
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

// Task execution state
export interface TaskExecutionState {
  id: string;
  taskId: string;
  status: TaskStatus;
  progress: number; // 0-100
  startTime: number;
  endTime?: number;
  currentSite?: string;
  message?: string;
  error?: string;
}

// Task handler interface
export interface TaskHandler {
  readonly taskType: string;
  readonly name: string;
  readonly description: string;

  // Validate if this handler can process the given context
  canHandle(context: TaskExecutionContext): boolean;

  // Execute the task
  execute(context: TaskExecutionContext, options?: TaskExecutionOptions): Promise<TaskResult>;

  // Cancel the task if running
  cancel?(executionId: string): Promise<void>;

  // Get task configuration
  getConfig?(): TaskConfig;

  // Validate task configuration
  validateConfig?(config: Partial<TaskConfig>): boolean;
}

// Task registry interface
export interface TaskRegistry {
  // Register a task handler
  register(handler: TaskHandler): void;

  // Unregister a task handler
  unregister(taskType: string): void;

  // Get handler for task type
  getHandler(taskType: string): TaskHandler | undefined;

  // Get all registered handlers
  getAllHandlers(): TaskHandler[];

  // Find suitable handler for context
  findHandler(context: TaskExecutionContext): TaskHandler | undefined;
}

// Task manager interface
export interface TaskManager {
  // Initialize the task manager
  initialize(): Promise<void>;

  // Execute a task
  executeTask(context: TaskExecutionContext, options?: TaskExecutionOptions): Promise<TaskResult>;

  // Get task execution state
  getTaskState(executionId: string): TaskExecutionState | undefined;

  // Cancel a running task
  cancelTask(executionId: string): Promise<void>;

  // Cancel all running tasks
  cancelAllTasks(): Promise<void>;

  // Get running tasks
  getRunningTasks(): TaskExecutionState[];

  // Get task history
  getTaskHistory(limit?: number): Promise<TaskResult[]>;
}

// Task event types
export enum TaskEventType {
  TASK_STARTED = 'task_started',
  TASK_PROGRESS = 'task_progress',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  TASK_CANCELLED = 'task_cancelled',
  SITE_SEARCH_STARTED = 'site_search_started',
  SITE_SEARCH_COMPLETED = 'site_search_completed',
  SITE_SEARCH_FAILED = 'site_search_failed',
}

// Task event data
export interface TaskEvent {
  type: TaskEventType;
  executionId: string;
  taskId: string;
  timestamp: number;
  data?: any;
}

// Task event listener
export type TaskEventListener = (event: TaskEvent) => void;

// Task event emitter interface
export interface TaskEventEmitter {
  // Add event listener
  on(eventType: TaskEventType, listener: TaskEventListener): void;

  // Remove event listener
  off(eventType: TaskEventType, listener: TaskEventListener): void;

  // Emit event
  emit(event: TaskEvent): void;

  // Remove all listeners
  removeAllListeners(): void;
}

// Research task specific types
export interface ResearchTaskContext extends TaskExecutionContext {
  researchType: 'academic' | 'technical' | 'general' | 'news';
  keywords: string[];
  excludeKeywords?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  language?: string;
}

// Web search task specific types
export interface WebSearchTaskContext extends TaskExecutionContext {
  searchType: 'code' | 'documentation' | 'tutorials' | 'general';
  fileTypes?: string[];
  domains?: string[];
  excludeDomains?: string[];
}

// Content analysis task specific types
export interface ContentAnalysisTaskContext extends TaskExecutionContext {
  analysisType: 'summary' | 'keywords' | 'sentiment' | 'topics';
  contentUrls: string[];
  outputFormat: 'text' | 'json' | 'markdown';
}

// Data collection task specific types
export interface DataCollectionTaskContext extends TaskExecutionContext {
  collectionType: 'structured' | 'unstructured' | 'mixed';
  dataFields: string[];
  outputFormat: 'csv' | 'json' | 'xlsx';
  maxPages?: number;
}

// Task configuration validation rules
export interface TaskConfigValidationRules {
  required: string[];
  optional: string[];
  constraints: {
    [field: string]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      min?: number;
      max?: number;
      pattern?: RegExp;
      enum?: any[];
    };
  };
}

// Task metrics for performance monitoring
export interface TaskMetrics {
  executionId: string;
  taskId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  sitesSearched: number;
  resultsFound: number;
  errorsEncountered: number;
  retryAttempts: number;
  memoryUsage?: number;
  networkRequests?: number;
}

// Task configuration template
export interface TaskConfigTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: Partial<TaskConfig>;
  validationRules: TaskConfigValidationRules;
  examples: {
    name: string;
    description: string;
    config: TaskConfig;
  }[];
}

// Export utility types
export type TaskId = string;
export type ExecutionId = string;
export type SiteName = string;

// Task result formatting options
export interface ResultFormattingOptions {
  format: 'text' | 'markdown' | 'html' | 'json';
  maxResults?: number;
  includeMetadata?: boolean;
  includeDescription?: boolean;
  includeSource?: boolean;
  groupBySource?: boolean;
  sortBy?: 'relevance' | 'date' | 'source' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// Task scheduling options
export interface TaskSchedulingOptions {
  delay?: number; // milliseconds
  retryDelay?: number; // milliseconds
  maxRetries?: number;
  backoffStrategy?: 'linear' | 'exponential' | 'fixed';
  priority?: TaskPriority;
}
