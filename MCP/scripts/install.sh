#!/bin/bash

# MCP 安装脚本

set -e

echo "🚀 开始安装MCP服务..."

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📁 MCP根目录: $MCP_ROOT"

# 创建日志目录
echo "📝 创建日志目录..."
mkdir -p "$MCP_ROOT/logs"

# 安装Native Host依赖
echo "📦 安装Native Host依赖..."
cd "$MCP_ROOT/native-host"
npm install

# 安装MCP Client依赖
echo "📦 安装MCP Client依赖..."
cd "$MCP_ROOT/client"
npm install

# 设置Native Messaging Host
echo "🔧 设置Native Messaging Host..."
cd "$MCP_ROOT"
./scripts/setup-native-host.sh

echo "✅ MCP服务安装完成！"
echo ""
echo "🎯 下一步："
echo "1. 更新Chrome扩展ID在native host配置中"
echo "2. 运行 './scripts/start-all.sh' 启动服务"
echo "3. 在Chrome扩展中测试MCP功能"
