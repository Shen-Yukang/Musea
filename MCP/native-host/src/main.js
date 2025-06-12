#!/Users/shenyukang/.nvm/versions/node/v22.12.0/bin/node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * MCP Bridge - Native Messaging Host
 * 这就是你提到的Bridge，连接Chrome扩展和MCP Client
 */
class MCPBridge {
  constructor() {
    this.mcpClientPath = path.join(__dirname, '../../client/src/client.js');
    this.setupCommunication();

    console.error('MCP Bridge started'); // 使用stderr避免干扰Native Messaging
  }

  setupCommunication() {
    // 监听来自Chrome扩展的消息
    process.stdin.on('readable', () => {
      try {
        const message = this.readMessage();
        if (message) {
          this.handleMessage(message);
        }
      } catch (error) {
        console.error('Error reading message:', error);
        this.sendErrorResponse('Failed to read message');
      }
    });

    process.stdin.on('end', () => {
      console.error('Chrome extension disconnected');
      // 不要立即退出，让当前处理的消息完成
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
  }

  readMessage() {
    // Chrome Native Messaging 协议：前4字节是消息长度
    const lengthBuffer = process.stdin.read(4);
    if (!lengthBuffer) return null;

    const messageLength = lengthBuffer.readUInt32LE(0);
    const messageBuffer = process.stdin.read(messageLength);

    if (!messageBuffer || messageBuffer.length !== messageLength) {
      throw new Error(`Expected ${messageLength} bytes, got ${messageBuffer ? messageBuffer.length : 0}`);
    }

    const message = JSON.parse(messageBuffer.toString('utf8'));
    console.error('Received message:', JSON.stringify(message));
    return message;
  }

  async handleMessage(message) {
    try {
      console.error('Processing message:', message.command);

      // 调用MCP Client处理请求
      const result = await this.callMCPClient(message);
      this.sendResponse(result);

      console.error('Message processed successfully');
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendErrorResponse(error.message);
    }
  }

  callMCPClient(message) {
    return new Promise((resolve, reject) => {
      console.error('Calling MCP Client with:', this.mcpClientPath);

      const child = spawn('/Users/shenyukang/.nvm/versions/node/v22.12.0/bin/node', [this.mcpClientPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 发送消息到MCP Client
      child.stdin.write(JSON.stringify(message));
      child.stdin.end();

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        console.error('MCP Client stdout:', chunk);
      });

      child.stderr.on('data', data => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.error('MCP Client stderr:', chunk);
      });

      child.on('close', code => {
        console.error(`MCP Client exited with code: ${code}`);

        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse MCP Client response: ${parseError.message}`));
          }
        } else {
          reject(new Error(`MCP Client exited with code ${code}. Error: ${errorOutput}`));
        }
      });

      child.on('error', error => {
        console.error('Failed to spawn MCP Client:', error);
        reject(new Error(`Failed to spawn MCP Client: ${error.message}`));
      });
    });
  }

  sendResponse(response) {
    const message = JSON.stringify(response);
    const messageBuffer = Buffer.from(message, 'utf8');
    const lengthBuffer = Buffer.alloc(4);

    lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

    process.stdout.write(lengthBuffer);
    process.stdout.write(messageBuffer);

    console.error('Sent response:', JSON.stringify(response));
  }

  sendErrorResponse(errorMessage) {
    this.sendResponse({
      success: false,
      error: errorMessage,
      timestamp: Date.now(),
    });
  }
}

// 启动Bridge
new MCPBridge();
