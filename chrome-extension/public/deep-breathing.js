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

    // 初始化摄像头
    await this.initCamera();

    // 初始化关闭按钮状态
    this.initCloseButton();

    // 显示阈值超过原因
    this.displayReason();

    // 等待2秒后自动开始呼吸引导
    setTimeout(() => {
      this.startBreathing();
    }, 2000);
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

  async initCamera() {
    try {
      // 自动启用摄像头作为背景
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 },
        audio: false,
      });

      // 创建video元素作为背景
      const video = document.createElement('video');
      video.srcObject = this.cameraStream;
      video.autoplay = true;
      video.muted = true;
      video.id = 'backgroundVideo';

      // 添加到页面背景
      document.body.appendChild(video);

      console.log('Camera enabled as background');
    } catch (error) {
      console.error('Error accessing camera:', error);
      // 如果无法访问摄像头，使用默认背景
      document.body.classList.add('fallback-background');
    }
  }

  initCloseButton() {
    const closeBtn = document.getElementById('closeBtn');
    if (!closeBtn) {
      console.error('Close button not found');
      return;
    }

    // 绑定点击事件
    closeBtn.addEventListener('click', () => this.closeBreathing());

    closeBtn.disabled = true;
    closeBtn.style.opacity = '0.5';
    closeBtn.style.cursor = 'not-allowed';

    // 10秒后启用关闭按钮
    setTimeout(() => {
      if (closeBtn) {
        closeBtn.disabled = false;
        closeBtn.style.opacity = '1';
        closeBtn.style.cursor = 'pointer';
        closeBtn.textContent = '关闭';
      }
    }, 10000);
  }

  ensureCloseButtonWorks() {
    const closeBtn = document.getElementById('closeBtn');
    if (closeBtn) {
      // 确保关闭按钮的点击事件正常工作
      closeBtn.addEventListener('click', () => this.closeBreathing());
      console.log('Close button event handler attached');
    }
  }

  closeBreathing() {
    console.log('closeBreathing called');
    const closeBtn = document.getElementById('closeBtn');

    if (!closeBtn) {
      console.error('Close button not found');
      return;
    }

    if (closeBtn.disabled) {
      console.log('Close button is disabled');
      return;
    }

    console.log('Closing breathing session');
    this.goBack();
  }

  startBreathing() {
    if (this.isActive) return;

    this.isActive = true;

    // 隐藏开始界面，显示呼吸引导
    const startSection = document.getElementById('startSection');
    const breathingGuide = document.getElementById('breathingGuide');

    if (startSection) startSection.style.display = 'none';
    breathingGuide.classList.add('active');

    // 确保关闭按钮在呼吸开始后仍然可用
    this.ensureCloseButtonWorks();

    // 开始呼吸引导
    this.startBreathingGuide();

    // 开始会话计时器
    this.sessionTimer = setInterval(() => {
      this.remainingTime--;
      this.updateTimer();

      if (this.remainingTime <= 0) {
        this.completeSession();
      }
    }, 1000);
  }

  startBreathingGuide() {
    const breathingText = document.getElementById('breathingText');
    const breathingCircle = document.getElementById('breathingCircle');
    const countdownNumber = document.getElementById('countdownNumber');

    // 4-7-8 呼吸法：吸气4秒，屏息7秒，呼气8秒
    const phases = [
      { text: 'Breathe In', duration: 4, phase: 'inhale', countdown: 'down' },
      { text: 'Hold On', duration: 7, phase: 'hold', countdown: 'up' },
      { text: 'Breathe Out', duration: 8, phase: 'exhale', countdown: 'up' },
    ];

    let currentPhaseIndex = 0;

    const runPhase = () => {
      if (!this.isActive) return;

      const currentPhase = phases[currentPhaseIndex];
      breathingText.textContent = currentPhase.text;
      this.breathingPhase = currentPhase.phase;

      // 更新呼吸圆圈的动画状态
      breathingCircle.className = `breathing-circle ${currentPhase.phase}`;

      // 运行倒计时
      this.runCountdown(currentPhase, () => {
        currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
        runPhase();
      });
    };

    runPhase();
  }

  runCountdown(phase, callback) {
    const countdownNumber = document.getElementById('countdownNumber');
    let count = phase.countdown === 'down' ? phase.duration : 1;
    const target = phase.countdown === 'down' ? 1 : phase.duration;
    const increment = phase.countdown === 'down' ? -1 : 1;

    const updateCount = () => {
      if (!this.isActive) return;

      countdownNumber.textContent = count;

      if (count === target) {
        setTimeout(callback, 1000);
        return;
      }

      count += increment;
      setTimeout(updateCount, 1000);
    };

    updateCount();
  }

  updateTimer() {
    const minutes = Math.floor(this.remainingTime / 60);
    const seconds = this.remainingTime % 60;
    document.getElementById('timer').textContent = `剩余时间: ${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    document.getElementById('countdownNumber').textContent = '✓';

    // 移除呼吸圆圈的动画状态
    document.getElementById('breathingCircle').className = 'breathing-circle';

    // 3秒后自动返回
    setTimeout(() => {
      this.goBack();
    }, 3000);
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

// 页面加载完成后初始化
let breathingSession;

document.addEventListener('DOMContentLoaded', () => {
  breathingSession = new DeepBreathingSession();

  // 绑定开始按钮事件
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (breathingSession) {
        breathingSession.startBreathing();
      }
    });
  }
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  if (breathingSession && breathingSession.cameraStream) {
    breathingSession.cameraStream.getTracks().forEach(track => track.stop());
  }
});
