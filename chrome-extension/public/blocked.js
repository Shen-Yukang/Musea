// 获取被阻止的URL
function getBlockedUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const blockedUrl = urlParams.get('url');
  if (blockedUrl) {
    document.getElementById('blockedUrl').textContent = decodeURIComponent(blockedUrl);
  } else {
    document.getElementById('blockedUrl').textContent = '未知网站';
  }
}

// 返回上一页
function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
}

// 打开设置页面
function openSettings() {
  chrome.runtime.sendMessage({
    type: 'OPEN_SETTINGS',
  });
}

// 滚动到脑科学教育部分
function scrollToBrainEducation() {
  document.getElementById('brainEducation').scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
  // 隐藏滚动指示器
  const indicator = document.getElementById('scrollIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

// 滚动到阻止页面部分
function scrollToBlocked() {
  document.getElementById('blockedSection').scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

// 大脑区域交互
function initBrainAreaInteraction() {
  const brainAreas = document.querySelectorAll('.brain-area');

  brainAreas.forEach(area => {
    area.addEventListener('click', function () {
      // 移除其他区域的active状态
      brainAreas.forEach(a => a.classList.remove('active'));
      // 添加当前区域的active状态
      this.classList.add('active');

      // 可以在这里添加更多交互效果
      const areaType = this.getAttribute('data-area');
      showAreaDetails(areaType);
    });
  });
}

// 显示区域详细信息
function showAreaDetails(areaType) {
  const details = {
    dopamine: '多巴胺系统被设计成寻求新奇和奖励。社交媒体利用这一点，通过点赞、评论等随机奖励机制让你上瘾。',
    pfc: '前额叶皮层负责自控和决策。当你疲劳或压力大时，这个区域功能下降，让你更容易屈服于诱惑。',
    attention: '注意力是有限资源。现代应用通过红点、推送等方式不断争夺你的注意力，导致注意力碎片化。',
    habit: '大脑喜欢自动化。重复的分心行为会形成神经回路，让分心变成无意识的习惯。',
  };

  // 这里可以显示一个提示框或更新页面内容
  console.log(`${areaType}: ${details[areaType]}`);
}

// 自动滚动到教育内容
function autoScrollToEducation() {
  // 延迟一点时间，让页面完全加载
  setTimeout(() => {
    // 检查是否是第一次访问（可以通过sessionStorage来判断）
    const hasSeenEducation = sessionStorage.getItem('hasSeenBrainEducation');

    if (!hasSeenEducation) {
      // 自动滚动到教育部分
      scrollToBrainEducation();
      // 标记已经看过教育内容
      sessionStorage.setItem('hasSeenBrainEducation', 'true');

      // 3秒后显示滚动指示器
      setTimeout(() => {
        const indicator = document.getElementById('scrollIndicator');
        if (indicator) {
          indicator.style.display = 'block';
        }
      }, 3000);
    } else {
      // 如果已经看过，直接显示阻止页面
      scrollToBlocked();
    }
  }, 500);
}

// 添加淡入动画
function addFadeInAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
      }
    });
  });

  // 观察所有需要动画的元素
  document.querySelectorAll('.brain-area, .fade-in').forEach(el => {
    observer.observe(el);
  });
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', function () {
  getBlockedUrl();

  // 添加事件监听器
  document.getElementById('goBackBtn').addEventListener('click', function (e) {
    e.preventDefault();
    goBack();
  });

  document.getElementById('openSettingsBtn').addEventListener('click', function (e) {
    e.preventDefault();
    openSettings();
  });

  // 初始化新功能
  initBrainAreaInteraction();
  addFadeInAnimations();
  autoScrollToEducation();

  // 监听滚动事件，控制滚动指示器的显示
  window.addEventListener('scroll', function () {
    const indicator = document.getElementById('scrollIndicator');
    const brainSection = document.getElementById('brainEducation');
    const blockedSection = document.getElementById('blockedSection');

    if (indicator && brainSection && blockedSection) {
      const brainRect = brainSection.getBoundingClientRect();
      const blockedRect = blockedSection.getBoundingClientRect();

      // 如果在脑科学教育部分，显示指示器
      if (brainRect.top <= window.innerHeight && brainRect.bottom >= 0) {
        indicator.style.display = 'block';
      }
      // 如果在阻止页面部分，隐藏指示器
      else if (blockedRect.top <= window.innerHeight) {
        indicator.style.display = 'none';
      }
    }
  });
});

// 全局函数，供HTML调用
window.scrollToBrainEducation = scrollToBrainEducation;
window.scrollToBlocked = scrollToBlocked;
