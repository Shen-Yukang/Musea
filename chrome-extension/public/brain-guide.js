document.addEventListener('DOMContentLoaded', function () {
  const brainData = {
    pfc: {
      title: '前额叶皮层 (PFC)：大脑的"CEO"',
      description:
        'PFC负责决策、规划和冲动控制。慢性压力会削弱它的功能，导致你难以做出明智选择，容易"明知故犯"，比如沉迷于刷手机和垃圾食品。',
      chartData: {
        labels: ['正常状态', '压力状态'],
        values: [90, 45],
        label: '决策与自控能力',
        color: 'rgba(59, 130, 246, 0.6)',
      },
    },
    amygdala: {
      title: '杏仁核："情绪警报器"',
      description:
        '杏仁核处理恐惧和焦虑。压力会使其过度活跃，让你长期处于紧张和警觉状态，更容易情绪失控或被负面情绪"劫持"。',
      chartData: {
        labels: ['正常状态', '压力状态'],
        values: [30, 85],
        label: '警觉与焦虑水平',
        color: 'rgba(239, 68, 68, 0.6)',
      },
    },
    hippocampus: {
      title: '海马体："记忆图书馆"',
      description:
        '海马体负责学习、记忆和情绪调节。慢性压力会导致其萎缩，让你记忆力下降、感到"脑雾"，并干扰饱腹感信号，导致暴饮暴食。',
      chartData: {
        labels: ['正常状态', '压力状态'],
        values: [100, 70],
        label: '记忆与学习效率',
        color: 'rgba(34, 197, 94, 0.6)',
      },
    },
    reward: {
      title: '奖赏系统："动力引擎"',
      description:
        '由多巴胺驱动，让我们寻求愉悦。压力会耗尽多巴胺，使你动力不足。垃圾食品和手机能短暂提供大量多巴胺，但这会使系统更不敏感，形成恶性依赖。',
      chartData: {
        labels: ['健康奖励', '垃圾食品/手机'],
        values: [40, 100],
        label: '多巴胺释放强度',
        color: 'rgba(245, 158, 11, 0.6)',
      },
    },
  };

  const strategies = [
    {
      id: 'mindfulness',
      title: '正念与冥想',
      icon: '🧘',
      why: '通过深呼吸等技巧，可以"安抚"过度活跃的杏仁核，降低皮质醇，同时增强前额叶皮层对情绪的控制力。',
      how: '每天进行5-10分钟的呼吸练习。坐直，闭上眼，只关注你的呼吸，感觉空气吸入和呼出。',
    },
    {
      id: 'exercise',
      title: '规律运动',
      icon: '🏃',
      why: '运动能促进海马体新神经元的生长（修复记忆），并自然提升多巴胺和血清素（改善情绪和动力），是天然的抗抑郁剂。',
      how: '每周3-5次，每次30分钟的有氧运动，如快走、慢跑、游泳。选择你喜欢的运动才能坚持。',
    },
    {
      id: 'sleep',
      title: '充足睡眠',
      icon: '😴',
      why: '深度睡眠是大脑清除毒素、巩固记忆和恢复神经递质平衡的关键时期。缺少睡眠会加剧压力反应。',
      how: '建立规律的作息，即使在周末。睡前一小时远离电子屏幕，营造黑暗、安静、凉爽的睡眠环境。',
    },
    {
      id: 'diet',
      title: '健康饮食',
      icon: '🥗',
      why: '你的大脑需要正确的"燃料"。富含Omega-3、色氨酸和酪氨酸的食物，能帮助合成血清素和多巴胺。',
      how: '多吃鱼、坚果、鸡蛋、绿叶蔬菜和水果。减少高糖、高脂的加工食品，避免"劫持"你的奖赏系统。',
    },
    {
      id: 'cbt',
      title: '认知行为疗法(CBT)原理',
      icon: '🧠',
      why: '通过识别并挑战不健康的思维模式，可以重塑大脑回路，降低杏仁核的过度反应，并增强前额叶皮层的理性控制。',
      how: '当你产生负面想法时，尝试问自己："这个想法有证据支持吗？有没有其他更积极的解释？"',
    },
    {
      id: 'learning',
      title: '学习新技能',
      icon: '🎸',
      why: '学习新事物能刺激前额叶和海马体，促进神经可塑性，建立新的突触连接，提升认知韧性。',
      how: '选择一项你感兴趣的新爱好，如学一门乐器、一门语言，或参加一个在线课程。',
    },
  ];

  const brainAreas = document.querySelectorAll('.brain-area');
  const infoTitle = document.getElementById('info-title');
  const infoDescription = document.getElementById('info-description');
  const chartCanvas = document.getElementById('brainChart');
  let brainChart = null;

  function updateInfo(target) {
    const data = brainData[target];
    if (!data) return;

    infoTitle.textContent = data.title;
    infoDescription.textContent = data.description;

    if (brainChart) {
      brainChart.destroy();
    }

    brainChart = new Chart(chartCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.chartData.labels,
        datasets: [
          {
            label: data.chartData.label,
            data: data.chartData.values,
            backgroundColor: data.chartData.color,
            borderColor: data.chartData.color.replace('0.6', '1'),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 100,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${context.raw}`;
              },
            },
          },
        },
      },
    });
  }

  brainAreas.forEach(area => {
    area.addEventListener('click', function () {
      brainAreas.forEach(a => a.classList.remove('active'));
      this.classList.add('active');
      const target = this.getAttribute('data-target');
      updateInfo(target);
    });
  });

  updateInfo('pfc');
  document.getElementById('pfc').classList.add('active');

  const strategyGrid = document.getElementById('strategy-grid');
  const myPlanList = document.getElementById('my-plan-list');
  const planPlaceholder = document.getElementById('plan-placeholder');
  const planItems = new Set();

  function renderStrategies() {
    strategies.forEach(strategy => {
      const card = document.createElement('div');
      card.className = 'strategy-card bg-white p-6 rounded-lg shadow-md cursor-pointer card';
      card.innerHTML = `
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-bold flex items-center"><span class="text-3xl mr-3">${strategy.icon}</span> ${strategy.title}</h3>
                    <span class="text-2xl text-gray-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="details text-gray-600 space-y-3">
                    <div>
                        <h4 class="font-semibold text-gray-700">脑科学原理：</h4>
                        <p>${strategy.why}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-700">行动指南：</h4>
                        <p>${strategy.how}</p>
                    </div>
                    <button data-id="${strategy.id}" data-title="${strategy.title}" class="add-to-plan-btn mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">添加到我的计划</button>
                </div>
            `;
      strategyGrid.appendChild(card);
    });
  }

  strategyGrid.addEventListener('click', function (e) {
    const card = e.target.closest('.strategy-card');
    if (card && !e.target.classList.contains('add-to-plan-btn')) {
      card.classList.toggle('open');
      const icon = card.querySelector('.flex span.text-2xl');
      icon.classList.toggle('rotate-45');
    }

    if (e.target.classList.contains('add-to-plan-btn')) {
      const id = e.target.dataset.id;
      const title = e.target.dataset.title;
      if (!planItems.has(id)) {
        planItems.add(id);
        if (planPlaceholder) {
          planPlaceholder.style.display = 'none';
        }
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center';
        li.innerHTML = `<span>${title}</span><button data-id="${id}" class="remove-plan-item text-red-500 hover:text-red-700 font-semibold">移除</button>`;
        myPlanList.appendChild(li);
      }
    }
  });

  myPlanList.addEventListener('click', function (e) {
    if (e.target.classList.contains('remove-plan-item')) {
      const id = e.target.dataset.id;
      planItems.delete(id);
      e.target.parentElement.remove();
      if (planItems.size === 0 && planPlaceholder) {
        planPlaceholder.style.display = 'list-item';
      }
    }
  });

  renderStrategies();

  const mobileNav = document.getElementById('mobile-nav');
  mobileNav.addEventListener('change', function () {
    window.location.hash = this.value;
  });

  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section');

  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.4,
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href').substring(1) === entry.target.id);
        });
        mobileNav.value = `#${entry.target.id}`;
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    observer.observe(section);
  });

  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth',
      });
    });
  });

  // 阻止页面相关功能
  const blockedUrl = document.getElementById('blockedUrl');
  const goBackBtn = document.getElementById('goBackBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');

  // 显示被阻止的URL
  if (blockedUrl) {
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const blocked = urlParams.get('url') || currentUrl;
    blockedUrl.textContent = blocked;
  }

  // 返回上一页
  if (goBackBtn) {
    goBackBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    });
  }

  // 打开设置页面
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (chrome && chrome.runtime) {
        chrome.runtime.openOptionsPage();
      }
    });
  }

  // 自动滚动到脑科学教育部分
  setTimeout(() => {
    document.querySelector('#problem').scrollIntoView({
      behavior: 'smooth',
    });
  }, 1000);
});
