#!/bin/bash

# MCP 服务启动脚本

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 启动MCP服务..."
echo "📁 MCP根目录: $MCP_ROOT"

# 检查依赖
check_dependencies() {
    echo "🔍 检查依赖..."
    
    if ! command -v node >/dev/null 2>&1; then
        echo "❌ Node.js未安装"
        exit 1
    fi
    
    if [ ! -d "$MCP_ROOT/native-host/node_modules" ]; then
        echo "❌ Native Host依赖未安装，请运行 ./scripts/install.sh"
        exit 1
    fi
    
    if [ ! -d "$MCP_ROOT/client/node_modules" ]; then
        echo "❌ MCP Client依赖未安装，请运行 ./scripts/install.sh"
        exit 1
    fi
    
    echo "✅ 依赖检查通过"
}

# 创建PID文件目录
create_pid_dir() {
    mkdir -p "$MCP_ROOT/pids"
}

# 启动Native Host (测试模式)
start_native_host_test() {
    echo "🔧 启动Native Host测试模式..."
    
    cd "$MCP_ROOT/native-host"
    
    # 在后台启动，但保持输出
    NODE_ENV=development npm start &
    NATIVE_HOST_PID=$!
    echo $NATIVE_HOST_PID > "$MCP_ROOT/pids/native-host.pid"
    
    echo "✅ Native Host已启动 (PID: $NATIVE_HOST_PID)"
}

# 检查MCP Client依赖
check_mcp_client() {
    echo "🤖 检查MCP Client依赖..."

    cd "$MCP_ROOT/client"

    # 检查client.js是否存在
    if [ ! -f "src/client.js" ]; then
        echo "❌ MCP Client文件不存在: src/client.js"
        exit 1
    fi

    # 检查Node.js是否可用
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js未安装"
        exit 1
    fi

    echo "✅ MCP Client依赖检查通过"
}

# 显示状态
show_status() {
    echo ""
    echo "📊 服务状态:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -f "$MCP_ROOT/pids/native-host.pid" ]; then
        PID=$(cat "$MCP_ROOT/pids/native-host.pid")
        if ps -p $PID > /dev/null 2>&1; then
            echo "✅ Native Host: 运行中 (PID: $PID)"
        else
            echo "❌ Native Host: 已停止"
        fi
    else
        echo "❌ Native Host: 未启动"
    fi
    
    # MCP Client 不作为独立服务运行，由Native Host按需调用
    if [ -f "$MCP_ROOT/client/src/client.js" ]; then
        echo "✅ MCP Client: 就绪 (按需调用)"
    else
        echo "❌ MCP Client: 文件缺失"
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 停止所有服务
stop_all() {
    echo "🛑 停止所有MCP服务..."
    
    if [ -f "$MCP_ROOT/pids/native-host.pid" ]; then
        PID=$(cat "$MCP_ROOT/pids/native-host.pid")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            echo "✅ Native Host已停止"
        fi
        rm -f "$MCP_ROOT/pids/native-host.pid"
    fi
    
    # 清理可能存在的旧PID文件
    if [ -f "$MCP_ROOT/pids/mcp-client.pid" ]; then
        rm -f "$MCP_ROOT/pids/mcp-client.pid"
    fi
}

# 显示日志
show_logs() {
    echo "📝 显示最近的日志..."
    echo ""
    
    if [ -f "$MCP_ROOT/logs/native-host.log" ]; then
        echo "🔧 Native Host日志 (最近10行):"
        tail -n 10 "$MCP_ROOT/logs/native-host.log"
        echo ""
    fi
    
    if [ -f "$MCP_ROOT/logs/mcp-client.log" ]; then
        echo "🤖 MCP Client日志 (最近10行):"
        tail -n 10 "$MCP_ROOT/logs/mcp-client.log"
        echo ""
    fi
}

# 主菜单
show_menu() {
    echo ""
    echo "🎛️  MCP服务管理"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. 启动所有服务"
    echo "2. 停止所有服务"
    echo "3. 查看服务状态"
    echo "4. 查看日志"
    echo "5. 重启所有服务"
    echo "0. 退出"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 主程序
main() {
    # 检查参数
    case "${1:-menu}" in
        "start")
            check_dependencies
            check_mcp_client
            create_pid_dir
            start_native_host_test
            show_status
            echo ""
            echo "🎉 MCP服务已启动！"
            echo "📝 查看日志: ./scripts/start-all.sh logs"
            echo "🛑 停止服务: ./scripts/start-all.sh stop"
            ;;
        "stop")
            stop_all
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "restart")
            stop_all
            sleep 2
            check_dependencies
            check_mcp_client
            create_pid_dir
            start_native_host_test
            show_status
            ;;
        "menu")
            while true; do
                show_menu
                read -p "请选择操作 [0-5]: " choice
                case $choice in
                    1)
                        check_dependencies
                        check_mcp_client
                        create_pid_dir
                        start_native_host_test
                        show_status
                        ;;
                    2)
                        stop_all
                        ;;
                    3)
                        show_status
                        ;;
                    4)
                        show_logs
                        ;;
                    5)
                        stop_all
                        sleep 2
                        check_dependencies
                        check_mcp_client
                        create_pid_dir
                        start_native_host_test
                        show_status
                        ;;
                    0)
                        echo "👋 再见！"
                        exit 0
                        ;;
                    *)
                        echo "❌ 无效选择，请重试"
                        ;;
                esac
                echo ""
                read -p "按回车键继续..."
            done
            ;;
        *)
            echo "用法: $0 [start|stop|status|logs|restart|menu]"
            echo ""
            echo "命令说明:"
            echo "  start   - 启动所有服务"
            echo "  stop    - 停止所有服务"
            echo "  status  - 查看服务状态"
            echo "  logs    - 查看日志"
            echo "  restart - 重启所有服务"
            echo "  menu    - 显示交互菜单 (默认)"
            ;;
    esac
}

# 信号处理
trap 'echo ""; echo "🛑 收到中断信号，正在停止服务..."; stop_all; exit 0' INT TERM

# 运行主程序
main "$@"
