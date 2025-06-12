# MCP (Model Context Protocol) 后端服务

基于标准MCP架构的Chrome扩展后端服务系统。

## 🏗️ 系统架构

```
Chrome插件 (前端) ←→ Native Messaging Host ←→ MCP Client服务 ←→ MCP Servers
     │                        │                      │                │
  UI交互界面              协议转换桥梁           MCP客户端实现      具体服务实现
```

## 🎯 关键设计要点

### 三层架构
- **Chrome插件**: 用户界面，发起MCP请求
- **Native Messaging Host**: 协议桥梁，安全的本地访问
- **MCP Client服务**: 服务调度器，管理工具和外部服务

### 渐进式实现
1. **阶段1**: 基础系统工具调用（音乐、搜索、应用启动）
2. **阶段2**: 外部MCP服务集成（ArXiv、GitHub等）
3. **阶段3**: 高级功能和优化

### 模块化设计
- **内置工具**: 直接集成在MCP Client中
- **外部服务**: 通过标准MCP协议连接
- **插件化**: 支持动态加载新工具

## 📁 项目结构

```
MCP/
├── README.md                    # 项目总览
├── IMPLEMENTATION_PLAN.md       # 实现计划
├── native-host/                 # Native Messaging Host (桥梁)
│   ├── package.json            # Node.js依赖
│   ├── src/
│   │   ├── main.js             # 主程序入口
│   │   └── protocol.js         # 协议处理
│   └── config/
│       └── manifest.json       # Native messaging配置
├── client/                      # MCP Client服务
│   ├── src/
│   │   ├── client.js           # MCP客户端实现
│   │   ├── parser.js           # 意图解析
│   │   └── tools/              # 内置工具集
│   ├── package.json
│   └── config/
│       └── client.yaml         # 客户端配置
├── servers/                     # MCP Servers (具体服务)
│   ├── search-server/          # 搜索服务器
│   ├── automation-server/      # 自动化服务器
│   ├── system-server/          # 系统工具服务器
│   └── ai-server/              # AI服务器
├── shared/                      # 共享组件
│   ├── protocols/              # MCP协议定义
│   ├── utils/                  # 工具函数
│   └── types/                  # 类型定义
├── scripts/                     # 部署脚本
│   ├── install.sh              # 安装脚本
│   ├── start-all.sh            # 启动所有服务
│   └── setup-native-host.sh    # Native host设置
├── logs/                        # 日志目录
└── docs/                        # 文档
    ├── architecture.md         # 架构说明
    ├── api.md                  # API文档
    └── deployment.md           # 部署指南
```

## 🚀 实现优势

### 安全性
- ✅ Native Messaging确保本地系统访问安全
- ✅ 权限隔离，Chrome插件无法直接访问系统
- ✅ 请求验证和过滤机制

### 扩展性
- ✅ 标准MCP协议，易于添加新服务
- ✅ 模块化工具系统
- ✅ 配置驱动的服务发现

### 用户体验
- ✅ 聊天界面无缝集成
- ✅ 自然语言指令解析
- ✅ 统一的错误处理和反馈

## 🛠️ 快速开始

### 1. 安装依赖

```bash
# 进入MCP目录
cd MCP

# 安装Native Host依赖
cd native-host && npm install && cd ..

# 安装MCP Client依赖
cd client && npm install && cd ..
```

### 2. 配置Native Messaging

```bash
# 运行安装脚本
./scripts/install.sh

# 或手动设置Native Host
./scripts/setup-native-host.sh
```

### 3. 启动服务

```bash
# 启动所有服务
./scripts/start-all.sh

# 或分别启动
cd native-host && npm start &
cd client && npm start &
```

## 📋 支持的命令

### 系统命令
- `play_music` - 播放/暂停音乐
- `open_app` - 打开应用程序
- `system_info` - 获取系统信息

### 搜索命令
- `chrome_search` - Chrome搜索
- `arxiv_search` - 学术论文搜索
- `github_search` - 代码搜索

### 任务命令
- `execute_task` - 执行预定义任务
- `get_tasks` - 获取任务列表
- `cancel_task` - 取消任务

## 🔗 与Chrome扩展集成

Chrome扩展通过以下方式调用MCP服务：

```javascript
// 在background script中
chrome.runtime.sendMessage({
  type: 'MCP_REQUEST',
  command: 'play_music',
  query: '播放音乐'
});
```

## 📖 更多文档

- [实现计划](IMPLEMENTATION_PLAN.md)
- [架构说明](docs/architecture.md)
- [API文档](docs/api.md)
- [部署指南](docs/deployment.md)

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 📄 许可证

MIT License
