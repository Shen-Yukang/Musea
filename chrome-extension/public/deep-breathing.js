class DeepBreathingSession {
  constructor() {
    this.isActive = false;
    this.duration = 5 * 60; // 5分钟
    this.remainingTime = this.duration;
    this.breathingPhase = 'inhale'; // 'inhale', 'hold', 'exhale'
    this.breathingTimer = null;
    this.sessionTimer = null;
    this.cameraStream = null;
    this.isRecording = false;

    this.init();
  }

  async init() {
    // 获取URL参数
    this.parseUrlParams();

    // 加载自定义消息
    await this.loadCustomMessage();

    // 创建浮动粒子
    this.createFloatingParticles();

    // 初始化跳过按钮状态
    this.initSkipButton();

    // 显示阈值超过原因
    this.displayReason();
  }

  parseUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    this.blockedUrl = urlParams.get('url') || '未知网站';
    this.reason = urlParams.get('reason') || '访问频率过高';
  }

  displayReason() {
    const reasonDisplay = document.getElementById('reasonDisplay');
    if (reasonDisplay) {
      reasonDisplay.innerHTML = `
        <strong>触发原因:</strong> ${this.reason}<br>
        <strong>网站:</strong> ${this.blockedUrl}
      `;
    }
  }

  async loadCustomMessage() {
    try {
      // 从存储中获取自定义消息
      const result = await chrome.storage.local.get(['visit-monitor-storage-key']);
      const config = result['visit-monitor-storage-key'];

      const customMessage = config?.customMessage || '您今天已经过度浏览了这些网站，让我们一起深呼吸，重新专注吧！';

      document.getElementById('customMessage').textContent = customMessage;
    } catch (error) {
      console.error('Error loading custom message:', error);
      document.getElementById('customMessage').textContent = '让我们暂停一下，通过深呼吸来重新获得专注力。';
    }
  }

  createFloatingParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = 4 + Math.random() * 4 + 's';
      particlesContainer.appendChild(particle);
    }
  }

  initSkipButton() {
    const skipBtn = document.getElementById('skipBtn');
    skipBtn.disabled = true;
    skipBtn.style.opacity = '0.5';
    skipBtn.style.cursor = 'not-allowed';

    // 10秒后启用跳过按钮
    setTimeout(() => {
      skipBtn.disabled = false;
      skipBtn.style.opacity = '1';
      skipBtn.style.cursor = 'pointer';
      skipBtn.textContent = '跳过';
    }, 10000);
  }

  async toggleCamera() {
    const cameraBtn = document.getElementById('cameraBtn');
    const cameraPreview = document.getElementById('cameraPreview');

    if (!this.cameraStream) {
      try {
        // 请求摄像头权限
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 300, height: 200 },
          audio: false,
        });

        // 创建video元素
        const video = document.createElement('video');
        video.srcObject = this.cameraStream;
        video.autoplay = true;
        video.muted = true;

        // 清空预览区域并添加视频
        cameraPreview.innerHTML = '';
        cameraPreview.appendChild(video);

        cameraBtn.textContent = '关闭摄像头';
        console.log('Camera enabled for focus monitoring');
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('无法访问摄像头，请检查权限设置');
      }
    } else {
      // 关闭摄像头
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;

      cameraPreview.innerHTML = '<div class="camera-placeholder">摄像头已关闭</div>';
      cameraBtn.textContent = '启用摄像头';
    }
  }

  startBreathing() {
    if (this.isActive) return;

    this.isActive = true;
    document.getElementById('startBtn').textContent = '进行中...';
    document.getElementById('startBtn').disabled = true;

    // 开始呼吸引导
    this.startBreathingGuide();

    // 开始会话计时器
    this.sessionTimer = setInterval(() => {
      this.remainingTime--;
      this.updateTimer();
      this.updateProgress();

      if (this.remainingTime <= 0) {
        this.completeSession();
      }
    }, 1000);
  }

  startBreathingGuide() {
    const breathingText = document.getElementById('breathingText');
    const phases = [
      { text: '慢慢吸气...', duration: 4000, phase: 'inhale' },
      { text: '屏住呼吸...', duration: 2000, phase: 'hold' },
      { text: '慢慢呼气...', duration: 6000, phase: 'exhale' },
    ];

    let currentPhaseIndex = 0;

    const cycleBreathing = () => {
      if (!this.isActive) return;

      const currentPhase = phases[currentPhaseIndex];
      breathingText.textContent = currentPhase.text;
      this.breathingPhase = currentPhase.phase;

      setTimeout(() => {
        currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
        cycleBreathing();
      }, currentPhase.duration);
    };

    cycleBreathing();
  }

  updateTimer() {
    const minutes = Math.floor(this.remainingTime / 60);
    const seconds = this.remainingTime % 60;
    document.getElementById('timer').textContent = `剩余时间: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  updateProgress() {
    const progress = ((this.duration - this.remainingTime) / this.duration) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
  }

  completeSession() {
    this.isActive = false;

    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }

    // 显示完成消息
    document.getElementById('breathingText').textContent = '深呼吸完成！您现在可以继续专注工作了。';
    document.getElementById('timer').textContent = '会话完成';

    // 更新按钮
    const startBtn = document.getElementById('startBtn');
    startBtn.textContent = '返回';
    startBtn.disabled = false;
    startBtn.onclick = () => this.goBack();

    // 关闭摄像头
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }

    // 3秒后自动返回
    setTimeout(() => {
      this.goBack();
    }, 3000);
  }

  skipBreathing() {
    if (document.getElementById('skipBtn').disabled) {
      return;
    }

    this.goBack();
  }

  goBack() {
    // 关闭摄像头
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }

    // 返回上一页或关闭标签页
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }

  openSettings() {
    chrome.runtime.sendMessage({
      type: 'OPEN_SETTINGS',
    });
  }
}

// 全局函数供HTML调用
let breathingSession;

function startBreathing() {
  breathingSession.startBreathing();
}

function skipBreathing() {
  breathingSession.skipBreathing();
}

function toggleCamera() {
  breathingSession.toggleCamera();
}

function openSettings() {
  breathingSession.openSettings();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  breathingSession = new DeepBreathingSession();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  if (breathingSession && breathingSession.cameraStream) {
    breathingSession.cameraStream.getTracks().forEach(track => track.stop());
  }
});
