import { mcpConfigStorage, mcpTaskHistoryStorage, MCPTaskType } from '@extension/storage';
import type {
  MCPConfig,
  TaskConfig,
  TaskResult,
  SearchResult,
  SearchSiteConfig,
  ResearchStrategy,
} from '@extension/storage';

/**
 * MCP (Model Context Protocol) Service
 * Handles automated web research and task execution
 */
export class MCPService {
  private static instance: MCPService;
  private isInitialized = false;
  private config: MCPConfig | null = null;
  private activeTasks = new Map<string, AbortController>();

  private constructor() {}

  static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  /**
   * Initialize MCP service
   */
  async initialize(): Promise<void> {
    try {
      this.config = await mcpConfigStorage.get();
      this.isInitialized = true;
      console.log('MCP Service initialized', { enabled: this.config.enabled });
    } catch (error) {
      console.error('Error initializing MCP service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if MCP is enabled and ready
   */
  isEnabled(): boolean {
    return this.isInitialized && this.config?.enabled === true;
  }

  /**
   * Detect if a message contains a research request
   */
  detectResearchRequest(message: string): {
    isResearch: boolean;
    taskType?: MCPTaskType;
    query?: string;
    suggestedTask?: string;
  } {
    const lowerMessage = message.toLowerCase();

    // Research keywords - 扩展关键词以便更容易触发
    const researchKeywords = [
      '研究',
      '搜索',
      '查找',
      '寻找',
      '帮我找',
      '需要',
      '论文',
      '什么是',
      '介绍',
      '了解',
      '学习',
      '知道',
      '告诉我',
      '获取',
      '查看',
      '显示',
      '打开',
      '启动',
      '播放',
      '执行',
      'research',
      'search',
      'find',
      'look for',
      'help me find',
      'papers',
      'what is',
      'tell me',
      'learn',
      'know',
      'about',
      'explain',
      'get',
      'show',
      'display',
      'open',
      'start',
      'play',
      'execute',
    ];

    // Academic keywords
    const academicKeywords = ['论文', '学术', '研究', '期刊', 'paper', 'academic', 'journal', 'arxiv'];

    // Code keywords
    const codeKeywords = ['代码', '库', '项目', '开源', 'code', 'library', 'project', 'github', 'repository'];

    // System operation keywords
    const systemKeywords = [
      '系统信息',
      '系统',
      '信息',
      '播放音乐',
      '音乐',
      '计算器',
      '打开',
      '启动',
      '应用',
      'system',
      'info',
      'music',
      'calculator',
      'app',
      'application',
    ];

    const hasResearchKeyword = researchKeywords.some(keyword => lowerMessage.includes(keyword));

    if (!hasResearchKeyword) {
      return { isResearch: false };
    }

    // Determine task type
    let taskType: MCPTaskType = MCPTaskType.RESEARCH;
    let suggestedTask = 'general_research';

    if (systemKeywords.some(keyword => lowerMessage.includes(keyword))) {
      taskType = MCPTaskType.SYSTEM;
      suggestedTask = 'system_info';
    } else if (academicKeywords.some(keyword => lowerMessage.includes(keyword))) {
      taskType = MCPTaskType.RESEARCH;
      suggestedTask = 'research_papers';
    } else if (codeKeywords.some(keyword => lowerMessage.includes(keyword))) {
      taskType = MCPTaskType.WEB_SEARCH;
      suggestedTask = 'code_search';
    }

    // Extract query (simplified extraction)
    const query = this.extractQuery(message);

    return {
      isResearch: true,
      taskType,
      query,
      suggestedTask,
    };
  }

  /**
   * Extract search query from message
   */
  private extractQuery(message: string): string {
    // Remove common prefixes and suffixes
    let query = message
      .replace(/^(请|帮我|帮忙|能否|可以|我想|我需要|help me|can you|please)/i, '')
      .replace(/(搜索|查找|寻找|找到|research|search|find)/i, '')
      .replace(/(相关的|关于|有关|related to|about)/i, '')
      .replace(/(论文|资料|信息|papers|information|data)/i, '')
      .trim();

    // Extract content within brackets or quotes
    const bracketMatch = query.match(/[【]([^】]+)[】]/);
    if (bracketMatch) {
      query = bracketMatch[1];
    }

    const quoteMatch = query.match(/["'"]([^"'"]+)["'"]/);
    if (quoteMatch) {
      query = quoteMatch[1];
    }

    return query.trim() || message.trim();
  }

  /**
   * Execute a research task
   */
  async executeTask(
    taskId: string,
    query: string,
    options?: {
      maxResults?: number;
      timeout?: number;
      strategy?: ResearchStrategy;
    },
  ): Promise<TaskResult> {
    if (!this.isEnabled()) {
      throw new Error('MCP service is not enabled');
    }

    const config = await mcpConfigStorage.get();
    const task = config.tasks.find(t => t.id === taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!task.enabled) {
      throw new Error(`Task is disabled: ${taskId}`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    // Create abort controller for this task
    const abortController = new AbortController();
    this.activeTasks.set(executionId, abortController);

    try {
      console.log(`Executing MCP task: ${taskId} with query: "${query}"`);

      const results = await this.performSearch(task, query, {
        maxResults: options?.maxResults || task.maxResults,
        timeout: options?.timeout || task.timeout,
        signal: abortController.signal,
      });

      const duration = Date.now() - startTime;

      const taskResult: TaskResult = {
        id: executionId,
        taskId,
        timestamp: startTime,
        status: 'success',
        query,
        results,
        duration,
      };

      // Save to history if enabled
      if (config.saveResults) {
        await mcpTaskHistoryStorage.addExecution(taskResult);
      }

      console.log(`MCP task completed: ${taskId}, found ${results.length} results`);
      return taskResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const taskResult: TaskResult = {
        id: executionId,
        taskId,
        timestamp: startTime,
        status: (error as Error)?.name === 'AbortError' ? 'cancelled' : 'error',
        query,
        results: [],
        error: errorMessage,
        duration,
      };

      // Save error to history if enabled
      if (config.saveResults) {
        await mcpTaskHistoryStorage.addExecution(taskResult);
      }

      console.error(`MCP task failed: ${taskId}`, error);
      throw error;
    } finally {
      this.activeTasks.delete(executionId);
    }
  }

  /**
   * Perform search across configured sites
   */
  private async performSearch(
    task: TaskConfig,
    query: string,
    options: {
      maxResults: number;
      timeout: number;
      signal: AbortSignal;
    },
  ): Promise<SearchResult[]> {
    console.log(`Performing MCP search for task: ${task.id}, query: "${query}"`);

    // Use MCP Native Messaging to perform actual search
    try {
      const mcpResponse = await this.callMCPService(task.id, query, {
        maxResults: options.maxResults,
        timeout: options.timeout,
      });

      if (mcpResponse.success && mcpResponse.data) {
        // Convert MCP response to SearchResult format
        return this.convertMCPResponseToSearchResults(mcpResponse.data, task.name);
      } else {
        console.warn('MCP search failed:', mcpResponse.error);
        // Fallback to mock results for now
        return this.getMockResults(task, query, options);
      }
    } catch (error) {
      console.error('MCP service call failed:', error);
      // Fallback to mock results
      return this.getMockResults(task, query, options);
    }
  }

  /**
   * Call MCP service through background script
   */
  private async callMCPService(
    taskId: string,
    query: string,
    options: { maxResults: number; timeout: number },
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const message = {
        type: 'MCP_REQUEST',
        command: taskId,
        query: query,
        taskId: taskId,
        options: options,
      };

      console.log('🚀 Sending MCP request to background script:', message);

      // Send MCP request to background script
      chrome.runtime.sendMessage(message, response => {
        console.log('📨 Received response from background script:', response);

        if (chrome.runtime.lastError) {
          console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response) {
          console.log('✅ MCP response received successfully');
          resolve(response);
        } else {
          console.error('❌ No response from background script');
          reject(new Error('No response from background script'));
        }
      });
    });
  }

  /**
   * Convert MCP response to SearchResult format
   */
  private convertMCPResponseToSearchResults(data: any, source: string): SearchResult[] {
    const results: SearchResult[] = [];

    // Handle different types of MCP responses
    if (data.results && Array.isArray(data.results)) {
      // Standard search results
      data.results.forEach((item: any, index: number) => {
        results.push({
          title: item.title || `Result ${index + 1}`,
          url: item.url || '#',
          description: item.description || item.message || '',
          source: source,
          timestamp: Date.now(),
          relevanceScore: item.relevanceScore || 50,
        });
      });
    } else if (data.message) {
      // Single result with message
      results.push({
        title: `MCP Task Result`,
        url: data.url || '#',
        description: data.message,
        source: source,
        timestamp: Date.now(),
        relevanceScore: 80,
      });
    } else if (data.url) {
      // URL-based result (like search links)
      results.push({
        title: `Search: ${data.query || 'Query'}`,
        url: data.url,
        description: data.message || 'Search results available at this link',
        source: source,
        timestamp: Date.now(),
        relevanceScore: 70,
      });
    }

    return results;
  }

  /**
   * Get mock results as fallback
   */
  private async getMockResults(
    task: TaskConfig,
    query: string,
    options: { maxResults: number; timeout: number; signal: AbortSignal },
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const enabledSites = task.sites.filter(site => site.enabled);

    if (enabledSites.length === 0) {
      throw new Error('No enabled sites configured for this task');
    }

    // Search each site concurrently
    const searchPromises = enabledSites.map(site =>
      this.searchSite(site, query, options).catch(error => {
        console.warn(`Search failed for ${site.name}:`, error);
        return []; // Return empty array on error
      }),
    );

    try {
      const siteResults = await Promise.all(searchPromises);

      // Combine and limit results
      for (const results of siteResults) {
        allResults.push(...results);
        if (allResults.length >= options.maxResults) {
          break;
        }
      }

      // Sort by relevance if available, otherwise by timestamp
      allResults.sort((a, b) => {
        if (a.relevanceScore && b.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return b.timestamp - a.timestamp;
      });

      return allResults.slice(0, options.maxResults);
    } catch (error) {
      console.error('Error performing search:', error);
      throw error;
    }
  }

  /**
   * Search a specific site
   */
  private async searchSite(
    site: SearchSiteConfig,
    query: string,
    options: { timeout: number; signal: AbortSignal },
  ): Promise<SearchResult[]> {
    // For now, return mock results
    // In a real implementation, this would use web automation
    // or API calls to perform actual searches

    console.log(`Searching ${site.name} for: "${query}"`);

    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    if (options.signal.aborted) {
      throw new Error('Search aborted');
    }

    // Mock results based on site type
    const mockResults: SearchResult[] = [];
    const resultCount = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < resultCount; i++) {
      mockResults.push({
        title: `${query} - Result ${i + 1} from ${site.name}`,
        url: `${site.url}?q=${encodeURIComponent(query)}&result=${i + 1}`,
        description: `This is a mock search result for "${query}" from ${site.name}. In a real implementation, this would contain actual search results.`,
        source: site.name,
        timestamp: Date.now(),
        relevanceScore: Math.random() * 100,
      });
    }

    return mockResults;
  }

  /**
   * Cancel a running task
   */
  async cancelTask(executionId: string): Promise<void> {
    const controller = this.activeTasks.get(executionId);
    if (controller) {
      controller.abort();
      this.activeTasks.delete(executionId);
      console.log(`Cancelled MCP task: ${executionId}`);
    }
  }

  /**
   * Cancel all running tasks
   */
  async cancelAllTasks(): Promise<void> {
    for (const [, controller] of this.activeTasks) {
      controller.abort();
    }
    this.activeTasks.clear();
    console.log('Cancelled all MCP tasks');
  }

  /**
   * Get available tasks
   */
  async getAvailableTasks(): Promise<TaskConfig[]> {
    const config = await mcpConfigStorage.get();
    return config.tasks.filter(task => task.enabled);
  }

  /**
   * Get task execution history
   */
  async getTaskHistory(limit = 10): Promise<TaskResult[]> {
    return await mcpTaskHistoryStorage.getRecentExecutions(limit);
  }

  /**
   * Format search results for display
   */
  formatResultsForChat(results: SearchResult[]): string {
    if (results.length === 0) {
      return '抱歉，没有找到相关结果。';
    }

    let formatted = `找到 ${results.length} 个相关结果：\n\n`;

    results.forEach((result, index) => {
      formatted += `${index + 1}. **${result.title}**\n`;
      formatted += `   来源: ${result.source}\n`;
      if (result.description) {
        formatted += `   描述: ${result.description.substring(0, 100)}...\n`;
      }
      formatted += `   链接: ${result.url}\n\n`;
    });

    return formatted;
  }
}
