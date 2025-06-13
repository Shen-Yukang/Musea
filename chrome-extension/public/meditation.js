// 冥想页面逻辑
class MeditationSession {
  constructor() {
    this.isActive = false;
    this.isPaused = false;
    this.remainingTime = 0;
    this.totalDuration = 0;
    this.config = null;
    this.updateInterval = null;
    this.breathingInterval = null;
    this.breathingPhase = 'inhale'; // 'inhale' or 'exhale'
    
    this.initializeElements();
    this.loadMeditationConfig();
    this.setupEventListeners();
  }

  initializeElements() {
    this.elements = {
      sceneDisplay: document.getElementById('sceneDisplay'),
      sceneInfo: document.getElementById('sceneInfo'),
      timerText: document.getElementById('timerText'),
      timerProgress: document.getElementById('timerProgress'),
      breathingGuide: document.getElementById('breathingGuide'),
      breathingCircle: document.getElementById('breathingCircle'),
      breathingText: document.getElementById('breathingText'),
      pauseBtn: document.getElementById('pauseBtn'),
      resumeBtn: document.getElementById('resumeBtn'),
      stopBtn: document.getElementById('stopBtn'),
      completionMessage: document.getElementById('completionMessage'),
      completionStats: document.getElementById('completionStats'),
      closeBtn: document.getElementById('closeBtn')
    };
  }

  async loadMeditationConfig() {
    try {
      // 从Chrome存储中获取冥想配置
      const result = await chrome.storage.local.get(['meditation-storage-key']);
      this.config = result['meditation-storage-key'];
      
      if (this.config && this.config.isActive) {
        this.setupSession();
        this.startSession();
      } else {
        // 如果没有活跃的冥想会话，显示错误并关闭
        this.showError('没有找到活跃的冥想会话');
      }
    } catch (error) {
      console.error('Error loading meditation config:', error);
      this.showError('加载冥想配置失败');
    }
  }

  setupSession() {
    if (!this.config) return;

    // 设置场景信息
    const sceneConfig = this.getSceneConfig(this.config.selectedScene);
    this.elements.sceneDisplay.textContent = sceneConfig.icon;
    this.elements.sceneInfo.textContent = `${sceneConfig.name} - ${sceneConfig.description}`;

    // 计算剩余时间
    this.totalDuration = this.config.duration * 60; // 转换为秒
    if (this.config.endTime) {
      this.remainingTime = Math.max(0, Math.floor((this.config.endTime - Date.now()) / 1000));
    } else {
      this.remainingTime = this.totalDuration;
    }

    // 设置呼吸引导
    if (this.config.breathingGuide) {
      this.elements.breathingGuide.classList.add('active');
    }

    this.updateDisplay();
  }

  startSession() {
    this.isActive = true;
    this.isPaused = false;

    // 开始播放冥想音频
    this.startMeditationAudio();

    // 开始更新计时器
    this.updateInterval = setInterval(() => {
      if (!this.isPaused && this.remainingTime > 0) {
        this.remainingTime--;
        this.updateDisplay();

        if (this.remainingTime <= 0) {
          this.completeSession();
        }
      }
    }, 1000);

    // 开始呼吸引导
    if (this.config.breathingGuide) {
      this.startBreathingGuide();
    }

    // 更新按钮状态
    this.elements.pauseBtn.style.display = 'inline-block';
    this.elements.resumeBtn.style.display = 'none';
  }

  startBreathingGuide() {
    this.elements.breathingText.textContent = '深呼吸...';
    
    // 4秒吸气，4秒呼气的循环
    this.breathingInterval = setInterval(() => {
      if (this.breathingPhase === 'inhale') {
        this.elements.breathingCircle.classList.add('inhale');
        this.elements.breathingCircle.classList.remove('exhale');
        this.elements.breathingText.textContent = '吸气...';
        this.breathingPhase = 'exhale';
      } else {
        this.elements.breathingCircle.classList.add('exhale');
        this.elements.breathingCircle.classList.remove('inhale');
        this.elements.breathingText.textContent = '呼气...';
        this.breathingPhase = 'inhale';
      }
    }, 4000);
  }

  pauseSession() {
    this.isPaused = true;
    this.elements.pauseBtn.style.display = 'none';
    this.elements.resumeBtn.style.display = 'inline-block';
    this.elements.breathingText.textContent = '已暂停';
  }

  resumeSession() {
    this.isPaused = false;
    this.elements.pauseBtn.style.display = 'inline-block';
    this.elements.resumeBtn.style.display = 'none';
    if (this.config.breathingGuide) {
      this.elements.breathingText.textContent = '深呼吸...';
    }
  }

  async stopSession() {
    this.isActive = false;
    this.clearIntervals();

    // 停止冥想音频
    await this.stopMeditationAudio();

    try {
      // 更新存储状态
      await chrome.storage.local.set({
        'meditation-storage-key': {
          ...this.config,
          isActive: false,
          startTime: undefined,
          endTime: undefined
        }
      });

      // 关闭页面
      window.close();
    } catch (error) {
      console.error('Error stopping meditation:', error);
    }
  }

  async completeSession() {
    this.isActive = false;
    this.clearIntervals();
    
    try {
      // 记录完成的会话
      const completedDuration = this.config.duration;
      const updatedConfig = {
        ...this.config,
        isActive: false,
        startTime: undefined,
        endTime: undefined,
        completedSessions: this.config.completedSessions + 1,
        totalMeditationTime: this.config.totalMeditationTime + completedDuration,
        lastSessionDate: new Date().toISOString().split('T')[0]
      };
      
      await chrome.storage.local.set({
        'meditation-storage-key': updatedConfig
      });
      
      // 显示完成消息
      this.showCompletionMessage(completedDuration);
    } catch (error) {
      console.error('Error completing meditation:', error);
    }
  }

  showCompletionMessage(duration) {
    this.elements.completionStats.innerHTML = `
      恭喜你完成了 ${duration} 分钟的冥想<br>
      你的大脑得到了很好的放松<br>
      杏仁核活跃度降低，压力得到缓解
    `;
    this.elements.completionMessage.style.display = 'flex';
  }

  updateDisplay() {
    // 更新计时器文本
    const minutes = Math.floor(this.remainingTime / 60);
    const seconds = this.remainingTime % 60;
    this.elements.timerText.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 更新进度圆环
    const progress = this.totalDuration > 0 ? 
      ((this.totalDuration - this.remainingTime) / this.totalDuration) * 100 : 0;
    const circumference = 2 * Math.PI * 150; // 半径150
    const offset = circumference - (progress / 100) * circumference;
    this.elements.timerProgress.style.strokeDashoffset = offset;
  }

  clearIntervals() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.breathingInterval) {
      clearInterval(this.breathingInterval);
      this.breathingInterval = null;
    }
  }

  setupEventListeners() {
    this.elements.pauseBtn.addEventListener('click', () => this.pauseSession());
    this.elements.resumeBtn.addEventListener('click', () => this.resumeSession());
    this.elements.stopBtn.addEventListener('click', () => this.stopSession());
    this.elements.closeBtn.addEventListener('click', () => window.close());
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      switch(e.key) {
        case ' ': // 空格键暂停/继续
          e.preventDefault();
          if (this.isPaused) {
            this.resumeSession();
          } else {
            this.pauseSession();
          }
          break;
        case 'Escape': // ESC键停止
          this.stopSession();
          break;
      }
    });

    // 页面关闭时清理
    window.addEventListener('beforeunload', () => {
      this.clearIntervals();
    });
  }

  getSceneConfig(scene) {
    const sceneConfigs = {
      'forest': { name: '森林', icon: '🌲', description: '鸟鸣与树叶沙沙声' },
      'ocean': { name: '海洋', icon: '🌊', description: '海浪轻拍海岸声' },
      'rain': { name: '雨声', icon: '🌧️', description: '温柔的雨滴声' },
      'birds': { name: '鸟鸣', icon: '🐦', description: '清晨鸟儿歌唱' },
      'cafe': { name: '咖啡厅', icon: '☕', description: '温馨的咖啡厅环境音' },
      'library': { name: '图书馆', icon: '📚', description: '安静的学习氛围' },
      'white_noise': { name: '白噪音', icon: '🔊', description: '纯净的白噪音' },
      'temple': { name: '寺庙', icon: '🏯', description: '宁静的寺庙钟声' },
      'singing_bowl': { name: '颂钵', icon: '🎵', description: '治愈的颂钵音' },
      'silent': { name: '静音', icon: '🤫', description: '完全安静的冥想' }
    };
    
    return sceneConfigs[scene] || sceneConfigs['forest'];
  }

  showError(message) {
    alert(message);
    window.close();
  }

  // 开始播放冥想音频
  async startMeditationAudio() {
    try {
      if (!this.config || this.config.selectedScene === 'silent') {
        console.log('Silent meditation or no config, skipping audio');
        return;
      }

      // 向background script发送播放音频的消息
      await chrome.runtime.sendMessage({
        type: 'PLAY_MEDITATION_AUDIO',
        scene: this.config.selectedScene,
        volume: this.config.volume,
        loop: true
      });

      console.log('Meditation audio started for scene:', this.config.selectedScene);
    } catch (error) {
      console.error('Error starting meditation audio:', error);
      // 音频播放失败不应该阻止冥想继续
    }
  }

  // 停止播放冥想音频
  async stopMeditationAudio() {
    try {
      // 向background script发送停止音频的消息
      await chrome.runtime.sendMessage({
        type: 'STOP_MEDITATION_AUDIO'
      });

      console.log('Meditation audio stopped');
    } catch (error) {
      console.error('Error stopping meditation audio:', error);
      // 音频停止失败不应该阻止其他操作
    }
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new MeditationSession();
});
