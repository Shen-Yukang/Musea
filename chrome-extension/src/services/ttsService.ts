import { ttsConfigStorage } from '@extension/storage';
import { TTS, ERROR_MESSAGES } from '../constants/index.js';

// TTS API响应接口
interface TTSResponse {
  reqid: string;
  code: number;
  operation: string;
  message: string;
  sequence: number;
  data?: string; // base64编码的音频数据
  addition?: {
    duration: string;
  };
}

// TTS请求接口
interface TTSRequest {
  app: {
    appid: string;
    cluster: string;
  };
  user: {
    uid: string;
  };
  audio: {
    voice_type: string;
    encoding: string;
    speed_ratio: number;
  };
  request: {
    reqid: string;
    text: string;
    operation: string;
  };
}

export class TTSService {
  private static readonly API_URL = TTS.API_URL;

  /**
   * 生成语音并返回base64音频数据
   */
  static async generateSpeech(text: string): Promise<string | null> {
    try {
      // 获取TTS配置
      const config = await ttsConfigStorage.get();

      // 检查是否启用TTS
      if (!config.enabled) {
        console.log('TTS is disabled');
        return null;
      }

      // 检查配置是否完整
      if (!config.appid || !config.token) {
        console.error('TTS configuration is incomplete');
        return null;
      }

      // 生成请求ID
      const reqid = `chrome_ext_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // 构建请求数据
      const requestData: TTSRequest = {
        app: {
          appid: config.appid,
          cluster: config.cluster,
        },
        user: {
          uid: config.uid,
        },
        audio: {
          voice_type: config.voiceType,
          encoding: config.encoding,
          speed_ratio: config.speedRatio,
        },
        request: {
          reqid,
          text,
          operation: 'query',
        },
      };

      console.log('Sending TTS request:', { reqid, text });

      // 发送请求
      const response = await fetch(TTSService.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer; ${config.token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TTSResponse = await response.json();

      // 检查响应状态
      if (result.code !== 3000) {
        throw new Error(`TTS API error: ${result.message} (code: ${result.code})`);
      }

      // 检查是否有音频数据
      if (!result.data) {
        throw new Error('No audio data received from TTS API');
      }

      console.log('TTS generation successful:', {
        reqid: result.reqid,
        duration: result.addition?.duration,
        dataLength: result.data.length,
      });

      // 直接返回base64数据，让offscreen document处理URL创建
      return result.data;
    } catch (error) {
      console.error('Error generating speech:', error);
      return null;
    }
  }

  /**
   * 测试TTS配置是否有效
   */
  static async testConfiguration(): Promise<boolean> {
    try {
      const testText = '测试语音合成';
      const audioData = await TTSService.generateSpeech(testText);

      return audioData !== null;
    } catch (error) {
      console.error('TTS configuration test failed:', error);
      return false;
    }
  }
}
