#!/usr/bin/env node

/**
 * 测试Native Messaging Bridge的工具
 * 模拟Chrome扩展发送Native Messaging格式的消息
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sendNativeMessage(message) {
  return new Promise((resolve, reject) => {
    const bridgePath = path.join(__dirname, 'native-host/src/main.js');
    const child = spawn('node', [bridgePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // 准备Native Messaging格式的消息
    const messageStr = JSON.stringify(message);
    const messageBuffer = Buffer.from(messageStr, 'utf8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

    console.log('发送消息:', message);
    console.log('消息长度:', messageBuffer.length);

    // 发送长度头 + 消息内容
    child.stdin.write(lengthBuffer);
    child.stdin.write(messageBuffer);
    child.stdin.end();

    let output = null; // 改为Buffer类型
    let errorOutput = '';

    child.stdout.on('data', data => {
      // 直接收集Buffer数据，避免字符串转换问题
      if (!output) output = Buffer.alloc(0);
      output = Buffer.concat([output, data]);
    });

    child.stderr.on('data', data => {
      errorOutput += data.toString();
      console.log('Bridge stderr:', data.toString());
    });

    child.on('close', code => {
      console.log('Bridge进程退出，代码:', code);

      if (code === 0 && output && output.length > 0) {
        try {
          // 解析Native Messaging响应
          if (output.length >= 4) {
            const responseLength = output.readUInt32LE(0);
            console.log('响应长度:', responseLength);

            if (output.length >= 4 + responseLength) {
              const responseMessage = output.slice(4, 4 + responseLength).toString('utf8');
              console.log('响应消息:', responseMessage);
              const response = JSON.parse(responseMessage);
              resolve(response);
            } else {
              reject(new Error(`响应数据不完整: 期望${4 + responseLength}字节，实际${output.length}字节`));
            }
          } else {
            reject(new Error('响应格式错误：长度不足4字节'));
          }
        } catch (parseError) {
          console.log('原始输出Buffer:', output);
          console.log('原始输出字符串:', output.toString('utf8'));
          reject(new Error(`解析响应失败: ${parseError.message}`));
        }
      } else {
        reject(new Error(`Bridge失败: ${errorOutput}`));
      }
    });

    child.on('error', error => {
      reject(new Error(`启动Bridge失败: ${error.message}`));
    });
  });
}

async function testBridge() {
  console.log('🧪 开始测试MCP Bridge...\n');

  const tests = [
    {
      name: '系统信息',
      message: {
        requestId: 'test-system-info',
        command: 'system_info',
      },
    },
    {
      name: 'Chrome搜索',
      message: {
        requestId: 'test-search',
        command: 'chrome_search',
        query: 'Node.js MCP',
      },
    },
    {
      name: '打开计算器',
      message: {
        requestId: 'test-calculator',
        command: 'open_app',
        query: 'calculator',
      },
    },
  ];

  for (const test of tests) {
    try {
      console.log(`\n📋 测试: ${test.name}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await sendNativeMessage(test.message);

      console.log('✅ 测试成功!');
      console.log('响应:', JSON.stringify(response, null, 2));
    } catch (error) {
      console.log('❌ 测试失败:', error.message);
    }
  }

  console.log('\n🎉 Bridge测试完成!');
}

// 运行测试
testBridge().catch(console.error);
