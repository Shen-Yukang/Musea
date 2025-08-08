# 访问监控调试指南

## 🔧 最新修复

已修复阈值检测问题，现在系统会：

1. **立即检测阈值**：每次访问被监控网站时立即检查阈值
2. **独立于专注模式**：不管专注模式是否开启都会检测阈值
3. **每次访问计数**：移除了重复访问合并逻辑，确保每次访问都被计数

## 🧪 快速测试步骤

### 1. 重新加载扩展
```
1. 打开 chrome://extensions/
2. 找到您的扩展，点击刷新按钮
3. 或者先移除扩展，再重新加载 dist 目录
```

### 2. 重置测试数据
在浏览器控制台执行：
```javascript
// 清空访问监控数据
chrome.storage.local.remove(['visit-monitor-storage-key'], () => {
  console.log('Visit monitor data cleared');
});
```

### 3. 配置测试环境
1. 打开侧边栏 -> "访问监控"标签
2. 确认"启用访问监控"开关是开启的
3. 设置阈值：访问次数 = 2，停留时间 = 1分钟
4. 点击"保存阈值设置"

### 4. 配置监控网站
1. 在侧边栏 -> "网站配置"
2. 添加测试网站到阻止列表或学习模式列表
3. 例如：xiaohongshu.com

### 5. 测试访问记录
1. **第1次访问**：打开 xiaohongshu.com，停留几秒后关闭
2. **检查记录**：在侧边栏查看访问统计，应该显示 1 次访问
3. **第2次访问**：再次打开 xiaohongshu.com
4. **预期结果**：应该立即跳转到深呼吸页面

## 🔍 调试检查点

### 检查控制台日志
打开开发者工具，查看以下日志：

```
✅ 正常日志应该包含：
UrlBlocker: Monitored URL detected, recording visit: [URL]
VisitMonitor: Added new record for [domain] duration: 1s
UrlBlocker: Threshold exceeded, redirecting to deep breathing page: [reason]
```

### 检查存储数据
在控制台执行：
```javascript
chrome.storage.local.get(['visit-monitor-storage-key'], (result) => {
  const data = result['visit-monitor-storage-key'];
  console.log('访问监控配置:', {
    enabled: data.enabled,
    maxVisitsPerDay: data.maxVisitsPerDay,
    maxDurationPerDay: data.maxDurationPerDay
  });
  console.log('访问记录数量:', data.records.length);
  console.log('网站统计:', data.stats);
});
```

### 检查网站配置
```javascript
chrome.storage.local.get(['blocked-urls-storage-key'], (result) => {
  const data = result['blocked-urls-storage-key'];
  console.log('阻止列表:', data.urls);
  console.log('学习模式列表:', data.studyModeUrls);
});
```

## 🐛 常见问题排查

### 问题1：访问次数不增加
**可能原因**：
- 网站不在监控列表中
- 访问监控功能未启用

**解决方法**：
```javascript
// 检查网站是否在监控列表
chrome.storage.local.get(['blocked-urls-storage-key'], (result) => {
  const data = result['blocked-urls-storage-key'];
  console.log('您的网站是否在这些列表中？');
  console.log('阻止列表:', data.urls);
  console.log('学习模式列表:', data.studyModeUrls);
});
```

### 问题2：阈值不触发
**可能原因**：
- 阈值设置过高
- 访问监控未启用

**解决方法**：
```javascript
// 手动触发阈值检测
chrome.storage.local.get(['visit-monitor-storage-key'], async (result) => {
  const data = result['visit-monitor-storage-key'];
  const testUrl = 'https://xiaohongshu.com';
  
  // 模拟检查阈值
  const domain = new URL(testUrl).hostname;
  const stats = data.stats[domain];
  
  console.log('当前统计:', stats);
  console.log('阈值设置:', {
    maxVisits: data.maxVisitsPerDay,
    maxDuration: data.maxDurationPerDay
  });
  
  if (stats && stats.visitCount >= data.maxVisitsPerDay) {
    console.log('✅ 应该触发阈值！');
  } else {
    console.log('❌ 未达到阈值');
  }
});
```

### 问题3：深呼吸页面不显示
**检查URL重定向**：
```javascript
// 检查深呼吸页面URL是否正确
const testUrl = 'https://xiaohongshu.com';
const reason = '测试原因';
const breathingUrl = chrome.runtime.getURL('deep-breathing.html') + 
  '?url=' + encodeURIComponent(testUrl) + 
  '&reason=' + encodeURIComponent(reason);
console.log('深呼吸页面URL:', breathingUrl);
```

## 🔄 强制测试脚本

如果正常测试不工作，可以使用这个脚本强制触发：

```javascript
// 强制添加访问记录并触发阈值
async function forceTestThreshold() {
  const testUrl = 'https://xiaohongshu.com';
  const domain = new URL(testUrl).hostname;
  
  // 获取当前配置
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['visit-monitor-storage-key'], resolve);
  });
  
  const config = result['visit-monitor-storage-key'] || {
    enabled: true,
    maxVisitsPerDay: 2,
    maxDurationPerDay: 15,
    records: [],
    stats: {}
  };
  
  // 添加多条访问记录
  for (let i = 0; i < 3; i++) {
    config.records.push({
      url: testUrl,
      timestamp: Date.now() - i * 1000,
      duration: 1000,
      isBlocked: true
    });
  }
  
  // 更新统计
  config.stats[domain] = {
    url: domain,
    visitCount: 3,
    totalDuration: 3000,
    lastVisit: Date.now(),
    firstVisit: Date.now() - 3000
  };
  
  // 保存配置
  await new Promise(resolve => {
    chrome.storage.local.set({'visit-monitor-storage-key': config}, resolve);
  });
  
  console.log('✅ 强制添加了3次访问记录');
  console.log('现在访问', testUrl, '应该会触发深呼吸页面');
}

// 执行强制测试
forceTestThreshold();
```

## 📋 测试清单

- [ ] 扩展已重新加载
- [ ] 访问监控功能已启用
- [ ] 阈值设置为较低值（如2次访问）
- [ ] 测试网站已添加到监控列表
- [ ] 控制台显示正确的日志
- [ ] 访问统计正确更新
- [ ] 第2次访问时跳转到深呼吸页面

如果按照这个指南测试仍然有问题，请分享控制台的具体日志信息！
