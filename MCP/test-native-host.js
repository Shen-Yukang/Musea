#!/usr/bin/env node

/**
 * 测试Native Host的脚本
 * 模拟Chrome扩展发送Native Messaging协议格式的消息
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sendNativeMessage(child, message) {
  const messageStr = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageStr, 'utf8');
  const lengthBuffer = Buffer.alloc(4);

  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

  child.stdin.write(lengthBuffer);
  child.stdin.write(messageBuffer);
}

function testNativeHost() {
  console.log('🧪 测试Native Host...');

  const nativeHostPath = path.join(__dirname, 'native-host/src/main.js');

  const child = spawn('node', [nativeHostPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let output = '';
  let errorOutput = '';

  child.stdout.on('data', data => {
    output += data.toString();
    console.log('📤 Native Host输出:', data.toString());
  });

  child.stderr.on('data', data => {
    errorOutput += data.toString();
    console.log('📝 Native Host日志:', data.toString());
  });

  child.on('close', code => {
    console.log(`🏁 Native Host退出，代码: ${code}`);
    if (code !== 0) {
      console.error('❌ 错误输出:', errorOutput);
    }
  });

  child.on('error', error => {
    console.error('❌ 启动Native Host失败:', error);
  });

  // 等待一下让Native Host启动
  setTimeout(() => {
    console.log('📨 发送测试消息...');

    // 发送系统信息请求
    sendNativeMessage(child, {
      requestId: 'test-system-info',
      command: 'system_info',
    });

    // 5秒后关闭
    setTimeout(() => {
      console.log('🛑 关闭测试...');
      child.stdin.end();
    }, 5000);
  }, 1000);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testNativeHost();
}
