// Runtime Task Manager for on-demand script execution
// This follows the scaffolding's design intent for content-runtime

export interface RuntimeTask {
  id: string;
  name: string;
  description: string;
  execute: (params?: unknown) => Promise<unknown> | unknown;
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
  taskId: string;
}

export class RuntimeTaskManager {
  private static instance: RuntimeTaskManager;
  private tasks: Map<string, RuntimeTask> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): RuntimeTaskManager {
    if (!RuntimeTaskManager.instance) {
      RuntimeTaskManager.instance = new RuntimeTaskManager();
    }
    return RuntimeTaskManager.instance;
  }

  // Initialize the task manager and register default tasks
  initialize(): void {
    if (this.isInitialized) {
      console.log('Runtime task manager already initialized');
      return;
    }

    console.log('🔧 Initializing runtime task manager...');

    // Register default tasks
    this.registerDefaultTasks();

    // Set up message listener for external task execution
    this.setupMessageListener();

    this.isInitialized = true;
    console.log('✅ Runtime task manager initialized with', this.tasks.size, 'tasks');
  }

  // Register a new task
  registerTask(task: RuntimeTask): void {
    this.tasks.set(task.id, task);
    console.log(`📝 Registered task: ${task.id} - ${task.name}`);
  }

  // Execute a task by ID
  async executeTask(taskId: string, params?: any): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      const task = this.tasks.get(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      console.log(`🚀 Executing task: ${task.name}`, params);

      const result = await task.execute(params);

      const taskResult: TaskResult = {
        success: true,
        data: result,
        timestamp: Date.now(),
        taskId,
      };

      console.log(`✅ Task completed: ${task.name} (${Date.now() - startTime}ms)`, taskResult);
      return taskResult;
    } catch (error) {
      const taskResult: TaskResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        taskId,
      };

      console.error(`❌ Task failed: ${taskId} (${Date.now() - startTime}ms)`, error);
      return taskResult;
    }
  }

  // Get list of available tasks
  getAvailableTasks(): Array<{ id: string; name: string; description: string }> {
    return Array.from(this.tasks.values()).map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
    }));
  }

  // Register default tasks
  private registerDefaultTasks(): void {
    // Page Analysis Task
    this.registerTask({
      id: 'analyze-page',
      name: 'Page Analysis',
      description: 'Analyze current page structure and content',
      execute: () => this.analyzePage(),
    });

    // Data Extraction Task
    this.registerTask({
      id: 'extract-data',
      name: 'Extract Page Data',
      description: 'Extract structured data from the current page',
      execute: params => this.extractPageData(params as { selectors?: string[]; maxItems?: number }),
    });

    // DOM Manipulation Task
    this.registerTask({
      id: 'modify-dom',
      name: 'Modify DOM',
      description: 'Perform DOM modifications on the current page',
      execute: params => this.modifyPageDOM(params as { type?: string; message?: string; duration?: number }),
    });

    // Focus Mode Enhancement Task
    this.registerTask({
      id: 'enhance-focus',
      name: 'Enhance Focus Mode',
      description: 'Apply focus mode enhancements to the current page',
      execute: params => this.enhanceFocusMode(params as { hideSelectors?: string[]; blurLevel?: number }),
    });

    // Site-specific Handler Task
    this.registerTask({
      id: 'site-handler',
      name: 'Site-specific Handler',
      description: 'Execute site-specific DOM modifications',
      execute: params => this.executeSiteHandler(params as { site?: string; action?: string; selectors?: string[] }),
    });
  }

  // Task implementations
  private analyzePage(): any {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      elementCount: document.querySelectorAll('*').length,
      images: document.querySelectorAll('img').length,
      links: document.querySelectorAll('a').length,
      forms: document.querySelectorAll('form').length,
      scripts: document.querySelectorAll('script').length,
      stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY,
      },
      documentReady: document.readyState,
      timestamp: new Date().toISOString(),
    };

    console.log('📊 Page analysis completed:', pageInfo);
    return pageInfo;
  }

  private extractPageData(params?: { selectors?: string[]; maxItems?: number }): any {
    const defaultSelectors = ['h1', 'h2', 'h3', 'p', 'article', 'main'];
    const selectors = params?.selectors || defaultSelectors;
    const maxItems = params?.maxItems || 10;

    const extractedData: any = {
      headings: [],
      paragraphs: [],
      links: [],
      images: [],
      metadata: {},
      extractedAt: new Date().toISOString(),
    };

    // Extract headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .slice(0, maxItems)
      .map(h => ({
        tag: h.tagName.toLowerCase(),
        text: h.textContent?.trim(),
        level: parseInt(h.tagName.charAt(1)),
      }));
    extractedData.headings = headings;

    // Extract paragraphs
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .slice(0, maxItems)
      .map(p => p.textContent?.trim())
      .filter(text => text && text.length > 20);
    extractedData.paragraphs = paragraphs;

    // Extract links
    const links = Array.from(document.querySelectorAll('a[href]'))
      .slice(0, maxItems)
      .map(a => ({
        text: a.textContent?.trim(),
        href: (a as HTMLAnchorElement).href,
        isExternal: !(a as HTMLAnchorElement).href.startsWith(window.location.origin),
      }));
    extractedData.links = links;

    // Extract images
    const images = Array.from(document.querySelectorAll('img[src]'))
      .slice(0, maxItems)
      .map(img => ({
        src: (img as HTMLImageElement).src,
        alt: (img as HTMLImageElement).alt,
        width: (img as HTMLImageElement).width,
        height: (img as HTMLImageElement).height,
      }));
    extractedData.images = images;

    // Extract metadata
    const metaTags = Array.from(document.querySelectorAll('meta[name], meta[property]'));
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        extractedData.metadata[name] = content;
      }
    });

    console.log('📋 Data extraction completed:', extractedData);
    return extractedData;
  }

  private modifyPageDOM(params?: { type?: string; message?: string; duration?: number }): any {
    const type = params?.type || 'notification';
    const message = params?.message || 'Runtime script executed!';
    const duration = params?.duration || 3000;

    switch (type) {
      case 'notification':
        return this.showNotification(message, duration);
      case 'highlight':
        return this.highlightElements(params);
      case 'overlay':
        return this.createOverlay(message, duration);
      default:
        return this.showNotification(message, duration);
    }
  }

  private showNotification(message: string, duration: number): any {
    const notification = document.createElement('div');
    notification.id = 'runtime-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation keyframes
    if (!document.getElementById('runtime-styles')) {
      const style = document.createElement('style');
      style.id = 'runtime-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove after duration
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, duration);

    return { message: 'Notification displayed', duration };
  }

  private highlightElements(params?: { selector?: string; color?: string; duration?: number }): any {
    const selector = params?.selector || 'h1, h2, h3';
    const color = params?.color || '#ffeb3b';
    const duration = params?.duration || 5000;

    const elements = document.querySelectorAll(selector);
    const originalStyles: Array<{ element: Element; originalBackground: string }> = [];

    elements.forEach(element => {
      const htmlElement = element as HTMLElement;
      originalStyles.push({
        element,
        originalBackground: htmlElement.style.backgroundColor,
      });
      htmlElement.style.backgroundColor = color;
      htmlElement.style.transition = 'background-color 0.3s ease';
    });

    // Restore original styles after duration
    setTimeout(() => {
      originalStyles.forEach(({ element, originalBackground }) => {
        (element as HTMLElement).style.backgroundColor = originalBackground;
      });
    }, duration);

    return {
      message: `Highlighted ${elements.length} elements`,
      selector,
      count: elements.length,
      duration,
    };
  }

  private createOverlay(message: string, duration: number): any {
    const overlay = document.createElement('div');
    overlay.id = 'runtime-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 24px;
      text-align: center;
    `;

    overlay.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        max-width: 500px;
      ">
        ${message}
      </div>
    `;

    document.body.appendChild(overlay);

    // Remove after duration
    setTimeout(() => {
      overlay.remove();
    }, duration);

    return { message: 'Overlay displayed', duration };
  }

  private enhanceFocusMode(params?: { hideSelectors?: string[]; blurLevel?: number }): any {
    const hideSelectors = params?.hideSelectors || [
      '.advertisement',
      '.ads',
      '.sidebar',
      '.social-share',
      '.comments',
      '.related-posts',
      '.popup',
      '.modal',
    ];
    const blurLevel = params?.blurLevel || 3;

    let hiddenCount = 0;
    let blurredCount = 0;

    // Hide distracting elements
    hideSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        (element as HTMLElement).style.display = 'none';
        hiddenCount++;
      });
    });

    // Blur non-essential content
    const blurSelectors = ['aside', '.widget', '.banner', 'nav:not(.main-nav)'];
    blurSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        (element as HTMLElement).style.filter = `blur(${blurLevel}px)`;
        (element as HTMLElement).style.transition = 'filter 0.3s ease';
        blurredCount++;
      });
    });

    // Add focus mode indicator
    this.showNotification(`🎯 Focus mode enhanced! Hidden: ${hiddenCount}, Blurred: ${blurredCount}`, 3000);

    return {
      message: 'Focus mode enhanced',
      hiddenElements: hiddenCount,
      blurredElements: blurredCount,
      timestamp: new Date().toISOString(),
    };
  }

  private executeSiteHandler(params?: { site?: string; action?: string; selectors?: string[] }): any {
    const currentSite = params?.site || window.location.hostname;
    const action = params?.action || 'hide';
    const selectors = params?.selectors || [];

    console.log(`🌐 Executing site handler for: ${currentSite}`, { action, selectors });

    let processedCount = 0;

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const htmlElement = element as HTMLElement;

        switch (action) {
          case 'hide':
            htmlElement.style.display = 'none';
            break;
          case 'blur':
            htmlElement.style.filter = 'blur(5px)';
            break;
          case 'fade':
            htmlElement.style.opacity = '0.3';
            break;
          case 'remove':
            htmlElement.remove();
            break;
          default:
            htmlElement.style.display = 'none';
        }
        processedCount++;
      });
    });

    return {
      message: `Site handler executed for ${currentSite}`,
      action,
      processedElements: processedCount,
      selectors,
      timestamp: new Date().toISOString(),
    };
  }

  // Set up message listener for external task execution
  private setupMessageListener(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'EXECUTE_RUNTIME_TASK') {
          this.executeTask(message.taskId, message.params)
            .then(result => sendResponse(result))
            .catch(error =>
              sendResponse({
                success: false,
                error: error.message,
                timestamp: Date.now(),
                taskId: message.taskId,
              }),
            );
          return true; // Keep message channel open for async response
        }
        return false;
      });
    }

    // Also listen for direct window messages
    window.addEventListener('message', event => {
      if (event.data.type === 'EXECUTE_RUNTIME_TASK') {
        this.executeTask(event.data.taskId, event.data.params)
          .then(result => {
            window.postMessage(
              {
                type: 'RUNTIME_TASK_RESULT',
                result,
                requestId: event.data.requestId,
              },
              '*',
            );
          })
          .catch(error => {
            window.postMessage(
              {
                type: 'RUNTIME_TASK_RESULT',
                result: {
                  success: false,
                  error: error.message,
                  timestamp: Date.now(),
                  taskId: event.data.taskId,
                },
                requestId: event.data.requestId,
              },
              '*',
            );
          });
      }
    });
  }
}
