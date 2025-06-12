#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const winston = require('winston');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

// 配置日志
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/mcp-client.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    // 移除Console transport，避免干扰stdout的JSON输出
    // new winston.transports.Console({
    //   format: winston.format.simple(),
    //   level: 'info',
    // }),
  ],
});

/**
 * MCP Client - 处理来自Native Host的请求
 */
class MCPClient {
  constructor() {
    this.mcpServers = new Map();
    this.initBuiltinTools();

    logger.info('MCP Client initialized');
  }

  /**
   * 初始化内置工具
   */
  initBuiltinTools() {
    this.builtinTools = {
      play_music: this.playMusic.bind(this),
      chrome_search: this.chromeSearch.bind(this),
      open_app: this.openApp.bind(this),
      system_info: this.getSystemInfo.bind(this),
    };

    logger.debug('Builtin tools initialized', {
      tools: Object.keys(this.builtinTools),
    });
  }

  /**
   * 验证请求安全性
   */
  validateRequest(request) {
    const { command, query } = request;

    // 检查命令长度
    if (command && command.length > 100) {
      throw new Error('命令长度超出限制');
    }

    // 检查查询长度
    if (query && query.length > 1000) {
      throw new Error('查询内容长度超出限制');
    }

    // 检查危险字符
    const dangerousPatterns = [
      /[;&|`$(){}[\]]/, // Shell特殊字符
      /\.\./, // 路径遍历
      /rm\s+-rf/i, // 危险命令
      /sudo/i, // 提权命令
      /chmod/i, // 权限修改
      /curl.*\|/i, // 管道下载执行
      /wget.*\|/i, // 管道下载执行
    ];

    const fullText = `${command || ''} ${query || ''}`;
    for (const pattern of dangerousPatterns) {
      if (pattern.test(fullText)) {
        throw new Error(`检测到潜在危险内容: ${pattern.source}`);
      }
    }

    return true;
  }

  /**
   * 处理请求
   */
  async handleRequest(request) {
    const { command, query, requestId } = request;

    logger.info('Processing request', { requestId, command, query });

    try {
      // 安全验证
      this.validateRequest(request);

      // 解析用户指令
      const intent = this.parseIntent(command, query);

      logger.debug('Parsed intent', { requestId, intent });

      // 检查是否为内置工具
      if (this.builtinTools[intent.action]) {
        const result = await this.builtinTools[intent.action](intent.params);
        return {
          success: true,
          data: result,
          source: 'builtin',
          action: intent.action,
        };
      }

      // 调用外部MCP服务
      const result = await this.callExternalMCP(intent);
      return {
        success: true,
        data: result,
        source: 'external',
        action: intent.action,
      };
    } catch (error) {
      logger.error('Request processing failed', {
        requestId,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        action: 'unknown',
      };
    }
  }

  /**
   * 解析用户意图
   */
  parseIntent(command, query = '') {
    const fullText = `${command} ${query}`.toLowerCase().trim();

    // 音乐控制 - 优先级最高，包含更多音乐相关的关键词
    if (
      fullText.includes('播放音乐') ||
      fullText.includes('play music') ||
      fullText.includes('打开音乐') ||
      fullText.includes('开始播放') ||
      fullText.includes('播放歌曲') ||
      fullText.includes('听音乐') ||
      command === 'play_music'
    ) {
      return { action: 'play_music', params: { query: fullText } };
    }

    // 搜索功能
    if (fullText.includes('搜索') || fullText.includes('search') || command === 'chrome_search') {
      const searchQuery = query || fullText.replace(/.*搜索\s*/, '').replace(/.*search\s*/, '');
      return { action: 'chrome_search', params: { query: searchQuery } };
    }

    // 应用启动 - 排除音乐相关的打开指令
    if (
      (fullText.includes('打开') || fullText.includes('open') || command === 'open_app') &&
      !fullText.includes('音乐') &&
      !fullText.includes('music')
    ) {
      const appName = query || fullText.replace(/.*打开\s*/, '').replace(/.*open\s*/, '');
      return { action: 'open_app', params: { app: appName } };
    }

    // 系统信息
    if (fullText.includes('系统信息') || fullText.includes('system info') || command === 'system_info') {
      return { action: 'system_info', params: {} };
    }

    // ArXiv搜索
    if (fullText.includes('arxiv') || fullText.includes('论文')) {
      return { action: 'arxiv_search', params: { query: query || fullText } };
    }

    // 默认处理
    return { action: 'unknown', params: { query: fullText } };
  }

  /**
   * 播放音乐
   */
  async playMusic(params) {
    try {
      logger.info('Playing music', params);

      if (process.platform === 'darwin') {
        // macOS - 使用QQ音乐
        const qqMusicScript = `osascript -e '
tell application "QQMusic" to activate
delay 3
tell application "System Events"
    tell process "QQMusic"
        set frontmost to true
        key code 48
        delay 0.5
        keystroke " "
    end tell
end tell'`;
        await execAsync(qqMusicScript);
        return { message: '好的！开始播放QQ音乐 🎵', platform: 'macOS', app: 'QQMusic' };
      } else if (process.platform === 'win32') {
        // Windows
        await execAsync(
          'powershell -Command "Add-Type -AssemblyName presentationCore; [System.Windows.Forms.SendKeys]::SendWait(\'{MEDIA_PLAY_PAUSE}\')"',
        );
        return { message: '开始播放音乐', platform: 'Windows' };
      } else {
        // Linux
        await execAsync('playerctl play');
        return { message: '开始播放音乐', platform: 'Linux' };
      }
    } catch (error) {
      logger.error('Failed to play music', { error: error.message });
      throw new Error(`播放音乐失败: ${error.message}`);
    }
  }

  /**
   * Chrome搜索
   */
  async chromeSearch(params) {
    const { query } = params;

    logger.info('Chrome search requested', { query });

    // 返回搜索指令，让Chrome扩展执行
    return {
      action: 'chrome_search',
      query: query,
      message: `请在Chrome中搜索: ${query}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    };
  }

  /**
   * 打开应用程序
   */
  async openApp(params) {
    const { app } = params;

    // 安全检查：只允许预定义的安全应用程序
    const allowedApps = {
      calculator: {
        darwin: 'Calculator',
        win32: 'calc.exe',
        linux: 'gnome-calculator',
      },
      notepad: {
        darwin: 'TextEdit',
        win32: 'notepad.exe',
        linux: 'gedit',
      },
      browser: {
        darwin: 'Safari',
        win32: 'msedge.exe',
        linux: 'firefox',
      },
      music: {
        darwin: 'QQMusic',
        win32: 'wmplayer.exe',
        linux: 'rhythmbox',
      },
    };

    // 验证应用程序名称
    const normalizedApp = app.toLowerCase().trim();
    if (!allowedApps[normalizedApp]) {
      throw new Error(`不允许打开的应用程序: ${app}。允许的应用: ${Object.keys(allowedApps).join(', ')}`);
    }

    const platformApp = allowedApps[normalizedApp][process.platform];
    if (!platformApp) {
      throw new Error(`当前平台 ${process.platform} 不支持应用程序: ${app}`);
    }

    try {
      logger.info('Opening application', { requestedApp: app, actualApp: platformApp });

      if (process.platform === 'darwin') {
        // macOS - 使用spawn避免命令注入
        await new Promise((resolve, reject) => {
          const child = spawn('open', ['-a', platformApp]);
          child.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`open命令失败，退出码: ${code}`));
          });
          child.on('error', reject);
        });
      } else if (process.platform === 'win32') {
        // Windows - 使用spawn避免命令注入
        await new Promise((resolve, reject) => {
          const child = spawn('cmd', ['/c', 'start', '', platformApp]);
          child.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`start命令失败，退出码: ${code}`));
          });
          child.on('error', reject);
        });
      } else {
        // Linux - 使用spawn避免命令注入
        await new Promise((resolve, reject) => {
          const child = spawn(platformApp, []);
          child.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`${platformApp}启动失败，退出码: ${code}`));
          });
          child.on('error', reject);
        });
      }

      return {
        message: `已打开应用程序: ${app} (${platformApp})`,
        requestedApp: app,
        actualApp: platformApp,
        platform: process.platform,
      };
    } catch (error) {
      logger.error('Failed to open application', { app, platformApp, error: error.message });
      throw new Error(`打开应用程序失败: ${error.message}`);
    }
  }

  /**
   * 获取系统信息
   */
  async getSystemInfo() {
    try {
      const systemInfo = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        hostname: os.hostname(),
        uptime: os.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
        },
        cpus: os.cpus().length,
        loadavg: os.loadavg(),
      };

      logger.info('System info retrieved', systemInfo);
      return systemInfo;
    } catch (error) {
      logger.error('Failed to get system info', { error: error.message });
      throw new Error(`获取系统信息失败: ${error.message}`);
    }
  }

  /**
   * 调用外部MCP服务
   */
  async callExternalMCP(intent) {
    if (intent.action === 'arxiv_search') {
      return await this.callArxivMCP(intent.params.query);
    }

    throw new Error(`Unknown external MCP service: ${intent.action}`);
  }

  /**
   * 调用ArXiv MCP服务
   */
  async callArxivMCP(query) {
    // TODO: 实现真实的ArXiv MCP服务调用
    logger.info('ArXiv search requested', { query });

    // 模拟搜索结果
    return {
      message: 'ArXiv搜索完成',
      query: query,
      results: [
        {
          title: `ArXiv论文搜索结果: ${query}`,
          url: `https://arxiv.org/search/?query=${encodeURIComponent(query)}`,
          description: '这是一个模拟的ArXiv搜索结果',
        },
      ],
    };
  }
}

/**
 * 主程序
 */
async function main() {
  const client = new MCPClient();

  let input = '';

  // 读取来自Native Host的输入
  process.stdin.on('data', chunk => {
    input += chunk.toString();
  });

  process.stdin.on('end', async () => {
    try {
      const request = JSON.parse(input);
      const result = await client.handleRequest(request);

      // 输出结果给Native Host
      console.log(JSON.stringify(result));
    } catch (error) {
      logger.error('Main process error', { error: error.message, input });
      console.log(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
      );
    }
  });

  // 错误处理
  process.on('uncaughtException', error => {
    logger.error('Uncaught exception in MCP Client', {
      error: error.message,
      stack: error.stack,
    });
    console.log(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
    );
    process.exit(1);
  });
}

// 如果直接运行此文件，启动主程序
if (require.main === module) {
  main();
}

module.exports = MCPClient;
