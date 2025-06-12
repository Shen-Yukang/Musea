import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// MCP Task Types
export enum MCPTaskType {
  RESEARCH = 'research',
  WEB_SEARCH = 'web_search',
  DATA_COLLECTION = 'data_collection',
  CONTENT_ANALYSIS = 'content_analysis',
}

// Research Strategy Types
export enum ResearchStrategy {
  ACADEMIC = 'academic',
  GENERAL = 'general',
  TECHNICAL = 'technical',
  NEWS = 'news',
}

// Search Site Configuration
export type SearchSiteConfig = {
  name: string;
  url: string;
  enabled: boolean;
  selectors: {
    searchInput?: string;
    searchButton?: string;
    resultItems?: string;
    resultTitle?: string;
    resultLink?: string;
    resultDescription?: string;
  };
  searchParams?: Record<string, string>;
};

// Task Configuration
export type TaskConfig = {
  id: string;
  type: MCPTaskType;
  name: string;
  description: string;
  enabled: boolean;
  maxResults: number;
  timeout: number; // in seconds
  retryAttempts: number;
  customPrompt?: string;
  sites: SearchSiteConfig[];
};

// MCP Configuration
export type MCPConfig = {
  enabled: boolean;
  defaultStrategy: ResearchStrategy;
  maxConcurrentTasks: number;
  taskTimeout: number; // in seconds
  autoExecute: boolean; // Auto-execute tasks when detected in conversation
  saveResults: boolean; // Save task results to history
  tasks: TaskConfig[];
  customSites: SearchSiteConfig[];
};

// Task Execution Result
export type TaskResult = {
  id: string;
  taskId: string;
  timestamp: number;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  query: string;
  results: SearchResult[];
  error?: string;
  duration: number; // in milliseconds
};

// Search Result
export type SearchResult = {
  title: string;
  url: string;
  description?: string;
  source: string; // site name
  timestamp: number;
  relevanceScore?: number;
};

// Task History
export type TaskHistory = {
  executions: TaskResult[];
  maxExecutions: number;
  totalExecutions: number;
};

// Default search sites configuration
const defaultSearchSites: SearchSiteConfig[] = [
  {
    name: 'ArXiv',
    url: 'https://arxiv.org/search/',
    enabled: true,
    selectors: {
      searchInput: 'input[name="query"]',
      searchButton: 'button[type="submit"]',
      resultItems: '.arxiv-result',
      resultTitle: '.list-title a',
      resultLink: '.list-title a',
      resultDescription: '.list-summary',
    },
    searchParams: {
      searchtype: 'all',
      order: '-announced_date_first',
    },
  },
  {
    name: 'GitHub',
    url: 'https://github.com/search',
    enabled: true,
    selectors: {
      searchInput: 'input[name="q"]',
      searchButton: 'button[type="submit"]',
      resultItems: '.search-result-item',
      resultTitle: '.search-result-item h3 a',
      resultLink: '.search-result-item h3 a',
      resultDescription: '.search-result-item p',
    },
    searchParams: {
      type: 'repositories',
      sort: 'stars',
      order: 'desc',
    },
  },
  {
    name: 'Google Scholar',
    url: 'https://scholar.google.com/scholar',
    enabled: false, // Disabled by default due to potential blocking
    selectors: {
      searchInput: 'input[name="q"]',
      searchButton: 'button[type="submit"]',
      resultItems: '.gs_r',
      resultTitle: '.gs_rt a',
      resultLink: '.gs_rt a',
      resultDescription: '.gs_rs',
    },
  },
];

// Default task configurations
const defaultTasks: TaskConfig[] = [
  {
    id: 'research_papers',
    type: MCPTaskType.RESEARCH,
    name: '学术论文研究',
    description: '搜索相关学术论文和研究资料',
    enabled: true,
    maxResults: 20,
    timeout: 30,
    retryAttempts: 2,
    sites: defaultSearchSites.filter(site => ['ArXiv', 'Google Scholar'].includes(site.name)),
  },
  {
    id: 'code_search',
    type: MCPTaskType.WEB_SEARCH,
    name: '代码搜索',
    description: '搜索相关代码库和技术资源',
    enabled: true,
    maxResults: 15,
    timeout: 25,
    retryAttempts: 2,
    sites: defaultSearchSites.filter(site => site.name === 'GitHub'),
  },
  {
    id: 'general_research',
    type: MCPTaskType.RESEARCH,
    name: '综合研究',
    description: '综合搜索多个来源的信息',
    enabled: true,
    maxResults: 30,
    timeout: 45,
    retryAttempts: 3,
    sites: defaultSearchSites,
  },
];

// Default MCP configuration
const defaultMCPConfig: MCPConfig = {
  enabled: true, // 👈 启用MCP服务
  defaultStrategy: ResearchStrategy.GENERAL,
  maxConcurrentTasks: 2,
  taskTimeout: 60,
  autoExecute: true, // 👈 启用自动执行
  saveResults: true,
  tasks: defaultTasks,
  customSites: [],
};

// Default task history
const defaultTaskHistory: TaskHistory = {
  executions: [],
  maxExecutions: 100,
  totalExecutions: 0,
};

// Create MCP configuration storage
const mcpConfigBaseStorage = createStorage<MCPConfig>('mcp-config-storage-key', defaultMCPConfig, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// Create task history storage
const mcpTaskHistoryBaseStorage = createStorage<TaskHistory>('mcp-task-history-storage-key', defaultTaskHistory, {
  storageEnum: StorageEnum.Local,
  liveUpdate: false,
});

// Extended MCP configuration storage
type MCPConfigStorage = BaseStorage<MCPConfig> & {
  enableMCP: (enabled: boolean) => Promise<void>;
  updateStrategy: (strategy: ResearchStrategy) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<TaskConfig>) => Promise<void>;
  addCustomSite: (site: SearchSiteConfig) => Promise<void>;
  removeCustomSite: (siteName: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
};

// Extended task history storage
type MCPTaskHistoryStorage = BaseStorage<TaskHistory> & {
  addExecution: (result: TaskResult) => Promise<void>;
  getRecentExecutions: (limit?: number) => Promise<TaskResult[]>;
  clearHistory: () => Promise<void>;
  getExecutionsByTask: (taskId: string, limit?: number) => Promise<TaskResult[]>;
};

// Export MCP configuration storage
export const mcpConfigStorage: MCPConfigStorage = {
  ...mcpConfigBaseStorage,

  enableMCP: async (enabled: boolean) => {
    await mcpConfigBaseStorage.set(current => ({
      ...current,
      enabled,
    }));
  },

  updateStrategy: async (strategy: ResearchStrategy) => {
    await mcpConfigBaseStorage.set(current => ({
      ...current,
      defaultStrategy: strategy,
    }));
  },

  updateTask: async (taskId: string, updates: Partial<TaskConfig>) => {
    await mcpConfigBaseStorage.set(current => ({
      ...current,
      tasks: current.tasks.map(task => (task.id === taskId ? { ...task, ...updates } : task)),
    }));
  },

  addCustomSite: async (site: SearchSiteConfig) => {
    await mcpConfigBaseStorage.set(current => ({
      ...current,
      customSites: [...current.customSites, site],
    }));
  },

  removeCustomSite: async (siteName: string) => {
    await mcpConfigBaseStorage.set(current => ({
      ...current,
      customSites: current.customSites.filter(site => site.name !== siteName),
    }));
  },

  resetToDefaults: async () => {
    await mcpConfigBaseStorage.set(defaultMCPConfig);
  },
};

// Export task history storage
export const mcpTaskHistoryStorage: MCPTaskHistoryStorage = {
  ...mcpTaskHistoryBaseStorage,

  addExecution: async (result: TaskResult) => {
    await mcpTaskHistoryBaseStorage.set(current => {
      const updatedExecutions = [result, ...current.executions];

      // Keep only the most recent executions
      if (updatedExecutions.length > current.maxExecutions) {
        updatedExecutions.splice(current.maxExecutions);
      }

      return {
        ...current,
        executions: updatedExecutions,
        totalExecutions: current.totalExecutions + 1,
      };
    });
  },

  getRecentExecutions: async (limit = 10) => {
    const history = await mcpTaskHistoryBaseStorage.get();
    return history.executions.slice(0, limit);
  },

  clearHistory: async () => {
    await mcpTaskHistoryBaseStorage.set(current => ({
      ...current,
      executions: [],
    }));
  },

  getExecutionsByTask: async (taskId: string, limit = 10) => {
    const history = await mcpTaskHistoryBaseStorage.get();
    return history.executions.filter(execution => execution.taskId === taskId).slice(0, limit);
  },
};
