#!/usr/bin/env node

/**
 * 测试Chrome扩展与MCP系统的完整集成
 * 模拟Chrome扩展发送的消息格式
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

function readNativeResponse(buffer) {
  if (buffer.length < 4) {
    return null;
  }

  const messageLength = buffer.readUInt32LE(0);
  if (buffer.length < 4 + messageLength) {
    return null;
  }

  const messageData = buffer.slice(4, 4 + messageLength);
  const remainingData = buffer.slice(4 + messageLength);

  return {
    message: JSON.parse(messageData.toString('utf8')),
    remaining: remainingData,
  };
}

async function testChromeExtensionMCPIntegration() {
  console.log('🧪 测试Chrome扩展与MCP系统的完整集成...\n');

  const bridgePath = path.join(__dirname, 'native-host/src/main.js');

  const tests = [
    {
      name: '系统信息查询',
      message: {
        requestId: 'chrome_test_001',
        command: 'system_info',
        query: '获取系统信息',
        timestamp: Date.now(),
      },
    },
    {
      name: '播放音乐',
      message: {
        requestId: 'chrome_test_002',
        command: 'play_music',
        query: '播放音乐',
        timestamp: Date.now(),
      },
    },
    {
      name: '打开应用',
      message: {
        requestId: 'chrome_test_003',
        command: 'open_app',
        query: 'calculator',
        timestamp: Date.now(),
      },
    },
    {
      name: 'Chrome搜索',
      message: {
        requestId: 'chrome_test_004',
        command: 'chrome_search',
        query: 'Node.js MCP',
        timestamp: Date.now(),
      },
    },
  ];

  for (const test of tests) {
    console.log(`📋 测试: ${test.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const result = await runSingleTest(bridgePath, test.message);
      console.log('✅ 测试成功!');
      console.log('📊 响应:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('❌ 测试失败:', error.message);
    }

    console.log('');
  }

  console.log('🎉 所有测试完成!');
}

function runSingleTest(bridgePath, message) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [bridgePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let outputBuffer = Buffer.alloc(0);
    let errorOutput = '';

    console.log('📤 发送消息:', JSON.stringify(message));

    child.stdout.on('data', data => {
      outputBuffer = Buffer.concat([outputBuffer, data]);
    });

    child.stderr.on('data', data => {
      const chunk = data.toString();
      errorOutput += chunk;
      console.log('📝 Bridge日志:', chunk.trim());
    });

    child.on('close', code => {
      console.log('🏁 Bridge进程退出，代码:', code);

      if (code === 0 && outputBuffer.length > 0) {
        try {
          const response = readNativeResponse(outputBuffer);
          if (response) {
            resolve(response.message);
          } else {
            reject(new Error('无法解析响应数据'));
          }
        } catch (parseError) {
          reject(new Error(`解析响应失败: ${parseError.message}`));
        }
      } else {
        reject(new Error(`Bridge退出异常 (代码: ${code}): ${errorOutput}`));
      }
    });

    child.on('error', error => {
      reject(new Error(`启动Bridge失败: ${error.message}`));
    });

    // 发送消息
    sendNativeMessage(child, message);
    child.stdin.end();
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testChromeExtensionMCPIntegration().catch(console.error);
}
