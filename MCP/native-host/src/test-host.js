#!/Users/shenyukang/.nvm/versions/node/v22.12.0/bin/node

/**
 * 简单的测试 Native Host
 * 用于验证 Chrome 扩展与 Native Host 的基本连接
 */

console.error('Test Native Host started');

// 读取消息的函数
function readMessage() {
  const lengthBuffer = process.stdin.read(4);
  if (!lengthBuffer) return null;

  const messageLength = lengthBuffer.readUInt32LE(0);
  console.error(`Message length: ${messageLength}`);

  const messageBuffer = process.stdin.read(messageLength);
  if (!messageBuffer || messageBuffer.length !== messageLength) {
    throw new Error(`Expected ${messageLength} bytes, got ${messageBuffer ? messageBuffer.length : 0}`);
  }

  const message = JSON.parse(messageBuffer.toString('utf8'));
  console.error('Received message:', JSON.stringify(message));
  return message;
}

// 发送响应的函数
function sendResponse(response) {
  const message = JSON.stringify(response);
  const messageBuffer = Buffer.from(message, 'utf8');
  const lengthBuffer = Buffer.alloc(4);

  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

  process.stdout.write(lengthBuffer);
  process.stdout.write(messageBuffer);

  console.error('Sent response:', JSON.stringify(response));
}

// 监听输入
process.stdin.on('readable', () => {
  try {
    const message = readMessage();
    if (message) {
      console.error('Processing test message...');

      // 简单的测试响应
      const response = {
        success: true,
        data: {
          message: 'Test Native Host is working!',
          receivedCommand: message.command,
          receivedQuery: message.query,
          timestamp: Date.now(),
        },
        source: 'test-host',
      };

      sendResponse(response);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    sendResponse({
      success: false,
      error: error.message,
      source: 'test-host',
    });
  }
});

process.stdin.on('end', () => {
  console.error('Chrome extension disconnected');
  process.exit(0);
});

console.error('Test Native Host ready for messages');
