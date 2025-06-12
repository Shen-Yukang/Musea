#!/bin/bash

# Native Messaging Host 设置脚本

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(dirname "$SCRIPT_DIR")"

# Native Host配置
HOST_NAME="com.yourcompany.mcp_bridge"
NATIVE_HOST_PATH="$MCP_ROOT/native-host/src/main.js"

echo "🔧 设置Native Messaging Host..."
echo "Host名称: $HOST_NAME"
echo "Host路径: $NATIVE_HOST_PATH"

# 创建Native Host配置文件
create_host_manifest() {
    cat > "$MCP_ROOT/native-host/config/manifest.json" << EOF
{
  "name": "$HOST_NAME",
  "description": "MCP Bridge for Chrome Extension",
  "path": "$NATIVE_HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://your-extension-id-here/"
  ]
}
EOF
}

# 根据操作系统设置Native Host
setup_for_platform() {
    case "$(uname -s)" in
        Darwin)
            echo "🍎 检测到macOS系统"
            HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
            ;;
        Linux)
            echo "🐧 检测到Linux系统"
            HOST_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)
            echo "🪟 检测到Windows系统"
            echo "⚠️  Windows系统需要手动设置注册表"
            echo "请参考文档进行Windows配置"
            return 1
            ;;
        *)
            echo "❌ 不支持的操作系统"
            return 1
            ;;
    esac
    
    # 创建目录
    mkdir -p "$HOST_DIR"
    
    # 创建配置文件
    mkdir -p "$MCP_ROOT/native-host/config"
    create_host_manifest
    
    # 复制配置文件到系统目录
    cp "$MCP_ROOT/native-host/config/manifest.json" "$HOST_DIR/$HOST_NAME.json"
    
    echo "✅ Native Host配置已安装到: $HOST_DIR/$HOST_NAME.json"
}

# 验证安装
verify_installation() {
    if [ -f "$HOST_DIR/$HOST_NAME.json" ]; then
        echo "✅ Native Host配置文件存在"
        
        # 检查Node.js
        if command -v node >/dev/null 2>&1; then
            echo "✅ Node.js已安装: $(node --version)"
        else
            echo "❌ Node.js未安装，请先安装Node.js"
            return 1
        fi
        
        # 检查主程序文件
        if [ -f "$NATIVE_HOST_PATH" ]; then
            echo "✅ Native Host主程序存在"
        else
            echo "❌ Native Host主程序不存在: $NATIVE_HOST_PATH"
            return 1
        fi
        
        echo "🎉 Native Host设置完成！"
        echo ""
        echo "⚠️  重要提醒："
        echo "1. 请更新配置文件中的Chrome扩展ID"
        echo "   文件位置: $HOST_DIR/$HOST_NAME.json"
        echo "2. 重启Chrome浏览器以加载新的Native Host配置"
        
    else
        echo "❌ Native Host配置文件安装失败"
        return 1
    fi
}

# 主执行流程
main() {
    echo "开始设置Native Messaging Host..."
    
    if setup_for_platform; then
        verify_installation
    else
        echo "❌ Native Host设置失败"
        exit 1
    fi
}

# 运行主程序
main
