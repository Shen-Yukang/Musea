#!/usr/bin/env node

const MCPClient = require('./client/src/client.js');

// 创建客户端实例
const client = new MCPClient();

// 测试用例
const testCases = [
  { command: '打开音乐', expected: 'play_music' },
  { command: '播放音乐', expected: 'play_music' },
  { command: '听音乐', expected: 'play_music' },
  { command: '开始播放', expected: 'play_music' },
  { command: '播放歌曲', expected: 'play_music' },
  { command: 'play music', expected: 'play_music' },
  { command: '打开计算器', expected: 'open_app' },
  { command: '打开浏览器', expected: 'open_app' },
  { command: '搜索天气', expected: 'chrome_search' },
  { command: '系统信息', expected: 'system_info' },
];

console.log('🧪 测试意图解析功能\n');

testCases.forEach((testCase, index) => {
  const intent = client.parseIntent(testCase.command);
  const passed = intent.action === testCase.expected;

  console.log(`测试 ${index + 1}: "${testCase.command}"`);
  console.log(`  期望: ${testCase.expected}`);
  console.log(`  实际: ${intent.action}`);
  console.log(`  结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
  console.log('');
});

console.log('测试完成！');
